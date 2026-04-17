// High-performance caching proxy for API-Football
// Strategy: 3-layer cache (memory → Postgres → upstream) + Stale-While-Revalidate
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const API_BASE = "https://v3.football.api-sports.io";

// ---------- TTL strategy (seconds) ----------
// Fresh window: serve from cache, no refetch.
// Stale window: serve cached but trigger background refresh.
// Hard expiry = fresh + stale.
function getTtl(endpoint: string, params: URLSearchParams): { fresh: number; stale: number } {
  // Live scores — short fresh window, frequent refresh
  if (params.get("live") === "all") return { fresh: 20, stale: 40 };

  // Match in-progress details (events/stats/lineups for a single fixture)
  if (endpoint.startsWith("fixtures/")) return { fresh: 30, stale: 60 };

  // Daily fixtures list
  if (endpoint === "fixtures") {
    const date = params.get("date");
    if (date) {
      const today = new Date().toISOString().split("T")[0];
      // Past dates never change
      if (date < today) return { fresh: 86400, stale: 86400 * 7 };
      // Today: refresh frequently
      if (date === today) return { fresh: 60, stale: 120 };
      // Future dates: moderate
      return { fresh: 600, stale: 1800 };
    }
    return { fresh: 60, stale: 120 };
  }

  // Standings — change ~once per matchday
  if (endpoint === "standings") return { fresh: 3600, stale: 21600 }; // 1h fresh, 6h stale

  // Player stats / top scorers — change once per matchday
  if (endpoint.startsWith("players/")) return { fresh: 3600, stale: 21600 };

  // Teams in a league, league rounds — very stable
  if (endpoint === "teams" || endpoint === "fixtures/rounds") return { fresh: 21600, stale: 86400 };

  // Search — short cache
  if (params.get("search")) return { fresh: 300, stale: 900 };

  // Default
  return { fresh: 300, stale: 900 };
}

// ---------- In-memory edge cache (per warm instance) ----------
type MemEntry = { payload: unknown; fetchedAt: number; freshUntil: number; staleUntil: number };
const memCache = new Map<string, MemEntry>();
const MAX_MEM_ENTRIES = 500;

function memGet(key: string): MemEntry | null {
  const e = memCache.get(key);
  if (!e) return null;
  if (Date.now() > e.staleUntil) {
    memCache.delete(key);
    return null;
  }
  return e;
}
function memSet(key: string, entry: MemEntry) {
  if (memCache.size >= MAX_MEM_ENTRIES) {
    const oldest = memCache.keys().next().value;
    if (oldest) memCache.delete(oldest);
  }
  memCache.set(key, entry);
}

// ---------- Lazy-init Supabase client (service role for cache writes) ----------
let supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!supabaseClient) {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    supabaseClient = createClient(url, key, { auth: { persistSession: false } });
  }
  return supabaseClient;
}

// ---------- Background revalidation (deduplicated) ----------
const inflight = new Map<string, Promise<unknown>>();

async function fetchUpstream(endpoint: string, params: URLSearchParams, apiKey: string): Promise<unknown> {
  const apiUrl = `${API_BASE}/${endpoint}?${params.toString()}`;
  const res = await fetch(apiUrl, {
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "v3.football.api-sports.io",
    },
  });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  return await res.json();
}

async function revalidate(
  cacheKey: string,
  endpoint: string,
  params: URLSearchParams,
  apiKey: string,
  ttl: { fresh: number; stale: number },
): Promise<unknown> {
  // Dedupe concurrent revalidations of the same key
  const existing = inflight.get(cacheKey);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const data = await fetchUpstream(endpoint, params, apiKey);
      const now = Date.now();
      const freshUntil = now + ttl.fresh * 1000;
      const staleUntil = now + (ttl.fresh + ttl.stale) * 1000;
      memSet(cacheKey, { payload: data, fetchedAt: now, freshUntil, staleUntil });

      // Persist to DB (best-effort, don't block on failure)
      try {
        await getSupabase()
          .from("api_cache")
          .upsert({
            cache_key: cacheKey,
            payload: data as never,
            fetched_at: new Date(now).toISOString(),
            expires_at: new Date(staleUntil).toISOString(),
          });
      } catch (dbErr) {
        console.error("DB cache write failed:", dbErr);
      }

      return data;
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, promise);
  return promise;
}

async function loadFromDb(cacheKey: string): Promise<MemEntry | null> {
  try {
    const { data, error } = await getSupabase()
      .from("api_cache")
      .select("payload, fetched_at, expires_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (error || !data) return null;
    const fetchedAt = new Date(data.fetched_at as string).getTime();
    const staleUntil = new Date(data.expires_at as string).getTime();
    // Reconstruct fresh window: assume 1/3 of total window is fresh
    const total = staleUntil - fetchedAt;
    const freshUntil = fetchedAt + Math.max(20_000, Math.floor(total / 3));
    if (Date.now() > staleUntil) return null;
    return { payload: data.payload, fetchedAt, freshUntil, staleUntil };
  } catch {
    return null;
  }
}

function gzipResponse(body: string, extraHeaders: Record<string, string>, accept: string | null): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (accept?.includes("gzip")) {
    try {
      const stream = new Response(body).body!.pipeThrough(new CompressionStream("gzip"));
      headers["Content-Encoding"] = "gzip";
      return new Response(stream, { headers });
    } catch {
      // Fall through to uncompressed
    }
  }
  return new Response(body, { headers });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    if (!endpoint) {
      return new Response(JSON.stringify({ error: "Missing endpoint param" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build upstream params (forward all except 'endpoint')
    const params = new URLSearchParams();
    const sortedKeys = [...url.searchParams.keys()].filter((k) => k !== "endpoint").sort();
    for (const k of sortedKeys) params.append(k, url.searchParams.get(k)!);

    const cacheKey = `${endpoint}?${params.toString()}`;
    const ttl = getTtl(endpoint, params);
    const acceptEncoding = req.headers.get("accept-encoding");

    // 1. Memory cache
    let entry = memGet(cacheKey);

    // 2. DB cache fallback (cold instance)
    if (!entry) {
      entry = await loadFromDb(cacheKey);
      if (entry) memSet(cacheKey, entry);
    }

    const now = Date.now();

    if (entry) {
      const isFresh = now < entry.freshUntil;
      if (!isFresh) {
        // Stale-While-Revalidate: kick off background refresh, don't await
        revalidate(cacheKey, endpoint, params, apiKey, ttl).catch((e) =>
          console.error("Background revalidate failed:", e),
        );
      }
      const ageSec = Math.floor((now - entry.fetchedAt) / 1000);
      return gzipResponse(
        JSON.stringify(entry.payload),
        {
          "X-Cache": isFresh ? "HIT" : "STALE",
          "X-Cache-Age": String(ageSec),
          "Cache-Control": `public, max-age=${ttl.fresh}, stale-while-revalidate=${ttl.stale}`,
        },
        acceptEncoding,
      );
    }

    // 3. No cache — fetch synchronously
    console.log(`MISS ${cacheKey}`);
    const data = await revalidate(cacheKey, endpoint, params, apiKey, ttl);
    return gzipResponse(
      JSON.stringify(data),
      {
        "X-Cache": "MISS",
        "Cache-Control": `public, max-age=${ttl.fresh}, stale-while-revalidate=${ttl.stale}`,
      },
      acceptEncoding,
    );
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
