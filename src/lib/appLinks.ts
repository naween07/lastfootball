/**
 * Links from the website to the Android app.
 *
 * Every Play URL carries an install referrer so that installs driven by the
 * site show up under Acquisition reports in Play Console instead of landing in
 * "organic". The referrer value is one URL-encoded query string, which is the
 * shape Play expects — not individual utm_* parameters on the Play URL itself.
 */

export const ANDROID_PACKAGE = 'com.last.football.lastfootball';

/** The listing with no attribution — use for canonical/structured-data links. */
export const PLAY_STORE_URL =
  `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

function playUrlWithReferrer(medium: string): string {
  const referrer = `utm_source=website&utm_medium=${medium}&utm_campaign=site_to_app`;
  return `${PLAY_STORE_URL}&referrer=${encodeURIComponent(referrer)}`;
}

/** Dismissible banner shown to Android phones on the mobile site. */
export const PLAY_URL_BANNER = playUrlWithReferrer('install_banner');

/** Persistent link in the site footer. */
export const PLAY_URL_FOOTER = playUrlWithReferrer('footer');
