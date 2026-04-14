import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import StandingsTable from '@/components/stats/StandingsTable';
import PlayerStatsView from '@/components/stats/PlayerStatsView';
import TeamStatsView from '@/components/stats/TeamStatsView';
import LeagueFixturesView from '@/components/stats/LeagueFixturesView';
import KnockoutBracket from '@/components/stats/KnockoutBracket';
import { TOP_LEAGUES, CUP_LEAGUE_IDS, getCurrentSeason, getSeasonOptions, fetchStandings, StandingTeam } from '@/services/footballApi';

const BASE_TABS = ['Tables', 'Player', 'Team', 'Fixtures'] as const;
type Tab = 'Tables' | 'Player' | 'Team' | 'Fixtures' | 'Bracket';

export default function Stats() {
  const [activeLeague, setActiveLeague] = useState(TOP_LEAGUES[0].id);
  const [season, setSeason] = useState(getCurrentSeason());
  const [activeTab, setActiveTab] = useState<Tab>('Tables');
  const [standings, setStandings] = useState<StandingTeam[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(true);

  const isCup = CUP_LEAGUE_IDS.includes(activeLeague);
  const tabs: Tab[] = isCup ? [...BASE_TABS, 'Bracket'] : [...BASE_TABS];

  // Reset tab if switching away from cup and on Bracket tab
  useEffect(() => {
    if (!isCup && activeTab === 'Bracket') setActiveTab('Tables');
  }, [isCup, activeTab]);

  useEffect(() => {
    if (activeTab !== 'Tables') return;
    setStandingsLoading(true);
    fetchStandings(activeLeague, season)
      .then(setStandings)
      .catch(console.error)
      .finally(() => setStandingsLoading(false));
  }, [activeLeague, season, activeTab]);

  const seasonOptions = getSeasonOptions();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container overflow-x-auto">
          <div className="flex items-center gap-0 min-w-max">
            {TOP_LEAGUES.map(league => (
              <button
                key={league.id}
                onClick={() => setActiveLeague(league.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeLeague === league.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {league.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container py-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <select
              value={season}
              onChange={(e) => setSeason(Number(e.target.value))}
              className="bg-secondary text-foreground text-sm rounded-lg px-3 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {seasonOptions.map(s => (
                <option key={s} value={s}>{s}/{(s + 1).toString().slice(-2)}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-secondary rounded-lg p-0.5">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {activeTab === 'Tables' && (
            <StandingsTable standings={standings} loading={standingsLoading} />
          )}
          {activeTab === 'Player' && (
            <PlayerStatsView leagueId={activeLeague} season={season} />
          )}
          {activeTab === 'Team' && (
            <TeamStatsView leagueId={activeLeague} season={season} />
          )}
          {activeTab === 'Fixtures' && (
            <LeagueFixturesView leagueId={activeLeague} season={season} />
          )}
          {activeTab === 'Bracket' && isCup && (
            <KnockoutBracket leagueId={activeLeague} season={season} />
          )}
        </div>
      </main>
    </div>
  );
}
