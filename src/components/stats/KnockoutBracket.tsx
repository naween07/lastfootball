import { useState, useEffect } from 'react';
import { fetchLeagueFixtures, fetchLeagueRounds } from '@/services/footballApi';
import { Match } from '@/types/football';
import { Loader2, HelpCircle } from 'lucide-react';

interface KnockoutBracketProps {
  leagueId: number;
  season: number;
}

interface RoundData {
  round: string;
  label: string;
  ties: TieData[];
  order: number;
}

interface TieData {
  team1: { id: number; name: string; shortName: string; logo?: string };
  team2: { id: number; name: string; shortName: string; logo?: string };
  legs: { homeScore: number | null; awayScore: number | null; date: string }[];
  aggScore?: string;
  decided: boolean;
}

const KNOCKOUT_KEYWORDS = ['Round of 16', 'Quarter-final', 'Semi-final', 'Final', '8th Finals', 'Play-offs', 'Knockout', 'Round of 32'];

function isKnockoutRound(round: string): boolean {
  return KNOCKOUT_KEYWORDS.some(kw => round.toLowerCase().includes(kw.toLowerCase()));
}

function getRoundOrder(round: string): number {
  const lower = round.toLowerCase();
  if (lower.includes('round of 32') || lower.includes('play-off')) return 0;
  if (lower.includes('round of 16') || lower.includes('8th finals')) return 1;
  if (lower.includes('quarter')) return 2;
  if (lower.includes('semi')) return 3;
  if (lower.includes('final') && !lower.includes('semi') && !lower.includes('quarter')) return 4;
  return -1;
}

function getRoundLabel(round: string): string {
  const lower = round.toLowerCase();
  if (lower.includes('final') && !lower.includes('semi') && !lower.includes('quarter')) return 'Final';
  if (lower.includes('semi')) return 'Semi-Finals';
  if (lower.includes('quarter')) return 'Quarter-Finals';
  if (lower.includes('round of 16') || lower.includes('8th')) return 'Round of 16';
  if (lower.includes('round of 32')) return 'Round of 32';
  if (lower.includes('play-off')) return 'Play-offs';
  return round;
}

function buildTies(matches: Match[]): TieData[] {
  const tieMap = new Map<string, Match[]>();
  matches.forEach(m => {
    const key = [m.homeTeam.id, m.awayTeam.id].sort().join('-');
    if (!tieMap.has(key)) tieMap.set(key, []);
    tieMap.get(key)!.push(m);
  });

  return Array.from(tieMap.values()).map(legs => {
    const first = legs[0];
    const decided = legs.every(l => l.status === 'FT' || l.status === 'AET' || l.status === 'PEN');

    // For two-legged ties, compute aggregate
    let aggScore: string | undefined;
    if (legs.length === 2 && decided) {
      let t1Goals = 0, t2Goals = 0;
      const t1Id = first.homeTeam.id;
      legs.forEach(l => {
        if (l.homeTeam.id === t1Id) {
          t1Goals += l.homeScore ?? 0;
          t2Goals += l.awayScore ?? 0;
        } else {
          t2Goals += l.homeScore ?? 0;
          t1Goals += l.awayScore ?? 0;
        }
      });
      aggScore = `${t1Goals} - ${t2Goals}`;
    }

    return {
      team1: first.homeTeam,
      team2: first.awayTeam,
      legs: legs.map(l => ({
        homeScore: l.homeScore,
        awayScore: l.awayScore,
        date: l.date ? `${l.date.split('-')[1]}/${l.date.split('-')[2]}` : '',
      })),
      aggScore,
      decided,
    };
  });
}

export default function KnockoutBracket({ leagueId, season }: KnockoutBracketProps) {
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLeagueRounds(leagueId, season)
      .then(async (allRounds) => {
        const knockoutRounds = allRounds.filter(isKnockoutRound);
        if (knockoutRounds.length === 0) {
          setRounds([]);
          return;
        }

        // Deduplicate by label (e.g. "Quarter-finals - First Leg" and "Quarter-finals - Second Leg")
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
          const order = getRoundOrder(roundNames[0]);
          roundData.push({
            round: roundNames[0],
            label,
            ties: buildTies(allMatches),
            order,
          });
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
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No knockout rounds available yet for this season.</p>
      </div>
    );
  }

  // Reverse so Final is at top, Round of 16 at bottom
  const reversed = [...rounds].reverse();

  return (
    <div className="p-4">
      <h3 className="text-sm font-bold text-foreground mb-4">Final Stages</h3>
      <div className="space-y-0">
        {reversed.map((round, idx) => (
          <BracketRound
            key={round.label}
            round={round}
            isFirst={idx === 0}
            totalRounds={reversed.length}
            roundIndex={idx}
          />
        ))}
      </div>
    </div>
  );
}

function BracketRound({
  round,
  isFirst,
  totalRounds,
  roundIndex,
}: {
  round: RoundData;
  isFirst: boolean;
  totalRounds: number;
  roundIndex: number;
}) {
  const isFinal = round.label === 'Final';

  return (
    <div className="relative">
      {/* Bracket connecting lines for non-first rounds */}
      {!isFirst && (
        <div className="flex justify-center mb-2">
          <div className="h-6 w-px bg-border" />
        </div>
      )}

      {/* Round label */}
      {isFinal && round.ties.length > 0 && (
        <div className="text-center mb-3">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">{round.label}</span>
        </div>
      )}

      {/* Ties in this round */}
      <div className={`flex flex-wrap justify-center ${isFinal ? 'gap-6' : 'gap-4'}`}>
        {round.ties.length === 0 ? (
          <TBDSlot />
        ) : (
          round.ties.map((tie, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <TieCard tie={tie} isFinal={isFinal} />
            </div>
          ))
        )}
      </div>

      {/* Bracket lines going down to next round */}
      {round.ties.length >= 2 && (
        <div className="flex justify-center mt-1">
          <BracketLines count={round.ties.length} />
        </div>
      )}

      {/* Round label for non-final */}
      {!isFinal && (
        <div className="text-center mt-2 mb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{round.label}</span>
        </div>
      )}
    </div>
  );
}

function TieCard({ tie, isFinal }: { tie: TieData; isFinal: boolean }) {
  if (isFinal) {
    // Final: large format with VS in center
    return (
      <div className="flex items-center gap-4">
        <TeamBadge team={tie.team1} size="lg" />
        <div className="text-center">
          {tie.decided ? (
            <p className="text-xl font-extrabold text-foreground tabular-nums">
              {tie.legs[0]?.homeScore} – {tie.legs[0]?.awayScore}
            </p>
          ) : tie.legs[0]?.date ? (
            <p className="text-sm text-muted-foreground">{tie.legs[0].date}</p>
          ) : (
            <p className="text-sm font-bold text-muted-foreground">VS</p>
          )}
        </div>
        <TeamBadge team={tie.team2} size="lg" />
      </div>
    );
  }

  // Regular knockout tie: compact with scores between logos
  return (
    <div className="bg-secondary/40 rounded-lg border border-border/50 px-3 py-2 min-w-[120px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col items-center gap-0.5">
          {tie.team1.logo ? (
            <img src={tie.team1.logo} alt="" className="w-6 h-6" />
          ) : (
            <HelpCircle className="w-6 h-6 text-muted-foreground" />
          )}
          <span className="text-[10px] text-muted-foreground truncate max-w-[40px]">{tie.team1.shortName}</span>
        </div>

        <div className="text-center flex-1">
          {tie.legs.map((leg, i) => (
            <p key={i} className="text-xs font-bold text-foreground tabular-nums leading-tight">
              {leg.homeScore !== null ? `${leg.homeScore} - ${leg.awayScore}` : leg.date || 'TBD'}
            </p>
          ))}
          {tie.aggScore && (
            <p className="text-[9px] text-muted-foreground mt-0.5">{tie.aggScore}</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-0.5">
          {tie.team2.logo ? (
            <img src={tie.team2.logo} alt="" className="w-6 h-6" />
          ) : (
            <HelpCircle className="w-6 h-6 text-muted-foreground" />
          )}
          <span className="text-[10px] text-muted-foreground truncate max-w-[40px]">{tie.team2.shortName}</span>
        </div>
      </div>
    </div>
  );
}

function TeamBadge({ team, size = 'sm' }: { team: TieData['team1']; size?: 'sm' | 'lg' }) {
  const imgSize = size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  return (
    <div className="flex flex-col items-center gap-1">
      {team.logo ? (
        <img src={team.logo} alt="" className={imgSize} />
      ) : (
        <div className={`${imgSize} rounded-full bg-secondary flex items-center justify-center`}>
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <span className={`${size === 'lg' ? 'text-xs' : 'text-[10px]'} text-muted-foreground font-medium truncate max-w-[60px]`}>
        {team.shortName}
      </span>
    </div>
  );
}

function TBDSlot() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <div className="w-8 h-8 rounded-full border-2 border-dashed border-border flex items-center justify-center">
          <span className="text-xs text-muted-foreground">?</span>
        </div>
        <span className="text-[10px] text-muted-foreground">TBD</span>
      </div>
      <span className="text-sm font-bold text-muted-foreground">VS</span>
      <div className="flex flex-col items-center gap-1">
        <div className="w-8 h-8 rounded-full border-2 border-dashed border-border flex items-center justify-center">
          <span className="text-xs text-muted-foreground">?</span>
        </div>
        <span className="text-[10px] text-muted-foreground">TBD</span>
      </div>
    </div>
  );
}

function BracketLines({ count }: { count: number }) {
  // Draw bracket connecting lines between pairs
  const pairs = Math.ceil(count / 2);
  return (
    <div className="flex items-start gap-8">
      {Array.from({ length: pairs }).map((_, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="h-4 w-px bg-border" />
          <div className="flex">
            <div className="w-8 h-px bg-border" />
            <div className="w-px h-4 bg-border -mt-px" />
            <div className="w-8 h-px bg-border" />
          </div>
        </div>
      ))}
    </div>
  );
}
