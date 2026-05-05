import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import OptimizedImage from '@/components/OptimizedImage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Calendar, MapPin, Users, Clock, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Flag from '@/components/Flag';

const WC_START = new Date('2026-06-11T19:00:00Z').getTime();
const WC_END = new Date('2026-07-19T19:00:00Z').getTime();

// All 48 World Cup 2026 teams grouped
const GROUPS: { name: string; teams: { name: string; code: string; flag: string }[] }[] = [
  { name: 'A', teams: [
    { name: 'Mexico', code: 'MEX', flag: '🇲🇽' },
    { name: 'South Korea', code: 'KOR', flag: '🇰🇷' },
    { name: 'Czechia', code: 'CZE', flag: '🇨🇿' },
    { name: 'South Africa', code: 'RSA', flag: '🇿🇦' },
  ]},
  { name: 'B', teams: [
    { name: 'Canada', code: 'CAN', flag: '🇨🇦' },
    { name: 'Australia', code: 'AUS', flag: '🇦🇺' },
    { name: 'Bosnia & Herz.', code: 'BIH', flag: '🇧🇦' },
    { name: 'Qatar', code: 'QAT', flag: '🇶🇦' },
  ]},
  { name: 'C', teams: [
    { name: 'Brazil', code: 'BRA', flag: '🇧🇷' },
    { name: 'Morocco', code: 'MAR', flag: '🇲🇦' },
    { name: 'Scotland', code: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    { name: 'Haiti', code: 'HAI', flag: '🇭🇹' },
  ]},
  { name: 'D', teams: [
    { name: 'USA', code: 'USA', flag: '🇺🇸' },
    { name: 'Turkey', code: 'TUR', flag: '🇹🇷' },
    { name: 'Paraguay', code: 'PAR', flag: '🇵🇾' },
    { name: 'Croatia', code: 'CRO', flag: '🇭🇷' },
  ]},
  { name: 'E', teams: [
    { name: 'Germany', code: 'GER', flag: '🇩🇪' },
    { name: 'Ivory Coast', code: 'CIV', flag: '🇨🇮' },
    { name: 'Curaçao', code: 'CUW', flag: '🇨🇼' },
    { name: 'Ecuador', code: 'ECU', flag: '🇪🇨' },
  ]},
  { name: 'F', teams: [
    { name: 'Netherlands', code: 'NED', flag: '🇳🇱' },
    { name: 'Japan', code: 'JPN', flag: '🇯🇵' },
    { name: 'Sweden', code: 'SWE', flag: '🇸🇪' },
    { name: 'Tunisia', code: 'TUN', flag: '🇹🇳' },
  ]},
  { name: 'G', teams: [
    { name: 'Argentina', code: 'ARG', flag: '🇦🇷' },
    { name: 'Colombia', code: 'COL', flag: '🇨🇴' },
    { name: 'Austria', code: 'AUT', flag: '🇦🇹' },
    { name: 'Uzbekistan', code: 'UZB', flag: '🇺🇿' },
  ]},
  { name: 'H', teams: [
    { name: 'Spain', code: 'ESP', flag: '🇪🇸' },
    { name: 'Saudi Arabia', code: 'KSA', flag: '🇸🇦' },
    { name: 'Cape Verde', code: 'CPV', flag: '🇨🇻' },
    { name: 'Jordan', code: 'JOR', flag: '🇯🇴' },
  ]},
  { name: 'I', teams: [
    { name: 'France', code: 'FRA', flag: '🇫🇷' },
    { name: 'Senegal', code: 'SEN', flag: '🇸🇳' },
    { name: 'Norway', code: 'NOR', flag: '🇳🇴' },
    { name: 'Iraq', code: 'IRQ', flag: '🇮🇶' },
  ]},
  { name: 'J', teams: [
    { name: 'England', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { name: 'Ghana', code: 'GHA', flag: '🇬🇭' },
    { name: 'Panama', code: 'PAN', flag: '🇵🇦' },
    { name: 'Algeria', code: 'ALG', flag: '🇩🇿' },
  ]},
  { name: 'K', teams: [
    { name: 'Portugal', code: 'POR', flag: '🇵🇹' },
    { name: 'DR Congo', code: 'COD', flag: '🇨🇩' },
    { name: 'Nigeria', code: 'NGA', flag: '🇳🇬' },
    { name: 'Switzerland', code: 'SUI', flag: '🇨🇭' },
  ]},
  { name: 'L', teams: [
    { name: 'Italy', code: 'ITA', flag: '🇮🇹' },
    { name: 'Iran', code: 'IRN', flag: '🇮🇷' },
    { name: 'Cameroon', code: 'CMR', flag: '🇨🇲' },
    { name: 'Peru', code: 'PER', flag: '🇵🇪' },
  ]},
];

const ALL_TEAMS = GROUPS.flatMap(g => g.teams);

export default function WorldCup() {
  const { user } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [countdown, setCountdown] = useState(getCountdown());
  const [enrollCount, setEnrollCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCountdown(getCountdown()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load user's enrollment
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data } = await supabase
          .from('wc_enrollments')
          .select('team_code')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) {
          setSelectedTeam(data.team_code);
          setEnrolled(true);
        }
      } catch {}
    };
    load();
  }, [user]);

  // Get total enrollment count
  useEffect(() => {
    const load = async () => {
      try {
        const { count } = await supabase
          .from('wc_enrollments')
          .select('*', { count: 'exact', head: true });
        if (count) setEnrollCount(count);
      } catch {}
    };
    load();
  }, [enrolled]);

  const handleEnroll = async () => {
    if (!user) {
      toast.error('Please sign in to pick your team!');
      return;
    }
    if (!selectedTeam) {
      toast.error('Pick a team to support!');
      return;
    }
    setEnrolling(true);
    try {
      const { error } = await supabase.from('wc_enrollments').upsert({
        user_id: user.id,
        team_code: selectedTeam,
        team_name: ALL_TEAMS.find(t => t.code === selectedTeam)?.name || selectedTeam,
      }, { onConflict: 'user_id' });
      if (error) throw error;
      setEnrolled(true);
      toast.success(`You're supporting ${ALL_TEAMS.find(t => t.code === selectedTeam)?.name}! 🎉`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  const tournamentStarted = Date.now() >= WC_START;

  return (
    <>
      <SEOHead
        title="FIFA World Cup 2026 — Groups, Fixtures, Countdown & Stadiums | LastFootball"
        description="Everything about FIFA World Cup 2026: 48 teams, 12 groups, 104 matches across USA, Canada & Mexico. Live countdown, group draw, fixtures, stadiums, and key dates. June 11 - July 19, 2026."
        path="/worldcup"
      />
      <Header />
      <main className="min-h-screen bg-background pb-20">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#1a0a2e] via-[#0d1a3a] to-[#0a2015]">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(255,215,0,0.3), transparent 50%), radial-gradient(circle at 70% 60%, rgba(74,222,128,0.2), transparent 50%)',
          }} />

          <div className="relative container max-w-5xl mx-auto px-4 py-12 sm:py-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">FIFA World Cup 2026™</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-3">
              The World's Biggest<br />
              <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">Football Tournament</span>
            </h1>

            <p className="text-sm sm:text-base text-gray-400 max-w-lg mx-auto mb-8">
              48 teams. 104 matches. 16 stadiums across USA, Canada & Mexico.
            </p>

            {/* Countdown */}
            {countdown && (
              <div className="flex items-center justify-center gap-3 sm:gap-5 mb-8">
                <CountdownUnit value={countdown.days} label="Days" />
                <span className="text-2xl text-amber-400/50 font-light">:</span>
                <CountdownUnit value={countdown.hours} label="Hours" />
                <span className="text-2xl text-amber-400/50 font-light">:</span>
                <CountdownUnit value={countdown.mins} label="Minutes" />
                <span className="text-2xl text-amber-400/50 font-light">:</span>
                <CountdownUnit value={countdown.secs} label="Seconds" />
              </div>
            )}

            {/* Quick stats */}
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-amber-400" /> June 11 – July 19</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-amber-400" /> USA · Canada · Mexico</span>
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-amber-400" /> {enrollCount} fans enrolled</span>
            </div>
          </div>
        </section>

        {/* Enrollment section */}
        <section className="container max-w-5xl mx-auto px-4 -mt-6 relative z-10">
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
            {enrolled ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
                  <Check className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">You're In!</h2>
                <p className="text-sm text-muted-foreground mb-3">
                  Supporting <span className="font-bold text-foreground inline-flex items-center gap-1.5">{selectedTeam && <Flag code={selectedTeam} size={20} />} {ALL_TEAMS.find(t => t.code === selectedTeam)?.name}</span>
                </p>
                <button
                  onClick={() => { setEnrolled(false); }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
                >
                  Change team
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-foreground text-center mb-1">
                  {user ? 'Pick Your Team' : 'Join the World Cup'}
                </h2>
                <p className="text-sm text-muted-foreground text-center mb-5">
                  {user ? 'Choose the nation you\'re supporting this summer' : 'Sign in to pick your team and make predictions'}
                </p>

                {user ? (
                  <>
                    {/* Searchable team picker */}
                    <TeamPicker
                      teams={ALL_TEAMS}
                      selected={selectedTeam}
                      onSelect={setSelectedTeam}
                    />

                    <button
                      onClick={handleEnroll}
                      disabled={!selectedTeam || enrolling}
                      className={cn(
                        'w-full h-11 rounded-xl font-bold text-sm transition-all mt-4',
                        selectedTeam
                          ? 'bg-amber-500 text-black hover:bg-amber-400 active:scale-[0.98]'
                          : 'bg-secondary text-muted-foreground cursor-not-allowed',
                      )}
                    >
                      {enrolling ? 'Enrolling...' : selectedTeam
                        ? `Support ${ALL_TEAMS.find(t => t.code === selectedTeam)?.name} 🏆`
                        : 'Select a team above'}
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <Link
                      to="/auth"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors"
                    >
                      Sign Up to Pick Your Team
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Groups */}
        <section className="container max-w-5xl mx-auto px-4 py-8">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Group Stage
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {GROUPS.map(group => (
              <div key={group.name} className="bg-card border border-border/50 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-secondary/30 border-b border-border/30">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Group {group.name}</span>
                </div>
                <div className="p-2">
                  {group.teams.map((team, i) => (
                    <Link
                      key={team.code}
                      to={`/worldcup/team/${team.code.toLowerCase()}`}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-secondary/30 transition-colors',
                        selectedTeam === team.code && 'bg-primary/5',
                      )}
                    >
                      <Flag code={team.code} size={24} />
                      <span className="text-[13px] font-medium text-foreground flex-1 hover:text-primary transition-colors">{team.name}</span>
                      {selectedTeam === team.code && (
                        <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">YOUR TEAM</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Key dates */}
        <section className="container max-w-5xl mx-auto px-4 pb-8">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            Key Dates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { date: 'June 11', event: 'Opening Match', detail: 'Mexico vs South Africa', venue: 'Estadio Azteca, Mexico City' },
              { date: 'June 28', event: 'Round of 32 Begins', detail: 'Knockout stage starts', venue: 'Multiple venues' },
              { date: 'July 9–11', event: 'Quarter-finals', detail: '8 teams remaining', venue: 'Multiple venues' },
              { date: 'July 19', event: 'The Final', detail: 'Championship match', venue: 'MetLife Stadium, New Jersey' },
            ].map(d => (
              <div key={d.event} className="bg-card border border-border/50 rounded-xl p-4">
                <div className="text-xs font-bold text-amber-400 mb-1">{d.date}</div>
                <div className="text-sm font-bold text-foreground mb-0.5">{d.event}</div>
                <div className="text-[11px] text-muted-foreground">{d.detail}</div>
                <div className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" /> {d.venue}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stadiums */}
        <section className="container max-w-5xl mx-auto px-4 pb-8">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400" />
            Host Stadiums
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { name: 'MetLife Stadium', city: 'New York/New Jersey', capacity: '82,500', country: '🇺🇸', final: true },
              { name: 'AT&T Stadium', city: 'Dallas, Texas', capacity: '80,000', country: '🇺🇸' },
              { name: 'SoFi Stadium', city: 'Los Angeles, California', capacity: '70,240', country: '🇺🇸' },
              { name: 'Hard Rock Stadium', city: 'Miami, Florida', capacity: '64,767', country: '🇺🇸' },
              { name: 'NRG Stadium', city: 'Houston, Texas', capacity: '72,220', country: '🇺🇸' },
              { name: 'Mercedes-Benz Stadium', city: 'Atlanta, Georgia', capacity: '71,000', country: '🇺🇸' },
              { name: 'Lincoln Financial Field', city: 'Philadelphia, PA', capacity: '69,176', country: '🇺🇸' },
              { name: 'Lumen Field', city: 'Seattle, Washington', capacity: '68,740', country: '🇺🇸' },
              { name: 'Gillette Stadium', city: 'Boston, Massachusetts', capacity: '65,878', country: '🇺🇸' },
              { name: 'Arrowhead Stadium', city: 'Kansas City, Missouri', capacity: '76,416', country: '🇺🇸' },
              { name: 'Levi\'s Stadium', city: 'San Francisco Bay Area', capacity: '68,500', country: '🇺🇸' },
              { name: 'Estadio Azteca', city: 'Mexico City', capacity: '87,523', country: '🇲🇽' },
              { name: 'Estadio BBVA', city: 'Monterrey', capacity: '53,500', country: '🇲🇽' },
              { name: 'Estadio Akron', city: 'Guadalajara', capacity: '49,850', country: '🇲🇽' },
              { name: 'BMO Field', city: 'Toronto', capacity: '45,736', country: '🇨🇦' },
              { name: 'BC Place', city: 'Vancouver', capacity: '54,500', country: '🇨🇦' },
            ].map(s => (
              <div key={s.name} className={cn('bg-card border rounded-xl p-3', s.final ? 'border-amber-500/30' : 'border-border/50')}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{s.name}</span>
                  {s.final && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">FINAL</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{s.country} {s.city}</p>
                <p className="text-[11px] text-muted-foreground/60">Capacity: {s.capacity}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tournament Format */}
        <section className="container max-w-5xl mx-auto px-4 pb-8">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Tournament Format
          </h2>
          <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
            <p className="text-sm text-foreground/80 leading-relaxed">
              The 2026 FIFA World Cup marks a historic expansion to <strong>48 teams</strong>, up from 32 in previous editions. The tournament will be hosted across three nations — the <strong>United States, Canada, and Mexico</strong> — making it the first World Cup held in three countries simultaneously.
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              The <strong>48 teams are drawn into 12 groups of four</strong>. The top two teams from each group, along with the <strong>8 best third-placed teams</strong>, advance to the knockout stage — a total of 32 teams qualifying for the Round of 32. From there, the tournament follows a single-elimination format through the Round of 16, Quarter-finals, Semi-finals, and the Final.
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              A total of <strong>104 matches</strong> will be played across <strong>16 stadiums</strong> in 16 host cities. The opening match will take place at Estadio Azteca in Mexico City on June 11, 2026, while the final will be held at MetLife Stadium in New Jersey on July 19, 2026.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <p className="text-xl font-black text-amber-400">48</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Teams</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <p className="text-xl font-black text-amber-400">12</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Groups</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <p className="text-xl font-black text-amber-400">104</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Matches</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <p className="text-xl font-black text-amber-400">16</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Stadiums</p>
              </div>
            </div>
          </div>
        </section>

        {/* SEO: People Also Ask */}
        <section className="container max-w-5xl mx-auto px-4 pb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">Frequently Asked Questions — World Cup 2026</h2>
          <WCFaq />
        </section>
      </main>
    </>
  );
}

// ─── Searchable Team Picker ─────────────────────────────────────────────────
function TeamPicker({
  teams, selected, onSelect,
}: {
  teams: { name: string; code: string; flag: string }[];
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = React.useRef<HTMLDivElement>(null);

  const filtered = search
    ? teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase()))
    : teams;

  const selectedTeam = teams.find(t => t.code === selected);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Selected / trigger button */}
      <button
        onClick={() => { setOpen(!open); setSearch(''); }}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left',
          open ? 'border-amber-500/50 bg-secondary/50' : 'border-border bg-secondary/30 hover:bg-secondary/50',
        )}
      >
        {selectedTeam ? (
          <>
            <Flag code={selectedTeam.code} size={28} />
            <span className="text-sm font-bold text-foreground flex-1">{selectedTeam.name}</span>
            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">Change</span>
          </>
        ) : (
          <>
            <span className="text-2xl">🌍</span>
            <span className="text-sm text-muted-foreground flex-1">Search and select your team...</span>
            <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-90')} />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-border/30">
            <input
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50"
              autoFocus
            />
          </div>

          {/* Team list */}
          <div className="max-h-[280px] overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map(team => (
                <button
                  key={team.code}
                  onClick={() => { onSelect(team.code); setOpen(false); setSearch(''); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left',
                    selected === team.code
                      ? 'bg-amber-500/10 text-foreground'
                      : 'hover:bg-secondary/50 text-foreground/80',
                  )}
                >
                  <Flag code={team.code} size={24} />
                  <span className="text-sm font-medium flex-1">{team.name}</span>
                  {selected === team.code && (
                    <Check className="w-4 h-4 text-amber-400" />
                  )}
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No teams found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
        <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider mt-1.5">{label}</span>
    </div>
  );
}

function getCountdown() {
  const diff = WC_START - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  };
}

// ─── World Cup FAQ ──────────────────────────────────────────────────────────
function WCFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const faqs = [
    {
      q: 'When does the FIFA World Cup 2026 start?',
      a: 'The FIFA World Cup 2026 kicks off on June 11, 2026, with the opening match between Mexico and South Africa at Estadio Azteca in Mexico City. The tournament runs until July 19, 2026, when the final will be held at MetLife Stadium in New Jersey, USA.',
    },
    {
      q: 'How many teams are in the World Cup 2026?',
      a: 'The 2026 World Cup features 48 teams, an expansion from 32 in previous tournaments. The 48 teams are divided into 12 groups of four, with the top two from each group and the 8 best third-placed teams advancing to the Round of 32.',
    },
    {
      q: 'Where is the World Cup 2026 being held?',
      a: 'The 2026 FIFA World Cup is being co-hosted by three countries: the United States (11 venues), Mexico (3 venues), and Canada (2 venues). This makes it the first World Cup held across three nations. Host cities include New York, Los Angeles, Miami, Dallas, Houston, Atlanta, Seattle, Boston, Philadelphia, Kansas City, San Francisco, Mexico City, Monterrey, Guadalajara, Toronto, and Vancouver.',
    },
    {
      q: 'Where is the World Cup 2026 final?',
      a: 'The 2026 World Cup Final will be held at MetLife Stadium in East Rutherford, New Jersey (New York metropolitan area) on July 19, 2026. MetLife Stadium has a capacity of approximately 82,500 for the World Cup configuration.',
    },
    {
      q: 'What is the format of the World Cup 2026?',
      a: 'The 48 teams are drawn into 12 groups of four. Each team plays three group stage matches. The top two from each group plus the 8 best third-placed teams (32 total) advance to a knockout round starting with the Round of 32, followed by Round of 16, Quarter-finals, Semi-finals, Third-place playoff, and the Final. A total of 104 matches will be played.',
    },
    {
      q: 'Which countries qualified for the World Cup 2026?',
      a: 'The 48 qualified teams include: Argentina, Brazil, France, England, Germany, Spain, Portugal, Netherlands, Italy, Belgium, Croatia, USA, Canada, Mexico, Japan, South Korea, Australia, Morocco, Senegal, Nigeria, Ghana, Cameroon, and many more. The hosts USA, Canada, and Mexico qualified automatically.',
    },
    {
      q: 'How many matches will be played in the World Cup 2026?',
      a: 'A total of 104 matches will be played during the 2026 FIFA World Cup — 48 group stage matches per matchday across the group stage, plus 32 knockout matches from the Round of 32 to the Final. This is a significant increase from the 64 matches in the 32-team format.',
    },
  ];

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden divide-y divide-border/10">
      {faqs.map((faq, i) => (
        <button
          key={i}
          onClick={() => setOpenIdx(openIdx === i ? null : i)}
          className="w-full text-left px-4 py-3.5 hover:bg-secondary/20 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">{faq.q}</span>
            <ChevronRight className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform', openIdx === i && 'rotate-90')} />
          </div>
          {openIdx === i && (
            <p className="text-sm text-foreground/75 leading-relaxed mt-2.5 pr-6">{faq.a}</p>
          )}
        </button>
      ))}
    </div>
  );
}
