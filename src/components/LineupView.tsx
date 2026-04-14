import { TeamLineup } from '@/types/football';

interface LineupViewProps {
  lineups: { home: TeamLineup; away: TeamLineup };
  homeTeamName: string;
  awayTeamName: string;
}

export default function LineupView({ lineups, homeTeamName, awayTeamName }: LineupViewProps) {
  return (
    <div className="space-y-6 p-4">
      {/* Formations */}
      <div className="flex items-center justify-between text-center">
        <div>
          <p className="text-xs text-muted-foreground">{homeTeamName}</p>
          <p className="text-lg font-bold text-foreground">{lineups.home.formation}</p>
        </div>
        <p className="text-xs text-muted-foreground font-medium">Formation</p>
        <div>
          <p className="text-xs text-muted-foreground">{awayTeamName}</p>
          <p className="text-lg font-bold text-foreground">{lineups.away.formation}</p>
        </div>
      </div>

      {/* Starting XI */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 px-1">Starting XI</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0">
          {/* Home */}
          <div className="space-y-0">
            {lineups.home.startXI.map(p => (
              <PlayerRow key={p.id || p.name} player={p} align="left" />
            ))}
          </div>
          {/* Away */}
          <div className="space-y-0">
            {lineups.away.startXI.map(p => (
              <PlayerRow key={p.id || p.name} player={p} align="right" />
            ))}
          </div>
        </div>
      </div>

      {/* Substitutes */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 px-1">Substitutes</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0">
          <div className="space-y-0">
            {lineups.home.substitutes.map(p => (
              <PlayerRow key={p.id || p.name} player={p} align="left" />
            ))}
          </div>
          <div className="space-y-0">
            {lineups.away.substitutes.map(p => (
              <PlayerRow key={p.id || p.name} player={p} align="right" />
            ))}
          </div>
        </div>
      </div>

      {/* Coaches */}
      <div className="border-t border-border pt-3">
        <h3 className="text-sm font-semibold text-foreground mb-2 px-1">Coach</h3>
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-muted-foreground">{lineups.home.coach.name}</span>
          <span className="text-sm text-muted-foreground">{lineups.away.coach.name}</span>
        </div>
      </div>
    </div>
  );
}

function PlayerRow({ player, align }: { player: { name: string; number: number; pos: string }; align: 'left' | 'right' }) {
  const posColor = {
    G: 'text-amber-400',
    D: 'text-blue-400',
    M: 'text-emerald-400',
    F: 'text-red-400',
  }[player.pos] || 'text-muted-foreground';

  return (
    <div className={`flex items-center gap-2 py-1.5 px-1 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <span className="text-xs font-bold text-muted-foreground w-5 text-center tabular-nums">{player.number}</span>
      <span className={`text-[10px] font-bold uppercase w-4 text-center ${posColor}`}>{player.pos}</span>
      <span className="text-sm text-foreground truncate">{player.name}</span>
    </div>
  );
}
