/**
 * Features switched off during the account cutover.
 *
 * Phase 1c moved the website's accounts from Supabase to the app backend.
 * Three things were keyed to the Supabase user and have no backend equivalent
 * yet, so they are hidden rather than deleted: the pages still exist, the
 * routes still compile, and restoring one is flipping a boolean once its data
 * has a home.
 *
 * Hidden rather than removed because the alternative is worse in both
 * directions -- leaving them visible shows a reader a feature that silently
 * returns nothing, and deleting them means rebuilding from scratch later
 * rather than reconnecting.
 */

export const FEATURES = {
  /**
   * Predictions, the leaderboard, and the prediction panel on a match.
   *
   * Supabase `predictions` and `prediction_stats` are keyed by a uuid user id;
   * the backend's ids are integers, so every query would pass a type the
   * column cannot match. The backend has no predictions model at all yet --
   * Phase 3 builds one. Seven users, last used 26 October.
   */
  predictions: false,

  /**
   * Fantasy. Retired rather than paused: three users, nothing since June, and
   * not at the level of Fantasy Premier League or comparable products. A
   * better version is worth building one day; this one is not worth carrying.
   */
  fantasy: false,

  /**
   * World Cup enrolment. Never really a feature -- it counted how many people
   * were using the site for World Cup content, which is a metric wearing a
   * table's clothes. Dropped outright, with no replacement wanted.
   */
  worldCupEnrolment: false,
} as const;
