import { Link, useLocation } from 'react-router-dom';
import { Search, Star, BarChart3, Flame, Trophy, Menu, X as XIcon, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import ThemeToggle from './ThemeToggle';
import { cn } from '@/lib/utils';

export default function Header() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-14 gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 shrink-0">
            <span className="text-xl">⚽</span>
            <span className="text-lg font-bold tracking-tight">
              Last<span className="text-primary">Football</span>
            </span>
          </Link>

          {/* Desktop nav */}
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

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <ThemeToggle />
            {user ? (
              <>
                <NotificationBell />
                <UserMenu />
              </>
            ) : (
              <Link to="/auth" className="ml-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile right */}
          <div className="md:hidden flex items-center gap-1 shrink-0">
            {user && <NotificationBell />}
            {user && <UserMenu />}
            {!user && (
              <Link to="/auth" className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                Sign In
              </Link>
            )}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Menu"
            >
              {menuOpen ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile fullscreen menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-40 bg-background/98 backdrop-blur-md overflow-y-auto">
          <nav className="container py-4 space-y-1">
            <MobileNavItem to="/" label="Home" icon="🏠" pathname={pathname} onClick={() => setMenuOpen(false)} />
            <MobileNavItem to="/live" label="Live Scores" icon="⚡" pathname={pathname} onClick={() => setMenuOpen(false)} />
            <MobileNavItem to="/fixtures" label="Fixtures" icon="📅" pathname={pathname} onClick={() => setMenuOpen(false)} />
            <MobileNavItem to="/news" label="News & Reports" icon="📰" pathname={pathname} onClick={() => setMenuOpen(false)} />
            <MobileNavItem to="/favorites" label="My Favourites" icon="⭐" pathname={pathname} onClick={() => setMenuOpen(false)} />
            <MobileNavItem to="/stats" label="Standings & Stats" icon="📊" pathname={pathname} onClick={() => setMenuOpen(false)} />
            <MobileNavItem to="/search" label="Search Teams" icon="🔍" pathname={pathname} onClick={() => setMenuOpen(false)} />
            <MobileNavItem to="/compare" label="Player Comparison" icon="⚔️" pathname={pathname} onClick={() => setMenuOpen(false)} />
            <MobileNavItem to="/worldcup" label="World Cup 2026" icon="🏆" pathname={pathname} onClick={() => setMenuOpen(false)} highlight />

            <div className="pt-4 border-t border-border/30 mt-4 flex items-center gap-3 px-3">
              <ThemeToggle />
              <span className="text-xs text-muted-foreground">Toggle Theme</span>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

// ─── Mobile Nav Item ────────────────────────────────────────────────────────
function MobileNavItem({ to, label, icon, pathname, onClick, highlight }: {
  to: string; label: string; icon: string; pathname: string; onClick: () => void; highlight?: boolean;
}) {
  const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-3.5 rounded-xl transition-colors',
        isActive ? (highlight ? 'bg-amber-500/10 text-amber-400' : 'bg-primary/10 text-primary') : 'hover:bg-secondary/50',
      )}
    >
      <span className="text-lg w-7 text-center">{icon}</span>
      <span className={cn(
        'text-sm font-semibold flex-1',
        isActive ? (highlight ? 'text-amber-400' : 'text-primary') : 'text-foreground',
      )}>
        {label}
      </span>
      <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
    </Link>
  );
}

// ─── Desktop Nav Item ───────────────────────────────────────────────────────
function NavItem({ to, label, icon, pathname }: {
  to: string; label: string; icon?: React.ReactNode; pathname: string;
}) {
  const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

// ─── World Cup Nav (Desktop) ────────────────────────────────────────────────
const WC_START = new Date('2026-06-11T19:00:00Z').getTime();

function getCountdown() {
  const diff = WC_START - Date.now();
  if (diff <= 0) return null;
  return { days: Math.floor(diff / 86400000) };
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
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
    </Link>
  );
}
