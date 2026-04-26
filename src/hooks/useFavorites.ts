import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'lastfootball_favorites';

export function useFavorites() {
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user and load DB favorites
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const { data, error } = await supabase
            .from('user_favorites')
            .select('team_id')
            .eq('user_id', user.id);
          if (data && !error && data.length > 0) {
            const dbIds = data.map((d: any) => d.team_id);
            setFavoriteTeamIds(dbIds);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbIds));
          }
        }
      } catch {}
    };
    loadUser();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteTeamIds));
  }, [favoriteTeamIds]);

  const toggleFavorite = useCallback(async (teamId: number, teamName?: string, teamLogo?: string) => {
    const isFav = favoriteTeamIds.includes(teamId);
    
    if (isFav) {
      setFavoriteTeamIds(prev => prev.filter(id => id !== teamId));
      if (userId) {
        await supabase.from('user_favorites').delete().eq('user_id', userId).eq('team_id', teamId);
      }
    } else {
      setFavoriteTeamIds(prev => [...prev, teamId]);
      if (userId) {
        await supabase.from('user_favorites').insert({
          user_id: userId,
          team_id: teamId,
          team_name: teamName || 'Unknown',
          team_logo: teamLogo || '',
        });
      }
    }
  }, [favoriteTeamIds, userId]);

  const isFavorite = useCallback((teamId: number) => {
    return favoriteTeamIds.includes(teamId);
  }, [favoriteTeamIds]);

  return { favoriteTeamIds, toggleFavorite, isFavorite };
}
