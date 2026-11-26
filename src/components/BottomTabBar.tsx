import { Link, useLocation } from 'react-router-dom';
import { Zap, CalendarDays, Flame, Star, BarChart3, Trophy } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';

export default function BottomTabBar() {
  const { pathname } = useLocation();
  const { favoriteTeamIds, primaryTeamLogo } = useFavorites();

  // Was a Supabase query on every mount just to show one crest; the favourites
  // hook already holds it.
  const favLogo = primaryTeamLogo;

  const TABS = [
    { to: '/live', label: 'Live', icon: Zap },
    { to: '/fixtures', label: 'Fixtures', icon: CalendarDays },
    { to: '/worldcup', label: 'WC 2026', icon: Trophy, special: true },
    { to: '/favorites', label: 'My Club', icon: Star },
    { to: '/stats', label: 'Stats', icon: BarChart3 },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', transform: 'translate3d(0,0,0)', WebkitTransform: 'translate3d(0,0,0)', willChange: 'transform' }}>
      <div className="flex items-center justify-around h-14">
        {TABS.map(({ to, label, icon: Icon, special }) => {
          const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));
          const isFavTab = to === '/favorites';
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-colors touch-feedback"
            >
              {isActive && (
                <span className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full ${special ? 'bg-amber-400' : 'bg-primary'}`} />
              )}
              <span className={`transition-colors ${
                special ? (isActive ? 'text-amber-400' : 'text-amber-400/60') :
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {isFavTab && favLogo ? (
                  <img
                    src={favLogo}
                    alt="My Club"
                    className={`w-6 h-6 rounded-full object-contain ring-2 transition-all ${
                      isActive ? 'ring-primary scale-110' : 'ring-border/50'
                    }`}
                    style={isActive ? { animation: 'pulse 2s ease-in-out infinite' } : undefined}
                  />
                ) : (
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                )}
              </span>
              <span className={`text-[10px] font-semibold transition-colors ${
                special ? (isActive ? 'text-amber-400' : 'text-amber-400/60') :
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
