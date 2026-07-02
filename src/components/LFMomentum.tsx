import { useMemo } from 'react';
import { Match } from '@/types/football';
import { cn } from '@/lib/utils';

// ─── LF Momentum ──────────────────────────────────────────────────────────────
// The signature match metric. Two modes:
//  1. Time series ("LF MOMENTUM"): bars around a centre line showing which side
//     dominated as the match progressed. Series is sampled server-side every ~3
//     minutes from live stats (xG, shots, possession, corners) — it exists for
//     matches that were viewed while live.
//  2. Fallback ("LF DOMINANCE"): a single tug-of-war split computed from the
//     match's stats totals, for matches with no recorded series.

export interface MomentumSample { m: number; h: number }

const NEON = '#39ff14';
const AWAY = '#f87171';

export default function LFMomentum({ samples, match }: { samples: MomentumSample[]; match: Match }) {
  const isLive = match.status === 'LIVE' || match.status === '1H' || match.status === '2H' || match.status === 'HT';

  if (samples && samples.length >= 3) {
    return <MomentumChart samples={samples} match={match} isLive={isLive} />;
  }
  if (match.stats) {
    return <DominanceBar match={match} />;
  }
  return null;
}

// ─── Mode 1: time-series chart ────────────────────────────────────────────────
function MomentumChart({ samples, match, isLive }: { samples: MomentumSample[]; match: Match; isLive: boolean }) {
  const W = 640, H = 150, PAD = 14, CY = 78, AMP = 52; // centre line + max bar amplitude
  const maxMin = Math.max(90, samples[samples.length - 1].m + 2);
  const x = (m: number) => PAD + (m / maxMin) * (W - 2 * PAD);

  const goals = useMemo(
    () => (match.events || []).filter(e => e.type === 'goal'),
    [match.events]
  );

  // Bar width scales with sample density but stays readable.
  const barW = Math.max(3, Math.min(9, (W - 2 * PAD) / Math.max(samples.length, 30) - 2));

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <WidgetHeader label="LF Momentum" isLive={isLive} />
      <div className="px-2 pb-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label="Match momentum chart">
          {/* halves shading */}
          <rect x={PAD} y={CY - AMP} width={W - 2 * PAD} height={AMP} fill={NEON} opacity={0.03} />
          <rect x={PAD} y={CY} width={W - 2 * PAD} height={AMP} fill={AWAY} opacity={0.03} />

          {/* momentum bars */}
          {samples.map((s, i) => {
            const dev = s.h - 50; // + = home
            const hgt = Math.max(2, (Math.abs(dev) / 50) * AMP);
            const up = dev >= 0;
            return (
              <rect
                key={i}
                x={x(s.m) - barW / 2}
                y={up ? CY - hgt : CY}
                width={barW}
                height={hgt}
                rx={1.5}
                fill={up ? NEON : AWAY}
                opacity={up ? 0.85 : 0.75}
              />
            );
          })}

          {/* centre line + HT/FT ticks */}
          <line x1={PAD} y1={CY} x2={W - PAD} y2={CY} stroke="#3a3a3a" strokeWidth={1.5} />
          {[45, 90].filter(t => t <= maxMin).map(t => (
            <g key={t}>
              <line x1={x(t)} y1={CY - AMP} x2={x(t)} y2={CY + AMP} stroke="#333" strokeDasharray="3 4" strokeWidth={1} />
              <text x={x(t)} y={H - 4} fontSize={10} textAnchor="middle" fill="#777">{t === 45 ? 'HT' : 'FT'}</text>
            </g>
          ))}
          <text x={PAD} y={H - 4} fontSize={10} fill="#777">0'</text>

          {/* goal markers */}
          {goals.map((g, i) => {
            const gy = g.team === 'home' ? CY - AMP - 2 : CY + AMP + 2;
            return (
              <g key={'g' + i}>
                <line x1={x(g.minute)} y1={g.team === 'home' ? gy + 4 : CY} x2={x(g.minute)} y2={g.team === 'home' ? CY : gy - 4} stroke={g.team === 'home' ? NEON : AWAY} strokeWidth={1} opacity={0.35} />
                <circle cx={x(g.minute)} cy={gy} r={7} fill="#141414" stroke={g.team === 'home' ? NEON : AWAY} strokeWidth={1.5} />
                <text x={x(g.minute)} y={gy + 3.5} fontSize={9} textAnchor="middle">⚽</text>
              </g>
            );
          })}
        </svg>
      </div>
      <TeamLegend match={match} />
    </div>
  );
}

// ─── Mode 2: dominance bar fallback ──────────────────────────────────────────
function DominanceBar({ match }: { match: Match }) {
  const s = match.stats!;
  // Same spirit as the server formula, from the stats available client-side.
  const raw = (i: 0 | 1) =>
    3 * (s.shotsOnTarget?.[i] ?? 0) +
    1 * (s.shots?.[i] ?? 0) +
    0.06 * (s.possession?.[i] ?? 0) +
    0.6 * (s.corners?.[i] ?? 0);
  const h = raw(0), a = raw(1);
  const total = h + a;
  if (total <= 0) return null;
  const hp = Math.round((100 * h) / total);
  const ap = 100 - hp;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <WidgetHeader label="LF Dominance" isLive={false} />
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-xs font-bold mb-1.5">
          <span style={{ color: NEON }}>{match.homeTeam.shortName} {hp}%</span>
          <span style={{ color: AWAY }}>{ap}% {match.awayTeam.shortName}</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden flex bg-secondary/40">
          <div className="h-full transition-all" style={{ width: `${hp}%`, background: NEON, opacity: 0.9 }} />
          <div className="h-full transition-all" style={{ width: `${ap}%`, background: AWAY, opacity: 0.8 }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Weighted attacking output — shots on target, total shots, possession & corners.
        </p>
      </div>
    </div>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────────
function WidgetHeader({ label, isLive }: { label: string; isLive: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{ color: NEON, background: 'rgba(57,255,20,0.08)' }}
        >
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide hidden sm:inline">
          Only on LastFootball
        </span>
      </div>
      {isLive && (
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Live
        </span>
      )}
    </div>
  );
}

function TeamLegend({ match }: { match: Match }) {
  return (
    <div className="flex items-center justify-between px-4 pb-3 text-xs">
      <span className="flex items-center gap-1.5 font-semibold" style={{ color: NEON }}>
        <span className="w-2 h-2 rounded-sm inline-block" style={{ background: NEON }} />
        {match.homeTeam.shortName}
      </span>
      <span className="flex items-center gap-1.5 font-semibold" style={{ color: AWAY }}>
        {match.awayTeam.shortName}
        <span className="w-2 h-2 rounded-sm inline-block" style={{ background: AWAY }} />
      </span>
    </div>
  );
}
