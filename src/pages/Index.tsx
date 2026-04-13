import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '@/components/Header';
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
  formatDate,
} from '@/services/footballApi';
import { Match, League } from '@/types/football';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const dates = getDateRange();
  const todayStr = getToday();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { isFavorite, toggleFavorite } = useFavorites();

  const load = useCallback(async () => {
    try {
      const isToday = selectedDate === todayStr;

      if (isToday) {
        const [live, today] = await Promise.all([
          fetchLiveMatches(),
          fetchMatchesByDate(selectedDate),
        ]);
        const liveIds = new Set(live.map(m => m.id));
        const merged = [...live, ...today.filter(m => !liveIds.has(m.id))];
        setMatches(merged);
        setLiveCount(live.length);
      } else {
        const data = await fetchMatchesByDate(selectedDate);
        setMatches(data);
        setLiveCount(0);
      }

      // Extract unique leagues after setting matches
    } catch (err) {
      console.error("Failed to load matches:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, todayStr]);

  useEffect(() => {
    setLoading(true);
    load();
    // Only auto-refresh for today
    if (selectedDate === todayStr) {
      const interval = setInterval(load, 15000);
      return () => clearInterval(interval);
    }
  }, [load, selectedDate, todayStr]);

  // Extract leagues from matches
  useEffect(() => {
    const leagueMap = new Map<number, League>();
    matches.forEach(m => leagueMap.set(m.league.id, m.league));
    setLeagues(Array.from(leagueMap.values()));
  }, [matches]);

  const filtered = selectedLeagueId
    ? matches.filter(m => m.league.id === selectedLeagueId)
    : matches;
  const groups = getMatchesGroupedByLeague(filtered);

  // Date navigation
  const currentDateIdx = dates.indexOf(selectedDate);
  const canGoPrev = currentDateIdx > 0;
  const canGoNext = currentDateIdx < dates.length - 1;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <LeagueFilter leagues={leagues} selectedLeagueId={selectedLeagueId} onSelect={setSelectedLeagueId} />

      {/* Date Navigation Bar */}
      <div className="sticky top-[6.5rem] z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <DateNavigator dates={dates} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </div>

      <main className="container py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading matches...</span>
          </div>
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
              groups.map(group => (
                <LeagueGroup
                  key={group.league.id}
                  group={group}
                  isFavorite={isFavorite}
                  onToggleFavorite={toggleFavorite}
                />
              ))
            )}
          </>
        )}
      </main>
    </div>
  );
}
