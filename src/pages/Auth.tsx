import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Auth() {
  const { user, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill in all fields');
    if (isSignUp && !name) return toast.error('Please enter your name');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');

    setSubmitting(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success('Account created! You can now sign in.');
        setIsSignUp(false);
        setPassword('');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Back link */}
      <div className="relative z-10 px-4 pt-4">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to LastFootball
        </Link>
      </div>

      {/* Form */}
      <div className="relative z-10 flex-1 flex items-start justify-center px-4 pt-8 sm:pt-16">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <span className="text-2xl">⚽</span>
            </div>
            <h1 className="text-2xl font-black text-foreground">
              {isSignUp ? 'Join LastFootball' : 'Welcome Back'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignUp ? 'Create your free account' : 'Sign in to your account'}
            </p>
          </div>

          {/* World Cup banner */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
            <Trophy className="w-8 h-8 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-400">FIFA World Cup 2026</p>
              <p className="text-[11px] text-muted-foreground">Sign up to pick your team and predict results!</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Name — sign up only */}
            {isSignUp && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                  autoComplete="name"
                />
              </div>
            )}

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                autoComplete="email"
                required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={isSignUp ? 'Create password (6+ chars)' : 'Password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-12 pl-10 pr-12 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                'w-full h-12 rounded-xl font-bold text-sm transition-all duration-200',
                'bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]',
                submitting && 'opacity-70 cursor-not-allowed',
              )}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Toggle sign up / sign in */}
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setPassword(''); }}
                className="text-primary font-semibold hover:underline"
              >
                {isSignUp ? 'Sign in' : 'Sign up free'}
              </button>
            </p>
          </div>

          {/* Features list */}
          <div className="mt-8 pt-6 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-bold text-center mb-3">
              What you get
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Follow favorite teams',
                'World Cup predictions',
                'Match reactions',
                'Personalized feed',
              ].map(feature => (
                <div key={feature} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-[11px] text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-4">
        <p className="text-[10px] text-muted-foreground/40">
          By signing up, you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
