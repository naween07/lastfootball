import { League } from '@/types/football';

// Top 10 most-watched football leagues by API-Football ID
const TOP_LEAGUES: { id: number; name: string; logo: string }[] = [
  { id: 39,  name: 'Premier League',       logo: 'https://media.api-sports.io/football/leagues/39.png' },
  { id: 2,   name: 'Champions League',     logo: 'https://media.api-sports.io/football/leagues/2.png' },
  { id: 140, name: 'La Liga',              logo: 'https://media.api-sports.io/football/leagues/140.png' },
  { id: 135, name: 'Serie A',              logo: 'https://media.api-sports.io/football/leagues/135.png' },
  { id: 78,  name: 'Bundesliga',           logo: 'https://media.api-sports.io/football/leagues/78.png' },
  { id: 61,  name: 'Ligue 1',             logo: 'https://media.api-sports.io/football/leagues/61.png' },
  { id: 3,   name: 'Europa League',        logo: 'https://media.api-sports.io/football/leagues/3.png' },
  { id: 94,  name: 'Primeira Liga',        logo: 'https://media.api-sports.io/football/leagues/94.png' },
  { id: 88,  name: 'Eredivisie',           logo: 'https://media.api-sports.io/football/leagues/88.png' },
  { id: 253, name: 'MLS',                  logo: 'https://media.api-sports.io/football/leagues/253.png' },
];

const TOP_IDS = TOP_LEAGUES.map(l => l.id);

interface LeagueFilterProps {
  leagues: League[];
  selectedLeagueId: number | null;
  onSelect: (id: number | null) => void;
}

export default function LeagueFilter({ leagues, selectedLeagueId, onSelect }: LeagueFilterProps) {
  // Build ordered list: top leagues first (always shown), then any other leagues from today's data
  const topWithData = TOP_LEAGUES.map(tl => {
    const fromData = leagues.find(l => l.id === tl.id);
    return { ...tl, logo: fromData?.logo || tl.logo } as League;
  });

  const otherLeagues = leagues
    .filter(l => !TOP_IDS.includes(l.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const allLeagues = [...topWithData, ...otherLeagues];

  return (
    <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container">
        <div className="flex items-center gap-2 py-2 overflow-x-auto scrollbar-hide">
          <FilterChip
            label="All"
            active={selectedLeagueId === null}
            onClick={() => onSelect(null)}
          />
          {allLeagues.map(league => (
            <FilterChip
              key={league.id}
              label={league.name}
              logo={league.logo}
              active={selectedLeagueId === league.id}
              onClick={() => onSelect(league.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, logo, active, onClick }: { label: string; logo?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
      }`}
    >
      {logo?.startsWith('http') ? (
        <img src={logo} alt="" className="w-3.5 h-3.5" />
      ) : logo ? (
        <span>{logo}</span>
      ) : null}
      {label}
    </button>
  );
}
