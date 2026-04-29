import { StandingTeam } from '@/services/footballApi';

interface LeagueSummaryProps {
  leagueName: string;
  standings: StandingTeam[];
  season: number;
}

export default function LeagueSummary({ leagueName, standings, season }: LeagueSummaryProps) {
  if (standings.length < 5) return null;

  const leader = standings[0];
  const second = standings[1];
  const third = standings[2];
  const totalGoals = standings.reduce((sum, t) => sum + t.goalsFor, 0);
  const totalMatches = standings.reduce((sum, t) => sum + t.played, 0) / 2; // Each match counted twice
  const avgGoalsPerMatch = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(1) : '0';

  // Best attack
  const bestAttack = [...standings].sort((a, b) => b.goalsFor - a.goalsFor)[0];
  // Best defense
  const bestDefense = [...standings].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];
  // Most draws
  const mostDraws = [...standings].sort((a, b) => b.draw - a.draw)[0];
  // Biggest goal difference
  const bestGD = [...standings].sort((a, b) => b.goalsDiff - a.goalsDiff)[0];
  // Bottom 3 (relegation zone)
  const relegation = standings.slice(-3);

  const gap = leader.points - second.points;
  const seasonStr = `${season}/${(season + 1).toString().slice(-2)}`;

  return (
    <div className="px-4 py-5 border-t border-border/30 space-y-4">
      <h3 className="text-sm font-bold text-foreground">
        {leagueName} {seasonStr} — Season Overview
      </h3>

      <p className="text-sm text-foreground/75 leading-relaxed">
        {leader.team.name} currently lead the {leagueName} standings with {leader.points} points
        from {leader.played} matches, having won {leader.win}, drawn {leader.draw}, and lost {leader.lose}.
        {gap > 0
          ? ` They hold a ${gap}-point advantage over ${second.team.name} in second place.`
          : ` ${second.team.name} are level on points, making it a tightly contested title race.`
        }
        {' '}{third.team.name} sit third with {third.points} points.
      </p>

      <p className="text-sm text-foreground/75 leading-relaxed">
        The {leagueName} has produced {totalGoals} goals this season, averaging {avgGoalsPerMatch} goals
        per match. {bestAttack.team.name} lead the scoring charts with {bestAttack.goalsFor} goals,
        while {bestDefense.team.name} have the meanest defence, conceding just {bestDefense.goalsAgainst} goals
        in {bestDefense.played} matches.
        {bestGD.team.name !== bestAttack.team.name && bestGD.team.name !== bestDefense.team.name
          ? ` ${bestGD.team.name} boast the best goal difference at ${bestGD.goalsDiff > 0 ? '+' : ''}${bestGD.goalsDiff}.`
          : ''
        }
      </p>

      <p className="text-sm text-foreground/75 leading-relaxed">
        At the other end of the table, {relegation.map((t, i) =>
          i === relegation.length - 1
            ? `and ${t.team.name} (${t.points} pts)`
            : `${t.team.name} (${t.points} pts), `
        ).join('')} occupy the relegation places.
        {mostDraws.draw >= 8
          ? ` ${mostDraws.team.name} have been involved in the most draws this season with ${mostDraws.draw}.`
          : ''
        }
      </p>

      {/* Key stats grid for SEO + visual */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <StatBox label="Top of the table" value={leader.team.name} sub={`${leader.points} pts`} />
        <StatBox label="Most goals scored" value={bestAttack.team.name} sub={`${bestAttack.goalsFor} goals`} />
        <StatBox label="Best defence" value={bestDefense.team.name} sub={`${bestDefense.goalsAgainst} conceded`} />
        <StatBox label="Goals per match" value={avgGoalsPerMatch} sub={`${totalGoals} total`} />
      </div>
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-secondary/30 rounded-lg p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-sm font-bold text-foreground mt-0.5 truncate">{value}</p>
      <p className="text-xs text-primary font-semibold">{sub}</p>
    </div>
  );
}
