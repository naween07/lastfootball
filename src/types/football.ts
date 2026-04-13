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
