import { createContext, createElement, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { isTenantRole } from '../services/authService';
import { getFavoriteApartmentIds, isApartmentFavorite, toggleFavorite as toggleFavoriteInDb, } from '../data/apartments';
const FavoritesContext = createContext(null);
export function FavoritesProvider({ children }) {
    return createElement(FavoritesContext.Provider, { value: useFavoritesState() }, children);
}
export function useFavorites() {
    const value = useContext(FavoritesContext);
    if (!value) throw new Error('useFavorites must be used within FavoritesProvider');
    return value;
}
function useFavoritesState() {
    const { user, isAuthenticated } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [updatingFavoriteIds, setUpdatingFavoriteIds] = useState([]);
    const favoritesRef = useRef([]);
    const favoritesOwnerRef = useRef(user?.id ?? null);
    const loadRequestRef = useRef(0);
    const pendingRef = useRef(new Set());
    useEffect(() => {
        favoritesRef.current = favorites;
    }, [favorites]);
    const loadFavorites = useCallback(async () => {
        const requestedUserId = user?.id;
        if (pendingRef.current.size && favoritesOwnerRef.current === requestedUserId) return;
        if (!requestedUserId) {
            loadRequestRef.current += 1;
            favoritesOwnerRef.current = null;
            favoritesRef.current = [];
            setFavorites([]);
            setError(null);
            setIsLoading(false);
            setIsRefreshing(false);
            return;
        }
        if (favoritesOwnerRef.current !== requestedUserId) {
            // Never briefly show one account's saved apartments to another account.
            favoritesOwnerRef.current = requestedUserId;
            favoritesRef.current = [];
            setFavorites([]);
            setError(null);
            setUpdatingFavoriteIds([]);
        }
        const requestId = ++loadRequestRef.current;
        const hasExistingFavorites = favoritesRef.current.length > 0;
        if (hasExistingFavorites) {
            setIsRefreshing(true);
        }
        else {
            setIsLoading(true);
        }
        try {
            const ids = await getFavoriteApartmentIds(requestedUserId);
            if (requestId !== loadRequestRef.current || favoritesOwnerRef.current !== requestedUserId) return;
            favoritesRef.current = ids;
            setFavorites(ids);
            setError(null);
        }
        catch (error) {
            if (requestId !== loadRequestRef.current || favoritesOwnerRef.current !== requestedUserId) return;
            console.error('Failed to load favorites:', error);
            setError('Unable to load favorites. Please try again.');
            if (!hasExistingFavorites) {
                favoritesRef.current = [];
                setFavorites([]);
            }
        }
        finally {
            if (requestId === loadRequestRef.current) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
    }, [user?.id]);
    useEffect(() => {
        const refreshWhenOnline = () => void loadFavorites();
        void loadFavorites();
        window.addEventListener('online', refreshWhenOnline);
        return () => window.removeEventListener('online', refreshWhenOnline);
    }, [loadFavorites]);
    const toggleFavorite = useCallback(async (apartmentId) => {
        if (!isAuthenticated || !user?.id) {
            toast.error('Please sign in to save favorites.');
            return;
        }
        if (!isTenantRole(user.role)) {
            toast.error('Favorites are only available for tenant accounts.');
            return;
        }
        const mutationKey = `${user.id}:${apartmentId}`;
        if (pendingRef.current.has(mutationKey)) {
            return;
        }
        const requestedUserId = user.id;
        const wasFavorite = favoritesOwnerRef.current === requestedUserId && favoritesRef.current.includes(apartmentId);
        pendingRef.current.add(mutationKey);
        loadRequestRef.current += 1;
        const optimistic = wasFavorite
            ? favoritesRef.current.filter(id => id !== apartmentId)
            : [...favoritesRef.current, apartmentId];
        favoritesRef.current = optimistic;
        setFavorites(optimistic);
        setIsLoading(false);
        setIsRefreshing(false);
        setUpdatingFavoriteIds((previous) => [...previous, apartmentId]);
        try {
            const isNowFavorite = await toggleFavoriteInDb(apartmentId, requestedUserId);
            if (favoritesOwnerRef.current !== requestedUserId) return;
            setFavorites((previous) => {
                const next = isNowFavorite
                    ? (previous.includes(apartmentId) ? previous : [...previous, apartmentId])
                    : previous.filter((id) => id !== apartmentId);
                favoritesRef.current = next;
                return next;
            });
            if (isNowFavorite) {
                toast.success('Added to favorites');
            }
            else {
                toast.info('Removed from favorites');
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to update favorites.';
            toast.error(message);
            const stillFavorite = await isApartmentFavorite(requestedUserId, apartmentId).catch(() => wasFavorite);
            if (favoritesOwnerRef.current !== requestedUserId) return;
            setFavorites((previous) => {
                const next = stillFavorite
                    ? (previous.includes(apartmentId) ? previous : [...previous, apartmentId])
                    : previous.filter((id) => id !== apartmentId);
                favoritesRef.current = next;
                return next;
            });
        }
        finally {
            pendingRef.current.delete(mutationKey);
            if (favoritesOwnerRef.current === requestedUserId) {
                setUpdatingFavoriteIds((previous) => previous.filter((id) => id !== apartmentId));
            }
        }
    }, [favorites, isAuthenticated, updatingFavoriteIds, user?.id, user?.role]);
    const isFavorite = useCallback((apartmentId) => favoritesOwnerRef.current === user?.id && favorites.includes(apartmentId), [favorites, user?.id]);
    return {
        favorites: favoritesOwnerRef.current === user?.id ? favorites : [],
        isLoading,
        isRefreshing,
        error,
        updatingFavoriteIds,
        toggleFavorite,
        isFavorite,
        refreshFavorites: loadFavorites,
    };
}
