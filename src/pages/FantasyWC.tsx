import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import OptimizedImage from '@/components/OptimizedImage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { callApi } from '@/services/footballApi';
import { Trophy, Users, Star, Search, X, Loader2, Shield, ChevronRight, Coins, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Player Prices (by rating/reputation) ───────────────────────────────────
function getPlayerPrice(position: string, rating?: number): number {
  const base = position === 'Goalkeeper' ? 5 : position === 'Defender' ? 6 : position === 'Midfielder' ? 7 : 8;
  if (rating && rating >= 8) return base + 7;
  if (rating && rating >= 7) return base + 4;
  if (rating && rating >= 6) return base + 2;
  return base;
}

function positionShort(pos: string): string {
  if (pos.includes('Goal')) return 'GK';
  if (pos.includes('Defend')) return 'DEF';
  if (pos.includes('Mid')) return 'MID';
  if (pos.includes('Attack') || pos.includes('Forward')) return 'FWD';
  return 'MID';
}

const SQUAD_LIMITS = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
const STARTING_LIMITS = { GK: 1, DEF: 4, MID: 4, FWD: 2 };

// WC 2026 Nations with API team IDs
const WC_NATIONS = [
  { name: 'Argentina', id: 26, flag: 'ar' }, { name: 'Brazil', id: 6, flag: 'br' },
  { name: 'France', id: 2, flag: 'fr' }, { name: 'England', id: 10, flag: 'gb-eng' },
  { name: 'Germany', id: 25, flag: 'de' }, { name: 'Spain', id: 9, flag: 'es' },
  { name: 'Portugal', id: 27, flag: 'pt' }, { name: 'Netherlands', id: 1118, flag: 'nl' },
  { name: 'Italy', id: 768, flag: 'it' }, { name: 'Croatia', id: 3, flag: 'hr' },
  { name: 'Morocco', id: 31, flag: 'ma' }, { name: 'Japan', id: 12, flag: 'jp' },
  { name: 'USA', id: 2384, flag: 'us' }, { name: 'Mexico', id: 16, flag: 'mx' },
  { name: 'Colombia', id: 1580, flag: 'co' }, { name: 'Uruguay', id: 7, flag: 'uy' },
];

interface SquadPlayer {
  player_id: number;
  player_name: string;
  player_photo: string;
  team_name: string;
  team_logo: string;
  nation: string;
  nation_flag: string;
  position: string;
  price: number;
  is_starting: boolean;
  is_captain: boolean;
  is_vice_captain: boolean;
  points: number;
}

type ViewMode = 'pitch' | 'market' | 'leaderboard';

export default function FantasyWC() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>('pitch');
  const [teamName, setTeamName] = useState('My Fantasy XI');
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [budget, setBudget] = useState(100);
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState<string | null>(null);

  // Market state
  const [marketPlayers, setMarketPlayers] = useState<any[]>([]);
  const [marketSearch, setMarketSearch] = useState('');
  const [marketNation, setMarketNation] = useState<number | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketPosition, setMarketPosition] = useState<string | null>(null);

  // Load user's fantasy team
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      const { data: team } = await supabase.from('fantasy_teams').select('*').eq('user_id', user.id).single();
      if (team) {
        setTeamId(team.id);
        setTeamName(team.team_name);
        setBudget(Number(team.budget_remaining));
        const { data: players } = await supabase.from('fantasy_squad').select('*').eq('team_id', team.id);
        if (players) setSquad(players);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  // Create fantasy team
  const createTeam = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('fantasy_teams').insert({ user_id: user.id, team_name: teamName }).select().single();
    if (error) return toast.error(error.message);
    setTeamId(data.id);
    toast.success('Fantasy team created!');
  };

  // Search players from API
  const searchMarket = async (nationId?: number) => {
    setMarketLoading(true);
    try {
      const params: Record<string, string> = { league: '1', season: '2026' };
      if (nationId) params.team = String(nationId);
      const data = await callApi('players/squads', { team: String(nationId || 26) });
      if (data?.[0]?.players) {
        setMarketPlayers(data[0].players.map((p: any) => ({
          id: p.id,
          name: p.name,
          photo: p.photo,
          position: p.position,
          number: p.number,
          age: p.age,
        })));
      }
    } catch {}
    setMarketLoading(false);
  };

  // Add player to squad
  const addPlayer = async (player: any, nation: typeof WC_NATIONS[0]) => {
    if (!teamId || !user) return toast.error('Create your team first');
    const pos = positionShort(player.position);
    const price = getPlayerPrice(player.position);

    // Check limits
    const posCount = squad.filter(p => p.position === pos).length;
    if (posCount >= SQUAD_LIMITS[pos as keyof typeof SQUAD_LIMITS]) return toast.error(`Max ${SQUAD_LIMITS[pos as keyof typeof SQUAD_LIMITS]} ${pos} players allowed`);
    if (squad.length >= 15) return toast.error('Squad full (15 players max)');
    if (budget < price) return toast.error(`Not enough budget (need ${price}M, have ${budget.toFixed(1)}M)`);
    if (squad.find(p => p.player_id === player.id)) return toast.error('Player already in squad');

    const newPlayer: SquadPlayer = {
      player_id: player.id,
      player_name: player.name,
      player_photo: player.photo,
      team_name: nation.name,
      team_logo: '',
      nation: nation.name,
      nation_flag: nation.flag,
      position: pos,
      price,
      is_starting: squad.filter(p => p.position === pos && p.is_starting).length < STARTING_LIMITS[pos as keyof typeof STARTING_LIMITS],
      is_captain: false,
      is_vice_captain: false,
      points: 0,
    };

    const { error } = await supabase.from('fantasy_squad').insert({
      team_id: teamId,
      user_id: user.id,
      ...newPlayer,
    });
    if (error) return toast.error(error.message);

    setSquad([...squad, newPlayer]);
    const newBudget = budget - price;
    setBudget(newBudget);
    await supabase.from('fantasy_teams').update({ budget_remaining: newBudget }).eq('id', teamId);
    toast.success(`${player.name} added! (${price}M)`);
  };

  // Remove player
  const removePlayer = async (playerId: number) => {
    if (!teamId) return;
    const player = squad.find(p => p.player_id === playerId);
    if (!player) return;

    await supabase.from('fantasy_squad').delete().eq('team_id', teamId).eq('player_id', playerId);
    setSquad(squad.filter(p => p.player_id !== playerId));
    const newBudget = budget + player.price;
    setBudget(newBudget);
    await supabase.from('fantasy_teams').update({ budget_remaining: newBudget }).eq('id', teamId);
    toast.success(`${player.player_name} removed (+${player.price}M)`);
  };

  // Set captain
  const setCaptain = async (playerId: number) => {
    if (!teamId) return;
    const updated = squad.map(p => ({ ...p, is_captain: p.player_id === playerId, is_vice_captain: p.is_captain ? false : p.is_vice_captain }));
    setSquad(updated);
    await supabase.from('fantasy_squad').update({ is_captain: false }).eq('team_id', teamId);
    await supabase.from('fantasy_squad').update({ is_captain: true }).eq('team_id', teamId).eq('player_id', playerId);
    await supabase.from('fantasy_teams').update({ captain_id: playerId }).eq('id', teamId);
    toast.success('Captain set!');
  };

  const starters = squad.filter(p => p.is_starting);
  const bench = squad.filter(p => !p.is_starting);
  const totalPoints = squad.reduce((s, p) => s + p.points, 0);

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SEOHead title="Fantasy World Cup 2026 — Build Your Dream Team | LastFootball" description="Build your FIFA World Cup 2026 fantasy team. Pick 15 players, manage your budget, compete globally." path="/fantasy" />
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#1a1a1a]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00ff87]/5 via-transparent to-amber-500/5" />
        <div className="container max-w-5xl py-5 relative">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-[#00ff87]" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#00ff87] font-bold">LASTFOOTBALL FANTASY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">World Cup 2026</h1>
          <p className="text-sm text-[#666] mt-1">Build your dream team · 100M budget · Compete globally</p>

          {user && teamId && (
            <div className="flex items-center gap-4 mt-3">
              <div className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5">
                <p className="text-[9px] text-[#555] uppercase tracking-widest">BUDGET</p>
                <p className="text-lg font-black text-[#00ff87] tabular-nums">{budget.toFixed(1)}M</p>
              </div>
              <div className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5">
                <p className="text-[9px] text-[#555] uppercase tracking-widest">SQUAD</p>
                <p className="text-lg font-black text-white tabular-nums">{squad.length}/15</p>
              </div>
              <div className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5">
                <p className="text-[9px] text-[#555] uppercase tracking-widest">POINTS</p>
                <p className="text-lg font-black text-amber-400 tabular-nums">{totalPoints}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="sticky top-14 z-30 bg-[#0a0a0a] border-b border-[#1a1a1a]">
        <div className="container max-w-5xl flex gap-1 py-2">
          {([
            { key: 'pitch' as ViewMode, label: 'MY SQUAD', icon: Shield },
            { key: 'market' as ViewMode, label: 'TRANSFERS', icon: Search },
            { key: 'leaderboard' as ViewMode, label: 'RANKINGS', icon: Crown },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setView(tab.key)}
              className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all',
                view === tab.key ? 'bg-[#00ff87]/10 text-[#00ff87] border border-[#00ff87]/20' : 'text-[#555] hover:text-[#888]',
              )}>
              <tab.icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="container max-w-5xl py-4 pb-20 md:pb-6">

        {/* Not logged in */}
        {!user && (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 text-[#00ff87]/20 mx-auto mb-4" />
            <h2 className="text-xl font-black text-white mb-2">Join Fantasy World Cup</h2>
            <p className="text-sm text-[#666] mb-6">Create a free account to build your dream team</p>
            <Link to="/auth" className="px-6 py-3 rounded-lg bg-[#00ff87] text-black font-bold text-sm">Sign In to Play</Link>
          </div>
        )}

        {/* No team yet */}
        {user && !teamId && !loading && (
          <div className="text-center py-16">
            <Shield className="w-16 h-16 text-[#00ff87]/20 mx-auto mb-4" />
            <h2 className="text-xl font-black text-white mb-2">Create Your Fantasy Team</h2>
            <p className="text-sm text-[#666] mb-4">Name your team and start building your World Cup XI</p>
            <input
              type="text" value={teamName} onChange={e => setTeamName(e.target.value)}
              placeholder="Team name..."
              className="w-full max-w-xs mx-auto mb-4 px-4 py-3 rounded-lg bg-[#111] border border-[#222] text-white text-center text-sm focus:outline-none focus:border-[#00ff87]/50"
            />
            <br />
            <button onClick={createTeam} className="px-6 py-3 rounded-lg bg-[#00ff87] text-black font-bold text-sm">
              Create Team
            </button>
          </div>
        )}

        {/* ─── PITCH VIEW ────────────────────────────────────────────── */}
        {user && teamId && view === 'pitch' && (
          <div>
            {/* Football pitch */}
            <div className="relative bg-gradient-to-b from-[#1a3a1a] to-[#0d2a0d] rounded-xl border border-[#2a4a2a] overflow-hidden mb-4" style={{ minHeight: '400px' }}>
              {/* Pitch lines */}
              <div className="absolute inset-0">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/10" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-44 h-16 border-t border-l border-r border-white/10" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-16 border-b border-l border-r border-white/10" />
              </div>

              {/* Players on pitch */}
              <div className="relative z-10 flex flex-col items-center gap-2 py-4">
                {/* FWD */}
                <div className="flex justify-center gap-8">
                  {starters.filter(p => p.position === 'FWD').map(p => (
                    <PlayerOnPitch key={p.player_id} player={p} onRemove={removePlayer} onCaptain={setCaptain} />
                  ))}
                  {Array.from({ length: Math.max(0, STARTING_LIMITS.FWD - starters.filter(p => p.position === 'FWD').length) }).map((_, i) => (
                    <EmptySlot key={`fwd-${i}`} position="FWD" onClick={() => { setView('market'); setMarketPosition('FWD'); }} />
                  ))}
                </div>
                {/* MID */}
                <div className="flex justify-center gap-6 mt-4">
                  {starters.filter(p => p.position === 'MID').map(p => (
                    <PlayerOnPitch key={p.player_id} player={p} onRemove={removePlayer} onCaptain={setCaptain} />
                  ))}
                  {Array.from({ length: Math.max(0, STARTING_LIMITS.MID - starters.filter(p => p.position === 'MID').length) }).map((_, i) => (
                    <EmptySlot key={`mid-${i}`} position="MID" onClick={() => { setView('market'); setMarketPosition('MID'); }} />
                  ))}
                </div>
                {/* DEF */}
                <div className="flex justify-center gap-5 mt-4">
                  {starters.filter(p => p.position === 'DEF').map(p => (
                    <PlayerOnPitch key={p.player_id} player={p} onRemove={removePlayer} onCaptain={setCaptain} />
                  ))}
                  {Array.from({ length: Math.max(0, STARTING_LIMITS.DEF - starters.filter(p => p.position === 'DEF').length) }).map((_, i) => (
                    <EmptySlot key={`def-${i}`} position="DEF" onClick={() => { setView('market'); setMarketPosition('DEF'); }} />
                  ))}
                </div>
                {/* GK */}
                <div className="flex justify-center mt-4">
                  {starters.filter(p => p.position === 'GK').map(p => (
                    <PlayerOnPitch key={p.player_id} player={p} onRemove={removePlayer} onCaptain={setCaptain} />
                  ))}
                  {starters.filter(p => p.position === 'GK').length < 1 && (
                    <EmptySlot position="GK" onClick={() => { setView('market'); setMarketPosition('GK'); }} />
                  )}
                </div>
              </div>
            </div>

            {/* Bench */}
            {bench.length > 0 && (
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
                <h3 className="text-[10px] uppercase tracking-widest text-[#555] font-bold mb-2">SUBSTITUTES</h3>
                <div className="flex gap-3 overflow-x-auto no-scrollbar">
                  {bench.map(p => (
                    <div key={p.player_id} className="flex-shrink-0 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden mx-auto">
                        {p.player_photo && <img src={p.player_photo} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <p className="text-[9px] text-[#888] mt-1 truncate max-w-[60px]">{p.player_name.split(' ').pop()}</p>
                      <p className="text-[8px] text-[#444]">{p.position}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TRANSFER MARKET ───────────────────────────────────────── */}
        {user && teamId && view === 'market' && (
          <div>
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-[#00ff87]" /> PLAYER MARKET
            </h2>

            {/* Nation filter */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar pb-1">
              {WC_NATIONS.map(n => (
                <button key={n.id} onClick={() => { setMarketNation(n.id); searchMarket(n.id); }}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all',
                    marketNation === n.id ? 'bg-[#00ff87] text-black' : 'bg-[#111] text-[#555] border border-[#222]',
                  )}>
                  <img src={`https://flagcdn.com/w20/${n.flag}.png`} alt="" className="w-4 h-3 object-cover rounded-sm" />
                  {n.name}
                </button>
              ))}
            </div>

            {/* Player list */}
            {marketLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#00ff87]" /></div>
            ) : marketPlayers.length === 0 ? (
              <p className="text-sm text-[#555] text-center py-12">Select a nation to browse players</p>
            ) : (
              <div className="space-y-1.5">
                {marketPlayers
                  .filter(p => !marketPosition || positionShort(p.position) === marketPosition)
                  .map(p => {
                    const pos = positionShort(p.position);
                    const price = getPlayerPrice(p.position);
                    const inSquad = squad.some(s => s.player_id === p.id);
                    const nation = WC_NATIONS.find(n => n.id === marketNation)!;

                    return (
                      <div key={p.id} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors',
                        inSquad ? 'bg-[#00ff87]/5 border-[#00ff87]/20' : 'bg-[#111] border-[#1e1e1e] hover:border-[#2a2a2a]',
                      )}>
                        <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden flex-shrink-0">
                          {p.photo && <img src={p.photo} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                          <p className="text-[10px] text-[#555]">{pos} · #{p.number}</p>
                        </div>
                        <span className="text-xs font-bold text-[#00ff87] tabular-nums">{price}M</span>
                        {inSquad ? (
                          <span className="text-[9px] text-[#00ff87] font-bold px-2 py-1 bg-[#00ff87]/10 rounded">ADDED</span>
                        ) : (
                          <button onClick={() => addPlayer(p, nation)}
                            className="text-[9px] font-bold px-3 py-1.5 bg-[#00ff87] text-black rounded hover:opacity-90 transition-opacity">
                            ADD
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ─── LEADERBOARD ───────────────────────────────────────────── */}
        {view === 'leaderboard' && (
          <FantasyLeaderboard userId={user?.id} />
        )}

      </main>
    </div>
  );
}

// ─── Player on Pitch ────────────────────────────────────────────────────────
function PlayerOnPitch({ player, onRemove, onCaptain }: { player: SquadPlayer; onRemove: (id: number) => void; onCaptain: (id: number) => void }) {
  return (
    <div className="relative text-center group">
      <div className={cn(
        'w-14 h-14 rounded-full border-2 overflow-hidden mx-auto transition-all',
        player.is_captain ? 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]' : 'border-white/20',
      )}>
        {player.player_photo ? (
          <img src={player.player_photo} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center text-[10px] text-[#555]">{player.position}</div>
        )}
      </div>
      {player.is_captain && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
          <span className="text-[8px] font-black text-black">C</span>
        </div>
      )}
      <p className="text-[9px] font-bold text-white mt-1 truncate max-w-[70px]">{player.player_name.split(' ').pop()}</p>
      <p className="text-[7px] text-[#555]">{player.price}M</p>

      {/* Hover actions */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:flex gap-1 bg-[#111] border border-[#222] rounded-lg px-1 py-0.5 z-20">
        <button onClick={() => onCaptain(player.player_id)} className="text-[8px] text-amber-400 hover:text-amber-300 px-1" title="Set Captain">C</button>
        <button onClick={() => onRemove(player.player_id)} className="text-[8px] text-red-400 hover:text-red-300 px-1" title="Remove">✕</button>
      </div>
    </div>
  );
}

// ─── Empty Slot ─────────────────────────────────────────────────────────────
function EmptySlot({ position, onClick }: { position: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-center group">
      <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#2a4a2a] flex items-center justify-center mx-auto hover:border-[#00ff87]/50 transition-colors">
        <span className="text-lg text-[#2a4a2a] group-hover:text-[#00ff87]/50">+</span>
      </div>
      <p className="text-[9px] text-[#2a4a2a] mt-1 font-bold">{position}</p>
    </button>
  );
}

// ─── Fantasy Leaderboard ────────────────────────────────────────────────────
function FantasyLeaderboard({ userId }: { userId?: string }) {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('fantasy_teams').select('*').order('total_points', { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setTeams(data); setLoading(false); });
  }, []);

  return (
    <div>
      <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Crown className="w-4 h-4 text-amber-400" /> GLOBAL RANKINGS
      </h2>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#00ff87]" /></div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-10 h-10 text-[#222] mx-auto mb-3" />
          <p className="text-sm text-[#555]">No fantasy teams yet. Be the first!</p>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#0d0d0d] text-[9px] uppercase tracking-widest text-[#444] font-bold">
            <span className="w-8 text-center">#</span>
            <span className="flex-1">MANAGER</span>
            <span className="w-14 text-center">SQUAD</span>
            <span className="w-14 text-center">PTS</span>
          </div>
          {teams.map((team, i) => (
            <div key={team.id} className={cn('flex items-center gap-2 px-4 py-2.5 border-t border-[#1a1a1a]', userId === team.user_id && 'bg-[#00ff87]/5')}>
              <span className={cn('w-8 text-center text-xs font-black tabular-nums',
                i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-[#555]',
              )}>
                {i <= 2 ? ['🥇', '🥈', '🥉'][i] : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold truncate', userId === team.user_id ? 'text-[#00ff87]' : 'text-white')}>{team.team_name}</p>
              </div>
              <span className="w-14 text-center text-xs text-[#555] tabular-nums">15</span>
              <span className="w-14 text-center text-sm font-black text-white tabular-nums">{team.total_points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
