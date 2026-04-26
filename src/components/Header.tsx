import { Link, useLocation } from 'react-router-dom';
import { Search, Star, BarChart3, Flame } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import ThemeToggle from './ThemeToggle';

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
