import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
  type?: string;
  image?: string;
  jsonLd?: Record<string, unknown>;
}

const SITE_NAME = 'LastFootball';
const BASE_URL = 'https://lastfootball.com';
const DEFAULT_IMAGE = 'https://lastfootball.com/favicon.svg';

export default function SEOHead({
  title,
  description = 'Real-time football live scores, fixtures, results, and match stats. Track your favorite teams.',
  path = '/',
  type = 'website',
  image = DEFAULT_IMAGE,
  jsonLd,
}: SEOHeadProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Live Scores & Results`;
  const canonicalUrl = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}

export function buildMatchJsonLd(match: {
  id: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  date: string;
  time: string;
  league: { name: string; country: string };
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}) {
  const startDate = `${match.date}T${match.time || '00:00'}:00`;
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
    startDate,
    location: {
      '@type': 'Place',
      name: `${match.league.name} - ${match.league.country}`,
    },
    homeTeam: {
      '@type': 'SportsTeam',
      name: match.homeTeam.name,
    },
    awayTeam: {
      '@type': 'SportsTeam',
      name: match.awayTeam.name,
    },
    competitor: [
      { '@type': 'SportsTeam', name: match.homeTeam.name },
      { '@type': 'SportsTeam', name: match.awayTeam.name },
    ],
  };

  if (match.status === 'FT' && match.homeScore !== null && match.awayScore !== null) {
    jsonLd.eventStatus = 'https://schema.org/EventScheduled';
    jsonLd.result = `${match.homeTeam.name} ${match.homeScore} - ${match.awayScore} ${match.awayTeam.name}`;
  }

  return jsonLd;
}

export function buildWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: BASE_URL,
    description: 'Real-time football live scores, fixtures, results, and match stats.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BASE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
