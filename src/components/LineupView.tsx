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

// ─── Event types ────────────────────────────────────────────────────────────
type EventIcon = {
  type: 'goal' | 'own_goal' | 'assist' | 'yellow_card' | 'red_card' | 'sub_in' | 'sub_out';
  minute: number;
};

function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function getLastName(name: string): string {
  const parts = normalizeName(name).split(/\s+/);
  return parts[parts.length - 1];
}
function getShortName(name: string): string {
  const parts = name.split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0].charAt(0)}. ${parts[parts.length - 1]}`;
}

function buildPlayerEventMap(events: MatchEvent[]): Map<string, EventIcon[]> {
  const byFull = new Map<string, EventIcon[]>();
  const byLast = new Map<string, EventIcon[]>();
  const addEvent = (name: string, icon: EventIcon) => {
    const full = normalizeName(name);
    const last = getLastName(name);
    if (!byFull.has(full)) byFull.set(full, []);
    byFull.get(full)!.push(icon);
    if (!byLast.has(last)) byLast.set(last, []);
    byLast.get(last)!.push(icon);
  };
  events.forEach(e => {
    if (e.type === 'goal') {
      if (e.detail === 'Own Goal') {
        addEvent(e.playerName, { type: 'own_goal', minute: e.minute });
      } else {
        addEvent(e.playerName, { type: 'goal', minute: e.minute });
        if (e.assistName) addEvent(e.assistName, { type: 'assist', minute: e.minute });
      }
    } else if (e.type === 'yellow_card') addEvent(e.playerName, { type: 'yellow_card', minute: e.minute });
    else if (e.type === 'red_card') addEvent(e.playerName, { type: 'red_card', minute: e.minute });
    else if (e.type === 'substitution') {
      addEvent(e.playerName, { type: 'sub_out', minute: e.minute });
      if (e.assistName) addEvent(e.assistName, { type: 'sub_in', minute: e.minute });
    }
  });
  return new Map([...byFull, ...byLast]);
}

function getPlayerIcons(playerName: string, playerEvents: Map<string, EventIcon[]>): EventIcon[] {
  const full = normalizeName(playerName);
  if (playerEvents.has(full)) return playerEvents.get(full)!;
  const last = getLastName(playerName);
  return playerEvents.get(last) || [];
}

function getRatingColor(rating: string | null): string {
  if (!rating) return 'bg-secondary text-muted-foreground';
  const r = parseFloat(rating);
  if (r >= 8.0) return 'bg-emerald-500 text-white';
  if (r >= 7.0) return 'bg-emerald-600/80 text-white';
  if (r >= 6.5) return 'bg-amber-500 text-white';
  if (r >= 6.0) return 'bg-orange-500 text-white';
  return 'bg-red-500 text-white';
}

// ─── Icon Renderer ──────────────────────────────────────────────────────────
function EventIcons({ icons, size = 'sm' }: { icons: EventIcon[]; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'text-[9px]' : 'text-[11px]';
  return (
    <div className="flex items-center gap-[2px]">
      {icons.slice(0, 4).map((icon, idx) => (
        <span key={idx} title={`${icon.minute}'`} className="inline-flex">
          {icon.type === 'goal' && <span className={sz}>⚽</span>}
          {icon.type === 'own_goal' && <span className={sz}>🔴</span>}
          {icon.type === 'assist' && <span className={sz}>👟</span>}
          {icon.type === 'yellow_card' && <span className={`inline-block w-2 h-2.5 rounded-[1px] bg-yellow-400 ${size === 'md' ? 'w-2.5 h-3' : ''}`} />}
          {icon.type === 'red_card' && <span className={`inline-block w-2 h-2.5 rounded-[1px] bg-red-500 ${size === 'md' ? 'w-2.5 h-3' : ''}`} />}
          {icon.type === 'sub_out' && (
            <span className="w-3 h-3 rounded-full bg-red-500/80 flex items-center justify-center">
              <span className="text-[7px] text-white font-bold">↓</span>
            </span>
          )}
          {icon.type === 'sub_in' && (
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 flex items-center justify-center">
              <span className="text-[7px] text-white font-bold">↑</span>
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function LineupView({
  lineups, homeTeamName, awayTeamName, homeTeamLogo, awayTeamLogo,
  events = [], playerData = [], homeTeamId, awayTeamId,
}: LineupViewProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<{ player: MatchPlayerStats; teamName: string; teamLogo?: string } | null>(null);
  const playerEvents = buildPlayerEventMap(events);

  const homePlayerMap = useMemo(() => {
    const team = playerData.find(t => t.teamId === homeTeamId);
    if (!team) return new Map<number, MatchPlayerStats>();
    return new Map(team.players.map(p => [p.id, p]));
  }, [playerData, homeTeamId]);

  const awayPlayerMap = useMemo(() => {
    const team = playerData.find(t => t.teamId === awayTeamId);
    if (!team) return new Map<number, MatchPlayerStats>();
    return new Map(team.players.map(p => [p.id, p]));
  }, [playerData, awayTeamId]);

  return (
    <div>
      {/* ─── HOME PITCH ─────────────────────────────────────────────── */}
      <PitchHalf
        lineup={lineups.home}
        teamName={homeTeamName}
        teamLogo={homeTeamLogo}
        isHome={true}
        playerEvents={playerEvents}
        playerMap={homePlayerMap}
        onSelectPlayer={(p) => setSelectedPlayer({ player: p, teamName: homeTeamName, teamLogo: homeTeamLogo })}
      />

      {/* ─── AWAY PITCH ─────────────────────────────────────────────── */}
      <PitchHalf
        lineup={lineups.away}
        teamName={awayTeamName}
        teamLogo={awayTeamLogo}
        isHome={false}
        playerEvents={playerEvents}
        playerMap={awayPlayerMap}
        onSelectPlayer={(p) => setSelectedPlayer({ player: p, teamName: awayTeamName, teamLogo: awayTeamLogo })}
      />

      {/* ─── SUBSTITUTES ────────────────────────────────────────────── */}
      <div className="px-3 py-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Substitutes</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Side-by-side subs: home left, away right */}
        <div className="flex gap-2">
          {/* Home subs */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1.5 mb-2">
              {homeTeamLogo && <OptimizedImage src={homeTeamLogo} alt="" className="w-4 h-4 object-contain" />}
              <span className="text-[10px] font-bold text-muted-foreground uppercase">{homeTeamName}</span>
            </div>
            {lineups.home.substitutes.map(p => (
              <SubRow
                key={p.id || p.name}
                player={p}
                playerEvents={playerEvents}
                stats={homePlayerMap.get(p.id)}
                side="left"
                onSelect={(s) => setSelectedPlayer({ player: s, teamName: homeTeamName, teamLogo: homeTeamLogo })}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="w-px bg-border/30 mx-1" />

          {/* Away subs */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-end gap-1.5 mb-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">{awayTeamName}</span>
              {awayTeamLogo && <OptimizedImage src={awayTeamLogo} alt="" className="w-4 h-4 object-contain" />}
            </div>
            {lineups.away.substitutes.map(p => (
              <SubRow
                key={p.id || p.name}
                player={p}
                playerEvents={playerEvents}
                stats={awayPlayerMap.get(p.id)}
                side="right"
                onSelect={(s) => setSelectedPlayer({ player: s, teamName: awayTeamName, teamLogo: awayTeamLogo })}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ─── MANAGERS ───────────────────────────────────────────────── */}
      {((lineups.home.coach.name && lineups.home.coach.name !== 'Unknown') ||
        (lineups.away.coach.name && lineups.away.coach.name !== 'Unknown')) && (
        <div className="px-3 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Manager</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="flex justify-between px-2">
            <div className="flex items-center gap-2">
              {lineups.home.coach.photo && (
                <img src={lineups.home.coach.photo} alt="" className="w-8 h-8 rounded-full object-cover bg-secondary" />
              )}
              <span className="text-sm font-medium text-foreground/80">
                {lineups.home.coach.name !== 'Unknown' ? lineups.home.coach.name : '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground/80">
                {lineups.away.coach.name !== 'Unknown' ? lineups.away.coach.name : '—'}
              </span>
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

// ─── Pitch Half ─────────────────────────────────────────────────────────────
function PitchHalf({
  lineup, teamName, teamLogo, isHome, playerEvents, playerMap, onSelectPlayer,
}: {
  lineup: TeamLineup;
  teamName: string;
  teamLogo?: string;
  isHome: boolean;
  playerEvents: Map<string, EventIcon[]>;
  playerMap: Map<number, MatchPlayerStats>;
  onSelectPlayer: (p: MatchPlayerStats) => void;
}) {
  const positions = getFormationPositions(lineup.formation, lineup.startXI, true); // always top-to-bottom

  return (
    <div>
      {/* Team header bar */}
      <div className={cn(
        'flex items-center justify-between px-4 py-2',
        isHome ? 'bg-secondary/40' : 'bg-secondary/20',
      )}>
        <div className="flex items-center gap-2">
          {teamLogo && <OptimizedImage src={teamLogo} alt="" className="w-5 h-5 object-contain" />}
          <span className="text-xs font-bold text-foreground">{teamName}</span>
        </div>
        <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          {lineup.formation}
        </span>
      </div>

      {/* Pitch */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '68/50', maxWidth: '500px', margin: '0 auto' }}>
        {/* Grass */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a5c1e] to-[#1f6b23]" />
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 12%, rgba(255,255,255,0.5) 12%, rgba(255,255,255,0.5) 12.5%)',
        }} />

        {/* Pitch lines */}
        <div className="absolute inset-[3%] border-[1.5px] border-white/25 rounded-sm" />
        {/* Goal area */}
        {isHome ? (
          <>
            <div className="absolute left-1/2 -translate-x-1/2 top-[3%] w-[40%] h-[25%] border-[1.5px] border-white/25 border-t-0" />
            <div className="absolute left-1/2 -translate-x-1/2 top-[3%] w-[18%] h-[12%] border-[1.5px] border-white/25 border-t-0" />
          </>
        ) : (
          <>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[3%] w-[40%] h-[25%] border-[1.5px] border-white/25 border-b-0" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[3%] w-[18%] h-[12%] border-[1.5px] border-white/25 border-b-0" />
          </>
        )}

        {/* Players */}
        {positions.map((pos, i) => {
          const icons = getPlayerIcons(pos.player.name, playerEvents);
          const stats = playerMap.get(pos.player.id);
          const isGK = pos.player.pos === 'G';

          return (
            <div
              key={pos.player.id || pos.player.name + i}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 cursor-pointer"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onClick={() => stats && onSelectPlayer(stats)}
            >
              <div className="relative">
                {/* Player photo or number circle */}
                {stats?.photo ? (
                  <img
                    src={stats.photo}
                    alt=""
                    className={cn(
                      'w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-lg',
                      isGK ? 'ring-2 ring-amber-400' : isHome ? 'ring-2 ring-white/40' : 'ring-2 ring-blue-400/40',
                    )}
                  />
                ) : (
                  <div className={cn(
                    'w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs font-extrabold shadow-lg',
                    isGK ? 'bg-amber-500 text-black ring-2 ring-amber-300/50'
                      : isHome ? 'bg-white text-gray-900 ring-2 ring-white/30'
                      : 'bg-blue-900 text-white ring-2 ring-blue-400/40',
                  )}>
                    {pos.player.number}
                  </div>
                )}

                {/* Event icons — top right */}
                {icons.length > 0 && (
                  <div className="absolute -top-1 -right-3 flex gap-[1px]">
                    <EventIcons icons={icons} size="sm" />
                  </div>
                )}

                {/* Captain badge */}
                {stats?.captain && (
                  <div className="absolute -bottom-0.5 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow">
                    <span className="text-[7px] font-extrabold text-black">C</span>
                  </div>
                )}
              </div>

              {/* Rating badge */}
              {stats?.rating && (
                <div className={cn(
                  'mt-0.5 px-1.5 py-[1px] rounded text-[8px] sm:text-[9px] font-extrabold leading-tight shadow',
                  getRatingColor(stats.rating),
                )}>
                  {parseFloat(stats.rating).toFixed(1)}
                </div>
              )}

              {/* Player name */}
              <span className="mt-[1px] text-[8px] sm:text-[10px] font-semibold text-white text-center leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] max-w-[60px] sm:max-w-[76px] truncate">
                {getShortName(pos.player.name)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Substitute Row ─────────────────────────────────────────────────────────
function SubRow({
  player, playerEvents, stats, side, onSelect,
}: {
  player: LineupPlayer;
  playerEvents: Map<string, EventIcon[]>;
  stats?: MatchPlayerStats;
  side: 'left' | 'right';
  onSelect: (s: MatchPlayerStats) => void;
}) {
  const icons = getPlayerIcons(player.name, playerEvents);
  const subIn = icons.find(i => i.type === 'sub_in');

  const posLabel: Record<string, string> = { G: 'Goalkeeper', D: 'Defender', M: 'Midfielder', F: 'Striker' };
  const posColor: Record<string, string> = {
    G: 'text-amber-400', D: 'text-blue-400', M: 'text-emerald-400', F: 'text-red-400',
  };

  const photo = stats?.photo;
  const isRight = side === 'right';

  return (
    <div
      className={cn(
        'flex items-center gap-2 py-1.5 px-1 rounded hover:bg-secondary/30 transition-colors cursor-pointer',
        isRight ? 'flex-row-reverse text-right' : '',
      )}
      onClick={() => stats && onSelect(stats)}
    >
      {/* Photo */}
      {photo ? (
        <img src={photo} alt="" className="w-9 h-9 rounded-full object-cover bg-secondary flex-shrink-0 ring-1 ring-border" loading="lazy" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 ring-1 ring-border">
          <span className="text-[11px] font-bold text-muted-foreground">{player.number}</span>
        </div>
      )}

      {/* Event icons (next to photo) */}
      {icons.length > 0 && (
        <div className="flex-shrink-0">
          <EventIcons icons={icons} size="sm" />
        </div>
      )}

      {/* Name + position */}
      <div className={cn('flex-1 min-w-0', isRight ? 'text-right' : '')}>
        <div className="text-[12px] font-semibold text-foreground/90 truncate">{getShortName(player.name)}</div>
        <div className={cn('text-[10px]', posColor[player.pos] || 'text-muted-foreground')}>
          {posLabel[player.pos] || player.pos} #{player.number}
        </div>
      </div>

      {/* Sub minute */}
      {subIn && (
        <span className="text-[10px] text-emerald-400 font-semibold flex-shrink-0">{subIn.minute}'</span>
      )}
    </div>
  );
}

// ─── Formation Positioning ──────────────────────────────────────────────────
interface PlayerPosition {
  player: LineupPlayer;
  x: number;
  y: number;
}

function getFormationPositions(formation: string, players: LineupPlayer[], _isHome: boolean): PlayerPosition[] {
  const hasGrid = players.some(p => p.grid);
  if (hasGrid) return getPositionsFromGrid(players);
  return getPositionsFromFormation(formation, players);
}

function getPositionsFromGrid(players: LineupPlayer[]): PlayerPosition[] {
  const positions: PlayerPosition[] = [];
  let maxRow = 1;
  players.forEach(p => {
    if (p.grid) {
      const row = parseInt(p.grid.split(':')[0]);
      if (row > maxRow) maxRow = row;
    }
  });

  const rows = new Map<number, LineupPlayer[]>();
  players.forEach(p => {
    if (!p.grid) return;
    const row = parseInt(p.grid.split(':')[0]);
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row)!.push(p);
  });

  rows.forEach((rowPlayers, row) => {
    const totalInRow = rowPlayers.length;
    rowPlayers.forEach((player, colIdx) => {
      const x = totalInRow === 1 ? 50 : 15 + (colIdx / (totalInRow - 1)) * 70;
      const y = 8 + ((row - 1) / Math.max(maxRow - 1, 1)) * 82;
      positions.push({ player, x, y });
    });
  });

  return positions;
}

function getPositionsFromFormation(formation: string, players: LineupPlayer[]): PlayerPosition[] {
  const lines = formation.split('-').map(Number).filter(n => !isNaN(n));
  if (!lines.length) {
    return players.map((player, i) => ({
      player, x: 50, y: 10 + (i / players.length) * 80,
    }));
  }

  const positions: PlayerPosition[] = [];
  let playerIdx = 0;

  // Goalkeeper
  if (playerIdx < players.length) {
    positions.push({ player: players[playerIdx], x: 50, y: 8 });
    playerIdx++;
  }

  const totalLines = lines.length;
  lines.forEach((count, lineIdx) => {
    const y = 22 + (lineIdx / Math.max(totalLines - 1, 1)) * 68;
    for (let i = 0; i < count && playerIdx < players.length; i++) {
      const x = count === 1 ? 50 : 15 + (i / (count - 1)) * 70;
      positions.push({ player: players[playerIdx], x, y });
      playerIdx++;
    }
  });

  return positions;
}
