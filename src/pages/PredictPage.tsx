import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import OptimizedImage from '@/components/OptimizedImage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { fetchMatchesByDate, getToday, getTomorrow, Match } from '@/services/footballApi';
import { Trophy, Target, Lock, Loader2, ChevronRight, TrendingUp, Award, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Supported league IDs for predictions
const SUPPORTED_LEAGUES = [39, 140, 135, 78, 61, 2, 3, 848, 88, 94, 307, 45, 48, 143, 137, 253];

interface Prediction {
  match_id: number;
  home_score: number;
  away_score: number;
}

export default function PredictPage() {
  const { user, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<Map<number, Prediction>>(new Map());
  const [existingPredictions, setExistingPredictions] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [activeDay, setActiveDay] = useState<'today' | 'tomorrow'>('today');
  const [leaderboard, setLeaderboard] = useState<{ username: string; total_points: number; total_predictions: number }[]>([]);

  // Fetch matches
  useEffect(() => {
    const date = activeDay === 'today' ? getToday() : getTomorrow();
    setLoading(true);
    fetchMatchesByDate(date).then(data => {
      const supported = data.filter(m =>
        SUPPORTED_LEAGUES.includes(m.league.id) && (m.status === 'NS' || m.status === 'TBD')
      );
      setMatches(supported);
      setLoading(false);
    });
  }, [activeDay]);

  // Load user's existing predictions
  useEffect(() => {
    if (!user) return;
    const loadPredictions = async () => {
      const matchIds = matches.map(m => m.id);
      if (matchIds.length === 0) return;
      const { data } = await supabase
        .from('predictions')
        .select('match_id, home_score, away_score')
        .eq('user_id', user.id)
        .in('match_id', matchIds);
      if (data) {
        const existing = new Set<number>();
        data.forEach(p => existing.add(p.match_id));
        setExistingPredictions(existing);
      }
    };
    loadPredictions();
  }, [user, matches]);

  // Load leaderboard
  useEffect(() => {
    supabase
      .from('prediction_leaderboard')
      .select('username, total_points, total_predictions')
      .order('total_points', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setLeaderboard(data);
      });
  }, []);

  const updatePrediction = (matchId: number, field: 'home_score' | 'away_score', value: number) => {
    const current = predictions.get(matchId) || { match_id: matchId, home_score: 0, away_score: 0 };
    setPredictions(new Map(predictions.set(matchId, { ...current, [field]: Math.max(0, Math.min(15, value)) })));
  };

  const submitPrediction = async (match: Match) => {
    if (!user) return toast.error('Please sign in to predict');
    const pred = predictions.get(match.id);
    if (!pred) return toast.error('Enter your prediction first');

    setSubmitting(match.id);
    try {
      const { error } = await supabase.from('predictions').upsert({
        user_id: user.id,
        match_id: match.id,
        home_score: pred.home_score,
        away_score: pred.away_score,
        home_team: match.homeTeam.name,
        away_team: match.awayTeam.name,
        league_name: match.league.name,
        match_date: match.date,
      });
      if (error) throw error;
      setExistingPredictions(new Set([...existingPredictions, match.id]));
      toast.success(`Prediction saved: ${match.homeTeam.name} ${pred.home_score} - ${pred.away_score} ${match.awayTeam.name}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save prediction');
    }
    setSubmitting(null);
  };

  if (authLoading) {
    return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Predict & Win — Football Score Predictions | LastFootball"
        description="Predict football match scores and win rewards. Earn points for correct predictions. NPR 30,000 grand prize for 30 points."
        path="/predict"
      />
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-emerald-500/10 border-b border-amber-500/20">
        <div className="container max-w-4xl py-6 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-bold mb-3">
            <Trophy className="w-3.5 h-3.5" /> PREDICT & WIN
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground mb-2">
            Predict Scores. Earn Points. <span className="text-amber-400">Win Rewards.</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Predict match scores before kickoff. Earn +3 for exact scores, +1 for correct winners. Reach 30 points to win <span className="text-amber-400 font-bold">NPR 30,000</span>!
          </p>
        </div>
      </section>

      {/* How it works */}
      <div className="container max-w-4xl px-4 py-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <Target className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-[10px] font-bold text-foreground">Predict</p>
            <p className="text-[9px] text-muted-foreground">Enter scores before kickoff</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-[10px] font-bold text-foreground">Earn Points</p>
            <p className="text-[9px] text-muted-foreground">+3 exact, +1 winner</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <Award className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-[10px] font-bold text-foreground">Win Rewards</p>
            <p className="text-[9px] text-muted-foreground">30 pts = NPR 30,000</p>
          </div>
        </div>
      </div>

      {/* Points table */}
      <div className="container max-w-4xl px-4 pb-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-bold text-foreground mb-2">Points System</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Correct exact score</span><span className="text-emerald-400 font-bold">+3</span></div>
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Correct winner</span><span className="text-emerald-400 font-bold">+1</span></div>
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Wrong winner</span><span className="text-red-400 font-bold">-1</span></div>
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Wrong score</span><span className="text-red-400 font-bold">-1</span></div>
          </div>
        </div>
      </div>

      {/* Day tabs */}
      <div className="container max-w-4xl px-4 pb-3">
        <div className="flex gap-2">
          {(['today', 'tomorrow'] as const).map(day => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-semibold capitalize transition-all',
                activeDay === day ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'text-muted-foreground hover:bg-secondary',
              )}
            >
              {day === 'today' ? "Today's Matches" : "Tomorrow's Matches"}
            </button>
          ))}
        </div>
      </div>

      {/* Sign in prompt */}
      {!user && (
        <div className="container max-w-4xl px-4 pb-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
            <Lock className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-foreground mb-1">Sign in to predict</p>
            <p className="text-xs text-muted-foreground mb-3">Create a free account to start earning points</p>
            <Link to="/auth" className="px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold hover:opacity-90 transition-opacity">
              Sign In / Sign Up
            </Link>
          </div>
        </div>
      )}

      {/* Matches */}
      <main className="container max-w-4xl px-4 pb-20 md:pb-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : matches.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No upcoming matches available for prediction</p>
        ) : (
          <div className="space-y-3">
            {matches.map(match => {
              const pred = predictions.get(match.id);
              const alreadyPredicted = existingPredictions.has(match.id);
              const isLocked = alreadyPredicted;

              return (
                <div key={match.id} className={cn('bg-card border rounded-xl overflow-hidden', alreadyPredicted ? 'border-emerald-500/30' : 'border-border')}>
                  {/* League + time */}
                  <div className="flex items-center justify-between px-4 py-2 bg-secondary/20">
                    <div className="flex items-center gap-2">
                      {match.league.logo && <OptimizedImage src={match.league.logo} alt="" className="w-4 h-4 object-contain" />}
                      <span className="text-[11px] text-muted-foreground font-medium">{match.league.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {match.time}
                    </div>
                  </div>

                  {/* Teams + prediction inputs */}
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Home */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <OptimizedImage src={match.homeTeam.logo} alt="" className="w-7 h-7 object-contain flex-shrink-0" />
                        <span className="text-sm font-semibold text-foreground truncate">{match.homeTeam.name}</span>
                      </div>

                      {/* Score inputs */}
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={15}
                          value={pred?.home_score ?? ''}
                          onChange={e => updatePrediction(match.id, 'home_score', parseInt(e.target.value) || 0)}
                          disabled={!user || isLocked}
                          placeholder="-"
                          className="w-10 h-10 rounded-lg bg-secondary/50 border border-border text-center text-lg font-black text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
                        />
                        <span className="text-muted-foreground font-bold">:</span>
                        <input
                          type="number"
                          min={0}
                          max={15}
                          value={pred?.away_score ?? ''}
                          onChange={e => updatePrediction(match.id, 'away_score', parseInt(e.target.value) || 0)}
                          disabled={!user || isLocked}
                          placeholder="-"
                          className="w-10 h-10 rounded-lg bg-secondary/50 border border-border text-center text-lg font-black text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
                        />
                      </div>

                      {/* Away */}
                      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                        <span className="text-sm font-semibold text-foreground truncate">{match.awayTeam.name}</span>
                        <OptimizedImage src={match.awayTeam.logo} alt="" className="w-7 h-7 object-contain flex-shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Submit / status */}
                  <div className="px-4 pb-3">
                    {alreadyPredicted ? (
                      <div className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                        <Lock className="w-3 h-3" /> Prediction Locked ✓
                      </div>
                    ) : user ? (
                      <button
                        onClick={() => submitPrediction(match)}
                        disabled={!pred || submitting === match.id}
                        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-1.5"
                      >
                        {submitting === match.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Target className="w-3.5 h-3.5" />}
                        Submit Prediction
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mini leaderboard */}
        {leaderboard.length > 0 && (
          <div className="mt-6 bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-foreground">Top Predictors</h3>
            </div>
            {leaderboard.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/10 last:border-0">
                <span className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black',
                  i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-gray-400/20 text-gray-400' : 'bg-orange-500/20 text-orange-400',
                )}>
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-foreground flex-1">{entry.username}</span>
                <span className="text-sm font-black text-primary tabular-nums">{entry.total_points} pts</span>
                <span className="text-[10px] text-muted-foreground">{entry.total_predictions} predictions</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
