import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import SEOHead, { buildMatchJsonLd } from '@/components/SEOHead';
import MatchTimeline from '@/components/MatchTimeline';
import MatchStatsView from '@/components/MatchStatsView';
import LineupView from '@/components/LineupView';
import { fetchMatchDetails } from '@/services/footballApi';
import { useState, useEffect } from 'react';
import { Match } from '@/types/football';

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'events' | 'stats' | 'lineups'>('events');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchMatchDetails(Number(id))
      .then(setMatch)
      .catch(console.error)
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      fetchMatchDetails(Number(id)).then(setMatch).catch(console.error);
    }, 15000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading match details...</span>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center text-muted-foreground">
          <p className="text-lg font-medium">Match not found</p>
          <Link to="/" className="text-primary text-sm mt-2 inline-block hover:underline">← Back to matches</Link>
        </div>
      </div>
    );
  }

  const isLive = match.status === 'LIVE' || match.status === '1H' || match.status === '2H';
  const isHT = match.status === 'HT';
  const hasEvents = !!match.events?.length;
  const hasStats = !!match.stats;
  const hasLineups = !!match.lineups;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${match.homeTeam.name} vs ${match.awayTeam.name} - ${match.league.name}`}
        description={`${match.homeTeam.name} vs ${match.awayTeam.name} live score, stats, and lineups. ${match.league.name} ${match.league.country}.`}
        path={`/match/${match.id}`}
        jsonLd={buildMatchJsonLd(match)}
      />
      <Header />

      <div className="bg-card border-b border-border">
        <div className="container py-4">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>

          <div className="text-center mb-2">
            <div className="flex items-center justify-center gap-2">
              {match.league.logo && <img src={match.league.logo} alt="" className="w-4 h-4" />}
              <span className="text-xs text-muted-foreground">{match.league.name}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6">
            <div className="text-center flex-1">
              {match.homeTeam.logo && <img src={match.homeTeam.logo} alt="" className="w-8 h-8 mx-auto mb-1" />}
              <p className="text-base font-bold text-foreground">{match.homeTeam.shortName}</p>
              <p className="text-xs text-muted-foreground hidden sm:block">{match.homeTeam.name}</p>
            </div>

            <div className="text-center">
              {match.homeScore !== null ? (
                <div className="flex items-center gap-2">
                  <span className={`text-3xl font-extrabold tabular-nums ${isLive || isHT ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {match.homeScore}
                  </span>
                  <span className="text-xl text-muted-foreground">-</span>
                  <span className={`text-3xl font-extrabold tabular-nums ${isLive || isHT ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {match.awayScore}
                  </span>
                </div>
              ) : (
                <span className="text-lg font-semibold text-muted-foreground">{match.time}</span>
              )}
              <div className="mt-1">
                {isLive && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-live">
                    <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse-live" />
                    {match.minute}
                  </span>
                )}
                {isHT && <span className="text-xs font-bold text-amber-400">Half Time</span>}
                {match.status === 'FT' && <span className="text-xs font-medium text-muted-foreground">Full Time</span>}
                {match.status === 'NS' && <span className="text-xs text-muted-foreground">{match.date}</span>}
              </div>
            </div>

            <div className="text-center flex-1">
              {match.awayTeam.logo && <img src={match.awayTeam.logo} alt="" className="w-8 h-8 mx-auto mb-1" />}
              <p className="text-base font-bold text-foreground">{match.awayTeam.shortName}</p>
              <p className="text-xs text-muted-foreground hidden sm:block">{match.awayTeam.name}</p>
            </div>
          </div>
        </div>
      </div>

      {(hasEvents || hasStats || hasLineups) && (
        <div className="border-b border-border bg-card">
          <div className="container flex gap-1 py-2">
            {hasEvents && (
              <button
                onClick={() => setTab('events')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  tab === 'events' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                }`}
              >
                Events
              </button>
            )}
            {hasLineups && (
              <button
                onClick={() => setTab('lineups')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  tab === 'lineups' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                }`}
              >
                Lineups
              </button>
            )}
            {hasStats && (
              <button
                onClick={() => setTab('stats')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  tab === 'stats' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                }`}
              >
                Statistics
              </button>
            )}
          </div>
        </div>
      )}

      <main className="container py-4">
        {tab === 'events' && hasEvents && (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <MatchTimeline events={match.events!} homeTeamName={match.homeTeam.name} awayTeamName={match.awayTeam.name} />
          </div>
        )}
        {tab === 'lineups' && hasLineups && (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <LineupView lineups={match.lineups!} homeTeamName={match.homeTeam.name} awayTeamName={match.awayTeam.name} events={match.events} />
          </div>
        )}
        {tab === 'stats' && hasStats && (
          <div className="bg-card rounded-lg border border-border py-4">
            <MatchStatsView stats={match.stats!} homeTeam={match.homeTeam.name} awayTeam={match.awayTeam.name} />
          </div>
        )}
      </main>
    </div>
  );
}
