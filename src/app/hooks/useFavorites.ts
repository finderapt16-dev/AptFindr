import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '../contexts/AuthContext';
import {
  getFavoriteApartmentIds,
  isApartmentFavorite,
  toggleFavorite as toggleFavoriteInDb,
} from '../data/apartments';

export function useFavorites() {
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadFavorites = useCallback(async () => {
    if (!user?.id) {
      setFavorites([]);
      return;
    }

    setIsLoading(true);

    try {
      const ids = await getFavoriteApartmentIds(user.id);
      setFavorites(ids);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = useCallback(
    async (apartmentId: string) => {
      if (!isAuthenticated || !user?.id) {
        toast.error('Please sign in to save favorites.');
        return;
      }

      const wasFavorite = favorites.includes(apartmentId);

      try {
        const isNowFavorite = await toggleFavoriteInDb(apartmentId, user.id);
        setFavorites((previous) => {
          if (isNowFavorite) {
            return previous.includes(apartmentId) ? previous : [...previous, apartmentId];
          }

          return previous.filter((id) => id !== apartmentId);
        });

        if (isNowFavorite) {
          toast.success('Added to favorites');
        } else {
          toast.info('Removed from favorites');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update favorites.';
        toast.error(message);
        const stillFavorite = await isApartmentFavorite(user.id, apartmentId).catch(() => wasFavorite);
        setFavorites((previous) => {
          if (stillFavorite) {
            return previous.includes(apartmentId) ? previous : [...previous, apartmentId];
          }

          return previous.filter((id) => id !== apartmentId);
        });
      }
    },
    [favorites, isAuthenticated, user?.id],
  );

  const isFavorite = useCallback(
    (apartmentId: string) => favorites.includes(apartmentId),
    [favorites],
  );

  return {
    favorites,
    isLoading,
    toggleFavorite,
    isFavorite,
    refreshFavorites: loadFavorites,
  };
}
