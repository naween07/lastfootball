import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import OptimizedImage from '@/components/OptimizedImage';
import {
  fetchTeamInfo, fetchTeamStatistics, fetchSquad, fetchTeamFixtures,
  TeamInfo, TeamStatSummary, SquadPlayer, Match,
} from '@/services/footballApi';
import { ArrowLeft, MapPin, Calendar, Users, Trophy, Loader2, Shield, Swords, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'fixtures' | 'squad';

export default function TeamProfile() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [stats, setStats] = useState<TeamStatSummary | null>(null);
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!teamId) return;
    const id = parseInt(teamId);
    setLoading(true);

    Promise.allSettled([
      fetchTeamInfo(id),
      fetchTeamFixtures(id, 5, 5),
      fetchSquad(id),
    ]).then(([teamRes, fixturesRes, squadRes]) => {
      if (teamRes.status === 'fulfilled') setTeam(teamRes.value);
      if (fixturesRes.status === 'fulfilled') setMatches(fixturesRes.value);
      if (squadRes.status === 'fulfilled') setSquad(squadRes.value);
      setLoading(false);
    });
  }, [teamId]);

  // Fetch stats after we know the team's league
  useEffect(() => {
    if (!team || !teamId) return;
    // Try top 5 leagues
    const leagues = [39, 140, 135, 78, 61, 2, 3, 45, 143, 137];
    const tryFetch = async () => {
      for (const leagueId of leagues) {
        const s = await fetchTeamStatistics(parseInt(teamId), leagueId, 2025);
        if (s && s.fixtures.played > 0) {
          setStats(s);
          return;
        }
      }
    };
    tryFetch();
  }, [team, teamId]);

  const recentResults = useMemo(() =>
    matches.filter(m => m.status === 'FT' || m.status === 'AET' || m.status === 'PEN'),
  [matches]);

  const upcoming = useMemo(() =>
    matches.filter(m => m.status === 'NS' || m.status === 'TBD'),
  [matches]);

  const squadByPosition = useMemo(() => {
    const groups: Record<string, SquadPlayer[]> = { Goalkeeper: [], Defender: [], Midfielder: [], Attacker: [] };
    squad.forEach(p => {
      const pos = p.position === 'Goalkeeper' ? 'Goalkeeper' :
                  p.position === 'Defender' ? 'Defender' :
                  p.position === 'Midfielder' ? 'Midfielder' : 'Attacker';
      if (!groups[pos]) groups[pos] = [];
      groups[pos].push(p);
    });
    return groups;
  }, [squad]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container text-center py-20">
          <p className="text-lg font-medium text-muted-foreground">Team not found</p>
          <Link to="/live" className="text-primary hover:underline text-sm mt-2 inline-block">← Back to matches</Link>
        </div>
      </div>
    );
  }

  const form = stats?.form?.slice(-5).split('') || [];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${team.name} — Team Profile | LastFootball`}
        description={`${team.name} squad, fixtures, results, and stats. Founded ${team.founded || 'N/A'}. Stadium: ${team.venue.name}.`}
        path={`/team/${teamId}`}
      />
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-b from-card to-background border-b border-border">
        <div className="container max-w-4xl py-6">
          <Link to="/live" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>

          <div className="flex items-center gap-5">
            <OptimizedImage src={team.logo} alt={team.name} className="w-20 h-20 sm:w-24 sm:h-24 object-contain" priority />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground">{team.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                {team.country && (
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {team.country}</span>
                )}
                {team.founded && (
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Est. {team.founded}</span>
                )}
                {team.venue.name && (
                  <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> {team.venue.name}</span>
                )}
              </div>

              {/* Form */}
              {form.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3">
                  <span className="text-xs text-muted-foreground mr-1">Form:</span>
                  {form.map((f, i) => (
                    <span key={i} className={cn(
                      'w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black',
                      f === 'W' ? 'bg-emerald-500/20 text-emerald-400' :
                      f === 'D' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400',
                    )}>
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick stats */}
          {stats && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-5">
              <QuickStat label="Played" value={stats.fixtures.played} />
              <QuickStat label="Won" value={stats.fixtures.wins} color="text-emerald-400" />
              <QuickStat label="Drawn" value={stats.fixtures.draws} color="text-amber-400" />
              <QuickStat label="Lost" value={stats.fixtures.losses} color="text-red-400" />
              <QuickStat label="GF" value={stats.goals.for} />
              <QuickStat label="GA" value={stats.goals.against} />
            </div>
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container max-w-4xl flex items-center gap-1 py-2">
          {(['overview', 'fixtures', 'squad'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-semibold transition-all capitalize',
                tab === t ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="container max-w-4xl py-4 pb-20 md:pb-4">
        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-5">
            {/* Season stats */}
            {stats && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" /> Season Statistics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatCard label="Goals per game" value={stats.goalsAvgPerGame.toFixed(1)} />
                  <StatCard label="Clean sheets" value={stats.cleanSheets} />
                  <StatCard label="Failed to score" value={stats.failedToScore} />
                  <StatCard label="Home wins" value={`${stats.fixturesHome.wins}/${stats.fixturesHome.played}`} />
                  <StatCard label="Away wins" value={`${stats.fixturesAway.wins}/${stats.fixturesAway.played}`} />
                  <StatCard label="Penalties" value={`${stats.penalty.scored}/${stats.penalty.scored + stats.penalty.missed}`} />
                </div>
              </div>
            )}

            {/* Recent Results */}
            {recentResults.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                  <Swords className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Recent Results</h3>
                </div>
                {recentResults.map(m => (
                  <MatchRow key={m.id} match={m} teamId={parseInt(teamId!)} />
                ))}
              </div>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-foreground">Upcoming Fixtures</h3>
                </div>
                {upcoming.map(m => (
                  <MatchRow key={m.id} match={m} teamId={parseInt(teamId!)} />
                ))}
              </div>
            )}

            {/* Venue */}
            {team.venue.name && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {team.venue.image && (
                  <img src={team.venue.image} alt={team.venue.name} className="w-full h-40 sm:h-56 object-cover" loading="lazy" />
                )}
                <div className="p-4">
                  <h3 className="text-sm font-bold text-foreground">{team.venue.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {team.venue.city}{team.venue.capacity ? ` · Capacity: ${team.venue.capacity.toLocaleString()}` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* SEO: Team Analysis Narrative */}
            {stats && (
              <TeamAnalysis team={team} stats={stats} recentResults={recentResults} />
            )}

            {/* SEO: People Also Ask */}
            <PeopleAlsoAsk team={team} stats={stats} />
          </div>
        )}

        {/* Fixtures tab */}
        {tab === 'fixtures' && (
          <div className="space-y-4">
            {recentResults.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border/30">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Results</h3>
                </div>
                {recentResults.map(m => <MatchRow key={m.id} match={m} teamId={parseInt(teamId!)} />)}
              </div>
            )}
            {upcoming.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border/30">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Upcoming</h3>
                </div>
                {upcoming.map(m => <MatchRow key={m.id} match={m} teamId={parseInt(teamId!)} />)}
              </div>
            )}
          </div>
        )}

        {/* Squad tab */}
        {tab === 'squad' && (
          <div className="space-y-4">
            {Object.entries(squadByPosition).map(([position, players]) => (
              players.length > 0 && (
                <div key={position} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border/30 bg-secondary/20">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{position}s ({players.length})</h3>
                  </div>
                  <div className="divide-y divide-border/10">
                    {players.map(p => (
                      <Link key={p.id} to={`/player/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/30 transition-colors">
                        <span className="text-xs font-bold text-muted-foreground w-6 text-center tabular-nums">
                          {p.number || '-'}
                        </span>
                        <img src={p.photo} alt="" className="w-9 h-9 rounded-full object-cover bg-secondary" loading="lazy" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate hover:text-primary transition-colors">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground">{p.nationality}{p.age ? ` · ${p.age} yrs` : ''}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                      </Link>
                    ))}
                  </div>
                </div>
              )
            ))}
            {squad.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">Squad data not available</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function QuickStat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
      <p className={cn('text-lg font-black tabular-nums', color || 'text-foreground')}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-secondary/20 rounded-lg p-3">
      <p className="text-lg font-black text-foreground tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">{label}</p>
    </div>
  );
}

function MatchRow({ match, teamId }: { match: Match; teamId: number }) {
  const isFinished = match.status === 'FT' || match.status === 'AET' || match.status === 'PEN';
  const hasScore = match.homeScore !== null;
  const isHome = match.homeTeam.id === teamId;

  let borderClass = '';
  if (isFinished && hasScore) {
    const teamScore = isHome ? match.homeScore! : match.awayScore!;
    const oppScore = isHome ? match.awayScore! : match.homeScore!;
    if (teamScore > oppScore) borderClass = 'border-l-[3px] border-l-emerald-400';
    else if (teamScore < oppScore) borderClass = 'border-l-[3px] border-l-red-400';
    else borderClass = 'border-l-[3px] border-l-amber-400';
  }

  return (
    <Link to={`/match/${match.id}`} className={cn('flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors', borderClass)}>
      {match.league.logo && <OptimizedImage src={match.league.logo} alt="" className="w-4 h-4 object-contain opacity-40 flex-shrink-0" />}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <OptimizedImage src={match.homeTeam.logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
        <span className={cn('text-sm truncate', match.homeTeam.id === teamId ? 'font-bold text-foreground' : 'text-muted-foreground')}>
          {match.homeTeam.name}
        </span>
      </div>
      <div className="text-center min-w-[50px]">
        {hasScore ? (
          <span className="text-sm font-black text-foreground tabular-nums">{match.homeScore} - {match.awayScore}</span>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">{match.time}</span>
        )}
        <div className="text-[8px] text-muted-foreground uppercase">{isFinished ? match.status : match.date?.slice(5)}</div>
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className={cn('text-sm truncate', match.awayTeam.id === teamId ? 'font-bold text-foreground' : 'text-muted-foreground')}>
          {match.awayTeam.name}
        </span>
        <OptimizedImage src={match.awayTeam.logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
      </div>
    </Link>
  );
}

// ─── SEO: Team Analysis Narrative ───────────────────────────────────────────
function TeamAnalysis({ team, stats, recentResults }: { team: TeamInfo; stats: TeamStatSummary; recentResults: Match[] }) {
  const { fixtures, goals, goalsHome, goalsAway, cleanSheets, failedToScore, penalty, fixturesHome, fixturesAway, biggestStreak } = stats;
  const winRate = fixtures.played > 0 ? ((fixtures.wins / fixtures.played) * 100).toFixed(0) : '0';
  const homeWinRate = fixturesHome.played > 0 ? ((fixturesHome.wins / fixturesHome.played) * 100).toFixed(0) : '0';
  const awayWinRate = fixturesAway.played > 0 ? ((fixturesAway.wins / fixturesAway.played) * 100).toFixed(0) : '0';
  const goalsPerGame = fixtures.played > 0 ? (goals.for / fixtures.played).toFixed(1) : '0';
  const concededPerGame = fixtures.played > 0 ? (goals.against / fixtures.played).toFixed(1) : '0';

  const recentForm = recentResults.slice(0, 5).map(m => {
    const isHome = m.homeTeam.id === team.id;
    const teamScore = isHome ? m.homeScore! : m.awayScore!;
    const oppScore = isHome ? m.awayScore! : m.homeScore!;
    return teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'D';
  }).join('');

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
        <Swords className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">{team.name} — Season Analysis</h3>
      </div>
      <div className="p-4 space-y-4">
        {/* Narrative text */}
        <p className="text-sm text-foreground/80 leading-relaxed">
          {team.name} have played {fixtures.played} matches this season, recording {fixtures.wins} victories,
          {' '}{fixtures.draws} draws, and {fixtures.losses} defeats — a {winRate}% win rate.
          With {goals.for} goals scored at an average of {goalsPerGame} per match, they have proven to be
          {Number(goalsPerGame) >= 2.0 ? ' a potent attacking force' : Number(goalsPerGame) >= 1.5 ? ' a consistent offensive unit' : ' a side that can struggle for goals'}.
          Defensively, they have conceded {goals.against} goals ({concededPerGame} per game)
          {cleanSheets >= 10 ? `, keeping an impressive ${cleanSheets} clean sheets` : cleanSheets >= 5 ? ` with ${cleanSheets} clean sheets to their name` : ''}.
        </p>

        <p className="text-sm text-foreground/80 leading-relaxed">
          At home, {team.name} boast a {homeWinRate}% win rate ({fixturesHome.wins}W {fixturesHome.draws}D {fixturesHome.losses}L),
          scoring {goalsHome.for} and conceding {goalsHome.against}.
          On the road, their record reads {fixturesAway.wins}W {fixturesAway.draws}D {fixturesAway.losses}L ({awayWinRate}% win rate),
          with {goalsAway.for} goals scored and {goalsAway.against} conceded away from home.
          {Number(homeWinRate) >= 70 ? ` Their home ground has been a genuine fortress this season.` : ''}
          {Number(awayWinRate) >= 50 ? ` They are strong travellers, picking up consistent points on the road.` : ''}
        </p>

        {(penalty.scored > 0 || biggestStreak.wins >= 3) && (
          <p className="text-sm text-foreground/80 leading-relaxed">
            {penalty.scored > 0 ? `From the penalty spot, ${team.name} have converted ${penalty.scored} of ${penalty.scored + penalty.missed} attempts this season. ` : ''}
            {biggestStreak.wins >= 3 ? `Their longest winning streak stands at ${biggestStreak.wins} consecutive matches. ` : ''}
            {failedToScore >= 5 ? `However, they have failed to score in ${failedToScore} matches, suggesting inconsistency in the final third.` : ''}
          </p>
        )}

        {/* Stats comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 text-xs text-muted-foreground font-semibold">Metric</th>
                <th className="text-center py-2 text-xs text-muted-foreground font-semibold">Home</th>
                <th className="text-center py-2 text-xs text-muted-foreground font-semibold">Away</th>
                <th className="text-center py-2 text-xs text-muted-foreground font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              <tr>
                <td className="py-2 text-xs text-muted-foreground">Matches</td>
                <td className="py-2 text-xs text-foreground text-center font-semibold">{fixturesHome.played}</td>
                <td className="py-2 text-xs text-foreground text-center font-semibold">{fixturesAway.played}</td>
                <td className="py-2 text-xs text-primary text-center font-bold">{fixtures.played}</td>
              </tr>
              <tr>
                <td className="py-2 text-xs text-muted-foreground">Wins</td>
                <td className="py-2 text-xs text-emerald-400 text-center font-semibold">{fixturesHome.wins}</td>
                <td className="py-2 text-xs text-emerald-400 text-center font-semibold">{fixturesAway.wins}</td>
                <td className="py-2 text-xs text-emerald-400 text-center font-bold">{fixtures.wins}</td>
              </tr>
              <tr>
                <td className="py-2 text-xs text-muted-foreground">Draws</td>
                <td className="py-2 text-xs text-amber-400 text-center font-semibold">{fixturesHome.draws}</td>
                <td className="py-2 text-xs text-amber-400 text-center font-semibold">{fixturesAway.draws}</td>
                <td className="py-2 text-xs text-amber-400 text-center font-bold">{fixtures.draws}</td>
              </tr>
              <tr>
                <td className="py-2 text-xs text-muted-foreground">Losses</td>
                <td className="py-2 text-xs text-red-400 text-center font-semibold">{fixturesHome.losses}</td>
                <td className="py-2 text-xs text-red-400 text-center font-semibold">{fixturesAway.losses}</td>
                <td className="py-2 text-xs text-red-400 text-center font-bold">{fixtures.losses}</td>
              </tr>
              <tr>
                <td className="py-2 text-xs text-muted-foreground">Goals For</td>
                <td className="py-2 text-xs text-foreground text-center font-semibold">{goalsHome.for}</td>
                <td className="py-2 text-xs text-foreground text-center font-semibold">{goalsAway.for}</td>
                <td className="py-2 text-xs text-primary text-center font-bold">{goals.for}</td>
              </tr>
              <tr>
                <td className="py-2 text-xs text-muted-foreground">Goals Against</td>
                <td className="py-2 text-xs text-foreground text-center font-semibold">{goalsHome.against}</td>
                <td className="py-2 text-xs text-foreground text-center font-semibold">{goalsAway.against}</td>
                <td className="py-2 text-xs text-foreground text-center font-bold">{goals.against}</td>
              </tr>
              <tr>
                <td className="py-2 text-xs text-muted-foreground">Clean Sheets</td>
                <td className="py-2 text-xs text-foreground text-center font-semibold">-</td>
                <td className="py-2 text-xs text-foreground text-center font-semibold">-</td>
                <td className="py-2 text-xs text-primary text-center font-bold">{cleanSheets}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── SEO: People Also Ask ───────────────────────────────────────────────────
function PeopleAlsoAsk({ team, stats }: { team: TeamInfo; stats: TeamStatSummary | null }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const questions = [
    {
      q: `How many goals have ${team.name} scored this season?`,
      a: stats ? `${team.name} have scored ${stats.goals.for} goals in ${stats.fixtures.played} matches this season, averaging ${stats.goalsAvgPerGame.toFixed(1)} goals per game. At home they've netted ${stats.goalsHome.for}, and ${stats.goalsAway.for} away from home.` : 'Stats are currently being loaded.',
    },
    {
      q: `What is ${team.name}'s home record this season?`,
      a: stats ? `${team.name} have played ${stats.fixturesHome.played} home matches, winning ${stats.fixturesHome.wins}, drawing ${stats.fixturesHome.draws}, and losing ${stats.fixturesHome.losses}. They've scored ${stats.goalsHome.for} and conceded ${stats.goalsHome.against} at ${team.venue.name || 'home'}.` : 'Stats are currently being loaded.',
    },
    {
      q: `How many clean sheets have ${team.name} kept?`,
      a: stats ? `${team.name} have kept ${stats.cleanSheets} clean sheets this season across ${stats.fixtures.played} matches. ${stats.cleanSheets >= 10 ? 'This is an impressive defensive record.' : 'They will be looking to improve this tally.'}` : 'Stats are currently being loaded.',
    },
    {
      q: `When was ${team.name} founded?`,
      a: team.founded ? `${team.name} were founded in ${team.founded}. They are based in ${team.venue.city || team.country}${team.venue.name ? ` and play their home matches at ${team.venue.name}` : ''}${team.venue.capacity ? ` which has a capacity of ${team.venue.capacity.toLocaleString()}` : ''}.` : `${team.name} are based in ${team.country}.`,
    },
    {
      q: `What is ${team.name}'s away form like?`,
      a: stats ? `On the road, ${team.name} have won ${stats.fixturesAway.wins}, drawn ${stats.fixturesAway.draws}, and lost ${stats.fixturesAway.losses} from ${stats.fixturesAway.played} away matches. They've scored ${stats.goalsAway.for} and conceded ${stats.goalsAway.against} away from home.` : 'Stats are currently being loaded.',
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">People Also Ask about {team.name}</h3>
      </div>
      <div className="divide-y divide-border/10">
        {questions.map((item, i) => (
          <button
            key={i}
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className="w-full text-left px-4 py-3 hover:bg-secondary/20 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{item.q}</span>
              <ChevronRight className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform', openIdx === i && 'rotate-90')} />
            </div>
            {openIdx === i && (
              <p className="text-sm text-foreground/75 leading-relaxed mt-2 pr-6">{item.a}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
