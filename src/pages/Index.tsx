import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead, { buildWebsiteJsonLd } from '@/components/SEOHead';
import { useAuth } from '@/hooks/useAuth';
import LeagueFilter from '@/components/LeagueFilter';
import LeagueGroup from '@/components/LeagueGroup';
import DateNavigator from '@/components/DateNavigator';
import { useFavorites } from '@/hooks/useFavorites';
import {
  fetchLiveMatches,
  fetchMatchesByDate,
  getMatchesGroupedByLeague,
  getDateRange,
  getDateLabel,
  getToday,
} from '@/services/footballApi';
import { Match } from '@/types/football';
import { MatchListSkeleton } from '@/components/MatchListSkeleton';

const INITIAL_GROUP_BATCH = 6;
const GROUP_BATCH = 6;

function mergeLiveMatches(liveMatches: Match[], scheduledMatches: Match[]) {
  const liveIds = new Set(liveMatches.map((match) => match.id));
  return [...liveMatches, ...scheduledMatches.filter((match) => !liveIds.has(match.id))];
}

export default function Index() {
  const { user, onboardingCompleted } = useAuth();
  const dates = getDateRange();
  const todayStr = getToday();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [visibleGroupCount, setVisibleGroupCount] = useState(INITIAL_GROUP_BATCH);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    setVisibleGroupCount(INITIAL_GROUP_BATCH);
  }, [selectedDate, selectedLeagueId]);

  useEffect(() => {
    let active = true;

    const loadMatches = async () => {
      setLoading(true);

      try {
        if (selectedDate !== todayStr) {
          const data = await fetchMatchesByDate(selectedDate);
          if (!active) return;
          setMatches(data);
          setLiveCount(0);
          setLoading(false);
          return;
        }

        const todayMatches = await fetchMatchesByDate(selectedDate);
        if (!active) return;

        setMatches(todayMatches);
        setLiveCount(0);
        setLoading(false);

        void fetchLiveMatches()
          .then((liveMatches) => {
            if (!active) return;
            setMatches(mergeLiveMatches(liveMatches, todayMatches));
            setLiveCount(liveMatches.length);
          })
          .catch((error) => {
            console.error('Failed to fetch live matches:', error);
          });
      } catch (error) {
        console.error('Failed to load matches:', error);
        if (!active) return;
        setMatches([]);
        setLiveCount(0);
        setLoading(false);
      }
    };

    void loadMatches();

    if (selectedDate !== todayStr) {
      return () => {
        active = false;
      };
    }

    const interval = window.setInterval(() => {
      void Promise.all([
        fetchMatchesByDate(selectedDate),
        fetchLiveMatches(),
      ])
        .then(([todayMatches, liveMatches]) => {
          if (!active) return;
          setMatches(mergeLiveMatches(liveMatches, todayMatches));
          setLiveCount(liveMatches.length);
        })
        .catch((error) => {
          console.error('Failed to refresh live matches:', error);
        });
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selectedDate, todayStr]);

  const leagues = useMemo(() => {
    const leagueMap = new Map<number, Match['league']>();
    matches.forEach((match) => leagueMap.set(match.league.id, match.league));
    return Array.from(leagueMap.values());
  }, [matches]);

  const filtered = useMemo(() => {
    return selectedLeagueId
      ? matches.filter((match) => match.league.id === selectedLeagueId)
      : matches;
  }, [matches, selectedLeagueId]);

  const groups = useMemo(() => getMatchesGroupedByLeague(filtered), [filtered]);

  const visibleGroups = useMemo(() => {
    if (selectedLeagueId !== null) {
      return groups;
    }

    return groups.slice(0, visibleGroupCount);
  }, [groups, selectedLeagueId, visibleGroupCount]);

  useEffect(() => {
    if (selectedLeagueId !== null || visibleGroupCount >= groups.length) return;

    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleGroupCount((current) => Math.min(current + GROUP_BATCH, groups.length));
      },
      { rootMargin: '400px 0px' },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [groups.length, selectedLeagueId, visibleGroupCount]);

  // Date navigation
  const currentDateIdx = dates.indexOf(selectedDate);
  const canGoPrev = currentDateIdx > 0;
  const canGoNext = currentDateIdx < dates.length - 1;

  // Redirect to onboarding if user is logged in but hasn't completed it
  if (user && onboardingCompleted === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Live Football Scores & Results"
        description="Real-time football live scores, fixtures, results, and match stats from top leagues worldwide. Track your favorite teams."
        path="/"
        jsonLd={buildWebsiteJsonLd()}
      />
      <Header />
      <LeagueFilter leagues={leagues} selectedLeagueId={selectedLeagueId} onSelect={setSelectedLeagueId} />

      {/* Date Navigation Bar */}
      <div className="sticky top-[6.5rem] z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <DateNavigator dates={dates} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </div>

      <main className="container py-4">
        {loading ? (
          <MatchListSkeleton groups={4} />
        ) : (
          <>
            {liveCount > 0 && selectedDate === todayStr && (
              <div className="flex items-center gap-2 mb-4 px-1">
                <span className="w-2 h-2 rounded-full bg-live animate-pulse-live" />
                <span className="text-sm font-semibold text-live">{liveCount} Live</span>
                <span className="text-xs text-muted-foreground">matches right now</span>
              </div>
            )}

            {groups.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-lg font-medium">No matches found</p>
                <p className="text-sm mt-1">No matches scheduled for {getDateLabel(selectedDate).toLowerCase()}</p>
              </div>
            ) : (
              <>
                {visibleGroups.map(group => (
                  <LeagueGroup
                    key={group.league.id}
                    group={group}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}

                {selectedLeagueId === null && visibleGroups.length < groups.length && (
                  <div ref={loadMoreRef} className="pt-2">
                    <MatchListSkeleton groups={1} />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
