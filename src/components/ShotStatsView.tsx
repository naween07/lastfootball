import { useMemo } from 'react';
import { MatchPlayerData, MatchPlayerStats } from '@/types/football';
import OptimizedImage from './OptimizedImage';
import { cn } from '@/lib/utils';

interface ShotStatsViewProps {
  playerData: MatchPlayerData[];
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
}

interface ShotPlayer {
  name: string;
  photo: string;
  shots: number;
  shotsOn: number;
  goals: number;
  position: string;
}

export default function ShotStatsView({
  playerData,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  homeTeamLogo,
  awayTeamLogo,
}: ShotStatsViewProps) {
  const { homePlayers, awayPlayers, homeTotal, awayTotal } = useMemo(() => {
    const extract = (teamId: number): ShotPlayer[] => {
      const team = playerData.find(t => t.teamId === teamId);
      if (!team) return [];
      return team.players
        .filter(p => (p.shots || 0) > 0)
        .map(p => ({
          name: p.name,
          photo: p.photo,
          shots: p.shots || 0,
          shotsOn: p.shotsOn || 0,
          goals: p.goals || 0,
          position: p.position,
        }))
        .sort((a, b) => b.shots - a.shots);
    };

    const hp = extract(homeTeamId);
    const ap = extract(awayTeamId);
    const ht = hp.reduce((s, p) => ({ shots: s.shots + p.shots, onTarget: s.onTarget + p.shotsOn, goals: s.goals + p.goals }), { shots: 0, onTarget: 0, goals: 0 });
    const at = ap.reduce((s, p) => ({ shots: s.shots + p.shots, onTarget: s.onTarget + p.shotsOn, goals: s.goals + p.goals }), { shots: 0, onTarget: 0, goals: 0 });

    return { homePlayers: hp, awayPlayers: ap, homeTotal: ht, awayTotal: at };
  }, [playerData, homeTeamId, awayTeamId]);

  if (homePlayers.length === 0 && awayPlayers.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No shot data available</p>;
  }

  const maxShots = Math.max(homeTotal.shots, awayTotal.shots, 1);

  return (
    <div className="space-y-5">
      {/* Shot summary comparison */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-2">
        <TeamShotSummary
          name={homeTeamName}
          logo={homeTeamLogo}
          total={homeTotal}
          maxShots={maxShots}
          align="right"
        />
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Shots</div>
        </div>
        <TeamShotSummary
          name={awayTeamName}
          logo={awayTeamLogo}
          total={awayTotal}
          maxShots={maxShots}
          align="left"
        />
      </div>

      {/* Shot distribution bars */}
      <div className="space-y-2 px-2">
        <ComparisonBar
          label="Total shots"
          homeVal={homeTotal.shots}
          awayVal={awayTotal.shots}
        />
        <ComparisonBar
          label="On target"
          homeVal={homeTotal.onTarget}
          awayVal={awayTotal.onTarget}
          color="emerald"
        />
        <ComparisonBar
          label="Goals"
          homeVal={homeTotal.goals}
          awayVal={awayTotal.goals}
          color="primary"
        />
        <ComparisonBar
          label="Off target"
          homeVal={homeTotal.shots - homeTotal.onTarget}
          awayVal={awayTotal.shots - awayTotal.onTarget}
          color="red"
        />
      </div>

      {/* SVG pitch with shot zones */}
      <ShotZonePitch
        homeOnTarget={homeTotal.onTarget}
        homeOffTarget={homeTotal.shots - homeTotal.onTarget}
        homeGoals={homeTotal.goals}
        awayOnTarget={awayTotal.onTarget}
        awayOffTarget={awayTotal.shots - awayTotal.onTarget}
        awayGoals={awayTotal.goals}
      />

      {/* Top shooters by team */}
      <div className="grid grid-cols-2 gap-3 px-2">
        <div>
          <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">{homeTeamName}</h4>
          {homePlayers.slice(0, 5).map(p => (
            <ShooterRow key={p.name} player={p} maxShots={Math.max(...homePlayers.map(x => x.shots), 1)} />
          ))}
          {homePlayers.length === 0 && (
            <p className="text-xs text-muted-foreground/50">No shots</p>
          )}
        </div>
        <div>
          <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">{awayTeamName}</h4>
          {awayPlayers.slice(0, 5).map(p => (
            <ShooterRow key={p.name} player={p} maxShots={Math.max(...awayPlayers.map(x => x.shots), 1)} />
          ))}
          {awayPlayers.length === 0 && (
            <p className="text-xs text-muted-foreground/50">No shots</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamShotSummary({
  name, logo, total, maxShots, align,
}: {
  name: string;
  logo?: string;
  total: { shots: number; onTarget: number; goals: number };
  maxShots: number;
  align: 'left' | 'right';
}) {
  const accuracy = total.shots > 0 ? Math.round((total.onTarget / total.shots) * 100) : 0;
  return (
    <div className={cn('flex flex-col gap-1', align === 'right' ? 'items-end' : 'items-start')}>
      <div className={cn('flex items-center gap-2', align === 'right' ? 'flex-row-reverse' : '')}>
        {logo && <OptimizedImage src={logo} alt="" className="w-5 h-5 object-contain" />}
        <span className="text-xs font-bold text-foreground truncate max-w-[100px]">{name}</span>
      </div>
      <div className={cn('flex items-baseline gap-1.5', align === 'right' ? 'flex-row-reverse' : '')}>
        <span className="text-2xl font-black tabular-nums text-foreground">{total.shots}</span>
        <span className="text-xs text-muted-foreground">{accuracy}% accuracy</span>
      </div>
    </div>
  );
}

function ComparisonBar({
  label, homeVal, awayVal, color = 'blue',
}: {
  label: string;
  homeVal: number;
  awayVal: number;
  color?: 'blue' | 'emerald' | 'primary' | 'red';
}) {
  const max = Math.max(homeVal + awayVal, 1);
  const homePct = (homeVal / max) * 100;
  const awayPct = (awayVal / max) * 100;

  const colors = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    primary: 'bg-primary',
    red: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold tabular-nums text-foreground">{homeVal}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="text-xs font-bold tabular-nums text-foreground">{awayVal}</span>
      </div>
      <div className="flex gap-1 h-2">
        <div className="flex-1 bg-secondary rounded-l-full overflow-hidden flex justify-end">
          <div
            className={cn('h-full rounded-l-full transition-all duration-500', colors[color])}
            style={{ width: `${homePct}%` }}
          />
        </div>
        <div className="flex-1 bg-secondary rounded-r-full overflow-hidden">
          <div
            className={cn('h-full rounded-r-full transition-all duration-500', colors[color], 'opacity-70')}
            style={{ width: `${awayPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ShotZonePitch({
  homeOnTarget, homeOffTarget, homeGoals,
  awayOnTarget, awayOffTarget, awayGoals,
}: {
  homeOnTarget: number; homeOffTarget: number; homeGoals: number;
  awayOnTarget: number; awayOffTarget: number; awayGoals: number;
}) {
  return (
    <div className="relative w-full mx-auto" style={{ maxWidth: '380px' }}>
      <svg viewBox="0 0 340 220" className="w-full" role="img" aria-label="Shot zones visualization">
        {/* Pitch background */}
        <rect x="0" y="0" width="340" height="220" rx="8" fill="#1a5c1e" />
        <rect x="0" y="0" width="340" height="220" rx="8" fill="url(#grassPattern)" opacity="0.06" />

        {/* Pitch markings */}
        <rect x="10" y="10" width="320" height="200" rx="2" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <line x1="170" y1="10" x2="170" y2="210" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <circle cx="170" cy="110" r="30" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <circle cx="170" cy="110" r="2" fill="rgba(255,255,255,0.3)" />

        {/* Home penalty area (left) */}
        <rect x="10" y="55" width="55" height="110" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <rect x="10" y="80" width="25" height="60" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />

        {/* Away penalty area (right) */}
        <rect x="275" y="55" width="55" height="110" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <rect x="305" y="80" width="25" height="60" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />

        {/* Home shot indicators — shooting left to right */}
        {/* Goals */}
        {Array.from({ length: Math.min(homeGoals, 6) }).map((_, i) => (
          <circle
            key={`hg${i}`}
            cx={240 + Math.random() * 40}
            cy={85 + (i * 20) + Math.random() * 10}
            r={6}
            fill="#4ade80"
            opacity={0.9}
            stroke="#fff"
            strokeWidth={1}
          />
        ))}
        {/* On target (not goals) */}
        {Array.from({ length: Math.min(homeOnTarget - homeGoals, 8) }).map((_, i) => (
          <circle
            key={`ho${i}`}
            cx={220 + Math.random() * 60}
            cy={60 + (i * 16) + Math.random() * 10}
            r={5}
            fill="#3b82f6"
            opacity={0.7}
          />
        ))}
        {/* Off target */}
        {Array.from({ length: Math.min(homeOffTarget, 8) }).map((_, i) => (
          <circle
            key={`hx${i}`}
            cx={180 + Math.random() * 80}
            cy={40 + (i * 18) + Math.random() * 15}
            r={4}
            fill="#ef4444"
            opacity={0.5}
          />
        ))}

        {/* Away shot indicators — shooting right to left */}
        {Array.from({ length: Math.min(awayGoals, 6) }).map((_, i) => (
          <circle
            key={`ag${i}`}
            cx={60 + Math.random() * 40}
            cy={85 + (i * 20) + Math.random() * 10}
            r={6}
            fill="#4ade80"
            opacity={0.9}
            stroke="#fff"
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: Math.min(awayOnTarget - awayGoals, 8) }).map((_, i) => (
          <circle
            key={`ao${i}`}
            cx={40 + Math.random() * 60}
            cy={60 + (i * 16) + Math.random() * 10}
            r={5}
            fill="#3b82f6"
            opacity={0.7}
          />
        ))}
        {Array.from({ length: Math.min(awayOffTarget, 8) }).map((_, i) => (
          <circle
            key={`ax${i}`}
            cx={60 + Math.random() * 80}
            cy={40 + (i * 18) + Math.random() * 15}
            r={4}
            fill="#ef4444"
            opacity={0.5}
          />
        ))}

        {/* Legend */}
        <circle cx="30" cy="208" r="4" fill="#4ade80" stroke="#fff" strokeWidth={0.5} />
        <text x="38" y="211" fill="rgba(255,255,255,0.7)" fontSize="8" fontFamily="system-ui">Goal</text>
        <circle cx="80" cy="208" r="4" fill="#3b82f6" />
        <text x="88" y="211" fill="rgba(255,255,255,0.7)" fontSize="8" fontFamily="system-ui">On target</text>
        <circle cx="150" cy="208" r="3.5" fill="#ef4444" opacity="0.7" />
        <text x="158" y="211" fill="rgba(255,255,255,0.7)" fontSize="8" fontFamily="system-ui">Off target</text>
      </svg>
    </div>
  );
}

function ShooterRow({ player, maxShots }: { player: ShotPlayer; maxShots: number }) {
  const barPct = (player.shots / maxShots) * 100;
  return (
    <div className="flex items-center gap-2 py-1.5">
      <img
        src={player.photo}
        alt=""
        className="w-6 h-6 rounded-full object-cover bg-secondary flex-shrink-0"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-foreground truncate">{player.name.split(' ').pop()}</span>
          <div className="flex items-center gap-1">
            {player.goals > 0 && (
              <span className="text-[9px] font-bold text-primary bg-primary/10 px-1 rounded">
                {player.goals}G
              </span>
            )}
            <span className="text-[11px] font-bold tabular-nums text-muted-foreground">{player.shots}</span>
          </div>
        </div>
        <div className="h-1 rounded-full bg-secondary mt-0.5">
          <div className="h-full rounded-full bg-blue-500/60 transition-all" style={{ width: `${barPct}%` }} />
        </div>
      </div>
    </div>
  );
}
