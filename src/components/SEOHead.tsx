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
  homeTeam: { name: string; logo?: string };
  awayTeam: { name: string; logo?: string };
  date: string;
  time: string;
  league: { name: string; country: string };
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  events?: { type: string; playerName: string; minute: number; team: string }[];
}) {
  const startDate = `${match.date}T${match.time || '00:00'}:00`;
  // endDate: kickoff + 2 hours (standard match duration incl. half-time)
  const endDateObj = new Date(`${match.date}T${match.time || '00:00'}:00Z`);
  endDateObj.setHours(endDateObj.getHours() + 2);
  const endDate = endDateObj.toISOString().replace('.000Z', '');
  const matchUrl = `https://lastfootball.com/match/${match.id}`;
  const images = [match.homeTeam.logo, match.awayTeam.logo].filter(Boolean) as string[];
  const isFinished = match.status === 'FT' || match.status === 'AET' || match.status === 'PEN';
  const isLive = ['LIVE', '1H', '2H', 'HT', 'ET'].includes(match.status);
  const isUpcoming = match.status === 'NS' || match.status === 'TBD';

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
    description: isFinished && match.homeScore !== null
      ? `${match.homeTeam.name} ${match.homeScore}-${match.awayScore} ${match.awayTeam.name} in the ${match.league.name}.`
      : `${match.homeTeam.name} take on ${match.awayTeam.name} in the ${match.league.name}.`,
    startDate,
    endDate,
    url: matchUrl,
    image: images.length > 0 ? images : ['https://lastfootball.com/og-image.png'],
    sport: 'Football',
    eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: `${match.league.name} - ${match.league.country}`,
      address: {
        '@type': 'PostalAddress',
        addressCountry: match.league.country || 'International',
      },
    },
    homeTeam: {
      '@type': 'SportsTeam',
      name: match.homeTeam.name,
      ...(match.homeTeam.logo ? { logo: match.homeTeam.logo } : {}),
    },
    awayTeam: {
      '@type': 'SportsTeam',
      name: match.awayTeam.name,
      ...(match.awayTeam.logo ? { logo: match.awayTeam.logo } : {}),
    },
    competitor: [
      { '@type': 'SportsTeam', name: match.homeTeam.name },
      { '@type': 'SportsTeam', name: match.awayTeam.name },
    ],
    performer: [
      { '@type': 'SportsTeam', name: match.homeTeam.name },
      { '@type': 'SportsTeam', name: match.awayTeam.name },
    ],
    organizer: {
      '@type': 'SportsOrganization',
      name: match.league.name,
      url: 'https://lastfootball.com',
    },
    offers: {
      '@type': 'Offer',
      url: matchUrl,
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      validFrom: startDate,
      description: 'Free live scores, stats and match coverage',
    },
  };

  if (isFinished) {
    jsonLd.eventStatus = 'https://schema.org/EventCompleted';
    if (match.homeScore !== null && match.awayScore !== null) {
      jsonLd.result = `${match.homeTeam.name} ${match.homeScore} - ${match.awayScore} ${match.awayTeam.name}`;
    }
  } else if (isLive) {
    jsonLd.eventStatus = 'https://schema.org/EventScheduled';
    jsonLd.eventAttendanceMode = 'https://schema.org/OfflineEventAttendanceMode';
  } else if (isUpcoming) {
    jsonLd.eventStatus = 'https://schema.org/EventScheduled';
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
