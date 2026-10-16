
import { getNormalizedRoomAmenities } from "./apartmentAmenities.js";
import { isRoomAvailable } from "../utils/listingVisibility.js";

// ============================================
// PREFERENCE WEIGHTS
// ============================================

// Separate from the demand-ranking algorithm.

export const PREFERENCE_WEIGHTS = Object.freeze({
    location: 50,
    budget: 20,
    bedrooms: 10,
    capacity: 10,
    amenities: 10,
});

export const PREFERENCE_AMENITIES = Object.freeze([
    ["petFriendly", "pet_friendly"],
    ["parking", "parking"],
    ["furnished", "furnished"],
    ["ownBathroom", "own_bathroom"],
    ["wifi", "wifi"],
    ["ac", "air_conditioning"],
    ["laundryArea", "laundry_area"],
]);

// ============================================
// GENERAL HELPERS
// ============================================

const clamp = (number) =>
    Math.max(0, Math.min(100, number));

const normalizeText = (value) =>
    String(value ?? "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const normalizeArea = (value) =>
    normalizeText(value)
        .replace(/^(?:barangay|brgy)\s+/, "");

// Recognizes:
// 1, 2, 3, 4
// "4+"
// "4+ people"
// "4 persons"
// "1 person"
// "Any" -> no requirement

const parseRequirement = (value) => {
    if (value == null) return null;

    const input = String(value)
        .trim()
        .toLowerCase();

    if (
        !input ||
        ["any", "ignore", "none"].includes(input)
    ) {
        return null;
    }

    const match = input.match(
        /^(\d+)\s*\+?\s*(?:people|persons?|occupants?|bedrooms?|rooms?)?$/
    );

    if (!match) return null;

    const number = Number(match[1]);

    return Number.isSafeInteger(number) && number > 0
        ? number
        : null;
};

// ============================================
// BUDGET PREFERENCE
// ============================================

const hasBudgetPreference = (preferences) =>
    preferences?.saveBudgetPreferences !== false &&
    (
        Number(preferences?.minBudget) > 0 ||
        Number(preferences?.maxBudget) > 0
    );

// ============================================
// AMENITY PREFERENCES
// ============================================

const selectedAmenityNames = (preferences) => [
    ...new Set(
        PREFERENCE_AMENITIES
            .filter(
                ([key]) =>
                    preferences?.[key] === true
            )
            .map(([, value]) => value)
    ),
];

// ============================================
// ACTIVE PREFERENCE CATEGORIES
// ============================================

export function getSelectedPreferenceCategories(
    preferences = {}
) {
    return {
        location:
            preferences?.recommendationLocation !== false &&
            Boolean(
                String(
                    preferences?.preferredArea ?? ""
                ).trim()
            ),

        budget: hasBudgetPreference(preferences),

        bedrooms:
            parseRequirement(
                preferences?.minBedrooms
            ) !== null,

        capacity:
            parseRequirement(
                preferences?.roomCapacity
            ) !== null,

        amenities:
            selectedAmenityNames(preferences).length > 0,
    };
}

// ============================================
// DYNAMIC WEIGHT ADJUSTMENT
// ============================================

export function getAdjustedPreferenceWeights(
    preferences = {}
) {
    const selected =
        getSelectedPreferenceCategories(preferences);

    const total = Object.keys(
        PREFERENCE_WEIGHTS
    ).reduce(
        (sum, category) =>
            sum +
            (
                selected[category]
                    ? PREFERENCE_WEIGHTS[category]
                    : 0
            ),
        0
    );

    return Object.fromEntries(
        Object.keys(PREFERENCE_WEIGHTS).map(
            (category) => [
                category,

                selected[category] && total > 0
                    ? (
                        PREFERENCE_WEIGHTS[category] /
                        total
                    ) * 100
                    : 0,
            ]
        )
    );
}

// ============================================
// CHECK SAVED PREFERENCES
// ============================================

export function hasMeaningfulPreferences(
    preferences
) {
    return (
        Boolean(preferences?.hasSavedPreferences) &&
        Object.values(
            getSelectedPreferenceCategories(preferences)
        ).some(Boolean)
    );
}

// ============================================
// LOCATION HELPERS
// ============================================

const isNonemptyString = (value) =>
    typeof value === "string" &&
    value.trim().length > 0;

// Match an actual barangay or area segment.
// Examples:
// "Nabitasan"
// "Brgy. Nabitasan"
// "Barangay Nabitasan, La Paz"

const hasExactAreaSegment = (
    value,
    wanted
) =>
    isNonemptyString(value) &&
    value
        .split(/[,\n]/)
        .some(
            (segment) =>
                normalizeArea(segment) === wanted
        );

// Fallback for unstructured addresses.
// Avoid matching partial words.

const hasAreaWords = (value, wanted) => {
    if (!isNonemptyString(value)) {
        return false;
    }

    const text = normalizeText(value);

    return (
        ` ${text} `.includes(` ${wanted} `) ||
        ` ${text} `.includes(
            ` barangay ${wanted} `
        ) ||
        ` ${text} `.includes(
            ` brgy ${wanted} `
        )
    );
};

// ============================================
// APARTMENT LOCATION MATCH
// ============================================

export function apartmentMatchesPreferredArea(
    apartment,
    preferredArea
) {
    const wanted = normalizeArea(preferredArea);

    if (!wanted || !apartment) {
        return false;
    }

    // PRIORITY 1:
    // Use structured barangay information.

    const barangays = [
        apartment.barangay,
        apartment.barangay_name,
        apartment.barangayName,

        apartment.location?.barangay,
        apartment.location?.barangay_name,

        apartment.address?.barangay,
        apartment.address?.barangay_name,
    ].filter(isNonemptyString);

    // When a barangay is explicitly stored,
    // do not override it with street-address text.

    if (barangays.length > 0) {
        return barangays.some((value) =>
            hasExactAreaSegment(value, wanted)
        );
    }

    // PRIORITY 2:
    // Check structured area fields.

    const areas = [
        apartment.area,
        apartment.preferredArea,
        apartment.location?.area,
        apartment.address?.area,
    ];

    if (
        areas.some((value) =>
            hasExactAreaSegment(value, wanted)
        )
    ) {
        return true;
    }

    // PRIORITY 3:
    // Check full address strings when
    // no structured barangay is available.

    const addresses = [
        apartment.address,
        apartment.location,

        apartment.fullAddress,
        apartment.full_address,

        apartment.address?.fullAddress,
        apartment.address?.full_address,
        apartment.address?.formattedAddress,
        apartment.address?.streetAddress,

        apartment.location?.address,
        apartment.location?.fullAddress,
        apartment.location?.formattedAddress,
    ];

    return addresses.some((value) =>
        hasAreaWords(value, wanted)
    );
}

// ============================================
// ROOM BUDGET MATCH
// ============================================

const roomPrice = (room) =>
    Number(
        room?.price ??
        room?.monthlyRent ??
        room?.monthly_rent ??
        room?.rent
    );

const matchesBudget = (room, preferences) => {
    const price = roomPrice(room);

    if (
        !Number.isFinite(price) ||
        price <= 0
    ) {
        return 0;
    }

    const min = Math.max(
        0,
        Number(preferences?.minBudget) || 0
    );

    const max = Math.max(
        0,
        Number(preferences?.maxBudget) || 0
    );

    // Reject invalid budget ranges.

    if (min && max && min > max) {
        return 0;
    }

    const matchesMinimum =
        !min || price >= min;

    const matchesMaximum =
        !max || price <= max;

    return matchesMinimum && matchesMaximum
        ? 1
        : 0;
};

// ============================================
// BEDROOM MATCH
// ============================================

const matchesBedrooms = (
    room,
    preferences
) => {
    const required = parseRequirement(
        preferences?.minBedrooms
    );

    if (required === null) {
        return 0;
    }

    const bedrooms = Number(
        room?.bedrooms ??
        room?.bedroomCount ??
        room?.bedroom_count
    );

    return (
        Number.isFinite(bedrooms) &&
        bedrooms >= required
    )
        ? 1
        : 0;
};

// ============================================
// ROOM CAPACITY MATCH
// ============================================

// Supports common capacity field names
// and values such as 4, "4+", and "4 people".

const matchesCapacity = (
    room,
    preferences
) => {
    const required = parseRequirement(
        preferences?.roomCapacity
    );

    if (required === null) {
        return 0;
    }

    const value =
        room?.maxOccupants ??
        room?.max_occupants ??
        room?.maxCapacity ??
        room?.roomCapacity ??
        room?.capacity ??
        room?.features?.maxOccupants;

    const capacity = parseRequirement(value);

    return (
        capacity !== null &&
        capacity >= required
    )
        ? 1
        : 0;
};

// ============================================
// ROOM AMENITIES MATCH
// ============================================

const amenitiesMatchRatio = (
    room,
    apartment,
    preferences
) => {
    const requested =
        selectedAmenityNames(preferences);

    if (!requested.length) {
        return 0;
    }

    const provided =
        getNormalizedRoomAmenities(
            room,
            apartment
        );

    const matchedCount = requested.filter(
        (amenity) => provided.has(amenity)
    ).length;

    return matchedCount / requested.length;
};

// ============================================
// SINGLE ROOM PREFERENCE MATCH
// ============================================

export function calculateRoomPreferenceMatch(
    room,
    apartment,
    preferences = {}
) {
    const selected =
        getSelectedPreferenceCategories(preferences);

    const weights =
        getAdjustedPreferenceWeights(preferences);

    const ratios = {
        location: selected.location
            ? Number(
                apartmentMatchesPreferredArea(
                    apartment,
                    preferences?.preferredArea
                )
            )
            : 0,

        budget: selected.budget
            ? matchesBudget(room, preferences)
            : 0,

        bedrooms: selected.bedrooms
            ? matchesBedrooms(room, preferences)
            : 0,

        capacity: selected.capacity
            ? matchesCapacity(room, preferences)
            : 0,

        amenities: selected.amenities
            ? amenitiesMatchRatio(
                room,
                apartment,
                preferences
            )
            : 0,
    };

    const score = Object.keys(
        PREFERENCE_WEIGHTS
    ).reduce(
        (sum, category) =>
            sum +
            ratios[category] *
                weights[category],
        0
    );

    return {
        room,
        matchScore: clamp(score),
        adjustedWeights: weights,
        categoryRatios: ratios,
    };
}

// ============================================
// BEST AVAILABLE ROOM PER APARTMENT
// ============================================

export function calculateApartmentPreferenceMatch(
    apartment,
    preferences = {}
) {
    const rooms = (
        Array.isArray(apartment?.rooms)
            ? apartment.rooms
            : []
    ).filter(isRoomAvailable);

    if (!rooms.length) {
        return {
            matchScore: 0,
            matchedRoom: null,
            adjustedWeights:
                getAdjustedPreferenceWeights(
                    preferences
                ),
            categoryRatios: {},
        };
    }

    const matches = rooms.map((room) =>
        calculateRoomPreferenceMatch(
            room,
            apartment,
            preferences
        )
    );

    // Select the highest-scoring available
    // room rather than combining rooms.

    matches.sort(
        (a, b) =>
            b.matchScore - a.matchScore ||
            String(
                a.room?.id ??
                a.room?.name ??
                ""
            ).localeCompare(
                String(
                    b.room?.id ??
                    b.room?.name ??
                    ""
                )
            )
    );

    return {
        ...matches[0],
        matchedRoom: matches[0].room,
    };
}

// ============================================
// COMPATIBILITY SCORE BREAKDOWN
// ============================================

export function calculateRankingScoreBreakdown(
    apartment,
    preferences
) {
    const match =
        calculateApartmentPreferenceMatch(
            apartment,
            preferences
        );

    return {
        ...match,

        finalScore: match.matchScore,

        locationScore:
            (match.categoryRatios.location ?? 0) *
            100,

        budgetScore:
            (match.categoryRatios.budget ?? 0) *
            100,

        bedroomsScore:
            (match.categoryRatios.bedrooms ?? 0) *
            100,

        capacityScore:
            (match.categoryRatios.capacity ?? 0) *
            100,

        amenitiesScore:
            (match.categoryRatios.amenities ?? 0) *
            100,
    };
}

// ============================================
// FINAL APARTMENT RECOMMENDATIONS
// ============================================

export function rankApartments(
    apartments = [],
    preferences = {}
) {
    const selected =
        getSelectedPreferenceCategories(
            preferences
        );

    const active =
        Object.values(selected).some(Boolean);

    // Without active preferences,
    // preserve the original apartment order.

    if (!active) {
        return [...apartments];
    }

    return apartments

        // STEP 1:
        // When a location is selected,
        // show only matching barangays.

        .filter(
            (apartment) =>
                !selected.location ||
                apartmentMatchesPreferredArea(
                    apartment,
                    preferences?.preferredArea
                )
        )

        // STEP 2:
        // Calculate the best available room
        // score for each eligible apartment.

        .map((apartment, index) => {
            const breakdown =
                calculateApartmentPreferenceMatch(
                    apartment,
                    preferences
                );

            return {
                ...apartment,

                rankingScore:
                    breakdown.matchScore,

                matchScore:
                    breakdown.matchScore,

                matchedRoom:
                    breakdown.matchedRoom,

                scoreBreakdown:
                    breakdown,

                _rankingIndex: index,
            };
        })

        // STEP 3:
        // Exclude apartments without an
        // available matching room record,
        // or with a zero preference score.

        .filter(
            (apartment) =>
                apartment.matchedRoom !== null &&
                apartment.matchScore > 0
        )

        // STEP 4:
        // Highest match percentage first.
        // Preserve original order on ties.

        .sort(
            (a, b) =>
                b.matchScore - a.matchScore ||
                a._rankingIndex - b._rankingIndex
        )

        // STEP 5:
        // Remove temporary sorting metadata.

        .map(
            ({
                _rankingIndex,
                ...apartment
            }) => apartment
        );
}
