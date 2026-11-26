import { useState, useCallback, useEffect, useMemo } from 'react';

/**
 * Favourite teams, held on the device.
 *
 * This was localStorage-first with Supabase as a sync layer: the ids lived
 * locally and were mirrored to `user_favorites` for anyone signed in. Phase 1c
 * moves accounts to the app backend, where favourites belong to the `Follow`
 * model, so the Supabase half is gone and the local half is all that remains
 * until Phase 2 wires `Follow` up.
 *
 * The practical effect is narrow and worth being honest about: favourites keep
 * working exactly as before on the device you set them on, and stop following
 * you between devices. Nothing is lost -- the Supabase rows are still there,
 * and Phase 2 reads from the backend rather than restoring them.
 *
 * Team names and logos are kept alongside the ids now. `toggleFavorite` was
 * already handed both and threw them away, so the header and tab bar each ran
 * their own Supabase query just to show one crest. Storing them removes two
 * round trips and two more direct Supabase callers.
 */

const IDS_KEY = 'lastfootball_favorites';
const META_KEY = 'lastfootball_favorite_meta';

interface TeamMeta {
  name: string;
  logo: string;
}

type MetaMap = Record<string, TeamMeta>;

function readIds(): number[] {
  try {
    const raw = localStorage.getItem(IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

function readMeta(): MetaMap {
  try {
    const raw = localStorage.getItem(META_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as MetaMap) : {};
  } catch {
    return {};
  }
}

export function useFavorites() {
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<number[]>(readIds);
  const [meta, setMeta] = useState<MetaMap>(readMeta);

  useEffect(() => {
    try {
      localStorage.setItem(IDS_KEY, JSON.stringify(favoriteTeamIds));
    } catch {
      /* private window, or storage full: the list still works for this session */
    }
  }, [favoriteTeamIds]);

  useEffect(() => {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch {
      /* as above */
    }
  }, [meta]);

  const toggleFavorite = useCallback(
    (teamId: number, teamName?: string, teamLogo?: string) => {
      setFavoriteTeamIds((prev) =>
        prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
      );

      // Keep what we were given even when removing: re-adding a team should
      // show its crest again without waiting for a page that knows it.
      if (teamName || teamLogo) {
        setMeta((prev) => ({
          ...prev,
          [String(teamId)]: {
            name: teamName || prev[String(teamId)]?.name || '',
            logo: teamLogo || prev[String(teamId)]?.logo || '',
          },
        }));
      }
    },
    [],
  );

  const isFavorite = useCallback(
    (teamId: number) => favoriteTeamIds.includes(teamId),
    [favoriteTeamIds],
  );

  /** The crest shown in the header and the tab bar: the first favourite we
   *  have a logo for. Null until the reader favourites a team from a page that
   *  passes one, which is every page that offers the control. */
  const primaryTeamLogo = useMemo(() => {
    for (const id of favoriteTeamIds) {
      const logo = meta[String(id)]?.logo;
      if (logo) return logo;
    }
    return null;
  }, [favoriteTeamIds, meta]);

  return { favoriteTeamIds, toggleFavorite, isFavorite, primaryTeamLogo };
}
