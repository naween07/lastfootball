import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import LeagueFilter from '@/components/LeagueFilter';
import LeagueGroup from '@/components/LeagueGroup';
import DateNavigator from '@/components/DateNavigator';
import { useFavorites } from '@/hooks/useFavorites';
import {
  fetchMatchesByDate,
  getMatchesGroupedByLeague,
  getDateRange,
  getDateLabel,
  getToday,
} from '@/services/footballApi';
import { Match } from '@/types/football';
import { Loader2, Calendar } from 'lucide-react';

export default function Fixtures() {
  const dates = getDateRange();
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    setLoading(true);
    fetchMatchesByDate(selectedDate)
      .then(setMatches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const leagues = useMemo(() => {
    const map = new Map<number, Match['league']>();
    matches.forEach(m => map.set(m.league.id, m.league));
    return Array.from(map.values());
  }, [matches]);

  const filtered = useMemo(() =>
    selectedLeagueId ? matches.filter(m => m.league.id === selectedLeagueId) : matches,
  [matches, selectedLeagueId]);

  const groups = useMemo(() => getMatchesGroupedByLeague(filtered), [filtered]);

  // Match status counts
  const upcoming = matches.filter(m => m.status === 'NS' || m.status === 'TBD').length;
  const finished = matches.filter(m => m.status === 'FT' || m.status === 'AET' || m.status === 'PEN').length;
  const live = matches.filter(m => ['LIVE', '1H', '2H', 'HT'].includes(m.status)).length;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`Football Fixtures — ${getDateLabel(selectedDate)}`}
        description="Upcoming football fixtures and match schedule for all major leagues."
        path="/fixtures"
      />
      <Header />

      {/* League Filter */}
      <LeagueFilter leagues={leagues} selectedLeagueId={selectedLeagueId} onSelect={setSelectedLeagueId} />

      {/* Date Navigation Bar */}
      <div className="sticky top-[6.5rem] z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <DateNavigator dates={dates} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </div>

      {/* Match count summary */}
      {!loading && matches.length > 0 && (
        <div className="container py-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {matches.length} matches
            </span>
            {live > 0 && <span className="text-red-400 font-semibold">{live} live</span>}
            {upcoming > 0 && <span>{upcoming} upcoming</span>}
            {finished > 0 && <span>{finished} finished</span>}
          </div>
        </div>
      )}

      <main className="container py-2 pb-20 md:pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading fixtures...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">No fixtures</p>
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
      </main>
    </div>
  );
}
