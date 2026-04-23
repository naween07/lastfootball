import { useState, useEffect } from 'react';
import { fetchLeagueFixtures, fetchLeagueRounds } from '@/services/footballApi';
import { Match } from '@/types/football';
import { Loader2, Trophy } from 'lucide-react';
import OptimizedImage from '../OptimizedImage';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────
interface KnockoutBracketProps { leagueId: number; season: number; }

interface TieData {
  id: string;
  team1: { id: number; name: string; shortName: string; logo?: string };
  team2: { id: number; name: string; shortName: string; logo?: string };
  leg1: [number | null, number | null];
  leg2: [number | null, number | null] | null;
  agg: [number, number] | null;
  winnerId: number | null;
  decided: boolean;
  dateLabel: string;
}

interface RoundData { label: string; order: number; ties: TieData[]; }

// ─── Helpers ────────────────────────────────────────────────────────────────
const KW = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final', '8th Finals', 'Play-offs'];
function isKO(r: string) { return KW.some(k => r.toLowerCase().includes(k.toLowerCase())); }
function getOrder(r: string): number {
  const l = r.toLowerCase();
  if (l.includes('play-off')) return 0;
  if (l.includes('round of 32')) return 1;
  if (l.includes('round of 16') || l.includes('8th')) return 2;
  if (l.includes('quarter')) return 3;
  if (l.includes('semi')) return 4;
  if (l.includes('final') && !l.includes('semi') && !l.includes('quarter')) return 5;
  return -1;
}
function getLabel(r: string): string {
  const l = r.toLowerCase();
  if (l.includes('final') && !l.includes('semi') && !l.includes('quarter')) return 'Final';
  if (l.includes('semi')) return 'Semi-finals';
  if (l.includes('quarter')) return 'Quarter-finals';
  if (l.includes('round of 16') || l.includes('8th')) return 'Round of 16';
  if (l.includes('round of 32')) return 'Round of 32';
  if (l.includes('play-off')) return 'Play-offs';
  return r;
}
function fmtD(d: string) { const p = d.split('-'); return p.length >= 3 ? `${p[1]}/${p[2]}` : d; }

function buildTies(matches: Match[]): TieData[] {
  const map = new Map<string, Match[]>();
  matches.forEach(m => {
    const k = [m.homeTeam.id, m.awayTeam.id].sort((a, b) => a - b).join('-');
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(m);
  });
  return Array.from(map.values()).map(legs => {
    legs.sort((a, b) => a.date.localeCompare(b.date));
    const f = legs[0];
    const done = legs.every(l => ['FT', 'AET', 'PEN'].includes(l.status));
    const t1 = f.homeTeam, t2 = f.awayTeam;
    const l1: [number | null, number | null] = [f.homeScore, f.awayScore];
    let l2: [number | null, number | null] | null = null;
    if (legs.length >= 2) {
      const s = legs[1];
      l2 = s.homeTeam.id === t1.id ? [s.homeScore, s.awayScore] : [s.awayScore, s.homeScore];
    }
    let agg: [number, number] | null = null;
    let wid: number | null = null;
    if (done && l2) {
      const a1 = (l1[0] ?? 0) + (l2[0] ?? 0), a2 = (l1[1] ?? 0) + (l2[1] ?? 0);
      agg = [a1, a2];
      if (a1 > a2) wid = t1.id; else if (a2 > a1) wid = t2.id;
      else { const last = legs[legs.length - 1]; if (last.status === 'PEN') wid = last.homeScore! > last.awayScore! ? last.homeTeam.id : last.awayTeam.id; }
    } else if (done && legs.length === 1) {
      if ((f.homeScore ?? 0) > (f.awayScore ?? 0)) wid = t1.id; else if ((f.awayScore ?? 0) > (f.homeScore ?? 0)) wid = t2.id;
    }
    return { id: [t1.id, t2.id].sort().join('-'), team1: t1, team2: t2, leg1: l1, leg2: l2, agg, winnerId: wid, decided: done, dateLabel: legs.map(l => fmtD(l.date)).filter(Boolean).join(' · ') };
  });
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function KnockoutBracket({ leagueId, season }: KnockoutBracketProps) {
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLeagueRounds(leagueId, season).then(async all => {
      const ko = all.filter(isKO);
      if (!ko.length) { setRounds([]); return; }
      const lm = new Map<string, string[]>();
      ko.forEach(r => { const l = getLabel(r); if (!lm.has(l)) lm.set(l, []); lm.get(l)!.push(r); });
      const rd: RoundData[] = [];
      for (const [label, rns] of lm) {
        let ms: Match[] = [];
        for (const rn of rns) ms = ms.concat(await fetchLeagueFixtures(leagueId, season, rn));
        rd.push({ label, ties: buildTies(ms), order: getOrder(rns[0]) });
      }
      rd.sort((a, b) => a.order - b.order);
      setRounds(rd);
    }).catch(console.error).finally(() => setLoading(false));
  }, [leagueId, season]);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      <span className="ml-2 text-sm text-muted-foreground">Loading bracket...</span>
    </div>
  );
  if (!rounds.length) return <div className="text-center py-12 text-muted-foreground text-sm">No knockout rounds available.</div>;

  const finalRound = rounds.find(r => r.label === 'Final');
  const nonFinal = rounds.filter(r => r.label !== 'Final').sort((a, b) => b.order - a.order);

  // Split each round's ties into left half and right half
  const leftCols: RoundData[] = nonFinal.map(r => ({ ...r, ties: r.ties.slice(0, Math.ceil(r.ties.length / 2)) }));
  const rightCols: RoundData[] = nonFinal.map(r => ({ ...r, ties: r.ties.slice(Math.ceil(r.ties.length / 2)) }));

  return (
    <div className="py-4 overflow-x-auto">
      <h3 className="text-sm font-bold text-foreground mb-4 px-4 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        Final Stages
      </h3>

      {/* Horizontal bracket layout */}
      <div className="flex items-center justify-center gap-0 min-w-fit px-3" style={{ minHeight: Math.max(300, (leftCols[0]?.ties.length || 4) * 80) }}>
        {/* LEFT HALF — earliest round on far left, semi on inner */}
        {leftCols.slice().reverse().map((col, ci) => (
          <BracketCol key={col.label + 'L'} round={col} side="left" showConnectors={ci < leftCols.length - 1} />
        ))}

        {/* FINAL — center */}
        <div className="flex flex-col items-center justify-center mx-1 sm:mx-3 flex-shrink-0">
          <div className="text-[9px] font-bold text-primary uppercase tracking-widest mb-2">Final</div>
          {finalRound && finalRound.ties.length > 0 ? (
            <FinalCard tie={finalRound.ties[0]} />
          ) : (
            <TBDFinal />
          )}
        </div>

        {/* RIGHT HALF — semi on inner, earliest on far right */}
        {rightCols.map((col, ci) => (
          <BracketCol key={col.label + 'R'} round={col} side="right" showConnectors={ci > 0} />
        ))}
      </div>

      {/* Round labels at bottom */}
      <div className="flex items-center justify-center gap-0 mt-4 min-w-fit px-3">
        {leftCols.slice().reverse().map(col => (
          <div key={col.label + 'Ll'} className="text-center flex-shrink-0" style={{ width: 140 }}>
            <span className="text-[8px] text-muted-foreground/50 uppercase tracking-widest font-bold">{col.label}</span>
          </div>
        ))}
        <div className="text-center flex-shrink-0 mx-1 sm:mx-3" style={{ width: 120 }}>
          <span className="text-[8px] text-primary/70 uppercase tracking-widest font-bold">Final</span>
        </div>
        {rightCols.map(col => (
          <div key={col.label + 'Rl'} className="text-center flex-shrink-0" style={{ width: 140 }}>
            <span className="text-[8px] text-muted-foreground/50 uppercase tracking-widest font-bold">{col.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bracket Column ─────────────────────────────────────────────────────────
function BracketCol({ round, side, showConnectors }: { round: RoundData; side: 'left' | 'right'; showConnectors: boolean }) {
  const connSide = side === 'left' ? 'right' : 'left';

  return (
    <div className="flex items-center flex-shrink-0">
      {/* Connector lines on the inner side (toward final) */}
      {side === 'right' && showConnectors && <ColConnectors count={round.ties.length} side="right" />}

      {/* Match cards stacked vertically */}
      <div className="flex flex-col justify-around" style={{ gap: `${Math.max(8, round.ties.length <= 2 ? 24 : 8)}px`, minHeight: round.ties.length * 72 }}>
        {round.ties.map(tie => (
          <MiniCard key={tie.id} tie={tie} />
        ))}
      </div>

      {/* Connector lines on the inner side (toward final) */}
      {side === 'left' && showConnectors && <ColConnectors count={round.ties.length} side="left" />}
    </div>
  );
}

// ─── Column Connectors (horizontal bracket lines) ───────────────────────────
function ColConnectors({ count, side }: { count: number; side: 'left' | 'right' }) {
  const pairs = Math.ceil(count / 2);
  const pairH = 72;
  const totalH = count * pairH;

  return (
    <svg
      width={20}
      height={totalH}
      viewBox={`0 0 20 ${totalH}`}
      className="flex-shrink-0 block"
    >
      {Array.from({ length: pairs }).map((_, i) => {
        const topY = i * 2 * pairH + pairH / 2;
        const botY = (i * 2 + 1) * pairH + pairH / 2;
        const midY = (topY + botY) / 2;

        if (side === 'left') {
          // Lines go right: from cards → toward final
          return (
            <g key={i}>
              <line x1={0} y1={topY} x2={10} y2={topY} className="stroke-border" strokeWidth={1} />
              <line x1={0} y1={botY} x2={10} y2={botY} className="stroke-border" strokeWidth={1} />
              <line x1={10} y1={topY} x2={10} y2={botY} className="stroke-border" strokeWidth={1} />
              <line x1={10} y1={midY} x2={20} y2={midY} className="stroke-border" strokeWidth={1} />
            </g>
          );
        } else {
          // Lines go left: from cards → toward final
          return (
            <g key={i}>
              <line x1={20} y1={topY} x2={10} y2={topY} className="stroke-border" strokeWidth={1} />
              <line x1={20} y1={botY} x2={10} y2={botY} className="stroke-border" strokeWidth={1} />
              <line x1={10} y1={topY} x2={10} y2={botY} className="stroke-border" strokeWidth={1} />
              <line x1={10} y1={midY} x2={0} y2={midY} className="stroke-border" strokeWidth={1} />
            </g>
          );
        }
      })}
    </svg>
  );
}

// ─── Mini Match Card ────────────────────────────────────────────────────────
function MiniCard({ tie }: { tie: TieData }) {
  const w1 = tie.winnerId === tie.team1.id;
  const w2 = tie.winnerId === tie.team2.id;

  return (
    <div className="bg-card border border-border/40 rounded-md overflow-hidden flex-shrink-0" style={{ width: 130 }}>
      <TeamRow
        team={tie.team1} s1={tie.leg1[0]} s2={tie.leg2?.[0] ?? null}
        agg={tie.agg?.[0] ?? null} won={w1} decided={tie.decided} has2={!!tie.leg2}
      />
      <div className="h-px bg-border/20" />
      <TeamRow
        team={tie.team2} s1={tie.leg1[1]} s2={tie.leg2?.[1] ?? null}
        agg={tie.agg?.[1] ?? null} won={w2} decided={tie.decided} has2={!!tie.leg2}
      />
      {!tie.decided && (
        <div className="text-center py-[2px] bg-secondary/20 border-t border-border/10">
          <span className="text-[7px] text-muted-foreground">{tie.dateLabel}</span>
        </div>
      )}
    </div>
  );
}

function TeamRow({ team, s1, s2, agg, won, decided, has2 }: {
  team: TieData['team1']; s1: number | null; s2: number | null;
  agg: number | null; won: boolean; decided: boolean; has2: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center gap-1 px-1.5 py-[4px] transition-colors',
      won && decided ? 'bg-primary/5' : '',
      !won && decided ? 'opacity-50' : '',
    )}>
      <Lg src={team.logo} sz={13} />
      <span className={cn(
        'text-[9px] flex-1 truncate leading-tight',
        won && decided ? 'font-bold text-foreground' : 'text-muted-foreground',
      )}>{team.shortName}</span>
      {decided ? (
        <div className="flex items-center tabular-nums gap-0">
          <span className={cn('text-[9px] font-semibold w-[12px] text-center', won ? 'text-foreground' : 'text-muted-foreground/60')}>{s1}</span>
          {has2 && <span className={cn('text-[9px] font-semibold w-[12px] text-center', won ? 'text-foreground' : 'text-muted-foreground/60')}>{s2}</span>}
          {agg !== null && (
            <span className={cn(
              'text-[9px] font-black w-[16px] text-center ml-0.5 rounded-sm',
              won ? 'text-primary bg-primary/10' : 'text-muted-foreground/40',
            )}>{agg}</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ─── Final Card ─────────────────────────────────────────────────────────────
function FinalCard({ tie }: { tie: TieData }) {
  const w1 = tie.winnerId === tie.team1.id;
  const w2 = tie.winnerId === tie.team2.id;

  return (
    <div className="relative bg-gradient-to-b from-card to-card/80 border-2 border-amber-500/30 rounded-xl px-3 py-3 flex-shrink-0" style={{ width: 120 }}>
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-xl bg-amber-500/5 pointer-events-none" />

      <div className="flex flex-col items-center gap-2 relative">
        {/* Team 1 */}
        <div className={cn('flex items-center gap-2 w-full', !w1 && tie.decided && 'opacity-40')}>
          <Lg src={tie.team1.logo} sz={22} />
          <span className={cn('text-[10px] flex-1 truncate', w1 ? 'font-bold text-foreground' : 'text-muted-foreground')}>{tie.team1.shortName}</span>
          {tie.decided && <span className={cn('text-sm font-black tabular-nums', w1 ? 'text-foreground' : 'text-muted-foreground')}>{tie.leg1[0]}</span>}
        </div>

        {/* VS / Score divider */}
        {!tie.decided ? (
          <div className="text-center w-full">
            <div className="h-px bg-border/30 mb-1" />
            <span className="text-[8px] text-muted-foreground">{tie.dateLabel || 'TBD'}</span>
            <div className="h-px bg-border/30 mt-1" />
          </div>
        ) : (
          <div className="h-px bg-amber-500/20 w-full" />
        )}

        {/* Team 2 */}
        <div className={cn('flex items-center gap-2 w-full', !w2 && tie.decided && 'opacity-40')}>
          <Lg src={tie.team2.logo} sz={22} />
          <span className={cn('text-[10px] flex-1 truncate', w2 ? 'font-bold text-foreground' : 'text-muted-foreground')}>{tie.team2.shortName}</span>
          {tie.decided && <span className={cn('text-sm font-black tabular-nums', w2 ? 'text-foreground' : 'text-muted-foreground')}>{tie.leg1[1]}</span>}
        </div>

        {/* Aggregate for two-legged final */}
        {tie.agg && (
          <div className="text-[8px] text-muted-foreground text-center">Agg {tie.agg[0]}-{tie.agg[1]}</div>
        )}
      </div>
    </div>
  );
}

function TBDFinal() {
  return (
    <div className="border-2 border-dashed border-amber-500/20 rounded-xl px-4 py-4 flex flex-col items-center gap-2" style={{ width: 120 }}>
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center">
          <span className="text-[8px] text-muted-foreground">?</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-bold">VS</span>
        <div className="w-6 h-6 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center">
          <span className="text-[8px] text-muted-foreground">?</span>
        </div>
      </div>
    </div>
  );
}

// ─── Logo ───────────────────────────────────────────────────────────────────
function Lg({ src, sz = 14 }: { src?: string; sz?: number }) {
  if (!src) return (
    <div className="rounded-full bg-secondary flex items-center justify-center flex-shrink-0" style={{ width: sz, height: sz }}>
      <span style={{ fontSize: sz * 0.45 }} className="text-muted-foreground">?</span>
    </div>
  );
  return <OptimizedImage src={src} alt="" className="object-contain flex-shrink-0" style={{ width: sz, height: sz }} />;
}
