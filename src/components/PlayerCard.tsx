import { useState } from 'react';
import { X, Star, Shield, Crosshair, Footprints, HandMetal } from 'lucide-react';
import { MatchPlayerStats } from '@/types/football';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  player: MatchPlayerStats;
  teamName?: string;
  teamLogo?: string;
  onClose?: () => void;
}

function getRatingColor(rating: string | null): string {
  if (!rating) return 'bg-muted text-muted-foreground';
  const r = parseFloat(rating);
  if (r >= 8.0) return 'bg-primary text-primary-foreground';
  if (r >= 7.0) return 'bg-emerald-500/20 text-emerald-400';
  if (r >= 6.5) return 'bg-amber-500/20 text-amber-400';
  if (r >= 6.0) return 'bg-orange-500/20 text-orange-400';
  return 'bg-destructive/20 text-destructive';
}

function StatItem({ label, value, icon }: { label: string; value: string | number | null; icon?: React.ReactNode }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon && <span className="w-4 h-4 opacity-60">{icon}</span>}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-sm font-bold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function StatBar({ label, value, max, color = 'bg-primary' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-xs font-bold tabular-nums text-foreground">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function PlayerCard({ player, teamName, teamLogo, onClose }: PlayerCardProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'attack' | 'defense'>('summary');
  const rating = player.rating ? parseFloat(player.rating).toFixed(1) : null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl max-w-sm mx-auto">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-card to-secondary/50 p-4">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-4">
          {/* Photo */}
          <div className="relative">
            {player.photo ? (
              <img
                src={player.photo}
                alt={player.name}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-border shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center ring-2 ring-border">
                <span className="text-xl font-black text-muted-foreground">{player.number}</span>
              </div>
            )}
            {player.captain && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-card">
                <span className="text-[8px] font-black text-black">C</span>
              </div>
            )}
          </div>

          {/* Name & info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-muted-foreground/30 tabular-nums">{player.number}</span>
            </div>
            <h3 className="text-base font-bold text-foreground truncate -mt-0.5">{player.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {teamLogo && (
                <img src={teamLogo} alt="" className="w-3.5 h-3.5 object-contain" />
              )}
              <span className="text-xs text-muted-foreground">{teamName}</span>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-xs text-muted-foreground">{player.position}</span>
            </div>
          </div>

          {/* Rating */}
          {rating && (
            <div className={cn('px-3 py-2 rounded-xl text-center', getRatingColor(player.rating))}>
              <div className="text-xl font-black leading-none tabular-nums">{rating}</div>
              <div className="text-[8px] font-bold uppercase tracking-wider mt-0.5 opacity-70">Rating</div>
            </div>
          )}
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <QuickStat label="Goals" value={player.goals} highlight={player.goals > 0} />
          <QuickStat label="Assists" value={player.assists} highlight={player.assists > 0} />
          <QuickStat label="Mins" value={player.minutes} />
          <QuickStat
            label="Cards"
            value={
              player.yellowCards || player.redCards
                ? `${player.yellowCards > 0 ? '🟨' : ''}${player.redCards > 0 ? '🟥' : ''}`
                : '—'
            }
          />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border">
        {(['summary', 'attack', 'defense'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors relative',
              activeTab === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === 'summary' && (
          <div className="space-y-0">
            <StatItem label="Minutes played" value={player.minutes} icon={<Star className="w-4 h-4" />} />
            <StatItem label="Goals" value={player.goals} icon={<Crosshair className="w-4 h-4" />} />
            <StatItem label="Assists" value={player.assists} icon={<Footprints className="w-4 h-4" />} />
            <StatItem label="Yellow cards" value={player.yellowCards} />
            <StatItem label="Red cards" value={player.redCards} />
            {player.saves !== null && player.saves > 0 && (
              <StatItem label="Saves" value={player.saves} icon={<HandMetal className="w-4 h-4" />} />
            )}
          </div>
        )}

        {activeTab === 'attack' && (
          <div className="space-y-3">
            {player.shots !== null && (
              <StatBar label="Shots" value={player.shots} max={10} color="bg-primary" />
            )}
            {player.shotsOn !== null && (
              <StatBar label="Shots on target" value={player.shotsOn} max={player.shots || 5} color="bg-emerald-500" />
            )}
            {player.passes !== null && (
              <StatBar label="Passes" value={player.passes} max={100} color="bg-blue-500" />
            )}
            {player.passAccuracy !== null && (
              <StatBar label="Pass accuracy (%)" value={parseInt(player.passAccuracy) || 0} max={100} color="bg-blue-400" />
            )}
            {player.dribbles !== null && (
              <StatBar label="Dribbles attempted" value={player.dribbles} max={10} color="bg-amber-500" />
            )}
            {player.dribblesSuccess !== null && (
              <StatBar label="Dribbles won" value={player.dribblesSuccess} max={player.dribbles || 5} color="bg-amber-400" />
            )}
          </div>
        )}

        {activeTab === 'defense' && (
          <div className="space-y-3">
            {player.tackles !== null && (
              <StatBar label="Tackles" value={player.tackles} max={10} color="bg-orange-500" />
            )}
            {player.duels !== null && (
              <StatBar label="Duels" value={player.duels} max={20} color="bg-purple-500" />
            )}
            {player.duelsWon !== null && (
              <StatBar label="Duels won" value={player.duelsWon} max={player.duels || 10} color="bg-purple-400" />
            )}
            {player.saves !== null && (
              <StatBar label="Saves" value={player.saves} max={10} color="bg-primary" />
            )}
            {(player.tackles === null && player.duels === null && player.saves === null) && (
              <p className="text-sm text-muted-foreground text-center py-4">No defensive stats available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickStat({ label, value, highlight = false }: { label: string; value: string | number | null; highlight?: boolean }) {
  return (
    <div className={cn(
      'rounded-lg px-2 py-2 text-center',
      highlight ? 'bg-primary/10' : 'bg-secondary/50'
    )}>
      <div className={cn(
        'text-base font-black tabular-nums leading-none',
        highlight ? 'text-primary' : 'text-foreground'
      )}>
        {value ?? '—'}
      </div>
      <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}
