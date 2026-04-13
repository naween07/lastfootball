import { MatchStats as MatchStatsType } from '@/types/football';

interface MatchStatsProps {
  stats: MatchStatsType;
  homeTeam: string;
  awayTeam: string;
}

export default function MatchStatsView({ stats }: MatchStatsProps) {
  const rows: { label: string; home: number; away: number }[] = [
    { label: 'Possession %', home: stats.possession[0], away: stats.possession[1] },
    { label: 'Shots', home: stats.shots[0], away: stats.shots[1] },
    { label: 'Shots on Target', home: stats.shotsOnTarget[0], away: stats.shotsOnTarget[1] },
    { label: 'Corners', home: stats.corners[0], away: stats.corners[1] },
    { label: 'Fouls', home: stats.fouls[0], away: stats.fouls[1] },
    { label: 'Offsides', home: stats.offsides[0], away: stats.offsides[1] },
  ];

  return (
    <div className="space-y-3 px-4">
      {rows.map(row => {
        const total = row.home + row.away || 1;
        const homePercent = (row.home / total) * 100;
        return (
          <div key={row.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-foreground tabular-nums">{row.home}</span>
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold text-foreground tabular-nums">{row.away}</span>
            </div>
            <div className="flex h-1 rounded-full overflow-hidden bg-muted gap-0.5">
              <div
                className="bg-primary rounded-full transition-all duration-500"
                style={{ width: `${homePercent}%` }}
              />
              <div
                className="bg-muted-foreground/30 rounded-full transition-all duration-500"
                style={{ width: `${100 - homePercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
