import { useState, useEffect } from 'react';
import { fetchLeagueFixtures, fetchLeagueRounds } from '@/services/footballApi';
import { Match } from '@/types/football';
import { Loader2 } from 'lucide-react';
import OptimizedImage from '../OptimizedImage';
import { cn } from '@/lib/utils';

interface KnockoutBracketProps {
  leagueId: number;
  season: number;
}

interface TieData {
  id: string;
  team1: { id: number; name: string; shortName: string; logo?: string };
  team2: { id: number; name: string; shortName: string; logo?: string };
  leg1: { team1Score: number | null; team2Score: number | null; date: string };
  leg2: { team1Score: number | null; team2Score: number | null; date: string } | null;
  agg: { team1: number; team2: number } | null;
  winnerId: number | null;
  decided: boolean;
}

interface RoundData {
  label: string;
  order: number;
  ties: TieData[];
}

const KNOCKOUT_KEYWORDS = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final', '8th Finals', 'Play-offs', 'Knockout'];

function isKnockoutRound(round: string): boolean {
  return KNOCKOUT_KEYWORDS.some(kw => round.toLowerCase().includes(kw.toLowerCase()));
}

function getRoundOrder(round: string): number {
  const lower = round.toLowerCase();
  if (lower.includes('play-off')) return 0;
  if (lower.includes('round of 32')) return 1;
  if (lower.includes('round of 16') || lower.includes('8th finals')) return 2;
  if (lower.includes('quarter')) return 3;
  if (lower.includes('semi')) return 4;
  if (lower.includes('final') && !lower.includes('semi') && !lower.includes('quarter')) return 5;
  return -1;
}

function getRoundLabel(round: string): string {
  const lower = round.toLowerCase();
  if (lower.includes('final') && !lower.includes('semi') && !lower.includes('quarter')) return 'Final';
  if (lower.includes('semi')) return 'Semi-finals';
  if (lower.includes('quarter')) return 'Quarter-finals';
  if (lower.includes('round of 16') || lower.includes('8th')) return 'Round of 16';
  if (lower.includes('round of 32')) return 'Round of 32';
  if (lower.includes('play-off')) return 'Play-offs';
  return round;
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return '';
  const p = dateStr.split('-');
  return p.length >= 3 ? `${p[1]}/${p[2]}` : dateStr;
}

function buildTies(matches: Match[]): TieData[] {
  const tieMap = new Map<string, Match[]>();
  matches.forEach(m => {
    const key = [m.homeTeam.id, m.awayTeam.id].sort((a, b) => a - b).join('-');
    if (!tieMap.has(key)) tieMap.set(key, []);
    tieMap.get(key)!.push(m);
  });

  return Array.from(tieMap.values()).map(legs => {
    legs.sort((a, b) => a.date.localeCompare(b.date));
    const first = legs[0];
    const decided = legs.every(l => l.status === 'FT' || l.status === 'AET' || l.status === 'PEN');

    const team1 = first.homeTeam;
    const team2 = first.awayTeam;

    // Leg 1: team1 is home
    const leg1 = {
      team1Score: first.homeScore,
      team2Score: first.awayScore,
      date: fmtDate(first.date),
    };

    // Leg 2: normalize to team1/team2 perspective
    let leg2: TieData['leg2'] = null;
    if (legs.length >= 2) {
      const second = legs[1];
      if (second.homeTeam.id === team1.id) {
        leg2 = { team1Score: second.homeScore, team2Score: second.awayScore, date: fmtDate(second.date) };
      } else {
        // team2 is home in leg 2 — swap
        leg2 = { team1Score: second.awayScore, team2Score: second.homeScore, date: fmtDate(second.date) };
      }
    }

    let agg: TieData['agg'] = null;
    let winnerId: number | null = null;

    if (decided && legs.length >= 2) {
      const t1 = (leg1.team1Score ?? 0) + (leg2?.team1Score ?? 0);
      const t2 = (leg1.team2Score ?? 0) + (leg2?.team2Score ?? 0);
      agg = { team1: t1, team2: t2 };

      if (t1 > t2) winnerId = team1.id;
      else if (t2 > t1) winnerId = team2.id;
      else {
        const lastLeg = legs[legs.length - 1];
        if (lastLeg.status === 'PEN') {
          winnerId = lastLeg.homeScore! > lastLeg.awayScore! ? lastLeg.homeTeam.id : lastLeg.awayTeam.id;
        }
      }
    } else if (decided && legs.length === 1) {
      const s1 = first.homeScore ?? 0;
      const s2 = first.awayScore ?? 0;
      if (s1 > s2) winnerId = team1.id;
      else if (s2 > s1) winnerId = team2.id;
    }

    return { id: [team1.id, team2.id].sort().join('-'), team1, team2, leg1, leg2, agg, winnerId, decided };
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function KnockoutBracket({ leagueId, season }: KnockoutBracketProps) {
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLeagueRounds(leagueId, season)
      .then(async (allRounds) => {
        const knockoutRounds = allRounds.filter(isKnockoutRound);
        if (knockoutRounds.length === 0) { setRounds([]); return; }

        const labelMap = new Map<string, string[]>();
        knockoutRounds.forEach(r => {
          const label = getRoundLabel(r);
          if (!labelMap.has(label)) labelMap.set(label, []);
          labelMap.get(label)!.push(r);
        });

        const roundData: RoundData[] = [];
        for (const [label, roundNames] of labelMap) {
          let allMatches: Match[] = [];
          for (const rn of roundNames) {
            const m = await fetchLeagueFixtures(leagueId, season, rn);
            allMatches = allMatches.concat(m);
          }
          roundData.push({ label, ties: buildTies(allMatches), order: getRoundOrder(roundNames[0]) });
        }

        roundData.sort((a, b) => a.order - b.order);
        setRounds(roundData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [leagueId, season]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading bracket...</span>
      </div>
    );
  }

  if (rounds.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">No knockout rounds available yet.</div>;
  }

  const reversed = [...rounds].reverse();

  return (
    <div className="py-4 overflow-x-auto">
      <h3 className="text-sm font-bold text-foreground mb-5 px-4">Final Stages</h3>
      <div className="flex flex-col items-center min-w-fit px-2">
        {reversed.map((round, idx) => (
          <div key={round.label} className="flex flex-col items-center w-full">
            {/* Round label */}
            {idx === 0 && round.label === 'Final' ? null : (
              idx > 0 && <RoundLabel label={reversed[idx - 1].label} />
            )}

            {/* Match cards */}
            <div className={cn('flex flex-wrap justify-center', round.label === 'Final' ? 'gap-8' : 'gap-3')}>
              {round.ties.map(tie => (
                <TieCard key={tie.id} tie={tie} isFinal={round.label === 'Final'} />
              ))}
            </div>

            {/* Tree connector lines */}
            {idx < reversed.length - 1 && round.ties.length >= 2 && (
              <SVGConnectors count={round.ties.length} cardWidth={156} gap={12} />
            )}
          </div>
        ))}
        {/* Last round label */}
        <RoundLabel label={reversed[reversed.length - 1].label} />
      </div>
    </div>
  );
}

function RoundLabel({ label }: { label: string }) {
  return (
    <div className="py-2">
      <span className={cn(
        'text-[10px] font-bold uppercase tracking-widest',
        label === 'Final' ? 'text-primary' : 'text-muted-foreground/70'
      )}>
        {label}
      </span>
    </div>
  );
}

// ─── Tie Card ───────────────────────────────────────────────────────────────
function TieCard({ tie, isFinal }: { tie: TieData; isFinal: boolean }) {
  if (isFinal) {
    return (
      <div className="bg-card border-2 border-primary/30 rounded-xl px-5 py-3">
        <div className="flex items-center justify-center gap-5">
          <div className="flex flex-col items-center gap-1">
            <Logo src={tie.team1.logo} size={32} />
            <span className="text-xs font-bold text-foreground">{tie.team1.shortName}</span>
          </div>
          <div className="text-center min-w-[60px]">
            {tie.decided ? (
              <>
                <p className="text-2xl font-black text-foreground tabular-nums">
                  {tie.leg1.team1Score} – {tie.leg1.team2Score}
                </p>
                {tie.leg2 && tie.agg && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Agg: {tie.agg.team1} - {tie.agg.team2}
                  </p>
                )}
              </>
            ) : (
              <div>
                <p className="text-[11px] text-muted-foreground font-bold">{tie.leg1.date}</p>
                {tie.leg2 && <p className="text-[11px] text-muted-foreground">{tie.leg2.date}</p>}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <Logo src={tie.team2.logo} size={32} />
            <span className="text-xs font-bold text-foreground">{tie.team2.shortName}</span>
          </div>
        </div>
      </div>
    );
  }

  const w1 = tie.winnerId === tie.team1.id;
  const w2 = tie.winnerId === tie.team2.id;
  const hasTwoLegs = !!tie.leg2;

  return (
    <div className="bg-card border border-border/60 rounded-lg overflow-hidden" style={{ width: '156px' }}>
      {/* Team 1 */}
      <TeamRow
        team={tie.team1}
        leg1Score={tie.leg1.team1Score}
        leg2Score={tie.leg2?.team1Score ?? null}
        aggScore={tie.agg?.team1 ?? null}
        isWinner={w1}
        decided={tie.decided}
        hasTwoLegs={hasTwoLegs}
        date={!tie.decided ? tie.leg1.date : undefined}
      />
      <div className="h-px bg-border/30" />
      {/* Team 2 */}
      <TeamRow
        team={tie.team2}
        leg1Score={tie.leg1.team2Score}
        leg2Score={tie.leg2?.team2Score ?? null}
        aggScore={tie.agg?.team2 ?? null}
        isWinner={w2}
        decided={tie.decided}
        hasTwoLegs={hasTwoLegs}
        date={!tie.decided ? (tie.leg2?.date || '') : undefined}
      />
    </div>
  );
}

function TeamRow({
  team, leg1Score, leg2Score, aggScore, isWinner, decided, hasTwoLegs, date,
}: {
  team: TieData['team1'];
  leg1Score: number | null;
  leg2Score: number | null;
  aggScore: number | null;
  isWinner: boolean;
  decided: boolean;
  hasTwoLegs: boolean;
  date?: string;
}) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-[6px]',
      isWinner && decided ? 'bg-primary/5' : '',
    )}>
      <Logo src={team.logo} size={16} />
      <span className={cn(
        'text-[11px] flex-1 truncate',
        isWinner && decided ? 'font-bold text-foreground' : 'text-muted-foreground',
      )}>
        {team.shortName}
      </span>

      {decided ? (
        <div className="flex items-center gap-0 tabular-nums">
          {/* Leg scores */}
          <span className={cn(
            'text-[11px] w-4 text-center font-semibold',
            isWinner ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {leg1Score}
          </span>
          {hasTwoLegs && (
            <span className={cn(
              'text-[11px] w-4 text-center font-semibold',
              isWinner ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {leg2Score}
            </span>
          )}
          {/* Aggregate */}
          {aggScore !== null && (
            <span className={cn(
              'text-[10px] font-extrabold ml-1 px-1 rounded',
              isWinner ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            )}>
              {aggScore}
            </span>
          )}
        </div>
      ) : (
        <span className="text-[10px] text-muted-foreground">{date}</span>
      )}
    </div>
  );
}

// ─── SVG Tree Connectors ────────────────────────────────────────────────────
function SVGConnectors({ count, cardWidth, gap }: { count: number; cardWidth: number; gap: number }) {
  const pairs = Math.ceil(count / 2);
  const totalWidth = count * cardWidth + (count - 1) * gap;
  const pairSpan = cardWidth * 2 + gap;
  const h = 28;

  return (
    <svg
      width={totalWidth}
      height={h}
      viewBox={`0 0 ${totalWidth} ${h}`}
      className="block my-0"
      style={{ maxWidth: '100%' }}
    >
      {Array.from({ length: pairs }).map((_, i) => {
        const leftIdx = i * 2;
        const rightIdx = i * 2 + 1;
        if (rightIdx >= count) return null;

        const leftCenter = leftIdx * (cardWidth + gap) + cardWidth / 2;
        const rightCenter = rightIdx * (cardWidth + gap) + cardWidth / 2;
        const midX = (leftCenter + rightCenter) / 2;

        return (
          <g key={i}>
            {/* Down from left card */}
            <line x1={leftCenter} y1={0} x2={leftCenter} y2={h * 0.4} stroke="hsl(var(--border))" strokeWidth={1} />
            {/* Down from right card */}
            <line x1={rightCenter} y1={0} x2={rightCenter} y2={h * 0.4} stroke="hsl(var(--border))" strokeWidth={1} />
            {/* Horizontal connecting */}
            <line x1={leftCenter} y1={h * 0.4} x2={rightCenter} y2={h * 0.4} stroke="hsl(var(--border))" strokeWidth={1} />
            {/* Down from center to next round */}
            <line x1={midX} y1={h * 0.4} x2={midX} y2={h} stroke="hsl(var(--border))" strokeWidth={1} />
          </g>
        );
      })}
    </svg>
  );
}

function Logo({ src, size = 18 }: { src?: string; size?: number }) {
  if (!src) {
    return (
      <div className="rounded-full bg-secondary flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
        <span style={{ fontSize: size * 0.4 }} className="text-muted-foreground font-bold">?</span>
      </div>
    );
  }
  return <OptimizedImage src={src} alt="" className="object-contain flex-shrink-0" style={{ width: size, height: size }} />;
}
