import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead, { buildWebsiteJsonLd } from '@/components/SEOHead';
import OptimizedImage from '@/components/OptimizedImage';
import { fetchMatchesByDate, fetchLiveMatches, fetchTopScorers, getToday, PlayerStat } from '@/services/footballApi';
import { fetchFootballNews } from '@/services/newsApi';
import { Match } from '@/types/football';
import { ArrowRight, Zap, Calendar, Trophy, Newspaper, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet?: string;
}

export default function HomePage() {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [todayMatches, setTodayMatches] = useState<Match[]>([]);
  const [topScorers, setTopScorers] = useState<{ league: string; scorers: PlayerStat[] }[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const leagues = [
          { id: 39, name: 'Premier League' },
          { id: 140, name: 'La Liga' },
          { id: 135, name: 'Serie A' },
          { id: 78, name: 'Bundesliga' },
          { id: 61, name: 'Ligue 1' },
        ];

        const [live, today, newsData, ...scorerResults] = await Promise.allSettled([
          fetchLiveMatches(),
          fetchMatchesByDate(getToday()),
          fetchFootballNews(),
          ...leagues.map(l => fetchTopScorers(l.id, 2025)),
        ]);

        if (live.status === 'fulfilled') setLiveMatches(live.value);
        if (today.status === 'fulfilled') setTodayMatches(today.value);
        if (newsData.status === 'fulfilled') setNews(newsData.value.slice(0, 4));

        const allScorers: { league: string; scorers: PlayerStat[] }[] = [];
        scorerResults.forEach((result, i) => {
          if (result.status === 'fulfilled' && result.value.length > 0) {
            allScorers.push({ league: leagues[i].name, scorers: result.value.slice(0, 5) });
          }
        });
        setTopScorers(allScorers);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const upcomingMatches = useMemo(() =>
    todayMatches.filter(m => m.status === 'NS' || m.status === 'TBD').slice(0, 6),
  [todayMatches]);

  const recentResults = useMemo(() =>
    todayMatches.filter(m => m.status === 'FT' || m.status === 'AET' || m.status === 'PEN').slice(0, 4),
  [todayMatches]);

  // Featured match = biggest live match or first upcoming
  const featuredMatch = liveMatches[0] || upcomingMatches[0] || recentResults[0];

  return (
    <>
      <SEOHead
        title="LastFootball — All Football, One Place"
        description="Live football scores, fixtures, results, stats and news from top leagues worldwide."
        jsonLd={buildWebsiteJsonLd()}
      />
      <Header />
      <main className="min-h-screen bg-background">
        {/* ─── HERO ──────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden min-h-[480px] sm:min-h-[520px] flex items-center">
          {/* Rotating background images */}
          <HeroBackground />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />

          <div className="relative container max-w-6xl mx-auto px-4 py-16 sm:py-24">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
              {/* Left — text */}
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6 backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    {liveMatches.length > 0 ? `${liveMatches.length} Live Now` : 'Live Scores'}
                  </span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-4 drop-shadow-lg">
                  ALL FOOTBALL,<br />
                  <span className="text-primary">ONE PLACE.</span>
                </h1>
                <p className="text-base sm:text-lg text-gray-300 max-w-md mx-auto lg:mx-0 mb-8">
                  Live Scores, Stats, News and Much More. Track every match from top leagues worldwide.
                </p>
                <div className="flex items-center gap-3 justify-center lg:justify-start">
                  <Link
                    to="/live"
                    className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    Explore Now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/stats"
                    className="px-6 py-3 rounded-lg bg-white/10 backdrop-blur-sm text-white font-bold text-sm hover:bg-white/20 transition-colors border border-white/10"
                  >
                    View Stats
                  </Link>
                </div>
              </div>

              {/* Right — featured match carousel */}
              {liveMatches.length > 0 ? (
                <div className="flex-shrink-0 w-full max-w-sm">
                  <AutoSlider items={liveMatches.slice(0, 6)} interval={6000} render={(m) => <FeaturedMatchCard match={m} />} />
                </div>
              ) : featuredMatch ? (
                <div className="flex-shrink-0 w-full max-w-sm">
                  <FeaturedMatchCard match={featuredMatch} />
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* ─── 3 COLUMN GRID ─────────────────────────────────────────── */}
        <section className="container max-w-6xl mx-auto px-4 -mt-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Live Scores */}
            <DashboardCard
              title="Live Scores"
              icon={<Zap className="w-4 h-4" />}
              linkTo="/live"
              linkLabel="View All Matches"
              accent
            >
              {liveMatches.length > 0 ? (
                <AutoPaginate items={liveMatches} pageSize={4} interval={5000} render={(m) => <MiniMatch key={m.id} match={m} />} />
              ) : recentResults.length > 0 ? (
                <div className="space-y-1">
                  {recentResults.map(m => (
                    <MiniMatch key={m.id} match={m} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No live matches right now</p>
              )}
            </DashboardCard>

            {/* Upcoming Fixtures */}
            <DashboardCard
              title="Fixtures"
              icon={<Calendar className="w-4 h-4" />}
              linkTo="/fixtures"
              linkLabel="View All Matches"
            >
              {upcomingMatches.length > 0 ? (
                <AutoPaginate items={upcomingMatches} pageSize={4} interval={5000} render={(m) => <MiniFixture key={m.id} match={m} />} />
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No upcoming matches today</p>
              )}
            </DashboardCard>

            {/* Top Scorers — cycling through leagues */}
            <DashboardCard
              title="Top Scorers"
              icon={<Trophy className="w-4 h-4" />}
              linkTo="/stats"
              linkLabel="View All Players"
            >
              {topScorers.length > 0 ? (
                <AutoSlider
                  items={topScorers}
                  interval={7000}
                  render={(leagueData) => (
                    <div>
                      <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">{leagueData.league}</div>
                      <div className="space-y-1">
                        {leagueData.scorers.map((s, i) => (
                          <ScorerRow key={s.player.id} scorer={s} rank={i + 1} />
                        ))}
                      </div>
                    </div>
                  )}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
              )}
            </DashboardCard>
          </div>
        </section>

        {/* ─── NEWS + STATS ──────────────────────────────────────────── */}
        <section className="container max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Latest News */}
            <DashboardCard
              title="Latest News"
              icon={<Newspaper className="w-4 h-4" />}
              linkTo="/news"
              linkLabel="View All News"
            >
              {news.length > 0 ? (
                <div className="space-y-3">
                  {news.map((n, i) => (
                    <a
                      key={i}
                      href={n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                        {n.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{n.source}</span>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="text-[10px] text-muted-foreground">
                          {timeAgo(n.pubDate)}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading news...</p>
              )}
            </DashboardCard>

            {/* Stats Zone — Featured match stats */}
            <DashboardCard
              title="Stats Zone"
              icon={<Zap className="w-4 h-4" />}
              linkTo="/stats"
              linkLabel="View Full Stats"
            >
              {featuredMatch && featuredMatch.stats ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <OptimizedImage src={featuredMatch.homeTeam.logo} alt="" className="w-6 h-6 object-contain" />
                      <span className="text-xs font-bold text-foreground">{featuredMatch.homeTeam.shortName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{featuredMatch.awayTeam.shortName}</span>
                      <OptimizedImage src={featuredMatch.awayTeam.logo} alt="" className="w-6 h-6 object-contain" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <StatBar label="Possession" home={featuredMatch.stats.possession?.[0]} away={featuredMatch.stats.possession?.[1]} />
                    <StatBar label="Shots" home={featuredMatch.stats.shots?.[0]} away={featuredMatch.stats.shots?.[1]} />
                    <StatBar label="Shots on Target" home={featuredMatch.stats.shotsOnTarget?.[0]} away={featuredMatch.stats.shotsOnTarget?.[1]} />
                    <StatBar label="Corners" home={featuredMatch.stats.corners?.[0]} away={featuredMatch.stats.corners?.[1]} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">Match stats appear here during live games</p>
                  <Link to="/stats" className="text-xs text-primary hover:underline mt-2 inline-block">
                    Browse league stats →
                  </Link>
                </div>
              )}
            </DashboardCard>
          </div>
        </section>

        {/* ─── CTA FOOTER ────────────────────────────────────────────── */}
        <section className="container max-w-6xl mx-auto px-4 pb-8">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6 sm:p-8 text-center">
            <h2 className="text-xl sm:text-2xl font-black text-foreground mb-2">Never Miss a Goal</h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Track live scores, follow your favorite teams, and get instant updates from all major leagues.
            </p>
            <div className="flex items-center gap-3 justify-center">
              <Link
                to="/auth"
                className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Sign Up Free
              </Link>
              <Link
                to="/fixtures"
                className="px-6 py-2.5 rounded-lg border border-border text-foreground font-bold text-sm hover:bg-secondary transition-colors"
              >
                Browse Matches
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

// ─── Featured Match Card ────────────────────────────────────────────────────
function FeaturedMatchCard({ match }: { match: Match }) {
  const isLive = match.status === 'LIVE' || match.status === '1H' || match.status === '2H' || match.status === 'HT';
  const hasScore = match.homeScore !== null;

  return (
    <Link to={`/match/${match.id}`} className="block">
      <div className="bg-card/80 backdrop-blur border border-border/50 rounded-xl p-5 hover:border-primary/30 transition-colors">
        {/* League */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {match.league.logo && <OptimizedImage src={match.league.logo} alt="" className="w-4 h-4 object-contain" />}
            <span className="text-[11px] text-muted-foreground font-medium">{match.league.name}</span>
          </div>
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {match.minute ? `${match.minute}'` : 'LIVE'}
            </span>
          )}
        </div>

        {/* Teams + Score */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-2 flex-1">
            {match.homeTeam.logo && <OptimizedImage src={match.homeTeam.logo} alt="" className="w-12 h-12 object-contain" />}
            <span className="text-xs font-bold text-foreground text-center leading-tight">{match.homeTeam.shortName}</span>
          </div>

          <div className="px-4 text-center">
            {hasScore ? (
              <div className="text-3xl font-black text-foreground tabular-nums">
                {match.homeScore} <span className="text-muted-foreground/40">-</span> {match.awayScore}
              </div>
            ) : (
              <div className="text-lg font-bold text-muted-foreground">{match.time}</div>
            )}
            <div className="text-[10px] text-muted-foreground mt-1 uppercase font-medium">
              {isLive ? (match.status === 'HT' ? 'Half Time' : `${match.minute}'`) : match.status === 'NS' ? match.date : match.status}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            {match.awayTeam.logo && <OptimizedImage src={match.awayTeam.logo} alt="" className="w-12 h-12 object-contain" />}
            <span className="text-xs font-bold text-foreground text-center leading-tight">{match.awayTeam.shortName}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Dashboard Card ─────────────────────────────────────────────────────────
function DashboardCard({
  title, icon, linkTo, linkLabel, subtitle, accent, children,
}: {
  title: string;
  icon: React.ReactNode;
  linkTo: string;
  linkLabel: string;
  subtitle?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(
      'bg-card border rounded-xl overflow-hidden',
      accent ? 'border-primary/20' : 'border-border/50',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <span className={cn('text-muted-foreground', accent && 'text-primary')}>{icon}</span>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h3>
          {subtitle && <span className="text-[10px] text-muted-foreground">· {subtitle}</span>}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {children}
      </div>

      {/* Footer link */}
      <Link
        to={linkTo}
        className="flex items-center justify-center gap-1 py-2.5 border-t border-border/30 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
      >
        {linkLabel}
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

// ─── Mini Match Row (live/result) ───────────────────────────────────────────
function MiniMatch({ match }: { match: Match }) {
  const isLive = match.status === 'LIVE' || match.status === '1H' || match.status === '2H' || match.status === 'HT';
  return (
    <Link to={`/match/${match.id}`} className="flex items-center gap-2 py-1.5 hover:bg-secondary/30 rounded px-1 transition-colors">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <OptimizedImage src={match.homeTeam.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
        <span className="text-[12px] font-medium text-foreground truncate">{match.homeTeam.shortName}</span>
      </div>
      <div className="text-center px-2">
        <span className={cn(
          'text-[13px] font-black tabular-nums',
          isLive ? 'text-red-400' : 'text-foreground',
        )}>
          {match.homeScore} - {match.awayScore}
        </span>
        <div className="text-[8px] text-muted-foreground uppercase font-medium">
          {isLive ? (match.minute ? `${match.minute}'` : 'LIVE') : 'FT'}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className="text-[12px] font-medium text-foreground truncate">{match.awayTeam.shortName}</span>
        <OptimizedImage src={match.awayTeam.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
      </div>
    </Link>
  );
}

// ─── Mini Fixture Row (upcoming) ────────────────────────────────────────────
function MiniFixture({ match }: { match: Match }) {
  return (
    <Link to={`/match/${match.id}`} className="flex items-center gap-2 py-1.5 hover:bg-secondary/30 rounded px-1 transition-colors">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <OptimizedImage src={match.homeTeam.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
        <span className="text-[12px] font-medium text-foreground truncate">{match.homeTeam.shortName}</span>
      </div>
      <span className="text-[11px] font-semibold text-muted-foreground tabular-nums px-2">{match.time}</span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className="text-[12px] font-medium text-foreground truncate">{match.awayTeam.shortName}</span>
        <OptimizedImage src={match.awayTeam.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
      </div>
    </Link>
  );
}

// ─── Scorer Row ─────────────────────────────────────────────────────────────
function ScorerRow({ scorer, rank }: { scorer: PlayerStat; rank: number }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-[11px] font-bold text-muted-foreground w-4 text-center tabular-nums">{rank}</span>
      <img src={scorer.player.photo} alt="" className="w-7 h-7 rounded-full object-cover bg-secondary" loading="lazy" />
      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-semibold text-foreground truncate block">{scorer.player.name}</span>
        <div className="flex items-center gap-1">
          {scorer.team.logo && <img src={scorer.team.logo} alt="" className="w-3 h-3 object-contain" />}
          <span className="text-[10px] text-muted-foreground truncate">{scorer.team.name}</span>
        </div>
      </div>
      <span className="text-sm font-black text-primary tabular-nums">{scorer.goals}</span>
    </div>
  );
}

// ─── Stat Bar ───────────────────────────────────────────────────────────────
function StatBar({ label, home, away }: { label: string; home?: number | string; away?: number | string }) {
  const h = parseInt(String(home || 0));
  const a = parseInt(String(away || 0));
  const max = Math.max(h + a, 1);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-foreground tabular-nums">{home ?? '-'}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-xs font-bold text-foreground tabular-nums">{away ?? '-'}</span>
      </div>
      <div className="flex gap-1 h-1.5">
        <div className="flex-1 bg-secondary rounded-l-full overflow-hidden flex justify-end">
          <div className="h-full rounded-l-full bg-primary transition-all" style={{ width: `${(h / max) * 100}%` }} />
        </div>
        <div className="flex-1 bg-secondary rounded-r-full overflow-hidden">
          <div className="h-full rounded-r-full bg-blue-500/70 transition-all" style={{ width: `${(a / max) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Time ago helper ────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return '';
  }
}

// ─── Hero Background with rotating images ───────────────────────────────────
// ─── Auto Slider — crossfade between single items ───────────────────────────
function AutoSlider<T>({ items, interval, render }: { items: T[]; interval: number; render: (item: T) => React.ReactNode }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setIdx(prev => (prev + 1) % items.length), interval);
    return () => clearInterval(timer);
  }, [items.length, interval]);

  if (!items.length) return null;

  return (
    <div className="relative">
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            'transition-all duration-700 ease-in-out',
            i === idx ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none',
          )}
        >
          {render(item)}
        </div>
      ))}
      {/* Dots indicator */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === idx ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Auto Paginate — cycle through pages of items ───────────────────────────
function AutoPaginate<T>({ items, pageSize, interval, render }: { items: T[]; pageSize: number; interval: number; render: (item: T) => React.ReactNode }) {
  const totalPages = Math.ceil(items.length / pageSize);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (totalPages <= 1) return;
    const timer = setInterval(() => setPage(prev => (prev + 1) % totalPages), interval);
    return () => clearInterval(timer);
  }, [totalPages, interval]);

  const start = page * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return (
    <div>
      <div className="space-y-1 transition-opacity duration-500">
        {pageItems.map(item => render(item))}
      </div>
      {/* Page dots */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2 pt-1">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={cn(
                'h-1 rounded-full transition-all',
                i === page ? 'w-3 bg-primary' : 'w-1.5 bg-muted-foreground/20',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hero Background with rotating images ───────────────────────────────────
const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1600&q=80&fit=crop', // football on dark grass — moody
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&q=80&fit=crop', // boots kicking ball close up
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&q=80&fit=crop', // stadium floodlights night atmosphere
  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1600&q=80&fit=crop', // match day crowd atmosphere
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1600&q=80&fit=crop', // player silhouette action shot
];

function HeroBackground() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loaded, setLoaded] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Preload all images
    HERO_IMAGES.forEach((src, i) => {
      const img = new Image();
      img.onload = () => setLoaded(prev => new Set(prev).add(i));
      img.src = src;
    });

    // Rotate every 8 seconds — slow, cinematic
    const interval = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % HERO_IMAGES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {HERO_IMAGES.map((src, i) => (
        <div
          key={i}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out"
          style={{
            backgroundImage: loaded.has(i) ? `url(${src})` : undefined,
            opacity: i === currentIdx ? 1 : 0,
            backgroundColor: '#0a0a0a',
          }}
        />
      ))}
    </>
  );
}
