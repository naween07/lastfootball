export type MatchStatus = 'LIVE' | 'FT' | 'NS' | 'HT' | 'PEN' | 'AET' | 'CANC' | 'PST' | '1H' | '2H';

export interface Team {
  id: number;
  name: string;
  shortName: string;
  logo?: string;
}

export interface MatchEvent {
  id: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution';
  minute: number;
  extraMinute?: number;
  team: 'home' | 'away';
  playerName: string;
  assistName?: string;
  detail?: string;
}

export interface MatchStats {
  possession: [number, number];
  shots: [number, number];
  shotsOnTarget: [number, number];
  corners: [number, number];
  fouls: [number, number];
  offsides: [number, number];
}

export interface LineupPlayer {
  id: number;
  name: string;
  number: number;
  pos: string;
  grid?: string;
}

export interface TeamLineup {
  formation: string;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
  coach: { id: number; name: string; photo?: string };
}

export interface Match {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  minute?: string;
  date: string;
  time: string;
  league: League;
  events?: MatchEvent[];
  stats?: MatchStats;
  lineups?: { home: TeamLineup; away: TeamLineup };
  playerData?: MatchPlayerData[];
}

export interface League {
  id: number;
  name: string;
  country: string;
  logo?: string;
}

export interface LeagueMatches {
  league: League;
  matches: Match[];
}

export interface MatchPlayerStats {
  id: number;
  name: string;
  photo: string;
  number: number;
  position: string;
  rating: string | null;
  minutes: number | null;
  captain: boolean;
  substitute: boolean;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  saves: number | null;
  shots: number | null;
  shotsOn: number | null;
  passes: number | null;
  passAccuracy: string | null;
  tackles: number | null;
  duels: number | null;
  duelsWon: number | null;
  dribbles: number | null;
  dribblesSuccess: number | null;
}

export interface MatchPlayerData {
  teamId: number;
  teamName: string;
  players: MatchPlayerStats[];
}