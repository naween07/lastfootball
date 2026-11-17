// Copied verbatim from the website's src/services/articleGenerator.ts.
//
// Kept byte-identical below this line on purpose: the whole point of moving
// generation to the backend is that the site and the app stop having separate
// implementations that drift. Only this import differs, because the backend
// has no '@/types/football' -- the same shapes are declared next door instead.
//
// When this file is updated, update the website's copy with it, or delete the
// website's once it reads reports from the API.
import { Match, MatchEvent } from '@/types/football';
import { slugify } from "@/utils/newsDerive";

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

/**
 * 1st, 2nd, 3rd -- and 11th, 12th, 13th, which are the pair of rules a naive
 * version gets wrong.
 *
 * Every minute in these reports used to be written `${minute}th`, which is
 * right about two thirds of the time and produced "1th minute" and "42th
 * minute" in 148 published articles, headlines included.
 */
function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Slugging lives in newsDerive, shared with the admin path.
//
// This file used to carry its own one-line version with no normalisation, so
// "Bayern Munchen" came out as "bayern-m-nchen" -- an ugly URL, and a
// different one from the slug the website's copy of this generator produces
// for the same match, which is exactly the kind of divergence that turns a
// merge of the two stores into duplicates.

// `team` is carried through deliberately. The body of generateMatchReport reads
// `firstGoal.team`, `lastGoal.team` and `scorer.team` to decide which side a
// goal belongs to once home and away scorers have been merged into one
// chronological list. The website's copy of this function drops the field, so
// on the website every one of those reads is `undefined` at runtime and the
// comparisons silently take the wrong branch. Vite never type-checks, so
// nothing surfaced it there; `tsc` here caught it immediately.
export function getScorers(
  events: MatchEvent[] | undefined,
  side: 'home' | 'away',
): { name: string; minute: number; detail?: string; team: 'home' | 'away' }[] {
  if (!events) return [];
  return events
    .filter(e => e.type === 'goal' && e.team === side)
    .map(e => ({ name: e.playerName, minute: e.minute, detail: e.detail, team: e.team }));
}

function formatScorerList(scorers: { name: string; minute: number; detail?: string }[]): string {
  if (!scorers.length) return '';
  return scorers.map(s => {
    let str = `${shortName(s.name)} (${s.minute}')`;
    if (s.detail === 'Penalty') str += ' (pen)';
    if (s.detail === 'Own Goal') str += ' (og)';
    return str;
  }).join(', ');
}

// Provider names arrive dirty. A trailing space ("Ezri Konsa ") split into an
// empty final part and published the byline "E. ", and some feeds send a name
// already lowercased and abbreviated ("a. svanback"), which reached a headline
// verbatim. Only a name carrying no capital at all is re-cased, so "Kevin De
// Bruyne" and "Virgil van Dijk" stay exactly as the provider sent them.
function titleCasePlayer(name: string): string {
  if (/[A-Z]/.test(name)) return name;
  return name.replace(/([a-z])([a-z'\u2019-]*)/g, (_m, first: string, rest: string) => first.toUpperCase() + rest);
}

function shortName(name: string): string {
  const parts = titleCasePlayer((name || '').trim()).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0].charAt(0)}. ${parts[parts.length - 1]}`;
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
  const isAET = match.status === 'AET';
  const isPEN = match.status === 'PEN';

  // A shootout is not a scoreline. For these ties the provider hands the
  // winner one extra goal in `goals` -- 0-0 came back as 1-0, 2-2 as 2-3 --
  // so the figure printed beside the result was fiction: "Sottevillais edge
  // Fecamp on penalties after 1-0 draw", over a body that called it a 1-0
  // victory and never mentioned penalties at all. So for a shootout the
  // winner comes from the penalty score and the ninety-minute score is
  // counted from the goals actually scored, never from hs/as_. When those
  // counts disagree the score is simply left out rather than guessed.
  const penH = typeof match.penaltyHome === 'number' ? match.penaltyHome : null;
  const penA = typeof match.penaltyAway === 'number' ? match.penaltyAway : null;
  const hasPenScore = penH !== null && penA !== null && penH !== penA;
  const penWinScore = hasPenScore ? Math.max(penH as number, penA as number) : null;
  const penLoseScore = hasPenScore ? Math.min(penH as number, penA as number) : null;

  const goalEvents = (match.events || []).filter(e => e.type === 'goal');
  const regHome = goalEvents.filter(e => e.team === 'home').length;
  const regAway = goalEvents.filter(e => e.team === 'away').length;
  const knowRegScore = isPEN && goalEvents.length > 0 && regHome === regAway;

  const isDraw = isPEN ? false : hs === as_;
  const homeWon = isPEN
    ? hasPenScore
      ? (penH as number) > (penA as number)
      : match.homeWinner === true || (match.awayWinner !== true && hs > as_)
    : hs > as_;
  const winner = homeWon ? home : away;
  const loser = homeWon ? away : home;
  const winScore = homeWon ? hs : as_;
  const loseScore = homeWon ? as_ : hs;

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
    const penPart = hasPenScore ? ` ${penWinScore}-${penLoseScore} on penalties` : ' on penalties';
    title = knowRegScore
      ? `${winner} edge ${loser}${penPart} after ${regHome}-${regAway} draw`
      : `${winner} edge ${loser}${penPart}`;
  } else if (isAET) {
    title = `${winner} prevail ${winScore}-${loseScore} after extra-time drama against ${loser}`;
  } else if (isDraw && total === 0) {
    title = `${home} and ${away} locked in goalless stalemate`;
  } else if (isDraw) {
    const latestScorer = lastGoal ? shortName(lastGoal.name) : '';
    if (lastGoal && lastGoal.minute >= 85 && lastGoal.detail !== 'Own Goal') {
      title = `${latestScorer}'s late ${ordinal(lastGoal.minute)}-minute strike earns ${lastGoal.team === 'home' ? home : away} a point in ${hs}-${as_} thriller`;
    } else {
      title = `${home} and ${away} share the spoils in a ${total}-goal ${isUCL ? 'Champions League ' : ''}draw`;
    }
  } else if (firstGoal && winnerScorers.length > 0) {
    // An own goal is credited to the side that benefits, so it lands in
    // winnerScorers -- but the player is on the other team. Choosing a hero
    // from that list put "R. Khedira's strike inspires SC Freiburg beat
    // Union Berlin" into a headline, celebrating a Union Berlin player for
    // putting the ball into his own net. It could also hand someone a
    // "brace" made of one real goal and one own goal.
    const heroCandidates = winnerScorers.filter(s => s.detail !== 'Own Goal');
    const heroScorer =
      heroCandidates.length >= 2
        ? heroCandidates.find(s => heroCandidates.filter(x => x.name === s.name).length >= 2) || heroCandidates[0]
        : heroCandidates[0];

    const hatTrick = !!heroScorer && heroCandidates.filter(s => s.name === heroScorer.name).length >= 3;
    const brace = !!heroScorer && heroCandidates.filter(s => s.name === heroScorer.name).length === 2;

    if (!heroScorer) {
      // Every goal the winner got was put in by the opposition.
      title = `${winner} ${pick(VICTORY_VERBS)} ${loser} ${winScore}-${loseScore}`;
    } else if (hatTrick) {
      title = `${shortName(heroScorer.name)} hat-trick fires ${winner} past ${loser}`;
    } else if (brace) {
      title = `${shortName(heroScorer.name)} brace leads ${winner} to ${winScore}-${loseScore} victory over ${loser}`;
    } else if (margin >= 3) {
      title = `${winner} ${pick(BIG_WIN_VERBS)} ${loser} in ${total}-goal ${isUCL ? 'Champions League ' : ''}rout`;
    } else if (lastGoal && lastGoal.minute >= 85 && lastGoal.detail !== 'Own Goal' && ((lastGoal.team === 'home' && homeWon) || (lastGoal.team === 'away' && !homeWon))) {
      title = `${shortName(lastGoal.name)}'s ${ordinal(lastGoal.minute)}-minute winner seals ${winner} victory`;
    } else if (reds.some(r => (r.team === 'home') !== homeWon)) {
      // Only when the dismissal was the losing side's. Real Betis won 3-2
      // having had a man sent off, and the old condition would have had them
      // capitalising on their own red card.
      title = `${winner} capitalize on red card to overcome ${loser} ${winScore}-${loseScore}`;
    } else {
      // Two separate shapes, because the two connectives do not take the
      // same grammar: "proves decisive as Brighton beat Brentford" against
      // "inspires Brighton to beat Brentford". Sharing one template produced
      // "inspires Brighton edge past Brentford" in 140 published headlines.
      //
      // "triumph" carries its preposition for the same reason -- "Brighton
      // triumph Brentford" was in 46 more.
      const winVerb = pick(['triumph over', 'beat', 'edge past', 'overcome']);
      const heroDeed = heroScorer.detail === 'Penalty' ? 'penalty' : 'strike';
      title =
        winnerScorers.length === 1
          ? `${shortName(heroScorer.name)}'s ${heroDeed} proves decisive as ${winner} ${winVerb} ${loser}`
          : `${shortName(heroScorer.name)}'s ${heroDeed} inspires ${winner} to ${winVerb} ${loser}`;
    }
  } else {
    title = `${winner} ${pick(VICTORY_VERBS)} ${loser} ${winScore}-${loseScore}`;
  }

  // A headline never ships lowercase, whatever the provider sent.
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // ─── SUMMARY — Key narrative in 1-2 sentences ────────────────────────
  let summary: string;
  const compName = isUCL ? 'UEFA Champions League' : isUEL ? 'UEFA Europa League' : match.league.name;

  if (isPEN) {
    summary = `${winner} came through a penalty shootout to beat ${loser} in the ${compName}${knowRegScore ? `, the tie having finished ${regHome}-${regAway}` : ''}${hasPenScore ? `, winning ${penWinScore}-${penLoseScore} from the spot` : ''}.`;
  } else if (isDraw && total === 0) {
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
  if (isPEN) {
    paragraphs.push(
      `${winner} needed a penalty shootout to settle their ${compName} tie with ${loser}${knowRegScore ? `, the match itself having ended ${regHome}-${regAway}` : ''}. ${hasPenScore ? `They held their nerve from twelve yards to come through ${penWinScore}-${penLoseScore} and take their place in the next round.` : `They held their nerve from twelve yards to take their place in the next round.`}`
    );
  } else if (isDraw && total === 0) {
    paragraphs.push(
      `Neither ${home} nor ${away} could break the deadlock in a cagey ${compName} affair that will leave both managers frustrated. ${possession ? `${home} saw more of the ball at ${possession[0]}%, but` : 'Despite periods of pressure,'} clear-cut chances were at a premium throughout.`
    );
  } else if (isDraw) {
    if (lastGoal && lastGoal.minute >= 80) {
      paragraphs.push(
        `${shortName(lastGoal.name)}'s intervention in the ${ordinal(lastGoal.minute)} minute ensured the points were shared in a dramatic ${hs}-${as_} draw between ${home} and ${away}. What had appeared a comfortable position for ${lastGoal.team === 'home' ? away : home} was snatched away in the closing stages of this ${compName} contest.`
      );
    } else {
      paragraphs.push(
        `${home} and ${away} played out a ${total >= 4 ? 'breathless' : 'competitive'} ${hs}-${as_} draw in the ${compName}. Both sides had their moments in a match that demonstrated why neither was willing to settle for anything less than a point.`
      );
    }
  } else if (firstGoal) {
    // Did the side that scored first go on to win? When it did not, this was
    // a comeback, and every template below reads as a falsehood: "set the
    // tone", "proved the catalyst" and "never looked back" all describe a
    // team that lost. 17 published reports told readers the home side never
    // looked back from a match they went on to lose.
    const winnerScoredFirst = firstGoal.team === (homeWon ? 'home' : 'away');
    const firstWasOwnGoal = firstGoal.detail === 'Own Goal';

    if (!winnerScoredFirst) {
      const opener = firstWasOwnGoal
        ? `an own goal from ${shortName(firstGoal.name)}`
        : `a strike from ${shortName(firstGoal.name)}`;
      paragraphs.push(
        `${loser} went ahead through ${opener} in the ${ordinal(firstGoal.minute)} minute, but ${winner} came from behind to win ${winScore}-${loseScore} in the ${compName}. The turnaround left ${loser} to reflect on a lead they could not protect.`
      );
    } else if (firstWasOwnGoal) {
      paragraphs.push(
        `${winner} were handed the opening they wanted when ${shortName(firstGoal.name)} turned the ball into his own net in the ${ordinal(firstGoal.minute)} minute, and they went on to beat ${loser} ${winScore}-${loseScore} in the ${compName}.`
      );
    } else if (firstGoal.minute <= 15) {
      paragraphs.push(
        `An early breakthrough from ${shortName(firstGoal.name)} in the ${ordinal(firstGoal.minute)} minute set the tone as ${winner} ${margin >= 3 ? 'ran riot in' : 'secured'} a ${winScore}-${loseScore} victory over ${loser} in the ${compName}. The ${homeWon ? 'home side' : 'visitors'} never looked back after seizing the initiative.`
      );
    } else if (firstGoal.minute >= 75) {
      paragraphs.push(
        `After a tense battle of attrition, ${shortName(firstGoal.name)} finally broke the resistance in the ${ordinal(firstGoal.minute)} minute to hand ${winner} a ${winScore}-${loseScore} victory over ${loser}. The ${compName} encounter had looked destined for a stalemate before the decisive moment arrived.`
      );
    } else {
      paragraphs.push(
        `${shortName(firstGoal.name)}'s ${ordinal(firstGoal.minute)}-minute ${firstGoal.detail === 'Penalty' ? 'penalty' : 'goal'} proved the catalyst as ${winner} ${margin >= 3 ? 'dismantled' : 'overcame'} ${loser} ${winScore}-${loseScore} in the ${compName}. ${homeWon ? `The home faithful were given plenty to celebrate` : `It was a statement performance from the visitors`} on a night that underlined their credentials.`
      );
    }
  } else {
    paragraphs.push(
      `${winner} recorded a ${winScore}-${loseScore} victory over ${loser} in the ${compName}, extending their positive run of form. It was a professional display that kept their ${isPL ? 'Premier League' : 'campaign'} ambitions firmly on track.`
    );
  }

  // GOAL DETAILS: Build the narrative chronologically
  if (allScorers.length > 0) {
    const goalNarrative: string[] = [];
    let lateCount = 0;

    allScorers.forEach((scorer, idx) => {
      const team = scorer.team === 'home' ? home : away;
      const name = shortName(scorer.name);
      const min = scorer.minute;
      const currentHS = homeScorers.filter(s => s.minute <= min).length;
      const currentAS = awayScorers.filter(s => s.minute <= min).length;

      // The side credited with an own goal is the side it benefits, which is
      // right -- but the player is not one of theirs, and every verb in
      // SCORER_VERBS ("fired home for", "opened the scoring for") reads as
      // though he is.
      if (scorer.detail === 'Own Goal') {
        goalNarrative.push(
          `${name} turned the ball into his own net in the ${ordinal(min)} minute, handing ${team} a goal to make it ${currentHS}-${currentAS}.`
        );
      } else if (idx === 0) {
        const assist = match.events?.find(e => e.type === 'goal' && e.minute === min && e.assistName);
        goalNarrative.push(
          `${name} ${pick(SCORER_VERBS)} for ${team} on ${min} ${min === 1 ? 'minute' : 'minutes'}${assist?.assistName ? `, with ${shortName(assist.assistName)} providing the assist` : ''}${scorer.detail === 'Penalty' ? ' from the penalty spot' : ''}.`
        );
      } else {
        // This side's lead *after* the goal. A goal that only draws the
        // teams level is an equaliser and never "breathing room" -- judging
        // by position in the match rather than by the score is how a 1-1
        // equaliser came to be reported as doubling the lead.
        const leadAfter =
          scorer.team === 'home' ? currentHS - currentAS : currentAS - currentHS;

        if (leadAfter === 0) {
          goalNarrative.push(`${name} levelled for ${team} in the ${ordinal(min)} minute, making it ${currentHS}-${currentAS}.`);
        } else if (scorer.team === (homeWon ? 'home' : 'away') && idx === 1 && !isDraw && leadAfter >= 2) {
          goalNarrative.push(`${name} ${pick(SECOND_GOAL)} for ${team} in the ${ordinal(min)} minute, giving the ${homeWon ? 'hosts' : 'visitors'} breathing room.`);
        } else if (min >= 85) {
          // "Deep into the match, P. Esposito struck in the 90th minute to
          // seal the result for Italy" -- Italy lost 4-1. A late goal seals
          // nothing for a side that is still behind. And past 90 the clock
          // reads as extra time, not as a minute of normal time; three such
          // goals in one extra-time tie opened with the same four words each
          // time, so the lead-in varies after the first.
          const aheadAfter = scorer.team === 'home' ? currentHS - currentAS : currentAS - currentHS;
          if (aheadAfter > 0) {
            const opener = lateCount++ === 0 ? 'Deep into the match, ' : 'Later still, ';
            goalNarrative.push(`${opener}${name} struck in the ${ordinal(min)} minute to seal the result for ${team}.`);
          } else {
            goalNarrative.push(`${name} struck in the ${ordinal(min)} minute to make it ${currentHS}-${currentAS}, too late for ${team} to alter the outcome.`);
          }
        } else {
          goalNarrative.push(`${name} found the net for ${team} (${min}')${scorer.detail === 'Penalty' ? ' from the spot' : ''}, making it ${currentHS}-${currentAS}.`);
        }
      }
    });

    paragraphs.push(goalNarrative.join(' '));
  }

  // STATS PARAGRAPH: Use specific numbers to tell the tactical story
  // A missing statistics feed arrives as zeros rather than as nothing, and the
  // old block printed them: "Possession was closely contested at 0%-0%, while
  // Stade Plabennec created more shooting opportunities with a 0-0 advantage
  // in total shots". Three further rules come out of published copy: the
  // count is printed leader-first (a "12-29 advantage" was credited to the
  // side with 29 while reading as 12), equal counts are not an advantage at
  // all, and when one side leads both measures the clauses are joined rather
  // than naming that team twice in one sentence.
  if (match.stats) {
    const homePoss = possession ? Number(possession[0]) : 0;
    const awayPoss = possession ? Number(possession[1]) : 0;
    const homeShots = shots ? Number(shots[0]) : 0;
    const awayShots = shots ? Number(shots[1]) : 0;
    const homeSOT = shotsOnTarget ? Number(shotsOnTarget[0]) : 0;
    const awaySOT = shotsOnTarget ? Number(shotsOnTarget[1]) : 0;

    let possClause = '';
    let possLeader: string | null = null;
    if (homePoss + awayPoss > 0) {
      const domPct = Math.max(homePoss, awayPoss);
      possLeader = homePoss > awayPoss ? home : homePoss < awayPoss ? away : null;
      if (possLeader && domPct >= 60) {
        possClause = `${possLeader} dominated possession with ${domPct}% of the ball${possLeader === loser ? ', though it counted for little on the scoresheet' : ', controlling the tempo throughout'}`;
      } else if (Math.abs(homePoss - awayPoss) <= 10) {
        possClause = `possession was shared almost evenly at ${homePoss}%-${awayPoss}%`;
        possLeader = null;
      } else {
        possClause = `${possLeader} had the better of the ball at ${domPct}%`;
      }
    }

    let shotsClause = '';
    let shotsLeader: string | null = null;
    if (homeShots + awayShots > 0) {
      const lead = Math.max(homeShots, awayShots);
      const trail = Math.min(homeShots, awayShots);
      const sotLead = homeShots >= awayShots ? homeSOT : awaySOT;
      const sotTrail = homeShots >= awayShots ? awaySOT : homeSOT;
      const onTarget = homeSOT + awaySOT > 0 ? ` (${sotLead}-${sotTrail} on target)` : '';
      shotsLeader = homeShots > awayShots ? home : homeShots < awayShots ? away : null;
      shotsClause = shotsLeader
        ? `${shotsLeader} created more shooting opportunities, leading ${lead}-${trail} on total shots${onTarget}`
        : `the sides traded ${lead} shots apiece${onTarget}`;
    }

    let statsSentence: string;
    if (possClause && shotsClause && possLeader !== null && possLeader === shotsLeader) {
      statsSentence = `${possClause}, and ${shotsClause.slice(shotsLeader.length + 1)}`;
    } else if (possClause && shotsClause) {
      statsSentence = `${possClause}, while ${shotsClause}`;
    } else {
      statsSentence = possClause || shotsClause;
    }

    if (statsSentence) {
      paragraphs.push(`The numbers told their own story. ${statsSentence.charAt(0).toUpperCase()}${statsSentence.slice(1)}.`);
    }
  }

  // RED CARDS: Major narrative event
  if (reds.length > 0) {
    const red = reds[0];
    paragraphs.push(
      `The complexion of the match changed in the ${ordinal(red.minute)} minute when ${shortName(red.playerName)} received a red card for ${red.team === 'home' ? home : away}, leaving them to battle on with ten men for the remainder of the contest.`
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
