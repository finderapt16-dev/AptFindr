import { useCallback, useMemo } from 'react';
import type { Apartment } from '../data/apartments';
import { rankApartments, getStudentRecommendations, getEmployeeRecommendations, getRecommendationExplanation, type TenantPreferences, type RankingScoreBreakdown } from '../utils/rankingEngine';

export interface RankedApartment extends Apartment {
  rankingScore: number;
  scoreBreakdown: RankingScoreBreakdown;
}

export interface UseApartmentRankingOptions {
  apartments: Apartment[];
  userRole?: 'student' | 'employee' | 'landlord' | 'admin' | string;
  preferences?: TenantPreferences;
  userFavoriteIds?: string[];
}

/**
 * Hook for apartment ranking with memoization and easy preference management
 */
export function useApartmentRanking(options: UseApartmentRankingOptions) {
  const { apartments, userRole, preferences, userFavoriteIds = [] } = options;

  // Get general ranked apartments
  const rankedApartments = useMemo(() => {
    if (apartments.length === 0) return [];
    return rankApartments(apartments, preferences, userFavoriteIds);
  }, [apartments, preferences, userFavoriteIds]);

  // Get student recommendations
  const studentRecommendations = useMemo(() => {
    if (apartments.length === 0 || userRole !== 'student') return [];
    return getStudentRecommendations(apartments, preferences);
  }, [apartments, preferences, userRole]);

  // Get employee recommendations
  const employeeRecommendations = useMemo(() => {
    if (apartments.length === 0 || userRole !== 'employee') return [];
    return getEmployeeRecommendations(apartments, preferences);
  }, [apartments, preferences, userRole]);

  // Get personalized recommendations based on role
  const personalizedRecommendations = useMemo(() => {
    if (userRole === 'student') return studentRecommendations;
    if (userRole === 'employee') return employeeRecommendations;
    return rankedApartments;
  }, [userRole, studentRecommendations, employeeRecommendations, rankedApartments]);

  // Get explanation for top apartment
  const topApartmentExplanation = useMemo(() => {
    if (personalizedRecommendations.length === 0) return null;
    const topApt = personalizedRecommendations[0];
    return getRecommendationExplanation(topApt.scoreBreakdown);
  }, [personalizedRecommendations]);

  // Get apartments by score range (useful for grouping)
  const getApartmentsByScoreRange = useCallback((minScore: number, maxScore: number) => {
    return rankedApartments.filter(apt => apt.rankingScore >= minScore && apt.rankingScore <= maxScore);
  }, [rankedApartments]);

  // Get top N apartments
  const getTopApartments = useCallback((count: number = 6) => {
    return personalizedRecommendations.slice(0, count);
  }, [personalizedRecommendations]);

  return {
    // All ranked apartments
    rankedApartments,
    
    // Personalized based on role
    personalizedRecommendations,
    
    // Role-specific recommendations
    studentRecommendations,
    employeeRecommendations,
    
    // Explanation for top apartment
    topApartmentExplanation,
    
    // Utility functions
    getApartmentsByScoreRange,
    getTopApartments,
    
    // Score of apartment (for display/debugging)
    getApartmentScore: (apartmentId: string): number | undefined => {
      return rankedApartments.find(apt => apt.id === apartmentId)?.rankingScore;
    },
    
    // Get score breakdown (for detailed view)
    getScoreBreakdown: (apartmentId: string): RankingScoreBreakdown | undefined => {
      return rankedApartments.find(apt => apt.id === apartmentId)?.scoreBreakdown;
    },
    
    // Check if apartment is in top recommendations
    isTopRecommended: (apartmentId: string, topCount: number = 6): boolean => {
      return personalizedRecommendations.slice(0, topCount).some(apt => apt.id === apartmentId);
    },
  };
}

/**
 * Hook for managing tenant preferences with localStorage persistence
 */
export function useTenantPreferences(userId?: string) {
  const storageKey = userId ? `userPreferences_${userId}` : 'defaultPreferences';

  const loadPreferences = useCallback((): TenantPreferences | null => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [storageKey]);

  const savePreferences = useCallback((preferences: TenantPreferences) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
      return true;
    } catch {
      return false;
    }
  }, [storageKey]);

  const updatePreferences = useCallback((updates: Partial<TenantPreferences>) => {
    const current = loadPreferences() || {};
    const merged = { ...current, ...updates };
    return savePreferences(merged);
  }, [loadPreferences, savePreferences]);

  const clearPreferences = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      return true;
    } catch {
      return false;
    }
  }, [storageKey]);

  return {
    loadPreferences,
    savePreferences,
    updatePreferences,
    clearPreferences,
  };
}
