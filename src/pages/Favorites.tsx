import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import LeagueGroup from '@/components/LeagueGroup';
import { useFavorites } from '@/hooks/useFavorites';
import { fetchMatchesByDate, getMatchesGroupedByLeague, getToday } from '@/services/footballApi';
import { Match } from '@/types/football';
import { Loader2, Star, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Favorites() {
  const { favoriteTeamIds, isFavorite, toggleFavorite } = useFavorites();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (favoriteTeamIds.length === 0) {
      setLoading(false);
      return;
    }
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

      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-b border-amber-500/20">
        <div className="container py-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/25">
            <Star className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">My Club</h1>
            <p className="text-xs text-muted-foreground">
              {favoriteTeamIds.length > 0
                ? `${favoriteTeamIds.length} team${favoriteTeamIds.length > 1 ? 's' : ''} followed`
                : 'Follow your favourite teams'}
            </p>
          </div>
        </div>
      </div>

      <main className="container py-4 pb-20 md:pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : favoriteTeamIds.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-semibold text-foreground mb-1">No favourites yet</p>
            <p className="text-sm mb-6">Tap the star icon on any team to follow them here</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Browse Matches
            </Link>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-semibold text-foreground mb-1">No matches today</p>
            <p className="text-sm mb-6">Your favourite teams are not playing today</p>
            <Link
              to="/fixtures"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:opacity-80 transition-opacity"
            >
              View Fixtures
            </Link>
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
