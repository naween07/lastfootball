import { TeamLineup, LineupPlayer, MatchEvent, MatchPlayerData, MatchPlayerStats } from '@/types/football';
import { useState, useMemo } from 'react';
import PlayerCard from './PlayerCard';
import OptimizedImage from './OptimizedImage';
import { cn } from '@/lib/utils';

interface LineupViewProps {
  lineups: { home: TeamLineup; away: TeamLineup };
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  events?: MatchEvent[];
  playerData?: MatchPlayerData[];
  homeTeamId?: number;
  awayTeamId?: number;
}

// ─── Event helpers ──────────────────────────────────────────────────────────
type EvIcon = { type: 'goal' | 'own_goal' | 'assist' | 'yellow_card' | 'red_card' | 'sub_in' | 'sub_out'; minute: number };

function norm(n: string) { return n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
function lastName(n: string) { const p = norm(n).split(/\s+/); return p[p.length - 1]; }
function shortName(n: string) { const p = n.split(/\s+/); return p.length <= 1 ? n : `${p[0].charAt(0)}. ${p[p.length - 1]}`; }

function buildEvMap(events: MatchEvent[]): Map<string, EvIcon[]> {
  const byF = new Map<string, EvIcon[]>(), byL = new Map<string, EvIcon[]>();
  const add = (name: string, icon: EvIcon) => {
    const f = norm(name), l = lastName(name);
    if (!byF.has(f)) byF.set(f, []); byF.get(f)!.push(icon);
    if (!byL.has(l)) byL.set(l, []); byL.get(l)!.push(icon);
  };
  events.forEach(e => {
    if (e.type === 'goal') {
      if (e.detail === 'Own Goal') add(e.playerName, { type: 'own_goal', minute: e.minute });
      else { add(e.playerName, { type: 'goal', minute: e.minute }); if (e.assistName) add(e.assistName, { type: 'assist', minute: e.minute }); }
    } else if (e.type === 'yellow_card') add(e.playerName, { type: 'yellow_card', minute: e.minute });
    else if (e.type === 'red_card') add(e.playerName, { type: 'red_card', minute: e.minute });
    else if (e.type === 'substitution') {
      add(e.playerName, { type: 'sub_out', minute: e.minute });
      if (e.assistName) add(e.assistName, { type: 'sub_in', minute: e.minute });
    }
  });
  return new Map([...byF, ...byL]);
}

function getIcons(name: string, evMap: Map<string, EvIcon[]>): EvIcon[] {
  return evMap.get(norm(name)) || evMap.get(lastName(name)) || [];
}

function ratingColor(r: string | null): string {
  if (!r) return 'bg-secondary text-muted-foreground';
  const v = parseFloat(r);
  if (v >= 8) return 'bg-emerald-500 text-white';
  if (v >= 7) return 'bg-emerald-600/80 text-white';
  if (v >= 6.5) return 'bg-amber-500 text-white';
  if (v >= 6) return 'bg-orange-500 text-white';
  return 'bg-red-500 text-white';
}

// ─── Event Icons Component ──────────────────────────────────────────────────
function EvIcons({ icons }: { icons: EvIcon[] }) {
  if (!icons.length) return null;
  return (
    <span className="inline-flex items-center gap-[1px]">
      {icons.slice(0, 4).map((ic, i) => (
        <span key={i} title={`${ic.minute}'`}>
          {ic.type === 'goal' && <span className="text-[10px]">⚽</span>}
          {ic.type === 'own_goal' && <span className="text-[10px]">🔴</span>}
          {ic.type === 'assist' && <span className="text-[10px]">👟</span>}
          {ic.type === 'yellow_card' && <span className="inline-block w-2 h-2.5 rounded-[1px] bg-yellow-400" />}
          {ic.type === 'red_card' && <span className="inline-block w-2 h-2.5 rounded-[1px] bg-red-500" />}
          {ic.type === 'sub_out' && (
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center shadow">
              <span className="text-[8px] text-white font-bold">↓</span>
            </span>
          )}
          {ic.type === 'sub_in' && (
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shadow">
              <span className="text-[8px] text-white font-bold">↑</span>
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function LineupView({
  lineups, homeTeamName, awayTeamName, homeTeamLogo, awayTeamLogo,
  events = [], playerData = [], homeTeamId, awayTeamId,
}: LineupViewProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<{ player: MatchPlayerStats; teamName: string; teamLogo?: string } | null>(null);
  const evMap = buildEvMap(events);

  const homeMap = useMemo(() => {
    const t = playerData.find(t => t.teamId === homeTeamId);
    return t ? new Map(t.players.map(p => [p.id, p])) : new Map<number, MatchPlayerStats>();
  }, [playerData, homeTeamId]);

  const awayMap = useMemo(() => {
    const t = playerData.find(t => t.teamId === awayTeamId);
    return t ? new Map(t.players.map(p => [p.id, p])) : new Map<number, MatchPlayerStats>();
  }, [playerData, awayTeamId]);

  const selectHome = (p: MatchPlayerStats) => setSelectedPlayer({ player: p, teamName: homeTeamName, teamLogo: homeTeamLogo });
  const selectAway = (p: MatchPlayerStats) => setSelectedPlayer({ player: p, teamName: awayTeamName, teamLogo: awayTeamLogo });

  const homePositions = getPositions(lineups.home.formation, lineups.home.startXI, true);
  const awayPositions = getPositions(lineups.away.formation, lineups.away.startXI, false);

  return (
    <div>
      {/* ─── FORMATION HEADER ───────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/30">
        <div className="flex items-center gap-2">
          {homeTeamLogo && <OptimizedImage src={homeTeamLogo} alt="" className="w-5 h-5 object-contain" />}
          <span className="text-xs font-bold text-foreground">{homeTeamName}</span>
          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full">{lineups.home.formation}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full">{lineups.away.formation}</span>
          <span className="text-xs font-bold text-foreground">{awayTeamName}</span>
          {awayTeamLogo && <OptimizedImage src={awayTeamLogo} alt="" className="w-5 h-5 object-contain" />}
        </div>
      </div>

      {/* ─── SINGLE CONTINUOUS PITCH ────────────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '60/105', maxWidth: '460px', margin: '0 auto' }}>
        {/* Grass */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a5c1e] to-[#1f6b23]" />
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 8%, rgba(255,255,255,0.5) 8%, rgba(255,255,255,0.5) 8.5%)',
        }} />

        {/* Pitch markings */}
        <div className="absolute inset-[3%] border-[1.5px] border-white/25 rounded-sm" />
        <div className="absolute left-[3%] right-[3%] top-1/2 h-[1.5px] bg-white/25 -translate-y-px" />
        <div className="absolute left-1/2 top-1/2 w-[18%] aspect-square rounded-full border-[1.5px] border-white/25 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-white/30 -translate-x-1/2 -translate-y-1/2" />
        {/* Top penalty area */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[3%] w-[44%] h-[16%] border-[1.5px] border-white/25 border-t-0" />
        <div className="absolute left-1/2 -translate-x-1/2 top-[3%] w-[18%] h-[6%] border-[1.5px] border-white/25 border-t-0" />
        {/* Bottom penalty area */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[3%] w-[44%] h-[16%] border-[1.5px] border-white/25 border-b-0" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[3%] w-[18%] h-[6%] border-[1.5px] border-white/25 border-b-0" />

        {/* Home players — top half */}
        {homePositions.map((pos, i) => (
          <PitchPlayer
            key={`h-${pos.player.id || i}`}
            pos={pos}
            stats={homeMap.get(pos.player.id)}
            icons={getIcons(pos.player.name, evMap)}
            isGK={pos.player.pos === 'G'}
            teamStyle="home"
            onSelect={selectHome}
          />
        ))}

        {/* Away players — bottom half */}
        {awayPositions.map((pos, i) => (
          <PitchPlayer
            key={`a-${pos.player.id || i}`}
            pos={pos}
            stats={awayMap.get(pos.player.id)}
            icons={getIcons(pos.player.name, evMap)}
            isGK={pos.player.pos === 'G'}
            teamStyle="away"
            onSelect={selectAway}
          />
        ))}
      </div>

      {/* ─── BENCH ──────────────────────────────────────────────────── */}
      <div className="px-3 pt-5 pb-2">
        {/* Bench header with team logos */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            {homeTeamLogo && <OptimizedImage src={homeTeamLogo} alt="" className="w-4 h-4 object-contain" />}
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Bench</span>
          <div className="flex items-center gap-1.5">
            {awayTeamLogo && <OptimizedImage src={awayTeamLogo} alt="" className="w-4 h-4 object-contain" />}
          </div>
        </div>

        {/* Side-by-side bench rows */}
        {Array.from({ length: Math.max(lineups.home.substitutes.length, lineups.away.substitutes.length) }).map((_, i) => {
          const homeSub = lineups.home.substitutes[i];
          const awaySub = lineups.away.substitutes[i];
          return (
            <div key={i} className="flex items-stretch border-b border-border/20 last:border-0">
              {/* Home sub — left */}
              <div className="flex-1 py-2 pr-2">
                {homeSub ? (
                  <BenchRow
                    player={homeSub}
                    stats={homeMap.get(homeSub.id)}
                    icons={getIcons(homeSub.name, evMap)}
                    side="left"
                    onSelect={selectHome}
                  />
                ) : <div className="h-10" />}
              </div>

              {/* Divider */}
              <div className="w-px bg-border/20" />

              {/* Away sub — right */}
              <div className="flex-1 py-2 pl-2">
                {awaySub ? (
                  <BenchRow
                    player={awaySub}
                    stats={awayMap.get(awaySub.id)}
                    icons={getIcons(awaySub.name, evMap)}
                    side="right"
                    onSelect={selectAway}
                  />
                ) : <div className="h-10" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── MANAGER ────────────────────────────────────────────────── */}
      {((lineups.home.coach.name && lineups.home.coach.name !== 'Unknown') ||
        (lineups.away.coach.name && lineups.away.coach.name !== 'Unknown')) && (
        <div className="px-3 pb-4 pt-2">
          <div className="flex items-stretch border-t border-border/30 pt-3">
            {/* Home manager */}
            <div className="flex-1 flex items-center gap-2">
              {lineups.home.coach.photo && (
                <img src={lineups.home.coach.photo} alt="" className="w-8 h-8 rounded-full object-cover bg-secondary" />
              )}
              <div>
                <div className="text-[12px] font-semibold text-foreground/80">
                  {lineups.home.coach.name !== 'Unknown' ? lineups.home.coach.name : '—'}
                </div>
                <div className="text-[10px] text-muted-foreground">Manager</div>
              </div>
            </div>

            <div className="w-px bg-border/20 mx-2" />

            {/* Away manager */}
            <div className="flex-1 flex items-center justify-end gap-2">
              <div className="text-right">
                <div className="text-[12px] font-semibold text-foreground/80">
                  {lineups.away.coach.name !== 'Unknown' ? lineups.away.coach.name : '—'}
                </div>
                <div className="text-[10px] text-muted-foreground">Manager</div>
              </div>
              {lineups.away.coach.photo && (
                <img src={lineups.away.coach.photo} alt="" className="w-8 h-8 rounded-full object-cover bg-secondary" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── PLAYER CARD OVERLAY ────────────────────────────────────── */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPlayer(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm">
            <PlayerCard
              player={selectedPlayer.player}
              teamName={selectedPlayer.teamName}
              teamLogo={selectedPlayer.teamLogo}
              onClose={() => setSelectedPlayer(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pitch Player ───────────────────────────────────────────────────────────
function PitchPlayer({
  pos, stats, icons, isGK, teamStyle, onSelect,
}: {
  pos: PlayerPosition;
  stats?: MatchPlayerStats;
  icons: EvIcon[];
  isGK: boolean;
  teamStyle: 'home' | 'away';
  onSelect: (p: MatchPlayerStats) => void;
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 cursor-pointer"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      onClick={() => stats && onSelect(stats)}
    >
      <div className="relative">
        {/* Photo or number circle */}
        {stats?.photo ? (
          <img
            src={stats.photo}
            alt=""
            className={cn(
              'w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shadow-lg',
              isGK ? 'ring-2 ring-amber-400' : teamStyle === 'home' ? 'ring-2 ring-white/50' : 'ring-2 ring-blue-400/50',
            )}
          />
        ) : (
          <div className={cn(
            'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[11px] font-extrabold shadow-lg',
            isGK ? 'bg-amber-500 text-black ring-2 ring-amber-300/50'
              : teamStyle === 'home' ? 'bg-white text-gray-900 ring-2 ring-white/30'
              : 'bg-[#2a2a3e] text-white ring-2 ring-[#3a3a5e]/50',
          )}>
            {pos.player.number}
          </div>
        )}

        {/* Event icons — top right */}
        {icons.length > 0 && (
          <div className="absolute -top-1 -right-3">
            <EvIcons icons={icons} />
          </div>
        )}

        {/* Captain */}
        {stats?.captain && (
          <div className="absolute -bottom-0.5 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 flex items-center justify-center shadow">
            <span className="text-[6px] font-extrabold text-black">C</span>
          </div>
        )}
      </div>

      {/* Rating */}
      {stats?.rating && (
        <div className={cn('mt-0.5 px-1 py-[1px] rounded text-[7px] sm:text-[8px] font-extrabold leading-tight shadow', ratingColor(stats.rating))}>
          {parseFloat(stats.rating).toFixed(1)} ★
        </div>
      )}

      {/* Name */}
      <span className="mt-[1px] text-[7px] sm:text-[9px] font-semibold text-white text-center leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] max-w-[50px] sm:max-w-[66px] truncate">
        {shortName(pos.player.name)}
      </span>
    </div>
  );
}

// ─── Bench Row ──────────────────────────────────────────────────────────────
function BenchRow({
  player, stats, icons, side, onSelect,
}: {
  player: LineupPlayer;
  stats?: MatchPlayerStats;
  icons: EvIcon[];
  side: 'left' | 'right';
  onSelect: (p: MatchPlayerStats) => void;
}) {
  const subIn = icons.find(i => i.type === 'sub_in');
  const isRight = side === 'right';

  return (
    <div
      className={cn('flex items-center gap-2 cursor-pointer hover:bg-secondary/20 rounded px-1 py-0.5 transition-colors', isRight && 'flex-row-reverse')}
      onClick={() => stats && onSelect(stats)}
    >
      {/* Photo */}
      {stats?.photo ? (
        <img src={stats.photo} alt="" className="w-9 h-9 rounded-full object-cover bg-secondary flex-shrink-0 ring-1 ring-border" loading="lazy" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 ring-1 ring-border">
          <span className="text-[11px] font-bold text-muted-foreground">{player.number}</span>
        </div>
      )}

      {/* Info */}
      <div className={cn('flex-1 min-w-0', isRight && 'text-right')}>
        <div className="text-[12px] font-semibold text-foreground/90 truncate leading-tight">{player.name}</div>
        <div className="flex items-center gap-1.5 mt-0.5" style={{ justifyContent: isRight ? 'flex-end' : 'flex-start' }}>
          {subIn && <span className="text-[10px] text-emerald-400 font-semibold">↑ {subIn.minute}'</span>}
          <EvIcons icons={icons.filter(i => i.type !== 'sub_in')} />
        </div>
      </div>
    </div>
  );
}

// ─── Formation Positioning ──────────────────────────────────────────────────
interface PlayerPosition { player: LineupPlayer; x: number; y: number }

function getPositions(formation: string, players: LineupPlayer[], isHome: boolean): PlayerPosition[] {
  const hasGrid = players.some(p => p.grid);
  if (hasGrid) return gridPositions(players, isHome);
  return formationPositions(formation, players, isHome);
}

function gridPositions(players: LineupPlayer[], isHome: boolean): PlayerPosition[] {
  let maxRow = 1;
  players.forEach(p => { if (p.grid) { const r = parseInt(p.grid.split(':')[0]); if (r > maxRow) maxRow = r; } });

  const rows = new Map<number, LineupPlayer[]>();
  players.forEach(p => {
    if (!p.grid) return;
    const r = parseInt(p.grid.split(':')[0]);
    if (!rows.has(r)) rows.set(r, []);
    rows.get(r)!.push(p);
  });

  const positions: PlayerPosition[] = [];
  rows.forEach((rp, row) => {
    rp.forEach((player, ci) => {
      const x = rp.length === 1 ? 50 : 12 + (ci / (rp.length - 1)) * 76;
      // Home: 6% to 40%, Away: 60% to 94%
      const yBase = 6 + ((row - 1) / Math.max(maxRow - 1, 1)) * 34;
      const y = isHome ? yBase : 94 - yBase;
      positions.push({ player, x, y });
    });
  });
  return positions;
}

function formationPositions(formation: string, players: LineupPlayer[], isHome: boolean): PlayerPosition[] {
  const lines = formation.split('-').map(Number).filter(n => !isNaN(n));
  if (!lines.length) return players.map((p, i) => ({ player: p, x: 50, y: isHome ? 5 + (i / players.length) * 38 : 95 - (i / players.length) * 38 }));

  const positions: PlayerPosition[] = [];
  let idx = 0;

  // GK
  if (idx < players.length) {
    positions.push({ player: players[idx], x: 50, y: isHome ? 5 : 95 });
    idx++;
  }

  lines.forEach((count, li) => {
    // Home: lines spread from 14% to 40% (range = 26%)
    // Away: lines spread from 60% to 86%
    const yBase = 14 + (li / Math.max(lines.length - 1, 1)) * 26;
    const y = isHome ? yBase : 100 - yBase;
    for (let i = 0; i < count && idx < players.length; i++) {
      const x = count === 1 ? 50 : 12 + (i / (count - 1)) * 76;
      positions.push({ player: players[idx], x, y });
      idx++;
    }
  });
  return positions;
}
