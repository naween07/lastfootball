import Header from '@/components/Header';
import LeagueGroup from '@/components/LeagueGroup';
import { useFavorites } from '@/hooks/useFavorites';
import { getAllMatches, getMatchesGroupedByLeague } from '@/services/mockData';

export default function Favorites() {
  const { favoriteTeamIds, isFavorite, toggleFavorite } = useFavorites();

  const favoriteMatches = getAllMatches().filter(
    m => favoriteTeamIds.includes(m.homeTeam.id) || favoriteTeamIds.includes(m.awayTeam.id)
  );
  const groups = getMatchesGroupedByLeague(favoriteMatches);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-4">
        <h1 className="text-lg font-bold mb-4 px-1">⭐ Favorite Teams</h1>

        {groups.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-3xl mb-3">⭐</p>
            <p className="text-lg font-medium">No favorites yet</p>
            <p className="text-sm mt-1">Tap the star next to any team to add it here</p>
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
