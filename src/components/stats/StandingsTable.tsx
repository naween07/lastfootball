import { StandingTeam, CUP_LEAGUE_IDS } from '@/services/footballApi';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface StandingsTableProps {
  standings: StandingTeam[];
  loading: boolean;
  leagueId?: number;
}

const EUROPEAN_DOMESTIC = [39, 140, 135, 78, 61, 94, 88];
const HAS_RELEGATION = [39, 140, 135, 78, 61, 94, 88, 307, 253];

function getZoneColor(rank, total, leagueId) {
  const hasEuropean = leagueId && EUROPEAN_DOMESTIC.includes(leagueId);
  const hasReleg = leagueId && HAS_RELEGATION.includes(leagueId);
  if (hasEuropean && rank <= 4) return 'border-l-[3px] border-l-emerald-500';
  if (hasEuropean && rank <= 6) return 'border-l-[3px] border-l-blue-500';
  if (!hasEuropean && rank <= 1) return 'border-l-[3px] border-l-emerald-500';
  if (hasReleg && rank > total - 3) return 'border-l-[3px] border-l-red-500';
  return 'border-l-[3px] border-l-transparent';
}

function getRankColor(rank, total, leagueId) {
  const hasEuropean = leagueId && EUROPEAN_DOMESTIC.includes(leagueId);
  const hasReleg = leagueId && HAS_RELEGATION.includes(leagueId);
  if (hasEuropean && rank <= 4) return 'text-emerald-400 font-bold';
  if (hasEuropean && rank <= 6) return 'text-blue-400 font-bold';
  if (!hasEuropean && rank <= 1) return 'text-emerald-400 font-bold';
  if (hasReleg && rank > total - 3) return 'text-red-400 font-bold';
  return 'text-muted-foreground';
}

export default function StandingsTable({ standings, loading, leagueId }: StandingsTableProps) {
  if (loading) return (<div className="flex items-center justify-center py-16"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="ml-2 text-sm text-muted-foreground">Loading...</span></div>);
  if (!standings.length) return (<div className="text-center py-16 text-muted-foreground"><p className="text-sm">No standings data available</p></div>);

  const hasGroups = standings.some(t => t.group);

  if (hasGroups) {
    const grouped: Record<string, StandingTeam[]> = {};
    standings.forEach(team => { const g = team.group || 'Group'; if (!grouped[g]) grouped[g] = []; grouped[g].push(team); });
    const thirdPlaceKey = Object.keys(grouped).find(k => k.toLowerCase().includes('third') || k.toLowerCase().includes('3rd'));
    const thirdPlaceTeams = thirdPlaceKey ? grouped[thirdPlaceKey] : null;
    const groupKeys = Object.keys(grouped).filter(k => !k.toLowerCase().includes('third') && !k.toLowerCase().includes('3rd')).sort();
    return (
      <div>
        <div className="flex items-center gap-4 px-3 py-2 mb-2">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-muted-foreground">Qualifies</span></div>
          <div className="text-[10px] text-muted-foreground">{groupKeys.length} groups · {groupKeys.reduce((sum, k) => sum + grouped[k].length, 0)} teams</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groupKeys.map(groupName => {
            const teams = grouped[groupName];
            return (
              <div key={groupName} className={cn("bg-card border border-border rounded-lg overflow-hidden", groupName.toLowerCase().includes('third') && "sm:col-span-2")}>
                <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-primary font-bold">{groupName}</span>
                  {groupName.toLowerCase().includes('third') && <span className="text-[8px] bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded-full font-bold uppercase">Live Ranking</span>}
                </div>
                {groupName.toLowerCase().includes('third') && (
                  <div className="px-3 py-2.5 border-b border-border/50 bg-secondary/50">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <span className="text-primary font-bold">How it works:</span> In the FIFA World Cup 2026, the top 2 teams from each of the 12 groups qualify automatically for the Round of 32. The remaining 8 spots go to the <span className="text-foreground font-semibold">best 8 out of 12 third-placed teams</span>.
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                      Teams are ranked by: <span className="text-foreground/70">Points</span> {'>'} <span className="text-foreground/70">Goal Difference</span> {'>'} <span className="text-foreground/70">Goals Scored</span> {'>'} <span className="text-foreground/70">Fair Play</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 mt-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      This table updates dynamically after each group stage match
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">
                  <span className="w-5 text-center">#</span><span className="flex-1">TEAM</span>
                  <span className="w-6 text-center">P</span><span className="w-6 text-center">W</span><span className="w-6 text-center">D</span><span className="w-6 text-center">L</span>
                  <span className="w-8 text-center">GD</span><span className="w-8 text-center">PTS</span>
                </div>
                {teams.map((team) => (
                  <Link key={team.team.id} to={'/team/' + team.team.id} className={cn('flex items-center gap-2 px-3 py-2 border-t border-border/50 hover:bg-secondary transition-colors', team.rank <= 2 && 'border-l-2 border-l-primary/30')}>
                    <span className={cn('w-5 text-center text-[11px] font-bold', team.rank <= 2 ? 'text-emerald-400' : 'text-muted-foreground/80')}>{team.rank}</span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {team.team.logo ? <img src={team.team.logo} alt="" className="w-5 h-4 object-contain" /> : <div className="w-5 h-4 rounded bg-secondary flex items-center justify-center"><span className="text-[6px] font-bold text-muted-foreground/80">{team.team.name.substring(0,3).toUpperCase()}</span></div>}
                      <span className="text-xs font-semibold text-foreground/90 truncate">{team.team.name}</span>
                    </div>
                    <span className="w-6 text-center text-[11px] text-muted-foreground/80 tabular-nums">{team.played}</span>
                    <span className="w-6 text-center text-[11px] text-muted-foreground/80 tabular-nums">{team.win}</span>
                    <span className="w-6 text-center text-[11px] text-muted-foreground/80 tabular-nums">{team.draw}</span>
                    <span className="w-6 text-center text-[11px] text-muted-foreground/80 tabular-nums">{team.lose}</span>
                    <span className={cn('w-8 text-center text-[11px] tabular-nums', team.goalsDiff > 0 ? 'text-primary' : team.goalsDiff < 0 ? 'text-red-400' : 'text-muted-foreground/80')}>{team.goalsDiff > 0 ? '+' : ''}{team.goalsDiff}</span>
                    <span className="w-8 text-center text-[11px] font-bold text-foreground tabular-nums">{team.points}</span>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>

        {thirdPlaceTeams && thirdPlaceTeams.length > 0 && (
          <div className="mt-4 bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">Ranking of Third-Placed Teams</span>
              <span className="text-[8px] bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded-full font-bold uppercase">Live Ranking</span>
            </div>
            <div className="px-3 py-2.5 border-b border-border/50 bg-secondary/50">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="text-primary font-bold">How it works:</span> Top 2 from each group qualify automatically (24 teams). The <span className="text-foreground font-semibold">best 8 of 12 third-placed teams</span> fill the remaining Round of 32 spots.
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">Ranked by: Points {'>'} Goal Difference {'>'} Goals Scored {'>'} Fair Play</p>
              <p className="text-[10px] text-muted-foreground/80 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                Updates dynamically after each group stage match
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">
              <span className="w-5 text-center">#</span><span className="flex-1">TEAM</span>
              <span className="w-10 text-center">GROUP</span>
              <span className="w-6 text-center">P</span><span className="w-6 text-center">W</span><span className="w-6 text-center">D</span><span className="w-6 text-center">L</span>
              <span className="w-8 text-center">GD</span><span className="w-8 text-center">PTS</span>
            </div>
            {thirdPlaceTeams.map((team, i) => (
              <Link key={team.team.id} to={'/team/' + team.team.id} className={cn('flex items-center gap-2 px-3 py-2 border-t border-border/50 hover:bg-secondary transition-colors', i < 8 && 'border-l-2 border-l-primary/30')}>
                <span className={cn('w-5 text-center text-[11px] font-bold', i < 8 ? 'text-emerald-400' : 'text-red-400')}>{i + 1}</span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {team.team.logo ? <img src={team.team.logo} alt="" className="w-5 h-4 object-contain" /> : <div className="w-5 h-4 rounded bg-secondary flex items-center justify-center"><span className="text-[6px] font-bold text-muted-foreground/80">{team.team.name.substring(0,3).toUpperCase()}</span></div>}
                  <span className="text-xs font-semibold text-foreground/90 truncate">{team.team.name}</span>
                </div>
                <span className="w-10 text-center text-[10px] text-muted-foreground/80">{team.group || '-'}</span>
                <span className="w-6 text-center text-[11px] text-muted-foreground/80 tabular-nums">{team.played}</span>
                <span className="w-6 text-center text-[11px] text-muted-foreground/80 tabular-nums">{team.win}</span>
                <span className="w-6 text-center text-[11px] text-muted-foreground/80 tabular-nums">{team.draw}</span>
                <span className="w-6 text-center text-[11px] text-muted-foreground/80 tabular-nums">{team.lose}</span>
                <span className={cn('w-8 text-center text-[11px] tabular-nums', team.goalsDiff > 0 ? 'text-primary' : team.goalsDiff < 0 ? 'text-red-400' : 'text-muted-foreground/80')}>{team.goalsDiff > 0 ? '+' : ''}{team.goalsDiff}</span>
                <span className="w-8 text-center text-[11px] font-bold text-foreground tabular-nums">{team.points}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const total = standings.length;
  const hasEuropean = leagueId && EUROPEAN_DOMESTIC.includes(leagueId);
  const hasReleg = leagueId && HAS_RELEGATION.includes(leagueId);
  return (
    <div>
      <div className="flex items-center gap-4 px-3 py-2 mb-1">
        {hasEuropean ? (<><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-muted-foreground">Champions League</span></div><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[10px] text-muted-foreground">Europa League</span></div></>) : (<div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-muted-foreground">Champion</span></div>)}
        {hasReleg && (<div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[10px] text-muted-foreground">Relegation</span></div>)}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground/70 text-[11px] uppercase tracking-wider">
            <th className="text-left py-2.5 pl-4 pr-1 w-8">#</th><th className="text-left py-2.5 px-1">Team</th>
            <th className="text-center py-2.5 px-1 w-7">P</th><th className="text-center py-2.5 px-1 w-7">W</th><th className="text-center py-2.5 px-1 w-7">D</th><th className="text-center py-2.5 px-1 w-7">L</th>
            <th className="text-center py-2.5 px-1 w-8 hidden sm:table-cell">GF</th><th className="text-center py-2.5 px-1 w-8 hidden sm:table-cell">GA</th>
            <th className="text-center py-2.5 px-1 w-8">GD</th><th className="text-center py-2.5 px-1 w-20 hidden sm:table-cell">Form</th><th className="text-center py-2.5 px-2 w-10">Pts</th>
          </tr></thead>
          <tbody>
            {standings.map((team) => (
              <tr key={team.team.id} className={'border-b border-border/30 hover:bg-secondary/40 transition-colors ' + getZoneColor(team.rank, total, leagueId)}>
                <td className={'py-2 pl-4 pr-1 text-xs tabular-nums ' + getRankColor(team.rank, total, leagueId)}>{team.rank}</td>
                <td className="py-2 px-1"><Link to={'/team/' + team.team.id} className="flex items-center gap-2 hover:text-primary transition-colors">
                  {team.team.logo ? <img src={team.team.logo} alt={team.team.name} className="w-[18px] h-[18px] object-contain flex-shrink-0" /> : <div className="w-[18px] h-[18px] rounded-full bg-secondary flex items-center justify-center flex-shrink-0"><span className="text-[7px] font-bold text-muted-foreground">{team.team.name.substring(0,3).toUpperCase()}</span></div>}
                  <span className="font-medium text-[13px] text-foreground truncate max-w-[120px] sm:max-w-none">{team.team.name}</span>
                </Link></td>
                <td className="text-center py-2 px-1 tabular-nums text-muted-foreground text-xs">{team.played}</td>
                <td className="text-center py-2 px-1 tabular-nums text-muted-foreground text-xs">{team.win}</td>
                <td className="text-center py-2 px-1 tabular-nums text-muted-foreground text-xs">{team.draw}</td>
                <td className="text-center py-2 px-1 tabular-nums text-muted-foreground text-xs">{team.lose}</td>
                <td className="text-center py-2 px-1 tabular-nums text-muted-foreground text-xs hidden sm:table-cell">{team.goalsFor}</td>
                <td className="text-center py-2 px-1 tabular-nums text-muted-foreground text-xs hidden sm:table-cell">{team.goalsAgainst}</td>
                <td className={'text-center py-2 px-1 tabular-nums text-xs font-semibold ' + (team.goalsDiff > 0 ? 'text-emerald-400' : team.goalsDiff < 0 ? 'text-red-400' : 'text-muted-foreground')}>{team.goalsDiff > 0 ? '+' + team.goalsDiff : team.goalsDiff}</td>
                <td className="text-center py-2 px-1 hidden sm:table-cell"><div className="flex items-center justify-center gap-[3px]">{team.form.split('').slice(-5).map((f, i) => (<span key={i} className={'w-[7px] h-[7px] rounded-full ' + (f === 'W' ? 'bg-emerald-500' : f === 'D' ? 'bg-muted-foreground/50' : 'bg-red-500')} />))}</div></td>
                <td className="text-center py-2 px-2 tabular-nums font-extrabold text-foreground">{team.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
