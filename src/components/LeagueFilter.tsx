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
              label={`${league.logo} ${league.name}`}
              active={selectedLeagueId === league.id}
              onClick={() => onSelect(league.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
      }`}
    >
      {label}
    </button>
  );
}
