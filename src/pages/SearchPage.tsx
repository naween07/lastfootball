import { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import Header from '@/components/Header';
import LeagueGroup from '@/components/LeagueGroup';
import { useFavorites } from '@/hooks/useFavorites';
import { searchMatches, getMatchesGroupedByLeague } from '@/services/mockData';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const { isFavorite, toggleFavorite } = useFavorites();

  const results = query.length >= 2 ? searchMatches(query) : [];
  const groups = getMatchesGroupedByLeague(results);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-4">
        <div className="relative mb-4">
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

        {query.length < 2 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm">Type at least 2 characters to search</p>
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
