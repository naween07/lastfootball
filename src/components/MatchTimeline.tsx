import { useEffect, useRef } from 'react';
import { MatchEvent } from '@/types/football';
import { cn } from '@/lib/utils';

interface MatchTimelineProps {
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
}

export default function MatchTimeline({ events }: MatchTimelineProps) {
  const sorted = [...events].sort((a, b) => a.minute - b.minute);
  const seenIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    sorted.forEach((e) => seenIdsRef.current.add(e.id));
  }, [sorted]);

  return (
    <div className="divide-y divide-border/60">
      {sorted.map((event) => {
        const isNew = !seenIdsRef.current.has(event.id);
        const isGoal = event.type === 'goal';
        const isCard = event.type === 'yellow_card' || event.type === 'red_card';
        return (
          <div
            key={event.id}
            className={cn(
              'flex items-start gap-3 py-3 px-4',
              event.team === 'home' ? '' : 'flex-row-reverse text-right',
              isNew && isGoal && 'event-flash-goal',
              isNew && isCard && 'event-flash-card',
            )}
          >
            <div className="flex-1 min-w-0">
              <div
                className="flex items-center gap-2"
                style={{ justifyContent: event.team === 'away' ? 'flex-end' : 'flex-start' }}
              >
                <EventIcon type={event.type} animate={isNew} />
                <span className={cn(
                  'text-sm font-semibold',
                  isGoal ? 'text-foreground' : 'text-foreground/90'
                )}>
                  {event.playerName}
                </span>
              </div>
              {event.assistName && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {event.type === 'substitution' ? '↑ ' : 'Assist: '}{event.assistName}
                </p>
              )}
              {event.detail && event.type !== 'substitution' && (
                <p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p>
              )}
            </div>
            <span className="text-xs font-bold text-muted-foreground tabular-nums flex-shrink-0 mt-0.5 min-w-[28px]">
              {event.minute}'{event.extraMinute ? `+${event.extraMinute}` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EventIcon({ type, animate = false }: { type: MatchEvent['type']; animate?: boolean }) {
  const animationClass = animate ? 'scale-in' : '';
  switch (type) {
    case 'goal':
      return <span className={cn('text-base', animationClass)} aria-label="Goal">⚽</span>;
    case 'yellow_card':
      return (
        <span
          className={cn('inline-block w-2.5 h-3.5 rounded-[1px] bg-yellow-400 border border-yellow-500/50', animationClass)}
          aria-label="Yellow card"
        />
      );
    case 'red_card':
      return (
        <span
          className={cn('inline-block w-2.5 h-3.5 rounded-[1px] bg-live border border-live/50', animationClass)}
          aria-label="Red card"
        />
      );
    case 'substitution':
      return <span className={cn('text-sm', animationClass)} aria-label="Substitution">🔄</span>;
    default:
      return null;
  }
}
