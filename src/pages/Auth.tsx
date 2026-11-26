/**
 * Sign in, register and password reset, against the app backend.
 *
 * Phase 1c. This replaced the Supabase version: the website and the Android
 * app now share one `User` table, so an account made on either works on both.
 *
 * The shape differs from what was here before in one way that drives the whole
 * screen: registration and password reset finish with a six-digit code sent by
 * email, not a link that is clicked. Both flows are therefore two steps, with
 * an OTP screen between them.
 *
 * Every sub-component is at module scope. Declared inside the page they would
 * be a new component type on each render, so React would unmount and remount
 * the inputs and the field would lose focus after every keystroke.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle, Info,
} from 'lucide-react';
import {
  login, register, activate, sendOtp, resetPassword, friendlyAuthError,
} from '@/services/authApi';
import { useAuth, refreshAuth } from '@/hooks/useAuth';

type Mode = 'login' | 'signup' | 'activate' | 'forgot' | 'reset';

const FIELD =
  'w-full h-12 pl-10 pr-4 rounded-xl bg-secondary/50 border border-border text-sm ' +
  'text-foreground placeholder:text-muted-foreground/50 focus:outline-none ' +
  'focus:border-primary focus:ring-1 focus:ring-primary/20';

const BUTTON =
  'w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm ' +
  'hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2';

/** The server allows five sends per fifteen minutes. Holding the button for a
 *  minute keeps an impatient reader from spending that allowance. */
const RESEND_SECONDS = 60;

const Spinner = () => <Loader2 className="w-4 h-4 animate-spin" />;

/**
 * Shown on the sign-in and registration screens only.
 *
 * Accounts moved from one system to another in this release, and the people
 * affected did nothing wrong and have no way to work that out: their password
 * simply stops working. Saying so is the difference between "the site is
 * broken" and "they changed something".
 */
function MovedNotice() {
  return (
    <div className="mb-5 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        <Info className="inline w-3 h-3 mr-1 -mt-0.5 text-primary" />
        <span className="text-foreground font-semibold">Accounts have moved.</span>{' '}
        If you signed in here before, please create your account again — the old
        one will not work. The upside is that one account now covers both this
        site and the Last Football app.
      </p>
    </div>
  );
}

function Shell({ title, sub, notice, error, showMoved, children }: {
  title: string;
  sub: string;
  notice: string | null;
  error: string | null;
  showMoved?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <img
            src="/logo.png" alt="Last Football"
            className="h-10 object-contain mx-auto mb-4"
            style={{ mixBlendMode: 'screen' }}
          />
          <h1 className="text-2xl font-black text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{sub}</p>
        </div>

        {showMoved && <MovedNotice />}

        {notice && (
          <div className="mb-4 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2">
            <p className="text-xs text-foreground">{notice}</p>
          </div>
        )}
        {error && (
          <div role="alert" className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

function EmailField({ email, setEmail }: { email: string; setEmail: (v: string) => void }) {
  return (
    <div className="relative">
      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="email" placeholder="Email address" value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={FIELD} required autoComplete="email"
      />
    </div>
  );
}

function PasswordField({ placeholder, password, setPassword, show, setShow, autoComplete }: {
  placeholder: string;
  password: string;
  setPassword: (v: string) => void;
  show: boolean;
  setShow: (v: boolean) => void;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type={show ? 'text' : 'password'} placeholder={placeholder} value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={FIELD + ' pr-12'} required minLength={6}
        autoComplete={autoComplete}
      />
      <button
        type="button" onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function OtpField({ otp, setOtp }: { otp: string; setOtp: (v: string) => void }) {
  return (
    <input
      inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6}
      placeholder="000000" value={otp}
      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
      className={
        'w-full h-14 rounded-xl bg-secondary/50 border border-border text-center ' +
        'text-2xl font-bold tracking-[0.5em] indent-[0.5em] text-foreground ' +
        'placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary ' +
        'focus:ring-1 focus:ring-primary/20'
      }
      required autoFocus
    />
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  /** Where to land after signing in: back where they were sent from, or home. */
  const from = (location.state as { from?: string } | null)?.from || '/';

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [show, setShow] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    timer.current = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [resendIn]);

  const go = useCallback((next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setOtp('');
  }, []);

  /** Every handler funnels through here, so no exception can reach the screen:
   *  friendlyAuthError passes the backend's own readable messages through and
   *  turns anything else into one generic line. */
  const run = useCallback(async (fn: () => Promise<void>) => {
    setSubmitting(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setSubmitting(false);
    }
  }, []);

  /** authApi has stored the token; tell the rest of the app who it belongs to
   *  so the header updates, then leave. */
  const finish = useCallback(async () => {
    await refreshAuth();
    navigate(from, { replace: true });
  }, [navigate, from]);

  const onLogin = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await login(email, password);
      setPassword('');
      await finish();
    });
  };

  const onSignup = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await register(email, username, password);
      setPassword('');
      setResendIn(RESEND_SECONDS);
      setNotice('We sent a six-digit code to ' + email.trim() + '.');
      setMode('activate');
    });
  };

  const onActivate = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await activate(email, otp);
      setOtp('');
      await finish();
    });
  };

  const onForgot = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await sendOtp(email);
      setResendIn(RESEND_SECONDS);
      setNotice('We sent a six-digit code to ' + email.trim() + '.');
      setMode('reset');
    });
  };

  const onReset = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await resetPassword(email, otp, password);
      setPassword('');
      setOtp('');
      setMode('login');
      setNotice('Password changed. Sign in with the new one.');
    });
  };

  const onResend = () =>
    run(async () => {
      await sendOtp(email);
      setResendIn(RESEND_SECONDS);
      setNotice('A new code is on its way to ' + email.trim() + '.');
    });

  // Already signed in: there is nothing on this page for them.
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (user) return <Navigate to={from} replace />;

  if (mode === 'activate' || mode === 'reset') {
    const resetting = mode === 'reset';
    return (
      <Shell
        title={resetting ? 'Choose a new password' : 'Confirm your email'}
        sub={'Enter the six-digit code sent to ' + (email.trim() || 'your email') + '.'}
        notice={notice} error={error}
      >
        <form onSubmit={resetting ? onReset : onActivate} className="space-y-4">
          <OtpField otp={otp} setOtp={setOtp} />
          {resetting && (
            <PasswordField
              placeholder="New password (min 6 characters)"
              password={password} setPassword={setPassword}
              show={show} setShow={setShow} autoComplete="new-password"
            />
          )}
          <button type="submit" disabled={submitting || otp.length < 6} className={BUTTON}>
            {submitting ? <Spinner /> : resetting ? 'Change password' : 'Confirm'}
          </button>
        </form>
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => go('login')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
          <button
            type="button" onClick={onResend} disabled={submitting || resendIn > 0}
            className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
          >
            {resendIn > 0 ? 'Send a new code in ' + resendIn + 's' : 'Send a new code'}
          </button>
        </div>
      </Shell>
    );
  }

  if (mode === 'forgot') {
    return (
      <Shell title="Reset your password" sub="We will email you a six-digit code." notice={notice} error={error}>
        <form onSubmit={onForgot} className="space-y-4">
          <EmailField email={email} setEmail={setEmail} />
          <button type="submit" disabled={submitting} className={BUTTON}>
            {submitting ? <Spinner /> : 'Send the code'}
          </button>
        </form>
        <div className="text-center mt-4">
          <button onClick={() => go('login')} className="text-xs text-primary hover:underline">
            Back to sign in
          </button>
        </div>
      </Shell>
    );
  }

  const signing = mode === 'signup';
  return (
    <Shell
      title={signing ? 'Create an account' : 'Sign in'}
      sub={signing ? 'One account for the site and the app.' : 'Welcome back.'}
      notice={notice} error={error} showMoved
    >
      <form onSubmit={signing ? onSignup : onLogin} className="space-y-3">
        <EmailField email={email} setEmail={setEmail} />
        {signing && (
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text" placeholder="Username" value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={FIELD} required autoComplete="username"
            />
          </div>
        )}
        <PasswordField
          placeholder={signing ? 'Password (min 6 characters)' : 'Password'}
          password={password} setPassword={setPassword}
          show={show} setShow={setShow}
          autoComplete={signing ? 'new-password' : 'current-password'}
        />
        <button type="submit" disabled={submitting} className={BUTTON}>
          {submitting ? <Spinner /> : signing ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <div className="flex items-center justify-between mt-4">
        <button onClick={() => go(signing ? 'login' : 'signup')} className="text-xs text-primary hover:underline">
          {signing ? 'I already have an account' : 'Create an account'}
        </button>
        {!signing && (
          <button onClick={() => go('forgot')} className="text-xs text-muted-foreground hover:text-foreground">
            Forgot password?
          </button>
        )}
      </div>

      {signing && (
        <p className="text-[11px] text-muted-foreground mt-4 text-center leading-snug">
          <CheckCircle className="inline w-3 h-3 mr-1 -mt-0.5" />
          We email a six-digit code to confirm the address before the account works.
        </p>
      )}
    </Shell>
  );
}
