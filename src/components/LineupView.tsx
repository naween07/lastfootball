import { TeamLineup, LineupPlayer } from '@/types/football';
import { useState } from 'react';

interface LineupViewProps {
  lineups: { home: TeamLineup; away: TeamLineup };
  homeTeamName: string;
  awayTeamName: string;
}

export default function LineupView({ lineups, homeTeamName, awayTeamName }: LineupViewProps) {
  const [showSubs, setShowSubs] = useState(false);

  return (
    <div className="space-y-4">
      {/* Pitch */}
      <div className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: '68/105' }}>
        {/* Pitch background */}
        <div className="absolute inset-0 bg-[#2d6a30]" />

        {/* Pitch markings */}
        <PitchMarkings />

        {/* Home team (top half) */}
        <div className="absolute inset-x-0 top-0 bottom-1/2">
          <TeamFormation
            teamName={homeTeamName}
            lineup={lineups.home}
            isHome={true}
          />
        </div>

        {/* Away team (bottom half) */}
        <div className="absolute inset-x-0 top-1/2 bottom-0">
          <TeamFormation
            teamName={awayTeamName}
            lineup={lineups.away}
            isHome={false}
          />
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
          <div className="grid grid-cols-2 gap-x-6 gap-y-0">
            {/* Home subs */}
            <div>
              <h4 className="text-xs font-bold text-muted-foreground mb-2">{homeTeamName}</h4>
              {lineups.home.substitutes.map(p => (
                <SubRow key={p.id || p.name} player={p} />
              ))}
            </div>
            {/* Away subs */}
            <div>
              <h4 className="text-xs font-bold text-muted-foreground mb-2">{awayTeamName}</h4>
              {lineups.away.substitutes.map(p => (
                <SubRow key={p.id || p.name} player={p} />
              ))}
            </div>
          </div>

          {/* Coaches */}
          <div className="border-t border-border mt-3 pt-3 flex justify-between">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold">Coach:</span> {lineups.home.coach.name}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold">Coach:</span> {lineups.away.coach.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Pitch markings ---------- */
function PitchMarkings() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Border */}
      <div className="absolute inset-[3%] border-2 border-white/40 rounded-sm" />

      {/* Center line */}
      <div className="absolute left-[3%] right-[3%] top-1/2 h-0.5 bg-white/40 -translate-y-px" />

      {/* Center circle */}
      <div className="absolute left-1/2 top-1/2 w-[18%] aspect-square rounded-full border-2 border-white/40 -translate-x-1/2 -translate-y-1/2" />

      {/* Center dot */}
      <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-white/50 -translate-x-1/2 -translate-y-1/2" />

      {/* Top penalty box */}
      <div className="absolute top-[3%] left-1/2 -translate-x-1/2 w-[44%] h-[16%] border-2 border-white/40 border-t-0" />
      <div className="absolute top-[3%] left-1/2 -translate-x-1/2 w-[20%] h-[6%] border-2 border-white/40 border-t-0" />

      {/* Bottom penalty box */}
      <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 w-[44%] h-[16%] border-2 border-white/40 border-b-0" />
      <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 w-[20%] h-[6%] border-2 border-white/40 border-b-0" />
    </div>
  );
}

/* ---------- Team formation on half pitch ---------- */
function TeamFormation({ teamName, lineup, isHome }: { teamName: string; lineup: TeamLineup; isHome: boolean }) {
  const positions = getFormationPositions(lineup.formation, lineup.startXI, isHome);

  return (
    <div className="relative w-full h-full">
      {positions.map((pos, i) => (
        <div
          key={pos.player.id || pos.player.name + i}
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        >
          {/* Jersey circle */}
          <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-lg ${
            isHome
              ? 'bg-red-600 text-white border-2 border-red-400'
              : 'bg-blue-600 text-white border-2 border-blue-400'
          } ${pos.player.pos === 'G' ? '!bg-amber-500 !border-amber-300' : ''}`}>
            {pos.player.number}
          </div>
          {/* Player name */}
          <span className="mt-0.5 text-[8px] sm:text-[10px] font-semibold text-white text-center leading-tight drop-shadow-md max-w-[60px] sm:max-w-[80px] truncate">
            {getShortName(pos.player.name)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Formation position calculator ---------- */
interface PlayerPosition {
  player: LineupPlayer;
  x: number; // percentage from left
  y: number; // percentage from top (within half)
}

function getFormationPositions(formation: string, players: LineupPlayer[], isHome: boolean): PlayerPosition[] {
  // Try using grid data first
  const hasGrid = players.some(p => p.grid);
  if (hasGrid) {
    return getPositionsFromGrid(players, isHome);
  }
  // Fallback: parse formation string
  return getPositionsFromFormation(formation, players, isHome);
}

function getPositionsFromGrid(players: LineupPlayer[], isHome: boolean): PlayerPosition[] {
  const positions: PlayerPosition[] = [];
  
  // Grid format: "row:col" where row 1 = GK
  let maxRow = 1;
  players.forEach(p => {
    if (p.grid) {
      const row = parseInt(p.grid.split(':')[0]);
      if (row > maxRow) maxRow = row;
    }
  });

  // Group by row
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
      // Spread across x-axis
      const x = totalInRow === 1 ? 50 : 15 + (colIdx / (totalInRow - 1)) * 70;
      // Spread across y-axis within half, with padding
      const yBase = 8 + ((row - 1) / Math.max(maxRow - 1, 1)) * 80;
      const y = isHome ? yBase : 100 - yBase;

      positions.push({ player, x, y });
    });
  });

  return positions;
}

function getPositionsFromFormation(formation: string, players: LineupPlayer[], isHome: boolean): PlayerPosition[] {
  // Parse formation like "4-3-3" or "4-2-3-1"
  const lines = formation.split('-').map(Number).filter(n => !isNaN(n));
  if (!lines.length) {
    // Fallback: just space them out
    return players.map((player, i) => ({
      player,
      x: 50,
      y: isHome ? 10 + (i / players.length) * 80 : 90 - (i / players.length) * 80,
    }));
  }

  const positions: PlayerPosition[] = [];
  let playerIdx = 0;

  // GK first
  if (playerIdx < players.length) {
    const y = isHome ? 8 : 92;
    positions.push({ player: players[playerIdx], x: 50, y });
    playerIdx++;
  }

  // Outfield lines
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
  // First initial + last name
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

function SubRow({ player }: { player: LineupPlayer }) {
  const posColor = {
    G: 'text-amber-400',
    D: 'text-blue-400',
    M: 'text-emerald-400',
    F: 'text-red-400',
  }[player.pos] || 'text-muted-foreground';

  return (
    <div className="flex items-center gap-2 py-1 px-1">
      <span className="text-xs font-bold text-muted-foreground w-5 text-center tabular-nums">{player.number}</span>
      <span className={`text-[10px] font-bold uppercase w-4 text-center ${posColor}`}>{player.pos}</span>
      <span className="text-sm text-foreground truncate">{player.name}</span>
    </div>
  );
}
