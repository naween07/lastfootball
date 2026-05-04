import { StandingTeam } from '@/services/footballApi';
import { Link } from 'react-router-dom';

interface StandingsTableProps {
  standings: StandingTeam[];
  loading: boolean;
  leagueId?: number;
}

// Leagues that have European competition qualification
const EUROPEAN_DOMESTIC = [39, 140, 135, 78, 61, 94, 88]; // PL, La Liga, Serie A, Bundesliga, Ligue 1, Primeira Liga, Eredivisie
// Leagues with relegation
const HAS_RELEGATION = [39, 140, 135, 78, 61, 94, 88, 307, 253]; // All domestic leagues

function getZoneColor(rank: number, total: number, leagueId?: number): string {
  const hasEuropean = leagueId && EUROPEAN_DOMESTIC.includes(leagueId);
  const hasReleg = leagueId && HAS_RELEGATION.includes(leagueId);

  if (hasEuropean && rank <= 4) return 'border-l-[3px] border-l-emerald-500';    // UCL
  if (hasEuropean && rank <= 6) return 'border-l-[3px] border-l-blue-500';       // UEL
  if (!hasEuropean && rank <= 1) return 'border-l-[3px] border-l-emerald-500';   // Champion for non-European
  if (hasReleg && rank > total - 3) return 'border-l-[3px] border-l-red-500';    // Relegation
  return 'border-l-[3px] border-l-transparent';
}

function getRankColor(rank: number, total: number, leagueId?: number): string {
  const hasEuropean = leagueId && EUROPEAN_DOMESTIC.includes(leagueId);
  const hasReleg = leagueId && HAS_RELEGATION.includes(leagueId);

  if (hasEuropean && rank <= 4) return 'text-emerald-400 font-bold';
  if (hasEuropean && rank <= 6) return 'text-blue-400 font-bold';
  if (!hasEuropean && rank <= 1) return 'text-emerald-400 font-bold';
  if (hasReleg && rank > total - 3) return 'text-red-400 font-bold';
  return 'text-muted-foreground';
}

export default function StandingsTable({ standings, loading, leagueId }: StandingsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Loading standings...</span>
      </div>
    );
  }

  if (!standings.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">No standings data available</p>
      </div>
    );
  }

  const total = standings.length;
  const hasEuropean = leagueId && EUROPEAN_DOMESTIC.includes(leagueId);
  const hasReleg = leagueId && HAS_RELEGATION.includes(leagueId);

  return (
    <div>
      {/* Zone legend — only show relevant zones */}
      <div className="flex items-center gap-4 px-3 py-2 mb-1">
        {hasEuropean ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-muted-foreground">Champions League</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] text-muted-foreground">Europa League</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-muted-foreground">Champion</span>
          </div>
        )}
        {hasReleg && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-muted-foreground">Relegation</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground/70 text-[11px] uppercase tracking-wider">
              <th className="text-left py-2.5 pl-4 pr-1 w-8">#</th>
              <th className="text-left py-2.5 px-1">Team</th>
              <th className="text-center py-2.5 px-1 w-7">P</th>
              <th className="text-center py-2.5 px-1 w-7">W</th>
              <th className="text-center py-2.5 px-1 w-7">D</th>
              <th className="text-center py-2.5 px-1 w-7">L</th>
              <th className="text-center py-2.5 px-1 w-8 hidden sm:table-cell">GF</th>
              <th className="text-center py-2.5 px-1 w-8 hidden sm:table-cell">GA</th>
              <th className="text-center py-2.5 px-1 w-8">GD</th>
              <th className="text-center py-2.5 px-1 w-20 hidden sm:table-cell">Form</th>
              <th className="text-center py-2.5 px-2 w-10">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team) => (
              <tr
                key={team.team.id}
                className={`border-b border-border/30 hover:bg-secondary/40 transition-colors ${getZoneColor(team.rank, total, leagueId)}`}
              >
                {/* Rank */}
                <td className={`py-2 pl-4 pr-1 text-xs tabular-nums ${getRankColor(team.rank, total, leagueId)}`}>
                  {team.rank}
                </td>

                {/* Team name + logo */}
                <td className="py-2 px-1">
                  <Link to={`/team/${team.team.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                    {team.team.logo ? (
                      <img src={team.team.logo} alt={team.team.name} className="w-[18px] h-[18px] object-contain flex-shrink-0" />
                    ) : (
                      <div className="w-[18px] h-[18px] rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <span className="text-[7px] font-bold text-muted-foreground">
                          {team.team.name.substring(0, 3).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="font-medium text-[13px] text-foreground truncate max-w-[120px] sm:max-w-none">
                      {team.team.name}
                    </span>
                  </Link>
                </td>

                {/* Stats */}
                <td className="text-center py-2 px-1 tabular-nums text-muted-foreground text-xs">{team.played}</td>
                <td className="text-center py-2 px-1 tabular-nums text-muted-foreground text-xs">{team.win}</td>
                <td className="text-center py-2 px-1 tabular-nums text-muted-foreground text-xs">{team.draw}</td>
                <td className="text-center py-2 px-1 tabular-nums text-muted-foreground text-xs">{team.lose}</td>
                <td className="text-center py-2 px-1 tabular-nums text-muted-foreground text-xs hidden sm:table-cell">{team.goalsFor}</td>
                <td className="text-center py-2 px-1 tabular-nums text-muted-foreground text-xs hidden sm:table-cell">{team.goalsAgainst}</td>
                <td className={`text-center py-2 px-1 tabular-nums text-xs font-semibold ${
                  team.goalsDiff > 0 ? 'text-emerald-400' : team.goalsDiff < 0 ? 'text-red-400' : 'text-muted-foreground'
                }`}>
                  {team.goalsDiff > 0 ? `+${team.goalsDiff}` : team.goalsDiff}
                </td>

                {/* Form guide dots */}
                <td className="text-center py-2 px-1 hidden sm:table-cell">
                  <div className="flex items-center justify-center gap-[3px]">
                    {team.form.split('').slice(-5).map((f, i) => (
                      <span
                        key={i}
                        className={`w-[7px] h-[7px] rounded-full ${
                          f === 'W' ? 'bg-emerald-500' :
                          f === 'D' ? 'bg-muted-foreground/50' :
                          'bg-red-500'
                        }`}
                        title={f === 'W' ? 'Win' : f === 'D' ? 'Draw' : 'Loss'}
                      />
                    ))}
                  </div>
                </td>

                {/* Points */}
                <td className="text-center py-2 px-2 tabular-nums font-extrabold text-foreground">{team.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}