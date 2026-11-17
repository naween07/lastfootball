/**
 * A story as the site's cards and lists want it.
 *
 * This used to live in src/services/articleGenerator.ts, because the site
 * built its own match reports in the browser. The backend is the single
 * producer now, so what is left is the shape the pages read -- rows of the
 * `posts` table mapped into it.
 */
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

/** One published `posts` row as an Article. */
export function postRowToArticle(p: any): Article {
  const league = p.league || '';
  const isWorldCup = league.toLowerCase().includes('world cup');
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.subtitle || p.excerpt || p.meta_description || '',
    body: p.body ?? '',
    category: isWorldCup ? 'featured' : 'match-report',
    leagueName: league,
    leagueLogo: undefined,
    // `teams` is filled by the sync; the entities carry the same two names
    // for rows written before it was.
    homeTeam: { name: p.teams?.[0] || teamFromEntities(p, 0), logo: undefined },
    awayTeam: { name: p.teams?.[1] || teamFromEntities(p, 1), logo: undefined },
    matchId: 0,
    publishedAt: p.published_at,
    isFeatured: isWorldCup,
  };
}

function teamFromEntities(p: any, index: number): string {
  const teams = Array.isArray(p.entities)
    ? p.entities.filter((e: any) => e?.kind === 'TEAM')
    : [];
  return teams[index]?.name ?? '';
}
