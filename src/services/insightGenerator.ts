import { Match } from '@/types/football';

export interface MatchInsight {
  text: string;
  type: 'streak' | 'form' | 'goals' | 'h2h' | 'general';
  icon: string;
}

// ─── Generate insights from match data + H2H ───────────────────────────────

export function generateMatchInsights(
  match: Match,
  h2hMatches?: Match[],
): MatchInsight[] {
  const insights: MatchInsight[] = [];
  const home = match.homeTeam.name;
  const away = match.awayTeam.name;
  const isFinished = match.status === 'FT' || match.status === 'AET' || match.status === 'PEN';
  const hasScore = match.homeScore !== null;

  // ─── H2H Insights ──────────────────────────────────────────────────────
  if (h2hMatches && h2hMatches.length >= 3) {
    const homeTeamId = match.homeTeam.id;
    let homeWins = 0, awayWins = 0, draws = 0;
    let homeGoals = 0, awayGoals = 0;
    let homeUnbeaten = 0;
    let awayUnbeaten = 0;
    let consecutiveHomeWins = 0;
    let consecutiveAwayWins = 0;
    let bothScored = 0;

    h2hMatches.forEach(m => {
      if (m.homeScore === null || m.awayScore === null) return;
      const isHomeTeamHome = m.homeTeam.id === homeTeamId;
      const t1 = isHomeTeamHome ? m.homeScore : m.awayScore;
      const t2 = isHomeTeamHome ? m.awayScore : m.homeScore;

      homeGoals += t1;
      awayGoals += t2;

      if (t1 > t2) homeWins++;
      else if (t2 > t1) awayWins++;
      else draws++;

      if (t1 > 0 && t2 > 0) bothScored++;
    });

    // Count unbeaten streaks from most recent
    for (const m of h2hMatches) {
      if (m.homeScore === null || m.awayScore === null) break;
      const isHomeTeamHome = m.homeTeam.id === homeTeamId;
      const t1 = isHomeTeamHome ? m.homeScore : m.awayScore;
      const t2 = isHomeTeamHome ? m.awayScore : m.homeScore;
      if (t1 >= t2) homeUnbeaten++;
      else break;
    }

    for (const m of h2hMatches) {
      if (m.homeScore === null || m.awayScore === null) break;
      const isHomeTeamHome = m.homeTeam.id === homeTeamId;
      const t1 = isHomeTeamHome ? m.homeScore : m.awayScore;
      const t2 = isHomeTeamHome ? m.awayScore : m.homeScore;
      if (t2 >= t1) awayUnbeaten++;
      else break;
    }

    // Consecutive wins
    for (const m of h2hMatches) {
      if (m.homeScore === null || m.awayScore === null) break;
      const isHomeTeamHome = m.homeTeam.id === homeTeamId;
      const t1 = isHomeTeamHome ? m.homeScore : m.awayScore;
      const t2 = isHomeTeamHome ? m.awayScore : m.homeScore;
      if (t1 > t2) consecutiveHomeWins++;
      else break;
    }

    for (const m of h2hMatches) {
      if (m.homeScore === null || m.awayScore === null) break;
      const isHomeTeamHome = m.homeTeam.id === homeTeamId;
      const t1 = isHomeTeamHome ? m.homeScore : m.awayScore;
      const t2 = isHomeTeamHome ? m.awayScore : m.homeScore;
      if (t2 > t1) consecutiveAwayWins++;
      else break;
    }

    const total = h2hMatches.length;

    // Dominance
    if (homeWins >= total * 0.6 && total >= 5) {
      insights.push({ text: `${home} have won ${homeWins} of the last ${total} meetings against ${away}.`, type: 'h2h', icon: '👑' });
    } else if (awayWins >= total * 0.6 && total >= 5) {
      insights.push({ text: `${away} have won ${awayWins} of the last ${total} meetings against ${home}.`, type: 'h2h', icon: '👑' });
    }

    // Unbeaten streaks
    if (homeUnbeaten >= 4) {
      insights.push({ text: `${home} are unbeaten in their last ${homeUnbeaten} games against ${away}.`, type: 'streak', icon: '🔥' });
    } else if (awayUnbeaten >= 4) {
      insights.push({ text: `${away} are unbeaten in their last ${awayUnbeaten} games against ${home}.`, type: 'streak', icon: '🔥' });
    }

    // Consecutive wins
    if (consecutiveHomeWins >= 3) {
      insights.push({ text: `${home} have won their last ${consecutiveHomeWins} consecutive matches against ${away}.`, type: 'streak', icon: '⚡' });
    } else if (consecutiveAwayWins >= 3) {
      insights.push({ text: `${away} have won their last ${consecutiveAwayWins} consecutive matches against ${home}.`, type: 'streak', icon: '⚡' });
    }

    // Goals pattern
    const avgGoals = (homeGoals + awayGoals) / Math.max(total, 1);
    if (avgGoals >= 3.5) {
      insights.push({ text: `These teams average ${avgGoals.toFixed(1)} goals per game in their last ${total} meetings — expect an entertaining match.`, type: 'goals', icon: '⚽' });
    } else if (avgGoals <= 1.5) {
      insights.push({ text: `Low-scoring rivalry — these teams average just ${avgGoals.toFixed(1)} goals per game in recent meetings.`, type: 'goals', icon: '🛡️' });
    }

    // Both teams score
    if (bothScored >= total * 0.7 && total >= 5) {
      insights.push({ text: `Both teams have scored in ${bothScored} of the last ${total} meetings.`, type: 'goals', icon: '🎯' });
    }

    // Close rivalry
    if (Math.abs(homeWins - awayWins) <= 1 && draws >= 2 && total >= 5) {
      insights.push({ text: `Evenly matched — ${homeWins} wins for ${home}, ${awayWins} for ${away}, and ${draws} draws in the last ${total} meetings.`, type: 'h2h', icon: '⚖️' });
    }
  }

  // ─── Match-specific insights ───────────────────────────────────────────
  if (isFinished && hasScore) {
    const hs = match.homeScore!;
    const as = match.awayScore!;
    const total = hs + as;
    const margin = Math.abs(hs - as);

    if (total >= 5) {
      insights.push({ text: `A thriller! ${total} goals scored in this match.`, type: 'goals', icon: '🎆' });
    }

    if (margin >= 4) {
      const winner = hs > as ? home : away;
      insights.push({ text: `Dominant display by ${winner} with a ${margin}-goal winning margin.`, type: 'general', icon: '💪' });
    }

    if (total === 0) {
      insights.push({ text: `Tight defensive battle — neither side could find the breakthrough.`, type: 'general', icon: '🧱' });
    }

    // Late drama
    if (match.events) {
      const lateGoals = match.events.filter(e => e.type === 'goal' && e.minute >= 85);
      if (lateGoals.length > 0) {
        const scorer = lateGoals[lateGoals.length - 1];
        insights.push({ text: `Late drama! ${scorer.playerName} scored in the ${scorer.minute}th minute.`, type: 'general', icon: '⏱️' });
      }

      // Red cards
      const reds = match.events.filter(e => e.type === 'red_card');
      if (reds.length > 0) {
        insights.push({ text: `${reds.length} red card${reds.length > 1 ? 's' : ''} shown in this heated encounter.`, type: 'general', icon: '🟥' });
      }
    }
  }

  // Limit to 4 most interesting insights
  return insights.slice(0, 4);
}
