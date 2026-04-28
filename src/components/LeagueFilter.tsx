import { useState, useRef, useEffect } from 'react';
import { League } from '@/types/football';
import OptimizedImage from './OptimizedImage';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Top leagues + cups by API-Football ID
const TOP_LEAGUES: { id: number; name: string; logo: string }[] = [
  { id: 39,  name: 'Premier League',       logo: 'https://media.api-sports.io/football/leagues/39.png' },
  { id: 2,   name: 'Champions League',     logo: 'https://media.api-sports.io/football/leagues/2.png' },
  { id: 140, name: 'La Liga',              logo: 'https://media.api-sports.io/football/leagues/140.png' },
  { id: 135, name: 'Serie A',              logo: 'https://media.api-sports.io/football/leagues/135.png' },
  { id: 78,  name: 'Bundesliga',           logo: 'https://media.api-sports.io/football/leagues/78.png' },
  { id: 61,  name: 'Ligue 1',             logo: 'https://media.api-sports.io/football/leagues/61.png' },
  { id: 3,   name: 'Europa League',        logo: 'https://media.api-sports.io/football/leagues/3.png' },
  { id: 45,  name: 'FA Cup',              logo: 'https://media.api-sports.io/football/leagues/45.png' },
  { id: 48,  name: 'League Cup',          logo: 'https://media.api-sports.io/football/leagues/48.png' },
  { id: 143, name: 'Copa del Rey',        logo: 'https://media.api-sports.io/football/leagues/143.png' },
  { id: 137, name: 'Coppa Italia',        logo: 'https://media.api-sports.io/football/leagues/137.png' },
  { id: 81,  name: 'DFB Pokal',           logo: 'https://media.api-sports.io/football/leagues/81.png' },
  { id: 66,  name: 'Coupe de France',     logo: 'https://media.api-sports.io/football/leagues/66.png' },
  { id: 848, name: 'Conference League',    logo: 'https://media.api-sports.io/football/leagues/848.png' },
  { id: 94,  name: 'Primeira Liga',        logo: 'https://media.api-sports.io/football/leagues/94.png' },
  { id: 88,  name: 'Eredivisie',           logo: 'https://media.api-sports.io/football/leagues/88.png' },
  { id: 307, name: 'Saudi Pro League',     logo: 'https://media.api-sports.io/football/leagues/307.png' },
  { id: 253, name: 'MLS',                  logo: 'https://media.api-sports.io/football/leagues/253.png' },
];

// Only show these in the main bar
const VISIBLE_IDS = [39, 2, 140, 135, 78, 61];
const TOP_IDS = TOP_LEAGUES.map(l => l.id);

interface LeagueFilterProps {
  leagues: League[];
  selectedLeagueId: number | null;
  onSelect: (id: number | null) => void;
}

export default function LeagueFilter({ leagues, selectedLeagueId, onSelect }: LeagueFilterProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Visible chips
  const visibleLeagues = TOP_LEAGUES.filter(l => VISIBLE_IDS.includes(l.id));

  // All leagues for dropdown — top leagues first, then others from today's data
  const otherFromData = leagues.filter(l => !TOP_IDS.includes(l.id)).sort((a, b) => a.name.localeCompare(b.name));
  const allDropdownLeagues = [...TOP_LEAGUES, ...otherFromData];

  // Filter by search
  const filteredDropdown = search
    ? allDropdownLeagues.filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
    : allDropdownLeagues;

  // Check if selected league is not in the visible bar
  const selectedInMore = selectedLeagueId && !VISIBLE_IDS.includes(selectedLeagueId);
  const selectedLeague = selectedInMore ? allDropdownLeagues.find(l => l.id === selectedLeagueId) : null;

  return (
    <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container">
        <div className="flex items-center gap-2.5 py-3 px-1">
          {/* All chip */}
          <FilterChip label="All" active={selectedLeagueId === null} onClick={() => onSelect(null)} />

          {/* Top visible leagues */}
          {visibleLeagues.map(league => (
            <FilterChip
              key={league.id}
              label={league.name}
              logo={league.logo}
              active={selectedLeagueId === league.id}
              onClick={() => onSelect(league.id)}
            />
          ))}

          {/* Selected league from dropdown (if not in visible) */}
          {selectedLeague && (
            <FilterChip
              label={selectedLeague.name}
              logo={selectedLeague.logo}
              active
              onClick={() => onSelect(null)}
              closable
            />
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* More dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => { setDropdownOpen(!dropdownOpen); setSearch(''); }}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                dropdownOpen ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
              )}
            >
              More
              <ChevronDown className={cn('w-3 h-3 transition-transform', dropdownOpen && 'rotate-180')} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
                {/* Search */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search leagues..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    autoFocus
                  />
                  {search && (
                    <button onClick={() => setSearch('')}>
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                </div>

                {/* League list */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredDropdown.length > 0 ? filteredDropdown.map(league => (
                    <button
                      key={league.id}
                      onClick={() => { onSelect(league.id); setDropdownOpen(false); setSearch(''); }}
                      className={cn(
                        'flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-secondary/50 transition-colors',
                        selectedLeagueId === league.id && 'bg-primary/10',
                      )}
                    >
                      <OptimizedImage src={league.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                      <span className={cn(
                        'text-xs truncate',
                        selectedLeagueId === league.id ? 'font-bold text-primary' : 'text-foreground/80',
                      )}>
                        {league.name}
                      </span>
                    </button>
                  )) : (
                    <p className="text-xs text-muted-foreground text-center py-4">No leagues found</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, logo, active, onClick, closable }: {
  label: string; logo?: string; active: boolean; onClick: () => void; closable?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex-shrink-0',
        active
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
          : 'bg-secondary/70 text-secondary-foreground hover:bg-secondary hover:text-foreground hover:scale-[1.03] active:scale-[0.97]',
      )}
    >
      {logo?.startsWith('http') ? (
        <OptimizedImage src={logo} alt="" className="w-4 h-4 object-contain" priority={active} />
      ) : logo ? (
        <span>{logo}</span>
      ) : null}
      {label}
      {closable && <X className="w-3 h-3 ml-0.5 opacity-70" />}
    </button>
  );
}
