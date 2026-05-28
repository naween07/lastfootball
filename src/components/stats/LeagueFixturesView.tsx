import { useState, useEffect } from 'react';
import { fetchLeagueFixtures, fetchLeagueRounds, CUP_LEAGUE_IDS, isSingleYearTournament } from '@/services/footballApi';
import { Match } from '@/types/football';
import MatchCard from '@/components/MatchCard';
import { cn } from '@/lib/utils';

interface LeagueFixturesViewProps {
  leagueId: number;
  season: number;
}

export default function LeagueFixturesView({ leagueId, season }: LeagueFixturesViewProps) {
  const [rounds, setRounds] = useState<string[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const isCup = CUP_LEAGUE_IDS.includes(leagueId);
  const isTournament = isSingleYearTournament(leagueId);

  useEffect(() => {
    setLoading(true);
    setSelectedRound('');
    setRounds([]);
    setMatches([]);
    fetchLeagueRounds(leagueId, season)
      .then(r => {
        setRounds(r);
        if (r.length > 0) {
          if (isTournament) {
            // For World Cup/Euros/Copa: find the earliest group stage round
            const groupRound = r.find(rd => rd.toLowerCase().includes('group') && rd.includes('1'));
            setSelectedRound(groupRound || r[0]);
          } else if (isCup) {
            // For UCL/UEL: default to first round
            setSelectedRound(r[0]);
          } else {
            // For leagues: default to latest round
            setSelectedRound(r[r.length - 1]);
          }
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [leagueId, season]);

  useEffect(() => {
    if (!selectedRound) return;
    setLoading(true);
    fetchLeagueFixtures(leagueId, season, selectedRound)
      .then(setMatches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [leagueId, season, selectedRound]);

  // Group rounds by stage for tournaments
  const groupStageRounds = isTournament ? rounds.filter(r => r.toLowerCase().includes('group')) : [];
  const knockoutRounds = isTournament ? rounds.filter(r => !r.toLowerCase().includes('group')) : [];

  return (
    <div>
      {/* Tournament matchday buttons */}
      {isTournament && groupStageRounds.length > 0 && (
        <div className="px-4 py-3 border-b border-border">
          <div className="flex gap-1.5 mb-2 overflow-x-auto no-scrollbar pb-1">
            {groupStageRounds.map(r => (
              <button
                key={r}
                onClick={() => setSelectedRound(r)}
                className={cn('px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all',
                  selectedRound === r ? 'bg-[#00ff87] text-black' : 'bg-[#111] text-[#555] border border-[#222] hover:text-[#888]',
                )}
              >
                {r.replace('Group Stage - ', 'Group Stage ')}
              </button>
            ))}
          </div>
          {knockoutRounds.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {knockoutRounds.map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRound(r)}
                  className={cn('px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all',
                    selectedRound === r ? 'bg-amber-400 text-black' : 'bg-[#111] text-[#555] border border-[#222] hover:text-[#888]',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* League/Cup round dropdown (non-tournament) */}
      {!isTournament && rounds.length > 0 && (
        <div className="px-4 py-3 border-b border-border">
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value)}
            className="bg-secondary text-foreground text-sm rounded-lg px-3 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {rounds.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Loading fixtures...</span>
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No fixtures available for this round</div>
      ) : (
        <div className="divide-y divide-border/50">
          {matches.map(match => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
