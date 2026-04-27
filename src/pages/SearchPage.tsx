import { useState, useEffect } from 'react';
import { Search as SearchIcon, Loader2, X, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import LeagueGroup from '@/components/LeagueGroup';
import OptimizedImage from '@/components/OptimizedImage';
import { useFavorites } from '@/hooks/useFavorites';
import { searchTeamsAndLeagues, getMatchesGroupedByLeague, SearchResult } from '@/services/footballApi';
import { cn } from '@/lib/utils';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ teams: [], matches: [], selectedTeamId: null });
  const [loading, setLoading] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<{ id: number; name: string; logo: string } | null>(null);
  const { isFavorite, toggleFavorite } = useFavorites();

  // Search teams on query change
  useEffect(() => {
    setSelectedTeam(null);
    if (query.length < 3) {
      setResults({ teams: [], matches: [], selectedTeamId: null });
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

  // Load matches when a team is selected
  const handleTeamClick = async (team: { id: number; name: string; logo: string }) => {
    setSelectedTeam(team);
    setLoadingMatches(true);
    try {
      const res = await searchTeamsAndLeagues('', team.id);
      setResults(prev => ({ ...prev, matches: res.matches, selectedTeamId: team.id }));
    } catch {}
    setLoadingMatches(false);
  };

  const groups = getMatchesGroupedByLeague(results.matches);

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
                onClick={() => { setQuery(''); setSelectedTeam(null); }}
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
            <p className="text-xs text-muted-foreground/50 mt-1">Try "Madrid", "Chelsea", "Liverpool", "Bayern"...</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
          </div>
        ) : results.teams.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">No results for "{query}"</p>
            <p className="text-sm mt-1">Try a different team or league name</p>
          </div>
        ) : (
          <>
            {/* Matched teams */}
            <div className="mb-5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                {results.teams.length} team{results.teams.length !== 1 ? 's' : ''} found
              </h3>
              <div className="space-y-1">
                {results.teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => handleTeamClick(team)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left',
                      selectedTeam?.id === team.id
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-card border border-border/50 hover:border-primary/20 hover:bg-card/80',
                    )}
                  >
                    <OptimizedImage src={team.logo} alt="" className="w-9 h-9 object-contain flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{team.name}</p>
                      <p className="text-[11px] text-muted-foreground">{team.country}</p>
                    </div>
                    <ChevronRight className={cn(
                      'w-4 h-4 text-muted-foreground transition-colors',
                      selectedTeam?.id === team.id && 'text-primary',
                    )} />
                  </button>
                ))}
              </div>
            </div>

            {/* Selected team matches */}
            {selectedTeam && (
              <div>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <OptimizedImage src={selectedTeam.logo} alt="" className="w-5 h-5 object-contain" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    {selectedTeam.name} — Recent Matches
                  </h3>
                </div>

                {loadingMatches ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading matches...</span>
                  </div>
                ) : groups.length > 0 ? (
                  groups.map(group => (
                    <LeagueGroup
                      key={group.league.id}
                      group={group}
                      isFavorite={isFavorite}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">No recent matches found</p>
                )}
              </div>
            )}

            {/* Prompt to select a team */}
            {!selectedTeam && (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">Tap a team to see their recent matches</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
