import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { supabase } from '../../../lib/supabaseclient';
import type { Apartment } from '../data/apartments';
import { fetchApartments } from '../data/apartments';
import { useAuth } from './AuthContext';

interface ApartmentsContextType {
  apartments: Apartment[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
  refreshApartments: () => Promise<void>;
}

const ApartmentsContext = createContext<ApartmentsContextType | undefined>(undefined);

export function ApartmentsProvider({ children }: { children: ReactNode }): ReactElement {
  const { user, isLoading: authIsLoading } = useAuth();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const activeRefreshRef = useRef(false);
  const apartmentsRef = useRef<Apartment[]>([]);

  const refreshApartments = useCallback(async () => {
    if (activeRefreshRef.current) {
      return;
    }

    activeRefreshRef.current = true;
    const requestId = ++requestIdRef.current;
    const hasExistingApartments = apartmentsRef.current.length > 0;

    if (hasExistingApartments) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const rows = await fetchApartments();
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setApartments(rows);
        setError(null);
        setLastUpdatedAt(new Date().toISOString());
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load apartments.';
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setError(message);
        if (!hasExistingApartments) {
          setApartments([]);
        }
      }
    } finally {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
      activeRefreshRef.current = false;
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
    if (authIsLoading) return;
    setApartments([]);
    apartmentsRef.current = [];
    setError(null);
    setIsLoading(true);
    setIsRefreshing(false);
    void refreshApartments();
  }, [authIsLoading, refreshApartments, user?.id, user?.role]);

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void refreshApartments(), 100);
    };
    const channel = supabase
      .channel('apartments-context-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apartments' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apartment_rooms' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apartment_images' }, scheduleRefresh)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_users', filter: 'role=eq.landlord' },
        scheduleRefresh,
      )
      .subscribe();
    const refreshOnFocus = () => void refreshApartments();
    window.addEventListener('focus', refreshOnFocus);
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      window.removeEventListener('focus', refreshOnFocus);
      void supabase.removeChannel(channel);
    };
  }, [refreshApartments]);

  const value = useMemo(
    () => ({
      apartments,
      isLoading,
      isRefreshing,
      error,
      lastUpdatedAt,
      refreshApartments,
    }),
    [apartments, isLoading, isRefreshing, error, lastUpdatedAt, refreshApartments],
  );

  return <ApartmentsContext.Provider value={value}>{children}</ApartmentsContext.Provider>;
}

export function useApartmentsContext(): ApartmentsContextType {
  const context = useContext(ApartmentsContext);

  if (context === undefined) {
    throw new Error('useApartmentsContext must be used within ApartmentsProvider');
  }

  return context;
}
