import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import Flag from '@/components/Flag';
import { Trophy, Calendar, MapPin, Clock, ChevronRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Tournament Data ────────────────────────────────────────────────────────
const WC_START = new Date('2026-06-11T19:00:00Z').getTime();

const GROUPS = [
  { name: 'A', teams: ['MEX', 'RSA', 'KOR', 'CZE'] },
  { name: 'B', teams: ['CAN', 'SUI', 'QAT', 'BIH'] },
  { name: 'C', teams: ['BRA', 'MAR', 'HAI', 'SCO'] },
  { name: 'D', teams: ['USA', 'PAR', 'AUS', 'TUR'] },
  { name: 'E', teams: ['GER', 'CUW', 'CIV', 'ECU'] },
  { name: 'F', teams: ['NED', 'JPN', 'TUN', 'SWE'] },
  { name: 'G', teams: ['BEL', 'EGY', 'IRN', 'NZL'] },
  { name: 'H', teams: ['ESP', 'CPV', 'KSA', 'URU'] },
  { name: 'I', teams: ['FRA', 'SEN', 'NOR', 'IRQ'] },
  { name: 'J', teams: ['ARG', 'ALG', 'AUT', 'JOR'] },
  { name: 'K', teams: ['POR', 'UZB', 'COL', 'COD'] },
  { name: 'L', teams: ['ENG', 'CRO', 'GHA', 'PAN'] },
];

const TEAM_INFO: Record<string, { name: string }> = {
  MEX: { name: 'Mexico' }, KOR: { name: 'South Korea' }, CZE: { name: 'Czech Republic' }, RSA: { name: 'South Africa' },
  CAN: { name: 'Canada' }, SUI: { name: 'Switzerland' }, BIH: { name: 'Bosnia & Herz.' }, QAT: { name: 'Qatar' },
  BRA: { name: 'Brazil' }, MAR: { name: 'Morocco' }, SCO: { name: 'Scotland' }, HAI: { name: 'Haiti' },
  USA: { name: 'USA' }, TUR: { name: 'Turkey' }, PAR: { name: 'Paraguay' }, AUS: { name: 'Australia' },
  GER: { name: 'Germany' }, CIV: { name: 'Ivory Coast' }, CUW: { name: 'Curaçao' }, ECU: { name: 'Ecuador' },
  NED: { name: 'Netherlands' }, JPN: { name: 'Japan' }, SWE: { name: 'Sweden' }, TUN: { name: 'Tunisia' },
  BEL: { name: 'Belgium' }, EGY: { name: 'Egypt' }, IRN: { name: 'Iran' }, NZL: { name: 'New Zealand' },
  ESP: { name: 'Spain' }, KSA: { name: 'Saudi Arabia' }, CPV: { name: 'Cabo Verde' }, URU: { name: 'Uruguay' },
  FRA: { name: 'France' }, SEN: { name: 'Senegal' }, NOR: { name: 'Norway' }, IRQ: { name: 'Iraq' },
  ARG: { name: 'Argentina' }, ALG: { name: 'Algeria' }, AUT: { name: 'Austria' }, JOR: { name: 'Jordan' },
  POR: { name: 'Portugal' }, UZB: { name: 'Uzbekistan' }, COL: { name: 'Colombia' }, COD: { name: 'DR Congo' },
  ENG: { name: 'England' }, CRO: { name: 'Croatia' }, GHA: { name: 'Ghana' }, PAN: { name: 'Panama' },
};

// Group stage match schedule (3 matchdays per group)
function generateGroupMatches(group: { name: string; teams: string[] }, startDate: string): GroupMatch[] {
  const t = group.teams;
  const base = new Date(startDate);
  return [
    { home: t[0], away: t[2], date: addDays(base, 0), group: group.name, matchday: 1 },
    { home: t[1], away: t[3], date: addDays(base, 0), group: group.name, matchday: 1 },
    { home: t[0], away: t[3], date: addDays(base, 4), group: group.name, matchday: 2 },
    { home: t[2], away: t[1], date: addDays(base, 4), group: group.name, matchday: 2 },
    { home: t[0], away: t[1], date: addDays(base, 8), group: group.name, matchday: 3 },
    { home: t[2], away: t[3], date: addDays(base, 8), group: group.name, matchday: 3 },
  ];
}

interface GroupMatch { home: string; away: string; date: string; group: string; matchday: number; }

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const GROUP_START_DATES: Record<string, string> = {
  A: '2026-06-11', B: '2026-06-12', C: '2026-06-12', D: '2026-06-13',
  E: '2026-06-13', F: '2026-06-14', G: '2026-06-14', H: '2026-06-15',
  I: '2026-06-15', J: '2026-06-16', K: '2026-06-16', L: '2026-06-17',
};

const KNOCKOUT_ROUNDS = [
  { name: 'Round of 32', shortName: 'R32', matches: 16, startDate: '2026-06-28', color: '#3b82f6' },
  { name: 'Round of 16', shortName: 'R16', matches: 8, startDate: '2026-07-04', color: '#8b5cf6' },
  { name: 'Quarter Finals', shortName: 'QF', matches: 4, startDate: '2026-07-10', color: '#f59e0b' },
  { name: 'Semi Finals', shortName: 'SF', matches: 2, startDate: '2026-07-14', color: '#ef4444' },
  { name: 'Final', shortName: 'F', matches: 1, startDate: '2026-07-19', color: '#00ff87' },
];

const STADIUMS = [
  'MetLife Stadium, New Jersey', 'AT&T Stadium, Dallas', 'SoFi Stadium, Los Angeles',
  'Estadio Azteca, Mexico City', 'Hard Rock Stadium, Miami', 'NRG Stadium, Houston',
  'Mercedes-Benz Stadium, Atlanta', 'Lincoln Financial Field, Philadelphia',
  'Lumen Field, Seattle', 'Gillette Stadium, Boston', 'Arrowhead Stadium, Kansas City',
  "Levi's Stadium, San Francisco", 'Estadio BBVA, Monterrey', 'Estadio Akron, Guadalajara',
  'BC Place, Vancouver', 'BMO Field, Toronto',
];

// ─── Component ──────────────────────────────────────────────────────────────

// Reverse lookup: team name → FIFA code
function getTeamCode(name: string): string {
  const n = name.toLowerCase();
  for (const [code, info] of Object.entries(TEAM_INFO)) {
    if (info.name.toLowerCase() === n) return code;
  }
  // Fuzzy match
  for (const [code, info] of Object.entries(TEAM_INFO)) {
    if (n.includes(info.name.toLowerCase()) || info.name.toLowerCase().includes(n)) return code;
  }
  return name.slice(0, 3).toUpperCase();
}

type TabKey = 'fixtures' | 'standings' | 'bracket';

export default function WCFixtures() {
  const [activeTab, setActiveTab] = useState<TabKey>('fixtures');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedMatchday, setSelectedMatchday] = useState<number>(1);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  const [apiFixtures, setApiFixtures] = useState<any[]>([]);
  const [apiStandings, setApiStandings] = useState<any[]>([]);
  const [loadingApi, setLoadingApi] = useState(true);

  // Fetch real WC fixtures from API
  useEffect(() => {
    const fetchWC = async () => {
      try {
        const { callApi } = await import('@/services/footballApi');
        const [fixtures, standings] = await Promise.allSettled([
          callApi('fixtures', { league: '1', season: '2026' }),
          callApi('standings', { league: '1', season: '2026' }),
        ]);
        if (fixtures.status === 'fulfilled' && fixtures.value?.length > 0) {
          setApiFixtures(fixtures.value);
        }
        if (standings.status === 'fulfilled' && standings.value?.length > 0) {
          setApiStandings(standings.value);
        }
      } catch {}
      setLoadingApi(false);
    };
    fetchWC();
  }, []);

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, WC_START - Date.now());
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // Use API fixtures if available, otherwise fallback to generated
  const allGroupMatches = useMemo(() => {
    if (apiFixtures.length > 0) {
      // Map API fixtures to our format
      return apiFixtures
        .filter((f: any) => f.league?.round?.toLowerCase().includes('group'))
        .map((f: any) => {
          const groupLetter = f.league?.round?.replace(/Group\s*/i, '').trim() || '?';
          // Determine matchday from round info
          const roundStr = f.league?.round || '';
          const mdMatch = roundStr.match(/(\d+)$/);
          const matchday = mdMatch ? parseInt(mdMatch[1]) : 1;
          return {
            home: getTeamCode(f.teams?.home?.name || ''),
            away: getTeamCode(f.teams?.away?.name || ''),
            date: f.fixture?.date?.split('T')[0] || '',
            time: f.fixture?.date ? new Date(f.fixture.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
            group: groupLetter,
            matchday,
            homeScore: f.goals?.home,
            awayScore: f.goals?.away,
            status: f.fixture?.status?.short || 'NS',
            minute: f.fixture?.status?.elapsed,
            fixtureId: f.fixture?.id,
            venue: f.fixture?.venue?.name || '',
            city: f.fixture?.venue?.city || '',
            homeLogo: f.teams?.home?.logo,
            awayLogo: f.teams?.away?.logo,
            homeName: f.teams?.home?.name,
            awayName: f.teams?.away?.name,
          };
        });
    }
    return GROUPS.flatMap(g => generateGroupMatches(g, GROUP_START_DATES[g.name]));
  }, [apiFixtures]);

  const filteredMatches = allGroupMatches.filter(m => {
    if (selectedGroup && m.group !== selectedGroup) return false;
    if (selectedMatchday > 0 && m.matchday !== selectedMatchday) return false;
    return true;
  });

  // Group matches by date
  const matchesByDate = useMemo(() => {
    const map = new Map<string, GroupMatch[]>();
    filteredMatches.forEach(m => {
      if (!map.has(m.date)) map.set(m.date, []);
      map.get(m.date)!.push(m);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredMatches]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="FIFA World Cup 2026 Fixtures — Schedule, Groups & Bracket | LastFootball" description="Complete FIFA World Cup 2026 match schedule, group stage fixtures, knockout bracket, stadiums, and kick-off times." path="/worldcup/fixtures" />
      <Header />

      {/* Hero with countdown */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00ff87]/5 via-transparent to-amber-500/5" />
        <div className="container max-w-5xl py-6 relative">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">FIFA WORLD CUP 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-2">Match Schedule</h1>
          <p className="text-sm text-muted-foreground">June 11 – July 19, 2026 · USA · Mexico · Canada</p>

          {/* Countdown */}
          <div className="mt-4 flex gap-3">
            {[
              { val: countdown.days, label: 'DAYS' },
              { val: countdown.hours, label: 'HRS' },
              { val: countdown.mins, label: 'MIN' },
              { val: countdown.secs, label: 'SEC' },
            ].map(({ val, label }) => (
              <div key={label} className="bg-card border border-border rounded-lg px-3 py-2 text-center min-w-[56px]">
                <p className="text-xl font-black text-foreground tabular-nums">{String(val).padStart(2, '0')}</p>
                <p className="text-[8px] tracking-widest text-muted-foreground/80 uppercase">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="sticky top-14 z-30 bg-background border-b border-border/50">
        <div className="container max-w-5xl flex gap-1 py-2 overflow-x-auto no-scrollbar">
          {([
            { key: 'fixtures' as TabKey, label: 'FIXTURES', icon: Calendar },
            { key: 'standings' as TabKey, label: 'STANDINGS', icon: Trophy },
            { key: 'bracket' as TabKey, label: 'BRACKET', icon: Zap },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-all',
                activeTab === tab.key
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground/80 hover:text-foreground hover:bg-card',
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="container max-w-5xl py-4 pb-20 md:pb-6">

        {/* ─── FIXTURES TAB ──────────────────────────────────────────── */}
        {activeTab === 'fixtures' && (
          <div>
            {/* Matchday filter */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar pb-1">
              {[1, 2, 3].map(md => (
                <button
                  key={md}
                  onClick={() => setSelectedMatchday(md)}
                  className={cn('px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all',
                    selectedMatchday === md ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground/80 border border-border hover:text-foreground',
                  )}
                >
                  Matchday {md}
                </button>
              ))}
              <button
                onClick={() => setSelectedMatchday(0)}
                className={cn('px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all',
                  selectedMatchday === 0 ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground/80 border border-border hover:text-foreground',
                )}
              >
                All Matchdays
              </button>
            </div>

            {/* Group filter */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setSelectedGroup(null)}
                className={cn('px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all',
                  !selectedGroup ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground/80 border border-border hover:text-foreground',
                )}
              >
                ALL GROUPS
              </button>
              {GROUPS.map(g => (
                <button
                  key={g.name}
                  onClick={() => setSelectedGroup(g.name === selectedGroup ? null : g.name)}
                  className={cn('px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all',
                    selectedGroup === g.name ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground/80 border border-border hover:text-foreground',
                  )}
                >
                  GRP {g.name}
                </button>
              ))}
            </div>

            {/* Matches by date */}
            {matchesByDate.map(([date, matches]) => (
              <div key={date} className="mb-4">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-[11px] uppercase tracking-widest text-muted-foreground/80 font-bold">
                    {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {matches.map((m, i) => (
                    <WCMatchCard key={`${m.home}-${m.away}`} match={m} stadium={STADIUMS[i % STADIUMS.length]} />
                  ))}
                </div>
              </div>
            ))}

            {/* Knockout rounds */}
            <div className="mt-8">
              <h2 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" /> KNOCKOUT STAGE
              </h2>
              {KNOCKOUT_ROUNDS.map(round => (
                <div key={round.name} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: round.color }} />
                    <span className="text-[11px] uppercase tracking-widest font-bold" style={{ color: round.color }}>{round.name}</span>
                    <span className="text-[10px] text-muted-foreground/60">· {round.startDate}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {Array.from({ length: round.matches }).map((_, i) => (
                      <div key={i} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center">
                            <span className="text-[8px] text-muted-foreground/60">?</span>
                          </div>
                          <span className="text-xs text-muted-foreground/80">TBD</span>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground/40">vs</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground/80">TBD</span>
                          <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center">
                            <span className="text-[8px] text-muted-foreground/60">?</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── STANDINGS TAB ─────────────────────────────────────────── */}
        {activeTab === 'standings' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GROUPS.map(g => {
              // Try to find real standings from API
              const apiGroup = apiStandings.find((s: any) => {
                const groupName = s[0]?.group || '';
                return groupName.includes(g.name) || groupName.endsWith(g.name);
              });

              return (
                <div key={g.name} className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-primary font-bold">GROUP {g.name}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">
                    <span className="w-5 text-center">#</span>
                    <span className="flex-1">TEAM</span>
                    <span className="w-6 text-center">P</span>
                    <span className="w-6 text-center">W</span>
                    <span className="w-6 text-center">D</span>
                    <span className="w-6 text-center">L</span>
                    <span className="w-8 text-center">GD</span>
                    <span className="w-8 text-center">PTS</span>
                  </div>
                  {(apiGroup || g.teams.map((code, i) => ({
                    rank: i + 1,
                    team: { name: TEAM_INFO[code]?.name || code, logo: '' },
                    code,
                    all: { played: 0, win: 0, draw: 0, lose: 0, goals: { for: 0, against: 0 } },
                    goalsDiff: 0,
                    points: 0,
                  }))).map((entry: any, i: number) => {
                    const teamName = entry.team?.name || '';
                    const code = entry.code || getTeamCode(teamName) || g.teams[i];
                    const played = entry.all?.played || 0;
                    const won = entry.all?.win || 0;
                    const drawn = entry.all?.draw || 0;
                    const lost = entry.all?.lose || 0;
                    const gd = entry.goalsDiff || 0;
                    const pts = entry.points || 0;
                    const rank = entry.rank || i + 1;

                    return (
                      <Link
                        key={code}
                        to={`/worldcup/team/${code}`}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 border-t border-border/50 hover:bg-secondary transition-colors',
                          rank <= 2 && 'border-l-2 border-l-primary/30',
                        )}
                      >
                        <span className="w-5 text-center text-[11px] font-bold text-muted-foreground/80">{rank}</span>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {entry.team?.logo ? (
                            <img src={entry.team.logo} alt="" className="w-5 h-4 object-contain" />
                          ) : (
                            <Flag code={code} className="w-5 h-3.5" />
                          )}
                          <span className="text-xs font-semibold text-foreground/90 truncate">{TEAM_INFO[code]?.name || teamName}</span>
                        </div>
                        <span className="w-6 text-center text-[11px] text-muted-foreground/80 tabular-nums">{played}</span>
                        <span className="w-6 text-center text-[11px] text-muted-foreground/80 tabular-nums">{won}</span>
                        <span className="w-6 text-center text-[11px] text-muted-foreground/80 tabular-nums">{drawn}</span>
                        <span className="w-6 text-center text-[11px] text-muted-foreground/80 tabular-nums">{lost}</span>
                        <span className={cn('w-8 text-center text-[11px] tabular-nums', gd > 0 ? 'text-primary' : gd < 0 ? 'text-red-400' : 'text-muted-foreground/80')}>{gd > 0 ? '+' : ''}{gd}</span>
                        <span className="w-8 text-center text-[11px] font-bold text-foreground tabular-nums">{pts}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── BRACKET TAB ───────────────────────────────────────────── */}
        {activeTab === 'bracket' && (
          <div>
            <p className="text-xs text-muted-foreground/80 mb-4">The knockout bracket will be populated after the group stage concludes.</p>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4">
              {KNOCKOUT_ROUNDS.map((round, ri) => (
                <div key={round.name} className="flex-shrink-0" style={{ width: ri === 4 ? '180px' : '160px' }}>
                  <div className="text-center mb-3">
                    <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: round.color }}>{round.shortName}</span>
                  </div>
                  <div className="space-y-2" style={{ paddingTop: `${ri * 24}px` }}>
                    {Array.from({ length: round.matches }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-card border border-border rounded-lg p-2"
                        style={{ marginBottom: `${ri * 16}px` }}
                      >
                        <div className="flex items-center gap-1.5 py-1 border-b border-border/50">
                          <div className="w-4 h-4 rounded-full bg-secondary" />
                          <span className="text-[10px] text-muted-foreground/80 flex-1">TBD</span>
                          <span className="text-[10px] font-bold text-muted-foreground/40">-</span>
                        </div>
                        <div className="flex items-center gap-1.5 py-1">
                          <div className="w-4 h-4 rounded-full bg-secondary" />
                          <span className="text-[10px] text-muted-foreground/80 flex-1">TBD</span>
                          <span className="text-[10px] font-bold text-muted-foreground/40">-</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Final venue highlight */}
            <div className="mt-6 bg-gradient-to-r from-[#00ff87]/5 to-amber-500/5 border border-primary/20 rounded-xl p-5 text-center">
              <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-black text-foreground">THE FINAL</h3>
              <p className="text-sm text-muted-foreground">July 19, 2026</p>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground/80" />
                <span className="text-xs text-muted-foreground/80">MetLife Stadium, New Jersey</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── WC Match Card ──────────────────────────────────────────────────────────
function WCMatchCard({ match, stadium }: { match: any; stadium: string }) {
  const homeCode = match.home;
  const awayCode = match.away;
  const home = TEAM_INFO[homeCode];
  const away = TEAM_INFO[awayCode];
  const homeName = match.homeName || home?.name || homeCode;
  const awayName = match.awayName || away?.name || awayCode;
  const venue = match.venue || stadium;
  const isLive = ['1H', '2H', 'HT', 'ET', 'BT', 'P'].includes(match.status);
  const isFinished = ['FT', 'AET', 'PEN'].includes(match.status);
  const hasScore = match.homeScore !== null && match.homeScore !== undefined;

  return (
    <div className={cn(
      'bg-card border rounded-lg overflow-hidden hover:border-border transition-colors',
      isLive ? 'border-primary/40 shadow-[0_0_10px_rgba(0,255,135,0.1)]' : 'border-border',
    )}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
        <span className="text-[9px] uppercase tracking-widest text-primary font-bold">GROUP {match.group} · MD{match.matchday}</span>
        <div className="flex items-center gap-2">
          {isLive && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold text-primary">{match.minute}'</span>
            </div>
          )}
          {isFinished && <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{match.status}</span>}
          {!isLive && !isFinished && match.time && <span className="text-[10px] font-semibold text-muted-foreground/80">{match.time}</span>}
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-muted-foreground/40" />
            <span className="text-[9px] text-muted-foreground/60 truncate max-w-[120px]">{venue}</span>
          </div>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center px-3 py-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {match.homeLogo ? (
            <img src={match.homeLogo} alt="" className="w-7 h-7 object-contain" />
          ) : (
            <Flag code={homeCode} size={28} className="rounded-sm" />
          )}
          <Link to={`/worldcup/team/${homeCode}`} className={cn(
            'text-sm font-semibold truncate transition-colors',
            hasScore && match.homeScore > match.awayScore ? 'text-foreground font-bold' :
            hasScore && match.homeScore < match.awayScore && isFinished ? 'text-muted-foreground/80' :
            'text-foreground/90 hover:text-foreground',
          )}>
            {homeName}
          </Link>
        </div>

        {/* Score / VS */}
        <div className="px-3 text-center min-w-[60px]">
          {hasScore ? (
            <div>
              <span className={cn('text-xl font-black tabular-nums', isLive ? 'text-primary' : 'text-foreground')}>
                {match.homeScore} - {match.awayScore}
              </span>
            </div>
          ) : (
            <span className="text-xs font-bold text-muted-foreground/40 tracking-widest">VS</span>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
          <Link to={`/worldcup/team/${awayCode}`} className={cn(
            'text-sm font-semibold truncate transition-colors text-right',
            hasScore && match.awayScore > match.homeScore ? 'text-foreground font-bold' :
            hasScore && match.awayScore < match.homeScore && isFinished ? 'text-muted-foreground/80' :
            'text-foreground/90 hover:text-foreground',
          )}>
            {awayName}
          </Link>
          {match.awayLogo ? (
            <img src={match.awayLogo} alt="" className="w-7 h-7 object-contain" />
          ) : (
            <Flag code={awayCode} size={28} className="rounded-sm" />
          )}
        </div>
      </div>
    </div>
  );
}
