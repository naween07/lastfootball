import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import LeagueGroup from '@/components/LeagueGroup';
import { useFavorites } from '@/hooks/useFavorites';
import {
  fetchMatchesByDate,
  getMatchesGroupedByLeague,
  getDateRange,
  getDateLabel,
  getToday,
} from '@/services/footballApi';
import { Match } from '@/types/football';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

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

  const currentDateIdx = dates.indexOf(selectedDate);
  const canGoPrev = currentDateIdx > 0;
  const canGoNext = currentDateIdx < dates.length - 1;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Date Navigation Bar */}
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between py-2.5 px-4">
          <button
            onClick={() => canGoPrev && setSelectedDate(dates[currentDateIdx - 1])}
            disabled={!canGoPrev}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {dates.map(date => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedDate === date
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {getDateLabel(date)}
              </button>
            ))}
          </div>

          <button
            onClick={() => canGoNext && setSelectedDate(dates[currentDateIdx + 1])}
            disabled={!canGoNext}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
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
