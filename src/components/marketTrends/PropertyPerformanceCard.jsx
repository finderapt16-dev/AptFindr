import { Eye, Heart, MapPin, Star } from "lucide-react";

import { ImageWithFallback } from "@/components/ImageWithFallback";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { getApartmentImageUrl } from "@/utils/images";
import { getRoomPriceRange } from "@/utils/priceRange";

const demandClassFor = (marketLevel) => marketLevel === "High Demand"
  ? "market-demand-high"
  : marketLevel === "Medium Demand"
    ? "market-demand-medium"
    : "market-demand-low";

const fallbackMetrics = [
  { id: "views", className: "market-metric-views", icon: Eye, label: "Views", value: (item) => Number(item.views ?? 0).toLocaleString() },
  { id: "favorites", className: "market-metric-favorites", icon: Heart, label: "Favorites", value: (item) => Number(item.favorites ?? 0).toLocaleString() },
  { id: "rating", className: "market-metric-rating", icon: Star, label: "Average Rating", value: (item) => item.ratingAverage === null || item.ratingAverage === undefined ? "—" : Number(item.ratingAverage).toFixed(1) },
];

/** Keeps the existing property-performance card markup in one reusable place. */
export function PropertyPerformanceCard({ entry, metrics = fallbackMetrics, trendType = "demand", onViewDetails }) {
  const apartment = entry.apartment;
  const image = getApartmentImageUrl(apartment);
  const location = formatApartmentLocation(apartment, "Location unavailable");
  const roomPrices = (apartment.rooms ?? [])
    .map((room) => Number(room.price ?? room.rent ?? 0))
    .filter((price) => Number.isFinite(price) && price > 0);
  const priceRange = getRoomPriceRange(apartment, roomPrices);

  return (
    <article className="market-property-card">
      <div className="market-property-image">
        {image ? <ImageWithFallback src={image} alt={apartment.title || "Apartment"} /> : (
          <div className="market-property-image-placeholder"><div className="market-building-placeholder"><span>Property</span></div></div>
        )}
      </div>

      <div className="market-property-info">
        <div className="market-property-title-row">
          <h3>{apartment.title || "Untitled property"}</h3>
          {trendType === "demand" && <span className={`market-demand-badge ${demandClassFor(entry.marketLevel)}`}>{entry.marketLevel || "Low Demand"}</span>}
        </div>
        <div className="market-property-location"><MapPin size={14} /><span>{location}</span></div>
        <div className="market-property-price">{priceRange.formatted}</div>
      </div>

      {metrics.map(({ id, className, icon: Icon, label, value }) => (
        <div key={id} className={`market-property-metric ${className}`}>
          <Icon size={17} /><strong>{value(entry)}</strong><span>{label}</span>
        </div>
      ))}

      <button type="button" className="market-view-details" onClick={() => onViewDetails?.(apartment, entry)}>View Details</button>
    </article>
  );
}
