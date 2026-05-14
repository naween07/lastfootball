import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { callApi } from '@/services/footballApi';
import { Trophy, Search, X, Loader2, Shield, Crown, Coins, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function getPlayerPrice(pos: string): number {
  if (pos === 'GK') return 5;
  if (pos === 'DEF') return 6;
  if (pos === 'MID') return 7;
  return 9;
}

function posShort(pos: string): string {
  if (pos?.includes('Goal')) return 'GK';
  if (pos?.includes('Defend')) return 'DEF';
  if (pos?.includes('Mid')) return 'MID';
  return 'FWD';
}

const SQUAD_LIMITS: Record<string, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
const STARTING: Record<string, number> = { GK: 1, DEF: 4, MID: 4, FWD: 2 };

const NATIONS = [
  { name: 'Argentina', id: 26, flag: 'ar' }, { name: 'Brazil', id: 6, flag: 'br' },
  { name: 'France', id: 2, flag: 'fr' }, { name: 'England', id: 10, flag: 'gb-eng' },
  { name: 'Germany', id: 25, flag: 'de' }, { name: 'Spain', id: 9, flag: 'es' },
  { name: 'Portugal', id: 27, flag: 'pt' }, { name: 'Netherlands', id: 1118, flag: 'nl' },
  { name: 'Italy', id: 768, flag: 'it' }, { name: 'Croatia', id: 3, flag: 'hr' },
  { name: 'Morocco', id: 31, flag: 'ma' }, { name: 'Japan', id: 12, flag: 'jp' },
  { name: 'USA', id: 2384, flag: 'us' }, { name: 'Mexico', id: 16, flag: 'mx' },
  { name: 'Colombia', id: 1580, flag: 'co' }, { name: 'South Korea', id: 17, flag: 'kr' },
  { name: 'Turkey', id: 135, flag: 'tr' }, { name: 'Nigeria', id: 1024, flag: 'ng' },
  { name: 'Senegal', id: 20, flag: 'sn' }, { name: 'Australia', id: 24, flag: 'au' },
];

interface SPlayer {
  player_id: number; player_name: string; player_photo: string;
  team_name: string; nation: string; nation_flag: string;
  position: string; price: number; is_starting: boolean;
  is_captain: boolean; is_vice_captain: boolean; points: number;
}

export default function FantasyWC() {
  const { user } = useAuth();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('My Fantasy XI');
  const [squad, setSquad] = useState<SPlayer[]>([]);
  const [budget, setBudget] = useState(100);
  const [loading, setLoading] = useState(true);

  // Panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<string | null>(null);
  const [panelNation, setPanelNation] = useState<number | null>(null);
  const [panelSearch, setPanelSearch] = useState('');
  const [panelPlayers, setPanelPlayers] = useState<any[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Load team
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data: team } = await supabase.from('fantasy_teams').select('*').eq('user_id', user.id).single();
      if (team) {
        setTeamId(team.id);
        setTeamName(team.team_name);
        setBudget(Number(team.budget_remaining));
        const { data: players } = await supabase.from('fantasy_squad').select('*').eq('team_id', team.id);
        if (players) setSquad(players);
      }
      setLoading(false);
    })();
  }, [user]);

  const createTeam = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('fantasy_teams').insert({ user_id: user.id, team_name: teamName }).select().single();
    if (error) return toast.error(error.message);
    setTeamId(data.id);
    toast.success('Team created!');
  };

  // Open player panel for a position
  const openPanel = (pos: string) => {
    setPanelPosition(pos);
    setPanelOpen(true);
    setPanelNation(null);
    setPanelPlayers([]);
    setPanelSearch('');
  };

  // Fetch players by nation
  const fetchNation = async (nationId: number) => {
    setPanelNation(nationId);
    setPanelLoading(true);
    try {
      const data = await callApi('players/squads', { team: String(nationId) });
      if (data?.[0]?.players) setPanelPlayers(data[0].players);
      else setPanelPlayers([]);
    } catch { setPanelPlayers([]); }
    setPanelLoading(false);
  };

  // Filtered panel players
  const filteredPlayers = useMemo(() => {
    let list = panelPlayers;
    if (panelPosition) list = list.filter(p => posShort(p.position) === panelPosition);
    if (panelSearch) {
      const q = panelSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [panelPlayers, panelPosition, panelSearch]);

  // Add player
  const addPlayer = async (player: any) => {
    if (!teamId || !user) return toast.error('Create team first');
    const pos = posShort(player.position);
    const price = getPlayerPrice(pos);
    const nation = NATIONS.find(n => n.id === panelNation);

    if (squad.find(p => p.player_id === player.id)) return toast.error('Already in squad');
    if (squad.filter(p => p.position === pos).length >= SQUAD_LIMITS[pos]) return toast.error(`Max ${SQUAD_LIMITS[pos]} ${pos}`);
    if (squad.length >= 15) return toast.error('Squad full (15 max)');
    if (budget < price) return toast.error(`Need ${price}M, have ${budget.toFixed(1)}M`);

    const np: SPlayer = {
      player_id: player.id, player_name: player.name, player_photo: player.photo || '',
      team_name: nation?.name || '', nation: nation?.name || '', nation_flag: nation?.flag || '',
      position: pos, price, points: 0,
      is_starting: squad.filter(p => p.position === pos && p.is_starting).length < STARTING[pos],
      is_captain: false, is_vice_captain: false,
    };

    const { error } = await supabase.from('fantasy_squad').insert({ team_id: teamId, user_id: user.id, ...np });
    if (error) return toast.error(error.message);
    setSquad([...squad, np]);
    const nb = budget - price;
    setBudget(nb);
    await supabase.from('fantasy_teams').update({ budget_remaining: nb }).eq('id', teamId);
    toast.success(`${player.name} added (${price}M)`);
  };

  // Remove player
  const removePlayer = async (pid: number) => {
    if (!teamId) return;
    const p = squad.find(s => s.player_id === pid);
    if (!p) return;
    await supabase.from('fantasy_squad').delete().eq('team_id', teamId).eq('player_id', pid);
    setSquad(squad.filter(s => s.player_id !== pid));
    const nb = budget + p.price;
    setBudget(nb);
    await supabase.from('fantasy_teams').update({ budget_remaining: nb }).eq('id', teamId);
    toast.success(`${p.player_name} removed (+${p.price}M)`);
  };

  // Set captain
  const setCaptain = async (pid: number) => {
    if (!teamId) return;
    const updated = squad.map(p => ({ ...p, is_captain: p.player_id === pid }));
    setSquad(updated);
    await supabase.from('fantasy_squad').update({ is_captain: false }).eq('team_id', teamId);
    await supabase.from('fantasy_squad').update({ is_captain: true }).eq('team_id', teamId).eq('player_id', pid);
    toast.success('Captain set!');
  };

  const starters = squad.filter(p => p.is_starting);
  const bench = squad.filter(p => !p.is_starting);

  if (!user) return (
    <div className="min-h-screen bg-[#0a0a0a]"><Header />
      <div className="text-center py-20">
        <Trophy className="w-16 h-16 text-[#00ff87]/20 mx-auto mb-4" />
        <h2 className="text-xl font-black text-white mb-2">Fantasy World Cup 2026</h2>
        <p className="text-sm text-[#555] mb-6">Build your dream team · 100M budget · Compete globally</p>
        <Link to="/auth" className="px-6 py-3 rounded-lg bg-[#00ff87] text-black font-bold text-sm">Sign In to Play</Link>
      </div>
    </div>
  );

  if (!teamId && !loading) return (
    <div className="min-h-screen bg-[#0a0a0a]"><Header />
      <div className="text-center py-20">
        <Shield className="w-16 h-16 text-[#00ff87]/20 mx-auto mb-4" />
        <h2 className="text-xl font-black text-white mb-3">Create Your Team</h2>
        <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team name..."
          className="w-full max-w-xs mx-auto mb-4 px-4 py-3 rounded-lg bg-[#111] border border-[#222] text-white text-center text-sm focus:outline-none focus:border-[#00ff87]/50" />
        <br /><button onClick={createTeam} className="px-6 py-3 rounded-lg bg-[#00ff87] text-black font-bold text-sm">Create Team</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SEOHead title="Fantasy World Cup 2026 | LastFootball" description="Build your FIFA World Cup 2026 fantasy team." path="/fantasy" />
      <Header />

      {/* Stats bar */}
      <div className="bg-[#0d0d0d] border-b border-[#1a1a1a]">
        <div className="container max-w-6xl flex items-center gap-3 py-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#111] rounded-lg border border-[#1e1e1e]">
            <Coins className="w-3.5 h-3.5 text-[#00ff87]" />
            <span className="text-[10px] text-[#555] uppercase tracking-widest">Budget</span>
            <span className="text-sm font-black text-[#00ff87] tabular-nums">{budget.toFixed(1)}M</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#111] rounded-lg border border-[#1e1e1e]">
            <Shield className="w-3.5 h-3.5 text-white" />
            <span className="text-[10px] text-[#555] uppercase tracking-widest">Squad</span>
            <span className="text-sm font-black text-white tabular-nums">{squad.length}/15</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#111] rounded-lg border border-[#1e1e1e]">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-[#555] uppercase tracking-widest">Points</span>
            <span className="text-sm font-black text-amber-400 tabular-nums">{squad.reduce((s, p) => s + p.points, 0)}</span>
          </div>
          <button onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#111] rounded-lg border border-[#1e1e1e] text-[10px] text-[#555] uppercase tracking-widest hover:text-white transition-colors ml-auto">
            <Crown className="w-3.5 h-3.5 text-amber-400" /> Rankings
          </button>
        </div>
      </div>

      {showLeaderboard && (
        <div className="container max-w-6xl py-4"><FantasyLeaderboard userId={user?.id} /><button onClick={() => setShowLeaderboard(false)} className="text-xs text-[#555] mt-2 hover:text-white">Close Rankings</button></div>
      )}

      {/* ─── MAIN SPLIT LAYOUT ───────────────────────────────────────── */}
      <div className="container max-w-6xl py-4 pb-20 md:pb-6">
        <div className="flex gap-4 flex-col lg:flex-row">

          {/* LEFT — Pitch */}
          <div className="flex-1 min-w-0">
            <div className="relative bg-gradient-to-b from-[#1a3a1a] to-[#0d2a0d] rounded-xl border border-[#2a4a2a] overflow-hidden" style={{ minHeight: '420px' }}>
              {/* Pitch markings */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/10" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-14 border-t border-l border-r border-white/10 rounded-t-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-14 border-b border-l border-r border-white/10" />
              </div>

              <div className="relative z-10 flex flex-col items-center gap-3 py-5">
                {/* FWD row */}
                <PitchRow pos="FWD" starters={starters} limit={STARTING.FWD} onAdd={() => openPanel('FWD')} onRemove={removePlayer} onCaptain={setCaptain} />
                {/* MID row */}
                <PitchRow pos="MID" starters={starters} limit={STARTING.MID} onAdd={() => openPanel('MID')} onRemove={removePlayer} onCaptain={setCaptain} />
                {/* DEF row */}
                <PitchRow pos="DEF" starters={starters} limit={STARTING.DEF} onAdd={() => openPanel('DEF')} onRemove={removePlayer} onCaptain={setCaptain} />
                {/* GK row */}
                <PitchRow pos="GK" starters={starters} limit={STARTING.GK} onAdd={() => openPanel('GK')} onRemove={removePlayer} onCaptain={setCaptain} />
              </div>
            </div>

            {/* Bench */}
            {bench.length > 0 && (
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 mt-3">
                <p className="text-[9px] uppercase tracking-widest text-[#555] font-bold mb-2">SUBSTITUTES</p>
                <div className="flex gap-3 overflow-x-auto no-scrollbar">
                  {bench.map(p => (
                    <div key={p.player_id} className="flex-shrink-0 text-center group relative">
                      <div className="w-11 h-11 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden mx-auto">
                        {p.player_photo ? <img src={p.player_photo} alt="" className="w-full h-full object-cover" /> :
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-[#444]">{p.position}</div>}
                      </div>
                      <p className="text-[8px] text-[#888] mt-1 truncate max-w-[55px]">{p.player_name.split(' ').pop()}</p>
                      <button onClick={() => removePlayer(p.player_id)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white text-[8px] hidden group-hover:flex items-center justify-center">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Player Panel (always visible on desktop, slide-up on mobile) */}
          <div className={cn(
            'lg:w-[340px] flex-shrink-0',
            // Mobile: fixed bottom panel
            panelOpen ? 'fixed inset-x-0 bottom-0 z-40 max-h-[70vh] bg-[#0d0d0d] border-t border-[#222] rounded-t-2xl lg:static lg:max-h-none lg:border-t-0 lg:rounded-none' : 'hidden lg:block',
          )}>
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#00ff87]" />
                <span className="text-xs font-bold text-white uppercase tracking-widest">
                  {panelPosition ? `Select ${panelPosition}` : 'Player Market'}
                </span>
              </div>
              {/* Mobile close */}
              <button onClick={() => setPanelOpen(false)} className="lg:hidden p-1 text-[#555] hover:text-white">
                <X className="w-4 h-4" />
              </button>
              {/* Position filter on desktop */}
              <div className="hidden lg:flex gap-1">
                {['GK', 'DEF', 'MID', 'FWD'].map(pos => (
                  <button key={pos} onClick={() => setPanelPosition(panelPosition === pos ? null : pos)}
                    className={cn('px-2 py-0.5 rounded text-[9px] font-bold uppercase',
                      panelPosition === pos ? 'bg-[#00ff87] text-black' : 'text-[#555] hover:text-white',
                    )}>
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-[#1a1a1a]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#444]" />
                <input type="text" placeholder="Search player..." value={panelSearch} onChange={e => setPanelSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#111] border border-[#1e1e1e] text-xs text-white placeholder:text-[#444] focus:outline-none focus:border-[#00ff87]/30" />
              </div>
            </div>

            {/* Nation pills */}
            <div className="flex gap-1 px-3 py-2 overflow-x-auto no-scrollbar border-b border-[#1a1a1a]">
              {NATIONS.map(n => (
                <button key={n.id} onClick={() => fetchNation(n.id)}
                  className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold whitespace-nowrap transition-all flex-shrink-0',
                    panelNation === n.id ? 'bg-[#00ff87] text-black' : 'bg-[#111] text-[#555] border border-[#1e1e1e]',
                  )}>
                  <img src={`https://flagcdn.com/w16/${n.flag}.png`} alt="" className="w-3 h-2 object-cover rounded-sm" />
                  {n.name.length > 8 ? n.name.slice(0, 7) + '.' : n.name}
                </button>
              ))}
            </div>

            {/* Player list */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 160px)' }}>
              {panelLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#00ff87]" /></div>
              ) : !panelNation ? (
                <p className="text-xs text-[#444] text-center py-10">Select a nation to browse players</p>
              ) : filteredPlayers.length === 0 ? (
                <p className="text-xs text-[#444] text-center py-10">No {panelPosition || ''} players found</p>
              ) : (
                filteredPlayers.map(p => {
                  const pos = posShort(p.position);
                  const price = getPlayerPrice(pos);
                  const inSquad = squad.some(s => s.player_id === p.id);
                  return (
                    <div key={p.id} className={cn('flex items-center gap-2 px-3 py-2 border-b border-[#111] hover:bg-[#111] transition-colors',
                      inSquad && 'opacity-50',
                    )}>
                      <div className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden flex-shrink-0">
                        {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> :
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-[#444]">{pos}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                        <p className="text-[9px] text-[#444]">{pos} · #{p.number || '?'}</p>
                      </div>
                      <span className="text-[10px] font-bold text-[#00ff87] tabular-nums mr-1">{price}M</span>
                      {inSquad ? (
                        <span className="text-[8px] text-[#00ff87] bg-[#00ff87]/10 px-1.5 py-0.5 rounded font-bold">IN</span>
                      ) : (
                        <button onClick={() => addPlayer(p)}
                          className="text-[9px] font-bold px-2.5 py-1 bg-[#00ff87] text-black rounded hover:opacity-90">+</button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pitch Row ──────────────────────────────────────────────────────────────
function PitchRow({ pos, starters, limit, onAdd, onRemove, onCaptain }: {
  pos: string; starters: SPlayer[]; limit: number;
  onAdd: () => void; onRemove: (id: number) => void; onCaptain: (id: number) => void;
}) {
  const players = starters.filter(p => p.position === pos);
  const empty = Math.max(0, limit - players.length);
  const gap = pos === 'GK' ? 'gap-8' : pos === 'DEF' ? 'gap-4' : pos === 'MID' ? 'gap-5' : 'gap-8';

  return (
    <div className={cn('flex justify-center items-end', gap, pos !== 'FWD' && 'mt-3')}>
      {players.map(p => (
        <div key={p.player_id} className="text-center group relative">
          <div className={cn('w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 overflow-hidden mx-auto transition-all cursor-pointer',
            p.is_captain ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]' : 'border-white/20 hover:border-white/40',
          )}>
            {p.player_photo ? <img src={p.player_photo} alt="" className="w-full h-full object-cover" /> :
              <div className="w-full h-full bg-[#1a3a1a] flex items-center justify-center text-[9px] text-white/40">{pos}</div>}
          </div>
          {p.is_captain && (
            <div className="absolute -top-1 -right-0.5 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow">
              <span className="text-[7px] font-black text-black">C</span>
            </div>
          )}
          <p className="text-[8px] sm:text-[9px] font-bold text-white mt-1 truncate max-w-[60px] sm:max-w-[70px]">{p.player_name.split(' ').pop()}</p>
          <p className="text-[7px] text-white/30">{p.price}M</p>
          {/* Hover actions */}
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 hidden group-hover:flex gap-0.5 bg-[#111] border border-[#222] rounded px-1 py-0.5 z-20">
            <button onClick={() => onCaptain(p.player_id)} className="text-[7px] text-amber-400 px-1 hover:text-amber-300" title="Captain">C</button>
            <button onClick={() => onRemove(p.player_id)} className="text-[7px] text-red-400 px-1 hover:text-red-300" title="Remove">✕</button>
          </div>
        </div>
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <button key={`e-${i}`} onClick={onAdd} className="text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center mx-auto hover:border-[#00ff87]/40 transition-colors">
            <span className="text-base text-white/10 hover:text-[#00ff87]/40">+</span>
          </div>
          <p className="text-[8px] text-white/15 mt-1 font-bold">{pos}</p>
        </button>
      ))}
    </div>
  );
}

// ─── Leaderboard ────────────────────────────────────────────────────────────
function FantasyLeaderboard({ userId }: { userId?: string }) {
  const [teams, setTeams] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('fantasy_teams').select('*').order('total_points', { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setTeams(data); });
  }, []);

  if (teams.length === 0) return <p className="text-xs text-[#555] text-center py-6">No teams yet</p>;

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-[#0d0d0d] text-[9px] uppercase tracking-widest text-[#444] font-bold">
        <span className="w-7 text-center">#</span><span className="flex-1">TEAM</span><span className="w-14 text-center">PTS</span>
      </div>
      {teams.map((t, i) => (
        <div key={t.id} className={cn('flex items-center gap-2 px-4 py-2 border-t border-[#1a1a1a]', userId === t.user_id && 'bg-[#00ff87]/5')}>
          <span className={cn('w-7 text-center text-xs font-black', i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-[#555]')}>
            {i <= 2 ? ['🥇', '🥈', '🥉'][i] : i + 1}
          </span>
          <span className={cn('flex-1 text-sm font-semibold truncate', userId === t.user_id ? 'text-[#00ff87]' : 'text-white')}>{t.team_name}</span>
          <span className="w-14 text-center text-sm font-black text-white tabular-nums">{t.total_points}</span>
        </div>
      ))}
    </div>
  );
}
