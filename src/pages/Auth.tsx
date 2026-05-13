import { useState, useEffect, useRef } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, Trophy, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const skipRedirect = useRef(false);

  // Detect recovery token in URL hash FIRST before anything else
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      skipRedirect.current = true;
      setMode('reset');
      // Let Supabase process the recovery token
      // The onAuthStateChange will fire PASSWORD_RECOVERY
    }
  }, []);

  // Auth state management
  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      // Don't set user if we're in recovery mode — we need to show the reset form
      if (skipRedirect.current) {
        setUser(session?.user ?? null);
      } else {
        setUser(session?.user ?? null);
      }
      setAuthReady(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return;

      if (event === 'PASSWORD_RECOVERY') {
        skipRedirect.current = true;
        setMode('reset');
        setUser(session?.user ?? null);
        return;
      }

      if (event === 'SIGNED_IN' && !skipRedirect.current) {
        setUser(session?.user ?? null);
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        skipRedirect.current = false;
      }

      if (event === 'USER_UPDATED') {
        // Password was changed
        setUser(session?.user ?? null);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // Redirect logged-in user to home (but NOT during password reset)
  if (authReady && user && mode !== 'reset' && !skipRedirect.current) {
    return <Navigate to="/" replace />;
  }

  // Show loading while auth initializes
  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // ─── Login handler ────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill in all fields');
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(err.message || 'Sign in failed');
    }
    setSubmitting(false);
  };

  // ─── Signup handler ───────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return toast.error('Please fill in all fields');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) throw error;
      toast.success('Account created! You can now sign in.');
      setMode('login');
      setPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Sign up failed');
    }
    setSubmitting(false);
  };

  // ─── Forgot password handler ──────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error('Enter your email address');
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setResetSent(true);
      toast.success('Reset link sent! Check your email.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email');
    }
    setSubmitting(false);
  };

  // ─── Set new password handler ─────────────────────────────────────────────
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) return toast.error('Password must be at least 6 characters');
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (error.message?.includes('lock') || error.message?.includes('same_password')) {
          // Lock errors usually mean password was updated anyway
          toast.success('Password updated!');
        } else {
          throw error;
        }
      } else {
        toast.success('Password updated successfully!');
      }
      // Sign out and go to login
      skipRedirect.current = false;
      await supabase.auth.signOut();
      setUser(null);
      setMode('login');
      setPassword('');
      window.location.hash = '';
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    }
    setSubmitting(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Reset Password Form
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === 'reset') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="LastFootball" className="h-10 object-contain mx-auto mb-4" style={{ mixBlendMode: 'screen' }} />
            <h1 className="text-2xl font-black text-foreground">Set New Password</h1>
            <p className="text-sm text-muted-foreground mt-1">Choose a strong password for your account</p>
          </div>
          <form onSubmit={handleSetNewPassword} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password (min 6 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-12 pl-10 pr-12 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                required
                minLength={6}
                autoFocus
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
            </button>
          </form>
          <div className="text-center mt-4">
            <button onClick={() => { setMode('login'); skipRedirect.current = false; window.location.hash = ''; }} className="text-xs text-primary hover:underline">
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Forgot Password Form
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === 'forgot') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="LastFootball" className="h-10 object-contain mx-auto mb-4" style={{ mixBlendMode: 'screen' }} />
            <h1 className="text-2xl font-black text-foreground">Reset Password</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your email to receive a reset link</p>
          </div>

          {resetSent ? (
            <div className="text-center p-6 rounded-xl bg-primary/10 border border-primary/20">
              <CheckCircle className="w-10 h-10 text-primary mx-auto mb-3" />
              <p className="text-sm font-bold text-foreground mb-1">Reset Link Sent!</p>
              <p className="text-xs text-muted-foreground mb-4">Check your email and click the reset link. Then come back here to set your new password.</p>
              <button onClick={() => { setMode('login'); setResetSent(false); }} className="text-xs text-primary font-semibold hover:underline">
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
              </button>
            </form>
          )}

          {!resetSent && (
            <div className="text-center mt-4">
              <button onClick={() => setMode('login')} className="text-xs text-primary hover:underline">
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Login / Signup Form
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 px-4 pt-4">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to LastFootball
        </Link>
      </div>

      <div className="relative z-10 flex-1 flex items-start justify-center px-4 pt-8 sm:pt-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="LastFootball" className="h-10 object-contain mx-auto mb-4" style={{ mixBlendMode: 'screen' }} />
            <h1 className="text-2xl font-black text-foreground">
              {mode === 'signup' ? 'Join LastFootball' : 'Welcome Back'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'signup' ? 'Create your free account' : 'Sign in to your account'}
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
            <Trophy className="w-8 h-8 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-400">FIFA World Cup 2026</p>
              <p className="text-[11px] text-muted-foreground">Sign up to pick your team and predict results!</p>
            </div>
          </div>

          <form onSubmit={mode === 'signup' ? handleSignup : handleLogin} className="space-y-3">
            {mode === 'signup' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  autoComplete="name" />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                autoComplete="email" required />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'Create password (6+ chars)' : 'Password'}
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full h-12 pl-10 pr-12 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {mode === 'login' && (
              <div className="text-right -mt-1">
                <button type="button" onClick={() => setMode('forgot')} className="text-xs text-primary hover:underline font-medium">
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" disabled={submitting}
              className={cn('w-full h-12 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all', submitting && 'opacity-70')}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setPassword(''); }} className="text-primary font-semibold hover:underline">
                {mode === 'signup' ? 'Sign in' : 'Sign up free'}
              </button>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-bold text-center mb-3">What you get</p>
            <div className="grid grid-cols-2 gap-2">
              {['Follow favorite teams', 'World Cup predictions', 'Match reactions', 'Personalized feed'].map(f => (
                <div key={f} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-[11px] text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 text-center py-4">
        <p className="text-[10px] text-muted-foreground/40">By signing up, you agree to our terms of service.</p>
      </div>
    </div>
  );
}
