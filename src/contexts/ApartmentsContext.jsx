import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from 'react';
import { supabase } from '../services/supabaseClient';
import { fetchApartments } from '../data/apartments';
import { useAuth } from './AuthContext';
const ApartmentsContext = createContext(undefined);
const LIVE_REFRESH_DELAY_MS = 1500;
export function ApartmentsProvider({ children }) {
    const { user, isLoading: authIsLoading } = useAuth();
    const [apartments, setApartments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
    const requestIdRef = useRef(0);
    const isMountedRef = useRef(true);
    const activeRefreshRef = useRef(false);
    const queuedRefreshRef = useRef(false);
    const queuedSilentRefreshRef = useRef(true);
    const apartmentsRef = useRef([]);
    const refreshApartments = useCallback(async (options = {}) => {
        const silent = options.silent === true;
        if (activeRefreshRef.current) {
            queuedRefreshRef.current = true;
            queuedSilentRefreshRef.current = queuedSilentRefreshRef.current && silent;
            return;
        }
        activeRefreshRef.current = true;
        const requestId = ++requestIdRef.current;
        const hasExistingApartments = apartmentsRef.current.length > 0;
        if (hasExistingApartments) {
            if (!silent)
                setIsRefreshing(true);
        }
        else {
            setIsLoading(true);
        }
        try {
            const rows = await fetchApartments();
            if (isMountedRef.current && requestId === requestIdRef.current) {
                setApartments(rows);
                setError(null);
                setLastUpdatedAt(new Date().toISOString());
            }
        }
        catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : 'Unable to load apartments.';
            if (isMountedRef.current && requestId === requestIdRef.current) {
                setError(message);
                if (!hasExistingApartments) {
                    setApartments([]);
                }
            }
        }
        finally {
            if (isMountedRef.current && requestId === requestIdRef.current) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
            activeRefreshRef.current = false;
            if (queuedRefreshRef.current) {
                const queuedSilent = queuedSilentRefreshRef.current;
                queuedRefreshRef.current = false;
                queuedSilentRefreshRef.current = true;
                void refreshApartments({ silent: queuedSilent });
            }
        }
    }, []);
    useEffect(() => {
        apartmentsRef.current = apartments;
    }, [apartments]);
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    useEffect(() => {
        if (authIsLoading)
            return;
        setApartments([]);
        apartmentsRef.current = [];
        setError(null);
        setIsLoading(true);
        setIsRefreshing(false);
        void refreshApartments();
    }, [authIsLoading, refreshApartments, user?.id, user?.role]);
    useEffect(() => {
        let refreshTimer = null;
        const scheduleRefresh = () => {
            if (refreshTimer)
                clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => void refreshApartments({ silent: true }), LIVE_REFRESH_DELAY_MS);
        };
        const channel = supabase
            .channel('apartments-context-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'apartments' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'apartment_rooms' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'apartment_images' }, scheduleRefresh)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_users' }, scheduleRefresh)
            .subscribe();
        const refreshOnFocus = () => scheduleRefresh();
        const refreshOnVisibility = () => {
            if (document.visibilityState === 'visible')
                scheduleRefresh();
        };
        window.addEventListener('focus', refreshOnFocus);
        window.addEventListener('online', refreshOnFocus);
        document.addEventListener('visibilitychange', refreshOnVisibility);
        return () => {
            if (refreshTimer)
                clearTimeout(refreshTimer);
            window.removeEventListener('focus', refreshOnFocus);
            window.removeEventListener('online', refreshOnFocus);
            document.removeEventListener('visibilitychange', refreshOnVisibility);
            void supabase.removeChannel(channel);
        };
    }, [refreshApartments]);
    const value = useMemo(() => ({
        apartments,
        isLoading,
        isRefreshing,
        error,
        lastUpdatedAt,
        refreshApartments,
    }), [apartments, isLoading, isRefreshing, error, lastUpdatedAt, refreshApartments]);
    return <ApartmentsContext.Provider value={value}>{children}</ApartmentsContext.Provider>;
}
export function useApartmentsContext() {
    const context = useContext(ApartmentsContext);
    if (context === undefined) {
        throw new Error('useApartmentsContext must be used within ApartmentsProvider');
    }
    return context;
}
