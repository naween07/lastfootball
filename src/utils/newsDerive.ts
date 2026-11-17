// Slugging, shared by every path that builds an article address.
//
// This is the same function the backend applies in src/utils/newsDerive.ts,
// and it has to stay the same: a report generated in the browser links to
// /news/<slug>, and if that slug is built differently from the one the
// backend stored, the link 404s. The naive version this replaced turned
// "Taranc\u00f3n" into "taranc-n" while the backend stored "tarancon".

/**
 * Letters NFKD cannot help with. These are not accented forms of a base
 * letter -- they are letters in their own right -- so decomposition leaves
 * them intact and the next step turns them into hyphens: Bod\u00f8 becomes
 * "bod-" rather than "bodo".
 */
const TRANSLITERATE: Record<string, string> = {
  "\u00f8": "o", "\u00e6": "ae", "\u0153": "oe", "\u00df": "ss",
  "\u0111": "d", "\u0142": "l", "\u00fe": "th", "\u00f0": "d",
};

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\u00f8\u00e6\u0153\u00df\u0111\u0142\u00fe\u00f0]/g, (c) => TRANSLITERATE[c] ?? c)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")   // strip accents: K\u00f6ln -> Koln
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
}
