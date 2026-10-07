import {
  fetchApartmentViews,
  fetchFavoritesForApartments,
  fetchNotifications,
  fetchViewActivityForApartments,
} from "@/services/dashboardSupabaseService";
import { fetchRatingsForApartments } from "@/services/apartmentRatingsService";
import { supabase } from "@/services/supabaseClient";

const EMPTY_PREFERENCE_ANALYTICS = {
  preferredAreas: [],
  amenities: [],
  bedrooms: [],
  roomCapacity: [],
  priceRanges: [],
};

async function fetchTenantPreferenceAnalytics() {
  const { data, error } = await supabase.rpc("fn_get_tenant_preference_analytics");

  if (error) {
    console.warn("Tenant preference analytics are unavailable:", error.message);
    return {
      data: EMPTY_PREFERENCE_ANALYTICS,
      error: error.code === "PGRST202"
        ? "Install the tenant preference analytics database function to display these charts."
        : "Tenant preference analytics are currently unavailable.",
    };
  }

  return {
    data: data && typeof data === "object" ? data : EMPTY_PREFERENCE_ANALYTICS,
    error: "",
  };
}

/**
 * Loads the existing engagement sources used by the landlord market page.
 * This deliberately composes the established services rather than duplicating
 * their Supabase queries or introducing a new schema dependency.
 */
export async function fetchMarketTrendsData({ apartmentIds = [], userId } = {}) {
  const ids = apartmentIds.filter(Boolean);
  const [allTimeViews, viewActivity, favorites, ratings, notifications, preferenceAnalytics] = await Promise.all([
    fetchApartmentViews(),
    ids.length ? fetchViewActivityForApartments(ids) : [],
    ids.length ? fetchFavoritesForApartments(ids) : [],
    ids.length ? fetchRatingsForApartments(ids) : [],
    userId ? fetchNotifications(userId) : [],
    fetchTenantPreferenceAnalytics(),
  ]);

  return {
    allTimeViews: Array.isArray(allTimeViews) ? allTimeViews : [],
    viewActivity: Array.isArray(viewActivity) ? viewActivity : [],
    favorites: Array.isArray(favorites) ? favorites : [],
    ratings: Array.isArray(ratings) ? ratings : [],
    notifications: Array.isArray(notifications) ? notifications : [],
    preferenceAnalytics: preferenceAnalytics.data,
    preferenceAnalyticsError: preferenceAnalytics.error,
  };
}
