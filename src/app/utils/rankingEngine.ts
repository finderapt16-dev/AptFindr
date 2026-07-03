import type { Apartment } from "../data/apartments";

/**
 * WEIGHTED RANKING ALGORITHM FOR APARTMENT DISCOVERY
 * ====================================================
 * Comprehensive recommendation engine for tenant personalization
 * 
 * Scoring Breakdown:
 * - Location Match (30%)
 * - Budget Compatibility (25%)
 * - Room Availability (15%)
 * - Amenities Match (10%)
 * - Property Verification (10%)
 * - Popularity & Engagement (5%)
 * - Recent Activity (5%)
 */

export type TenantType = 'student' | 'employee';

export interface RankingScoreBreakdown {
  locationScore: number;           // 0-100 (30% weight)
  budgetScore: number;             // 0-100 (25% weight)
  availabilityScore: number;       // 0-100 (15% weight)
  amenitiesScore: number;          // 0-100 (10% weight)
  verificationScore: number;       // 0-100 (10% weight)
  popularityScore: number;         // 0-100 (5% weight)
  activityScore: number;           // 0-100 (5% weight)
  finalScore: number;              // 0-100 (weighted total)
}

export interface TenantPreferences {
  maxBudget?: number;
  preferredArea?: string;
  preferredBarangay?: string;
  tenantType?: TenantType;
  petFriendly?: boolean;
  parking?: boolean;
  furnished?: boolean;
  wifi?: boolean;
  ac?: boolean;
  studyArea?: boolean;
  laundryArea?: boolean;
  kitchenAccess?: boolean;
}

export interface RankingContext {
  userPreferences?: TenantPreferences;
  userFavoriteIds?: string[];
  userViewedIds?: string[];
  landlordVerifications?: Map<string, boolean>;
  apartmentApplications?: Map<string, number>;
  apartmentViewCounts?: Map<string, number>;
  apartmentFavoriteCounts?: Map<string, number>;
}

// ============================================================================
// LOCATION MATCH SCORING (30% weight)
// ============================================================================

/**
 * Calculate location match score based on preferred area and La Paz bonus
 */
function calculateLocationScore(
  apartment: Apartment,
  preferences?: TenantPreferences
): number {
  let score = 0;

  // Base: La Paz areas get highest score (primary market)
  const isPrimaryArea = (city: string): boolean => {
    const laPazAliases = ['la paz', 'lapaz', 'lapaz city'];
    return laPazAliases.some(alias => city.toLowerCase().includes(alias));
  };

  const isSecondaryArea = (city: string): boolean => {
    const secondary = ['iloilo', 'jaro', 'mandurriao', 'arevalo'];
    return secondary.some(area => city.toLowerCase().includes(area));
  };

  if (isPrimaryArea(apartment.city)) {
    score += 70; // La Paz apartments score high
  } else if (isSecondaryArea(apartment.city)) {
    score += 40; // Secondary areas get moderate boost
  } else {
    score += 20; // Other areas get minimal boost
  }

  // Preferred area match
  if (preferences?.preferredArea) {
    const query = preferences.preferredArea.toLowerCase();
    if (apartment.city.toLowerCase().includes(query) || 
        apartment.address.toLowerCase().includes(query)) {
      score += 30; // Exact match bonus
    } else if (apartment.description.toLowerCase().includes(query)) {
      score += 15; // Mentioned in description
    }
  }

  // Preferred barangay match (if specified)
  if (preferences?.preferredBarangay) {
    const barangay = preferences.preferredBarangay.toLowerCase();
    if (apartment.address.toLowerCase().includes(barangay)) {
      score += 30; // Barangay match bonus
    }
  }

  return Math.min(score, 100); // Cap at 100
}

// ============================================================================
// BUDGET COMPATIBILITY SCORING (25% weight)
// ============================================================================

/**
 * Calculate budget compatibility score
 */
function calculateBudgetScore(
  apartment: Apartment,
  preferences?: TenantPreferences
): number {
  if (!preferences?.maxBudget) {
    return 50; // Neutral if no preference
  }

  const { price } = apartment;
  const { maxBudget } = preferences;

  // Within budget: highest score
  if (price <= maxBudget) {
    const ratio = price / maxBudget;
    // Apartments at 80-100% of budget get full score
    if (ratio >= 0.8) return 100;
    // Cheaper options still get high scores
    return 50 + ratio * 50;
  }

  // Slightly above budget: moderate penalty
  const overage = (price - maxBudget) / maxBudget;
  if (overage <= 0.15) { // Up to 15% over budget
    return 50 - (overage * 100);
  }

  // Significantly above budget: minimal score
  if (overage <= 0.5) { // Up to 50% over budget
    return 20 - (overage * 20);
  }

  // Way over budget: negligible score
  return Math.max(0, 5 - (overage * 5));
}

// ============================================================================
// ROOM AVAILABILITY SCORING (15% weight)
// ============================================================================

/**
 * Calculate availability score based on room status and availability date
 */
function calculateAvailabilityScore(apartment: Apartment): number {
  let score = 0;

  // Check apartment status
  if (apartment.status === 'available') {
    score += 50;
  } else if (apartment.status === 'reserved') {
    score += 25;
  } else if (apartment.status === 'occupied') {
    score += 10;
  } else if (apartment.status === 'maintenance') {
    score += 0;
  }

  // Check room availability
  if (apartment.rooms && apartment.rooms.length > 0) {
    const availableRooms = apartment.rooms.filter(r => r.status === 'available' || !r.isOccupied).length;
    const totalRooms = apartment.rooms.length;
    const availabilityRatio = availableRooms / totalRooms;
    
    // More available rooms = higher score
    score += availabilityRatio * 50;
  } else {
    score += 50; // No rooms listed = assume unit is available
  }

  // Availability date bonus (recently available or immediately available)
  const availableDate = new Date(apartment.availableDate);
  const now = new Date();
  const daysUntilAvailable = Math.floor((availableDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilAvailable <= 0) {
    score += 0; // Already available, no bonus needed
  } else if (daysUntilAvailable <= 7) {
    score += 10; // Available very soon
  } else if (daysUntilAvailable <= 30) {
    score += 5; // Available within a month
  }

  return Math.min(score, 100);
}

// ============================================================================
// AMENITIES MATCH SCORING (10% weight)
// ============================================================================

/**
 * Extract amenities from apartment (normalize from various formats)
 */
function getApartmentAmenities(apartment: Apartment): Set<string> {
  const amenities = new Set<string>();

  // From amenities array
  if (apartment.amenities && Array.isArray(apartment.amenities)) {
    apartment.amenities.forEach(a => {
      if (typeof a === 'string') {
        amenities.add(a.toLowerCase().trim());
      }
    });
  }

  // From individual boolean properties
  if (apartment.wifi) amenities.add('wifi');
  if (apartment.parking) amenities.add('parking');
  if (apartment.furnished) amenities.add('furnished');
  if (apartment.petFriendly) amenities.add('pet friendly');

  // From rooms (if available)
  if (apartment.rooms?.some(r => r.hasAC)) amenities.add('air conditioning');

  // From features object
  if (apartment.features && typeof apartment.features === 'object' && !Array.isArray(apartment.features)) {
    const featureKeys = Object.keys(apartment.features as Record<string, any>);
    featureKeys.forEach(key => {
      const value = (apartment.features as Record<string, any>)[key];
      if (value) {
        amenities.add(key.toLowerCase());
      }
    });
  }

  return amenities;
}

/**
 * Calculate amenities match score based on tenant preferences
 */
function calculateAmenitiesScore(
  apartment: Apartment,
  preferences?: TenantPreferences
): number {
  const preferredAmenities = [];

  // Collect preferences
  if (preferences?.wifi) preferredAmenities.push('wifi');
  if (preferences?.ac) preferredAmenities.push('air conditioning');
  if (preferences?.studyArea) preferredAmenities.push('study area');
  if (preferences?.parking) preferredAmenities.push('parking');
  if (preferences?.laundryArea) preferredAmenities.push('laundry area');
  if (preferences?.kitchenAccess) preferredAmenities.push('kitchen access');
  if (preferences?.furnished) preferredAmenities.push('furnished');
  if (preferences?.petFriendly) preferredAmenities.push('pet friendly');

  if (preferredAmenities.length === 0) {
    return 50; // Neutral if no preferences
  }

  const apartmentAmenities = getApartmentAmenities(apartment);
  let matchCount = 0;

  preferredAmenities.forEach(pref => {
    if (apartmentAmenities.has(pref.toLowerCase())) {
      matchCount++;
    }
  });

  const matchRatio = matchCount / preferredAmenities.length;
  return Math.round(matchRatio * 100);
}

// ============================================================================
// PROPERTY VERIFICATION SCORING (10% weight)
// ============================================================================

/**
 * Calculate verification score for apartment and landlord
 */
function calculateVerificationScore(
  apartment: Apartment,
  verificationMap?: Map<string, boolean>
): number {
  let score = 0;

  // Landlord verification (primary factor)
  if (apartment.landlordVerified === true || (apartment.landlordId && verificationMap?.get(apartment.landlordId))) {
    score += 60;
  }

  // Apartment verification (check features)
  if (apartment.features && typeof apartment.features === 'object' && !Array.isArray(apartment.features)) {
    const features = apartment.features as Record<string, any>;
    
    if (features.verification?.landlord_verified) score += 20;
    if (features.verification?.apartment_verified) score += 20;
    if (features.isVerified) score += 20;
  }

  // Check if apartment status indicates verification
  if (apartment.isPublished) {
    score += 10; // Published apartments have gone through some review
  }

  return Math.min(score, 100);
}

// ============================================================================
// POPULARITY & ENGAGEMENT SCORING (5% weight)
// ============================================================================

/**
 * Calculate popularity score based on views, favorites, and applications
 */
function calculatePopularityScore(
  apartment: Apartment,
  context?: RankingContext
): number {
  let score = 0;

  // View count (up to 50 views)
  const views = context?.apartmentViewCounts?.get(apartment.id) ?? getApartmentViewCount(apartment.id);
  const normalizedViews = Math.min(views / 50, 1);
  score += normalizedViews * 40;

  // Favorite count (up to 20 favorites)
  const favorites = context?.apartmentFavoriteCounts?.get(apartment.id) ?? getApartmentFavoriteCount(apartment.id);
  const normalizedFavorites = Math.min(favorites / 20, 1);
  score += normalizedFavorites * 40;

  // Application count (if available)
  if (context?.apartmentApplications) {
    const applications = context.apartmentApplications.get(apartment.id) || 0;
    const normalizedApps = Math.min(applications / 10, 1);
    score += normalizedApps * 20;
  }

  return Math.min(score, 100);
}

// ============================================================================
// RECENT ACTIVITY SCORING (5% weight)
// ============================================================================

/**
 * Calculate recent activity score for apartments
 */
function calculateActivityScore(apartment: Apartment): number {
  const now = new Date();
  const createdDate = apartment.createdAt ? new Date(apartment.createdAt) : null;
  const availableDate = new Date(apartment.availableDate);

  let score = 0;

  // Recently updated/created listings get boost
  if (createdDate) {
    const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceCreated <= 3) {
      score += 100; // Newest listings
    } else if (daysSinceCreated <= 7) {
      score += 80; // Last week
    } else if (daysSinceCreated <= 14) {
      score += 60; // Last two weeks
    } else if (daysSinceCreated <= 30) {
      score += 40; // Last month
    } else if (daysSinceCreated <= 60) {
      score += 20; // Last two months
    } else {
      score += 10; // Older listings
    }
  }

  // Recently became available
  const daysSinceAvailable = Math.floor((now.getTime() - availableDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceAvailable <= 3 && daysSinceAvailable >= 0) {
    score = Math.min(score + 30, 100);
  }

  return Math.min(score, 100);
}

// ============================================================================
// DATA ACCESS HELPERS
// ============================================================================

/**
 * Get apartment view count from localStorage (or Supabase if available)
 */
function getApartmentViewCount(apartmentId: string): number {
  try {
    const views = JSON.parse(localStorage.getItem('apartmentViews') || '[]');
    return views.filter((v: any) => v.apartmentId === apartmentId || v.apartment_id === apartmentId).length;
  } catch {
    return 0;
  }
}

/**
 * Get apartment favorite count from localStorage (or Supabase if available)
 */
function getApartmentFavoriteCount(apartmentId: string): number {
  try {
    // Try new format first
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favs.filter((f: any) => f.apartmentId === apartmentId || f.apartment_id === apartmentId).length;
  } catch {
    return 0;
  }
}

/**
 * Get landlord verification status from localStorage or context
 */
function getLandlordVerificationMap(verificationMap?: Map<string, boolean>): Map<string, boolean> {
  const map = new Map<string, boolean>(verificationMap);

  // Try to populate from localStorage users
  try {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    users.forEach((user: any) => {
      if (user.id && (user.isVerified === true || user.is_verified === true)) {
        map.set(user.id, true);
      }
    });
  } catch {
    // Silently continue
  }

  return map;
}

// ============================================================================
// MAIN RANKING FUNCTIONS
// ============================================================================

/**
 * Calculate detailed breakdown for an apartment
 */
export function calculateRankingScoreBreakdown(
  apartment: Apartment,
  preferences?: TenantPreferences,
  context?: RankingContext
): RankingScoreBreakdown {
  const verificationMap = getLandlordVerificationMap(context?.landlordVerifications);

  const locationScore = calculateLocationScore(apartment, preferences);
  const budgetScore = calculateBudgetScore(apartment, preferences);
  const availabilityScore = calculateAvailabilityScore(apartment);
  const amenitiesScore = calculateAmenitiesScore(apartment, preferences);
  const verificationScore = calculateVerificationScore(apartment, verificationMap);
  const popularityScore = calculatePopularityScore(apartment, context);
  const activityScore = calculateActivityScore(apartment);

  // Apply weights: 30%, 25%, 15%, 10%, 10%, 5%, 5%
  const finalScore = Math.round(
    (locationScore * 0.30) +
    (budgetScore * 0.25) +
    (availabilityScore * 0.15) +
    (amenitiesScore * 0.10) +
    (verificationScore * 0.10) +
    (popularityScore * 0.05) +
    (activityScore * 0.05)
  );

  return {
    locationScore,
    budgetScore,
    availabilityScore,
    amenitiesScore,
    verificationScore,
    popularityScore,
    activityScore,
    finalScore,
  };
}

/**
 * Main ranking function - returns apartments sorted by relevance
 */
export function rankApartments(
  apartments: Apartment[],
  preferences?: TenantPreferences,
  userFavoriteIds?: string[],
  context?: Partial<RankingContext>
): Array<Apartment & { rankingScore: number; scoreBreakdown: RankingScoreBreakdown }> {
  const rankingContext: RankingContext = {
    userPreferences: preferences,
    userFavoriteIds,
    landlordVerifications: context?.landlordVerifications,
    apartmentApplications: context?.apartmentApplications,
    apartmentViewCounts: context?.apartmentViewCounts,
    apartmentFavoriteCounts: context?.apartmentFavoriteCounts,
  };

  return apartments
    .map(apt => {
      const scoreBreakdown = calculateRankingScoreBreakdown(apt, preferences, rankingContext);
      
      // Boost score if user has favorited
      let finalScore = scoreBreakdown.finalScore;
      if (userFavoriteIds?.includes(apt.id)) {
        finalScore = Math.min(100, finalScore + 15); // 15 point boost for favorites
      }

      return {
        ...apt,
        rankingScore: finalScore,
        scoreBreakdown,
      };
    })
    .sort((a, b) => b.rankingScore - a.rankingScore);
}

/**
 * Get student-specific recommendations
 * Prioritizes: student-friendly, near schools, affordable, shared rooms
 */
export function getStudentRecommendations(
  apartments: Apartment[],
  preferences?: TenantPreferences
): Array<Apartment & { rankingScore: number; scoreBreakdown: RankingScoreBreakdown }> {
  // Boost student-friendly features
  const studentPrefs: TenantPreferences = {
    ...preferences,
    maxBudget: preferences?.maxBudget || 4500, // Student budget default
    studyArea: true,
    wifi: true,
    furnished: true,
  };

  const ranked = rankApartments(apartments, studentPrefs);

  // Bonus for affordable options
  return ranked.map(apt => ({
    ...apt,
    rankingScore: apt.price <= 3500 ? Math.min(100, apt.rankingScore + 10) : apt.rankingScore,
  })).sort((a, b) => b.rankingScore - a.rankingScore);
}

/**
 * Get employee-specific recommendations  * Prioritizes: near workplace, private rooms, professional-friendly
 */
export function getEmployeeRecommendations(
  apartments: Apartment[],
  preferences?: TenantPreferences
): Array<Apartment & { rankingScore: number; scoreBreakdown: RankingScoreBreakdown }> {
  // Boost employee-friendly features
  const employeePrefs: TenantPreferences = {
    ...preferences,
    maxBudget: preferences?.maxBudget || 6500, // Employee budget default
    parking: true,
    ac: true,
    kitchenAccess: true,
  };

  const ranked = rankApartments(apartments, employeePrefs);

  // Bonus for high-quality, verified properties
  return ranked.map(apt => ({
    ...apt,
    rankingScore: apt.isPublished && apt.landlordId ? Math.min(100, apt.rankingScore + 8) : apt.rankingScore,
  })).sort((a, b) => b.rankingScore - a.rankingScore);
}

/**
 * Get recommendation explanation for UI display
 */
export function getRecommendationExplanation(breakdown: RankingScoreBreakdown): string {
  const factors: Array<{ label: string; score: number; weight: number }> = [
    { label: 'Location', score: breakdown.locationScore, weight: 0.30 },
    { label: 'Budget fit', score: breakdown.budgetScore, weight: 0.25 },
    { label: 'Availability', score: breakdown.availabilityScore, weight: 0.15 },
    { label: 'Amenities', score: breakdown.amenitiesScore, weight: 0.10 },
    { label: 'Verification', score: breakdown.verificationScore, weight: 0.10 },
    { label: 'Popularity', score: breakdown.popularityScore, weight: 0.05 },
    { label: 'Recent activity', score: breakdown.activityScore, weight: 0.05 },
  ]
    .filter(f => f.score > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  const topFactors = factors.map(f => f.label).join(', ');
  return `Recommended based on your preferences, ${topFactors}, and apartment availability.`;
}

/**
 * Debug function to log detailed ranking info (for admin/testing)
 */
export function debugApartmentRanking(
  apartment: Apartment,
  breakdown: RankingScoreBreakdown
): void {
  console.log(`
  ╔════════════════════════════════════════════════════════════╗
  ║ APARTMENT RANKING DEBUG
  ║ ${apartment.title}
  ╠════════════════════════════════════════════════════════════╣
  ║ Location Score:       ${breakdown.locationScore.toString().padStart(3)} / 100 (30%)
  ║ Budget Score:         ${breakdown.budgetScore.toString().padStart(3)} / 100 (25%)
  ║ Availability Score:   ${breakdown.availabilityScore.toString().padStart(3)} / 100 (15%)
  ║ Amenities Score:      ${breakdown.amenitiesScore.toString().padStart(3)} / 100 (10%)
  ║ Verification Score:   ${breakdown.verificationScore.toString().padStart(3)} / 100 (10%)
  ║ Popularity Score:     ${breakdown.popularityScore.toString().padStart(3)} / 100 (5%)
  ║ Activity Score:       ${breakdown.activityScore.toString().padStart(3)} / 100 (5%)
  ╠════════════════════════════════════════════════════════════╣
  ║ FINAL SCORE:          ${breakdown.finalScore.toString().padStart(3)} / 100
  ╚════════════════════════════════════════════════════════════╝
  `);
}

