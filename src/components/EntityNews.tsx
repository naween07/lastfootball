import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ChevronRight } from 'lucide-react';

/**
 * Articles that concern this team or player.
 *
 * Reads the app backend directly rather than Supabase. The backend is where
 * articles are linked to the entities they are about -- `posts` only records
 * team NAMES, so it cannot answer "every article about club 42". This is also
 * why team and player pages have been dead ends: there was no way to ask the
 * question until those links existed.
 *
 * Renders nothing when there are no articles, rather than an empty heading.
 */

const API = 'https://api.lastfootball.com/graphql/';

type Article = {
  id: number;
  title: string;
  slug: string | null;
  publishedAt: string | null;
  readingTimeMins: number | null;
};

/**
 * The API types its dates as String, and GraphQL coerces a Date through
 * valueOf(), so these arrive as epoch milliseconds in a string.
 */
function formatDate(value: string | null): string {
  if (!value) return '';
  const d = /^\d{10,}$/.test(value) ? new Date(Number(value)) : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EntityNews({
  kind,
  id,
  name,
}: {
  kind: 'team' | 'player' | 'league';
  id: number;
  name?: string;
}) {
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const arg = kind === 'team' ? 'teamId' : kind === 'player' ? 'playerId' : 'leagueId';

    (async () => {
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{ newss(status: PUBLISHED, ${arg}: ${id}, limit: 6) {
              results { id title slug publishedAt readingTimeMins }
            } }`,
          }),
        });
        const json = await res.json();
        const rows: Article[] = json?.data?.newss?.results || [];
        if (!cancelled) setArticles(rows.filter((a) => a.slug));
      } catch {
        // A hub page is useful without this block; failing quietly beats an
        // error message where a reader expects content.
        if (!cancelled) setArticles([]);
      }
    })();

    return () => { cancelled = true; };
  }, [kind, id]);

  if (!articles.length) return null;

  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">
          Latest news{name ? <span className="text-muted-foreground font-medium"> · {name}</span> : null}
        </h2>
        <Link to="/news" className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
          All news <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <ul>
        {articles.map((a) => (
          <li key={a.id} className="border-b border-border/20 last:border-0">
            {/* The entity's own name as anchor text is the point of this
                block: it is what connects a hub page to its articles. */}
            <Link
              to={`/news/${a.slug}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug text-foreground line-clamp-2">{a.title}</p>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                  {formatDate(a.publishedAt)}
                  {a.readingTimeMins ? (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {a.readingTimeMins} min
                    </span>
                  ) : null}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
