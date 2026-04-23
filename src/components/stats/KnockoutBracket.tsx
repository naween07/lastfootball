import { useState, useEffect, useRef } from 'react';
import { fetchLeagueFixtures, fetchLeagueRounds } from '@/services/footballApi';
import { Match } from '@/types/football';
import { Loader2, Trophy } from 'lucide-react';
import OptimizedImage from '../OptimizedImage';
import { cn } from '@/lib/utils';

interface KnockoutBracketProps { leagueId: number; season: number; }

interface TieData {
  id: string;
  team1: { id: number; name: string; shortName: string; logo?: string };
  team2: { id: number; name: string; shortName: string; logo?: string };
  leg1Score: [number | null, number | null];
  leg2Score: [number | null, number | null] | null;
  agg: [number, number] | null;
  winnerId: number | null;
  decided: boolean;
  dateLabel: string;
}

interface RoundData { label: string; order: number; ties: TieData[]; }

const KW = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final', '8th Finals', 'Play-offs', 'Knockout'];

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
      l2 = s.homeTeam.id === t1.id
        ? [s.homeScore, s.awayScore]
        : [s.awayScore, s.homeScore]; // swap for team1 perspective
    }

    let agg: [number, number] | null = null;
    let wid: number | null = null;

    if (done && l2) {
      const a1 = (l1[0] ?? 0) + (l2[0] ?? 0);
      const a2 = (l1[1] ?? 0) + (l2[1] ?? 0);
      agg = [a1, a2];
      if (a1 > a2) wid = t1.id;
      else if (a2 > a1) wid = t2.id;
      else {
        const last = legs[legs.length - 1];
        if (last.status === 'PEN') wid = last.homeScore! > last.awayScore! ? last.homeTeam.id : last.awayTeam.id;
      }
    } else if (done && legs.length === 1) {
      if ((f.homeScore ?? 0) > (f.awayScore ?? 0)) wid = t1.id;
      else if ((f.awayScore ?? 0) > (f.homeScore ?? 0)) wid = t2.id;
    }

    const dates = legs.map(l => fmtD(l.date)).filter(Boolean);
    return {
      id: [t1.id, t2.id].sort().join('-'),
      team1: t1, team2: t2,
      leg1Score: l1, leg2Score: l2,
      agg, winnerId: wid, decided: done,
      dateLabel: dates.join(' / '),
    };
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────
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

  // Final at top, earlier rounds at bottom
  const rev = [...rounds].reverse();

  return (
    <div className="py-4 overflow-x-auto">
      <h3 className="text-sm font-bold text-foreground mb-5 px-4">Final Stages</h3>
      <div className="flex flex-col items-center min-w-fit px-2">
        {rev.map((round, ri) => (
          <RoundRow key={round.label} round={round} roundIndex={ri} totalRounds={rev.length} />
        ))}
      </div>
    </div>
  );
}

// ─── Round Row ──────────────────────────────────────────────────────────────
const CARD_W = 152;
const CARD_GAP = 10;

function RoundRow({ round, roundIndex, totalRounds }: { round: RoundData; roundIndex: number; totalRounds: number }) {
  const isFinal = round.label === 'Final';
  const isLast = roundIndex === totalRounds - 1;
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Match cards */}
      <div
        ref={containerRef}
        className="flex flex-wrap justify-center"
        style={{ gap: `${CARD_GAP}px` }}
      >
        {round.ties.map(tie => (
          isFinal
            ? <FinalCard key={tie.id} tie={tie} />
            : <MatchCard key={tie.id} tie={tie} />
        ))}
      </div>

      {/* SVG connector lines to next round */}
      {!isLast && round.ties.length >= 2 && (
        <Connectors count={round.ties.length} />
      )}

      {/* Round label */}
      <div className="py-2.5">
        <span className={cn(
          'text-[10px] font-bold uppercase tracking-widest',
          isFinal ? 'text-primary' : 'text-muted-foreground/60'
        )}>
          {round.label}
        </span>
      </div>
    </div>
  );
}

// ─── Match Card ─────────────────────────────────────────────────────────────
function MatchCard({ tie }: { tie: TieData }) {
  const w1 = tie.winnerId === tie.team1.id;
  const w2 = tie.winnerId === tie.team2.id;
  const has2 = !!tie.leg2Score;

  return (
    <div className="bg-card border border-border/50 rounded-lg overflow-hidden" style={{ width: CARD_W }}>
      <Row
        team={tie.team1} s1={tie.leg1Score[0]} s2={has2 ? tie.leg2Score![0] : null}
        agg={tie.agg?.[0] ?? null} won={w1} decided={tie.decided} has2={has2}
      />
      <div className="h-px bg-border/20" />
      <Row
        team={tie.team2} s1={tie.leg1Score[1]} s2={has2 ? tie.leg2Score![1] : null}
        agg={tie.agg?.[1] ?? null} won={w2} decided={tie.decided} has2={has2}
      />
      {!tie.decided && (
        <div className="text-center py-[3px] bg-secondary/20 border-t border-border/20">
          <span className="text-[8px] text-muted-foreground">{tie.dateLabel}</span>
        </div>
      )}
    </div>
  );
}

function Row({ team, s1, s2, agg, won, decided, has2 }: {
  team: TieData['team1']; s1: number | null; s2: number | null;
  agg: number | null; won: boolean; decided: boolean; has2: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-1 px-2 py-[5px]', won && decided && 'bg-primary/5')}>
      <Lg src={team.logo} sz={14} />
      <span className={cn(
        'text-[10px] flex-1 truncate',
        won && decided ? 'font-bold text-foreground' : 'text-muted-foreground'
      )}>{team.shortName}</span>
      {decided ? (
        <div className="flex items-center tabular-nums gap-0">
          <span className={cn('text-[10px] font-semibold w-[14px] text-center', won ? 'text-foreground' : 'text-muted-foreground/70')}>{s1}</span>
          {has2 && <span className={cn('text-[10px] font-semibold w-[14px] text-center', won ? 'text-foreground' : 'text-muted-foreground/70')}>{s2}</span>}
          {agg !== null && (
            <span className={cn(
              'text-[10px] font-black w-[18px] text-center ml-0.5 rounded-sm py-px',
              won ? 'text-primary bg-primary/10' : 'text-muted-foreground/60'
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
    <div className="bg-card border-2 border-primary/20 rounded-xl px-4 py-3 relative">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <Trophy className="w-5 h-5 text-amber-400" />
      </div>
      <div className="flex items-center justify-center gap-4 mt-1">
        <div className="flex flex-col items-center gap-1">
          <Lg src={tie.team1.logo} sz={28} />
          <span className={cn('text-[11px] font-bold', w1 ? 'text-foreground' : 'text-muted-foreground')}>{tie.team1.shortName}</span>
        </div>
        <div className="text-center min-w-[50px]">
          {tie.decided ? (
            <>
              <p className="text-xl font-black text-foreground tabular-nums">
                {tie.leg1Score[0]} – {tie.leg1Score[1]}
              </p>
              {tie.agg && (
                <p className="text-[9px] text-muted-foreground">Agg {tie.agg[0]}-{tie.agg[1]}</p>
              )}
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground font-medium">{tie.dateLabel || 'TBD'}</p>
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <Lg src={tie.team2.logo} sz={28} />
          <span className={cn('text-[11px] font-bold', w2 ? 'text-foreground' : 'text-muted-foreground')}>{tie.team2.shortName}</span>
        </div>
      </div>
    </div>
  );
}

// ─── SVG Connectors ─────────────────────────────────────────────────────────
function Connectors({ count }: { count: number }) {
  const pairs = Math.ceil(count / 2);
  const step = CARD_W + CARD_GAP;
  const totalW = count * CARD_W + (count - 1) * CARD_GAP;
  const h = 24;

  return (
    <svg width={totalW} height={h} viewBox={`0 0 ${totalW} ${h}`} className="block" style={{ maxWidth: '100%' }}>
      {Array.from({ length: pairs }).map((_, i) => {
        const li = i * 2;
        const ri = i * 2 + 1;
        if (ri >= count) return null;

        const lx = li * step + CARD_W / 2;
        const rx = ri * step + CARD_W / 2;
        const mx = (lx + rx) / 2;
        const midY = h * 0.45;

        return (
          <g key={i}>
            <line x1={lx} y1={0} x2={lx} y2={midY} className="stroke-border" strokeWidth={1} />
            <line x1={rx} y1={0} x2={rx} y2={midY} className="stroke-border" strokeWidth={1} />
            <line x1={lx} y1={midY} x2={rx} y2={midY} className="stroke-border" strokeWidth={1} />
            <line x1={mx} y1={midY} x2={mx} y2={h} className="stroke-border" strokeWidth={1} />
          </g>
        );
      })}
    </svg>
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
