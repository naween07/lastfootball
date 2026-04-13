import { Match, League, LeagueMatches } from '@/types/football';

const leagues: League[] = [
  { id: 39, name: 'Premier League', country: 'England', logo: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 140, name: 'La Liga', country: 'Spain', logo: '🇪🇸' },
  { id: 2, name: 'UEFA Champions League', country: 'Europe', logo: '🏆' },
  { id: 78, name: 'Bundesliga', country: 'Germany', logo: '🇩🇪' },
  { id: 135, name: 'Serie A', country: 'Italy', logo: '🇮🇹' },
  { id: 61, name: 'Ligue 1', country: 'France', logo: '🇫🇷' },
];

const mockMatches: Match[] = [
  {
    id: 1, status: 'LIVE', minute: "34'",
    homeTeam: { id: 1, name: 'Manchester United', shortName: 'MUN' },
    awayTeam: { id: 2, name: 'Liverpool', shortName: 'LIV' },
    homeScore: 1, awayScore: 2,
    date: '2026-04-13', time: '15:00',
    league: leagues[0],
    events: [
      { id: 1, type: 'goal', minute: 12, team: 'away', playerName: 'M. Salah', assistName: 'Diaz' },
      { id: 2, type: 'goal', minute: 23, team: 'home', playerName: 'B. Fernandes', detail: 'Penalty' },
      { id: 3, type: 'goal', minute: 31, team: 'away', playerName: 'D. Núñez', assistName: 'Alexander-Arnold' },
      { id: 4, type: 'yellow_card', minute: 28, team: 'home', playerName: 'Casemiro' },
    ],
    stats: {
      possession: [42, 58], shots: [5, 9], shotsOnTarget: [2, 4],
      corners: [2, 5], fouls: [7, 4], offsides: [1, 3],
    },
  },
  {
    id: 2, status: 'LIVE', minute: "67'",
    homeTeam: { id: 3, name: 'Arsenal', shortName: 'ARS' },
    awayTeam: { id: 4, name: 'Chelsea', shortName: 'CHE' },
    homeScore: 3, awayScore: 1,
    date: '2026-04-13', time: '15:00',
    league: leagues[0],
    events: [
      { id: 5, type: 'goal', minute: 8, team: 'home', playerName: 'B. Saka', assistName: 'Ødegaard' },
      { id: 6, type: 'goal', minute: 33, team: 'home', playerName: 'K. Havertz' },
      { id: 7, type: 'goal', minute: 45, team: 'away', playerName: 'C. Palmer', detail: 'Free kick' },
      { id: 8, type: 'goal', minute: 55, team: 'home', playerName: 'G. Martinelli', assistName: 'Rice' },
      { id: 9, type: 'red_card', minute: 60, team: 'away', playerName: 'E. Fernández' },
    ],
    stats: {
      possession: [61, 39], shots: [14, 6], shotsOnTarget: [7, 2],
      corners: [6, 2], fouls: [5, 9], offsides: [2, 1],
    },
  },
  {
    id: 3, status: 'HT', minute: 'HT',
    homeTeam: { id: 5, name: 'Real Madrid', shortName: 'RMA' },
    awayTeam: { id: 6, name: 'Barcelona', shortName: 'BAR' },
    homeScore: 0, awayScore: 1,
    date: '2026-04-13', time: '21:00',
    league: leagues[1],
    events: [
      { id: 10, type: 'goal', minute: 38, team: 'away', playerName: 'R. Lewandowski', assistName: 'Pedri' },
      { id: 11, type: 'yellow_card', minute: 22, team: 'home', playerName: 'A. Tchouaméni' },
    ],
    stats: {
      possession: [47, 53], shots: [4, 7], shotsOnTarget: [1, 3],
      corners: [3, 4], fouls: [6, 3], offsides: [0, 2],
    },
  },
  {
    id: 4, status: 'FT',
    homeTeam: { id: 7, name: 'Bayern Munich', shortName: 'BAY' },
    awayTeam: { id: 8, name: 'Borussia Dortmund', shortName: 'BVB' },
    homeScore: 2, awayScore: 2,
    date: '2026-04-13', time: '17:30',
    league: leagues[3],
    events: [
      { id: 12, type: 'goal', minute: 15, team: 'home', playerName: 'H. Kane', assistName: 'Müller' },
      { id: 13, type: 'goal', minute: 34, team: 'away', playerName: 'J. Brandt' },
      { id: 14, type: 'goal', minute: 56, team: 'home', playerName: 'J. Musiala' },
      { id: 15, type: 'goal', minute: 78, team: 'away', playerName: 'D. Adeyemi', assistName: 'Reus' },
    ],
    stats: {
      possession: [58, 42], shots: [16, 10], shotsOnTarget: [6, 5],
      corners: [7, 3], fouls: [8, 10], offsides: [2, 1],
    },
  },
  {
    id: 5, status: 'NS',
    homeTeam: { id: 9, name: 'Paris Saint-Germain', shortName: 'PSG' },
    awayTeam: { id: 10, name: 'Olympique Marseille', shortName: 'OLM' },
    homeScore: null, awayScore: null,
    date: '2026-04-14', time: '20:45',
    league: leagues[5],
  },
  {
    id: 6, status: 'NS',
    homeTeam: { id: 11, name: 'Juventus', shortName: 'JUV' },
    awayTeam: { id: 12, name: 'AC Milan', shortName: 'MIL' },
    homeScore: null, awayScore: null,
    date: '2026-04-14', time: '18:00',
    league: leagues[4],
  },
  {
    id: 7, status: 'NS',
    homeTeam: { id: 13, name: 'Manchester City', shortName: 'MCI' },
    awayTeam: { id: 14, name: 'Tottenham', shortName: 'TOT' },
    homeScore: null, awayScore: null,
    date: '2026-04-15', time: '20:00',
    league: leagues[0],
  },
  {
    id: 8, status: 'LIVE', minute: "88'",
    homeTeam: { id: 15, name: 'Inter Milan', shortName: 'INT' },
    awayTeam: { id: 16, name: 'Napoli', shortName: 'NAP' },
    homeScore: 1, awayScore: 0,
    date: '2026-04-13', time: '20:45',
    league: leagues[4],
    events: [
      { id: 16, type: 'goal', minute: 72, team: 'home', playerName: 'L. Martínez', assistName: 'Barella' },
      { id: 17, type: 'yellow_card', minute: 45, team: 'away', playerName: 'A. Zambo Anguissa' },
      { id: 18, type: 'yellow_card', minute: 66, team: 'home', playerName: 'N. Barella' },
    ],
    stats: {
      possession: [44, 56], shots: [8, 12], shotsOnTarget: [3, 4],
      corners: [3, 6], fouls: [11, 7], offsides: [1, 2],
    },
  },
];

export function getLeagues(): League[] {
  return leagues;
}

export function getAllMatches(): Match[] {
  return mockMatches;
}

export function getMatchById(id: number): Match | undefined {
  return mockMatches.find(m => m.id === id);
}

export function getMatchesByLeague(leagueId: number): Match[] {
  return mockMatches.filter(m => m.league.id === leagueId);
}

export function getMatchesGroupedByLeague(matches: Match[]): LeagueMatches[] {
  const groups = new Map<number, LeagueMatches>();
  for (const match of matches) {
    if (!groups.has(match.league.id)) {
      groups.set(match.league.id, { league: match.league, matches: [] });
    }
    groups.get(match.league.id)!.matches.push(match);
  }
  return Array.from(groups.values());
}

export function getLiveMatches(): Match[] {
  return mockMatches.filter(m => m.status === 'LIVE' || m.status === 'HT' || m.status === '1H' || m.status === '2H');
}

export function getTodayMatches(): Match[] {
  return mockMatches.filter(m => m.date === '2026-04-13');
}

export function getTomorrowMatches(): Match[] {
  return mockMatches.filter(m => m.date === '2026-04-14');
}

export function getUpcomingMatches(): Match[] {
  return mockMatches.filter(m => m.status === 'NS');
}

export function searchMatches(query: string): Match[] {
  const q = query.toLowerCase();
  return mockMatches.filter(m =>
    m.homeTeam.name.toLowerCase().includes(q) ||
    m.awayTeam.name.toLowerCase().includes(q) ||
    m.league.name.toLowerCase().includes(q)
  );
}
