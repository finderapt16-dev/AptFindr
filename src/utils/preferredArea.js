import { isTenantVisibleApartment } from "./listingVisibility";

const normalizeArea = value => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function hasListingsInPreferredArea(apartments, area) {
    const selected = normalizeArea(area);
    if (!selected) return true;
    return apartments.some(apartment => {
        if (!isTenantVisibleApartment(apartment)) return false;
        return [apartment.barangay, apartment.area, apartment.preferredArea, apartment.location?.barangay, apartment.location?.area, apartment.address?.barangay, apartment.address?.area, typeof apartment.address === "string" ? apartment.address : "", typeof apartment.location === "string" ? apartment.location : ""].some(value => (` ${normalizeArea(value)} `).includes(` ${selected} `));
    });
}
