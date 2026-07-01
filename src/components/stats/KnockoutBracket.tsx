import { useState, useEffect, useRef } from 'react';
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
  decidedBy?: 'ft' | 'aet' | 'pens';
  pen1?: number | null;
  pen2?: number | null;
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
      if (a1 > a2) wid = t1.id;
      else if (a2 > a1) wid = t2.id;
      else {
        const last = legs[legs.length - 1];
        if (last.status === 'PEN') wid = last.homeScore! > last.awayScore! ? last.homeTeam.id : last.awayTeam.id;
      }
    } else if (done && legs.length === 1) {
      // Single-leg knockout (World Cup): trust the API winner flag, then the penalty
      // shootout, then regulation/ET goals. This is what makes a 1-1 settled on
      // penalties resolve to a real winner instead of looking like a draw.
      if (f.homeWinner) wid = t1.id;
      else if (f.awayWinner) wid = t2.id;
      else if (f.penaltyHome != null && f.penaltyAway != null && f.penaltyHome !== f.penaltyAway)
        wid = f.penaltyHome > f.penaltyAway ? t1.id : t2.id;
      else if ((f.homeScore ?? 0) > (f.awayScore ?? 0)) wid = t1.id;
      else if ((f.awayScore ?? 0) > (f.homeScore ?? 0)) wid = t2.id;
    }

    const decidedBy = f.status === 'PEN' ? 'pens' : f.status === 'AET' ? 'aet' : 'ft';

    return {
      id: [t1.id, t2.id].sort().join('-'),
      team1: t1, team2: t2,
      leg1: l1, leg2: l2, agg, winnerId: wid, decided: done,
      decidedBy, pen1: f.penaltyHome ?? null, pen2: f.penaltyAway ?? null,
      dateLabel: legs.map(l => fmtD(l.date)).filter(Boolean).join(' · '),
    };
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

  if (!rounds.length) return (
    <div className="text-center py-12 text-muted-foreground text-sm">No knockout rounds available.</div>
  );

  return <HorizontalBracket rounds={rounds} />;
}

// ─── Horizontal bracket ───────────────────────────────────────────────────────
// Deterministic coordinates: every tie's vertical centre is computed in JS so the
// SVG connector lines line up exactly (no DOM measuring). Rounds run left→right,
// earliest to Final; connectors are POSITIONAL (feeders 2i & 2i+1 of the previous
// round feed tie i of the next). Result/winner logic is untouched — penalties and
// extra time still resolve via the tie's winnerId / decidedBy.
const CARD_W = 284;
const CARD_H = 108;
const GAP_Y = 18;
const COL_GAP = 72;
const LABEL_H = 28;

function HorizontalBracket({ rounds }: { rounds: RoundData[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const ordered = rounds; // already ascending by round order

  // Winner's team id → tie index, per round (decided ties only).
  const winnerIdx = ordered.map(round => {
    const m = new Map<number, number>();
    round.ties.forEach((t, i) => { if (t.decided && t.winnerId != null) m.set(t.winnerId, i); });
    return m;
  });

  // Feeders by TEAM IDENTITY, not position: a tie is fed by the previous-round tie
  // whose winner is one of its teams. Handles byes (no feeder = team entered this
  // round) and non-halving formats (Champions League league phase, play-offs) that
  // a positional 2i/2i+1 assumption gets wrong. Clean brackets (World Cup) are
  // unchanged because each winner traces back to exactly its pair.
  const feeders: number[][][] = ordered.map((round, r) => {
    if (r === 0) return round.ties.map(() => []);
    const prev = winnerIdx[r - 1];
    return round.ties.map(t => {
      const fs: number[] = [];
      [t.team1.id, t.team2.id].forEach(id => {
        const fi = prev.get(id);
        if (fi != null && !fs.includes(fi)) fs.push(fi);
      });
      return fs;
    });
  });

  // Position as a real tree. Post-order from the roots (latest round): a tie's children
  // are its feeders, so we place all children first, then centre the parent on the
  // vertical span of its children. Leaves (play-off ties, or byes with no feeder) get
  // stacked in the order the tree visits them — which keeps each subtree contiguous, so
  // branches never cross and the whole thing reads as a left→right pyramid. A one-child
  // node (an R16 tie fed by a single play-off winner) sits level with its child; a
  // two-child node sits between them (the classic bracket fork).
  const centers: (number | null)[][] = ordered.map(round => round.ties.map(() => null));
  let leafSlot = 0;
  const place = (r: number, i: number): number => {
    const cached = centers[r][i];
    if (cached != null) return cached;
    const ch = feeders[r]?.[i] ?? [];
    let y: number;
    if (ch.length) {
      const ys = ch.map(c => place(r - 1, c));
      y = (Math.min(...ys) + Math.max(...ys)) / 2;
    } else {
      y = leafSlot * (CARD_H + GAP_Y) + CARD_H / 2;
      leafSlot++;
    }
    centers[r][i] = y;
    return y;
  };
  for (let r = ordered.length - 1; r >= 0; r--) ordered[r].ties.forEach((_, i) => place(r, i));

  const bodyH = Math.max(CARD_H + GAP_Y, leafSlot * (CARD_H + GAP_Y));
  const canvasW = ordered.length * (CARD_W + COL_GAP);
  const canvasH = LABEL_H + bodyH;

  // Connectors follow the same team-identity feeders.
  const conns: string[] = [];
  for (let r = 1; r < ordered.length; r++) {
    const xPrevR = (r - 1) * (CARD_W + COL_GAP) + CARD_W;
    const xCurL = r * (CARD_W + COL_GAP);
    const mx = (xPrevR + xCurL) / 2;
    ordered[r].ties.forEach((_, i) => {
      const yC = LABEL_H + (centers[r][i] ?? 0);
      feeders[r][i].forEach(f => {
        conns.push(`M ${xPrevR} ${LABEL_H + (centers[r - 1][f] ?? 0)} H ${mx} V ${yC} H ${xCurL}`);
      });
    });
  }

  const jumpTo = (r: number) => {
    setActive(r);
    scrollRef.current?.scrollTo({ left: Math.max(0, r * (CARD_W + COL_GAP) - 12), behavior: 'smooth' });
  };

  return (
    <div className="py-3">
      {/* Round tabs */}
      <div className="flex gap-2 overflow-x-auto px-2 pb-3">
        {ordered.map((round, r) => (
          <button
            key={round.label}
            onClick={() => jumpTo(r)}
            className={cn(
              'whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors',
              active === r
                ? 'border-[#39ff14] text-[#39ff14] bg-[#39ff14]/10'
                : 'border-border/60 text-muted-foreground hover:bg-secondary/40'
            )}
          >
            {round.label}
          </button>
        ))}
      </div>

      {/* Scrollable bracket canvas */}
      <div ref={scrollRef} className="overflow-x-auto px-2" style={{ scrollSnapType: 'x proximity', scrollPaddingLeft: 8 }}>
        <div className="relative" style={{ width: canvasW, height: canvasH + 8 }}>
          <svg className="absolute inset-0 pointer-events-none" width={canvasW} height={canvasH + 8}>
            {conns.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="#333" strokeWidth={1.5} />
            ))}
          </svg>

          {ordered.map((round, r) => (
            <div
              key={'lbl' + round.label}
              className="absolute text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70"
              style={{ left: r * (CARD_W + COL_GAP), top: 0, width: CARD_W, scrollSnapAlign: 'start' }}
            >
              {round.label}
            </div>
          ))}

          {ordered.map((round, r) =>
            round.ties.map((tie, i) => (
              <BracketCard
                key={tie.id + '-' + r}
                tie={tie}
                isFinal={round.label === 'Final'}
                left={r * (CARD_W + COL_GAP)}
                top={LABEL_H + (centers[r][i] ?? 0) - CARD_H / 2}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function BracketRow({ team, scoreText, won, lost }: {
  team: TieData['team1']; scoreText: string; won: boolean; lost: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 h-[34px] border-l-2 border-transparent',
      won ? 'bg-[#39ff14]/[0.06] border-l-[#39ff14]' : lost ? 'bg-red-500/[0.03]' : ''
    )}>
      <Lg src={team.logo} sz={18} />
      <span className={cn(
        'text-[13.5px] flex-1 truncate',
        won ? 'font-bold text-[#39ff14]' : lost ? 'text-red-400/80 line-through decoration-red-400/40' : 'text-foreground'
      )}>{team.name || '—'}</span>
      <span className={cn(
        'text-[14px] font-bold tabular-nums',
        won ? 'text-[#39ff14]' : lost ? 'text-red-400/50' : 'text-muted-foreground'
      )}>{scoreText}</span>
    </div>
  );
}

function BracketCard({ tie, left, top, isFinal }: { tie: TieData; left: number; top: number; isFinal: boolean }) {
  const w1 = tie.decided && tie.winnerId === tie.team1.id;
  const w2 = tie.decided && tie.winnerId === tie.team2.id;
  const has2 = !!tie.leg2;                          // two-legged tie (Champions/Europa League)
  const isPens = tie.decided && tie.decidedBy === 'pens';

  // Score per team: aggregate for two-legged ties, match score for single-leg.
  // Penalty shootouts (single-leg, e.g. the final) append the shootout score in parens.
  let s1 = '', s2 = '';
  if (tie.decided) {
    if (has2 && tie.agg) { s1 = String(tie.agg[0]); s2 = String(tie.agg[1]); }
    else {
      s1 = tie.leg1[0] != null ? String(tie.leg1[0]) : '';
      s2 = tie.leg1[1] != null ? String(tie.leg1[1]) : '';
      if (isPens && tie.pen1 != null && tie.pen2 != null) { s1 += ` (${tie.pen1})`; s2 += ` (${tie.pen2})`; }
    }
  }

  const headerText = isFinal ? 'Final' : has2 ? 'Aggregate' : !tie.decided ? 'Upcoming' : 'Result';

  // Bottom strip: per-leg breakdown for two-legged ties, otherwise how it was settled.
  let strip = '', stripNeon = false;
  if (!tie.decided) strip = tie.dateLabel || 'TBD';
  else if (isPens) { strip = `Won on penalties`; stripNeon = true; }
  else if (tie.decidedBy === 'aet') strip = 'After extra time';
  else if (has2 && tie.leg2) strip = `1st ${tie.leg1[0]}\u2013${tie.leg1[1]} · 2nd ${tie.leg2[0]}\u2013${tie.leg2[1]}`;
  else strip = 'Full time';

  return (
    <div
      className={cn('absolute rounded-xl border overflow-hidden bg-card', isFinal ? 'border-amber-500/50' : 'border-border/60')}
      style={{ left, top, width: CARD_W, height: CARD_H, scrollSnapAlign: 'start' }}
    >
      <div className={cn('flex items-center gap-1.5 px-3 h-[20px]', isFinal ? 'bg-amber-500/10' : 'bg-secondary/25')}>
        {isFinal && <Trophy className="w-3 h-3 text-amber-400 flex-shrink-0" />}
        <span className={cn('text-[10px] font-bold uppercase tracking-wider', isFinal ? 'text-amber-400' : 'text-muted-foreground/70')}>{headerText}</span>
      </div>
      <BracketRow team={tie.team1} scoreText={s1} won={w1} lost={w2} />
      <div className="h-px bg-border/15" />
      <BracketRow team={tie.team2} scoreText={s2} won={w2} lost={w1} />
      <div className={cn('flex items-center justify-center h-[18px] px-2', (isPens || stripNeon) ? 'bg-[#39ff14]/[0.05]' : 'bg-secondary/10')}>
        <span className={cn('text-[9px] font-semibold uppercase tracking-wide truncate', stripNeon ? 'text-[#39ff14]' : 'text-muted-foreground/70')}>{strip}</span>
      </div>
    </div>
  );
}

// ─── Logo ───────────────────────────────────────────────────────────────────
function Lg({ src, sz = 18 }: { src?: string; sz?: number }) {
  if (!src) return (
    <div className="rounded-full bg-secondary flex items-center justify-center flex-shrink-0" style={{ width: sz, height: sz }}>
      <span style={{ fontSize: sz * 0.45 }} className="text-muted-foreground">?</span>
    </div>
  );
  return <OptimizedImage src={src} alt="" className="object-contain flex-shrink-0" style={{ width: sz, height: sz }} />;
}
