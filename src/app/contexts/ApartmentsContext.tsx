import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import type { Apartment } from '../data/apartments';
import { fetchApartments } from '../data/apartments';

interface ApartmentsContextType {
  apartments: Apartment[];
  isLoading: boolean;
  error: string | null;
  refreshApartments: () => Promise<void>;
}

const ApartmentsContext = createContext<ApartmentsContextType | undefined>(undefined);

export function ApartmentsProvider({ children }: { children: ReactNode }): ReactElement {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshApartments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const rows = await fetchApartments();
      setApartments(rows);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load apartments.';
      setError(message);
      setApartments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshApartments();
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
