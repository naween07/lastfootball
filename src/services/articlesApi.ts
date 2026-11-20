/**
 * Published articles, read through this site's own server.
 *
 * These pages used to query Supabase straight from the browser. Since
 * 20 November the site's articles are served from the app backend, and the
 * Supabase `posts` table is a copy a background sync maintains -- so a
 * browser reading `posts` sees whatever the last sync copied and nothing
 * published since. That is not theoretical: six real articles given slugs
 * that morning rendered correctly in the prerendered HTML and then replaced
 * themselves with "Article not found" once the page hydrated, because the
 * copy did not have them yet.
 *
 * The server route reads the backend, falls back to Supabase if it cannot,
 * and caches the catalogue, so a page gets one request instead of one query
 * per visitor.
 */
export interface FetchArticlesOptions {
  limit?: number;
  /** One category, or several comma-separated. */
  category?: string;
  league?: string;
}

export async function fetchArticles(opts: FetchArticlesOptions = {}): Promise<any[]> {
  const params = new URLSearchParams();
  params.set('limit', String(opts.limit ?? 20));
  if (opts.category) params.set('category', opts.category);
  if (opts.league) params.set('league', opts.league);

  try {
    const res = await fetch(`/api/articles?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    // An error body from the route is an object, not an array. Returning []
    // keeps a failure looking like "no articles" to the caller rather than
    // throwing inside a render.
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
