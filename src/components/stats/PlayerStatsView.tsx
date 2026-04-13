import { useState, useEffect } from 'react';
import { PlayerStat, fetchTopScorers, fetchTopAssists, fetchTopYellowCards, fetchTopRedCards } from '@/services/footballApi';

interface PlayerStatsViewProps {
  leagueId: number;
  season: number;
}

const STAT_CATEGORIES = [
  { key: 'goals', label: 'Goals', fetchFn: fetchTopScorers, valueKey: 'goals', penaltyKey: 'penalties' },
  { key: 'assists', label: 'Assists', fetchFn: fetchTopAssists, valueKey: 'assists' },
  { key: 'yellowCards', label: 'Yellow Cards', fetchFn: fetchTopYellowCards, valueKey: 'yellowCards' },
  { key: 'redCards', label: 'Red Cards', fetchFn: fetchTopRedCards, valueKey: 'redCards' },
] as const;

type CategoryKey = typeof STAT_CATEGORIES[number]['key'];

export default function PlayerStatsView({ leagueId, season }: PlayerStatsViewProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('goals');
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);

  const currentCategory = STAT_CATEGORIES.find(c => c.key === activeCategory)!;

  useEffect(() => {
    setLoading(true);
    currentCategory.fetchFn(leagueId, season)
      .then(setPlayers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [leagueId, season, activeCategory]);

  const getValue = (p: PlayerStat): string => {
    const val = p[currentCategory.valueKey as keyof PlayerStat] as number;
    if ('penaltyKey' in currentCategory && currentCategory.penaltyKey) {
      const pen = p[currentCategory.penaltyKey as keyof PlayerStat] as number;
      return pen > 0 ? `${val}(${pen})` : String(val);
    }
    return String(val);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-0">
      {/* Category sidebar */}
      <div className="flex sm:flex-col overflow-x-auto sm:overflow-x-visible sm:w-36 shrink-0 border-b sm:border-b-0 sm:border-r border-border">
        {STAT_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap text-left transition-colors ${
              activeCategory === cat.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Player rankings */}
      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No data available</div>
        ) : (
          <div>
            {/* Table header */}
            <div className="flex items-center px-3 py-2 border-b border-border text-xs text-muted-foreground">
              <span className="w-8 text-center">#</span>
              <span className="flex-1 ml-2">Player</span>
              <span className="w-28 truncate hidden sm:block">Team</span>
              <span className="w-16 text-right">{currentCategory.label}</span>
            </div>
            {players.map((p, i) => (
              <div
                key={p.player.id}
                className="flex items-center px-3 py-2.5 border-b border-border/50 hover:bg-secondary/30 transition-colors"
              >
                <span className="w-8 text-center text-sm text-muted-foreground tabular-nums">{i + 1}</span>
                <div className="flex items-center gap-2 flex-1 ml-2 min-w-0">
                  {p.player.photo && (
                    <img src={p.player.photo} alt="" className="w-7 h-7 rounded-full object-cover bg-muted" />
                  )}
                  <span className="font-medium text-sm text-foreground truncate">{p.player.name}</span>
                </div>
                <span className="w-28 text-sm text-muted-foreground truncate hidden sm:block">{p.team.name}</span>
                <span className="w-16 text-right text-sm font-semibold text-foreground tabular-nums">{getValue(p)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
