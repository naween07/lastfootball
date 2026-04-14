import { useState, useEffect } from 'react';
import { fetchLeagueFixtures, fetchLeagueRounds, getCurrentSeason } from '@/services/footballApi';
import { Match } from '@/types/football';
import { Loader2 } from 'lucide-react';

interface KnockoutBracketProps {
  leagueId: number;
  season: number;
}

interface RoundMatches {
  round: string;
  matches: Match[];
}

const KNOCKOUT_KEYWORDS = ['Round of 16', 'Quarter-final', 'Semi-final', 'Final', 'Knockout', '8th Finals', 'Play-offs'];

function isKnockoutRound(round: string): boolean {
  return KNOCKOUT_KEYWORDS.some(kw => round.toLowerCase().includes(kw.toLowerCase()));
}

function getRoundOrder(round: string): number {
  const lower = round.toLowerCase();
  if (lower.includes('round of 16') || lower.includes('8th finals')) return 1;
  if (lower.includes('quarter')) return 2;
  if (lower.includes('semi')) return 3;
  if (lower === 'final' || lower.endsWith('- final')) return 4;
  return 0;
}

export default function KnockoutBracket({ leagueId, season }: KnockoutBracketProps) {
  const [rounds, setRounds] = useState<RoundMatches[]>([]);
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

        const roundData: RoundMatches[] = [];
        for (const round of knockoutRounds) {
          const matches = await fetchLeagueFixtures(leagueId, season, round);
          roundData.push({ round, matches });
        }
        roundData.sort((a, b) => getRoundOrder(a.round) - getRoundOrder(b.round));
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

  return (
    <div className="overflow-x-auto">
      <div className="flex items-start gap-4 p-4 min-w-max">
        {rounds.map((round, roundIdx) => (
          <div key={round.round} className="flex flex-col items-center">
            <h3 className="text-xs font-bold text-primary mb-3 whitespace-nowrap">{round.round}</h3>
            <div
              className="flex flex-col gap-3 justify-center"
              style={{ minHeight: roundIdx === 0 ? 'auto' : undefined }}
            >
              {groupMatchesByTie(round.matches).map((tie, tieIdx) => (
                <BracketTie key={tieIdx} matches={tie} />
              ))}
            </div>
            {roundIdx < rounds.length - 1 && (
              <div className="hidden" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function groupMatchesByTie(matches: Match[]): Match[][] {
  // Group home/away legs by team pairing
  const tieMap = new Map<string, Match[]>();
  matches.forEach(m => {
    const key = [m.homeTeam.id, m.awayTeam.id].sort().join('-');
    if (!tieMap.has(key)) tieMap.set(key, []);
    tieMap.get(key)!.push(m);
  });
  return Array.from(tieMap.values());
}

function BracketTie({ matches }: { matches: Match[] }) {
  const first = matches[0];
  if (!first) return null;

  // Aggregate scores for two-legged ties
  const totalHome = matches.reduce((sum, m) => sum + (m.homeScore ?? 0), 0);
  const totalAway = matches.reduce((sum, m) => sum + (m.awayScore ?? 0), 0);

  return (
    <div className="bg-secondary/50 border border-border rounded-lg overflow-hidden w-56">
      {matches.map((m, idx) => (
        <div key={m.id} className={`${idx > 0 ? 'border-t border-border/50' : ''}`}>
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {m.homeTeam.logo && <img src={m.homeTeam.logo} alt="" className="w-4 h-4 flex-shrink-0" />}
              <span className="text-xs font-medium text-foreground truncate">{m.homeTeam.shortName}</span>
            </div>
            <span className="text-xs font-bold tabular-nums text-foreground mx-2">
              {m.homeScore !== null ? `${m.homeScore} - ${m.awayScore}` : m.time}
            </span>
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <span className="text-xs font-medium text-foreground truncate">{m.awayTeam.shortName}</span>
              {m.awayTeam.logo && <img src={m.awayTeam.logo} alt="" className="w-4 h-4 flex-shrink-0" />}
            </div>
          </div>
        </div>
      ))}
      {matches.length > 1 && (
        <div className="border-t border-border bg-secondary/80 px-3 py-1 text-center">
          <span className="text-[10px] text-muted-foreground font-medium">
            Agg: {totalHome} - {totalAway}
          </span>
        </div>
      )}
    </div>
  );
}
