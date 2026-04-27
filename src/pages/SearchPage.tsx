import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Loader2, X, ChevronRight, Trophy, Calendar } from 'lucide-react';
import Header from '@/components/Header';
import OptimizedImage from '@/components/OptimizedImage';
import { useFavorites } from '@/hooks/useFavorites';
import { searchTeamsAndLeagues, SearchResult, Match } from '@/services/footballApi';
import { cn } from '@/lib/utils';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ teams: [], matches: [], selectedTeamId: null });
  const [loading, setLoading] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<{ id: number; name: string; logo: string } | null>(null);
  const matchesRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Search teams on query change
  useEffect(() => {
    setSelectedTeam(null);
    if (query.length < 3) {
      setResults({ teams: [], matches: [], selectedTeamId: null });
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      searchTeamsAndLeagues(query)
        .then(setResults)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 500);

    return () => clearTimeout(timeout);
  }, [query]);

  // Load matches when a team is selected (single click)
  const handleTeamClick = useCallback(async (team: { id: number; name: string; logo: string }) => {
    if (selectedTeam?.id === team.id) return; // Already selected
    setSelectedTeam(team);
    setLoadingMatches(true);
    try {
      const res = await searchTeamsAndLeagues('', team.id);
      setResults(prev => ({ ...prev, matches: res.matches, selectedTeamId: team.id }));
    } catch {}
    setLoadingMatches(false);

    // Auto-scroll to matches after a short delay
    setTimeout(() => {
      matchesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [selectedTeam]);

  // Double click → team profile page (future)
  const handleTeamDoubleClick = useCallback((team: { id: number; name: string }) => {
    // For now, navigate to search with team selected
    // In future: navigate(`/team/${team.id}`)
    // toast.info(`Team page for ${team.name} coming soon!`);
  }, [navigate]);

  // Separate results and upcoming
  const recentResults = results.matches.filter(m =>
    m.status === 'FT' || m.status === 'AET' || m.status === 'PEN'
  );
  const upcomingFixtures = results.matches.filter(m =>
    m.status === 'NS' || m.status === 'TBD'
  );
  const liveMatches = results.matches.filter(m =>
    m.status === 'LIVE' || m.status === '1H' || m.status === '2H' || m.status === 'HT'
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container py-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search teams, clubs, leagues..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30"
              autoFocus
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setSelectedTeam(null); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sticky selected team bar */}
        {selectedTeam && (
          <div className="bg-primary/5 border-t border-primary/20 px-4 py-2.5">
            <div className="container flex items-center gap-3">
              <OptimizedImage src={selectedTeam.logo} alt="" className="w-7 h-7 object-contain" />
              <span className="text-sm font-bold text-foreground flex-1">{selectedTeam.name}</span>
              <button
                onClick={() => { setSelectedTeam(null); setResults(prev => ({ ...prev, matches: [], selectedTeamId: null })); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕ Clear
              </button>
            </div>
          </div>
        )}
      </div>

      <main className="container py-4 pb-20 md:pb-4">
        {query.length < 3 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm">Type at least 3 characters to search</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Try "Madrid", "Chelsea", "Liverpool", "Bayern"...</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
          </div>
        ) : results.teams.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">No results for "{query}"</p>
            <p className="text-sm mt-1">Try a different team or league name</p>
          </div>
        ) : (
          <>
            {/* Matched teams list */}
            {!selectedTeam && (
              <div className="mb-5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                  {results.teams.length} team{results.teams.length !== 1 ? 's' : ''} found
                </h3>
                <div className="space-y-1">
                  {results.teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamClick(team)}
                      onDoubleClick={() => handleTeamDoubleClick(team)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border/50 hover:border-primary/20 hover:bg-card/80 transition-all text-left"
                    >
                      <OptimizedImage src={team.logo} alt="" className="w-9 h-9 object-contain flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{team.name}</p>
                        <p className="text-[11px] text-muted-foreground">{team.country}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Matches section — auto-scrolled into view */}
            <div ref={matchesRef}>
              {loadingMatches ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading matches...</span>
                </div>
              ) : selectedTeam ? (
                <div className="space-y-5">
                  {/* Live matches */}
                  {liveMatches.length > 0 && (
                    <MatchSection
                      title="Live Now"
                      icon={<span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
                      matches={liveMatches}
                      teamId={selectedTeam.id}
                      accentColor="text-red-400"
                    />
                  )}

                  {/* Recent results */}
                  {recentResults.length > 0 && (
                    <MatchSection
                      title="Recent Results"
                      icon={<Trophy className="w-3.5 h-3.5 text-primary" />}
                      matches={recentResults}
                      teamId={selectedTeam.id}
                    />
                  )}

                  {/* Upcoming fixtures */}
                  {upcomingFixtures.length > 0 && (
                    <MatchSection
                      title="Upcoming Fixtures"
                      icon={<Calendar className="w-3.5 h-3.5 text-amber-400" />}
                      matches={upcomingFixtures}
                      teamId={selectedTeam.id}
                    />
                  )}

                  {recentResults.length === 0 && upcomingFixtures.length === 0 && liveMatches.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No matches found</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Tap a team to see their matches</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Match Section ──────────────────────────────────────────────────────────
function MatchSection({
  title, icon, matches, teamId, accentColor,
}: {
  title: string;
  icon: React.ReactNode;
  matches: Match[];
  teamId: number;
  accentColor?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        {icon}
        <h3 className={cn('text-xs font-bold uppercase tracking-wider', accentColor || 'text-muted-foreground')}>{title}</h3>
      </div>
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden divide-y divide-border/20">
        {matches.map(m => (
          <MatchRow key={m.id} match={m} teamId={teamId} />
        ))}
      </div>
    </div>
  );
}

// ─── Match Row ──────────────────────────────────────────────────────────────
function MatchRow({ match, teamId }: { match: Match; teamId: number }) {
  const isFinished = match.status === 'FT' || match.status === 'AET' || match.status === 'PEN';
  const isLive = match.status === 'LIVE' || match.status === '1H' || match.status === '2H' || match.status === 'HT';
  const isUpcoming = match.status === 'NS' || match.status === 'TBD';
  const hasScore = match.homeScore !== null;

  // Determine if this team won/lost
  const isHomeTeam = match.homeTeam.id === teamId;
  let resultClass = '';
  if (isFinished && hasScore) {
    const teamScore = isHomeTeam ? match.homeScore! : match.awayScore!;
    const oppScore = isHomeTeam ? match.awayScore! : match.homeScore!;
    if (teamScore > oppScore) resultClass = 'border-l-[3px] border-l-emerald-400';
    else if (teamScore < oppScore) resultClass = 'border-l-[3px] border-l-red-400';
    else resultClass = 'border-l-[3px] border-l-amber-400/60';
  }

  return (
    <Link
      to={`/match/${match.id}`}
      className={cn('flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors', resultClass)}
    >
      {/* League logo */}
      {match.league.logo && (
        <OptimizedImage src={match.league.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0 opacity-50" />
      )}

      {/* Home team */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <OptimizedImage src={match.homeTeam.logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
        <span className={cn(
          'text-sm truncate',
          match.homeTeam.id === teamId ? 'font-bold text-foreground' : 'text-muted-foreground',
        )}>{match.homeTeam.name}</span>
      </div>

      {/* Score / Time */}
      <div className="text-center min-w-[55px]">
        {hasScore ? (
          <span className={cn(
            'text-sm font-black tabular-nums',
            isLive ? 'text-red-400' : 'text-foreground',
          )}>
            {match.homeScore} - {match.awayScore}
          </span>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">{match.time}</span>
        )}
        <div className="text-[8px] text-muted-foreground uppercase">
          {isLive ? (match.minute ? `${match.minute}'` : 'LIVE') : isFinished ? match.status : match.date?.slice(5)}
        </div>
      </div>

      {/* Away team */}
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className={cn(
          'text-sm truncate',
          match.awayTeam.id === teamId ? 'font-bold text-foreground' : 'text-muted-foreground',
        )}>{match.awayTeam.name}</span>
        <OptimizedImage src={match.awayTeam.logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
      </div>
    </Link>
  );
}
