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
        title="FIFA World Cup 2026 — LastFootball"
        description="Follow the FIFA World Cup 2026 on LastFootball. Live scores, groups, fixtures, and predictions."
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
                  Supporting <span className="font-bold text-foreground">{ALL_TEAMS.find(t => t.code === selectedTeam)?.flag} {ALL_TEAMS.find(t => t.code === selectedTeam)?.name}</span>
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
                    <div
                      key={team.code}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-2 rounded-lg',
                        selectedTeam === team.code && 'bg-primary/5',
                      )}
                    >
                      <span className="text-lg">{team.flag}</span>
                      <span className="text-[13px] font-medium text-foreground flex-1">{team.name}</span>
                      {selectedTeam === team.code && (
                        <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">YOUR TEAM</span>
                      )}
                    </div>
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
            <span className="text-2xl">{selectedTeam.flag}</span>
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
                  <span className="text-xl">{team.flag}</span>
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
