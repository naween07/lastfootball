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
  { name: 'A', teams: ['MEX', 'KOR', 'CZE', 'RSA'] },
  { name: 'B', teams: ['CAN', 'AUS', 'BIH', 'QAT'] },
  { name: 'C', teams: ['BRA', 'MAR', 'SCO', 'HAI'] },
  { name: 'D', teams: ['USA', 'TUR', 'PAR', 'CRO'] },
  { name: 'E', teams: ['GER', 'CIV', 'CUW', 'ECU'] },
  { name: 'F', teams: ['NED', 'JPN', 'SWE', 'TUN'] },
  { name: 'G', teams: ['ARG', 'COL', 'AUT', 'UZB'] },
  { name: 'H', teams: ['ESP', 'KSA', 'CPV', 'JOR'] },
  { name: 'I', teams: ['FRA', 'SEN', 'NOR', 'IRQ'] },
  { name: 'J', teams: ['ENG', 'GHA', 'PAN', 'ALG'] },
  { name: 'K', teams: ['POR', 'COD', 'NGA', 'SUI'] },
  { name: 'L', teams: ['ITA', 'IRN', 'CMR', 'PER'] },
];

const TEAM_INFO: Record<string, { name: string; flag: string }> = {
  MEX: { name: 'Mexico', flag: 'mx' }, KOR: { name: 'South Korea', flag: 'kr' }, CZE: { name: 'Czechia', flag: 'cz' }, RSA: { name: 'South Africa', flag: 'za' },
  CAN: { name: 'Canada', flag: 'ca' }, AUS: { name: 'Australia', flag: 'au' }, BIH: { name: 'Bosnia & Herz.', flag: 'ba' }, QAT: { name: 'Qatar', flag: 'qa' },
  BRA: { name: 'Brazil', flag: 'br' }, MAR: { name: 'Morocco', flag: 'ma' }, SCO: { name: 'Scotland', flag: 'gb-sct' }, HAI: { name: 'Haiti', flag: 'ht' },
  USA: { name: 'USA', flag: 'us' }, TUR: { name: 'Turkey', flag: 'tr' }, PAR: { name: 'Paraguay', flag: 'py' }, CRO: { name: 'Croatia', flag: 'hr' },
  GER: { name: 'Germany', flag: 'de' }, CIV: { name: 'Ivory Coast', flag: 'ci' }, CUW: { name: 'Curaçao', flag: 'cw' }, ECU: { name: 'Ecuador', flag: 'ec' },
  NED: { name: 'Netherlands', flag: 'nl' }, JPN: { name: 'Japan', flag: 'jp' }, SWE: { name: 'Sweden', flag: 'se' }, TUN: { name: 'Tunisia', flag: 'tn' },
  ARG: { name: 'Argentina', flag: 'ar' }, COL: { name: 'Colombia', flag: 'co' }, AUT: { name: 'Austria', flag: 'at' }, UZB: { name: 'Uzbekistan', flag: 'uz' },
  ESP: { name: 'Spain', flag: 'es' }, KSA: { name: 'Saudi Arabia', flag: 'sa' }, CPV: { name: 'Cape Verde', flag: 'cv' }, JOR: { name: 'Jordan', flag: 'jo' },
  FRA: { name: 'France', flag: 'fr' }, SEN: { name: 'Senegal', flag: 'sn' }, NOR: { name: 'Norway', flag: 'no' }, IRQ: { name: 'Iraq', flag: 'iq' },
  ENG: { name: 'England', flag: 'gb-eng' }, GHA: { name: 'Ghana', flag: 'gh' }, PAN: { name: 'Panama', flag: 'pa' }, ALG: { name: 'Algeria', flag: 'dz' },
  POR: { name: 'Portugal', flag: 'pt' }, COD: { name: 'DR Congo', flag: 'cd' }, NGA: { name: 'Nigeria', flag: 'ng' }, SUI: { name: 'Switzerland', flag: 'ch' },
  ITA: { name: 'Italy', flag: 'it' }, IRN: { name: 'Iran', flag: 'ir' }, CMR: { name: 'Cameroon', flag: 'cm' }, PER: { name: 'Peru', flag: 'pe' },
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
type TabKey = 'fixtures' | 'standings' | 'bracket';

export default function WCFixtures() {
  const [activeTab, setActiveTab] = useState<TabKey>('fixtures');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

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

  const allGroupMatches = useMemo(() => {
    return GROUPS.flatMap(g => generateGroupMatches(g, GROUP_START_DATES[g.name]));
  }, []);

  const filteredMatches = selectedGroup
    ? allGroupMatches.filter(m => m.group === selectedGroup)
    : allGroupMatches;

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
    <div className="min-h-screen bg-[#0a0a0a]">
      <SEOHead title="FIFA World Cup 2026 Fixtures — Schedule, Groups & Bracket | LastFootball" description="Complete FIFA World Cup 2026 match schedule, group stage fixtures, knockout bracket, stadiums, and kick-off times." path="/worldcup/fixtures" />
      <Header />

      {/* Hero with countdown */}
      <section className="relative overflow-hidden border-b border-[#1a1a1a]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00ff87]/5 via-transparent to-amber-500/5" />
        <div className="container max-w-5xl py-6 relative">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-[#00ff87]" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#00ff87] font-bold">FIFA WORLD CUP 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Match Schedule</h1>
          <p className="text-sm text-[#666]">June 11 – July 19, 2026 · USA · Mexico · Canada</p>

          {/* Countdown */}
          <div className="mt-4 flex gap-3">
            {[
              { val: countdown.days, label: 'DAYS' },
              { val: countdown.hours, label: 'HRS' },
              { val: countdown.mins, label: 'MIN' },
              { val: countdown.secs, label: 'SEC' },
            ].map(({ val, label }) => (
              <div key={label} className="bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-center min-w-[56px]">
                <p className="text-xl font-black text-white tabular-nums">{String(val).padStart(2, '0')}</p>
                <p className="text-[8px] tracking-widest text-[#555] uppercase">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="sticky top-14 z-30 bg-[#0a0a0a] border-b border-[#1a1a1a]">
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
                  ? 'bg-[#00ff87]/10 text-[#00ff87] border border-[#00ff87]/20'
                  : 'text-[#555] hover:text-[#888] hover:bg-[#111]',
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
            {/* Group filter */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setSelectedGroup(null)}
                className={cn('px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all',
                  !selectedGroup ? 'bg-[#00ff87] text-black' : 'bg-[#111] text-[#555] border border-[#222] hover:text-[#888]',
                )}
              >
                ALL GROUPS
              </button>
              {GROUPS.map(g => (
                <button
                  key={g.name}
                  onClick={() => setSelectedGroup(g.name === selectedGroup ? null : g.name)}
                  className={cn('px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all',
                    selectedGroup === g.name ? 'bg-[#00ff87] text-black' : 'bg-[#111] text-[#555] border border-[#222] hover:text-[#888]',
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
                  <Calendar className="w-3.5 h-3.5 text-[#444]" />
                  <span className="text-[11px] uppercase tracking-widest text-[#555] font-bold">
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
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#00ff87]" /> KNOCKOUT STAGE
              </h2>
              {KNOCKOUT_ROUNDS.map(round => (
                <div key={round.name} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: round.color }} />
                    <span className="text-[11px] uppercase tracking-widest font-bold" style={{ color: round.color }}>{round.name}</span>
                    <span className="text-[10px] text-[#444]">· {round.startDate}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {Array.from({ length: round.matches }).map((_, i) => (
                      <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
                            <span className="text-[8px] text-[#444]">?</span>
                          </div>
                          <span className="text-xs text-[#555]">TBD</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#333]">vs</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#555]">TBD</span>
                          <div className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
                            <span className="text-[8px] text-[#444]">?</span>
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
            {GROUPS.map(g => (
              <div key={g.name} className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-[#1e1e1e] flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-[#00ff87] font-bold">GROUP {g.name}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 text-[9px] uppercase tracking-widest text-[#444] font-bold">
                  <span className="w-5 text-center">#</span>
                  <span className="flex-1">TEAM</span>
                  <span className="w-6 text-center">P</span>
                  <span className="w-6 text-center">W</span>
                  <span className="w-6 text-center">D</span>
                  <span className="w-6 text-center">L</span>
                  <span className="w-8 text-center">GD</span>
                  <span className="w-8 text-center">PTS</span>
                </div>
                {g.teams.map((code, i) => {
                  const team = TEAM_INFO[code];
                  return (
                    <Link
                      key={code}
                      to={`/worldcup/team/${code}`}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 border-t border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors',
                        i < 2 && 'border-l-2 border-l-[#00ff87]/30',
                      )}
                    >
                      <span className="w-5 text-center text-[11px] font-bold text-[#555]">{i + 1}</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Flag code={team.flag} className="w-5 h-3.5" />
                        <span className="text-xs font-semibold text-[#ccc] truncate">{team.name}</span>
                      </div>
                      <span className="w-6 text-center text-[11px] text-[#555] tabular-nums">0</span>
                      <span className="w-6 text-center text-[11px] text-[#555] tabular-nums">0</span>
                      <span className="w-6 text-center text-[11px] text-[#555] tabular-nums">0</span>
                      <span className="w-6 text-center text-[11px] text-[#555] tabular-nums">0</span>
                      <span className="w-8 text-center text-[11px] text-[#555] tabular-nums">0</span>
                      <span className="w-8 text-center text-[11px] font-bold text-white tabular-nums">0</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* ─── BRACKET TAB ───────────────────────────────────────────── */}
        {activeTab === 'bracket' && (
          <div>
            <p className="text-xs text-[#555] mb-4">The knockout bracket will be populated after the group stage concludes.</p>
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
                        className="bg-[#111] border border-[#1e1e1e] rounded-lg p-2"
                        style={{ marginBottom: `${ri * 16}px` }}
                      >
                        <div className="flex items-center gap-1.5 py-1 border-b border-[#1a1a1a]">
                          <div className="w-4 h-4 rounded-full bg-[#1a1a1a]" />
                          <span className="text-[10px] text-[#555] flex-1">TBD</span>
                          <span className="text-[10px] font-bold text-[#333]">-</span>
                        </div>
                        <div className="flex items-center gap-1.5 py-1">
                          <div className="w-4 h-4 rounded-full bg-[#1a1a1a]" />
                          <span className="text-[10px] text-[#555] flex-1">TBD</span>
                          <span className="text-[10px] font-bold text-[#333]">-</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Final venue highlight */}
            <div className="mt-6 bg-gradient-to-r from-[#00ff87]/5 to-amber-500/5 border border-[#00ff87]/20 rounded-xl p-5 text-center">
              <Trophy className="w-8 h-8 text-[#00ff87] mx-auto mb-2" />
              <h3 className="text-lg font-black text-white">THE FINAL</h3>
              <p className="text-sm text-[#888]">July 19, 2026</p>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-[#555]" />
                <span className="text-xs text-[#555]">MetLife Stadium, New Jersey</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── WC Match Card ──────────────────────────────────────────────────────────
function WCMatchCard({ match, stadium }: { match: GroupMatch; stadium: string }) {
  const home = TEAM_INFO[match.home];
  const away = TEAM_INFO[match.away];
  if (!home || !away) return null;

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden hover:border-[#2a2a2a] transition-colors">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1a1a1a]">
        <span className="text-[9px] uppercase tracking-widest text-[#00ff87] font-bold">GROUP {match.group} · MD{match.matchday}</span>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-[#333]" />
          <span className="text-[9px] text-[#444] truncate max-w-[140px]">{stadium}</span>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center px-3 py-3">
        {/* Home */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Flag code={home.flag} className="w-7 h-5 rounded-sm" />
          <Link to={`/worldcup/team/${match.home}`} className="text-sm font-semibold text-[#ccc] hover:text-white truncate transition-colors">
            {home.name}
          </Link>
        </div>

        {/* Score / VS */}
        <div className="px-4 text-center">
          <span className="text-xs font-bold text-[#333] tracking-widest">VS</span>
        </div>

        {/* Away */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
          <Link to={`/worldcup/team/${match.away}`} className="text-sm font-semibold text-[#ccc] hover:text-white truncate transition-colors text-right">
            {away.name}
          </Link>
          <Flag code={away.flag} className="w-7 h-5 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
