import { TeamLineup, LineupPlayer, MatchEvent } from '@/types/football';
import { useState } from 'react';

interface LineupViewProps {
  lineups: { home: TeamLineup; away: TeamLineup };
  homeTeamName: string;
  awayTeamName: string;
  events?: MatchEvent[];
}

export default function LineupView({ lineups, homeTeamName, awayTeamName, events = [] }: LineupViewProps) {
  const [showSubs, setShowSubs] = useState(false);

  // Build a map: playerName -> list of event icons
  const playerEvents = buildPlayerEventMap(events);

  return (
    <div className="space-y-4">
      {/* Pitch */}
      <div className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: '68/105' }}>
        <div className="absolute inset-0 bg-[#2d6a30]" />
        <PitchMarkings />

        {/* Home team (top half) */}
        <div className="absolute inset-x-0 top-0 bottom-1/2">
          <TeamFormation lineup={lineups.home} isHome={true} playerEvents={playerEvents} />
        </div>

        {/* Away team (bottom half) */}
        <div className="absolute inset-x-0 top-1/2 bottom-0">
          <TeamFormation lineup={lineups.away} isHome={false} playerEvents={playerEvents} />
        </div>

        {/* Formation labels */}
        <div className="absolute top-2 left-3 z-10">
          <span className="text-[10px] sm:text-xs font-bold text-white/90 drop-shadow">
            {homeTeamName} {lineups.home.formation}
          </span>
        </div>
        <div className="absolute bottom-2 left-3 z-10">
          <span className="text-[10px] sm:text-xs font-bold text-white/90 drop-shadow">
            {awayTeamName} {lineups.away.formation}
          </span>
        </div>
      </div>

      {/* Substitutes toggle */}
      <div className="px-4">
        <button
          onClick={() => setShowSubs(!showSubs)}
          className="w-full py-2 text-xs font-semibold text-muted-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
        >
          {showSubs ? 'Hide Substitutes' : 'Show Substitutes'}
        </button>
      </div>

      {showSubs && (
        <div className="px-4 pb-4">
          <h4 className="text-xs font-bold text-muted-foreground text-center mb-3 uppercase tracking-wide">Substitutes</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0">
            <div>
              {lineups.home.substitutes.map(p => (
                <SubRow key={p.id || p.name} player={p} playerEvents={playerEvents} />
              ))}
            </div>
            <div>
              {lineups.away.substitutes.map(p => (
                <SubRow key={p.id || p.name} player={p} align="right" playerEvents={playerEvents} />
              ))}
            </div>
          </div>

          {/* Coaches */}
          <div className="border-t border-border mt-3 pt-3">
            <h4 className="text-xs font-bold text-muted-foreground text-center mb-2 uppercase tracking-wide">Manager</h4>
            <div className="flex justify-between px-1">
              <span className="text-sm text-muted-foreground">{lineups.home.coach.name}</span>
              <span className="text-sm text-muted-foreground">{lineups.away.coach.name}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Event icon types ---------- */
type EventIcon = {
  type: 'goal' | 'yellow_card' | 'red_card' | 'sub_in' | 'sub_out';
  minute: number;
};

// Normalize name: remove accents, lowercase
function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Extract last name for fuzzy matching
function getLastName(name: string): string {
  const parts = normalizeName(name).split(/\s+/);
  return parts[parts.length - 1];
}

function buildPlayerEventMap(events: MatchEvent[]): Map<string, EventIcon[]> {
  // Store events by both full normalized name AND last name for fuzzy matching
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
      addEvent(e.playerName, { type: 'goal', minute: e.minute });
    } else if (e.type === 'yellow_card') {
      addEvent(e.playerName, { type: 'yellow_card', minute: e.minute });
    } else if (e.type === 'red_card') {
      addEvent(e.playerName, { type: 'red_card', minute: e.minute });
    } else if (e.type === 'substitution') {
      addEvent(e.playerName, { type: 'sub_out', minute: e.minute });
      if (e.assistName) {
        addEvent(e.assistName, { type: 'sub_in', minute: e.minute });
      }
    }
  });

  return new Map([...byFull, ...byLast]);
}

function getPlayerIcons(playerName: string, playerEvents: Map<string, EventIcon[]>): EventIcon[] {
  // Try full name first, then last name
  const full = normalizeName(playerName);
  if (playerEvents.has(full)) return playerEvents.get(full)!;
  const last = getLastName(playerName);
  return playerEvents.get(last) || [];
}

function EventIcons({ icons }: { icons: EventIcon[] }) {
  if (!icons.length) return null;
  return (
    <div className="flex items-center gap-0.5 flex-wrap justify-center">
      {icons.map((icon, i) => (
        <span key={i} className="inline-flex items-center" title={`${icon.minute}'`}>
          {icon.type === 'goal' && (
            <span className="text-[8px] sm:text-[10px]">⚽</span>
          )}
          {icon.type === 'yellow_card' && (
            <span className="inline-block w-2 h-2.5 sm:w-2.5 sm:h-3 rounded-[1px] bg-yellow-400 border border-yellow-500" />
          )}
          {icon.type === 'red_card' && (
            <span className="inline-block w-2 h-2.5 sm:w-2.5 sm:h-3 rounded-[1px] bg-red-500 border border-red-600" />
          )}
          {icon.type === 'sub_in' && (
            <span className="text-[8px] sm:text-[10px] text-emerald-400">▲</span>
          )}
          {icon.type === 'sub_out' && (
            <span className="text-[8px] sm:text-[10px] text-red-400">▼</span>
          )}
        </span>
      ))}
    </div>
  );
}

/* ---------- Pitch markings ---------- */
function PitchMarkings() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-[3%] border-2 border-white/40 rounded-sm" />
      <div className="absolute left-[3%] right-[3%] top-1/2 h-0.5 bg-white/40 -translate-y-px" />
      <div className="absolute left-1/2 top-1/2 w-[18%] aspect-square rounded-full border-2 border-white/40 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-white/50 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute top-[3%] left-1/2 -translate-x-1/2 w-[44%] h-[16%] border-2 border-white/40 border-t-0" />
      <div className="absolute top-[3%] left-1/2 -translate-x-1/2 w-[20%] h-[6%] border-2 border-white/40 border-t-0" />
      <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 w-[44%] h-[16%] border-2 border-white/40 border-b-0" />
      <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 w-[20%] h-[6%] border-2 border-white/40 border-b-0" />
    </div>
  );
}

/* ---------- Team formation on half pitch ---------- */
function TeamFormation({ lineup, isHome, playerEvents }: { lineup: TeamLineup; isHome: boolean; playerEvents: Map<string, EventIcon[]> }) {
  const positions = getFormationPositions(lineup.formation, lineup.startXI, isHome);

  return (
    <div className="relative w-full h-full">
      {positions.map((pos, i) => {
        const icons = getPlayerIcons(pos.player.name, playerEvents);
        return (
          <div
            key={pos.player.id || pos.player.name + i}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            {/* Jersey number + event badges */}
            <div className="relative">
              <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-lg ${
                isHome
                  ? 'bg-red-600 text-white border-2 border-red-400'
                  : 'bg-blue-600 text-white border-2 border-blue-400'
              } ${pos.player.pos === 'G' ? '!bg-amber-500 !border-amber-300' : ''}`}>
                {pos.player.number}
              </div>
              {/* Event icons positioned top-right of the circle */}
              {icons.length > 0 && (
                <div className="absolute -top-1 -right-2 flex gap-0.5">
                  {icons.map((icon, idx) => (
                    <span key={idx} className="inline-flex" title={`${icon.minute}'`}>
                      {icon.type === 'goal' && <span className="text-[8px] sm:text-[10px]">⚽</span>}
                      {icon.type === 'yellow_card' && <span className="inline-block w-2 h-2.5 rounded-[1px] bg-yellow-400 border border-yellow-500" />}
                      {icon.type === 'red_card' && <span className="inline-block w-2 h-2.5 rounded-[1px] bg-red-500 border border-red-600" />}
                      {icon.type === 'sub_out' && <span className="text-[8px] text-red-400">▼</span>}
                      {icon.type === 'sub_in' && <span className="text-[8px] text-emerald-400">▲</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="mt-0.5 text-[8px] sm:text-[10px] font-semibold text-white text-center leading-tight drop-shadow-md max-w-[60px] sm:max-w-[80px] truncate">
              {getShortName(pos.player.name)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Formation position calculator ---------- */
interface PlayerPosition {
  player: LineupPlayer;
  x: number;
  y: number;
}

function getFormationPositions(formation: string, players: LineupPlayer[], isHome: boolean): PlayerPosition[] {
  const hasGrid = players.some(p => p.grid);
  if (hasGrid) return getPositionsFromGrid(players, isHome);
  return getPositionsFromFormation(formation, players, isHome);
}

function getPositionsFromGrid(players: LineupPlayer[], isHome: boolean): PlayerPosition[] {
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
      const yBase = 8 + ((row - 1) / Math.max(maxRow - 1, 1)) * 80;
      const y = isHome ? yBase : 100 - yBase;
      positions.push({ player, x, y });
    });
  });

  return positions;
}

function getPositionsFromFormation(formation: string, players: LineupPlayer[], isHome: boolean): PlayerPosition[] {
  const lines = formation.split('-').map(Number).filter(n => !isNaN(n));
  if (!lines.length) {
    return players.map((player, i) => ({
      player, x: 50,
      y: isHome ? 10 + (i / players.length) * 80 : 90 - (i / players.length) * 80,
    }));
  }

  const positions: PlayerPosition[] = [];
  let playerIdx = 0;

  if (playerIdx < players.length) {
    positions.push({ player: players[playerIdx], x: 50, y: isHome ? 8 : 92 });
    playerIdx++;
  }

  const totalLines = lines.length;
  lines.forEach((count, lineIdx) => {
    const yBase = 20 + (lineIdx / Math.max(totalLines - 1, 1)) * 65;
    const y = isHome ? yBase : 100 - yBase;
    for (let col = 0; col < count && playerIdx < players.length; col++) {
      const x = count === 1 ? 50 : 15 + (col / (count - 1)) * 70;
      positions.push({ player: players[playerIdx], x, y });
      playerIdx++;
    }
  });

  return positions;
}

/* ---------- Helpers ---------- */
function getShortName(fullName: string): string {
  const parts = fullName.split(' ');
  if (parts.length <= 1) return fullName;
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

function SubRow({ player, align = 'left', playerEvents }: { player: LineupPlayer; align?: 'left' | 'right'; playerEvents: Map<string, EventIcon[]> }) {
  const icons = getPlayerIcons(player.name, playerEvents);
  const posColor = {
    G: 'text-amber-400', D: 'text-blue-400', M: 'text-emerald-400', F: 'text-red-400',
  }[player.pos] || 'text-muted-foreground';

  return (
    <div className={`flex items-center gap-2 py-1 px-1 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <span className="text-xs font-bold text-muted-foreground w-5 text-center tabular-nums">{player.number}</span>
      <span className="text-sm text-foreground truncate">{player.name}</span>
      {icons.length > 0 && <EventIcons icons={icons} />}
    </div>
  );
}
