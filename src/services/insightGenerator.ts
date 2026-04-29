import { Match } from '@/types/football';
import { TeamStatSummary } from '@/services/footballApi';

export interface MatchInsight {
  text: string;
  type: 'streak' | 'form' | 'goals' | 'h2h' | 'defense' | 'attack' | 'general';
  icon: string;
}

// ─── Form helper ────────────────────────────────────────────────────────────

function parseForm(form: string): { wins: number; draws: number; losses: number; last5: string } {
  const chars = form.toUpperCase().split('');
  const last5 = chars.slice(-5).join('');
  return {
    wins: chars.filter(c => c === 'W').length,
    draws: chars.filter(c => c === 'D').length,
    losses: chars.filter(c => c === 'L').length,
    last5,
  };
}

function formStreak(form: string): { type: 'W' | 'D' | 'L' | 'U'; count: number } {
  const chars = form.toUpperCase().split('').reverse();
  if (!chars.length) return { type: 'W', count: 0 };
  
  // Check winning streak
  let wCount = 0;
  for (const c of chars) { if (c === 'W') wCount++; else break; }
  if (wCount >= 3) return { type: 'W', count: wCount };

  // Check unbeaten streak
  let uCount = 0;
  for (const c of chars) { if (c === 'W' || c === 'D') uCount++; else break; }
  if (uCount >= 4) return { type: 'U', count: uCount };

  // Check losing streak
  let lCount = 0;
  for (const c of chars) { if (c === 'L') lCount++; else break; }
  if (lCount >= 3) return { type: 'L', count: lCount };

  return { type: 'D', count: 0 };
}

// ─── Main generator ─────────────────────────────────────────────────────────

export function generateMatchInsights(
  match: Match,
  h2hMatches?: Match[],
  homeStats?: TeamStatSummary | null,
  awayStats?: TeamStatSummary | null,
): MatchInsight[] {
  const insights: MatchInsight[] = [];
  const home = match.homeTeam.name;
  const away = match.awayTeam.name;
  const isFinished = match.status === 'FT' || match.status === 'AET' || match.status === 'PEN';
  const hasScore = match.homeScore !== null;

  // ─── Team Stats Insights (storytelling) ────────────────────────────────

  if (homeStats && awayStats) {
    // Tournament goals
    if (homeStats.goals.for > 0 || awayStats.goals.for > 0) {
      const topScorer = homeStats.goals.for >= awayStats.goals.for ? homeStats : awayStats;
      const topName = topScorer === homeStats ? home : away;
      insights.push({
        text: `${topName} have scored ${topScorer.goals.for} goals in ${topScorer.fixtures.played} matches this season — averaging ${topScorer.goalsAvgPerGame.toFixed(1)} per game.`,
        type: 'attack', icon: '⚽'
      });
    }

    // Defensive comparison
    const homeConceded = homeStats.goals.against;
    const awayConceded = awayStats.goals.against;
    if (homeConceded > 0 && awayConceded > 0) {
      const betterDef = homeConceded <= awayConceded ? homeStats : awayStats;
      const betterName = betterDef === homeStats ? home : away;
      const concededPerGame = betterDef.goals.against / Math.max(betterDef.fixtures.played, 1);
      if (concededPerGame <= 1.0) {
        insights.push({
          text: `${betterName} boast the tighter defence, conceding just ${betterDef.goals.against} goals in ${betterDef.fixtures.played} matches (${concededPerGame.toFixed(1)} per game).`,
          type: 'defense', icon: '🛡️'
        });
      }
    }

    // Clean sheets
    if (homeStats.cleanSheets >= 5 || awayStats.cleanSheets >= 5) {
      const csTeam = homeStats.cleanSheets >= awayStats.cleanSheets ? homeStats : awayStats;
      const csName = csTeam === homeStats ? home : away;
      insights.push({
        text: `${csName} have kept ${csTeam.cleanSheets} clean sheets this season — a testament to their defensive solidity.`,
        type: 'defense', icon: '🧤'
      });
    }

    // Form comparison
    if (homeStats.form && awayStats.form) {
      const hForm = parseForm(homeStats.form);
      const aForm = parseForm(awayStats.form);
      const hStreak = formStreak(homeStats.form);
      const aStreak = formStreak(awayStats.form);

      // Winning streak
      if (hStreak.type === 'W' && hStreak.count >= 3) {
        insights.push({
          text: `${home} are flying — ${hStreak.count} consecutive wins coming into this match. Form: ${hForm.last5}.`,
          type: 'form', icon: '🔥'
        });
      } else if (aStreak.type === 'W' && aStreak.count >= 3) {
        insights.push({
          text: `${away} are in red-hot form — ${aStreak.count} consecutive wins. Form: ${aForm.last5}.`,
          type: 'form', icon: '🔥'
        });
      }

      // Unbeaten run
      if (hStreak.type === 'U' && hStreak.count >= 4) {
        insights.push({
          text: `${home} are unbeaten in their last ${hStreak.count} matches. Form: ${hForm.last5}.`,
          type: 'streak', icon: '💪'
        });
      } else if (aStreak.type === 'U' && aStreak.count >= 4) {
        insights.push({
          text: `${away} haven't lost in ${aStreak.count} games. Form: ${aForm.last5}.`,
          type: 'streak', icon: '💪'
        });
      }

      // Losing streak
      if (hStreak.type === 'L' && hStreak.count >= 3) {
        insights.push({
          text: `${home} are struggling — ${hStreak.count} defeats in a row. They'll be desperate for a turnaround.`,
          type: 'form', icon: '📉'
        });
      } else if (aStreak.type === 'L' && aStreak.count >= 3) {
        insights.push({
          text: `${away} come into this on a ${aStreak.count}-match losing streak. Can they stop the rot?`,
          type: 'form', icon: '📉'
        });
      }
    }

    // Home/Away advantage
    if (homeStats.fixturesHome.played >= 5) {
      const homeWinRate = homeStats.fixturesHome.wins / homeStats.fixturesHome.played;
      if (homeWinRate >= 0.7) {
        insights.push({
          text: `Fortress! ${home} have won ${homeStats.fixturesHome.wins} of ${homeStats.fixturesHome.played} home matches this season (${Math.round(homeWinRate * 100)}% win rate).`,
          type: 'general', icon: '🏟️'
        });
      }
    }

    if (awayStats.fixturesAway.played >= 5) {
      const awayWinRate = awayStats.fixturesAway.wins / awayStats.fixturesAway.played;
      if (awayWinRate >= 0.6) {
        insights.push({
          text: `${away} are strong travellers — ${awayStats.fixturesAway.wins} wins from ${awayStats.fixturesAway.played} away matches this season.`,
          type: 'general', icon: '✈️'
        });
      }
    }

    // Penalty stats
    if (homeStats.penalty.scored >= 3 || awayStats.penalty.scored >= 3) {
      const penTeam = homeStats.penalty.scored >= awayStats.penalty.scored ? homeStats : awayStats;
      const penName = penTeam === homeStats ? home : away;
      const total = penTeam.penalty.scored + penTeam.penalty.missed;
      insights.push({
        text: `${penName} have been awarded ${total} penalties this season, converting ${penTeam.penalty.scored} of them.`,
        type: 'attack', icon: '🎯'
      });
    }

    // Failed to score
    if (homeStats.failedToScore >= 5 || awayStats.failedToScore >= 5) {
      const blankTeam = homeStats.failedToScore >= awayStats.failedToScore ? homeStats : awayStats;
      const blankName = blankTeam === homeStats ? home : away;
      insights.push({
        text: `${blankName} have failed to score in ${blankTeam.failedToScore} matches this season — will they break the pattern today?`,
        type: 'attack', icon: '😬'
      });
    }
  }

  // ─── H2H Insights ──────────────────────────────────────────────────────

  if (h2hMatches && h2hMatches.length >= 1) {
    const homeTeamId = match.homeTeam.id;
    let homeWins = 0, awayWins = 0, draws = 0;
    let homeGoals = 0, awayGoals = 0;
    let bothScored = 0;

    const finishedH2H = h2hMatches.filter(m => m.homeScore !== null && m.awayScore !== null);
    finishedH2H.forEach(m => {
      const isHomeTeamHome = m.homeTeam.id === homeTeamId;
      const t1 = isHomeTeamHome ? m.homeScore! : m.awayScore!;
      const t2 = isHomeTeamHome ? m.awayScore! : m.homeScore!;
      homeGoals += t1;
      awayGoals += t2;
      if (t1 > t2) homeWins++;
      else if (t2 > t1) awayWins++;
      else draws++;
      if (t1 > 0 && t2 > 0) bothScored++;
    });

    const total = finishedH2H.length;

    if (total >= 1) {
      insights.push({
        text: `Head-to-head in the last ${total} meeting${total > 1 ? 's' : ''}: ${home} ${homeWins}W ${draws}D ${awayWins}L ${away}. Total goals: ${homeGoals}-${awayGoals}.`,
        type: 'h2h', icon: '📊'
      });
    }

    // Unbeaten streak
    let homeUnbeaten = 0;
    for (const m of finishedH2H) {
      const isH = m.homeTeam.id === homeTeamId;
      const t1 = isH ? m.homeScore! : m.awayScore!;
      const t2 = isH ? m.awayScore! : m.homeScore!;
      if (t1 >= t2) homeUnbeaten++; else break;
    }
    if (homeUnbeaten >= 3) {
      insights.push({ text: `${home} are unbeaten in their last ${homeUnbeaten} meetings against ${away}.`, type: 'streak', icon: '🔥' });
    }

    let awayUnbeaten = 0;
    for (const m of finishedH2H) {
      const isH = m.homeTeam.id === homeTeamId;
      const t1 = isH ? m.homeScore! : m.awayScore!;
      const t2 = isH ? m.awayScore! : m.homeScore!;
      if (t2 >= t1) awayUnbeaten++; else break;
    }
    if (awayUnbeaten >= 3 && homeUnbeaten < 3) {
      insights.push({ text: `${away} are unbeaten in their last ${awayUnbeaten} meetings against ${home}.`, type: 'streak', icon: '🔥' });
    }

    // Both scored pattern
    if (bothScored >= total * 0.7 && total >= 4) {
      insights.push({ text: `Expect goals from both sides — both teams scored in ${bothScored} of the last ${total} H2H meetings.`, type: 'goals', icon: '🎯' });
    }

    // Last meeting
    if (finishedH2H.length > 0) {
      const last = finishedH2H[0];
      insights.push({
        text: `Last meeting: ${last.homeTeam.name} ${last.homeScore} - ${last.awayScore} ${last.awayTeam.name}.`,
        type: 'h2h', icon: '🕐'
      });
    }
  }

  // ─── Competition badge ─────────────────────────────────────────────────

  if (insights.length < 3) {
    const cups: Record<number, string> = { 2: 'UEFA Champions League', 3: 'UEFA Europa League', 848: 'Conference League', 45: 'FA Cup', 48: 'League Cup', 143: 'Copa del Rey', 137: 'Coppa Italia', 81: 'DFB Pokal', 66: 'Coupe de France' };
    if (cups[match.league.id]) {
      insights.push({ text: `${cups[match.league.id]} fixture — every match matters in knockout football.`, type: 'general', icon: '🏆' });
    }
  }

  // ─── Match result insights (finished only) ─────────────────────────────

  if (isFinished && hasScore) {
    const total = match.homeScore! + match.awayScore!;
    const margin = Math.abs(match.homeScore! - match.awayScore!);

    if (total >= 5) {
      insights.push({ text: `A thriller! ${total} goals scored in this encounter.`, type: 'goals', icon: '🎆' });
    }
    if (margin >= 4) {
      const winner = match.homeScore! > match.awayScore! ? home : away;
      insights.push({ text: `Dominant display by ${winner} with a ${margin}-goal winning margin.`, type: 'general', icon: '💪' });
    }
    if (match.events) {
      const lateGoals = match.events.filter(e => e.type === 'goal' && e.minute >= 85);
      if (lateGoals.length > 0) {
        const scorer = lateGoals[lateGoals.length - 1];
        insights.push({ text: `Late drama! ${scorer.playerName} scored in the ${scorer.minute}th minute.`, type: 'general', icon: '⏱️' });
      }
      const reds = match.events.filter(e => e.type === 'red_card');
      if (reds.length > 0) {
        insights.push({ text: `${reds.length} red card${reds.length > 1 ? 's' : ''} shown in this heated encounter.`, type: 'general', icon: '🟥' });
      }
    }
  }

  // Return max 5 insights, prioritize team stats + H2H over generic
  return insights.slice(0, 5);
}
