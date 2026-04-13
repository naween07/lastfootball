import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import LeagueGroup from '@/components/LeagueGroup';
import { useFavorites } from '@/hooks/useFavorites';
import { fetchMatchesByDate, getMatchesGroupedByLeague, getToday } from '@/services/footballApi';
import { Match } from '@/types/football';
import { Loader2 } from 'lucide-react';

export default function Favorites() {
  const { favoriteTeamIds, isFavorite, toggleFavorite } = useFavorites();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatchesByDate(getToday())
      .then(all => {
        const filtered = all.filter(m =>
          favoriteTeamIds.includes(m.homeTeam.id) || favoriteTeamIds.includes(m.awayTeam.id)
        );
        setMatches(filtered);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [favoriteTeamIds]);

  const groups = getMatchesGroupedByLeague(matches);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-4">
        <h1 className="text-lg font-bold mb-4 px-1">⭐ Favorite Teams</h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : favoriteTeamIds.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-3xl mb-3">⭐</p>
            <p className="text-lg font-medium">No favorites yet</p>
            <p className="text-sm mt-1">Tap the star next to any team to add it here</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">No matches today</p>
            <p className="text-sm mt-1">Your favorite teams have no matches scheduled today</p>
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
