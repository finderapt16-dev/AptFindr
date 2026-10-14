import { getNormalizedRoomAmenities } from "./apartmentAmenities.js";
import { isRoomAvailable } from "../utils/listingVisibility.js";

// These percentages are separate from the demand-ranking algorithm. Only
// tenant preference values participate in this calculation.
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

const clamp = (value) => Math.max(0, Math.min(100, value));

const normalizeText = (value) => String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseRequirement = (value) => {
    if (value === "4+") return 4;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const hasBudgetPreference = (preferences) => preferences?.saveBudgetPreferences !== false
    && (Number(preferences?.minBudget) > 0 || Number(preferences?.maxBudget) > 0);

const selectedAmenityNames = (preferences) => {
    const selected = PREFERENCE_AMENITIES
        .filter(([key]) => preferences?.[key] === true)
        .map(([, amenity]) => amenity);

    return [...new Set(selected.filter(Boolean))];
};

export function getSelectedPreferenceCategories(preferences = {}) {
    return {
        location: preferences.recommendationLocation !== false
            && Boolean(String(preferences.preferredArea ?? "").trim()),
        budget: hasBudgetPreference(preferences),
        bedrooms: parseRequirement(preferences.minBedrooms) !== null,
        capacity: parseRequirement(preferences.roomCapacity) !== null,
        amenities: selectedAmenityNames(preferences).length > 0,
    };
}

export function getAdjustedPreferenceWeights(preferences = {}) {
    const selected = getSelectedPreferenceCategories(preferences);
    const total = Object.entries(selected)
        .filter(([, active]) => active)
        .reduce((sum, [category]) => sum + PREFERENCE_WEIGHTS[category], 0);

    return Object.fromEntries(Object.keys(PREFERENCE_WEIGHTS).map((category) => [
        category,
        selected[category] ? (PREFERENCE_WEIGHTS[category] / total) * 100 : 0,
    ]));
}

export function hasMeaningfulPreferences(preferences) {
    if (!preferences?.hasSavedPreferences) return false;
    return Object.values(getSelectedPreferenceCategories(preferences)).some(Boolean);
}

const apartmentLocationValues = (apartment) => [
    apartment?.barangay,
    apartment?.area,
    apartment?.preferredArea,
    apartment?.location?.barangay,
    apartment?.location?.area,
    apartment?.address?.barangay,
    apartment?.address?.area,
    apartment?.address,
    apartment?.location,
];

export function apartmentMatchesPreferredArea(apartment, preferredArea) {
    const wanted = normalizeText(preferredArea);
    if (!wanted) return false;

    return apartmentLocationValues(apartment).some((value) => {
        const candidate = normalizeText(value);
        return candidate === wanted || ` ${candidate} `.includes(` ${wanted} `);
    });
}

const matchesBudget = (room, preferences) => {
    const price = Number(room?.price);
    if (!Number.isFinite(price) || price <= 0) return 0;
    const min = Math.max(0, Number(preferences?.minBudget) || 0);
    const max = Math.max(0, Number(preferences?.maxBudget) || 0);
    return (!min || price >= min) && (!max || price <= max) ? 1 : 0;
};

const matchesBedrooms = (room, preferences) => {
    const required = parseRequirement(preferences?.minBedrooms);
    if (required === null) return 0;
    const bedrooms = Number(room?.bedrooms);
    return Number.isFinite(bedrooms) && bedrooms >= required ? 1 : 0;
};

const matchesCapacity = (room, preferences) => {
    const required = parseRequirement(preferences?.roomCapacity);
    if (required === null) return 0;
    const capacity = Number(room?.maxOccupants);
    return Number.isFinite(capacity) && capacity >= required ? 1 : 0;
};

const amenitiesMatchRatio = (room, apartment, preferences) => {
    const requested = selectedAmenityNames(preferences);
    if (!requested.length) return 0;
    const provided = getNormalizedRoomAmenities(room, apartment);
    return requested.filter((amenity) => provided.has(amenity)).length / requested.length;
};

/**
 * Scores a single available room. Apartment-level location and amenities are
 * applied to that room, never combined with another room's properties.
 */
export function calculateRoomPreferenceMatch(room, apartment, preferences = {}) {
    const selected = getSelectedPreferenceCategories(preferences);
    const weights = getAdjustedPreferenceWeights(preferences);
    const ratios = {
        location: selected.location
            ? Number(apartmentMatchesPreferredArea(apartment, preferences.preferredArea))
            : 0,
        budget: selected.budget ? matchesBudget(room, preferences) : 0,
        bedrooms: selected.bedrooms ? matchesBedrooms(room, preferences) : 0,
        capacity: selected.capacity ? matchesCapacity(room, preferences) : 0,
        amenities: selected.amenities ? amenitiesMatchRatio(room, apartment, preferences) : 0,
    };

    const score = Object.keys(PREFERENCE_WEIGHTS).reduce(
        (sum, category) => sum + ratios[category] * weights[category],
        0,
    );

    return {
        room,
        matchScore: clamp(score),
        adjustedWeights: weights,
        categoryRatios: ratios,
    };
}

/** Uses the best single available room; it never mixes room attributes. */
export function calculateApartmentPreferenceMatch(apartment, preferences = {}) {
    const rooms = (apartment?.rooms ?? []).filter(isRoomAvailable);
    if (!rooms.length) {
        return {
            matchScore: 0,
            matchedRoom: null,
            adjustedWeights: getAdjustedPreferenceWeights(preferences),
            categoryRatios: {},
        };
    }

    const roomMatches = rooms.map((room) => calculateRoomPreferenceMatch(room, apartment, preferences));
    roomMatches.sort((left, right) => right.matchScore - left.matchScore
        || String(left.room?.id ?? left.room?.name ?? "").localeCompare(String(right.room?.id ?? right.room?.name ?? "")));
    const best = roomMatches[0];

    return { ...best, matchedRoom: best.room };
}

// Retained as a compatibility helper for existing consumers.
export function calculateRankingScoreBreakdown(apartment, preferences) {
    const match = calculateApartmentPreferenceMatch(apartment, preferences);
    return {
        ...match,
        finalScore: match.matchScore,
        locationScore: (match.categoryRatios.location ?? 0) * 100,
        budgetScore: (match.categoryRatios.budget ?? 0) * 100,
        bedroomsScore: (match.categoryRatios.bedrooms ?? 0) * 100,
        capacityScore: (match.categoryRatios.capacity ?? 0) * 100,
        amenitiesScore: (match.categoryRatios.amenities ?? 0) * 100,
    };
}

/**
 * Preference-only ranking. With no selected categories this returns the input
 * order unchanged and deliberately omits a percentage.
 */
export function rankApartments(apartments = [], preferences = {}) {
    const active = Object.values(getSelectedPreferenceCategories(preferences)).some(Boolean);
    if (!active) return [...apartments];

    return apartments
        .map((apartment, index) => {
            const scoreBreakdown = calculateApartmentPreferenceMatch(apartment, preferences);
            return {
                ...apartment,
                rankingScore: scoreBreakdown.matchScore,
                matchScore: scoreBreakdown.matchScore,
                matchedRoom: scoreBreakdown.matchedRoom,
                scoreBreakdown,
                _rankingIndex: index,
            };
        })
        .sort((left, right) => right.matchScore - left.matchScore || left._rankingIndex - right._rankingIndex)
        .map(({ _rankingIndex, ...apartment }) => apartment);
}
