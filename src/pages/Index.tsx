import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import LeagueFilter from '@/components/LeagueFilter';
import LeagueGroup from '@/components/LeagueGroup';
import { useFavorites } from '@/hooks/useFavorites';
import { getAllMatches, getLeagues, getMatchesGroupedByLeague, getLiveMatches } from '@/services/mockData';
import { LeagueMatches } from '@/types/football';

export default function Index() {
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [groups, setGroups] = useState<LeagueMatches[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const { isFavorite, toggleFavorite } = useFavorites();
  const leagues = getLeagues();

  useEffect(() => {
    const load = () => {
      const all = selectedLeagueId
        ? getAllMatches().filter(m => m.league.id === selectedLeagueId)
        : getAllMatches();
      setGroups(getMatchesGroupedByLeague(all));
      setLiveCount(getLiveMatches().length);
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [selectedLeagueId]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <LeagueFilter leagues={leagues} selectedLeagueId={selectedLeagueId} onSelect={setSelectedLeagueId} />

      <main className="container py-4">
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
            <p className="text-sm mt-1">Try selecting a different league</p>
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
      </main>
    </div>
  );
}
