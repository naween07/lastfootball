import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead, { buildWebsiteJsonLd } from '@/components/SEOHead';
import { useAuth } from '@/hooks/useAuth';
import LeagueGroup from '@/components/LeagueGroup';
import MatchCard from '@/components/MatchCard';
import OptimizedImage from '@/components/OptimizedImage';
import { useFavorites } from '@/hooks/useFavorites';
import { Star, Zap, Clock, CheckCircle, Loader2 } from 'lucide-react';
import {
  fetchLiveMatches,
  fetchMatchesByDate,
  getMatchesGroupedByLeague,
  getToday,
} from '@/services/footballApi';
import { Match } from '@/types/football';
import { MatchListSkeleton } from '@/components/MatchListSkeleton';
import { cn } from '@/lib/utils';

function mergeLiveMatches(liveMatches: Match[], scheduledMatches: Match[]) {
  const liveIds = new Set(liveMatches.map((m) => m.id));
  return [...liveMatches, ...scheduledMatches.filter((m) => !liveIds.has(m.id))];
}

type StatusTab = 'all' | 'live' | 'upcoming' | 'finished';

export default function Index() {
  const { user } = useAuth();
  const todayStr = getToday();
  const [matches, setMatches] = useState<Match[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const { isFavorite, toggleFavorite, favoriteTeamIds } = useFavorites();

  // Fetch today's matches + live matches
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const todayMatches = await fetchMatchesByDate(todayStr);
        if (!active) return;
        setMatches(todayMatches);
        setLoading(false);

        // Then fetch live overlay
        const liveMatches = await fetchLiveMatches();
        if (!active) return;
        setMatches(mergeLiveMatches(liveMatches, todayMatches));
        setLiveCount(liveMatches.length);
      } catch (err) {
        console.error('Failed to load:', err);
        if (!active) return;
        setMatches([]);
        setLoading(false);
      }
    };
    load();

    // Auto-refresh every 15s
    const interval = setInterval(() => {
      Promise.all([fetchMatchesByDate(todayStr), fetchLiveMatches()])
        .then(([today, live]) => {
          if (!active) return;
          setMatches(mergeLiveMatches(live, today));
          setLiveCount(live.length);
        })
        .catch(console.error);
    }, 15000);

    return () => { active = false; clearInterval(interval); };
  }, [todayStr]);

  // Group matches by status
  const liveMatches = useMemo(() =>
    matches.filter(m => ['LIVE', '1H', '2H', 'HT', 'ET', 'P', 'BT'].includes(m.status)),
  [matches]);

  const htMatches = useMemo(() =>
    matches.filter(m => m.status === 'HT'),
  [matches]);

  const upcomingMatches = useMemo(() =>
    matches.filter(m => m.status === 'NS' || m.status === 'TBD'),
  [matches]);

  const finishedMatches = useMemo(() => {
    const finished = matches.filter(m => m.status === 'FT' || m.status === 'AET' || m.status === 'PEN');
    // Sort: top leagues first, then by time (most recent first)
    const topIds = [2, 3, 39, 140, 135, 78, 61]; // UCL, UEL, PL, La Liga, Serie A, Bundesliga, Ligue 1
    return finished.sort((a, b) => {
      const aTop = topIds.indexOf(a.league.id);
      const bTop = topIds.indexOf(b.league.id);
      const aIsTop = aTop !== -1;
      const bIsTop = bTop !== -1;
      if (aIsTop && !bIsTop) return -1;
      if (!aIsTop && bIsTop) return 1;
      if (aIsTop && bIsTop) return aTop - bTop;
      return 0;
    });
  }, [matches]);

  // Filtered by tab
  const displayMatches = useMemo(() => {
    switch (activeTab) {
      case 'live': return liveMatches;
      case 'upcoming': return upcomingMatches;
      case 'finished': return finishedMatches;
      default: return matches;
    }
  }, [activeTab, matches, liveMatches, upcomingMatches, finishedMatches]);

  const groups = useMemo(() => getMatchesGroupedByLeague(displayMatches), [displayMatches]);

  // Favorite matches
  const favoriteMatches = useMemo(() => {
    if (!favoriteTeamIds.length) return [];
    return matches.filter(m =>
      favoriteTeamIds.includes(m.homeTeam.id) || favoriteTeamIds.includes(m.awayTeam.id)
    );
  }, [matches, favoriteTeamIds]);

  const tabs: { id: StatusTab; label: string; count: number; icon: React.ReactNode; color: string }[] = [
    { id: 'all', label: 'All', count: matches.length, icon: null, color: 'text-foreground' },
    { id: 'live', label: 'Live', count: liveMatches.length, icon: <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />, color: 'text-red-400' },
    { id: 'upcoming', label: 'Upcoming', count: upcomingMatches.length, icon: <Clock className="w-3 h-3" />, color: 'text-amber-400' },
    { id: 'finished', label: 'Finished', count: finishedMatches.length, icon: <CheckCircle className="w-3 h-3" />, color: 'text-muted-foreground' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Live Football Scores & Results — LastFootball"
        description="Real-time football live scores, fixtures, results, and match stats from top leagues worldwide."
        path="/live"
        jsonLd={buildWebsiteJsonLd()}
      />
      <Header />

      {/* Score Ticker — horizontal scrolling live scores */}
      {liveMatches.length > 0 && (
        <div className="bg-card/80 border-b border-border overflow-hidden">
          <div className="flex items-center gap-1 py-1.5 px-2 overflow-x-auto no-scrollbar">
            <span className="flex items-center gap-1.5 px-2 py-1 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[10px] font-bold text-red-400 uppercase">Live</span>
            </span>
            {liveMatches.map(m => (
              <Link
                key={m.id}
                to={`/match/${m.id}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-secondary/50 transition-colors flex-shrink-0"
              >
                <OptimizedImage src={m.homeTeam.logo} alt="" className="w-4 h-4 object-contain" />
                <span className="text-xs font-bold text-foreground tabular-nums">
                  {m.homeScore ?? 0}
                </span>
                <span className="text-xs text-muted-foreground/40">-</span>
                <span className="text-xs font-bold text-foreground tabular-nums">
                  {m.awayScore ?? 0}
                </span>
                <OptimizedImage src={m.awayTeam.logo} alt="" className="w-4 h-4 object-contain" />
                <span className="text-[10px] text-red-400 font-semibold tabular-nums">
                  {m.minute ? `${m.minute}'` : m.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container flex items-center gap-1 py-2 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0',
                activeTab === tab.id
                  ? tab.id === 'live' ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30' : 'bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary',
              )}
            >
              {tab.icon}
              {tab.label}
              <span className={cn(
                'text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full',
                activeTab === tab.id
                  ? tab.id === 'live' ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'
                  : 'bg-secondary text-muted-foreground/70',
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <main className="container py-4 pb-20 md:pb-4">
        {loading ? (
          <MatchListSkeleton groups={4} />
        ) : (
          <>
            {/* Your Matches — favorite teams */}
            {favoriteMatches.length > 0 && activeTab === 'all' && (
              <div className="mb-4">
                <div className="flex items-center gap-2 px-3 py-2">
                  <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Your Matches</span>
                </div>
                <div className="bg-card rounded-lg border border-primary/20 overflow-hidden">
                  {favoriteMatches.map(match => (
                    <MatchCard
                      key={`fav-${match.id}`}
                      match={match}
                      isFavoriteHome={isFavorite(match.homeTeam.id)}
                      isFavoriteAway={isFavorite(match.awayTeam.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Status-grouped display */}
            {activeTab === 'all' ? (
              <>
                {/* Live section */}
                {liveMatches.length > 0 && (
                  <StatusSection
                    title={`${liveMatches.length} Live`}
                    icon={<span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
                    color="text-red-400"
                    borderColor="border-red-500/20"
                  >
                    {getMatchesGroupedByLeague(liveMatches).map(group => (
                      <LeagueGroup key={`live-${group.league.id}`} group={group} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} />
                    ))}
                  </StatusSection>
                )}

                {/* Upcoming section */}
                {upcomingMatches.length > 0 && (
                  <StatusSection
                    title={`${upcomingMatches.length} Upcoming`}
                    icon={<Clock className="w-3.5 h-3.5 text-amber-400" />}
                    color="text-amber-400"
                    borderColor="border-amber-500/20"
                  >
                    {getMatchesGroupedByLeague(upcomingMatches).map(group => (
                      <LeagueGroup key={`up-${group.league.id}`} group={group} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} />
                    ))}
                  </StatusSection>
                )}

                {/* Finished section */}
                {finishedMatches.length > 0 && (
                  <StatusSection
                    title={`${finishedMatches.length} Finished`}
                    icon={<CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />}
                    color="text-muted-foreground"
                    borderColor="border-border/30"
                    collapsed
                  >
                    {getMatchesGroupedByLeague(finishedMatches).map(group => (
                      <LeagueGroup key={`fin-${group.league.id}`} group={group} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} />
                    ))}
                  </StatusSection>
                )}

                {matches.length === 0 && (
                  <div className="text-center py-20 text-muted-foreground">
                    <p className="text-lg font-medium">No matches today</p>
                    <p className="text-sm mt-1">Check back later or browse <Link to="/fixtures" className="text-primary hover:underline">fixtures</Link></p>
                  </div>
                )}
              </>
            ) : (
              /* Tab-filtered view — show by league */
              groups.length > 0 ? (
                groups.map(group => (
                  <LeagueGroup key={group.league.id} group={group} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} />
                ))
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  <p className="text-lg font-medium">No {activeTab} matches</p>
                  <p className="text-sm mt-1">
                    {activeTab === 'live' ? 'No matches are live right now' : 
                     activeTab === 'upcoming' ? 'No upcoming matches today' :
                     'No finished matches today'}
                  </p>
                </div>
              )
            )}

            {/* Auto-refresh indicator */}
            <div className="flex items-center justify-center gap-1.5 py-3 mt-2">
              <Loader2 className="w-3 h-3 text-muted-foreground/30 animate-spin" />
              <span className="text-[10px] text-muted-foreground/30">Auto-refreshing every 15s</span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Status Section — collapsible container ─────────────────────────────────
function StatusSection({
  title, icon, color, borderColor, collapsed, children,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  collapsed?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(!collapsed);

  return (
    <div className={cn('mb-5 rounded-xl border overflow-hidden', borderColor)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-card/50 hover:bg-card/80 transition-colors"
      >
        {icon}
        <span className={cn('text-sm font-bold uppercase tracking-wider', color)}>{title}</span>
        <span className="ml-auto text-muted-foreground text-xs">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && <div className="bg-background">{children}</div>}
    </div>
  );
}
