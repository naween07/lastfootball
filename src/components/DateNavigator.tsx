import { lazy, Suspense, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getDateLabel, formatDate } from '@/services/footballApi';

const LazyCalendar = lazy(async () => {
  const module = await import('@/components/ui/calendar');
  return { default: module.Calendar };
});

interface DateNavigatorProps {
  dates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export default function DateNavigator({ dates, selectedDate, onSelectDate }: DateNavigatorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const currentDateIdx = dates.indexOf(selectedDate);
  const canGoPrev = currentDateIdx > 0;
  const canGoNext = currentDateIdx < dates.length - 1;

  // If selected date is outside the quick-access range (from calendar), still show it
  const isCustomDate = currentDateIdx === -1;

  const handleCalendarSelect = (day: Date | undefined) => {
    if (day) {
      onSelectDate(formatDate(day));
      setCalendarOpen(false);
    }
  };

  const selectedAsDate = new Date(selectedDate + 'T12:00:00');

  return (
    <div className="container flex items-center justify-between py-2.5 px-4">
      <button
        onClick={() => {
          if (isCustomDate) {
            const d = new Date(selectedDate + 'T12:00:00');
            d.setDate(d.getDate() - 1);
            onSelectDate(formatDate(d));
          } else if (canGoPrev) {
            onSelectDate(dates[currentDateIdx - 1]);
          }
        }}
        disabled={!canGoPrev && !isCustomDate}
        className="p-1 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {isCustomDate ? (
          <span className="whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
            {getDateLabel(selectedDate)}
          </span>
        ) : (
          dates.map(date => (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedDate === date
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {getDateLabel(date)}
            </button>
          ))
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            if (isCustomDate) {
              const d = new Date(selectedDate + 'T12:00:00');
              d.setDate(d.getDate() + 1);
              onSelectDate(formatDate(d));
            } else if (canGoNext) {
              onSelectDate(dates[currentDateIdx + 1]);
            }
          }}
          disabled={!canGoNext && !isCustomDate}
          className="p-1 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
              <CalendarDays className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Suspense fallback={<div className="p-4 text-xs text-muted-foreground">Loading calendar...</div>}>
              <LazyCalendar
                mode="single"
                selected={selectedAsDate}
                onSelect={handleCalendarSelect}
                initialFocus
              />
            </Suspense>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
