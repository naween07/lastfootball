import { Link } from 'react-router-dom';
import { Search, Star, Menu, X, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
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
          <NavItem to="/favorites" label="Favorites" icon={<Star className="w-3.5 h-3.5" />} />
          <NavItem to="/stats" label="Stats" icon={<BarChart3 className="w-3.5 h-3.5" />} />
          <NavItem to="/search" label="Search" icon={<Search className="w-3.5 h-3.5" />} />
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

        {/* Mobile right side */}
        <div className="md:hidden flex items-center gap-1">
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
          <button
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-border bg-card pb-3 px-4 flex flex-col gap-1">
          <NavItem to="/" label="Live" onClick={() => setMenuOpen(false)} />
          <NavItem to="/fixtures" label="Fixtures" onClick={() => setMenuOpen(false)} />
          <NavItem to="/favorites" label="Favorites" icon={<Star className="w-3.5 h-3.5" />} onClick={() => setMenuOpen(false)} />
          <NavItem to="/stats" label="Stats" icon={<BarChart3 className="w-3.5 h-3.5" />} onClick={() => setMenuOpen(false)} />
          <NavItem to="/search" label="Search" icon={<Search className="w-3.5 h-3.5" />} onClick={() => setMenuOpen(false)} />
        </nav>
      )}
    </header>
  );
}

function NavItem({ to, label, icon, onClick }: { to: string; label: string; icon?: React.ReactNode; onClick?: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
