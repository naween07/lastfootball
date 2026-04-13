import { Link, useLocation } from 'react-router-dom';
import { Zap, CalendarDays, Flame, Star, BarChart3, Search } from 'lucide-react';

const TABS = [
  { to: '/', label: 'Live', icon: Zap },
  { to: '/fixtures', label: 'Fixtures', icon: CalendarDays },
  { to: '/news', label: 'News', icon: Flame },
  { to: '/favorites', label: 'Favorites', icon: Star },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
];

export default function BottomTabBar() {
  const { pathname } = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-14">
        {TABS.map(({ to, label, icon: Icon }) => {
          const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
