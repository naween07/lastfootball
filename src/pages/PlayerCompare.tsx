import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import OptimizedImage from '@/components/OptimizedImage';
import { searchPlayers, fetchPlayerProfile, PlayerProfile } from '@/services/footballApi';
import { Search, X, Loader2, ArrowLeftRight, Swords, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PlayerCompare() {
  const [player1, setPlayer1] = useState<PlayerProfile | null>(null);
  const [player2, setPlayer2] = useState<PlayerProfile | null>(null);
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Player Comparison Tool — LastFootball"
        description="Compare any two football players side by side. Goals, assists, ratings, passes, tackles and more."
        path="/compare"
      />
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-b from-card to-background border-b border-border">
        <div className="container max-w-4xl py-5 text-center">
          <h1 className="text-xl sm:text-2xl font-black text-foreground flex items-center justify-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            Player Comparison
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Search and compare any two players side by side</p>
        </div>
      </div>

      {/* Player Selector Cards */}
      <div className="container max-w-4xl px-4 py-5">
        <div className="grid grid-cols-2 gap-3">
          <PlayerSlot
            player={player1}
            slot={1}
            isActive={activeSlot === 1}
            onSelect={() => setActiveSlot(1)}
            onClear={() => setPlayer1(null)}
          />
          <PlayerSlot
            player={player2}
            slot={2}
            isActive={activeSlot === 2}
            onSelect={() => setActiveSlot(2)}
            onClear={() => setPlayer2(null)}
          />
        </div>
      </div>

      {/* Search Bar */}
      <div className="container max-w-4xl px-4 pb-4">
        <PlayerSearch
          onSelect={(p) => {
            if (activeSlot === 1) { setPlayer1(p); setActiveSlot(2); }
            else { setPlayer2(p); }
          }}
        />
      </div>

      {/* Comparison */}
      {player1 && player2 && (
        <div className="container max-w-4xl px-4 pb-20 md:pb-6">
          <ComparisonView player1={player1} player2={player2} />
        </div>
      )}

      {/* Empty state */}
      {(!player1 || !player2) && (
        <div className="container max-w-4xl px-4 text-center py-10">
          <p className="text-sm text-muted-foreground">
            {!player1 && !player2
              ? 'Search and select two players to compare'
              : `Now select the ${activeSlot === 1 ? 'first' : 'second'} player`
            }
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Player Slot Card ───────────────────────────────────────────────────────
function PlayerSlot({ player, slot, isActive, onSelect, onClear }: {
  player: PlayerProfile | null;
  slot: 1 | 2;
  isActive: boolean;
  onSelect: () => void;
  onClear: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative rounded-xl border p-4 text-center transition-all',
        isActive ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card hover:border-primary/30',
      )}
    >
      {player ? (
        <>
          <img src={player.photo} alt="" className="w-16 h-16 rounded-full object-cover mx-auto mb-2 ring-2 ring-border" />
          <p className="text-sm font-bold text-foreground truncate">{player.name}</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            {player.team.logo && <img src={player.team.logo} alt="" className="w-3.5 h-3.5 object-contain" />}
            <span className="text-[11px] text-muted-foreground">{player.team.name}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">{player.position} · {player.nationality}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute top-2 right-2 p-1 rounded-full bg-secondary hover:bg-destructive/20 transition-colors"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-2 flex items-center justify-center">
            <span className="text-2xl text-muted-foreground/30">{slot}</span>
          </div>
          <p className="text-sm text-muted-foreground">Select Player {slot}</p>
        </>
      )}
    </button>
  );
}

// ─── Player Search ──────────────────────────────────────────────────────────
function PlayerSearch({ onSelect }: { onSelect: (player: PlayerProfile) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: number; name: string; photo: string; team: string; teamLogo: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlayer, setLoadingPlayer] = useState(false);

  useEffect(() => {
    if (query.length < 3) { setResults([]); return; }
    setLoading(true);
    const timeout = setTimeout(() => {
      searchPlayers(query).then(setResults).finally(() => setLoading(false));
    }, 500);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = async (id: number) => {
    setLoadingPlayer(true);
    const profile = await fetchPlayerProfile(id);
    if (profile) onSelect(profile);
    setLoadingPlayer(false);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search player name (e.g. Haaland, Mbappé, Salah)..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30"
        />
        {(loading || loadingPlayer) && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
      </div>

      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 max-h-[280px] overflow-y-auto">
          {results.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors text-left"
            >
              <img src={p.photo} alt="" className="w-8 h-8 rounded-full object-cover bg-secondary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                <div className="flex items-center gap-1">
                  {p.teamLogo && <img src={p.teamLogo} alt="" className="w-3 h-3 object-contain" />}
                  <span className="text-[11px] text-muted-foreground">{p.team}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Comparison View ────────────────────────────────────────────────────────
function ComparisonView({ player1, player2 }: { player1: PlayerProfile; player2: PlayerProfile }) {
  const s1 = player1.stats;
  const s2 = player2.stats;

  const sections = [
    {
      title: 'Attack',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      stats: [
        { label: 'Goals', v1: s1.goals, v2: s2.goals },
        { label: 'Assists', v1: s1.assists, v2: s2.assists },
        { label: 'Shots', v1: s1.shots, v2: s2.shots },
        { label: 'Shots on Target', v1: s1.shotsOn, v2: s2.shotsOn },
        { label: 'Key Passes', v1: s1.keyPasses, v2: s2.keyPasses },
        { label: 'Dribbles', v1: s1.dribblesSuccess, v2: s2.dribblesSuccess },
        { label: 'Penalties Scored', v1: s1.penaltyScored, v2: s2.penaltyScored },
      ],
    },
    {
      title: 'Defense',
      icon: <Shield className="w-4 h-4 text-blue-400" />,
      stats: [
        { label: 'Tackles', v1: s1.tackles, v2: s2.tackles },
        { label: 'Interceptions', v1: s1.interceptions, v2: s2.interceptions },
        { label: 'Duels Won', v1: s1.duelsWon, v2: s2.duelsWon },
        { label: 'Fouls Committed', v1: s1.foulsCommitted, v2: s2.foulsCommitted, lower: true },
      ],
    },
    {
      title: 'General',
      icon: <Swords className="w-4 h-4 text-primary" />,
      stats: [
        { label: 'Appearances', v1: s1.appearances, v2: s2.appearances },
        { label: 'Minutes', v1: s1.minutes, v2: s2.minutes },
        { label: 'Rating', v1: parseFloat(s1.rating || '0'), v2: parseFloat(s2.rating || '0') },
        { label: 'Passes', v1: s1.passes, v2: s2.passes },
        { label: 'Pass Accuracy %', v1: s1.passAccuracy, v2: s2.passAccuracy },
        { label: 'Yellow Cards', v1: s1.yellowCards, v2: s2.yellowCards, lower: true },
        { label: 'Red Cards', v1: s1.redCards, v2: s2.redCards, lower: true },
      ],
    },
  ];

  // Count who wins more categories
  let p1Wins = 0, p2Wins = 0;
  sections.forEach(sec => sec.stats.forEach(s => {
    const better1 = s.lower ? s.v1 < s.v2 : s.v1 > s.v2;
    const better2 = s.lower ? s.v2 < s.v1 : s.v2 > s.v1;
    if (better1) p1Wins++;
    if (better2) p2Wins++;
  }));

  return (
    <div className="space-y-4">
      {/* Header comparison */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-sm font-bold text-foreground">{player1.name}</p>
            <p className="text-[11px] text-muted-foreground">{player1.team.name}</p>
          </div>
          <div className="text-center px-4">
            <div className="flex items-center gap-2">
              <span className={cn('text-2xl font-black tabular-nums', p1Wins > p2Wins ? 'text-primary' : 'text-muted-foreground')}>{p1Wins}</span>
              <span className="text-muted-foreground/30">-</span>
              <span className={cn('text-2xl font-black tabular-nums', p2Wins > p1Wins ? 'text-primary' : 'text-muted-foreground')}>{p2Wins}</span>
            </div>
            <p className="text-[9px] text-muted-foreground uppercase">Stats Won</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-sm font-bold text-foreground">{player2.name}</p>
            <p className="text-[11px] text-muted-foreground">{player2.team.name}</p>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3">
        <InfoCard player={player1} />
        <InfoCard player={player2} />
      </div>

      {/* Stats sections */}
      {sections.map(section => (
        <div key={section.title} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
            {section.icon}
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{section.title}</h3>
          </div>
          <div className="divide-y divide-border/10">
            {section.stats.map(stat => (
              <ComparisonBar
                key={stat.label}
                label={stat.label}
                v1={stat.v1}
                v2={stat.v2}
                lower={stat.lower}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Info Card ──────────────────────────────────────────────────────────────
function InfoCard({ player }: { player: PlayerProfile }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-14">Position</span>
        <span className="text-xs font-semibold text-foreground">{player.position}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-14">Age</span>
        <span className="text-xs font-semibold text-foreground">{player.age}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-14">Nation</span>
        <span className="text-xs font-semibold text-foreground">{player.nationality}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-14">Height</span>
        <span className="text-xs font-semibold text-foreground">{player.height || '-'}</span>
      </div>
    </div>
  );
}

// ─── Comparison Bar ─────────────────────────────────────────────────────────
function ComparisonBar({ label, v1, v2, lower }: { label: string; v1: number; v2: number; lower?: boolean }) {
  const max = Math.max(v1, v2, 1);
  const p1Better = lower ? v1 < v2 : v1 > v2;
  const p2Better = lower ? v2 < v1 : v2 > v1;
  const equal = v1 === v2;

  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className={cn(
          'text-sm font-bold tabular-nums',
          p1Better ? 'text-primary' : equal ? 'text-foreground' : 'text-muted-foreground',
        )}>
          {label === 'Rating' ? v1.toFixed(1) : v1}
        </span>
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
        <span className={cn(
          'text-sm font-bold tabular-nums',
          p2Better ? 'text-primary' : equal ? 'text-foreground' : 'text-muted-foreground',
        )}>
          {label === 'Rating' ? v2.toFixed(1) : v2}
        </span>
      </div>
      <div className="flex gap-1 h-2">
        <div className="flex-1 bg-secondary rounded-l-full overflow-hidden flex justify-end">
          <div
            className={cn('h-full rounded-l-full transition-all', p1Better ? 'bg-primary' : 'bg-muted-foreground/30')}
            style={{ width: `${(v1 / max) * 100}%` }}
          />
        </div>
        <div className="flex-1 bg-secondary rounded-r-full overflow-hidden">
          <div
            className={cn('h-full rounded-r-full transition-all', p2Better ? 'bg-primary' : 'bg-muted-foreground/30')}
            style={{ width: `${(v2 / max) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
