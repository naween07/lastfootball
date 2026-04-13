import { MatchEvent } from '@/types/football';

interface MatchTimelineProps {
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
}

export default function MatchTimeline({ events, homeTeamName, awayTeamName }: MatchTimelineProps) {
  const sorted = [...events].sort((a, b) => a.minute - b.minute);

  return (
    <div className="space-y-0">
      {sorted.map(event => (
        <div key={event.id} className={`flex items-start gap-3 py-2 px-4 ${
          event.team === 'home' ? '' : 'flex-row-reverse text-right'
        }`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2" style={{ justifyContent: event.team === 'away' ? 'flex-end' : 'flex-start' }}>
              <EventIcon type={event.type} />
              <span className="text-sm font-medium text-foreground">{event.playerName}</span>
            </div>
            {event.assistName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Assist: {event.assistName}
              </p>
            )}
            {event.detail && (
              <p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p>
            )}
          </div>
          <span className="text-xs font-bold text-muted-foreground tabular-nums flex-shrink-0 mt-0.5">
            {event.minute}'{event.extraMinute ? `+${event.extraMinute}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function EventIcon({ type }: { type: MatchEvent['type'] }) {
  switch (type) {
    case 'goal':
      return <span className="text-sm">⚽</span>;
    case 'yellow_card':
      return <span className="inline-block w-3 h-4 rounded-[1px] bg-yellow-400" />;
    case 'red_card':
      return <span className="inline-block w-3 h-4 rounded-[1px] bg-live" />;
    case 'substitution':
      return <span className="text-sm">🔄</span>;
    default:
      return null;
  }
}
