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

import { supabase } from '../../lib/supabaseclient';
import type { Apartment } from '../data/apartments';
import { fetchApartments } from '../data/apartments';
import { useAuth } from './AuthContext';

interface ApartmentsContextType {
  apartments: Apartment[];
  isLoading: boolean;
  error: string | null;
  refreshApartments: () => Promise<void>;
}

const ApartmentsContext = createContext<ApartmentsContextType | undefined>(undefined);

export function ApartmentsProvider({ children }: { children: ReactNode }): ReactElement {
  const { user, isLoading: authIsLoading } = useAuth();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refreshApartments = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const rows = await fetchApartments();
      if (requestId === requestIdRef.current) setApartments(rows);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load apartments.';
      if (requestId === requestIdRef.current) {
        setError(message);
        setApartments([]);
      }
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authIsLoading) return;
    setApartments([]);
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
      error,
      refreshApartments,
    }),
    [apartments, isLoading, error, refreshApartments],
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
