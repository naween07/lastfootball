import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Target, TrendingUp, Medal, Flame, User, Crown, Pencil, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('prediction_stats')
      .select('*')
      .order('total_points', { ascending: false })
      .limit(50);
    if (data) {
      // view doesn't have streak columns; default them
      const normalized = data.map((d: any) => ({
        ...d,
        current_streak: d.current_streak ?? 0,
        best_streak: d.best_streak ?? 0,
      }));
      setEntries(normalized);
      if (user) {
        const idx = normalized.findIndex((e: LeaderboardEntry) => e.user_id === user.id);
        if (idx >= 0) {
          setMyStats(normalized[idx]);
          setMyRank(idx + 1);
          setNameInput(normalized[idx].username || '');
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const saveName = async () => {
    const name = nameInput.trim();
    if (name.length < 2) return toast.error('Name must be at least 2 characters');
    if (name.length > 24) return toast.error('Name must be 24 characters or less');
    if (!user) return;
    setSavingName(true);
    try {
      let accessToken = '';
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
          const v = JSON.parse(localStorage.getItem(k) || '{}');
          accessToken = v?.access_token || (Array.isArray(v) ? v[0] : '') || '';
          if (accessToken) break;
        }
      }
      if (!accessToken) { toast.error('Please sign in again'); setSavingName(false); return; }
      const BASE = import.meta.env.VITE_SUPABASE_URL;
      const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${BASE}/rest/v1/profiles?user_id=eq.${user.id}`, {
        method: 'PATCH',
        headers: { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ display_name: name, username_set: true }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        toast.error('Failed: ' + (t.substring(0, 100) || res.statusText));
      } else {
        toast.success('Name updated!');
        setEditingName(false);
        load();
      }
    } catch (e: any) {
      toast.error(e?.message || 'Error');
    }
    setSavingName(false);
  };

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
          <p className="text-sm text-muted-foreground mt-1">Score <span className="text-amber-400 font-bold">100+ points</span> for NPR 30,000 · Champion wins <span className="text-amber-400 font-bold">NPR 50,000</span></p>
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
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Your Stats</p>
                <p className="text-xs text-muted-foreground">Rank #{myRank}</p>
              </div>
              {!editingName ? (
                <button onClick={() => setEditingName(true)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Pencil className="w-3 h-3" /> {myStats.username}
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={24}
                    placeholder="Your name"
                    className="w-28 px-2 py-1 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                  <button onClick={saveName} disabled={savingName} className="p-1.5 rounded-md bg-primary text-primary-foreground">
                    {savingName ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  </button>
                </div>
              )}
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
            {myStats.total_points >= 100 && (
              <div className="mt-3 bg-amber-500/20 border border-amber-500/30 rounded-lg p-3 text-center">
                <p className="text-sm font-bold text-amber-400">🎉 You've passed 100 points! Contact us to claim your NPR 30,000 reward!</p>
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
                  <span className={cn(
                    'w-8 text-center font-black text-sm tabular-nums',
                    rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-orange-400' : 'text-muted-foreground',
                  )}>
                    {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                  </span>

                  <div className="flex-1 min-w-0">
                    <span className={cn('text-sm font-semibold truncate', isMe ? 'text-primary' : 'text-foreground')}>
                      {entry.username} {isMe && '(You)'}
                    </span>
                  </div>

                  <span className={cn(
                    'w-14 text-center text-sm font-black tabular-nums',
                    entry.total_points >= 100 ? 'text-amber-400' : entry.total_points > 0 ? 'text-primary' : 'text-muted-foreground',
                  )}>
                    {entry.total_points}
                  </span>

                  <span className="w-14 text-center text-xs text-muted-foreground tabular-nums hidden sm:block">
                    {entry.total_predictions}
                  </span>

                  <span className="w-14 text-center text-xs text-emerald-400 font-semibold tabular-nums">
                    {entry.correct_scores}
                  </span>

                  <span className="w-14 text-center text-xs text-foreground font-semibold tabular-nums">
                    {accuracy(entry)}%
                  </span>

                  <span className="w-14 text-center text-xs tabular-nums hidden sm:flex items-center justify-center gap-0.5">
                    {entry.current_streak >= 3 && <Flame className="w-3 h-3 text-orange-400" />}
                    <span className={entry.current_streak >= 3 ? 'text-orange-400 font-bold' : 'text-muted-foreground'}>
                      {entry.current_streak}
                    </span>
                  </span>

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
          <h3 className="text-sm font-bold text-foreground mb-3">World Cup Predict & Win Rules</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>• Predictions are open for <strong className="text-foreground">World Cup 2026 matches only</strong></p>
            <p>• Predict <strong className="text-foreground">at least 20 matches</strong> to qualify for any prize</p>
            <p>• <strong className="text-emerald-400">+3</strong> for the exact score, <strong className="text-amber-400">+1</strong> for the correct winner, <strong className="text-red-400">-1</strong> if both wrong</p>
            <p>• <strong className="text-foreground">Century Club:</strong> everyone who reaches <strong className="text-amber-400">100+ points</strong> wins <strong className="text-amber-400">NPR 30,000</strong> (no limit on winners)</p>
            <p>• <strong className="text-foreground">Champion:</strong> the highest scorer (minimum <strong className="text-foreground">30 points</strong>) wins <strong className="text-amber-400">NPR 50,000</strong>; ties decided by lottery</p>
            <p>• Prizes stack — a champion above 100 points takes <strong className="text-amber-400">NPR 80,000</strong> total</p>
            <p>• All prizes paid <strong className="text-foreground">after the World Cup final</strong></p>
            <p>• Must follow our official social media pages to be eligible</p>
          </div>
        </div>
      </main>
    </div>
  );
}
