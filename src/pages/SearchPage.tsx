import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, Loader2, X } from 'lucide-react';
import Header from '@/components/Header';
import LeagueGroup from '@/components/LeagueGroup';
import OptimizedImage from '@/components/OptimizedImage';
import { useFavorites } from '@/hooks/useFavorites';
import { searchTeamsAndLeagues, getMatchesGroupedByLeague, SearchResult } from '@/services/footballApi';
import { Match } from '@/types/football';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ teams: [], matches: [] });
  const [loading, setLoading] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    if (query.length < 3) {
      setResults({ teams: [], matches: [] });
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

  const groups = getMatchesGroupedByLeague(results.matches);
  const hasResults = results.teams.length > 0 || groups.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container py-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search teams, clubs, leagues..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="container py-4 pb-20 md:pb-4">
        {query.length < 3 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm">Type at least 3 characters to search</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Try "Madrid", "Chelsea", "Barcelona"...</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
          </div>
        ) : !hasResults ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">No results for "{query}"</p>
            <p className="text-sm mt-1">Try a different team or league name</p>
          </div>
        ) : (
          <>
            {/* Matched teams */}
            {results.teams.length > 0 && (
              <div className="mb-5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Teams</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {results.teams.map(team => (
                    <div
                      key={team.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <OptimizedImage src={team.logo} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{team.name}</p>
                        <p className="text-[10px] text-muted-foreground">{team.country}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent matches */}
            {groups.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Recent Matches</h3>
                {groups.map(group => (
                  <LeagueGroup
                    key={group.league.id}
                    group={group}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
