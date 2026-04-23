import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Calendar, Trophy } from 'lucide-react';
import Header from '@/components/Header';
import SEOHead, { buildMatchJsonLd } from '@/components/SEOHead';
import MatchTimeline from '@/components/MatchTimeline';
import MatchStatsView from '@/components/MatchStatsView';
import LineupView from '@/components/LineupView';
import MatchInsightCard from '@/components/MatchInsightCard';
import OptimizedImage from '@/components/OptimizedImage';
import { fetchMatchDetails, fetchMatchPlayers } from '@/services/footballApi';
import { useState, useEffect, useMemo } from 'react';
import { Match, MatchPlayerData } from '@/types/football';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'lineups' | 'stats' | 'commentary';

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [playerData, setPlayerData] = useState<MatchPlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);

    // Fetch match details and player stats in parallel
    Promise.all([
      fetchMatchDetails(Number(id)),
      fetchMatchPlayers(Number(id)),
    ])
      .then(([matchData, players]) => {
        if (!active) return;
        setMatch(matchData);
        setPlayerData(players);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Poll for live updates — only if match is in progress
    const LIVE_STATUSES = new Set(['LIVE', '1H', '2H', 'HT']);
    const POLL_INTERVAL = 30_000; // 30 seconds for detail view

    const interval = setInterval(() => {
      // Check current match status before fetching
      setMatch(prev => {
        if (!prev || !LIVE_STATUSES.has(prev.status)) {
          // Match not live — no need to poll
          return prev;
        }

        // Match is live — fetch updates (async, non-blocking)
        Promise.all([
          fetchMatchDetails(Number(id)),
          fetchMatchPlayers(Number(id)),
        ])
          .then(([matchData, players]) => {
            if (!active) return;
            setMatch(matchData);
            setPlayerData(players);
            // If match just finished, next interval will skip the fetch
          })
          .catch(console.error);

        return prev;
      });
    }, POLL_INTERVAL);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id]);

  if (loading && !match) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading match...</span>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center text-muted-foreground">
          <p className="text-lg font-medium text-foreground">Match not found</p>
          <Link to="/" className="text-sm mt-2 inline-block hover:underline">← Back to matches</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${match.homeTeam.name} vs ${match.awayTeam.name} - ${match.league.name}`}
        description={`${match.homeTeam.name} vs ${match.awayTeam.name} live score, stats, lineups & AI insights. ${match.league.name}.`}
        path={`/match/${match.id}`}
        jsonLd={buildMatchJsonLd(match)}
      />
      <Header />

      <MatchHero match={match} />
      <TabBar match={match} tab={tab} setTab={setTab} />

      <main className="container py-4 md:py-6 pb-20 md:pb-6 max-w-3xl">
        {tab === 'overview' && <OverviewTab match={match} onJumpTo={setTab} />}
        {tab === 'lineups' && match.lineups && (
          <Card>
            <LineupView
              lineups={match.lineups}
              homeTeamName={match.homeTeam.name}
              awayTeamName={match.awayTeam.name}
              events={match.events}
              playerData={playerData}
              homeTeamId={match.homeTeam.id}
              awayTeamId={match.awayTeam.id}
            />
          </Card>
        )}
        {tab === 'stats' && match.stats && (
          <Card padded>
            <SectionTitle>Match statistics</SectionTitle>
            <MatchStatsView
              stats={match.stats}
              homeTeam={match.homeTeam.name}
              awayTeam={match.awayTeam.name}
            />
          </Card>
        )}
        {tab === 'commentary' && (
          <Card padded>
            <SectionTitle>Commentary</SectionTitle>
            {match.events?.length ? (
              <MatchTimeline
                events={match.events}
                homeTeamName={match.homeTeam.name}
                awayTeamName={match.awayTeam.name}
              />
            ) : (
              <EmptyState text="No events recorded yet." />
            )}
          </Card>
        )}
      </main>
    </div>
  );
}

/* ─────────── Hero ─────────── */
function MatchHero({ match }: { match: Match }) {
  const isLive = match.status === 'LIVE' || match.status === '1H' || match.status === '2H';
  const isHT = match.status === 'HT';
  const isFinished = match.status === 'FT' || match.status === 'AET' || match.status === 'PEN';
  const hasScore = match.homeScore !== null;

  return (
    <section className="bg-card border-b border-border">
      <div className="container max-w-3xl py-4 md:py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Link>

        <div className="flex items-center justify-center gap-2 mb-4 md:mb-6">
          {match.league.logo && (
            <OptimizedImage src={match.league.logo} alt="" className="w-4 h-4 object-contain" priority />
          )}
          <span className="text-xs font-medium text-muted-foreground tracking-wide">
            {match.league.name}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-6">
          <div className="flex flex-col items-center text-center">
            {match.homeTeam.logo && (
              <OptimizedImage
                src={match.homeTeam.logo}
                alt={match.homeTeam.name}
                className="w-14 h-14 md:w-20 md:h-20 object-contain mb-2"
                priority
              />
            )}
            <p className="text-sm md:text-base font-semibold text-foreground leading-tight max-w-[120px] md:max-w-[180px]">
              {match.homeTeam.name}
            </p>
          </div>

          <div className="flex flex-col items-center min-w-[110px]">
            {hasScore ? (
              <div className="flex items-baseline gap-2 md:gap-3 tabular-nums">
                <span className={cn(
                  'text-4xl md:text-6xl font-black leading-none',
                  isLive ? 'text-live' : 'text-foreground'
                )}>
                  {match.homeScore}
                </span>
                <span className="text-2xl md:text-3xl text-muted-foreground/60 font-light">:</span>
                <span className={cn(
                  'text-4xl md:text-6xl font-black leading-none',
                  isLive ? 'text-live' : 'text-foreground'
                )}>
                  {match.awayScore}
                </span>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-foreground tabular-nums">{match.time}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {match.date}
                </p>
              </div>
            )}

            <div className="mt-2 md:mt-3">
              {isLive && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-live/10 text-live text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse-live" />
                  {match.minute || 'LIVE'}
                </span>
              )}
              {isHT && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-live" />
                  Half Time
                </span>
              )}
              {isFinished && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground text-[11px] font-semibold">
                  {match.status === 'PEN' ? 'Pens' : match.status === 'AET' ? 'After ET' : 'Full Time'}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center text-center">
            {match.awayTeam.logo && (
              <OptimizedImage
                src={match.awayTeam.logo}
                alt={match.awayTeam.name}
                className="w-14 h-14 md:w-20 md:h-20 object-contain mb-2"
                priority
              />
            )}
            <p className="text-sm md:text-base font-semibold text-foreground leading-tight max-w-[120px] md:max-w-[180px]">
              {match.awayTeam.name}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────── Tab bar ─────────── */
function TabBar({ match, tab, setTab }: { match: Match; tab: Tab; setTab: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'overview', label: 'Overview', show: true },
    { id: 'lineups', label: 'Lineups', show: !!match.lineups },
    { id: 'stats', label: 'Stats', show: !!match.stats },
    { id: 'commentary', label: 'Commentary', show: !!match.events?.length },
  ];

  return (
    <div className="sticky top-14 z-20 bg-card/95 backdrop-blur border-b border-border">
      <div className="container max-w-3xl">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {tabs.filter(t => t.show).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'relative px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors',
                tab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Overview tab ─────────── */
function OverviewTab({ match, onJumpTo }: { match: Match; onJumpTo: (t: Tab) => void }) {
  const isFuture = match.status === 'NS';
  const topEvents = useMemo(() => match.events?.slice(0, 8) || [], [match.events]);

  return (
    <div className="space-y-4">
      <MatchInsightCard match={match} />

      <Card padded>
        <SectionTitle>Match info</SectionTitle>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <InfoRow icon={<Trophy className="w-3.5 h-3.5" />} label="Competition" value={match.league.name} />
          <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Date" value={`${match.date} · ${match.time}`} />
        </dl>
      </Card>

      {topEvents.length > 0 && (
        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Key events</h3>
            <button
              onClick={() => onJumpTo('commentary')}
              className="text-xs text-muted-foreground hover:text-foreground font-medium"
            >
              View all →
            </button>
          </div>
          <MatchTimeline
            events={topEvents}
            homeTeamName={match.homeTeam.name}
            awayTeamName={match.awayTeam.name}
          />
        </Card>
      )}

      {match.stats && (
        <Card padded>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Top stats</h3>
            <button
              onClick={() => onJumpTo('stats')}
              className="text-xs text-muted-foreground hover:text-foreground font-medium"
            >
              View all →
            </button>
          </div>
          <MatchStatsView
            stats={{
              possession: match.stats.possession,
              shots: match.stats.shots,
              shotsOnTarget: match.stats.shotsOnTarget,
              corners: match.stats.corners,
              fouls: [0, 0],
              offsides: [0, 0],
            }}
            homeTeam={match.homeTeam.name}
            awayTeam={match.awayTeam.name}
          />
        </Card>
      )}

      {isFuture && !match.stats && !topEvents.length && (
        <Card padded>
          <EmptyState text="More info will appear once the match begins." />
        </Card>
      )}
    </div>
  );
}

/* ─────────── Atoms ─────────── */
function Card({ children, padded = false }: { children: React.ReactNode; padded?: boolean }) {
  return (
    <section className={cn('bg-card border border-border rounded-xl overflow-hidden', padded && 'p-4')}>
      {children}
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">{children}</h2>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <>
      <dt className="flex items-center gap-1.5 text-muted-foreground">{icon}{label}</dt>
      <dd className="text-foreground font-medium text-right">{value}</dd>
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground text-center py-6">{text}</p>;
}