import { useState } from 'react';
import Header from '@/components/Header';
import LeagueGroup from '@/components/LeagueGroup';
import { useFavorites } from '@/hooks/useFavorites';
import { getTodayMatches, getTomorrowMatches, getUpcomingMatches, getMatchesGroupedByLeague } from '@/services/mockData';

const tabs = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'upcoming', label: 'Upcoming' },
] as const;

type TabKey = typeof tabs[number]['key'];

export default function Fixtures() {
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const { isFavorite, toggleFavorite } = useFavorites();

  const matchesByTab = {
    today: getTodayMatches(),
    tomorrow: getTomorrowMatches(),
    upcoming: getUpcomingMatches(),
  };

  const groups = getMatchesGroupedByLeague(matchesByTab[activeTab]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container flex gap-1 py-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="container py-4">
        {groups.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">No fixtures</p>
            <p className="text-sm mt-1">No matches scheduled for this period</p>
          </div>
        ) : (
          groups.map(group => (
            <LeagueGroup
              key={group.league.id}
              group={group}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          ))
        )}
      </main>
    </div>
  );
}
