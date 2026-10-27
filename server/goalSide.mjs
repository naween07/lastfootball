/**
 * Which side a goal counts for.
 *
 * API-Football reports an own goal under the team of the player who scored
 * it, not the team it counts for. Reading `event.team` directly therefore
 * credits an own goal to the side that conceded -- which corrupts any running
 * score reconstructed from events, and with it every narrative angle derived
 * from that score: lead changes, comeback detection, the decisive goal, late
 * winners.
 *
 * Kept in its own module so both the scorer list and the timeline use one
 * rule, and so it can be tested without starting the server.
 *
 * @param {{team?: {id?: number}, detail?: string}} event a Goal event
 * @param {number} homeId the home team's id for this fixture
 * @returns {'home'|'away'} the side the goal counts for
 */
export function goalSide(event, homeId) {
  const scoredByHome = event?.team?.id === homeId;
  const isOwnGoal = event?.detail === 'Own Goal';
  const benefitsHome = isOwnGoal ? !scoredByHome : scoredByHome;
  return benefitsHome ? 'home' : 'away';
}
