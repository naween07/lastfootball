import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import OptimizedImage from '@/components/OptimizedImage';
import { useFavorites } from '@/hooks/useFavorites';
import { searchTeamsAndLeagues, fetchTeamFixtures, Match } from '@/services/footballApi';
import { generateDailyReports, Article } from '@/services/articleGenerator';
import { Star, Search, X, Loader2, Trophy, Calendar, Swords, Newspaper, ChevronRight, Plus, Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pushSupported, pushPermission, getPushSubscription, enablePush, disablePush, syncPushTeams } from '@/lib/push';

// ─── Goal alerts (web push) toggle ───────────────────────────────────────────
function GoalAlertsToggle({ teamIds }: { teamIds: number[] }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reflect the real subscription state on mount.
  useEffect(() => {
    if (!pushSupported()) return;
    getPushSubscription().then(sub => setEnabled(!!sub && Notification.permission === 'granted'));
  }, []);

  // Keep the server's team list in sync when favourites change.
  useEffect(() => {
    if (enabled && teamIds.length > 0) syncPushTeams(teamIds);
  }, [enabled, teamIds]);

  if (!pushSupported()) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
      } else {
        const ok = await enablePush(teamIds);
        setEnabled(ok);
        if (!ok && pushPermission() === 'denied') {
          alert('Notifications are blocked for this site. Enable them in your browser settings to get goal alerts.');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={enabled ? 'Goal alerts on — tap to turn off' : 'Get goal & full-time alerts for your teams'}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors',
        enabled
          ? 'bg-[#39ff14]/10 text-[#39ff14] hover:bg-[#39ff14]/20'
          : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
      )}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : enabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
      {enabled ? 'Alerts On' : 'Goal Alerts'}
    </button>
  );
}

export default function Favorites() {
  const { favoriteTeamIds, isFavorite, toggleFavorite } = useFavorites();
  const [teamData, setTeamData] = useState<Map<number, { results: Match[]; upcoming: Match[] }>>(new Map());
  const [teamInfo, setTeamInfo] = useState<Map<number, { name: string; logo: string }>>(new Map());
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  // Load data for all favorite teams
  useEffect(() => {
    if (favoriteTeamIds.length === 0) { setLoading(false); setTeamData(new Map()); setTeamInfo(new Map()); return; }

    const loadAll = async () => {
      // Only show full loading spinner on first load, not when adding teams
      if (teamData.size === 0) setLoading(true);

      const dataMap = new Map(teamData);
      const infoMap = new Map(teamInfo);
      const allMatches: Match[] = [];

      // Only fetch data for teams we don't already have
      const newTeamIds = favoriteTeamIds.filter(id => !dataMap.has(id));
      const existingTeamIds = favoriteTeamIds.filter(id => dataMap.has(id));

      // Collect existing matches for articles
      existingTeamIds.forEach(id => {
        const d = dataMap.get(id);
        if (d) allMatches.push(...d.results);
      });

      await Promise.allSettled(newTeamIds.map(async (teamId) => {
        try {
          const matches = await fetchTeamFixtures(teamId, 3, 3);
          const results = matches.filter(m => m.status === 'FT' || m.status === 'AET' || m.status === 'PEN');
          const upcoming = matches.filter(m => m.status === 'NS' || m.status === 'TBD');
          dataMap.set(teamId, { results, upcoming });
          allMatches.push(...results);

          for (const m of matches) {
            if (m.homeTeam.id === teamId) infoMap.set(teamId, { name: m.homeTeam.name, logo: m.homeTeam.logo || '' });
            else if (m.awayTeam.id === teamId) infoMap.set(teamId, { name: m.awayTeam.name, logo: m.awayTeam.logo || '' });
          }
        } catch {}
      }));

      // Remove unfollowed teams
      for (const id of dataMap.keys()) {
        if (!favoriteTeamIds.includes(id)) { dataMap.delete(id); infoMap.delete(id); }
      }

      setTeamData(new Map(dataMap));
      setTeamInfo(new Map(infoMap));

      const reports = generateDailyReports(allMatches).filter(a => a.category === 'match-report');
      setArticles(reports.slice(0, 10));
      setLoading(false);
    };
    loadAll();
  }, [favoriteTeamIds]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="My Favourites — LastFootball" description="Follow your favourite football teams. Results, fixtures, and news." path="/favorites" />
      <Header />

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-b border-amber-500/20">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/25">
              <Star className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">My Favourites</h1>
              <p className="text-xs text-muted-foreground">
                {favoriteTeamIds.length > 0
                  ? `${favoriteTeamIds.length} team${favoriteTeamIds.length > 1 ? 's' : ''} followed`
                  : 'Follow your favourite teams'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GoalAlertsToggle teamIds={favoriteTeamIds} />
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Team
            </button>
          </div>
        </div>
      </div>

      {/* Team Search */}
      {showSearch && (
        <TeamSearchBar
          onSelect={(teamId, teamName, teamLogo) => {
            toggleFavorite(teamId, teamName, teamLogo);
            setShowSearch(false);
          }}
          isFavorite={isFavorite}
        />
      )}

      <main className="container py-4 pb-20 md:pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          </div>
        ) : favoriteTeamIds.length === 0 ? (
          <EmptyState onAddTeam={() => setShowSearch(true)} />
        ) : (
          <div className="space-y-5">
            {/* Team cards */}
            {favoriteTeamIds.map(teamId => {
              const info = teamInfo.get(teamId);
              const data = teamData.get(teamId);
              if (!info) return null;
              return (
                <TeamCard
                  key={teamId}
                  teamId={teamId}
                  name={info.name}
                  logo={info.logo}
                  results={data?.results || []}
                  upcoming={data?.upcoming || []}
                  onRemove={() => toggleFavorite(teamId)}
                />
              );
            })}

            {/* Match reports for followed teams */}
            {articles.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
                  <Newspaper className="w-3.5 h-3.5" /> Your Team News
                </h3>
                <div className="space-y-2">
                  {articles.map(a => (
                    <Link
                      key={a.id}
                      to={`/news/${a.slug}`}
                      className="flex gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-2">{a.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{a.leagueName}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Popular teams — always visible for easy adding */}
            <PopularTeamsGrid />
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Team Card ──────────────────────────────────────────────────────────────
function TeamCard({ teamId, name, logo, results, upcoming, onRemove }: {
  teamId: number; name: string; logo: string;
  results: Match[]; upcoming: Match[];
  onRemove: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Team header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
        <Link to={`/team/${teamId}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
          <OptimizedImage src={logo} alt={name} className="w-8 h-8 object-contain" />
          <span className="text-sm font-bold text-foreground truncate">{name}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
        </Link>
        <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Remove">
          <X className="w-3.5 h-3.5 text-muted-foreground hover:text-red-400" />
        </button>
      </div>

      {/* Recent Results */}
      {results.length > 0 && (
        <div className="px-4 py-2.5">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Swords className="w-3 h-3" /> Recent Results
          </h4>
          {results.map(m => (
            <MatchRow key={m.id} match={m} teamId={teamId} />
          ))}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border/20">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-amber-400" /> Upcoming
          </h4>
          {upcoming.map(m => (
            <MatchRow key={m.id} match={m} teamId={teamId} />
          ))}
        </div>
      )}

      {results.length === 0 && upcoming.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No recent matches</p>
      )}
    </div>
  );
}

// ─── Match Row ──────────────────────────────────────────────────────────────
function MatchRow({ match, teamId }: { match: Match; teamId: number }) {
  const isFinished = match.status === 'FT' || match.status === 'AET' || match.status === 'PEN';
  const hasScore = match.homeScore !== null;
  const isHome = match.homeTeam.id === teamId;

  let borderClass = '';
  if (isFinished && hasScore) {
    const ts = isHome ? match.homeScore! : match.awayScore!;
    const os = isHome ? match.awayScore! : match.homeScore!;
    borderClass = ts > os ? 'border-l-[3px] border-l-emerald-400' : ts < os ? 'border-l-[3px] border-l-red-400' : 'border-l-[3px] border-l-amber-400';
  }

  return (
    <Link to={`/match/${match.id}`} className={cn('flex items-center gap-2 py-2 hover:bg-secondary/20 rounded px-1.5 transition-colors', borderClass)}>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <OptimizedImage src={match.homeTeam.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
        <span className={cn('text-xs truncate', match.homeTeam.id === teamId ? 'font-bold text-foreground' : 'text-muted-foreground')}>{match.homeTeam.name}</span>
      </div>
      <div className="text-center min-w-[45px]">
        {hasScore ? (
          <span className="text-xs font-black text-foreground tabular-nums">{match.homeScore} - {match.awayScore}</span>
        ) : (
          <span className="text-[10px] font-semibold text-muted-foreground">{match.time}</span>
        )}
        <div className="text-[7px] text-muted-foreground uppercase">{isFinished ? 'FT' : match.date?.slice(5)}</div>
      </div>
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className={cn('text-xs truncate', match.awayTeam.id === teamId ? 'font-bold text-foreground' : 'text-muted-foreground')}>{match.awayTeam.name}</span>
        <OptimizedImage src={match.awayTeam.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
      </div>
    </Link>
  );
}

// ─── Team Search Bar ────────────────────────────────────────────────────────
function TeamSearchBar({ onSelect, isFavorite }: {
  onSelect: (id: number, name: string, logo: string) => void;
  isFavorite: (id: number) => boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: number; name: string; logo: string; country: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 3) { setResults([]); return; }
    setLoading(true);
    const timeout = setTimeout(() => {
      searchTeamsAndLeagues(query).then(res => setResults(res.teams)).finally(() => setLoading(false));
    }, 500);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="bg-card border-b border-border">
      <div className="container py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search team to follow (e.g. Arsenal, Real Madrid)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            autoFocus
          />
          {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
        </div>

        {results.length > 0 && (
          <div className="mt-2 space-y-1 max-h-[240px] overflow-y-auto">
            {results.map(team => (
              <button
                key={team.id}
                onClick={() => onSelect(team.id, team.name, team.logo)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors text-left"
              >
                <OptimizedImage src={team.logo} alt="" className="w-7 h-7 object-contain" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{team.name}</p>
                  <p className="text-[11px] text-muted-foreground">{team.country}</p>
                </div>
                {isFavorite(team.id) ? (
                  <span className="text-[10px] text-amber-400 font-bold">Following</span>
                ) : (
                  <span className="text-[10px] text-primary font-bold">+ Follow</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Top 30 Most Followed Teams ─────────────────────────────────────────────
const POPULAR_LIST = [
  { name: 'Real Madrid', id: 541, logo: 'https://media.api-sports.io/football/teams/541.png' },
  { name: 'Barcelona', id: 529, logo: 'https://media.api-sports.io/football/teams/529.png' },
  { name: 'Man United', id: 33, logo: 'https://media.api-sports.io/football/teams/33.png' },
  { name: 'PSG', id: 85, logo: 'https://media.api-sports.io/football/teams/85.png' },
  { name: 'Man City', id: 50, logo: 'https://media.api-sports.io/football/teams/50.png' },
  { name: 'Juventus', id: 496, logo: 'https://media.api-sports.io/football/teams/496.png' },
  { name: 'Liverpool', id: 40, logo: 'https://media.api-sports.io/football/teams/40.png' },
  { name: 'Chelsea', id: 49, logo: 'https://media.api-sports.io/football/teams/49.png' },
  { name: 'Bayern Munich', id: 157, logo: 'https://media.api-sports.io/football/teams/157.png' },
  { name: 'Arsenal', id: 42, logo: 'https://media.api-sports.io/football/teams/42.png' },
  { name: 'Tottenham', id: 47, logo: 'https://media.api-sports.io/football/teams/47.png' },
  { name: 'AC Milan', id: 489, logo: 'https://media.api-sports.io/football/teams/489.png' },
  { name: 'Inter Milan', id: 505, logo: 'https://media.api-sports.io/football/teams/505.png' },
  { name: 'Atletico Madrid', id: 530, logo: 'https://media.api-sports.io/football/teams/530.png' },
  { name: 'Al Nassr', id: 2939, logo: 'https://media.api-sports.io/football/teams/2939.png' },
  { name: 'Flamengo', id: 127, logo: 'https://media.api-sports.io/football/teams/127.png' },
  { name: 'Dortmund', id: 165, logo: 'https://media.api-sports.io/football/teams/165.png' },
  { name: 'Al Ahly', id: 1020, logo: 'https://media.api-sports.io/football/teams/1020.png' },
  { name: 'Galatasaray', id: 645, logo: 'https://media.api-sports.io/football/teams/645.png' },
  { name: 'AS Roma', id: 497, logo: 'https://media.api-sports.io/football/teams/497.png' },
  { name: 'Corinthians', id: 131, logo: 'https://media.api-sports.io/football/teams/131.png' },
  { name: 'Fenerbahce', id: 611, logo: 'https://media.api-sports.io/football/teams/611.png' },
  { name: 'Inter Miami', id: 18857, logo: 'https://media.api-sports.io/football/teams/18857.png' },
  { name: 'Al Hilal', id: 2932, logo: 'https://media.api-sports.io/football/teams/2932.png' },
  { name: 'Boca Juniors', id: 451, logo: 'https://media.api-sports.io/football/teams/451.png' },
  { name: 'River Plate', id: 435, logo: 'https://media.api-sports.io/football/teams/435.png' },
  { name: 'Club America', id: 2283, logo: 'https://media.api-sports.io/football/teams/2283.png' },
  { name: 'Ajax', id: 194, logo: 'https://media.api-sports.io/football/teams/194.png' },
  { name: 'Napoli', id: 492, logo: 'https://media.api-sports.io/football/teams/492.png' },
  { name: 'Newcastle', id: 34, logo: 'https://media.api-sports.io/football/teams/34.png' },
];

// ─── Empty State ────────────────────────────────────────────────────────────
function EmptyState({ onAddTeam }: { onAddTeam: () => void }) {
  const { toggleFavorite, isFavorite } = useFavorites();

  const POPULAR = POPULAR_LIST;

  return (
    <div className="text-center py-10">
      <Star className="w-14 h-14 mx-auto mb-4 text-amber-400/20" />
      <h2 className="text-xl font-bold text-foreground mb-2">Follow Your Teams</h2>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
        Tap any team below to follow, or search for any club or national team.
      </p>
      <button
        onClick={onAddTeam}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity mb-8"
      >
        <Search className="w-4 h-4" />
        Search Teams
      </button>

      <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-semibold">Tap to follow</p>
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {POPULAR.map(t => (
          <button
            key={t.id}
            onClick={() => { if (!isFavorite(t.id)) toggleFavorite(t.id, t.name, t.logo); }}
            className={cn(
              'flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all',
              isFavorite(t.id)
                ? 'bg-primary/10 ring-1 ring-primary/30'
                : 'bg-card border border-border/50 hover:border-primary/30 hover:scale-105 active:scale-95',
            )}
          >
            <img src={t.logo} alt={t.name} className="w-8 h-8 object-contain" loading="lazy" />
            <span className={cn('text-[10px] font-semibold truncate w-full text-center', isFavorite(t.id) ? 'text-primary' : 'text-muted-foreground')}>
              {t.name}
            </span>
            {isFavorite(t.id) && <span className="text-[8px] text-primary font-bold">✓ Following</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Popular Teams Grid (shown below team cards) ────────────────────────────
function PopularTeamsGrid() {
  const { toggleFavorite, isFavorite } = useFavorites();
  const unfollowed = POPULAR_LIST.filter(t => !isFavorite(t.id));
  if (unfollowed.length === 0) return null;

  return (
    <div className="pt-4 border-t border-border/30">
      <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-semibold">Add more teams</p>
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {unfollowed.map(t => (
          <button
            key={t.id}
            onClick={() => toggleFavorite(t.id, t.name, t.logo)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:scale-105 active:scale-95 transition-all"
          >
            <img src={t.logo} alt={t.name} className="w-8 h-8 object-contain" loading="lazy" />
            <span className="text-[10px] font-semibold truncate w-full text-center text-muted-foreground">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
