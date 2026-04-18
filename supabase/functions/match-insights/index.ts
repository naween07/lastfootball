// AI-powered match insights via Lovable AI Gateway.
// Generates a short tactical preview/recap card for the Overview tab.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

// Cache insights per fixture state (status + score) for 10 min in memory
type CacheEntry = { content: any; expiresAt: number };
const insightCache = new Map<string, CacheEntry>();
const TTL_MS = 10 * 60 * 1000;

function cacheKey(payload: MatchPayload): string {
  return [
    payload.fixtureId,
    payload.status,
    payload.homeScore ?? "",
    payload.awayScore ?? "",
    payload.minute ?? "",
  ].join("|");
}

interface MatchPayload {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  minute?: string;
  events?: Array<{ minute: number; type: string; team: string; player: string }>;
  stats?: Record<string, [number, number]>;
}

const TOOL = {
  type: "function" as const,
  function: {
    name: "render_match_insight",
    description: "Render a concise FotMob-style match insight card.",
    parameters: {
      type: "object",
      properties: {
        headline: {
          type: "string",
          description: "One punchy line (max 70 chars) summarizing the storyline.",
        },
        summary: {
          type: "string",
          description: "2-3 sentence tactical/contextual summary. No emojis.",
        },
        keyPoints: {
          type: "array",
          description: "3-4 bullet insights. Each is a short phrase (max 80 chars).",
          items: { type: "string" },
          minItems: 3,
          maxItems: 4,
        },
        prediction: {
          type: "object",
          description: "Win probability estimates if the match has not finished. Use null for finished matches.",
          properties: {
            home: { type: "number", description: "0-100" },
            draw: { type: "number", description: "0-100" },
            away: { type: "number", description: "0-100" },
          },
          required: ["home", "draw", "away"],
          additionalProperties: false,
        },
      },
      required: ["headline", "summary", "keyPoints", "prediction"],
      additionalProperties: false,
    },
  },
};

function buildSystemPrompt(payload: MatchPayload): string {
  return `You are a concise football analyst writing for a FotMob-style live scores app.
Be factual, neutral, and avoid hype. Never invent stats. If the match has not started, frame the insight as a preview based only on the league context and team names. If live, summarize the current state of play. If finished, summarize the result. Always respond by calling the render_match_insight tool.`;
}

function buildUserPrompt(p: MatchPayload): string {
  const lines: string[] = [];
  lines.push(`Fixture: ${p.homeTeam} vs ${p.awayTeam}`);
  lines.push(`Competition: ${p.league}`);
  lines.push(`Status: ${p.status}${p.minute ? ` (${p.minute})` : ""}`);
  if (p.homeScore !== null && p.awayScore !== null) {
    lines.push(`Score: ${p.homeTeam} ${p.homeScore} - ${p.awayScore} ${p.awayTeam}`);
  }
  if (p.events?.length) {
    lines.push(`\nKey events:`);
    for (const e of p.events.slice(0, 12)) {
      lines.push(`- ${e.minute}' ${e.type} (${e.team}): ${e.player}`);
    }
  }
  if (p.stats) {
    lines.push(`\nStats (home, away):`);
    for (const [k, v] of Object.entries(p.stats)) {
      lines.push(`- ${k}: ${v[0]} / ${v[1]}`);
    }
  }
  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as MatchPayload;
    if (!payload?.fixtureId || !payload.homeTeam || !payload.awayTeam) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = cacheKey(payload);
    const cached = insightCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return new Response(JSON.stringify({ insight: cached.content, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const aiRes = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: buildSystemPrompt(payload) },
          { role: "user", content: buildUserPrompt(payload) },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "render_match_insight" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(
        JSON.stringify({ error: "AI rate limit reached, try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiRes.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "No insight generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let insight: any;
    try {
      insight = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    insightCache.set(key, { content: insight, expiresAt: Date.now() + TTL_MS });

    return new Response(JSON.stringify({ insight, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (e) {
    console.error("match-insights error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
