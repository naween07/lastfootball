import { Link, useLocation } from 'react-router-dom';
import { Zap, CalendarDays, Flame, Star, BarChart3, Trophy } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function BottomTabBar() {
  const { pathname } = useLocation();
  const { favoriteTeamIds } = useFavorites();
  const [favLogo, setFavLogo] = useState<string | null>(null);

  useEffect(() => {
    if (favoriteTeamIds.length === 0) {
      setFavLogo(null);
      return;
    }
    const loadLogo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('user_favorites')
          .select('team_logo')
          .eq('user_id', user.id)
          .limit(1);
        if (data && data.length > 0 && data[0].team_logo) {
          setFavLogo(data[0].team_logo);
        }
      } catch {}
    };
    loadLogo();
  }, [favoriteTeamIds]);

  const TABS = [
    { to: '/live', label: 'Live', icon: Zap },
    { to: '/fixtures', label: 'Fixtures', icon: CalendarDays },
    { to: '/worldcup', label: 'WC 2026', icon: Trophy, special: true },
    { to: '/favorites', label: 'My Club', icon: Star },
    { to: '/stats', label: 'Stats', icon: BarChart3 },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
                  <img src={favLogo} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-border" />
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
