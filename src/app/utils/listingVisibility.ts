import type { Apartment, ApartmentRoom } from "@/app/data/apartments";

export const isRoomAvailable = (room: ApartmentRoom): boolean => {
  const status = room.status ?? (room.isOccupied ? "occupied" : "available");
  return status === "available" && room.isOccupied !== true;
};

export const getAvailableRoomCount = (apartment: Apartment): number =>
  (apartment.rooms ?? []).filter(isRoomAvailable).length;

export const getLowestAvailableRoomPrice = (apartment: Apartment): number | null => {
  const prices = (apartment.rooms ?? [])
    .filter(isRoomAvailable)
    .map((room) => Number(room.price))
    .filter((price) => Number.isFinite(price) && price > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
};

/**
 * Shared client-side listing rule. Landlord verification is enforced by
 * database RLS, so tenant clients never receive published rows belonging to
 * an unverified landlord.
 *
 * Rooms are optional while a landlord completes setup. Once rooms exist, at
 * least one must be available for the property to appear in tenant discovery.
 */
export const isTenantVisibleApartment = (apartment: Apartment): boolean => {
  if (apartment.landlordVerified !== true) return false;
  if (apartment.isPublished !== true) return false;
  if (apartment.approvalStatus !== "approved") return false;
  if (apartment.isArchived === true || apartment.deletedAt) return false;
  if (apartment.status !== "available") return false;

  const availableDate = new Date(apartment.availableDate);
  if (!Number.isNaN(availableDate.getTime()) && availableDate > new Date()) return false;

  return !apartment.rooms?.length || getAvailableRoomCount(apartment) > 0;
};
