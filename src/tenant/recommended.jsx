
import { isTenantRole } from "@/services/authService";

import {
    hasMeaningfulPreferences,
    rankApartments,
} from "@/tenant/rankingEngine";

/**
 * ============================================================
 * BUILD RANKING PREFERENCES
 * ============================================================
 *
 * Converts the tenant's saved preferences into
 * the format expected by rankingEngine.js.
 */
function buildRankingPreferences(
    savedPreferences
) {
    return {
        /**
         * ======================================================
         * BUDGET
         * ======================================================
         */
        minBudget:
            savedPreferences.minBudget,

        maxBudget:
            savedPreferences.saveBudgetPreferences
                ? savedPreferences.maxBudget ||
                  undefined
                : undefined,

        saveBudgetPreferences:
            savedPreferences.saveBudgetPreferences,

        /**
         * ======================================================
         * BEDROOMS
         * ======================================================
         */
        minBedrooms:
            savedPreferences.minBedrooms,

        /**
         * ======================================================
         * ROOM CAPACITY
         * ======================================================
         */
        roomCapacity:
            savedPreferences.roomCapacity,

        /**
         * ======================================================
         * LOCATION
         * ======================================================
         *
         * Example:
         *
         * preferredArea = "Luna"
         *
         * preferredLat / preferredLng
         * = coordinates for Luna
         *
         * rankingEngine.js uses these to:
         *
         * 1. Put Luna listings first
         * 2. Sort Luna listings nearest -> farthest
         * 3. Then show nearby areas nearest -> farthest
         */
        preferredArea:
            savedPreferences.recommendationLocation
                ? savedPreferences.preferredArea ||
                  undefined
                : undefined,

        preferredLat:
            savedPreferences.preferredLat,

        preferredLng:
            savedPreferences.preferredLng,

        recommendationLocation:
            savedPreferences.recommendationLocation,

        /**
         * ======================================================
         * AMENITIES
         * ======================================================
         */
        ownBathroom:
            savedPreferences.ownBathroom,

        petFriendly:
            savedPreferences.petFriendly,

        parking:
            savedPreferences.parking,

        furnished:
            savedPreferences.furnished,

        wifi:
            savedPreferences.wifi,

        ac:
            savedPreferences.ac,

        laundryArea:
            savedPreferences.laundryArea,

        studyArea:
            savedPreferences.studyArea,

        kitchenAccess:
            savedPreferences.kitchenAccess,

        /**
         * ======================================================
         * SAVED PREFERENCE STATUS
         * ======================================================
         */
        hasSavedPreferences:
            savedPreferences.hasSavedPreferences,
    };
}

/**
 * ============================================================
 * GET RECOMMENDED APARTMENTS
 * ============================================================
 *
 * This function is responsible only for:
 *
 * 1. Checking that the user is a tenant
 * 2. Reading saved preferences
 * 3. Building ranking preferences
 * 4. Sending apartments to rankingEngine.js
 *
 * The actual ranking/sorting is handled by:
 *
 *     rankingEngine.js
 */
export function getRecommendedApartments({
    apartments = [],
    savedPreferences,
    userRole,
}) {
    /**
     * ==========================================================
     * ONLY TENANTS GET RECOMMENDATIONS
     * ==========================================================
     */
    if (
        !isTenantRole(
            userRole
        )
    ) {
        return [];
    }

    /**
     * ==========================================================
     * NO SAVED PREFERENCES
     * ==========================================================
     */
    if (
        !savedPreferences
    ) {
        return [];
    }

    /**
     * ==========================================================
     * BUILD PREFERENCES
     * ==========================================================
     */
    const preferences =
        buildRankingPreferences(
            savedPreferences
        );

    /**
     * ==========================================================
     * CHECK FOR MEANINGFUL PREFERENCES
     * ==========================================================
     *
     * If the tenant has not saved any useful
     * recommendation preference, don't show
     * the Recommended list.
     */
    if (
        !hasMeaningfulPreferences(
            preferences
        )
    ) {
        return [];
    }

    /**
     * ==========================================================
     * RANK APARTMENTS
     * ==========================================================
     *
     * rankingEngine.js handles:
     *
     * - Exact preferred area
     * - Nearest -> farthest
     * - Budget
     * - Bedrooms
     * - Room capacity
     * - Amenities
     * - Availability
     * - Verification
     * - Listing recency
     */
    return rankApartments(
        apartments,
        preferences
    );
}

