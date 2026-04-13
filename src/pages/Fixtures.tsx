import { useState, useEffect } from 'react';
import Header from '@/components/Header';
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
import { Loader2 } from 'lucide-react';

export default function Fixtures() {
  const dates = getDateRange();
  const [selectedDate, setSelectedDate] = useState(getToday());
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

  const groups = getMatchesGroupedByLeague(matches);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Date Navigation Bar */}
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <DateNavigator dates={dates} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </div>

      <main className="container py-4">
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
