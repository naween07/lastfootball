import { Link } from 'react-router-dom';
import { Search, Star, BarChart3, Flame } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight text-primary">⚽</span>
          <span className="text-lg font-bold tracking-tight">
            Last<span className="text-primary">Football</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavItem to="/" label="Live" />
          <NavItem to="/fixtures" label="Fixtures" />
          <NavItem to="/news" label="News" icon={<Flame className="w-3.5 h-3.5" />} />
          <NavItem to="/favorites" label="Favorites" icon={<Star className="w-3.5 h-3.5" />} />
          <NavItem to="/stats" label="Stats" icon={<BarChart3 className="w-3.5 h-3.5" />} />
          <NavItem to="/search" label="Search" icon={<Search className="w-3.5 h-3.5" />} />
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-1 ml-2">
              <NotificationBell />
              <UserMenu />
            </div>
          ) : (
            <Link
              to="/auth"
              className="ml-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          )}
        </nav>

        {/* Mobile right side — only auth/user actions */}
        <div className="md:hidden flex items-center gap-1">
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

function NavItem({ to, label, icon }: { to: string; label: string; icon?: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
