import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Search, Check, Loader2, ChevronRight } from 'lucide-react';

interface TeamResult {
  id: number;
  name: string;
  logo: string;
}

const POPULAR_TEAMS: TeamResult[] = [
  { id: 33, name: 'Manchester United', logo: 'https://media.api-sports.io/football/teams/33.png' },
  { id: 34, name: 'Newcastle', logo: 'https://media.api-sports.io/football/teams/34.png' },
  { id: 40, name: 'Liverpool', logo: 'https://media.api-sports.io/football/teams/40.png' },
  { id: 42, name: 'Arsenal', logo: 'https://media.api-sports.io/football/teams/42.png' },
  { id: 49, name: 'Chelsea', logo: 'https://media.api-sports.io/football/teams/49.png' },
  { id: 50, name: 'Manchester City', logo: 'https://media.api-sports.io/football/teams/50.png' },
  { id: 47, name: 'Tottenham', logo: 'https://media.api-sports.io/football/teams/47.png' },
  { id: 541, name: 'Real Madrid', logo: 'https://media.api-sports.io/football/teams/541.png' },
  { id: 529, name: 'Barcelona', logo: 'https://media.api-sports.io/football/teams/529.png' },
  { id: 157, name: 'Bayern Munich', logo: 'https://media.api-sports.io/football/teams/157.png' },
  { id: 489, name: 'AC Milan', logo: 'https://media.api-sports.io/football/teams/489.png' },
  { id: 85, name: 'PSG', logo: 'https://media.api-sports.io/football/teams/85.png' },
  { id: 496, name: 'Juventus', logo: 'https://media.api-sports.io/football/teams/496.png' },
  { id: 505, name: 'Inter Milan', logo: 'https://media.api-sports.io/football/teams/505.png' },
  { id: 165, name: 'Borussia Dortmund', logo: 'https://media.api-sports.io/football/teams/165.png' },
  { id: 530, name: 'Atlético Madrid', logo: 'https://media.api-sports.io/football/teams/530.png' },
];

export default function Onboarding() {
  const { user, onboardingCompleted, completeOnboarding, loading } = useAuth();
  const [selectedTeams, setSelectedTeams] = useState<TeamResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TeamResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const query = new URLSearchParams({ endpoint: 'teams', search: searchQuery }).toString();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/football-api?${query}`, {
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        const data = await res.json();
        const teams = (data.response || []).map((r: any) => ({
          id: r.team.id,
          name: r.team.name,
          logo: r.team.logo,
        }));
        setSearchResults(teams.slice(0, 12));
      } catch {
        toast.error('Search failed');
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (onboardingCompleted) return <Navigate to="/" replace />;

  const toggleTeam = (team: TeamResult) => {
    setSelectedTeams(prev =>
      prev.find(t => t.id === team.id)
        ? prev.filter(t => t.id !== team.id)
        : [...prev, team]
    );
  };

  const isSelected = (teamId: number) => selectedTeams.some(t => t.id === teamId);

  const handleContinue = async () => {
    setSaving(true);
    try {
      if (selectedTeams.length > 0) {
        const rows = selectedTeams.map(t => ({
          user_id: user.id,
          team_id: t.id,
          team_name: t.name,
          team_logo: t.logo,
        }));
        const { error } = await supabase.from('user_favorites').insert(rows);
        if (error) throw error;
      }
      await completeOnboarding();
      toast.success('You\'re all set! 🎉');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const displayTeams = searchQuery.trim() ? searchResults : POPULAR_TEAMS;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-center pt-10 pb-2">
        <span className="text-2xl font-extrabold tracking-tight">
          ⚽ Last<span className="text-primary">Football</span>
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 pt-4 max-w-lg mx-auto w-full">
        <h1 className="text-xl font-bold text-center mb-1">Pick your favorite teams</h1>
        <p className="text-sm text-muted-foreground text-center mb-5">
          Get updates on matches, results & upcoming fixtures
        </p>

        {/* Search */}
        <div className="relative w-full mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search for a team..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-3 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
        </div>

        {/* Selected chips */}
        {selectedTeams.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 w-full">
            {selectedTeams.map(t => (
              <button
                key={t.id}
                onClick={() => toggleTeam(t)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-xs font-medium text-primary"
              >
                <img src={t.logo} alt="" className="w-4 h-4 object-contain" />
                {t.name}
                <span className="ml-0.5 text-primary/60">×</span>
              </button>
            ))}
          </div>
        )}

        {/* Team grid */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6 overflow-y-auto max-h-[45vh]">
          {displayTeams.map(team => (
            <button
              key={team.id}
              onClick={() => toggleTeam(team)}
              className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all text-left ${
                isSelected(team.id)
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:bg-secondary'
              }`}
            >
              <img src={team.logo} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
              <span className="text-sm font-medium truncate flex-1">{team.name}</span>
              {isSelected(team.id) && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
            </button>
          ))}
          {searchQuery.trim() && displayTeams.length === 0 && !searching && (
            <p className="col-span-full text-sm text-muted-foreground text-center py-8">No teams found</p>
          )}
        </div>

        {/* Continue button */}
        <div className="w-full pb-8">
          <button
            onClick={handleContinue}
            disabled={saving}
            className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {selectedTeams.length > 0
                  ? `Continue with ${selectedTeams.length} team${selectedTeams.length > 1 ? 's' : ''}`
                  : 'Skip for now'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
