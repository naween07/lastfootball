import { useEffect, useState } from "react";
import type { Match } from "@/types/football";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export interface MatchInsight {
  headline: string;
  summary: string;
  keyPoints: string[];
  prediction: { home: number; draw: number; away: number };
}

interface State {
  insight: MatchInsight | null;
  loading: boolean;
  error: string | null;
}

export function useMatchInsight(match: Match | null) {
  const [state, setState] = useState<State>({ insight: null, loading: false, error: null });

  useEffect(() => {
    if (!match) return;
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    const body = {
      fixtureId: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      league: `${match.league.name} (${match.league.country})`,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      minute: match.minute,
      events: match.events?.slice(0, 12).map((e) => ({
        minute: e.minute,
        type: e.type,
        team: e.team,
        player: e.playerName,
      })),
      stats: match.stats
        ? {
            "Possession %": match.stats.possession,
            "Shots": match.stats.shots,
            "Shots on Target": match.stats.shotsOnTarget,
            "Corners": match.stats.corners,
          }
        : undefined,
    };

    fetch(`${SUPABASE_URL}/functions/v1/match-insights`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PUBLISHABLE_KEY}`,
        apikey: PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.status === 429) throw new Error("AI is rate-limited. Try again in a moment.");
        if (res.status === 402) throw new Error("AI credits exhausted.");
        if (!res.ok) throw new Error(`AI error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({ insight: data.insight, loading: false, error: null });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({ insight: null, loading: false, error: err?.message || "Failed to load insight" });
      });

    return () => controller.abort();
    // Re-fetch when score / status / minute changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id, match?.status, match?.homeScore, match?.awayScore, match?.minute]);

  return state;
}
