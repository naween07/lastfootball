import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import OptimizedImage from '@/components/OptimizedImage';
import EntityNews from '@/components/EntityNews';
import {
  fetchLeagueInfo, fetchStandings, fetchTopScorers,
  getCurrentSeason, formatSeason,
  LeagueInfo, StandingTeam, PlayerStat,
} from '@/services/footballApi';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A competition's own page.
 *
 * Every match report names its competition, and until this existed that was
 * the one entity of the three a reader could not follow: clubs and players
 * had pages, the competition was plain text. Stats covers a dozen leagues
 * chosen in advance; a report can mention any of hundreds.
 */
export default function LeagueProfile() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const id = Number(leagueId);

  const [league, setLeague] = useState<LeagueInfo | null>(null);
  const [standings, setStandings] = useState<StandingTeam[]>([]);
  const [scorers, setScorers] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const info = await fetchLeagueInfo(id);
      if (cancelled) return;
      setLeague(info);

      // The competition's newest season, falling back to the calendar rule
      // the rest of the site uses when the provider lists none.
      const season = info?.seasons?.[0] ?? getCurrentSeason(id);
      const [table, top] = await Promise.all([
        fetchStandings(id, season).catch(() => []),
        fetchTopScorers(id, season).catch(() => []),
      ]);
      if (cancelled) return;
      setStandings(table);
      setScorers(top.slice(0, 5));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [id]);

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

  if (!league) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container text-center py-20">
          <p className="text-lg font-medium text-muted-foreground">Competition not found</p>
          <Link to="/news" className="text-primary hover:underline text-sm mt-2 inline-block">← Back to News</Link>
        </div>
      </div>
    );
  }

  const season = league.seasons?.[0] ?? getCurrentSeason(id);
  const description = standings.length
    ? `${league.name} table, top scorers and match reports. ${standings[0].team.name} lead with ${standings[0].points} points.`
    : `${league.name} match reports, results and coverage on Last Football.`;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${league.name} — Table, Top Scorers & Match Reports`}
        description={description}
        path={`/league/${id}`}
      />
      <Header />

      <section className="border-b border-border bg-gradient-to-b from-card to-background">
        <div className="container max-w-4xl py-5">
          <Link to="/news" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> News
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-secondary/60 flex items-center justify-center flex-shrink-0">
              <OptimizedImage src={league.logo} alt={league.name} className="w-12 h-12 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-foreground leading-tight">{league.name}</h1>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                {league.countryFlag && (
                  <OptimizedImage src={league.countryFlag} alt="" className="w-4 h-3 object-cover rounded-[2px]" />
                )}
                <span>{league.country}</span>
                <span className="text-muted-foreground/30">·</span>
                <span>{formatSeason(season, id)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container max-w-4xl py-5 pb-20 space-y-6">
        {standings.length > 0 ? (
          <section>
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground mb-3">Table</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left font-semibold py-2 pl-3 w-8">#</th>
                    <th className="text-left font-semibold py-2">Team</th>
                    <th className="text-center font-semibold py-2 w-8">P</th>
                    <th className="text-center font-semibold py-2 w-8 hidden sm:table-cell">W</th>
                    <th className="text-center font-semibold py-2 w-8 hidden sm:table-cell">D</th>
                    <th className="text-center font-semibold py-2 w-8 hidden sm:table-cell">L</th>
                    <th className="text-center font-semibold py-2 w-10">GD</th>
                    <th className="text-center font-semibold py-2 w-10 pr-3">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => (
                    <tr key={`${row.group ?? ''}-${row.team.id}`} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pl-3 text-muted-foreground">{row.rank}</td>
                      <td className="py-2">
                        <Link to={`/team/${row.team.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                          <OptimizedImage src={row.team.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                          <span className="font-medium text-foreground truncate">{row.team.name}</span>
                        </Link>
                      </td>
                      <td className="py-2 text-center text-muted-foreground">{row.played}</td>
                      <td className="py-2 text-center text-muted-foreground hidden sm:table-cell">{row.win}</td>
                      <td className="py-2 text-center text-muted-foreground hidden sm:table-cell">{row.draw}</td>
                      <td className="py-2 text-center text-muted-foreground hidden sm:table-cell">{row.lose}</td>
                      <td className={cn('py-2 text-center', row.goalsDiff > 0 ? 'text-emerald-400' : row.goalsDiff < 0 ? 'text-red-400' : 'text-muted-foreground')}>
                        {row.goalsDiff > 0 ? '+' : ''}{row.goalsDiff}
                      </td>
                      <td className="py-2 text-center pr-3 font-black text-foreground">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          // A knockout competition has no table, and an empty one is worse
          // than none: it reads as missing data rather than as the shape of
          // the tournament.
          <section className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <Trophy className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              No league table for this competition — it is played as a knockout, or the season has not started.
            </p>
          </section>
        )}

        {scorers.length > 0 && (
          <section>
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground mb-3">Top scorers</h2>
            <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
              {scorers.map((s, i) => (
                <div key={s.player.id} className="flex items-center gap-3 p-3">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                  <OptimizedImage src={s.player.photo} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link to={`/player/${s.player.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block">
                      {s.player.name}
                    </Link>
                    <span className="text-[10px] text-muted-foreground truncate">{s.team.name}</span>
                  </div>
                  <span className="text-sm font-black text-primary">{s.goals}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <EntityNews kind="league" id={id} name={league.name} />
      </main>
    </div>
  );
}
