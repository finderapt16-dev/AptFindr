
import { getNormalizedApartmentAmenities } from "./apartmentAmenities";
import { hasListingsInPreferredArea } from "../utils/preferredArea";
import { matchesRoomCapacity } from "./roomCapacity";
import {
    getLowestAvailableRoomPrice,
    isRoomAvailable,
} from "../utils/listingVisibility";
import {
    calculateDistanceMeters,
    normalizeCoordinates,
} from "./geospatialSearch";
import { hasValidApartmentCoordinates } from "../utils/mapCoordinates";

/**
 * ============================================================
 * RECOMMENDATION RANKING WEIGHTS
 * ============================================================
 *
 * These weights control the recommendation score.
 *
 * Location is still the strongest scoring factor.
 */
export const RANKING_WEIGHTS = {
    location: 0.70,
    budget: 0.10,
    availability: 0.05,
    amenities: 0.05,
    verification: 0.05,
    recency: 0.05,
};

export const MAX_DISTANCE_METERS = 1500;

/**
 * ============================================================
 * CHECK IF TENANT HAS MEANINGFUL PREFERENCES
 * ============================================================
 */
export function hasMeaningfulPreferences(
    preferences
) {
    if (!preferences?.hasSavedPreferences) {
        return false;
    }

    return Boolean(
        (
            preferences.recommendationLocation !==
                false &&
            preferences.preferredArea?.trim()
        ) ||
        (
            preferences.saveBudgetPreferences !==
                false &&
            (
                Number(preferences.minBudget) > 0 ||
                Number(preferences.maxBudget) > 0
            )
        ) ||
        (
            preferences.minBedrooms &&
            preferences.minBedrooms !== "any"
        ) ||
        (
            preferences.roomCapacity === "4+" ||
            Number(preferences.roomCapacity) > 0
        ) ||
        preferences.petFriendly ||
        preferences.parking ||
        preferences.furnished ||
        preferences.ownBathroom ||
        preferences.wifi ||
        preferences.ac ||
        preferences.studyArea ||
        preferences.laundryArea ||
        preferences.kitchenAccess
    );
}

/**
 * ============================================================
 * GENERAL HELPERS
 * ============================================================
 */

const clampScore = (value) =>
    Math.max(
        0,
        Math.min(100, value)
    );

/**
 * Normalize area names so:
 *
 * "Luna"
 * " luna "
 * "LUNA"
 *
 * are treated as the same area.
 */
function normalizeAreaName(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

/**
 * ============================================================
 * APARTMENT AREA / BARANGAY
 * ============================================================
 *
 * This function tries several common apartment structures.
 *
 * If your apartment data uses:
 *
 * apartment.barangay
 *
 * it will use that first.
 *
 * It also supports:
 *
 * apartment.area
 * apartment.preferredArea
 * apartment.location.barangay
 * apartment.location.area
 * apartment.address.barangay
 * apartment.address.area
 */
function getApartmentArea(apartment) {
    return (
        apartment?.barangay ??
        apartment?.area ??
        apartment?.preferredArea ??
        apartment?.location?.barangay ??
        apartment?.location?.area ??
        apartment?.address?.barangay ??
        apartment?.address?.area ??
        ""
    );
}

/**
 * ============================================================
 * EXACT AREA MATCH
 * ============================================================
 *
 * Example:
 *
 * Tenant selected:
 * Luna
 *
 * Apartment:
 * barangay: Luna
 *
 * Result:
 * true
 */
function isExactPreferredArea(
    apartment,
    preferences
) {
    if (
        preferences?.recommendationLocation ===
            false ||
        !preferences?.preferredArea?.trim()
    ) {
        return false;
    }

    const preferredArea =
        normalizeAreaName(
            preferences.preferredArea
        );

    const apartmentArea =
        normalizeAreaName(
            getApartmentArea(apartment)
        );

    if (
        !preferredArea ||
        !apartmentArea
    ) {
        return false;
    }

    return (
        preferredArea ===
        apartmentArea
    );
}

/**
 * ============================================================
 * PREFERRED LOCATION COORDINATES
 * ============================================================
 */
function getPreferredCoordinates(
    preferences
) {
    return normalizeCoordinates({
        lat: preferences?.preferredLat,
        lng: preferences?.preferredLng,
    });
}

/**
 * ============================================================
 * APARTMENT COORDINATES
 * ============================================================
 */
function getApartmentCoordinates(
    apartment
) {
    const coordinates =
        normalizeCoordinates({
            lat: apartment?.lat,
            lng: apartment?.lng,
        });

    return coordinates &&
        hasValidApartmentCoordinates(
            coordinates.lat,
            coordinates.lng
        )
        ? coordinates
        : null;
}

/**
 * ============================================================
 * LOCATION SCORE
 * ============================================================
 */
function calculateLocationScore(
    apartment,
    preferences
) {
    /**
     * If location preference is disabled,
     * location is neutral.
     */
    if (
        preferences?.recommendationLocation ===
            false ||
        !preferences?.preferredArea?.trim()
    ) {
        return {
            locationScore: 50,
            distanceMeters: null,
            exactAreaMatch: false,
        };
    }

    const preferredCoordinates =
        getPreferredCoordinates(
            preferences
        );

    const apartmentCoordinates =
        getApartmentCoordinates(
            apartment
        );

    /**
     * We still detect exact area even if
     * coordinates are missing.
     */
    if (
        !preferredCoordinates ||
        !apartmentCoordinates
    ) {
        return {
            locationScore: 0,
            distanceMeters: null,
            exactAreaMatch:
                isExactPreferredArea(
                    apartment,
                    preferences
                ),
        };
    }

    const distanceMeters =
        calculateDistanceMeters(
            preferredCoordinates,
            apartmentCoordinates
        );

    return {
        distanceMeters,

        locationScore:
            clampScore(
                100 *
                    (
                        1 -
                        distanceMeters /
                            MAX_DISTANCE_METERS
                    )
            ),

        exactAreaMatch:
            isExactPreferredArea(
                apartment,
                preferences
            ),
    };
}

/**
 * ============================================================
 * BUDGET SCORE
 * ============================================================
 */
function calculateBudgetScore(
    apartment,
    preferences
) {
    if (
        preferences?.saveBudgetPreferences ===
            false ||
        (
            !Number(
                preferences?.minBudget
            ) &&
            !Number(
                preferences?.maxBudget
            )
        )
    ) {
        return 50;
    }

    /**
     * Deliberately use the lowest available
     * room price.
     *
     * Do NOT fall back to apartment.price
     * because that could describe an occupied room.
     */
    const price =
        getLowestAvailableRoomPrice(
            apartment
        );

    if (!Number.isFinite(price)) {
        return 0;
    }

    const min =
        Math.max(
            0,
            Number(
                preferences.minBudget
            ) || 0
        );

    const max =
        Math.max(
            0,
            Number(
                preferences.maxBudget
            ) || 0
        );

    /**
     * Completely inside budget range.
     */
    if (
        (!min || price >= min) &&
        (!max || price <= max)
    ) {
        return 100;
    }

    /**
     * Below minimum.
     */
    if (
        min &&
        price < min
    ) {
        return clampScore(
            100 *
                (
                    price /
                    min
                )
        );
    }

    /**
     * Above maximum.
     */
    return max
        ? clampScore(
              100 *
                  (
                      1 -
                      (
                          price -
                          max
                      ) /
                          max
                  )
          )
        : 100;
}

/**
 * ============================================================
 * AVAILABILITY SCORE
 * ============================================================
 */
function calculateAvailabilityScore(
    apartment
) {
    const rooms =
        apartment.rooms ?? [];

    const availableRooms =
        rooms.filter(
            isRoomAvailable
        ).length;

    if (
        apartment.status !==
            "available" ||
        availableRooms === 0
    ) {
        return 0;
    }

    return rooms.length
        ? (
              availableRooms /
              rooms.length
          ) *
              100
        : 0;
}

/**
 * ============================================================
 * AMENITY PREFERENCES
 * ============================================================
 */
const AMENITY_PREFERENCES = [
    [
        "ownBathroom",
        "own_bathroom",
    ],
    [
        "wifi",
        "wifi",
    ],
    [
        "ac",
        "air_conditioning",
    ],
    [
        "studyArea",
        "study area",
    ],
    [
        "parking",
        "parking",
    ],
    [
        "laundryArea",
        "laundry_area",
    ],
    [
        "kitchenAccess",
        "kitchen access",
    ],
    [
        "furnished",
        "furnished",
    ],
    [
        "petFriendly",
        "pet_friendly",
    ],
];

/**
 * ============================================================
 * AMENITY SCORE
 * ============================================================
 */
function calculateAmenitiesScore(
    apartment,
    preferences
) {
    const requested =
        AMENITY_PREFERENCES
            .filter(
                ([key]) =>
                    preferences?.[key]
            )
            .map(
                ([, amenity]) =>
                    amenity
            );

    /**
     * No amenity preference.
     */
    if (
        requested.length === 0
    ) {
        return 50;
    }

    const apartmentAmenities =
        getNormalizedApartmentAmenities(
            apartment
        );

    const matched =
        requested.filter(
            (amenity) =>
                apartmentAmenities.has(
                    amenity
                )
        ).length;

    return (
        matched /
        requested.length
    ) * 100;
}

/**
 * ============================================================
 * VERIFICATION SCORE
 * ============================================================
 */
function calculateVerificationScore(
    apartment,
    verificationMap
) {
    const landlordVerified =
        apartment.landlordVerified ===
            true ||
        (
            apartment.landlordId &&
            verificationMap?.get(
                apartment.landlordId
            ) === true
        );

    const listingVerified =
        apartment.isVerified === true ||
        apartment.features
            ?.verification
            ?.apartment_verified ===
            true ||
        apartment.features
            ?.isVerified ===
            true;

    return (
        landlordVerified ||
        listingVerified
    )
        ? 100
        : 25;
}

/**
 * ============================================================
 * LISTING DATE
 * ============================================================
 */
function getListingDate(
    apartment
) {
    for (
        const value of [
            apartment.publishedAt,
            apartment.updatedAt,
            apartment.createdAt,
        ]
    ) {
        const timestamp =
            new Date(
                value
            ).getTime();

        if (
            Number.isFinite(
                timestamp
            )
        ) {
            return timestamp;
        }
    }

    return null;
}

/**
 * ============================================================
 * RECENCY SCORE
 * ============================================================
 */
function calculateRecencyScore(
    apartment
) {
    const timestamp =
        getListingDate(
            apartment
        );

    if (!timestamp) {
        return 0;
    }

    const ageDays =
        Math.max(
            0,
            (
                Date.now() -
                timestamp
            ) /
                86_400_000
        );

    /**
     * New listing = 100
     *
     * 90+ days = 0
     */
    return clampScore(
        100 *
            (
                1 -
                ageDays /
                    90
            )
    );
}

/**
 * ============================================================
 * HARD FILTERS
 * ============================================================
 */
function passesHardFilters(
    apartment,
    preferences
) {
    /**
     * Minimum bedrooms.
     */
    const minimumBedrooms =
        preferences?.minBedrooms ===
            "4+"
            ? 4
            : Number(
                  preferences?.minBedrooms
              );

    if (
        Number.isFinite(
            minimumBedrooms
        ) &&
        minimumBedrooms > 0 &&
        Number(
            apartment.bedrooms
        ) <
            minimumBedrooms
    ) {
        return false;
    }

    /**
     * Room capacity.
     */
    if (
        !matchesRoomCapacity(
            apartment,
            preferences?.roomCapacity
        )
    ) {
        return false;
    }

    /**
     * Budget.
     */
    const minBudget =
        Number(
            preferences?.minBudget
        ) || 0;

    const maxBudget =
        Number(
            preferences?.maxBudget
        ) || 0;

    if (
        preferences?.saveBudgetPreferences !==
            false &&
        (
            minBudget ||
            maxBudget
        )
    ) {
        const price =
            getLowestAvailableRoomPrice(
                apartment
            );

        if (
            !Number.isFinite(
                price
            ) ||
            (
                minBudget &&
                price < minBudget
            ) ||
            (
                maxBudget &&
                price > maxBudget
            )
        ) {
            return false;
        }
    }

    /**
     * Amenities.
     */
    const requestedAmenities =
        AMENITY_PREFERENCES
            .filter(
                ([key]) =>
                    preferences?.[key]
            )
            .map(
                ([, amenity]) =>
                    amenity
            );

    if (
        requestedAmenities.length >
        0
    ) {
        const apartmentAmenities =
            getNormalizedApartmentAmenities(
                apartment
            );

        if (
            !requestedAmenities.every(
                (amenity) =>
                    apartmentAmenities.has(
                        amenity
                    )
            )
        ) {
            return false;
        }
    }

    return true;
}

/**
 * ============================================================
 * SCORE BREAKDOWN
 * ============================================================
 */
export function calculateRankingScoreBreakdown(
    apartment,
    preferences,
    context = {}
) {
    const {
        locationScore,
        distanceMeters,
        exactAreaMatch,
    } =
        calculateLocationScore(
            apartment,
            preferences
        );

    const budgetScore =
        calculateBudgetScore(
            apartment,
            preferences
        );

    const availabilityScore =
        calculateAvailabilityScore(
            apartment
        );

    const amenitiesScore =
        calculateAmenitiesScore(
            apartment,
            preferences
        );

    const verificationScore =
        calculateVerificationScore(
            apartment,
            new Map(
                context.landlordVerifications ??
                    []
            )
        );

    const recencyScore =
        calculateRecencyScore(
            apartment
        );

    /**
     * Weighted recommendation score.
     */
    const finalScore =
        locationScore *
            RANKING_WEIGHTS.location +
        budgetScore *
            RANKING_WEIGHTS.budget +
        availabilityScore *
            RANKING_WEIGHTS.availability +
        amenitiesScore *
            RANKING_WEIGHTS.amenities +
        verificationScore *
            RANKING_WEIGHTS.verification +
        recencyScore *
            RANKING_WEIGHTS.recency;

    return {
        distanceMeters,
        exactAreaMatch,
        locationScore,
        budgetScore,
        availabilityScore,
        amenitiesScore,
        verificationScore,
        recencyScore,
        finalScore,
    };
}

/**
 * ============================================================
 * MAIN RECOMMENDATION RANKING
 * ============================================================
 *
 * ORDER:
 *
 * 1. Exact selected area
 * 2. Nearest to farthest
 * 3. Ranking score
 * 4. Apartment ID
 *
 * Example:
 *
 * User selects:
 * Luna
 *
 * Listings:
 *
 * Luna A     800m
 * Jaro A     200m
 * Luna B     300m
 * Luna C     600m
 * Jaro B     500m
 *
 * Result:
 *
 * Luna B     300m
 * Luna C     600m
 * Luna A     800m
 * Jaro A     200m
 * Jaro B     500m
 *
 * This means the user's selected
 * barangay is always prioritized.
 */
export function rankApartments(
    apartments = [],
    preferences = {},
    context = {}
) {
    const hasLocationPreference =
        Boolean(
            preferences?.recommendationLocation !==
                false &&
            preferences?.preferredArea?.trim()
        );

    if (hasLocationPreference && !hasListingsInPreferredArea(apartments, preferences.preferredArea)) return [];

    const ranked =
        apartments
            /**
             * First apply hard filters.
             */
            .filter(
                (apartment) =>
                    passesHardFilters(
                        apartment,
                        preferences
                    )
            )

            /**
             * Calculate scores.
             */
            .map(
                (apartment) => {
                    const scoreBreakdown =
                        calculateRankingScoreBreakdown(
                            apartment,
                            preferences,
                            context
                        );

                    return {
                        ...apartment,

                        rankingScore:
                            scoreBreakdown.finalScore,

                        scoreBreakdown,
                    };
                }
            )

            /**
             * Sort recommendations.
             */
            .sort(
                (a, b) => {
                    /**
                     * ==================================================
                     * PRIORITY 1
                     * EXACT SELECTED AREA
                     * ==================================================
                     *
                     * If user selected Luna:
                     *
                     * Luna = 1
                     * Other area = 0
                     *
                     * Therefore Luna always appears first.
                     */
                    if (
                        hasLocationPreference
                    ) {
                        const aExact =
                            a.scoreBreakdown
                                .exactAreaMatch
                                ? 1
                                : 0;

                        const bExact =
                            b.scoreBreakdown
                                .exactAreaMatch
                                ? 1
                                : 0;

                        if (
                            aExact !==
                            bExact
                        ) {
                            return (
                                bExact -
                                aExact
                            );
                        }

                        /**
                         * ==================================================
                         * PRIORITY 2
                         * NEAREST TO FARTHEST
                         * ==================================================
                         */
                        const aDistance =
                            a.scoreBreakdown
                                .distanceMeters ??
                            Number.POSITIVE_INFINITY;

                        const bDistance =
                            b.scoreBreakdown
                                .distanceMeters ??
                            Number.POSITIVE_INFINITY;

                        if (
                            aDistance !==
                            bDistance
                        ) {
                            return (
                                aDistance -
                                bDistance
                            );
                        }
                    }

                    /**
                     * ==================================================
                     * PRIORITY 3
                     * NORMAL WEIGHTED SCORE
                     * ==================================================
                     */
                    if (
                        b.rankingScore !==
                        a.rankingScore
                    ) {
                        return (
                            b.rankingScore -
                            a.rankingScore
                        );
                    }

                    /**
                     * ==================================================
                     * PRIORITY 4
                     * DETERMINISTIC ID
                     * ==================================================
                     */
                    return String(
                        a.id
                    ).localeCompare(
                        String(
                            b.id
                        )
                    );
                }
            );

    return ranked;
}

/**
 * ============================================================
 * RECOMMENDATION EXPLANATION
 * ============================================================
 */
export function getRecommendationExplanation(
    breakdown
) {
    const factors = [
        [
            "Location",
            "location",
            breakdown.locationScore,
        ],
        [
            "Budget fit",
            "budget",
            breakdown.budgetScore,
        ],
        [
            "Availability",
            "availability",
            breakdown.availabilityScore,
        ],
        [
            "Amenities",
            "amenities",
            breakdown.amenitiesScore,
        ],
        [
            "Verification",
            "verification",
            breakdown.verificationScore,
        ],
        [
            "Listing recency",
            "recency",
            breakdown.recencyScore,
        ],
    ]
        .filter(
            ([, , score]) =>
                score > 0
        )
        .sort(
            (a, b) =>
                RANKING_WEIGHTS[
                    b[1]
                ] -
                RANKING_WEIGHTS[
                    a[1]
                ]
        )
        .slice(0, 3)
        .map(
            ([label]) =>
                label
        );

    return `Recommended based on your preferences: ${
        factors.join(", ") ||
        "available listings"
    }.`;
}

