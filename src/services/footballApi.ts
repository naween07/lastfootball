import { supabase } from "@/integrations/supabase/client";
import { Match, League, LeagueMatches, MatchEvent, MatchStats, TeamLineup, LineupPlayer } from "@/types/football";

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
export const TOP_LEAGUE_IDS = [39, 2, 140, 135, 78, 61, 3, 94, 88, 307, 253];

export const TOP_LEAGUES = [
  { id: 39, name: 'Premier League', country: 'England' },
  { id: 2, name: 'Champions League', country: 'World' },
  { id: 140, name: 'La Liga', country: 'Spain' },
  { id: 135, name: 'Serie A', country: 'Italy' },
  { id: 78, name: 'Bundesliga', country: 'Germany' },
  { id: 61, name: 'Ligue 1', country: 'France' },
  { id: 3, name: 'Europa League', country: 'World' },
  { id: 94, name: 'Primeira Liga', country: 'Portugal' },
  { id: 88, name: 'Eredivisie', country: 'Netherlands' },
  { id: 307, name: 'Saudi Pro League', country: 'Saudi Arabia' },
  { id: 253, name: 'MLS', country: 'USA' },
];

// Cup/knockout competition IDs
export const CUP_LEAGUE_IDS = [2, 3, 848]; // Champions League, Europa League, Conference League

export function getCurrentSeason(): number {
  const now = new Date();
  // Most leagues start in Aug, so if before Aug use previous year
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

export function getSeasonOptions(): number[] {
  const current = getCurrentSeason();
  return [current, current - 1, current - 2, current - 3];
}

// ---- Stats API functions ----

export interface StandingTeam {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string;
}

export async function fetchStandings(leagueId: number, season: number): Promise<StandingTeam[]> {
  try {
    const data = await callApi("standings", { league: String(leagueId), season: String(season) });
    if (!data.length) return [];
    const standings = data[0]?.league?.standings;
    if (!standings || !standings.length) return [];
    // Take first group (some leagues have multiple groups)
    return standings[0].map((s: any) => ({
      rank: s.rank,
      team: { id: s.team.id, name: s.team.name, logo: s.team.logo },
      points: s.points,
      goalsDiff: s.goalsDiff,
      played: s.all.played,
      win: s.all.win,
      draw: s.all.draw,
      lose: s.all.lose,
      goalsFor: s.all.goals.for,
      goalsAgainst: s.all.goals.against,
      form: s.form || '',
    }));
  } catch (err) {
    console.error("Failed to fetch standings:", err);
    return [];
  }
}

export interface PlayerStat {
  rank: number;
  player: { id: number; name: string; photo: string };
  team: { id: number; name: string; logo: string };
  goals: number;
  penalties: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  shots: number;
  shotsOnTarget: number;
  dribbles: number;
  dribblesWon: number;
  fouls: number;
  keyPasses: number;
  passes: number;
  passAccuracy: number;
  tackles: number;
}

function mapPlayerStat(p: any, index: number): PlayerStat {
  const stats = p.statistics?.[0] || {};
  return {
    rank: index + 1,
    player: { id: p.player.id, name: p.player.name, photo: p.player.photo },
    team: { id: stats.team?.id || 0, name: stats.team?.name || '', logo: stats.team?.logo || '' },
    goals: stats.goals?.total || 0,
    penalties: stats.penalty?.scored || 0,
    assists: stats.goals?.assists || 0,
    yellowCards: stats.cards?.yellow || 0,
    redCards: stats.cards?.red || 0,
    shots: stats.shots?.total || 0,
    shotsOnTarget: stats.shots?.on || 0,
    dribbles: stats.dribbles?.attempts || 0,
    dribblesWon: stats.dribbles?.success || 0,
    fouls: stats.fouls?.committed || 0,
    keyPasses: stats.passes?.key || 0,
    passes: stats.passes?.total || 0,
    passAccuracy: stats.passes?.accuracy || 0,
    tackles: stats.tackles?.total || 0,
  };
}

export async function fetchTopScorers(leagueId: number, season: number): Promise<PlayerStat[]> {
  try {
    const data = await callApi("players/topscorers", { league: String(leagueId), season: String(season) });
    return data.map(mapPlayerStat);
  } catch (err) {
    console.error("Failed to fetch top scorers:", err);
    return [];
  }
}

export async function fetchTopAssists(leagueId: number, season: number): Promise<PlayerStat[]> {
  try {
    const data = await callApi("players/topassists", { league: String(leagueId), season: String(season) });
    return data.map(mapPlayerStat);
  } catch (err) {
    console.error("Failed to fetch top assists:", err);
    return [];
  }
}

export async function fetchTopYellowCards(leagueId: number, season: number): Promise<PlayerStat[]> {
  try {
    const data = await callApi("players/topyellowcards", { league: String(leagueId), season: String(season) });
    return data.map(mapPlayerStat);
  } catch (err) {
    console.error("Failed to fetch top yellow cards:", err);
    return [];
  }
}

export async function fetchTopRedCards(leagueId: number, season: number): Promise<PlayerStat[]> {
  try {
    const data = await callApi("players/topredcards", { league: String(leagueId), season: String(season) });
    return data.map(mapPlayerStat);
  } catch (err) {
    console.error("Failed to fetch top red cards:", err);
    return [];
  }
}

export interface TeamStatSummary {
  team: { id: number; name: string; logo: string };
  form: string;
  fixtures: { played: number; wins: number; draws: number; losses: number };
  goals: { for: number; against: number };
  cleanSheets: number;
  failedToScore: number;
}

export async function fetchTeamsInLeague(leagueId: number, season: number): Promise<{ id: number; name: string; logo: string }[]> {
  try {
    const data = await callApi("teams", { league: String(leagueId), season: String(season) });
    return data.map((t: any) => ({ id: t.team.id, name: t.team.name, logo: t.team.logo }));
  } catch (err) {
    console.error("Failed to fetch teams:", err);
    return [];
  }
}

export async function fetchTeamStatistics(teamId: number, leagueId: number, season: number): Promise<TeamStatSummary | null> {
  try {
    const data = await callApi("teams/statistics", { team: String(teamId), league: String(leagueId), season: String(season) });
    if (!data) return null;
    return {
      team: { id: data.team?.id || teamId, name: data.team?.name || '', logo: data.team?.logo || '' },
      form: data.form || '',
      fixtures: {
        played: data.fixtures?.played?.total || 0,
        wins: data.fixtures?.wins?.total || 0,
        draws: data.fixtures?.draws?.total || 0,
        losses: data.fixtures?.loses?.total || 0,
      },
      goals: {
        for: data.goals?.for?.total?.total || 0,
        against: data.goals?.against?.total?.total || 0,
      },
      cleanSheets: data.clean_sheet?.total || 0,
      failedToScore: data.failed_to_score?.total || 0,
    };
  } catch (err) {
    console.error("Failed to fetch team statistics:", err);
    return null;
  }
}

export async function fetchLeagueFixtures(leagueId: number, season: number, round?: string): Promise<Match[]> {
  try {
    const params: Record<string, string> = { league: String(leagueId), season: String(season) };
    if (round) params.round = round;
    const data = await callApi("fixtures", params);
    return data.map(mapFixtureToMatch);
  } catch (err) {
    console.error("Failed to fetch league fixtures:", err);
    return [];
  }
}

export async function fetchLeagueRounds(leagueId: number, season: number): Promise<string[]> {
  try {
    const data = await callApi("fixtures/rounds", { league: String(leagueId), season: String(season) });
    return data || [];
  } catch (err) {
    console.error("Failed to fetch rounds:", err);
    return [];
  }
}

export function getMatchesGroupedByLeague(matches: Match[]): LeagueMatches[] {
  const groups = new Map<number, LeagueMatches>();
  for (const match of matches) {
    if (!groups.has(match.league.id)) {
      groups.set(match.league.id, { league: match.league, matches: [] });
    }
    groups.get(match.league.id)!.matches.push(match);
  }

  const all = Array.from(groups.values());
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
