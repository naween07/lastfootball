import { TeamLineup, LineupPlayer, MatchEvent, MatchPlayerData, MatchPlayerStats } from '@/types/football';
import { useState, useMemo } from 'react';
import PlayerCard from './PlayerCard';

interface LineupViewProps {
  lineups: { home: TeamLineup; away: TeamLineup };
  homeTeamName: string;
  awayTeamName: string;
  events?: MatchEvent[];
  playerData?: MatchPlayerData[];
  homeTeamId?: number;
  awayTeamId?: number;
}

export default function LineupView({ lineups, homeTeamName, awayTeamName, events = [], playerData = [], homeTeamId, awayTeamId }: LineupViewProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<{ player: MatchPlayerStats; teamName: string; teamLogo?: string } | null>(null);
  const playerEvents = buildPlayerEventMap(events);

  // Build lookup maps for player stats by team
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
    <div className="space-y-3">
      {/* Formation header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="text-center flex-1">
          <span className="text-xs font-bold text-foreground">{homeTeamName}</span>
          <span className="ml-2 text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {lineups.home.formation}
          </span>
        </div>
        <div className="text-center flex-1">
          <span className="mr-2 text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {lineups.away.formation}
          </span>
          <span className="text-xs font-bold text-foreground">{awayTeamName}</span>
        </div>
      </div>

      {/* Pitch */}
      <div className="relative w-full overflow-hidden rounded-xl mx-auto" style={{ aspectRatio: '68/105', maxWidth: '420px' }}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a5c1e] to-[#1f6b23]" />
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 8%, rgba(255,255,255,0.5) 8%, rgba(255,255,255,0.5) 8.5%)',
        }} />
        <PitchMarkings />

        <div className="absolute inset-x-0 top-0 bottom-1/2">
          <TeamFormation lineup={lineups.home} isHome={true} playerEvents={playerEvents} playerMap={homePlayerMap} onSelectPlayer={(p) => setSelectedPlayer({ player: p, teamName: homeTeamName })} />
        </div>
        <div className="absolute inset-x-0 top-1/2 bottom-0">
          <TeamFormation lineup={lineups.away} isHome={false} playerEvents={playerEvents} playerMap={awayPlayerMap} onSelectPlayer={(p) => setSelectedPlayer({ player: p, teamName: awayTeamName })} />
        </div>
      </div>

      {/* Substitutes toggle */}
      {/* Substitutes — always visible */}
      <div className="px-4 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Substitutes</span>
          <div className="flex-1 h-px bg-border" />
        </div>

          {/* Home subs */}
          <div className="space-y-0">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-1">{homeTeamName}</div>
            {lineups.home.substitutes.map(p => (
              <SubRow key={p.id || p.name} player={p} playerEvents={playerEvents} playerStats={homePlayerMap.get(p.id)} />
            ))}
          </div>

          {/* Away subs */}
          <div className="space-y-0 mt-3">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-1">{awayTeamName}</div>
            {lineups.away.substitutes.map(p => (
              <SubRow key={p.id || p.name} player={p} playerEvents={playerEvents} playerStats={awayPlayerMap.get(p.id)} />
            ))}
          </div>

          {/* Coaches — only shown when at least one coach name is known */}
          {(lineups.home.coach.name && lineups.home.coach.name !== 'Unknown') ||
           (lineups.away.coach.name && lineups.away.coach.name !== 'Unknown') ? (
            <div className="border-t border-border/50 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Manager</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="flex justify-between px-1">
                <div className="flex items-center gap-2">
                  {lineups.home.coach.photo && (
                    <img src={lineups.home.coach.photo} alt="" className="w-7 h-7 rounded-full object-cover bg-secondary" />
                  )}
                  {lineups.home.coach.name && lineups.home.coach.name !== 'Unknown' ? (
                    <span className="text-sm font-medium text-muted-foreground">{lineups.home.coach.name}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground/40 italic">—</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {lineups.away.coach.name && lineups.away.coach.name !== 'Unknown' ? (
                    <span className="text-sm font-medium text-muted-foreground">{lineups.away.coach.name}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground/40 italic">—</span>
                  )}
                  {lineups.away.coach.photo && (
                    <img src={lineups.away.coach.photo} alt="" className="w-7 h-7 rounded-full object-cover bg-secondary" />
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Player card overlay */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPlayer(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm scale-in">
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

/* ---------- Rating badge color ---------- */
function getRatingColor(rating: string | null): string {
  if (!rating) return 'bg-secondary text-muted-foreground';
  const r = parseFloat(rating);
  if (r >= 8.0) return 'bg-emerald-500 text-white';
  if (r >= 7.0) return 'bg-emerald-600/80 text-white';
  if (r >= 6.5) return 'bg-amber-500 text-white';
  if (r >= 6.0) return 'bg-orange-500 text-white';
  return 'bg-red-500 text-white';
}

/* ---------- Event icon types ---------- */
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
    }
    else if (e.type === 'yellow_card') addEvent(e.playerName, { type: 'yellow_card', minute: e.minute });
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

/* ---------- Pitch markings ---------- */
function PitchMarkings() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-[3%] border-[1.5px] border-white/30 rounded-sm" />
      <div className="absolute left-[3%] right-[3%] top-1/2 h-[1.5px] bg-white/30 -translate-y-px" />
      <div className="absolute left-1/2 top-1/2 w-[18%] aspect-square rounded-full border-[1.5px] border-white/30 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-white/40 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute top-[3%] left-1/2 -translate-x-1/2 w-[44%] h-[16%] border-[1.5px] border-white/30 border-t-0" />
      <div className="absolute top-[3%] left-1/2 -translate-x-1/2 w-[20%] h-[6%] border-[1.5px] border-white/30 border-t-0" />
      <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 w-[44%] h-[16%] border-[1.5px] border-white/30 border-b-0" />
      <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 w-[20%] h-[6%] border-[1.5px] border-white/30 border-b-0" />
      <div className="absolute top-[3%] left-[3%] w-3 h-3 border-b-[1.5px] border-r-[1.5px] border-white/20 rounded-br-full" />
      <div className="absolute top-[3%] right-[3%] w-3 h-3 border-b-[1.5px] border-l-[1.5px] border-white/20 rounded-bl-full" />
      <div className="absolute bottom-[3%] left-[3%] w-3 h-3 border-t-[1.5px] border-r-[1.5px] border-white/20 rounded-tr-full" />
      <div className="absolute bottom-[3%] right-[3%] w-3 h-3 border-t-[1.5px] border-l-[1.5px] border-white/20 rounded-tl-full" />
    </div>
  );
}

/* ---------- Team formation on half pitch ---------- */
function TeamFormation({ lineup, isHome, playerEvents, playerMap, onSelectPlayer }: {
  lineup: TeamLineup;
  isHome: boolean;
  playerEvents: Map<string, EventIcon[]>;
  playerMap: Map<number, MatchPlayerStats>;
  onSelectPlayer?: (player: MatchPlayerStats) => void;
}) {
  const positions = getFormationPositions(lineup.formation, lineup.startXI, isHome);

  return (
    <div className="relative w-full h-full">
      {positions.map((pos, i) => {
        const icons = getPlayerIcons(pos.player.name, playerEvents);
        const stats = playerMap.get(pos.player.id);
        const isGK = pos.player.pos === 'G';

        return (
          <div
            key={pos.player.id || pos.player.name + i}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 cursor-pointer"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            onClick={() => stats && onSelectPlayer?.(stats)}
          >
            <div className="relative">
              {/* Player photo or number circle */}
              {stats?.photo ? (
                <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden ring-2 shadow-md ${
                  isGK ? 'ring-amber-400' : isHome ? 'ring-white/40' : 'ring-[#3a3a5e]/60'
                }`}>
                  <img
                    src={stats.photo}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-extrabold shadow-md ${
                  isGK
                    ? 'bg-amber-500 text-black ring-2 ring-amber-300/50'
                    : isHome
                      ? 'bg-white text-[#1a1a1a] ring-2 ring-white/30'
                      : 'bg-[#2a2a3e] text-white ring-2 ring-[#3a3a5e]/50'
                }`}>
                  {pos.player.number}
                </div>
              )}

              {/* Rating badge — top left */}
              {stats?.rating && (
                <div className={`absolute -top-1 -left-2 px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-extrabold leading-none ${getRatingColor(stats.rating)}`}>
                  {parseFloat(stats.rating).toFixed(1)}
                </div>
              )}

              {/* Event badges — top right */}
              {icons.length > 0 && (
                <div className="absolute -top-1 -right-2.5 flex gap-[2px]">
                  {icons.slice(0, 4).map((icon, idx) => (
                    <span key={idx} className="inline-flex" title={`${icon.minute}'`}>
                      {icon.type === 'goal' && (
                        <span className="text-[10px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">⚽</span>
                      )}
                      {icon.type === 'own_goal' && (
                        <span className="text-[10px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">🔴</span>
                      )}
                      {icon.type === 'assist' && (
                        <span className="text-[10px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">👟</span>
                      )}
                      {icon.type === 'yellow_card' && <span className="w-2.5 h-3 rounded-[1px] bg-yellow-400 shadow-sm" />}
                      {icon.type === 'red_card' && <span className="w-2.5 h-3 rounded-[1px] bg-red-500 shadow-sm" />}
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
              )}

              {/* Captain badge */}
              {stats?.captain && (
                <div className="absolute -bottom-0.5 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 flex items-center justify-center">
                  <span className="text-[7px] font-extrabold text-black">C</span>
                </div>
              )}
            </div>

            {/* Player name */}
            <span className="mt-[2px] text-[8px] sm:text-[10px] font-semibold text-white text-center leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] max-w-[56px] sm:max-w-[72px] truncate">
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

function SubRow({ player, playerEvents, playerStats }: {
  player: LineupPlayer;
  playerEvents: Map<string, EventIcon[]>;
  playerStats?: MatchPlayerStats;
}) {
  const icons = getPlayerIcons(player.name, playerEvents);
  const subIcon = icons.find(i => i.type === 'sub_in');

  const posColors: Record<string, string> = {
    G: 'bg-amber-500/15 text-amber-400',
    D: 'bg-blue-500/15 text-blue-400',
    M: 'bg-emerald-500/15 text-emerald-400',
    F: 'bg-red-500/15 text-red-400',
  };
  const posStyle = posColors[player.pos] || 'bg-secondary text-muted-foreground';

  return (
    <div className="flex items-center gap-2 py-1.5 px-1 hover:bg-secondary/30 rounded transition-colors">
      {/* Rating badge */}
      {playerStats?.rating ? (
        <span className={`text-[10px] font-extrabold w-7 h-5 rounded flex items-center justify-center flex-shrink-0 ${getRatingColor(playerStats.rating)}`}>
          {parseFloat(playerStats.rating).toFixed(1)}
        </span>
      ) : (
        <span className={`text-[10px] font-bold w-7 h-5 rounded flex items-center justify-center flex-shrink-0 ${posStyle}`}>
          {player.number}
        </span>
      )}

      {/* Player photo */}
      {playerStats?.photo ? (
        <img src={playerStats.photo} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 bg-secondary" loading="lazy" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <span className="text-[8px] font-bold text-muted-foreground">{player.number}</span>
        </div>
      )}

      {/* Name + position */}
      <div className="flex-1 min-w-0">
        <span className="text-[13px] text-foreground/80 truncate block">{player.name}</span>
        {playerStats && (
          <span className="text-[10px] text-muted-foreground">
            {playerStats.position === 'G' ? 'Goalkeeper' :
             playerStats.position === 'D' ? 'Defender' :
             playerStats.position === 'M' ? 'Midfielder' :
             playerStats.position === 'F' ? 'Attacker' : playerStats.position}
          </span>
        )}
      </div>

      {/* Sub minute */}
      {subIcon && (
        <span className="text-[10px] text-emerald-400 font-semibold flex-shrink-0">{subIcon.minute}'</span>
      )}

      {/* Event icons */}
      {icons.length > 0 && (
        <div className="flex items-center gap-[2px] flex-shrink-0">
          {icons.filter(i => i.type !== 'sub_in').map((icon, idx) => (
            <span key={idx} className="inline-flex" title={`${icon.minute}'`}>
              {icon.type === 'goal' && <span className="text-[10px]">⚽</span>}
              {icon.type === 'own_goal' && <span className="text-[10px]">🔴</span>}
              {icon.type === 'assist' && <span className="text-[10px]">👟</span>}
              {icon.type === 'yellow_card' && <span className="w-2 h-2.5 rounded-[1px] bg-yellow-400" />}
              {icon.type === 'red_card' && <span className="w-2 h-2.5 rounded-[1px] bg-red-500" />}
              {icon.type === 'sub_out' && <span className="text-[9px] text-red-400 font-bold">↓</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}