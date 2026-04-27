import { Link, useLocation } from 'react-router-dom';
import { Search, Star, BarChart3, Flame, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import ThemeToggle from './ThemeToggle';
import { cn } from '@/lib/utils';

export default function Header() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-14 gap-2">
        <Link to="/" className="flex items-center gap-1.5 shrink-0">
          <span className="text-xl">⚽</span>
          <span className="text-lg font-bold tracking-tight">
            Last<span className="text-primary">Football</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          <NavItem to="/" label="Home" pathname={pathname} />
          <NavItem to="/live" label="Live" pathname={pathname} />
          <NavItem to="/fixtures" label="Fixtures" pathname={pathname} />
          <NavItem to="/news" label="News" icon={<Flame className="w-3.5 h-3.5" />} pathname={pathname} />
          <NavItem to="/favorites" label="Favorites" icon={<Star className="w-3.5 h-3.5" />} pathname={pathname} />
          <NavItem to="/stats" label="Stats" icon={<BarChart3 className="w-3.5 h-3.5" />} pathname={pathname} />
          <NavItem to="/search" label="Search" icon={<Search className="w-3.5 h-3.5" />} pathname={pathname} />
          <WorldCupNav pathname={pathname} />
        </nav>

        <div className="hidden md:flex items-center gap-1 shrink-0">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <Link
              to="/auth"
              className="ml-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          )}
        </div>

        <div className="md:hidden flex items-center gap-1 shrink-0">
          <Link
            to="/search"
            className={`p-2 rounded-md transition-colors ${pathname === '/search' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            aria-label="Search"
          >
            <Search className="w-4.5 h-4.5" />
          </Link>
          <ThemeToggle />
          {user && <NotificationBell />}
          {user && <UserMenu />}
          {!user && (
            <Link
              to="/auth"
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavItem({
  to,
  label,
  icon,
  pathname,
}: {
  to: string;
  label: string;
  icon?: React.ReactNode;
  pathname: string;
}) {
  const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? 'text-primary bg-primary/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

// World Cup 2026 countdown — June 11, 2026 kickoff
const WC_START = new Date('2026-06-11T19:00:00Z').getTime(); // 3pm ET = 7pm UTC

function getCountdown() {
  const now = Date.now();
  const diff = WC_START - now;
  if (diff <= 0) return null; // Tournament has started
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return { days, hours, mins };
}

function WorldCupNav({ pathname }: { pathname: string }) {
  const [countdown, setCountdown] = useState(getCountdown);
  const isActive = pathname.startsWith('/worldcup');

  useEffect(() => {
    const timer = setInterval(() => setCountdown(getCountdown()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Link
      to="/worldcup"
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all relative',
        isActive
          ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
          : 'bg-gradient-to-r from-amber-500/10 to-amber-600/10 text-amber-400 hover:from-amber-500/20 hover:to-amber-600/20',
      )}
    >
      <Trophy className="w-3.5 h-3.5" />
      <span className="hidden lg:inline">WC 2026</span>
      <span className="lg:hidden">WC</span>
      {countdown && (
        <span className="text-[9px] font-mono text-amber-400/70 tabular-nums">
          {countdown.days}d
        </span>
      )}
      {/* Pulse dot */}
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
    </Link>
  );
}
