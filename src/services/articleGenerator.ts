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

  // Tier 0: World Cup — the biggest competition, always top priority
  if (match.league.id === 1) {
    score += 12;
    if (CUP_KNOCKOUT_STAGES.some(s => (match.league.name || '').includes(s))) score += 4;
    if (totalGoals >= 4) score += 1;
    return score;
  }

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
  const as_ = match.awayScore;
  const total = hs + as_;
  const margin = Math.abs(hs - as_);
  const isDraw = hs === as_;
  const homeWon = hs > as_;
  const winner = homeWon ? home : away;
  const loser = homeWon ? away : home;
  const winScore = homeWon ? hs : as_;
  const loseScore = homeWon ? as_ : hs;
  const isAET = match.status === 'AET';
  const isPEN = match.status === 'PEN';

  const homeScorers = getScorers(match.events, 'home');
  const awayScorers = getScorers(match.events, 'away');
  const winnerScorers = homeWon ? homeScorers : awayScorers;
  const loserScorers = homeWon ? awayScorers : homeScorers;
  const allScorers = [...homeScorers, ...awayScorers].sort((a, b) => a.minute - b.minute);
  const firstGoal = allScorers[0];
  const lastGoal = allScorers[allScorers.length - 1];

  const isUCL = match.league.id === 2;
  const isUEL = match.league.id === 3;
  const isPL = match.league.id === 39;
  const isBig = isBigMatch(match);

  // Red/Yellow card events
  const reds = match.events?.filter(e => e.type === 'red_card') || [];
  const subs = match.events?.filter(e => e.type === 'substitution') || [];

  // Stats
  const possession = match.stats?.possession;
  const shots = match.stats?.shots;
  const shotsOnTarget = match.stats?.shotsOnTarget;

  // ─── HEADLINE — Drama first, scoreline second ────────────────────────
  let title: string;

  if (isPEN) {
    title = `${winner} edge ${loser} on penalties after ${hs}-${as_} draw`;
  } else if (isAET) {
    title = `${winner} prevail ${winScore}-${loseScore} after extra-time drama against ${loser}`;
  } else if (isDraw && total === 0) {
    title = `${home} and ${away} locked in goalless stalemate`;
  } else if (isDraw) {
    const latestScorer = lastGoal ? shortName(lastGoal.name) : '';
    if (lastGoal && lastGoal.minute >= 85) {
      title = `${latestScorer}'s late ${lastGoal.minute}th-minute strike earns ${lastGoal.team === 'home' ? home : away} a point in ${hs}-${as_} thriller`;
    } else {
      title = `${home} and ${away} share the spoils in ${total}-goal ${isUCL ? 'Champions League' : ''} draw`;
    }
  } else if (firstGoal && winnerScorers.length > 0) {
    const heroScorer = winnerScorers.length >= 2
      ? winnerScorers.find(s => winnerScorers.filter(x => x.name === s.name).length >= 2) || winnerScorers[0]
      : winnerScorers[0];

    const hatTrick = winnerScorers.filter(s => s.name === heroScorer.name).length >= 3;
    const brace = winnerScorers.filter(s => s.name === heroScorer.name).length === 2;

    if (hatTrick) {
      title = `${shortName(heroScorer.name)} hat-trick fires ${winner} past ${loser}`;
    } else if (brace) {
      title = `${shortName(heroScorer.name)} brace leads ${winner} to ${winScore}-${loseScore} victory over ${loser}`;
    } else if (margin >= 3) {
      title = `${winner} ${pick(BIG_WIN_VERBS)} ${loser} in ${total}-goal ${isUCL ? 'Champions League ' : ''}rout`;
    } else if (lastGoal && lastGoal.minute >= 85 && ((lastGoal.team === 'home' && homeWon) || (lastGoal.team === 'away' && !homeWon))) {
      title = `${shortName(lastGoal.name)}'s ${lastGoal.minute}th-minute winner seals ${winner} victory`;
    } else if (reds.length > 0) {
      title = `${winner} capitalize on red card to overcome ${loser} ${winScore}-${loseScore}`;
    } else {
      title = `${shortName(heroScorer.name)}'s ${heroScorer.detail === 'Penalty' ? 'penalty' : 'strike'} ${winnerScorers.length === 1 ? 'proves decisive as' : 'inspires'} ${winner} ${pick(['triumph', 'beat', 'edge past', 'overcome'])} ${loser}`;
    }
  } else {
    title = `${winner} ${pick(VICTORY_VERBS)} ${loser} ${winScore}-${loseScore}`;
  }

  // ─── SUMMARY — Key narrative in 1-2 sentences ────────────────────────
  let summary: string;
  const compName = isUCL ? 'UEFA Champions League' : isUEL ? 'UEFA Europa League' : match.league.name;

  if (isDraw && total === 0) {
    summary = `${home} and ${away} were unable to find a breakthrough in a ${compName} encounter that ended goalless.`;
  } else if (isDraw) {
    summary = `${home} and ${away} played out an entertaining ${hs}-${as_} draw in the ${compName}.`;
  } else if (margin >= 3) {
    summary = `${winner} produced a devastating display to dismantle ${loser} ${winScore}-${loseScore} in the ${compName}. ${formatScorerList(winnerScorers)} were on target for the dominant side.`;
  } else {
    summary = `${winner} claimed a ${winScore}-${loseScore} ${isAET ? 'extra-time ' : ''}victory over ${loser} in the ${compName}.`;
    if (winnerScorers.length > 0) {
      summary += ` ${formatScorerList(winnerScorers)} made the difference.`;
    }
  }

  // ─── BODY — Journalism-quality narrative ─────────────────────────────
  const paragraphs: string[] = [];

  // LEAD: Open with the moment, not the scoreline
  if (isDraw && total === 0) {
    paragraphs.push(
      `Neither ${home} nor ${away} could break the deadlock in a cagey ${compName} affair that will leave both managers frustrated. ${possession ? `${home} saw more of the ball at ${possession[0]}%, but` : 'Despite periods of pressure,'} clear-cut chances were at a premium throughout.`
    );
  } else if (isDraw) {
    if (lastGoal && lastGoal.minute >= 80) {
      paragraphs.push(
        `${shortName(lastGoal.name)}'s intervention in the ${lastGoal.minute}th minute ensured the points were shared in a dramatic ${hs}-${as_} draw between ${home} and ${away}. What had appeared a comfortable position for ${lastGoal.team === 'home' ? away : home} was snatched away in the closing stages of this ${compName} contest.`
      );
    } else {
      paragraphs.push(
        `${home} and ${away} played out a ${total >= 4 ? 'breathless' : 'competitive'} ${hs}-${as_} draw in the ${compName}. Both sides had their moments in a match that demonstrated why neither was willing to settle for anything less than a point.`
      );
    }
  } else if (firstGoal) {
    if (firstGoal.minute <= 15) {
      paragraphs.push(
        `An early breakthrough from ${shortName(firstGoal.name)} in the ${firstGoal.minute}th minute set the tone as ${winner} ${margin >= 3 ? 'ran riot' : 'secured'} a ${winScore}-${loseScore} victory over ${loser} in the ${compName}. The ${firstGoal.team === 'home' ? 'home side' : 'visitors'} never looked back after seizing the initiative.`
      );
    } else if (firstGoal.minute >= 75) {
      paragraphs.push(
        `After a tense battle of attrition, ${shortName(firstGoal.name)} finally broke the resistance in the ${firstGoal.minute}th minute to hand ${winner} a ${winScore}-${loseScore} victory over ${loser}. The ${compName} encounter had looked destined for a stalemate before the decisive moment arrived.`
      );
    } else {
      paragraphs.push(
        `${shortName(firstGoal.name)}'s ${firstGoal.minute}th-minute ${firstGoal.detail === 'Penalty' ? 'penalty' : 'goal'} proved the catalyst as ${winner} ${margin >= 3 ? 'dismantled' : 'overcame'} ${loser} ${winScore}-${loseScore} in the ${compName}. ${homeWon ? `The home faithful were given plenty to celebrate` : `It was a statement performance from the visitors`} on a night that underlined their credentials.`
      );
    }
  } else {
    paragraphs.push(
      `${winner} recorded a ${winScore}-${loseScore} victory over ${loser} in the ${compName}, extending their positive run of form. It was a professional display that kept their ${isPL ? 'Premier League' : 'campaign'} ambitions firmly on track.`
    );
  }

  // GOAL DETAILS: Build the narrative chronologically
  if (total > 0 && allScorers.length > 0) {
    const goalNarrative: string[] = [];

    allScorers.forEach((scorer, idx) => {
      const team = scorer.team === 'home' ? home : away;
      const name = shortName(scorer.name);
      const min = scorer.minute;

      if (idx === 0) {
        const assist = match.events?.find(e => e.type === 'goal' && e.minute === min && e.assistName);
        goalNarrative.push(
          `${name} ${pick(SCORER_VERBS)} for ${team} on ${min} minutes${assist?.assistName ? `, with ${shortName(assist.assistName)} providing the assist` : ''}${scorer.detail === 'Penalty' ? ' from the penalty spot' : ''}.`
        );
      } else {
        const currentHS = homeScorers.filter(s => s.minute <= min).length;
        const currentAS = awayScorers.filter(s => s.minute <= min).length;

        if (scorer.team === (homeWon ? 'home' : 'away') && idx === 1 && !isDraw) {
          goalNarrative.push(`${name} ${pick(SECOND_GOAL)} for ${team} in the ${min}th minute, giving the ${homeWon ? 'hosts' : 'visitors'} breathing room.`);
        } else if (min >= 85) {
          goalNarrative.push(`Deep into the match, ${name} struck in the ${min}th minute to ${currentHS === currentAS ? 'level proceedings' : 'seal the result'} for ${team}.`);
        } else {
          goalNarrative.push(`${name} found the net for ${team} (${min}')${scorer.detail === 'Penalty' ? ' from the spot' : ''}, making it ${currentHS}-${currentAS}.`);
        }
      }
    });

    paragraphs.push(goalNarrative.join(' '));
  }

  // STATS PARAGRAPH: Use specific numbers to tell the tactical story
  if (match.stats) {
    const statsNarrative: string[] = [];

    if (possession) {
      const domTeam = Number(possession[0]) > Number(possession[1]) ? home : away;
      const domPct = Math.max(Number(possession[0]), Number(possession[1]));
      if (domPct >= 60) {
        statsNarrative.push(`${domTeam} dominated possession with ${domPct}% of the ball${domTeam === loser ? ', though it counted for little on the scoresheet' : ', controlling the tempo throughout'}`);
      } else {
        statsNarrative.push(`Possession was closely contested at ${possession[0]}%-${possession[1]}%`);
      }
    }

    if (shots && shotsOnTarget) {
      const homeShots = Number(shots[0]);
      const awayShots = Number(shots[1]);
      const homeSOT = Number(shotsOnTarget[0]);
      const awaySOT = Number(shotsOnTarget[1]);
      const shotLeader = homeShots > awayShots ? home : away;
      statsNarrative.push(`${shotLeader} created more shooting opportunities with a ${homeShots}-${awayShots} advantage in total shots (${homeSOT}-${awaySOT} on target)`);
    }

    if (statsNarrative.length > 0) {
      paragraphs.push(`The numbers told their own story. ${statsNarrative.join(', while ')}.`);
    }
  }

  // RED CARDS: Major narrative event
  if (reds.length > 0) {
    const red = reds[0];
    paragraphs.push(
      `The complexion of the match changed in the ${red.minute}th minute when ${red.playerName} received a red card for ${red.team === 'home' ? home : away}, leaving them to battle on with ten men for the remainder of the contest.`
    );
  }

  // CLOSING: Forward-looking, never a summary
  if (!isDraw) {
    if (isBig && isUCL) {
      paragraphs.push(
        `${winner} march on in the Champions League with their sights set firmly on further progress. For ${loser}, the focus now shifts to regrouping ahead of their next assignment. The margin between the sides was ${margin === 1 ? 'wafer-thin' : 'clear for all to see'}, but on this occasion it was ${winner} who found the decisive quality.`
      );
    } else if (isBig) {
      paragraphs.push(
        `It is a result that will resonate far beyond this single fixture for ${winner}, who continue to demonstrate the quality required to challenge at the highest level. ${loser} will need to respond quickly with a demanding schedule ahead.`
      );
    } else {
      paragraphs.push(
        `${winner} will look to carry this momentum into their next ${compName} fixture, while ${loser} must regroup quickly. Both sides remain in contention as the ${isPL ? 'Premier League season' : 'campaign'} enters a crucial phase.`
      );
    }
  } else {
    paragraphs.push(
      `A point apiece means the ${compName} picture remains tight. Both ${home} and ${away} will feel there was more to gain here, and their attention now turns to the challenges that lie ahead.`
    );
  }

  const slug = slugify(`${home}-${hs}-${as_}-${away}-${match.date}`);
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
// Leagues worth generating individual match reports + roundups for.
// Everything else (4th-tier regional divisions, youth, etc.) is noise.
const NOTABLE_LEAGUE_IDS = new Set([
  1,    // World Cup
  2, 3, // Champions League, Europa League
  848,  // Conference League
  39, 140, 135, 78, 61, // PL, La Liga, Serie A, Bundesliga, Ligue 1
  88, 94, 144, 203, 197, 71, 128, 253, 262, // Eredivisie, Primeira, Belgian, Super Lig, Greek, Brazil, Argentina, MLS, Liga MX
  45, 48, 143, 137, 81, 66, // major domestic cups (FA Cup, Carabao, Copa del Rey, Coppa Italia, DFB, Coupe de France)
  4, 5, 9, 6, 13, // Euro, Nations League, Copa America, AFCON, Copa Libertadores
]);

export function generateDailyReports(matches: Match[]): Article[] {
  const finished = matches.filter(m => m.status === 'FT' || m.status === 'AET' || m.status === 'PEN');

  // Only report on notable competitions — keeps the feed focused on football people follow
  const notable = finished.filter(m => NOTABLE_LEAGUE_IDS.has(m.league.id));

  const matchReports = notable
    .map(generateMatchReport)
    .filter((a): a is Article => a !== null)
    // Most important first (World Cup leads), then by goals
    .sort((a, b) => {
      const ai = a.isFeatured ? 1 : 0, bi = b.isFeatured ? 1 : 0;
      if (ai !== bi) return bi - ai;
      const aWC = a.leagueName?.toLowerCase().includes('world cup') ? 1 : 0;
      const bWC = b.leagueName?.toLowerCase().includes('world cup') ? 1 : 0;
      return bWC - aWC;
    });

  const roundups = generateLeagueRoundups(notable);
  const topMatches = generateTopMatchesArticle(notable);
  const playerOfDay = generatePlayerOfDay(notable);

  // World Cup roundup first, then other roundups, top matches, then individual reports
  roundups.sort((a, b) => {
    const aWC = a.leagueName?.toLowerCase().includes('world cup') ? 1 : 0;
    const bWC = b.leagueName?.toLowerCase().includes('world cup') ? 1 : 0;
    return bWC - aWC;
  });
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
