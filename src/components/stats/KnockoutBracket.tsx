import { useState, useEffect } from 'react';
import { fetchLeagueFixtures, fetchLeagueRounds } from '@/services/footballApi';
import { Match } from '@/types/football';
import { Loader2, Trophy, ChevronDown } from 'lucide-react';
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

  // Reverse: Final at top → earlier rounds below
  const rev = [...rounds].reverse();

  return (
    <div className="py-4 px-2 sm:px-4">
      {rev.map((round, ri) => (
        <RoundSection key={round.label} round={round} isFirst={ri === 0} />
      ))}
    </div>
  );
}

// ─── Round Section ──────────────────────────────────────────────────────────
function RoundSection({ round, isFirst }: { round: RoundData; isFirst: boolean }) {
  const isFinal = round.label === 'Final';
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-1">
      {/* Round header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 transition-colors',
          isFinal ? '' : 'hover:bg-secondary/30 rounded-lg'
        )}
      >
        {isFinal && <Trophy className="w-4 h-4 text-amber-400" />}
        <span className={cn(
          'text-xs font-bold uppercase tracking-widest',
          isFinal ? 'text-amber-400' : 'text-muted-foreground'
        )}>
          {round.label}
        </span>
        {!isFinal && (
          <span className="text-[10px] text-muted-foreground/50 ml-1">({round.ties.length})</span>
        )}
        <ChevronDown className={cn(
          'w-3.5 h-3.5 text-muted-foreground/40 transition-transform',
          !expanded && '-rotate-90'
        )} />
      </button>

      {/* Ties grid */}
      {expanded && (
        <div className={cn(
          'grid gap-2 pb-4',
          isFinal ? 'grid-cols-1 max-w-xs mx-auto' :
          round.ties.length <= 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-lg mx-auto' :
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        )}>
          {round.ties.map(tie => (
            isFinal
              ? <FinalCard key={tie.id} tie={tie} />
              : <TieCard key={tie.id} tie={tie} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tie Card ───────────────────────────────────────────────────────────────
function TieCard({ tie }: { tie: TieData }) {
  const w1 = tie.winnerId === tie.team1.id;
  const w2 = tie.winnerId === tie.team2.id;
  const has2 = !!tie.leg2;

  return (
    <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
      {/* Header with leg labels */}
      {tie.decided && has2 && (
        <div className="flex items-center px-3 py-1 bg-secondary/30 border-b border-border/30">
          <span className="flex-1" />
          <div className="flex items-center gap-0 tabular-nums">
            <span className="text-[8px] text-muted-foreground/60 w-[22px] text-center uppercase">1st</span>
            <span className="text-[8px] text-muted-foreground/60 w-[22px] text-center uppercase">2nd</span>
            <span className="text-[8px] text-muted-foreground/60 w-[26px] text-center uppercase font-bold">Agg</span>
          </div>
        </div>
      )}

      {/* Winner on top */}
      {(() => {
        if (tie.decided && w2) {
          return (<>
            <TeamRow team={tie.team2} s1={tie.leg1[1]} s2={has2 ? tie.leg2![1] : null} agg={tie.agg?.[1] ?? null} won={true} lost={false} decided={true} has2={has2} />
            <div className="h-px bg-border/20 mx-2" />
            <TeamRow team={tie.team1} s1={tie.leg1[0]} s2={has2 ? tie.leg2![0] : null} agg={tie.agg?.[0] ?? null} won={false} lost={true} decided={true} has2={has2} />
          </>);
        }
        return (<>
          <TeamRow team={tie.team1} s1={tie.leg1[0]} s2={has2 ? tie.leg2![0] : null} agg={tie.agg?.[0] ?? null} won={w1} lost={w2} decided={tie.decided} has2={has2} />
          <div className="h-px bg-border/20 mx-2" />
          <TeamRow team={tie.team2} s1={tie.leg1[1]} s2={has2 ? tie.leg2![1] : null} agg={tie.agg?.[1] ?? null} won={w2} lost={w1} decided={tie.decided} has2={has2} />
        </>);
      })()}

      {/* How a level knockout tie was settled */}
      {tie.decided && tie.decidedBy === 'pens' && (
        <div className="text-center py-1 bg-[#39ff14]/[0.05] border-t border-[#39ff14]/15">
          <span className="text-[9px] font-bold text-[#39ff14] uppercase tracking-wider">
            Won on penalties{tie.pen1 != null && tie.pen2 != null ? ` ${Math.max(tie.pen1, tie.pen2)}-${Math.min(tie.pen1, tie.pen2)}` : ''}
          </span>
        </div>
      )}
      {tie.decided && tie.decidedBy === 'aet' && (
        <div className="text-center py-1 bg-secondary/20 border-t border-border/20">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">After extra time</span>
        </div>
      )}

      {/* Date for undecided ties */}
      {!tie.decided && (
        <div className="text-center py-1.5 bg-secondary/20 border-t border-border/20">
          <span className="text-[10px] text-muted-foreground">{tie.dateLabel}</span>
        </div>
      )}
    </div>
  );
}

function TeamRow({ team, s1, s2, agg, won, lost, decided, has2 }: {
  team: TieData['team1']; s1: number | null; s2: number | null;
  agg: number | null; won: boolean; lost: boolean; decided: boolean; has2: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 transition-colors border-l-2 border-transparent',
      won && decided ? 'bg-[#39ff14]/[0.06] border-l-[#39ff14]' : '',
      lost && decided ? 'bg-red-500/[0.03]' : '',
    )}>
      {/* Team logo + name */}
      <Lg src={team.logo} sz={18} />
      <span className={cn(
        'text-[13px] flex-1 truncate',
        won && decided ? 'font-bold text-[#39ff14]' : '',
        lost && decided ? 'text-red-400/80 line-through decoration-red-400/40' : '',
        !decided ? 'text-foreground' : '',
      )}>
        {team.name}
      </span>

      {/* Scores */}
      {decided ? (
        <div className="flex items-center tabular-nums gap-0">
          <span className={cn(
            'text-[13px] font-semibold w-[22px] text-center',
            won ? 'text-[#39ff14]' : 'text-red-400/50'
          )}>{s1}</span>
          {has2 && (
            <span className={cn(
              'text-[13px] font-semibold w-[22px] text-center',
              won ? 'text-[#39ff14]' : 'text-red-400/50'
            )}>{s2}</span>
          )}
          {agg !== null && (
            <span className={cn(
              'text-[13px] font-black w-[26px] text-center rounded-md py-0.5',
              won ? 'text-[#39ff14] bg-[#39ff14]/10' : 'text-red-400/40',
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
    <div className="relative bg-gradient-to-b from-amber-500/[0.06] to-transparent border-2 border-amber-500/20 rounded-xl overflow-hidden">
      {/* Final header */}
      {tie.decided ? (
        <div className="flex items-center justify-center gap-1.5 py-2 bg-amber-500/[0.06]">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Champion</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1.5 py-2 bg-secondary/30">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{tie.dateLabel || 'TBD'}</span>
        </div>
      )}

      {/* Winner on top, loser below */}
      {(() => {
        const winner = w1 ? tie.team1 : w2 ? tie.team2 : tie.team1;
        const loser = w1 ? tie.team2 : w2 ? tie.team1 : tie.team2;
        const winnerScore = w1 ? tie.leg1[0] : w2 ? tie.leg1[1] : tie.leg1[0];
        const loserScore = w1 ? tie.leg1[1] : w2 ? tie.leg1[0] : tie.leg1[1];
        const hasWinner = w1 || w2;
        return (<>
          <div className={cn('flex items-center gap-3 px-4 py-3', hasWinner && tie.decided ? 'bg-primary/[0.04]' : '')}>
            <Lg src={winner.logo} sz={28} />
            <span className={cn('text-sm flex-1 truncate', hasWinner && tie.decided ? 'font-bold text-foreground' : 'text-muted-foreground')}>{winner.name}</span>
            {tie.decided && (<span className={cn('text-xl font-black tabular-nums', hasWinner ? 'text-foreground' : 'text-muted-foreground')}>{winnerScore}</span>)}
          </div>
          <div className="h-px bg-border/20 mx-3" />
          <div className={cn('flex items-center gap-3 px-4 py-3', tie.decided ? 'opacity-40' : '')}>
            <Lg src={loser.logo} sz={28} />
            <span className={cn('text-sm flex-1 truncate', 'text-muted-foreground')}>{loser.name}</span>
            {tie.decided && (<span className={cn('text-xl font-black tabular-nums text-muted-foreground')}>{loserScore}</span>)}
          </div>
        </>);
      })()}

      {/* Aggregate for two-legged */}
      {tie.agg && (
        <div className="text-center py-1.5 bg-secondary/20 border-t border-border/20">
          <span className="text-[10px] text-muted-foreground">Aggregate: {tie.agg[0]} - {tie.agg[1]}</span>
        </div>
      )}
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
