import { isRoomAvailable } from "../utils/listingVisibility.js";
const aliases = {
    "own bathroom": "own_bathroom", "private bathroom": "own_bathroom", "en-suite bathroom": "own_bathroom",
    wifi: "wifi", "wi-fi": "wifi", "wifi ready": "wifi",
    ac: "air_conditioning", aircon: "air_conditioning", "air conditioning": "air_conditioning",
    laundry: "laundry_area", "laundry area": "laundry_area",
    parking: "parking", furnished: "furnished", "pet friendly": "pet_friendly",
};
export const normalizeAmenity = (value) => {
    const normalized = String(value ?? "").trim().toLowerCase();
    return aliases[normalized] ?? normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
};

const normalize = normalizeAmenity;
export function getNormalizedApartmentAmenities(apartment) {
    const result = new Set((apartment.amenities ?? []).map(normalize));
    if (apartment.rooms?.some(room => isRoomAvailable(room) && room.hasPrivateBath))
        result.add("own_bathroom");
    if (apartment.parking)
        result.add("parking");
    if (apartment.furnished)
        result.add("furnished");
    if (apartment.petFriendly)
        result.add("pet_friendly");
    if (apartment.wifi)
        result.add("wifi");
    if (apartment.rooms?.some((room) => room.hasAC))
        result.add("air_conditioning");
    if (apartment.features && typeof apartment.features === "object" && !Array.isArray(apartment.features)) {
        Object.entries(apartment.features).forEach(([key, enabled]) => { if (enabled)
            result.add(normalize(key)); });
    }
    return result;
}

// The matching engine calls this per room so, for example, the price from one
// room cannot be paired with air-conditioning from another room.
export function getNormalizedRoomAmenities(room, apartment) {
    return new Set(getUnitAmenities(room, apartment).map(normalize).filter(Boolean));
}

export function getUnitAmenities(room, apartment) {
    const features = apartment.features && !Array.isArray(apartment.features) ? apartment.features : {};
    const included = features.unitInclusions?.[room.id] ?? room.amenities ?? [];
    return [...new Set([
        ...(Array.isArray(included) ? included : []),
        ...(Array.isArray(apartment.amenities) ? apartment.amenities : []),
        ...(Array.isArray(features.customFeatures) ? features.customFeatures : []),
        ...(room.hasPrivateBath ? ["Private Bathroom"] : []),
        ...(room.hasAC ? ["Air Conditioning"] : []),
        ...(apartment.petFriendly ? ["Pet Friendly"] : []),
        ...(apartment.parking ? ["Parking"] : []),
        ...(apartment.furnished ? ["Furnished"] : []),
    ])];
}
