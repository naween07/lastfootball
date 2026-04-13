import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import LeagueFilter from '@/components/LeagueFilter';
import LeagueGroup from '@/components/LeagueGroup';
import { useFavorites } from '@/hooks/useFavorites';
import { fetchLiveMatches, fetchMatchesByDate, getMatchesGroupedByLeague, getToday } from '@/services/footballApi';
import { Match, LeagueMatches, League } from '@/types/football';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { isFavorite, toggleFavorite } = useFavorites();

  const load = useCallback(async () => {
    try {
      // Fetch both live and today's matches
      const [live, today] = await Promise.all([
        fetchLiveMatches(),
        fetchMatchesByDate(getToday()),
      ]);

      // Merge: live matches + today's non-live matches
      const liveIds = new Set(live.map(m => m.id));
      const merged = [...live, ...today.filter(m => !liveIds.has(m.id))];

      setMatches(merged);
      setLiveCount(live.length);

      // Extract unique leagues
      const leagueMap = new Map<number, League>();
      merged.forEach(m => leagueMap.set(m.league.id, m.league));
      setLeagues(Array.from(leagueMap.values()));
    } catch (err) {
      console.error("Failed to load matches:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const filtered = selectedLeagueId
    ? matches.filter(m => m.league.id === selectedLeagueId)
    : matches;
  const groups = getMatchesGroupedByLeague(filtered);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <LeagueFilter leagues={leagues} selectedLeagueId={selectedLeagueId} onSelect={setSelectedLeagueId} />

      <main className="container py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading matches...</span>
          </div>
        ) : (
          <>
            {liveCount > 0 && (
              <div className="flex items-center gap-2 mb-4 px-1">
                <span className="w-2 h-2 rounded-full bg-live animate-pulse-live" />
                <span className="text-sm font-semibold text-live">{liveCount} Live</span>
                <span className="text-xs text-muted-foreground">matches right now</span>
              </div>
            )}

            {groups.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-lg font-medium">No matches found</p>
                <p className="text-sm mt-1">Try selecting a different league or check back later</p>
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
