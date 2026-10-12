import assert from "node:assert/strict";
import test from "node:test";
import {
    calculateApartmentPreferenceMatch,
    getAdjustedPreferenceWeights,
    rankApartments,
} from "../src/tenant/rankingEngine.js";

const availableRoom = (overrides = {}) => ({
    id: "room-1",
    status: "available",
    isOccupied: false,
    price: 7000,
    bedrooms: 2,
    maxOccupants: 3,
    ...overrides,
});

const apartment = (overrides = {}) => ({
    id: "apartment-1",
    address: "Barangay Baldoza, La Paz, Iloilo City",
    amenities: ["Wi-Fi", "Parking", "Laundry Area"],
    rooms: [availableRoom()],
    ...overrides,
});

test("normalizes a single selected category to 100%", () => {
    const weights = getAdjustedPreferenceWeights({ preferredArea: "Baldoza" });
    assert.deepEqual(weights, { location: 100, budget: 0, bedrooms: 0, capacity: 0, amenities: 0 });
    assert.equal(calculateApartmentPreferenceMatch(apartment(), { preferredArea: "Baldoza" }).matchScore, 100);
});

test("gives each individual selected category the full score", () => {
    const cases = [
        { preferredArea: "Baldoza" },
        { minBudget: 5000, maxBudget: 8000 },
        { minBedrooms: "2" },
        { roomCapacity: "2" },
        { wifi: true },
    ];

    cases.forEach((preferences) => {
        assert.equal(calculateApartmentPreferenceMatch(apartment(), preferences).matchScore, 100);
    });
});

test("redistributes location and budget proportionally", () => {
    const preferences = { preferredArea: "Baldoza", minBudget: 5000, maxBudget: 8000 };
    const weights = getAdjustedPreferenceWeights(preferences);
    assert.equal(weights.location, 50 / 70 * 100);
    assert.equal(weights.budget, 20 / 70 * 100);
    assert.equal(calculateApartmentPreferenceMatch(apartment({ rooms: [availableRoom({ price: 9000 })] }), preferences).matchScore, weights.location);
});

test("calculates selected amenity fractions and does not double count", () => {
    const preferences = { wifi: true, parking: true, furnished: true, ownBathroom: true };
    const result = calculateApartmentPreferenceMatch(apartment({
        rooms: [availableRoom({ hasPrivateBath: true, amenities: ["WiFi"] })],
    }), preferences);
    assert.equal(result.categoryRatios.amenities, 0.75);
    assert.equal(result.matchScore, 75);
});

test("retains 50/20/10/10/10 when all categories are selected", () => {
    const preferences = {
        preferredArea: "Baldoza",
        minBudget: 5000,
        maxBudget: 8000,
        minBedrooms: "2",
        roomCapacity: "2",
        wifi: true,
        parking: true,
        furnished: true,
        ownBathroom: true,
    };
    const weights = getAdjustedPreferenceWeights(preferences);
    assert.deepEqual(weights, { location: 50, budget: 20, bedrooms: 10, capacity: 10, amenities: 10 });
    const result = calculateApartmentPreferenceMatch(apartment({
        rooms: [availableRoom({ hasPrivateBath: true })],
    }), preferences);
    assert.equal(result.categoryRatios.amenities, 0.75);
    assert.equal(result.matchScore, 97.5);
});

test("does not fabricate a budget match for missing prices or an undersized room", () => {
    assert.equal(calculateApartmentPreferenceMatch(apartment({ rooms: [availableRoom({ price: null })] }), {
        minBudget: 5000,
        maxBudget: 8000,
    }).matchScore, 0);
    assert.equal(calculateApartmentPreferenceMatch(apartment({ rooms: [availableRoom({ maxOccupants: 1 })] }), {
        roomCapacity: "2",
    }).matchScore, 0);
});

test("uses the best individual available room instead of combining rooms", () => {
    const preferences = { minBudget: 5000, maxBudget: 8000, roomCapacity: "2" };
    const result = calculateApartmentPreferenceMatch(apartment({
        rooms: [
            availableRoom({ id: "budget", price: 7000, maxOccupants: 1 }),
            availableRoom({ id: "capacity", price: 10000, maxOccupants: 2 }),
        ],
    }), preferences);
    assert.equal(result.matchScore, 20 / 30 * 100);
    assert.equal(result.matchedRoom.id, "budget");
});

test("keeps ties in their original browsing order and leaves no-preference browsing unchanged", () => {
    const first = apartment({ id: "first" });
    const second = apartment({ id: "second" });
    assert.deepEqual(rankApartments([first, second], {}), [first, second]);
    assert.deepEqual(rankApartments([first, second], { preferredArea: "Not Baldoza" }).map((item) => item.id), ["first", "second"]);
});
