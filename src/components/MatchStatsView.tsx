import { MatchStats as MatchStatsType } from '@/types/football';

interface MatchStatsProps {
  stats: MatchStatsType;
  homeTeam: string;
  awayTeam: string;
}

export default function MatchStatsView({ stats, homeTeam, awayTeam }: MatchStatsProps) {
  const rows: { label: string; home: number; away: number; isPossession?: boolean }[] = [
    { label: 'Possession', home: stats.possession[0], away: stats.possession[1], isPossession: true },
    { label: 'Shots', home: stats.shots[0], away: stats.shots[1] },
    { label: 'Shots on target', home: stats.shotsOnTarget[0], away: stats.shotsOnTarget[1] },
    { label: 'Corners', home: stats.corners[0], away: stats.corners[1] },
    { label: 'Fouls', home: stats.fouls[0], away: stats.fouls[1] },
    { label: 'Offsides', home: stats.offsides[0], away: stats.offsides[1] },
  ];

  return (
    <div className="space-y-1">
      {rows.map(row => {
        const total = row.home + row.away || 1;
        const homePercent = (row.home / total) * 100;
        const awayPercent = 100 - homePercent;
        const homeWinning = row.home > row.away;
        const awayWinning = row.away > row.home;

        return (
          <div key={row.label} className="px-4 py-2">
            {/* Label centered */}
            <div className="text-center mb-1.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {row.label}
              </span>
            </div>

            {/* Values + bars */}
            <div className="flex items-center gap-3">
              {/* Home value */}
              <span className={`text-sm font-bold tabular-nums w-8 text-left ${
                homeWinning ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {row.isPossession ? `${row.home}%` : row.home}
              </span>

              {/* Double bar — home grows right-to-left, away grows left-to-right */}
              <div className="flex-1 flex gap-1 items-center h-[6px]">
                {/* Home bar (right-aligned, grows leftward) */}
                <div className="flex-1 flex justify-end">
                  <div
                    className={`h-[6px] rounded-full transition-all duration-700 ${
                      homeWinning ? 'bg-primary' : 'bg-muted-foreground/25'
                    }`}
                    style={{ width: `${homePercent}%` }}
                  />
                </div>
                {/* Away bar (left-aligned, grows rightward) */}
                <div className="flex-1">
                  <div
                    className={`h-[6px] rounded-full transition-all duration-700 ${
                      awayWinning ? 'bg-primary' : 'bg-muted-foreground/25'
                    }`}
                    style={{ width: `${awayPercent}%` }}
                  />
                </div>
              </div>

              {/* Away value */}
              <span className={`text-sm font-bold tabular-nums w-8 text-right ${
                awayWinning ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {row.isPossession ? `${row.away}%` : row.away}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}