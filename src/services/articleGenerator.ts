import { Match, MatchEvent } from '@/types/football';

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: 'match-report' | 'preview' | 'roundup';
  leagueName: string;
  leagueLogo?: string;
  homeTeam: { name: string; logo?: string };
  awayTeam: { name: string; logo?: string };
  matchId: number;
  publishedAt: string;
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
    category: 'match-report',
    leagueName: match.league.name,
    leagueLogo: match.league.logo,
    homeTeam: { name: home, logo: match.homeTeam.logo },
    awayTeam: { name: away, logo: match.awayTeam.logo },
    matchId: match.id,
    publishedAt: new Date().toISOString(),
  };
}

// Generate reports for multiple matches
export function generateDailyReports(matches: Match[]): Article[] {
  return matches
    .filter(m => m.status === 'FT' || m.status === 'AET' || m.status === 'PEN')
    .map(generateMatchReport)
    .filter((a): a is Article => a !== null);
}
