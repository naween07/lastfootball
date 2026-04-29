import { Match, MatchEvent } from '@/types/football';

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: 'match-report' | 'preview' | 'roundup' | 'featured';
  leagueName: string;
  leagueLogo?: string;
  homeTeam: { name: string; logo?: string };
  awayTeam: { name: string; logo?: string };
  matchId: number;
  publishedAt: string;
  isFeatured: boolean;
}

// ─── Big Match Detection ────────────────────────────────────────────────────

const TOP_CLUBS = [
  'Real Madrid', 'Barcelona', 'Atletico Madrid',
  'Manchester City', 'Manchester United', 'Liverpool', 'Arsenal', 'Chelsea', 'Tottenham',
  'Bayern Munich', 'Bayern München', 'Borussia Dortmund',
  'Paris Saint Germain', 'Paris Saint-Germain', 'PSG',
  'Juventus', 'AC Milan', 'Inter', 'Inter Milan', 'Napoli',
  'Ajax', 'Benfica', 'Porto',
  'Newcastle', 'Aston Villa', 'Brighton',
];

const CUP_KNOCKOUT_STAGES = ['Quarter-final', 'Semi-final', 'Final', 'Round of 16'];

// Featured match priority score — higher = more important
// Only matches scoring 5+ are featured
export function getMatchImportance(match: Match): number {
  const homeName = match.homeTeam.name;
  const awayName = match.awayTeam.name;
  const homeIsTop = TOP_CLUBS.some(c => homeName.includes(c) || c.includes(homeName));
  const awayIsTop = TOP_CLUBS.some(c => awayName.includes(c) || c.includes(awayName));
  const totalGoals = (match.homeScore || 0) + (match.awayScore || 0);

  let score = 0;

  // Tier 1: Major European competition (UCL, UEL only — not domestic cups)
  const majorCups = [2, 3]; // Champions League, Europa League
  if (majorCups.includes(match.league.id)) score += 8;

  // Tier 2: Both teams are top clubs (El Clasico, NLD, Milan derby etc.)
  if (homeIsTop && awayIsTop) score += 7;

  // Tier 3: Top domestic cup (FA Cup, Copa del Rey) — only if a top club is involved
  const domesticCups = [45, 48, 143, 137, 81, 66, 848];
  if (domesticCups.includes(match.league.id) && (homeIsTop || awayIsTop)) score += 5;

  // Tier 4: Top 5 league match with at least one top club
  const topLeagues = [39, 140, 135, 78, 61]; // PL, La Liga, Serie A, Bundesliga, Ligue 1
  if (topLeagues.includes(match.league.id) && (homeIsTop || awayIsTop)) score += 3;

  // Bonus: High-scoring match involving a top club
  if (totalGoals >= 5 && (homeIsTop || awayIsTop)) score += 2;

  // Bonus: High-scoring match in top league
  if (totalGoals >= 6 && topLeagues.includes(match.league.id)) score += 2;

  return score;
}

function isBigMatch(match: Match): boolean {
  return getMatchImportance(match) >= 5;
}

// ─── Narrative templates ────────────────────────────────────────────────────

const VICTORY_VERBS = ['defeated', 'overcame', 'beat', 'edged past', 'dispatched', 'outclassed', 'triumphed over', 'saw off'];
const BIG_WIN_VERBS = ['thrashed', 'demolished', 'crushed', 'hammered', 'dismantled', 'dominated'];
const DRAW_PHRASES = ['played out a', 'shared the spoils in a', 'could not be separated in a', 'settled for a'];
const GOALLESS_PHRASES = ['failed to find the net', 'were held to a goalless draw', 'cancelled each other out'];
const OPENERS = ['In an exciting encounter at', 'Under the floodlights,', 'In a tightly contested affair,', 'In a pulsating match,', 'The action was non-stop as'];
const SCORER_VERBS = ['opened the scoring', 'found the net', 'struck', 'fired home', 'converted', 'slotted in', 'headed in', 'slammed home'];
const SECOND_GOAL = ['doubled the lead', 'extended the advantage', 'made it two', 'added a second'];
const CONSOLATION = ['pulled one back', 'grabbed a consolation', 'reduced the deficit', 'scored a late goal'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getScorers(events: MatchEvent[] | undefined, side: 'home' | 'away'): { name: string; minute: number; detail?: string }[] {
  if (!events) return [];
  return events
    .filter(e => e.type === 'goal' && e.team === side)
    .map(e => ({ name: e.playerName, minute: e.minute, detail: e.detail }));
}

function formatScorerList(scorers: { name: string; minute: number; detail?: string }[]): string {
  if (!scorers.length) return '';
  return scorers.map(s => {
    let str = `${s.name} (${s.minute}')`;
    if (s.detail === 'Penalty') str += ' (pen)';
    if (s.detail === 'Own Goal') str += ' (og)';
    return str;
  }).join(', ');
}

function shortName(name: string): string {
  const parts = name.split(/\s+/);
  return parts.length > 1 ? `${parts[0].charAt(0)}. ${parts[parts.length - 1]}` : name;
}

// ─── Main generator ─────────────────────────────────────────────────────────

export function generateMatchReport(match: Match): Article | null {
  const isFinished = match.status === 'FT' || match.status === 'AET' || match.status === 'PEN';
  if (!isFinished || match.homeScore === null || match.awayScore === null) return null;

  const home = match.homeTeam.name;
  const away = match.awayTeam.name;
  const hs = match.homeScore;
  const as = match.awayScore;
  const total = hs + as;
  const margin = Math.abs(hs - as);
  const isDraw = hs === as;
  const homeWon = hs > as;
  const winner = homeWon ? home : away;
  const loser = homeWon ? away : home;
  const winScore = homeWon ? hs : as;
  const loseScore = homeWon ? as : hs;

  const homeScorers = getScorers(match.events, 'home');
  const awayScorers = getScorers(match.events, 'away');
  const winnerScorers = homeWon ? homeScorers : awayScorers;
  const loserScorers = homeWon ? awayScorers : homeScorers;

  // Build title
  let title: string;
  if (isDraw) {
    if (total === 0) {
      title = `${home} and ${away} play out goalless draw`;
    } else {
      title = `${home} ${hs} - ${as} ${away}: ${pick(DRAW_PHRASES)} ${hs}-${as} draw`;
    }
  } else if (margin >= 3) {
    title = `${winner} ${pick(BIG_WIN_VERBS)} ${loser} ${homeWon ? hs : as}-${homeWon ? as : hs}`;
  } else {
    title = `${winner} ${pick(VICTORY_VERBS)} ${loser} ${homeWon ? hs : as}-${homeWon ? as : hs}`;
  }

  // Build summary (1-2 sentences)
  let summary: string;
  if (isDraw && total === 0) {
    summary = `${home} and ${away} ${pick(GOALLESS_PHRASES)} in their ${match.league.name} clash.`;
  } else if (isDraw) {
    summary = `${home} and ${away} ${pick(DRAW_PHRASES)} ${hs}-${as} draw in the ${match.league.name}.`;
    if (homeScorers.length > 0) {
      summary += ` ${formatScorerList(homeScorers)} scored for ${home}, while ${formatScorerList(awayScorers)} responded for ${away}.`;
    }
  } else {
    const verb = margin >= 3 ? pick(BIG_WIN_VERBS) : pick(VICTORY_VERBS);
    summary = `${winner} ${verb} ${loser} ${winScore}-${loseScore} in the ${match.league.name}.`;
    if (winnerScorers.length > 0) {
      summary += ` ${formatScorerList(winnerScorers)} found the net for the winners.`;
    }
  }

  // Build body (3-5 paragraphs)
  const paragraphs: string[] = [];

  // Paragraph 1: Opening
  if (isDraw && total === 0) {
    paragraphs.push(
      `${home} and ${away} played out a goalless draw in the ${match.league.name}. Despite chances on both sides, neither team could find the breakthrough in what proved to be a tightly contested encounter.`
    );
  } else if (isDraw) {
    paragraphs.push(
      `${pick(OPENERS)} ${home} and ${away} shared the points in an entertaining ${hs}-${as} draw in the ${match.league.name}. Both teams showed attacking intent throughout the match, producing a total of ${total} goals.`
    );
  } else {
    paragraphs.push(
      `${winner} secured a ${margin >= 3 ? 'comprehensive' : 'hard-fought'} ${winScore}-${loseScore} victory over ${loser} in the ${match.league.name}. ${pick(OPENERS)} the ${winner} ${margin >= 3 ? 'were dominant from start to finish' : 'showed great determination to claim all three points'}.`
    );
  }

  // Paragraph 2: Goal details
  if (total > 0) {
    const goalDetails: string[] = [];

    if (homeScorers.length > 0) {
      const first = homeScorers[0];
      goalDetails.push(`${shortName(first.name)} ${pick(SCORER_VERBS)} for ${home} in the ${first.minute}th minute${first.detail === 'Penalty' ? ' from the penalty spot' : ''}.`);

      homeScorers.slice(1).forEach((s, i) => {
        if (i === 0 && homeWon) {
          goalDetails.push(`${shortName(s.name)} ${pick(SECOND_GOAL)} in the ${s.minute}th minute.`);
        } else {
          goalDetails.push(`${shortName(s.name)} also got on the scoresheet (${s.minute}').`);
        }
      });
    }

    if (awayScorers.length > 0) {
      const first = awayScorers[0];
      if (homeScorers.length > 0 && !homeWon) {
        goalDetails.push(`${shortName(first.name)} ${pick(SCORER_VERBS)} for ${away} to ${awayScorers.length > 1 ? 'begin the comeback' : 'level the scores'} in the ${first.minute}th minute.`);
      } else if (homeScorers.length > 0) {
        goalDetails.push(`${shortName(first.name)} ${pick(CONSOLATION)} for ${away} in the ${first.minute}th minute.`);
      } else {
        goalDetails.push(`${shortName(first.name)} ${pick(SCORER_VERBS)} for ${away} in the ${first.minute}th minute.`);
      }

      awayScorers.slice(1).forEach(s => {
        goalDetails.push(`${shortName(s.name)} added another for ${away} (${s.minute}').`);
      });
    }

    paragraphs.push(goalDetails.join(' '));
  }

  // Paragraph 3: Match stats (if available)
  if (match.stats) {
    const statsLines: string[] = [];
    if (match.stats.possession) {
      statsLines.push(`${home} had ${match.stats.possession[0]}% possession compared to ${away}'s ${match.stats.possession[1]}%`);
    }
    if (match.stats.shots) {
      statsLines.push(`The shot count read ${match.stats.shots[0]}-${match.stats.shots[1]} in favour of ${Number(match.stats.shots[0]) > Number(match.stats.shots[1]) ? home : away}`);
    }
    if (statsLines.length > 0) {
      paragraphs.push(statsLines.join('. ') + '.');
    }
  }

  // Paragraph 4: Conclusion
  if (!isDraw) {
    paragraphs.push(
      `The result ${margin >= 3 ? 'sends a strong statement' : 'is a valuable one'} for ${winner} as they look to build momentum in the ${match.league.name}. ${loser} will be looking to bounce back in their next fixture.`
    );
  } else {
    paragraphs.push(
      `Both ${home} and ${away} will feel they could have taken all three points, but a draw was perhaps a fair reflection of the match. Both sides will now turn their attention to their upcoming fixtures in the ${match.league.name}.`
    );
  }

  const slug = slugify(`${home}-${hs}-${as}-${away}-${match.date}`);
  const body = paragraphs.join('\n\n');

  return {
    id: `report-${match.id}`,
    slug,
    title,
    summary,
    body,
    category: isBigMatch(match) ? 'featured' as const : 'match-report' as const,
    leagueName: match.league.name,
    leagueLogo: match.league.logo,
    homeTeam: { name: home, logo: match.homeTeam.logo },
    awayTeam: { name: away, logo: match.awayTeam.logo },
    matchId: match.id,
    publishedAt: match.date || new Date().toISOString(),
    isFeatured: isBigMatch(match),
  };
}

// Generate reports for multiple matches
export function generateDailyReports(matches: Match[]): Article[] {
  const finished = matches.filter(m => m.status === 'FT' || m.status === 'AET' || m.status === 'PEN');
  
  const matchReports = finished
    .map(generateMatchReport)
    .filter((a): a is Article => a !== null);

  const roundups = generateLeagueRoundups(finished);
  const topMatches = generateTopMatchesArticle(finished);
  const playerOfDay = generatePlayerOfDay(finished);

  // Interleave: roundups first, then top matches, then individual reports
  return [...roundups, ...topMatches, ...playerOfDay, ...matchReports];
}

// ─── League Round-up ────────────────────────────────────────────────────────

const ROUNDUP_INTROS = [
  'Here\'s everything that happened in the',
  'A packed day of action in the',
  'All the results and talking points from the',
  'It was a thrilling day in the',
];

function generateLeagueRoundups(matches: Match[]): Article[] {
  // Group finished matches by league
  const byLeague = new Map<string, Match[]>();
  matches.forEach(m => {
    const key = m.league.name;
    if (!byLeague.has(key)) byLeague.set(key, []);
    byLeague.get(key)!.push(m);
  });

  const articles: Article[] = [];

  byLeague.forEach((leagueMatches, leagueName) => {
    // Only generate roundups for leagues with 3+ matches
    if (leagueMatches.length < 3) return;

    const league = leagueMatches[0].league;
    const totalGoals = leagueMatches.reduce((sum, m) => sum + (m.homeScore || 0) + (m.awayScore || 0), 0);
    const biggestWin = leagueMatches.reduce((best, m) => {
      const margin = Math.abs((m.homeScore || 0) - (m.awayScore || 0));
      const bestMargin = Math.abs((best.homeScore || 0) - (best.awayScore || 0));
      return margin > bestMargin ? m : best;
    }, leagueMatches[0]);

    const draws = leagueMatches.filter(m => m.homeScore === m.awayScore);
    const homeWins = leagueMatches.filter(m => (m.homeScore || 0) > (m.awayScore || 0));
    const awayWins = leagueMatches.filter(m => (m.awayScore || 0) > (m.homeScore || 0));

    const title = `${leagueName} Round-up: ${totalGoals} goals across ${leagueMatches.length} matches`;

    const summary = `${pick(ROUNDUP_INTROS)} ${leagueName} today. ${leagueMatches.length} matches produced ${totalGoals} goals, with ${homeWins.length} home wins, ${awayWins.length} away wins, and ${draws.length} draw${draws.length !== 1 ? 's' : ''}.`;

    const paragraphs: string[] = [];

    // Overview
    paragraphs.push(
      `A busy day in the ${leagueName} saw ${leagueMatches.length} matches take place, producing a combined ${totalGoals} goals. Home sides claimed ${homeWins.length} victor${homeWins.length !== 1 ? 'ies' : 'y'}, while ${awayWins.length} away win${awayWins.length !== 1 ? 's were' : ' was'} recorded. ${draws.length > 0 ? `${draws.length} match${draws.length !== 1 ? 'es' : ''} ended in a draw.` : 'There were no draws on the day.'}`
    );

    // Biggest win
    if (biggestWin.homeScore !== null && biggestWin.awayScore !== null) {
      const margin = Math.abs(biggestWin.homeScore - biggestWin.awayScore);
      if (margin >= 2) {
        const winner = biggestWin.homeScore > biggestWin.awayScore ? biggestWin.homeTeam.name : biggestWin.awayTeam.name;
        const loser = biggestWin.homeScore > biggestWin.awayScore ? biggestWin.awayTeam.name : biggestWin.homeTeam.name;
        paragraphs.push(
          `The standout result of the day saw ${winner} record a convincing ${biggestWin.homeScore}-${biggestWin.awayScore} victory over ${loser}. It was a dominant display that highlighted the gulf in quality between the two sides.`
        );
      }
    }

    // Results list
    const resultsList = leagueMatches.map(m =>
      `${m.homeTeam.name} ${m.homeScore}-${m.awayScore} ${m.awayTeam.name}`
    ).join(', ');
    paragraphs.push(`Full results: ${resultsList}.`);

    const slug = slugify(`${leagueName}-roundup-${new Date().toISOString().split('T')[0]}`);

    articles.push({
      id: `roundup-${league.id}`,
      slug,
      title,
      summary,
      body: paragraphs.join('\n\n'),
      category: 'roundup',
      leagueName,
      leagueLogo: league.logo,
      homeTeam: { name: leagueName, logo: league.logo },
      awayTeam: { name: '', logo: undefined },
      matchId: leagueMatches[0].id,
      publishedAt: new Date().toISOString(),
    isFeatured: false,
    });
  });

  return articles;
}

// ─── Top Matches of the Day ─────────────────────────────────────────────────

function generateTopMatchesArticle(matches: Match[]): Article[] {
  if (matches.length < 5) return [];

  // Score matches by excitement: total goals + margin closeness
  const scored = matches
    .filter(m => m.homeScore !== null && m.awayScore !== null)
    .map(m => {
      const total = (m.homeScore || 0) + (m.awayScore || 0);
      const margin = Math.abs((m.homeScore || 0) - (m.awayScore || 0));
      const excitement = total * 2 + (margin <= 1 ? 3 : 0) + (total >= 5 ? 5 : 0);
      return { match: m, excitement, total };
    })
    .sort((a, b) => b.excitement - a.excitement)
    .slice(0, 5);

  if (scored.length < 3) return [];

  const totalGoalsAll = matches.reduce((sum, m) => sum + (m.homeScore || 0) + (m.awayScore || 0), 0);

  const title = `Top ${scored.length} Matches of the Day: ${totalGoalsAll} goals across ${matches.length} fixtures`;

  const summary = `From high-scoring thrillers to nail-biting finishes, here are today's most exciting matches from around the football world.`;

  const paragraphs: string[] = [];

  paragraphs.push(
    `It was a spectacular day of football with ${totalGoalsAll} goals scored across ${matches.length} matches worldwide. Here are the games that stood out above the rest.`
  );

  scored.forEach((s, i) => {
    const m = s.match;
    const isDraw = m.homeScore === m.awayScore;
    const homeWon = (m.homeScore || 0) > (m.awayScore || 0);
    const winner = homeWon ? m.homeTeam.name : m.awayTeam.name;

    if (isDraw) {
      paragraphs.push(
        `${i + 1}. ${m.homeTeam.name} ${m.homeScore}-${m.awayScore} ${m.awayTeam.name} (${m.league.name}) — An entertaining draw that saw both sides create plenty of chances. ${s.total} goals were shared in a match that could have gone either way.`
      );
    } else if (s.total >= 5) {
      paragraphs.push(
        `${i + 1}. ${m.homeTeam.name} ${m.homeScore}-${m.awayScore} ${m.awayTeam.name} (${m.league.name}) — A goal-fest that produced ${s.total} goals. ${winner} emerged victorious in a match that had everything.`
      );
    } else {
      paragraphs.push(
        `${i + 1}. ${m.homeTeam.name} ${m.homeScore}-${m.awayScore} ${m.awayTeam.name} (${m.league.name}) — ${winner} claimed the points in a ${s.total > 3 ? 'thrilling' : 'competitive'} encounter in the ${m.league.name}.`
      );
    }
  });

  const slug = slugify(`top-matches-of-the-day-${new Date().toISOString().split('T')[0]}`);

  return [{
    id: 'top-matches',
    slug,
    title,
    summary,
    body: paragraphs.join('\n\n'),
    category: 'roundup',
    leagueName: 'All Leagues',
    leagueLogo: undefined,
    homeTeam: { name: 'Top Matches', logo: undefined },
    awayTeam: { name: '', logo: undefined },
    matchId: scored[0].match.id,
    publishedAt: new Date().toISOString(),
    isFeatured: false,
  }];
}

// ─── Player of the Day ──────────────────────────────────────────────────────

function generatePlayerOfDay(matches: Match[]): Article[] {
  // Find player with most goals today
  const scorerMap = new Map<string, { name: string; goals: number; teams: string[]; leagues: string[] }>();

  matches.forEach(m => {
    if (!m.events) return;
    m.events.forEach(e => {
      if (e.type !== 'goal' || e.detail === 'Own Goal') return;
      const existing = scorerMap.get(e.playerName) || { name: e.playerName, goals: 0, teams: [], leagues: [] };
      existing.goals++;
      const teamName = e.team === 'home' ? m.homeTeam.name : m.awayTeam.name;
      if (!existing.teams.includes(teamName)) existing.teams.push(teamName);
      if (!existing.leagues.includes(m.league.name)) existing.leagues.push(m.league.name);
      scorerMap.set(e.playerName, existing);
    });
  });

  if (scorerMap.size === 0) return [];

  // Find top scorer
  const topScorer = Array.from(scorerMap.values()).sort((a, b) => b.goals - a.goals)[0];
  if (topScorer.goals < 2) return []; // Only generate if someone scored 2+

  const title = `Player of the Day: ${topScorer.name} scores ${topScorer.goals} goals`;
  const summary = `${topScorer.name} was the standout performer today, finding the net ${topScorer.goals} times for ${topScorer.teams[0]} in the ${topScorer.leagues[0]}.`;

  const paragraphs: string[] = [];

  paragraphs.push(
    `${topScorer.name} stole the headlines today with an impressive ${topScorer.goals}-goal haul for ${topScorer.teams[0]}. The striker was in scintillating form, causing problems for the opposition defence throughout the match.`
  );

  if (topScorer.goals >= 3) {
    paragraphs.push(
      `A hat-trick is always a special occasion, and ${topScorer.name} delivered in style. Each goal showcased different aspects of the player's ability, from clinical finishing to intelligent movement.`
    );
  } else {
    paragraphs.push(
      `The brace demonstrated ${topScorer.name}'s eye for goal and ability to be in the right place at the right time. It was a performance that will have caught the attention of fans and pundits alike.`
    );
  }

  paragraphs.push(
    `${topScorer.name} will be hoping to carry this form into the next match and continue climbing the league's scoring charts.`
  );

  const slug = slugify(`player-of-the-day-${topScorer.name}-${new Date().toISOString().split('T')[0]}`);

  return [{
    id: 'player-of-day',
    slug,
    title,
    summary,
    body: paragraphs.join('\n\n'),
    category: 'roundup',
    leagueName: topScorer.leagues[0],
    leagueLogo: undefined,
    homeTeam: { name: topScorer.name, logo: undefined },
    awayTeam: { name: '', logo: undefined },
    matchId: matches[0].id,
    publishedAt: new Date().toISOString(),
    isFeatured: false,
  }];
}
