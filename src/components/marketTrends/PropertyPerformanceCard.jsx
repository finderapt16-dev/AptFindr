import { MapPin } from "lucide-react";

import { ImageWithFallback } from "@/components/ImageWithFallback";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { getApartmentImageUrl } from "@/utils/images";
import { getRoomPriceRange } from "@/utils/priceRange";

/** Reusable compact property card for the Top Performing Apartments section. */
export function PropertyPerformanceCard({
  entry,
  showVerification = false,
  verified = false,
  onViewDetails,
}) {
  const apartment = entry.apartment;
  const image = getApartmentImageUrl(apartment);
  const location = formatApartmentLocation(apartment, "Location unavailable");
  const roomPrices = (apartment.rooms ?? [])
    .map((room) => Number(room.price ?? room.rent ?? 0))
    .filter((price) => Number.isFinite(price) && price > 0);
  const priceRange = getRoomPriceRange(apartment, roomPrices);

  return (
    <article className="market-property-card market-property-card-compact">
      <div className="market-property-image">
        {image ? <ImageWithFallback src={image} alt={apartment.title || "Apartment"} /> : (
          <div className="market-property-image-placeholder"><div className="market-building-placeholder"><span>Apartment</span></div></div>
        )}
      </div>

      <div className="market-property-info">
        <div className="market-property-title-row">
          <h3>{apartment.title || "Untitled apartment"}</h3>
          {showVerification && verified && <span className="market-property-verified">Verified</span>}
        </div>
        <div className="market-property-location"><MapPin size={14} /><span>{location}</span></div>
        <div className="market-property-price">{priceRange.formatted}</div>
      </div>

      <button type="button" className="market-view-details" onClick={() => onViewDetails?.(apartment, entry)}>View Details</button>
    </article>
  );
}
