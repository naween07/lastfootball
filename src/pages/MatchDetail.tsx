import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import MatchTimeline from '@/components/MatchTimeline';
import MatchStatsView from '@/components/MatchStatsView';
import { getMatchById } from '@/services/mockData';
import { useState } from 'react';

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const match = getMatchById(Number(id));
  const [tab, setTab] = useState<'events' | 'stats'>('events');

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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Match header */}
      <div className="bg-card border-b border-border">
        <div className="container py-4">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>

          <div className="text-center mb-2">
            <span className="text-xs text-muted-foreground">{match.league.logo} {match.league.name}</span>
          </div>

          <div className="flex items-center justify-center gap-6">
            <div className="text-center flex-1">
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
              <p className="text-base font-bold text-foreground">{match.awayTeam.shortName}</p>
              <p className="text-xs text-muted-foreground hidden sm:block">{match.awayTeam.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {(match.events || match.stats) && (
        <div className="border-b border-border bg-card">
          <div className="container flex gap-1 py-2">
            {match.events && (
              <button
                onClick={() => setTab('events')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  tab === 'events' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                }`}
              >
                Events
              </button>
            )}
            {match.stats && (
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

      {/* Content */}
      <main className="container py-4">
        {tab === 'events' && match.events && (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <MatchTimeline events={match.events} homeTeamName={match.homeTeam.name} awayTeamName={match.awayTeam.name} />
          </div>
        )}
        {tab === 'stats' && match.stats && (
          <div className="bg-card rounded-lg border border-border py-4">
            <MatchStatsView stats={match.stats} homeTeam={match.homeTeam.name} awayTeam={match.awayTeam.name} />
          </div>
        )}
      </main>
    </div>
  );
}
