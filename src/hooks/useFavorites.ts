import { useState, useCallback, useEffect } from 'react';

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteTeamIds));
  }, [favoriteTeamIds]);

  const toggleFavorite = useCallback((teamId: number) => {
    setFavoriteTeamIds(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  }, []);

  const isFavorite = useCallback((teamId: number) => {
    return favoriteTeamIds.includes(teamId);
  }, [favoriteTeamIds]);

  return { favoriteTeamIds, toggleFavorite, isFavorite };
}
