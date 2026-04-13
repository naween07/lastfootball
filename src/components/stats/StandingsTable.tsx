import { StandingTeam } from '@/services/footballApi';

interface StandingsTableProps {
  standings: StandingTeam[];
  loading: boolean;
}

export default function StandingsTable({ standings, loading }: StandingsTableProps) {
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-xs">
            <th className="text-left py-3 px-2 w-8">#</th>
            <th className="text-left py-3 px-2">Team</th>
            <th className="text-center py-3 px-1 w-8">P</th>
            <th className="text-center py-3 px-1 w-8">W</th>
            <th className="text-center py-3 px-1 w-8">D</th>
            <th className="text-center py-3 px-1 w-8">L</th>
            <th className="text-center py-3 px-1 w-12 hidden sm:table-cell">GF</th>
            <th className="text-center py-3 px-1 w-12 hidden sm:table-cell">GA</th>
            <th className="text-center py-3 px-1 w-10">GD</th>
            <th className="text-center py-3 px-1 w-10 hidden sm:table-cell">Form</th>
            <th className="text-center py-3 px-2 w-10 font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team) => (
            <tr
              key={team.team.id}
              className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
            >
              <td className="py-2.5 px-2 text-muted-foreground tabular-nums">{team.rank}</td>
              <td className="py-2.5 px-2">
                <div className="flex items-center gap-2">
                  {team.team.logo && (
                    <img src={team.team.logo} alt="" className="w-5 h-5 object-contain" />
                  )}
                  <span className="font-medium text-foreground truncate max-w-[140px] sm:max-w-none">
                    {team.team.name}
                  </span>
                </div>
              </td>
              <td className="text-center py-2.5 px-1 tabular-nums text-muted-foreground">{team.played}</td>
              <td className="text-center py-2.5 px-1 tabular-nums text-muted-foreground">{team.win}</td>
              <td className="text-center py-2.5 px-1 tabular-nums text-muted-foreground">{team.draw}</td>
              <td className="text-center py-2.5 px-1 tabular-nums text-muted-foreground">{team.lose}</td>
              <td className="text-center py-2.5 px-1 tabular-nums text-muted-foreground hidden sm:table-cell">{team.goalsFor}</td>
              <td className="text-center py-2.5 px-1 tabular-nums text-muted-foreground hidden sm:table-cell">{team.goalsAgainst}</td>
              <td className="text-center py-2.5 px-1 tabular-nums font-medium text-foreground">
                {team.goalsDiff > 0 ? `+${team.goalsDiff}` : team.goalsDiff}
              </td>
              <td className="text-center py-2.5 px-1 hidden sm:table-cell">
                <div className="flex items-center justify-center gap-0.5">
                  {team.form.split('').slice(-5).map((f, i) => (
                    <span
                      key={i}
                      className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                        f === 'W' ? 'bg-green-500/20 text-green-400' :
                        f === 'D' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </td>
              <td className="text-center py-2.5 px-2 tabular-nums font-bold text-foreground">{team.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
