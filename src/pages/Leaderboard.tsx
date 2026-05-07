import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Target, TrendingUp, Medal, Flame, User, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_points: number;
  total_predictions: number;
  correct_scores: number;
  correct_winners: number;
  current_streak: number;
  best_streak: number;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myStats, setMyStats] = useState<LeaderboardEntry | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('prediction_leaderboard')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(50);
      if (data) {
        setEntries(data);
        if (user) {
          const idx = data.findIndex(e => e.user_id === user.id);
          if (idx >= 0) {
            setMyStats(data[idx]);
            setMyRank(idx + 1);
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const accuracy = (entry: LeaderboardEntry) =>
    entry.total_predictions > 0
      ? Math.round((entry.correct_winners / entry.total_predictions) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Prediction Leaderboard — LastFootball"
        description="See who's leading the football prediction competition. Top predictors, accuracy stats, and winning streaks."
        path="/leaderboard"
      />
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-emerald-500/10 border-b border-amber-500/20">
        <div className="container max-w-4xl py-6 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-bold mb-3">
            <Trophy className="w-3.5 h-3.5" /> LEADERBOARD
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">Top Predictors</h1>
          <p className="text-sm text-muted-foreground mt-1">Reach 30 points to win <span className="text-amber-400 font-bold">NPR 30,000</span></p>
        </div>
      </section>

      <main className="container max-w-4xl py-5 pb-20 md:pb-6 space-y-5">
        {/* My stats card */}
        {myStats && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-primary/20">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Your Stats</p>
                <p className="text-xs text-muted-foreground">Rank #{myRank}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <p className="text-lg font-black text-primary tabular-nums">{myStats.total_points}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Points</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-foreground tabular-nums">{myStats.total_predictions}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Predictions</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-emerald-400 tabular-nums">{myStats.correct_scores}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Exact Scores</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-amber-400 tabular-nums">{accuracy(myStats)}%</p>
                <p className="text-[9px] text-muted-foreground uppercase">Accuracy</p>
              </div>
            </div>
            {myStats.total_points >= 30 && (
              <div className="mt-3 bg-amber-500/20 border border-amber-500/30 rounded-lg p-3 text-center">
                <p className="text-sm font-bold text-amber-400">🎉 You've reached 30 points! Contact us to claim your NPR 30,000 reward!</p>
              </div>
            )}
            {myStats.current_streak >= 3 && (
              <div className="mt-2 flex items-center gap-1.5 justify-center">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-orange-400">{myStats.current_streak} match winning streak!</span>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" /> Global Rankings
            </h2>
            <Link to="/predict" className="text-xs text-primary font-semibold hover:underline">Make Predictions →</Link>
          </div>

          {/* Table header */}
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30 text-[10px] text-muted-foreground uppercase font-bold">
            <span className="w-8 text-center">#</span>
            <span className="flex-1">Predictor</span>
            <span className="w-14 text-center">Points</span>
            <span className="w-14 text-center hidden sm:block">Preds</span>
            <span className="w-14 text-center">Exact</span>
            <span className="w-14 text-center">Acc %</span>
            <span className="w-14 text-center hidden sm:block">Streak</span>
            <span className="w-16 text-center text-[9px]">Eligible</span>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No predictions yet. Be the first!</p>
              <Link to="/predict" className="text-xs text-primary font-bold mt-2 inline-block">Start Predicting →</Link>
            </div>
          ) : (
            entries.map((entry, i) => {
              const rank = i + 1;
              const isMe = user?.id === entry.user_id;
              const eligible = entry.total_predictions >= 10;

              return (
                <div
                  key={entry.user_id}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 border-b border-border/10 last:border-0 transition-colors',
                    isMe && 'bg-primary/5',
                  )}
                >
                  {/* Rank */}
                  <span className={cn(
                    'w-8 text-center font-black text-sm tabular-nums',
                    rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-orange-400' : 'text-muted-foreground',
                  )}>
                    {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                  </span>

                  {/* Username */}
                  <div className="flex-1 min-w-0">
                    <span className={cn('text-sm font-semibold truncate', isMe ? 'text-primary' : 'text-foreground')}>
                      {entry.username} {isMe && '(You)'}
                    </span>
                  </div>

                  {/* Points */}
                  <span className={cn(
                    'w-14 text-center text-sm font-black tabular-nums',
                    entry.total_points >= 30 ? 'text-amber-400' : entry.total_points > 0 ? 'text-primary' : 'text-muted-foreground',
                  )}>
                    {entry.total_points}
                  </span>

                  {/* Predictions count */}
                  <span className="w-14 text-center text-xs text-muted-foreground tabular-nums hidden sm:block">
                    {entry.total_predictions}
                  </span>

                  {/* Exact scores */}
                  <span className="w-14 text-center text-xs text-emerald-400 font-semibold tabular-nums">
                    {entry.correct_scores}
                  </span>

                  {/* Accuracy */}
                  <span className="w-14 text-center text-xs text-foreground font-semibold tabular-nums">
                    {accuracy(entry)}%
                  </span>

                  {/* Streak */}
                  <span className="w-14 text-center text-xs tabular-nums hidden sm:flex items-center justify-center gap-0.5">
                    {entry.current_streak >= 3 && <Flame className="w-3 h-3 text-orange-400" />}
                    <span className={entry.current_streak >= 3 ? 'text-orange-400 font-bold' : 'text-muted-foreground'}>
                      {entry.current_streak}
                    </span>
                  </span>

                  {/* Eligibility */}
                  <span className={cn(
                    'w-16 text-center text-[9px] font-bold rounded-full px-1.5 py-0.5',
                    eligible ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
                  )}>
                    {eligible ? 'Qualified' : `${entry.total_predictions}/10`}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Rules */}
        <div className="bg-card border border-border rounded-xl p-5">
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
