
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
  responseCounts: {
    preferredAreas: 0,
    amenities: 0,
    bedrooms: 0,
    roomCapacity: 0,
    priceRanges: 0,
  },
};

const VALID_PERIODS = new Set([
  "thisWeek",
  "lastWeek",
  "last30Days",
  "allTime",
]);

/**
 * Tenant preference analytics are platform-wide.
 * Apartment ownership and landlord ID must not be
 * passed to this RPC.
 */
export async function fetchTenantPreferenceAnalytics(
  period = "thisWeek"
) {
  const selectedPeriod = VALID_PERIODS.has(period)
    ? period
    : "thisWeek";

  try {
    const { data, error } = await supabase.rpc(
      "fn_get_tenant_preference_analytics",
      {
        p_period: selectedPeriod,
      }
    );

    if (error) {
      console.error(
        "[Market Trends] Tenant analytics RPC failed:",
        {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        }
      );

      return {
        data: null,
        error:
          error.code === "PGRST202"
            ? "Tenant preference analytics database function is missing or its signature does not match."
            : `Unable to load tenant preferences: ${
                error.message || "Database request failed."
              }`,
      };
    }

    // RPC must return an object containing chart data.
    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data)
    ) {
      console.error(
        "[Market Trends] Unexpected analytics response:",
        data
      );

      return {
        data: null,
        error:
          "Tenant preference analytics returned an invalid response.",
      };
    }

    const analytics = {
      ...EMPTY_PREFERENCE_ANALYTICS,
      ...data,
      responseCounts: {
        ...EMPTY_PREFERENCE_ANALYTICS.responseCounts,
        ...(data.responseCounts ?? {}),
      },
    };

    return {
      data: analytics,
      error: "",
    };
  } catch (error) {
    console.error(
      "[Market Trends] Unexpected analytics error:",
      error
    );

    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to retrieve tenant preferences.",
    };
  }
}

/**
 * Handle individual service errors without causing
 * unrelated Market Trends sections to disappear.
 */
async function safelyFetch(label, fetcher, fallback = []) {
  try {
    const result = await fetcher();
    return Array.isArray(result) ? result : fallback;
  } catch (error) {
    console.error(
      `[Market Trends] Failed to fetch ${label}:`,
      error
    );
    return fallback;
  }
}

/**
 * Fetch platform-wide Market Trends.
 *
 * apartmentIds:
 *   IDs of all tenant-visible apartments.
 *
 * userId:
 *   Used only for the logged-in landlord's notifications.
 *
 * period:
 *   Used for analytics and engagement time filtering.
 *
 * Tenant preference analytics do NOT depend on:
 * - landlord ownership
 * - number of landlord apartments
 * - landlord verification status
 */
export async function fetchMarketTrendsData({
  apartmentIds = [],
  userId,
  period = "thisWeek",
} = {}) {
  const ids = [
    ...new Set(
      apartmentIds.filter(Boolean).map(String)
    ),
  ];

  const [
    allTimeViews,
    viewActivity,
    favorites,
    ratings,
    notifications,
    preferenceAnalyticsResult,
  ] = await Promise.all([
    safelyFetch(
      "apartment views",
      () => fetchApartmentViews()
    ),

    ids.length
      ? safelyFetch(
          "view activity",
          () => fetchViewActivityForApartments(ids)
        )
      : Promise.resolve([]),

    ids.length
      ? safelyFetch(
          "favorites",
          () => fetchFavoritesForApartments(ids)
        )
      : Promise.resolve([]),

    ids.length
      ? safelyFetch(
          "ratings",
          () => fetchRatingsForApartments(ids)
        )
      : Promise.resolve([]),

    userId
      ? safelyFetch(
          "notifications",
          () => fetchNotifications(userId)
        )
      : Promise.resolve([]),

    // Always fetch preferences, even with zero apartments.
    fetchTenantPreferenceAnalytics(period),
  ]);

  return {
    allTimeViews,
    viewActivity,
    favorites,
    ratings,
    notifications,

    preferenceAnalytics: preferenceAnalyticsResult.data,

    preferenceAnalyticsError:
      preferenceAnalyticsResult.error,
  };
}
