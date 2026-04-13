import { League } from '@/types/football';

interface LeagueFilterProps {
  leagues: League[];
  selectedLeagueId: number | null;
  onSelect: (id: number | null) => void;
}

export default function LeagueFilter({ leagues, selectedLeagueId, onSelect }: LeagueFilterProps) {
  return (
    <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container">
        <div className="flex items-center gap-2 py-2 overflow-x-auto scrollbar-hide">
          <FilterChip
            label="All"
            active={selectedLeagueId === null}
            onClick={() => onSelect(null)}
          />
          {leagues.map(league => (
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
