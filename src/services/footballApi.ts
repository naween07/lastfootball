import { supabase } from "@/integrations/supabase/client";
import { Match, League, LeagueMatches, MatchEvent, MatchStats } from "@/types/football";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callApi(endpoint: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams({ endpoint, ...params }).toString();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/football-api?${query}`, {
    headers: {
      "Content-Type": "application/json",
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  return data.response || [];
}

// Status mapping from API-Football to our types
function mapStatus(short: string): Match["status"] {
  const map: Record<string, Match["status"]> = {
    "1H": "1H", "2H": "2H", "HT": "HT", "FT": "FT",
    "NS": "NS", "LIVE": "LIVE", "PEN": "PEN", "AET": "AET",
    "PST": "PST", "CANC": "CANC", "ET": "LIVE", "BT": "LIVE",
    "P": "PEN", "SUSP": "PST", "INT": "LIVE", "ABD": "CANC",
  };
  return map[short] || "NS";
}

function mapMinute(status: string, elapsed: number | null, extra: number | null): string | undefined {
  if (status === "HT") return "HT";
  if (status === "FT" || status === "AET" || status === "PEN") return undefined;
  if (status === "NS") return undefined;
  if (elapsed === null) return undefined;
  if (extra) return `${elapsed}+${extra}'`;
  return `${elapsed}'`;
}

function mapTeam(team: any): Match["homeTeam"] {
  return {
    id: team.id,
    name: team.name,
    shortName: team.name.length > 3 ? team.name.substring(0, 3).toUpperCase() : team.name.toUpperCase(),
    logo: team.logo,
  };
}

function mapFixtureToMatch(fixture: any): Match {
  const f = fixture.fixture;
  const t = fixture.teams;
  const g = fixture.goals;
  const l = fixture.league;
  const statusShort = f.status?.short || "NS";

  return {
    id: f.id,
    homeTeam: mapTeam(t.home),
    awayTeam: mapTeam(t.away),
    homeScore: g.home,
    awayScore: g.away,
    status: mapStatus(statusShort),
    minute: mapMinute(statusShort, f.status?.elapsed, f.status?.extra),
    date: f.date?.split("T")[0] || "",
    time: f.date ? new Date(f.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "",
    league: {
      id: l.id,
      name: l.name,
      country: l.country,
      logo: l.logo,
    },
  };
}

function mapEvents(events: any[]): MatchEvent[] {
  return events.map((e, i) => {
    let type: MatchEvent["type"] = "goal";
    if (e.type === "Goal") type = "goal";
    else if (e.type === "Card" && e.detail?.includes("Yellow")) type = "yellow_card";
    else if (e.type === "Card" && e.detail?.includes("Red")) type = "red_card";
    else if (e.type === "subst") type = "substitution";

    return {
      id: i,
      type,
      minute: e.time?.elapsed || 0,
      extraMinute: e.time?.extra || undefined,
      team: e.team?.id ? "home" : "away", // will be fixed below
      playerName: e.player?.name || "Unknown",
      assistName: e.assist?.name || undefined,
      detail: e.detail || undefined,
    };
  });
}

function mapStats(stats: any[]): MatchStats | undefined {
  if (!stats || stats.length < 2) return undefined;
  const home = stats[0]?.statistics || [];
  const away = stats[1]?.statistics || [];

  const getStat = (arr: any[], type: string): number => {
    const s = arr.find((s: any) => s.type === type);
    if (!s) return 0;
    const val = s.value;
    if (typeof val === "string" && val.includes("%")) return parseInt(val);
    return parseInt(val) || 0;
  };

  return {
    possession: [getStat(home, "Ball Possession"), getStat(away, "Ball Possession")],
    shots: [getStat(home, "Total Shots"), getStat(away, "Total Shots")],
    shotsOnTarget: [getStat(home, "Shots on Goal"), getStat(away, "Shots on Goal")],
    corners: [getStat(home, "Corner Kicks"), getStat(away, "Corner Kicks")],
    fouls: [getStat(home, "Fouls"), getStat(away, "Fouls")],
    offsides: [getStat(home, "Offsides"), getStat(away, "Offsides")],
  };
}

// ---- Public API functions ----

export async function fetchLiveMatches(): Promise<Match[]> {
  try {
    const data = await callApi("fixtures", { live: "all" });
    return data.map(mapFixtureToMatch);
  } catch (err) {
    console.error("Failed to fetch live matches:", err);
    return [];
  }
}

export async function fetchMatchesByDate(date: string): Promise<Match[]> {
  try {
    const data = await callApi("fixtures", { date });
    return data.map(mapFixtureToMatch);
  } catch (err) {
    console.error("Failed to fetch matches by date:", err);
    return [];
  }
}

export async function fetchMatchDetails(fixtureId: number): Promise<Match | null> {
  try {
    const [fixtures, events, stats] = await Promise.all([
      callApi("fixtures", { id: String(fixtureId) }),
      callApi("fixtures/events", { fixture: String(fixtureId) }),
      callApi("fixtures/statistics", { fixture: String(fixtureId) }),
    ]);

    if (!fixtures.length) return null;

    const match = mapFixtureToMatch(fixtures[0]);
    
    // Map events with correct team assignment
    if (events.length > 0) {
      const homeTeamId = fixtures[0].teams.home.id;
      match.events = events.map((e: any, i: number) => {
        let type: MatchEvent["type"] = "goal";
        if (e.type === "Goal") type = "goal";
        else if (e.type === "Card" && e.detail?.includes("Yellow")) type = "yellow_card";
        else if (e.type === "Card" && e.detail?.includes("Red")) type = "red_card";
        else if (e.type === "subst") type = "substitution";

        return {
          id: i,
          type,
          minute: e.time?.elapsed || 0,
          extraMinute: e.time?.extra || undefined,
          team: (e.team?.id === homeTeamId ? "home" : "away") as "home" | "away",
          playerName: e.player?.name || "Unknown",
          assistName: e.assist?.name || undefined,
          detail: e.detail || undefined,
        };
      });
    }

    match.stats = mapStats(stats);
    return match;
  } catch (err) {
    console.error("Failed to fetch match details:", err);
    return null;
  }
}

export async function searchTeamsAndLeagues(query: string): Promise<Match[]> {
  try {
    // Search by team name - get their upcoming/recent fixtures
    const teams = await callApi("teams", { search: query });
    if (!teams.length) return [];

    const teamId = teams[0]?.team?.id;
    if (!teamId) return [];

    const fixtures = await callApi("fixtures", { team: String(teamId), last: "5" });
    return fixtures.map(mapFixtureToMatch);
  } catch (err) {
    console.error("Search failed:", err);
    return [];
  }
}

// Top league IDs for prioritization
const TOP_LEAGUE_IDS = [39, 2, 140, 135, 78, 61, 3, 94, 88, 253];

export function getMatchesGroupedByLeague(matches: Match[]): LeagueMatches[] {
  const groups = new Map<number, LeagueMatches>();
  for (const match of matches) {
    if (!groups.has(match.league.id)) {
      groups.set(match.league.id, { league: match.league, matches: [] });
    }
    groups.get(match.league.id)!.matches.push(match);
  }

  const all = Array.from(groups.values());
  // Sort: top leagues first (in priority order), then rest alphabetically
  all.sort((a, b) => {
    const aIdx = TOP_LEAGUE_IDS.indexOf(a.league.id);
    const bIdx = TOP_LEAGUE_IDS.indexOf(b.league.id);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.league.name.localeCompare(b.league.name);
  });
  return all;
}

// Format date as YYYY-MM-DD
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getToday(): string {
  return formatDate(new Date());
}

export function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDate(d);
}

export function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDate(d);
}

export function getDateLabel(dateStr: string): string {
  const today = getToday();
  const tomorrow = getTomorrow();
  const yesterday = getYesterday();

  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  if (dateStr === yesterday) return 'Yesterday';

  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Get an array of date strings from yesterday to +5 days */
export function getDateRange(): string[] {
  const dates: string[] = [];
  for (let i = -1; i <= 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}
