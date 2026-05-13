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
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<Map<number, Prediction>>(new Map());
  const [existingPredictions, setExistingPredictions] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [activeDay, setActiveDay] = useState<'today' | 'tomorrow'>('today');

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

        {/* My Predictions History */}
        {user && <MyPredictions userId={user.id} />}

        {/* Full Leaderboard */}
        <FullLeaderboard userId={user?.id} />

        {/* Rules */}
        <div className="mt-4 bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold text-foreground mb-3">Monthly Winner Rules</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>• Predict at least <strong className="text-foreground">10 matches</strong> in a month to qualify</p>
            <p>• Reach <strong className="text-amber-400">30 points</strong> to win the grand prize of NPR 30,000</p>
            <p>• If no one reaches 30 points, the highest scorer wins</p>
            <p>• Ties are decided by lucky draw on our Facebook page</p>
            <p>• Must follow our official social media pages to be eligible</p>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Full Leaderboard Component ─────────────────────────────────────────────
function FullLeaderboard({ userId }: { userId?: string }) {
  const [entries, setEntries] = useState<{ user_id: string; username: string; total_points: number; total_predictions: number; scored_predictions: number; pending_predictions: number; correct_scores: number; correct_winners: number; wrong_predictions: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const API = import.meta.env.VITE_API_URL || '/api';
        const res = await fetch(`${API}/leaderboard`);
        const data = await res.json();
        if (data?.leaderboard) {
          setEntries(data.leaderboard);
        }
      } catch (err) {
        console.error('Leaderboard fetch error:', err);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  const accuracy = (e: typeof entries[0]) =>
    e.total_predictions > 0 ? Math.round(((e.correct_scores + (e.total_points > 0 ? 1 : 0)) / e.total_predictions) * 100) : 0;

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserPreds, setSelectedUserPreds] = useState<any[]>([]);
  const [loadingUser, setLoadingUser] = useState(false);

  const viewUserPredictions = async (uid: string, username: string) => {
    if (selectedUser === uid) { setSelectedUser(null); return; }
    setSelectedUser(uid);
    setLoadingUser(true);
    const { data } = await supabase.from('predictions').select('*').eq('user_id', uid).order('predicted_at', { ascending: false });
    setSelectedUserPreds(data || []);
    setLoadingUser(false);
  };

  const myEntry = userId ? entries.find(e => e.user_id === userId) : null;
  const myRank = userId ? entries.findIndex(e => e.user_id === userId) + 1 : 0;

  return (
    <div className="mt-6 space-y-4">
      {/* My stats */}
      {myEntry && (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Your Stats — Rank #{myRank}</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <div className="text-center">
              <p className="text-lg font-black text-primary tabular-nums">{myEntry.total_points}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Points</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-foreground tabular-nums">{myEntry.total_predictions}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Predictions</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-emerald-400 tabular-nums">{myEntry.correct_scores}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Exact</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-amber-400 tabular-nums">{myEntry.pending_predictions}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Pending</p>
            </div>
            <div className="text-center">
              <p className={cn('text-lg font-black tabular-nums', myEntry.total_predictions >= 10 ? 'text-emerald-400' : 'text-amber-400')}>{myEntry.total_predictions >= 10 ? '✓' : `${myEntry.total_predictions}/10`}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Eligible</p>
            </div>
          </div>
          {myEntry.total_points >= 30 && (
            <div className="mt-3 bg-amber-500/20 border border-amber-500/30 rounded-lg p-2 text-center">
              <p className="text-xs font-bold text-amber-400">🎉 30 points reached! Contact us to claim NPR 30,000!</p>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-foreground">Leaderboard</h3>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30 text-[10px] text-muted-foreground uppercase font-bold">
          <span className="w-7 text-center">#</span>
          <span className="flex-1">Predictor</span>
          <span className="w-12 text-center">Pts</span>
          <span className="w-10 text-center">Preds</span>
          <span className="w-10 text-center">Exact</span>
          <span className="w-14 text-center text-[9px]">Status</span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No predictions yet. Be the first!</p>
          </div>
        ) : (
          entries.map((entry, i) => {
            const rank = i + 1;
            const isMe = userId === entry.user_id;
            const eligible = entry.total_predictions >= 10;
            const isSelected = selectedUser === entry.user_id;

            return (
              <div key={entry.user_id}>
                <button
                  onClick={() => viewUserPredictions(entry.user_id, entry.username)}
                  className={cn('w-full flex items-center gap-2 px-4 py-2.5 border-b border-border/10 hover:bg-secondary/20 transition-colors text-left', isMe && 'bg-primary/5', isSelected && 'bg-secondary/30')}
                >
                  <span className={cn('w-7 text-center font-black text-xs tabular-nums',
                    rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-orange-400' : 'text-muted-foreground',
                  )}>
                    {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                  </span>
                  <span className={cn('flex-1 text-sm font-semibold truncate', isMe ? 'text-primary' : 'text-foreground')}>
                    {isMe ? 'You' : entry.username} {isSelected ? '▾' : '▸'}
                  </span>
                  <span className={cn('w-12 text-center text-sm font-black tabular-nums',
                    entry.total_points >= 30 ? 'text-amber-400' : entry.total_points > 0 ? 'text-primary' : 'text-muted-foreground',
                  )}>
                    {entry.total_points}
                  </span>
                  <span className="w-10 text-center text-xs text-foreground font-semibold tabular-nums">{entry.total_predictions}</span>
                  <span className="w-10 text-center text-xs text-emerald-400 font-semibold tabular-nums">{entry.correct_scores}</span>
                  <span className={cn('w-14 text-center text-[9px] font-bold rounded-full px-1 py-0.5',
                    eligible ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400',
                  )}>
                    {eligible ? '✓ Qual' : `${entry.total_predictions}/10`}
                  </span>
                </button>
                {/* Expanded user predictions */}
                {isSelected && (
                  <div className="bg-secondary/10 border-b border-border/20">
                    {loadingUser ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                    ) : selectedUserPreds.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No predictions found</p>
                    ) : (
                      selectedUserPreds.filter(p => p.points !== null).map(pred => (
                        <Link key={pred.id} to={`/match/${pred.match_id}`} className="flex items-center gap-2 px-6 py-2 hover:bg-secondary/20 transition-colors border-b border-border/5 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{pred.home_team} vs {pred.away_team}</p>
                            <p className="text-[10px] text-muted-foreground">{pred.match_date}</p>
                          </div>
                          <span className="text-xs font-bold text-foreground tabular-nums">{pred.home_score}-{pred.away_score}</span>
                          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                            (pred.points || 0) >= 4 ? 'bg-emerald-500/10 text-emerald-400' : (pred.points || 0) > 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400',
                          )}>
                            {(pred.points || 0) > 0 ? '+' : ''}{pred.points}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── My Predictions Wallet ──────────────────────────────────────────────────
function MyPredictions({ userId }: { userId: string }) {
  const [preds, setPreds] = useState<{
    id: string; match_id: number; home_score: number; away_score: number;
    home_team: string; away_team: string; league_name: string; match_date: string;
    points: number | null; predicted_at: string; scored_at: string | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'scored' | 'pending' | 'ledger'>('all');

  useEffect(() => {
    const loadAndScore = async () => {
      const { data } = await supabase.from('predictions').select('*').eq('user_id', userId).order('predicted_at', { ascending: false }).limit(100);
      if (!data) { setLoading(false); return; }

      const unscored = data.filter(p => p.points === null);
      if (unscored.length > 0) {
        const { callApi } = await import('@/services/footballApi');
        for (const pred of unscored) {
          try {
            const fixtures = await callApi('fixtures', { id: String(pred.match_id) });
            if (!fixtures?.length) continue;
            const f = fixtures[0];
            const status = f.fixture?.status?.short;
            if (!['FT', 'AET', 'PEN'].includes(status)) continue;
            const actualHome = f.goals?.home;
            const actualAway = f.goals?.away;
            if (actualHome === null || actualAway === null) continue;
            let points = 0;
            if (pred.home_score === actualHome && pred.away_score === actualAway) points = 4;
            else if ((pred.home_score > pred.away_score && actualHome > actualAway) || (pred.home_score < pred.away_score && actualHome < actualAway) || (pred.home_score === pred.away_score && actualHome === actualAway)) points = 1;
            else points = -2;
            await supabase.from('predictions').update({ points, scored_at: new Date().toISOString() }).eq('id', pred.id);
            pred.points = points;
            pred.scored_at = new Date().toISOString();
          } catch {}
        }
      }
      setPreds(data);
      setLoading(false);
    };
    loadAndScore();
  }, [userId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  if (preds.length === 0) return null;

  const scored = preds.filter(p => p.points !== null);
  const pending = preds.filter(p => p.points === null);
  const totalPoints = scored.reduce((sum, p) => sum + (p.points || 0), 0);
  const exactScores = scored.filter(p => p.points === 4).length;
  const correctWinners = scored.filter(p => p.points === 1).length;
  const wrongPreds = scored.filter(p => (p.points || 0) < 0).length;

  // Points ledger — running balance
  const ledger = scored.sort((a, b) => new Date(a.scored_at || a.predicted_at).getTime() - new Date(b.scored_at || b.predicted_at).getTime());
  let runningBalance = 0;
  const ledgerEntries = ledger.map(p => {
    runningBalance += p.points || 0;
    return { ...p, balance: runningBalance };
  }).reverse();

  const filtered = activeTab === 'scored' ? scored : activeTab === 'pending' ? pending : activeTab === 'ledger' ? ledgerEntries : preds;

  return (
    <div className="mt-6">
      {/* Wallet header */}
      <div className="bg-gradient-to-r from-primary/5 via-emerald-500/5 to-amber-500/5 border border-primary/20 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-primary/20"><Target className="w-4 h-4 text-primary" /></div>
          <h3 className="text-sm font-bold text-foreground">My Prediction Wallet</h3>
        </div>

        {/* Balance card */}
        <div className="bg-background/50 rounded-xl p-4 mb-3 text-center">
          <p className="text-3xl font-black text-primary tabular-nums">{totalPoints}</p>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Points{totalPoints >= 30 ? ' 🏆' : ` / 30 Goal`}</p>
          {/* Progress bar to 30 */}
          <div className="w-full h-2 bg-secondary rounded-full mt-2 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all" style={{ width: `${Math.min(100, (totalPoints / 30) * 100)}%` }} />
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">{Math.max(0, 30 - totalPoints)} points to NPR 30,000 reward</p>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          <div className="text-center bg-background/30 rounded-lg p-2">
            <p className="text-sm font-black text-foreground tabular-nums">{preds.length}</p>
            <p className="text-[8px] text-muted-foreground uppercase">Total</p>
          </div>
          <div className="text-center bg-background/30 rounded-lg p-2">
            <p className="text-sm font-black text-emerald-400 tabular-nums">{exactScores}</p>
            <p className="text-[8px] text-muted-foreground uppercase">Exact</p>
          </div>
          <div className="text-center bg-background/30 rounded-lg p-2">
            <p className="text-sm font-black text-blue-400 tabular-nums">{correctWinners}</p>
            <p className="text-[8px] text-muted-foreground uppercase">Winner</p>
          </div>
          <div className="text-center bg-background/30 rounded-lg p-2">
            <p className="text-sm font-black text-red-400 tabular-nums">{wrongPreds}</p>
            <p className="text-[8px] text-muted-foreground uppercase">Wrong</p>
          </div>
          <div className="text-center bg-background/30 rounded-lg p-2">
            <p className="text-sm font-black text-amber-400 tabular-nums">{pending.length}</p>
            <p className="text-[8px] text-muted-foreground uppercase">Pending</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {([
          { key: 'all', label: `All (${preds.length})` },
          { key: 'scored', label: `Scored (${scored.length})` },
          { key: 'pending', label: `Pending (${pending.length})` },
          { key: 'ledger', label: '📊 Ledger' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
              activeTab === tab.key ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'text-muted-foreground hover:bg-secondary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Prediction list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {activeTab === 'ledger' ? (
          // Points Ledger view
          <>
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30 text-[10px] text-muted-foreground uppercase font-bold">
              <span className="flex-1">Match</span>
              <span className="w-14 text-center">Points</span>
              <span className="w-14 text-center">Balance</span>
            </div>
            {ledgerEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No scored predictions yet</p>
            ) : (
              ledgerEntries.map(pred => (
                <Link key={pred.id} to={`/match/${pred.match_id}`} className="flex items-center gap-2 px-4 py-2.5 border-b border-border/10 last:border-0 hover:bg-secondary/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{pred.home_team} vs {pred.away_team}</p>
                    <p className="text-[10px] text-muted-foreground">{pred.match_date} · You: {pred.home_score}-{pred.away_score}</p>
                  </div>
                  <span className={cn('w-14 text-center text-xs font-black tabular-nums',
                    (pred.points || 0) >= 4 ? 'text-emerald-400' : (pred.points || 0) > 0 ? 'text-blue-400' : 'text-red-400',
                  )}>
                    {(pred.points || 0) > 0 ? '+' : ''}{pred.points}
                  </span>
                  <span className={cn('w-14 text-center text-xs font-black tabular-nums',
                    pred.balance > 0 ? 'text-primary' : pred.balance < 0 ? 'text-red-400' : 'text-muted-foreground',
                  )}>
                    {pred.balance}
                  </span>
                </Link>
              ))
            )}
          </>
        ) : (
          // Normal prediction list
          <>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No predictions in this category</p>
            ) : (
              filtered.map(pred => (
                <Link key={pred.id} to={`/match/${pred.match_id}`} className="flex items-center gap-3 px-4 py-3 border-b border-border/10 last:border-0 hover:bg-secondary/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{pred.home_team} vs {pred.away_team}</p>
                    <p className="text-[11px] text-muted-foreground">{pred.league_name} · {pred.match_date}</p>
                  </div>
                  <div className="text-center min-w-[60px]">
                    <p className="text-sm font-black text-foreground tabular-nums">{pred.home_score} - {pred.away_score}</p>
                    <p className="text-[9px] text-muted-foreground">Your pick</p>
                  </div>
                  <div className="min-w-[55px] text-center">
                    {pred.points === null ? (
                      <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">⏳ Pending</span>
                    ) : pred.points >= 4 ? (
                      <div>
                        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">+{pred.points} 🎯</span>
                        <p className="text-[8px] text-emerald-400 mt-0.5">Exact Score!</p>
                      </div>
                    ) : pred.points > 0 ? (
                      <div>
                        <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">+{pred.points}</span>
                        <p className="text-[8px] text-blue-400 mt-0.5">Correct Winner</p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-[10px] font-bold bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">{pred.points}</span>
                        <p className="text-[8px] text-red-400 mt-0.5">Wrong</p>
                      </div>
                    )}
                  </div>
                </Link>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
