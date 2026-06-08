import type { Apartment } from "../data/apartments";

/**
 * Weighted Ranking Algorithm for Apartment Discovery
 * Calculates a comprehensive relevance score for each apartment
 */

export interface RankingFactors {
  viewCount: number;
  favoriteCount: number;
  isLandlordVerified: boolean;
  isFurnished: boolean;
  isPetFriendly: boolean;
  hasParking: boolean;
  priceMatch: number; // 0-1, higher = better match to user budget
  availabilityRecency: number; // 0-1, how recent the available date is
  userHasFavorited: boolean;
  distanceMatch: number; // 0-1, if user has location preference
}

export interface RankingWeights {
  viewCount: number;
  favoriteCount: number;
  landlordVerification: number;
  furnished: number;
  petFriendly: number;
  parking: number;
  priceMatch: number;
  availabilityRecency: number;
  userFavorite: number;
  distanceMatch: number;
}

// Default weights for the ranking algorithm
export const DEFAULT_WEIGHTS: RankingWeights = {
  viewCount: 0.15,              // 15% - Popular apartments shown more
  favoriteCount: 0.20,          // 20% - Highly favorited apartments ranked higher
  landlordVerification: 0.10,   // 10% - Verified landlords get boost
  furnished: 0.08,              // 8% - Furnished status boost
  petFriendly: 0.07,            // 7% - Pet-friendly boost
  parking: 0.07,                // 7% - Parking boost
  priceMatch: 0.12,             // 12% - Price fit is important
  availabilityRecency: 0.08,    // 8% - Recent listings prioritized
  userFavorite: 0.10,           // 10% - User's own favorites boosted
  distanceMatch: 0.03,          // 3% - Location preference (if applicable)
};

/**
 * Calculate ranking factors for an apartment
 */
export function calculateRankingFactors(
  apartment: Apartment,
  userPreferences?: {
    maxBudget?: number;
    preferredArea?: string;
    petFriendly?: boolean;
    parking?: boolean;
    furnished?: boolean;
  },
  userFavorites?: string[],
  landlordVerifications?: { [id: string]: boolean }
): RankingFactors {
  // Get view and favorite counts from localStorage
  const viewCount = getApartmentViews(apartment.id).length;
  const favoriteCount = getApartmentFavorites(apartment.id).length;
  const isLandlordVerified = landlordVerifications?.[apartment.landlordId || ""] || false;
  const userHasFavorited = userFavorites?.includes(apartment.id) || false;

  // Calculate price match (1 = perfect match, 0 = too expensive or way too cheap)
  const priceMatch = calculatePriceMatch(
    apartment.price,
    userPreferences?.maxBudget
  );

  // Calculate availability recency (1 = available soon, 0 = far future)
  const availabilityRecency = calculateAvailabilityRecency(apartment.availableDate);

  // Calculate distance match (simplified - 1 if matches, 0 if doesn't)
  const distanceMatch = calculateDistanceMatch(
    apartment.city,
    userPreferences?.preferredArea
  );

  return {
    viewCount,
    favoriteCount,
    isLandlordVerified,
    isFurnished: apartment.furnished,
    isPetFriendly: apartment.petFriendly,
    hasParking: apartment.parking,
    priceMatch,
    availabilityRecency,
    userHasFavorited,
    distanceMatch,
  };
}

/**
 * Calculate overall ranking score for an apartment (0-100)
 */
export function calculateRankingScore(
  apartment: Apartment,
  factors: RankingFactors,
  weights: RankingWeights = DEFAULT_WEIGHTS,
  userPreferences?: {
    petFriendly?: boolean;
    parking?: boolean;
    furnished?: boolean;
  }
): number {
  let score = 0;

  // Normalize view count (cap at 100 views for scoring)
  const normalizedViews = Math.min(factors.viewCount / 100, 1);
  score += normalizedViews * weights.viewCount * 100;

  // Normalize favorite count (cap at 50 favorites for scoring)
  const normalizedFavorites = Math.min(factors.favoriteCount / 50, 1);
  score += normalizedFavorites * weights.favoriteCount * 100;

  // Landlord verification boost
  if (factors.isLandlordVerified) {
    score += weights.landlordVerification * 100;
  }

  // Furnished boost (if apartment is furnished)
  if (factors.isFurnished) {
    score += weights.furnished * 100;
  }

  // Pet-friendly boost (if user cares and apartment supports it)
  if (userPreferences?.petFriendly && factors.isPetFriendly) {
    score += weights.petFriendly * 100;
  }

  // Parking boost (if user cares and apartment has it)
  if (userPreferences?.parking && factors.hasParking) {
    score += weights.parking * 100;
  }

  // Price match (very important for relevance)
  score += factors.priceMatch * weights.priceMatch * 100;

  // Availability recency
  score += factors.availabilityRecency * weights.availabilityRecency * 100;

  // User's own favorites get significant boost
  if (factors.userHasFavorited) {
    score += weights.userFavorite * 100;
  }

  // Distance/location match
  score += factors.distanceMatch * weights.distanceMatch * 100;

  return Math.round(score);
}

/**
 * Helper: Calculate price match score (0-1)
 * 1 = perfect match, 0.5 = acceptable, 0 = too expensive
 */
function calculatePriceMatch(apartmentPrice: number, maxBudget?: number): number {
  if (!maxBudget) return 0.5; // Neutral if no preference

  if (apartmentPrice <= maxBudget) {
    // Price is within budget
    const ratio = apartmentPrice / maxBudget;
    return Math.max(0.5, ratio); // At least 0.5 for being within budget
  } else {
    // Price exceeds budget
    const overage = (apartmentPrice - maxBudget) / maxBudget;
    return Math.max(0, 0.5 - overage * 0.5); // Penalize for being over budget
  }
}

/**
 * Helper: Calculate availability recency (0-1)
 * 1 = available very soon, 0 = far in the future
 */
function calculateAvailabilityRecency(availableDate: string): number {
  const available = new Date(availableDate).getTime();
  const now = new Date().getTime();
  const daysUntilAvailable = (available - now) / (1000 * 60 * 60 * 24);

  if (daysUntilAvailable <= 0) return 1; // Already available
  if (daysUntilAvailable <= 30) return 0.8; // Very soon
  if (daysUntilAvailable <= 60) return 0.6; // Soon
  if (daysUntilAvailable <= 90) return 0.4; // Moderate
  return 0.2; // Far future
}

/**
 * Helper: Calculate distance/location match (0-1)
 */
function calculateDistanceMatch(
  apartmentCity: string,
  preferredArea?: string
): number {
  if (!preferredArea) return 0.5; // Neutral if no preference

  // Simple city name matching
  if (apartmentCity.toLowerCase().includes(preferredArea.toLowerCase())) {
    return 1;
  }
  if (preferredArea.toLowerCase().includes(apartmentCity.toLowerCase())) {
    return 1;
  }

  // Adjacent cities (simplified)
  const adjacentCities: { [key: string]: string[] } = {
    "la paz": ["iloilo city", "jaro", "arevalo"],
    "iloilo city": ["la paz", "jaro", "mandurriao"],
    jaro: ["la paz", "iloilo city", "mandurriao"],
  };

  const key = apartmentCity.toLowerCase();
  if (adjacentCities[key]?.some(city => city.includes(preferredArea.toLowerCase()))) {
    return 0.7; // Adjacent city
  }

  return 0.3; // Different area
}

/**
 * Get apartment view count from localStorage
 */
function getApartmentViews(apartmentId: string): any[] {
  const views = JSON.parse(localStorage.getItem("apartmentViews") || "[]");
  return views.filter((v: any) => v.apartmentId === apartmentId);
}

/**
 * Get apartment favorite count from localStorage
 */
function getApartmentFavorites(apartmentId: string): any[] {
  const favorites = JSON.parse(localStorage.getItem("apartmentFavorites") || "[]");
  return favorites.filter((f: any) => f.apartmentId === apartmentId);
}

/**
 * Rank apartments using weighted algorithm
 * Returns apartments sorted by relevance score
 */
export function rankApartments(
  apartments: Apartment[],
  userPreferences?: {
    maxBudget?: number;
    preferredArea?: string;
    petFriendly?: boolean;
    parking?: boolean;
    furnished?: boolean;
  },
  userFavorites?: string[],
  weights: RankingWeights = DEFAULT_WEIGHTS
): Array<Apartment & { rankingScore: number }> {
  // Get landlord verification info
  const usersStr = localStorage.getItem("users");
  const users: any[] = usersStr ? JSON.parse(usersStr) : [];
  const landlordVerifications: { [id: string]: boolean } = {};
  users.forEach(u => {
    if (u.isVerified) landlordVerifications[u.id] = true;
  });

  // Calculate scores for each apartment
  const rankedApartments = apartments.map(apt => {
    const factors = calculateRankingFactors(
      apt,
      userPreferences,
      userFavorites,
      landlordVerifications
    );

    const score = calculateRankingScore(apt, factors, weights, userPreferences);

    return {
      ...apt,
      rankingScore: score,
    };
  });

  // Sort by score descending
  return rankedApartments.sort((a, b) => b.rankingScore - a.rankingScore);
}

/**
 * Get debug info about ranking for an apartment (for testing/admin)
 */
export function getApartmentRankingDebugInfo(
  apartment: Apartment,
  userPreferences?: any,
  userFavorites?: string[]
): {
  apartment: string;
  score: number;
  factors: RankingFactors;
  breakdown: { [key: string]: number };
} {
  const usersStr = localStorage.getItem("users");
  const users: any[] = usersStr ? JSON.parse(usersStr) : [];
  const landlordVerifications: { [id: string]: boolean } = {};
  users.forEach(u => {
    if (u.isVerified) landlordVerifications[u.id] = true;
  });

  const factors = calculateRankingFactors(
    apartment,
    userPreferences,
    userFavorites,
    landlordVerifications
  );

  const score = calculateRankingScore(apartment, factors, DEFAULT_WEIGHTS, userPreferences);

  // Build detailed breakdown
  const breakdown: { [key: string]: number } = {
    viewCount: (Math.min(factors.viewCount / 100, 1) * DEFAULT_WEIGHTS.viewCount * 100),
    favoriteCount: (Math.min(factors.favoriteCount / 50, 1) * DEFAULT_WEIGHTS.favoriteCount * 100),
    landlordVerification: (factors.isLandlordVerified ? DEFAULT_WEIGHTS.landlordVerification * 100 : 0),
    furnished: (factors.isFurnished ? DEFAULT_WEIGHTS.furnished * 100 : 0),
    petFriendly: (userPreferences?.petFriendly && factors.isPetFriendly ? DEFAULT_WEIGHTS.petFriendly * 100 : 0),
    parking: (userPreferences?.parking && factors.hasParking ? DEFAULT_WEIGHTS.parking * 100 : 0),
    priceMatch: (factors.priceMatch * DEFAULT_WEIGHTS.priceMatch * 100),
    availabilityRecency: (factors.availabilityRecency * DEFAULT_WEIGHTS.availabilityRecency * 100),
    userFavorite: (factors.userHasFavorited ? DEFAULT_WEIGHTS.userFavorite * 100 : 0),
    distanceMatch: (factors.distanceMatch * DEFAULT_WEIGHTS.distanceMatch * 100),
  };

  return {
    apartment: apartment.title,
    score,
    factors,
    breakdown,
  };
}

