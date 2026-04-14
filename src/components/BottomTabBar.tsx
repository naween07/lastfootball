import { Link, useLocation } from 'react-router-dom';
import { Zap, CalendarDays, Flame, Star, BarChart3 } from 'lucide-react';
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
    // Get the first favorite team's logo from DB
    const loadLogo = async () => {
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
    };
    loadLogo();
  }, [favoriteTeamIds]);

  const TABS = [
    { to: '/', label: 'Live', icon: Zap },
    { to: '/fixtures', label: 'Fixtures', icon: CalendarDays },
    { to: '/news', label: 'News', icon: Flame },
    { to: '/favorites', label: 'My Club', icon: Star },
    { to: '/stats', label: 'Stats', icon: BarChart3 },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-14">
        {TABS.map(({ to, label, icon: Icon }) => {
          const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);
          const isFavTab = to === '/favorites';
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
              {isFavTab && favLogo ? (
                <img src={favLogo} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
