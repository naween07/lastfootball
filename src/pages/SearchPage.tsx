import { useState, useEffect, useCallback } from 'react';
import { Search as SearchIcon, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import LeagueGroup from '@/components/LeagueGroup';
import { useFavorites } from '@/hooks/useFavorites';
import { searchTeamsAndLeagues, getMatchesGroupedByLeague } from '@/services/footballApi';
import { Match } from '@/types/football';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      searchTeamsAndLeagues(query)
        .then(setResults)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 500);

    return () => clearTimeout(timeout);
  }, [query]);

  const groups = getMatchesGroupedByLeague(results);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container py-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search teams or leagues..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>
        </div>
      </div>
      <main className="container py-4 pb-20 md:pb-4">

        {query.length < 3 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm">Type at least 3 characters to search</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">No results</p>
            <p className="text-sm mt-1">Try a different search term</p>
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
