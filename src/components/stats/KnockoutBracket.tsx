import { useState, useEffect, useMemo } from 'react';
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
  if (l.includes('semi')) return 'SF';
  if (l.includes('quarter')) return 'QF';
  if (l.includes('round of 16') || l.includes('8th')) return 'R16';
  if (l.includes('round of 32')) return 'R32';
  if (l.includes('play-off')) return 'KOPO';
  return r;
}

function getFullLabel(r: string): string {
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
    const f = legs[0], done = legs.every(l => ['FT', 'AET', 'PEN'].includes(l.status));
    const t1 = f.homeTeam, t2 = f.awayTeam;
    const l1: [number | null, number | null] = [f.homeScore, f.awayScore];
    let l2: [number | null, number | null] | null = null;
    if (legs.length >= 2) {
      const s = legs[1];
      l2 = s.homeTeam.id === t1.id ? [s.homeScore, s.awayScore] : [s.awayScore, s.homeScore];
    }
    let agg: [number, number] | null = null, wid: number | null = null;
    if (done && l2) {
      const a1 = (l1[0] ?? 0) + (l2[0] ?? 0), a2 = (l1[1] ?? 0) + (l2[1] ?? 0);
      agg = [a1, a2];
      if (a1 > a2) wid = t1.id; else if (a2 > a1) wid = t2.id;
      else { const last = legs[legs.length - 1]; if (last.status === 'PEN') wid = last.homeScore! > last.awayScore! ? last.homeTeam.id : last.awayTeam.id; }
    } else if (done && legs.length === 1) {
      if ((f.homeScore ?? 0) > (f.awayScore ?? 0)) wid = t1.id;
      else if ((f.awayScore ?? 0) > (f.homeScore ?? 0)) wid = t2.id;
    }
    return { id: [t1.id, t2.id].sort().join('-'), team1: t1, team2: t2, leg1: l1, leg2: l2, agg, winnerId: wid, decided: done, dateLabel: legs.map(l => fmtD(l.date)).filter(Boolean).join(' · ') };
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
      ko.forEach(r => { const l = getFullLabel(r); if (!lm.has(l)) lm.set(l, []); lm.get(l)!.push(r); });
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

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary" /><span className="ml-2 text-sm text-muted-foreground">Loading bracket...</span></div>;
  if (!rounds.length) return <div className="text-center py-12 text-muted-foreground text-sm">No knockout rounds available.</div>;

  return <BracketView rounds={rounds} />;
}

// ─── Bracket View ───────────────────────────────────────────────────────────
// Layout: each column is a round. Left half flows right, right half flows left.
// Final + trophy sits in the center column.

const COL_W = 155; // width of each match column
const MATCH_H = 52; // height per match slot
const CONN_W = 20; // connector line width between columns
const TROPHY_W = 60;

function BracketView({ rounds }: { rounds: RoundData[] }) {
  const finalRound = rounds.find(r => r.label === 'Final');
  const nonFinal = rounds.filter(r => r.label !== 'Final').sort((a, b) => a.order - b.order);

  // Split ties: first half → left, second half → right
  const leftRounds = nonFinal.map(r => ({ ...r, ties: r.ties.slice(0, Math.ceil(r.ties.length / 2)) }));
  const rightRounds = nonFinal.map(r => ({ ...r, ties: r.ties.slice(Math.ceil(r.ties.length / 2)) }));

  const numLeftCols = leftRounds.length;
  const numRightCols = rightRounds.length;
  const maxTiesInFirstRound = Math.max(leftRounds[0]?.ties.length || 0, rightRounds[0]?.ties.length || 0);
  const bracketH = Math.max(maxTiesInFirstRound * MATCH_H, 250);

  const totalW = numLeftCols * (COL_W + CONN_W) + TROPHY_W + numRightCols * (COL_W + CONN_W);

  // Compute positions for each match in each column
  const leftPositions = computePositions(leftRounds, bracketH, false);
  const rightPositions = computePositions(rightRounds, bracketH, true);

  // Center x positions
  const leftColXs = leftRounds.map((_, i) => i * (COL_W + CONN_W));
  const centerX = numLeftCols * (COL_W + CONN_W);
  const rightColXs = rightRounds.map((_, i) => centerX + TROPHY_W + i * (COL_W + CONN_W));

  return (
    <div className="py-3 overflow-x-auto">
      <div className="min-w-fit mx-auto" style={{ width: totalW + 20, padding: '0 10px' }}>
        {/* SVG layer for connector lines */}
        <div className="relative" style={{ height: bracketH + 40 }}>
          <svg className="absolute inset-0" width={totalW} height={bracketH + 40} viewBox={`0 0 ${totalW} ${bracketH + 40}`}>
            {/* Left bracket connector lines */}
            {leftRounds.map((round, ci) => {
              if (ci === leftRounds.length - 1) return null;
              const nextPositions = leftPositions[ci + 1];
              return leftPositions[ci].map((y, mi) => {
                const pairIdx = Math.floor(mi / 2);
                if (mi % 2 !== 0) return null;
                const partner = leftPositions[ci][mi + 1];
                if (!partner && partner !== 0) return null;
                const nextY = nextPositions?.[pairIdx];
                if (nextY === undefined) return null;

                const x1 = leftColXs[ci] + COL_W;
                const x2 = leftColXs[ci + 1];
                const midX = (x1 + x2) / 2;
                const topY = y + MATCH_H / 2 + 20;
                const botY = partner + MATCH_H / 2 + 20;
                const outY = nextY + MATCH_H / 2 + 20;

                return (
                  <g key={`lc-${ci}-${mi}`}>
                    <line x1={x1} y1={topY} x2={midX} y2={topY} stroke="hsl(var(--border))" strokeWidth={1.5} />
                    <line x1={x1} y1={botY} x2={midX} y2={botY} stroke="hsl(var(--border))" strokeWidth={1.5} />
                    <line x1={midX} y1={topY} x2={midX} y2={botY} stroke="hsl(var(--border))" strokeWidth={1.5} />
                    <line x1={midX} y1={outY} x2={x2} y2={outY} stroke="hsl(var(--border))" strokeWidth={1.5} />
                  </g>
                );
              });
            })}

            {/* Right bracket connector lines */}
            {rightRounds.map((round, ci) => {
              if (ci === rightRounds.length - 1) return null;
              const nextPositions = rightPositions[ci + 1];
              return rightPositions[ci].map((y, mi) => {
                const pairIdx = Math.floor(mi / 2);
                if (mi % 2 !== 0) return null;
                const partner = rightPositions[ci][mi + 1];
                if (!partner && partner !== 0) return null;
                const nextY = nextPositions?.[pairIdx];
                if (nextY === undefined) return null;

                const x1 = rightColXs[ci];
                const x2 = rightColXs[ci + 1] + COL_W;
                const midX = (x1 + x2) / 2;
                const topY = y + MATCH_H / 2 + 20;
                const botY = partner + MATCH_H / 2 + 20;
                const outY = nextY + MATCH_H / 2 + 20;

                return (
                  <g key={`rc-${ci}-${mi}`}>
                    <line x1={x1} y1={topY} x2={midX} y2={topY} stroke="hsl(var(--border))" strokeWidth={1.5} />
                    <line x1={x1} y1={botY} x2={midX} y2={botY} stroke="hsl(var(--border))" strokeWidth={1.5} />
                    <line x1={midX} y1={topY} x2={midX} y2={botY} stroke="hsl(var(--border))" strokeWidth={1.5} />
                    <line x1={midX} y1={outY} x2={x2} y2={outY} stroke="hsl(var(--border))" strokeWidth={1.5} />
                  </g>
                );
              });
            })}

            {/* Lines from SF to Final */}
            {leftPositions.length > 0 && (() => {
              const lastLeftCol = leftPositions[leftPositions.length - 1];
              if (!lastLeftCol?.length) return null;
              const sfY = lastLeftCol[0] + MATCH_H / 2 + 20;
              const fX = leftColXs[leftColXs.length - 1] + COL_W;
              return <line x1={fX} y1={sfY} x2={centerX} y2={bracketH / 2 + 20} stroke="hsl(var(--border))" strokeWidth={1.5} />;
            })()}
            {rightPositions.length > 0 && (() => {
              const lastRightCol = rightPositions[rightPositions.length - 1];
              if (!lastRightCol?.length) return null;
              const sfY = lastRightCol[0] + MATCH_H / 2 + 20;
              const fX = rightColXs[rightColXs.length - 1];
              return <line x1={fX} y1={sfY} x2={centerX + TROPHY_W} y2={bracketH / 2 + 20} stroke="hsl(var(--border))" strokeWidth={1.5} />;
            })()}
          </svg>

          {/* Left columns */}
          {leftRounds.map((round, ci) => (
            <div key={round.label + 'L'} className="absolute" style={{ left: leftColXs[ci], top: 0, width: COL_W }}>
              {/* Round label */}
              <div className="text-center mb-1" style={{ height: 20 }}>
                <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">{getLabel(round.label)}</span>
              </div>
              {round.ties.map((tie, ti) => (
                <div key={tie.id} className="absolute" style={{ top: leftPositions[ci][ti] + 20, left: 0, width: COL_W }}>
                  <BracketCard tie={tie} />
                </div>
              ))}
            </div>
          ))}

          {/* Trophy / Final center */}
          <div className="absolute flex flex-col items-center justify-center" style={{ left: centerX, width: TROPHY_W, top: 0, height: bracketH + 40 }}>
            <Trophy className="w-8 h-8 text-amber-400 mb-1" />
            {finalRound?.ties[0] && (
              <div className="text-center">
                {finalRound.ties[0].decided ? (
                  <>
                    <Lg src={finalRound.ties[0].winnerId === finalRound.ties[0].team1.id ? finalRound.ties[0].team1.logo : finalRound.ties[0].team2.logo} sz={24} />
                  </>
                ) : (
                  <span className="text-[8px] text-muted-foreground">Final</span>
                )}
              </div>
            )}
          </div>

          {/* Right columns */}
          {rightRounds.map((round, ci) => (
            <div key={round.label + 'R'} className="absolute" style={{ left: rightColXs[ci], top: 0, width: COL_W }}>
              <div className="text-center mb-1" style={{ height: 20 }}>
                <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">{getLabel(round.label)}</span>
              </div>
              {round.ties.map((tie, ti) => (
                <div key={tie.id} className="absolute" style={{ top: rightPositions[ci][ti] + 20, left: 0, width: COL_W }}>
                  <BracketCard tie={tie} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Compute Y positions for each match in each round column
function computePositions(roundCols: RoundData[], totalH: number, _isRight: boolean): number[][] {
  const result: number[][] = [];
  for (let ci = 0; ci < roundCols.length; ci++) {
    const count = roundCols[ci].ties.length;
    if (ci === 0) {
      // First round: evenly spaced
      const gap = totalH / count;
      result.push(Array.from({ length: count }, (_, i) => i * gap + (gap - MATCH_H) / 2));
    } else {
      // Subsequent rounds: position between each pair from previous round
      const prev = result[ci - 1];
      const positions: number[] = [];
      for (let i = 0; i < prev.length; i += 2) {
        const top = prev[i];
        const bot = prev[i + 1] ?? prev[i];
        positions.push((top + bot) / 2);
      }
      result.push(positions);
    }
  }
  return result;
}

// ─── Bracket Card ───────────────────────────────────────────────────────────
function BracketCard({ tie }: { tie: TieData }) {
  const w1 = tie.winnerId === tie.team1.id;
  const w2 = tie.winnerId === tie.team2.id;

  return (
    <div className="bg-card border border-border/40 rounded overflow-hidden" style={{ height: MATCH_H - 4 }}>
      <BRow team={tie.team1} agg={tie.agg?.[0] ?? null} won={w1} lost={w2} decided={tie.decided} date={!tie.decided ? tie.dateLabel : undefined} />
      <div className="h-px bg-border/15" />
      <BRow team={tie.team2} agg={tie.agg?.[1] ?? null} won={w2} lost={w1} decided={tie.decided} />
    </div>
  );
}

function BRow({ team, agg, won, lost, decided, date }: {
  team: TieData['team1']; agg: number | null; won: boolean; lost: boolean; decided: boolean; date?: string;
}) {
  return (
    <div className={cn(
      'flex items-center gap-1 px-1.5',
      won && decided ? 'bg-primary/[0.06]' : '',
      lost && decided ? 'opacity-35' : '',
    )} style={{ height: (MATCH_H - 5) / 2 }}>
      <span className={cn(
        'text-[9px] w-[14px] text-center tabular-nums flex-shrink-0',
        won ? 'text-muted-foreground' : 'text-muted-foreground/40',
      )}>{team.shortName?.charAt(0) || ''}</span>
      <Lg src={team.logo} sz={13} />
      <span className={cn(
        'text-[10px] flex-1 truncate leading-none',
        won && decided ? 'font-bold text-foreground' : lost && decided ? 'text-muted-foreground/50' : 'text-foreground/80',
      )}>{team.name.length > 14 ? team.shortName : team.name}</span>
      {decided && agg !== null ? (
        <span className={cn(
          'text-[11px] font-black tabular-nums min-w-[16px] text-right',
          won ? 'text-primary' : 'text-muted-foreground/30',
        )}>{agg}</span>
      ) : date ? (
        <span className="text-[7px] text-muted-foreground/50">{date}</span>
      ) : null}
    </div>
  );
}

// ─── Logo ───────────────────────────────────────────────────────────────────
function Lg({ src, sz = 14 }: { src?: string; sz?: number }) {
  if (!src) return <div className="rounded-full bg-secondary flex items-center justify-center flex-shrink-0" style={{ width: sz, height: sz }}><span style={{ fontSize: sz * 0.45 }} className="text-muted-foreground">?</span></div>;
  return <OptimizedImage src={src} alt="" className="object-contain flex-shrink-0" style={{ width: sz, height: sz }} />;
}
