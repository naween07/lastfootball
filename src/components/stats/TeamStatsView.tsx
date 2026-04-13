import { useState, useEffect } from 'react';
import { StandingTeam, fetchStandings } from '@/services/footballApi';

interface TeamStatsViewProps {
  leagueId: number;
  season: number;
}

type SortKey = 'goalsFor' | 'goalsAgainst' | 'goalsDiff' | 'win' | 'draw' | 'lose';

const SORT_OPTIONS: { key: SortKey; label: string; desc: boolean }[] = [
  { key: 'goalsFor', label: 'Most Goals', desc: true },
  { key: 'goalsAgainst', label: 'Best Defense', desc: false },
  { key: 'goalsDiff', label: 'Goal Difference', desc: true },
  { key: 'win', label: 'Most Wins', desc: true },
  { key: 'draw', label: 'Most Draws', desc: true },
  { key: 'lose', label: 'Most Losses', desc: true },
];

export default function TeamStatsView({ leagueId, season }: TeamStatsViewProps) {
  const [standings, setStandings] = useState<StandingTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('goalsFor');

  useEffect(() => {
    setLoading(true);
    fetchStandings(leagueId, season)
      .then(setStandings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [leagueId, season]);

  const currentSort = SORT_OPTIONS.find(o => o.key === sortBy)!;
  const sorted = [...standings].sort((a, b) => {
    const av = a[sortBy];
    const bv = b[sortBy];
    return currentSort.desc ? (bv as number) - (av as number) : (av as number) - (bv as number);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Loading team stats...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Sort tabs */}
      <div className="flex overflow-x-auto border-b border-border">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
              sortBy === opt.key
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No data available</div>
      ) : (
        <div>
          {sorted.map((team, i) => (
            <div
              key={team.team.id}
              className="flex items-center px-4 py-3 border-b border-border/50 hover:bg-secondary/30 transition-colors"
            >
              <span className="w-8 text-sm text-muted-foreground tabular-nums">{i + 1}</span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {team.team.logo && (
                  <img src={team.team.logo} alt="" className="w-6 h-6 object-contain" />
                )}
                <span className="font-medium text-sm text-foreground truncate">{team.team.name}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="text-center">
                  <div className="font-semibold text-sm text-foreground tabular-nums">{team[sortBy]}</div>
                  <div className="text-[10px]">{currentSort.label}</div>
                </div>
                <div className="text-center hidden sm:block">
                  <div className="tabular-nums">{team.played}</div>
                  <div className="text-[10px]">Played</div>
                </div>
                <div className="text-center hidden sm:block">
                  <div className="tabular-nums">{team.win}-{team.draw}-{team.lose}</div>
                  <div className="text-[10px]">W-D-L</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
