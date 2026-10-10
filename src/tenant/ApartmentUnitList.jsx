import { DoorOpen } from "lucide-react";
import { getRoomStatus } from "@/utils/roomAvailability";
import { getImageUrl } from "@/utils/images";

const labels = { available: "Available", occupied: "Occupied", maintenance: "Under Maintenance" };
export function ApartmentUnitList({ rooms, apartment, onSelect, tenantStyle = false }) {
    const available = rooms.filter(room => getRoomStatus(room) === "available").length;
    return <section className={`market-apartment-unit-section ${tenantStyle ? "tenant-unit-reference" : ""}`}>
      <header><div><h2>Unit Details</h2><p>Current unit availability in this apartment.</p></div><span className="market-unit-status market-unit-status-available">{available} Available</span></header>
      <div className="market-apartment-unit-list">{rooms.length ? rooms.map((room, index) => {
        const status = getRoomStatus(room);
        const savedIncluded = apartment.features?.unitInclusions?.[room.id] ?? room.amenities ?? [];
        const included = Array.isArray(savedIncluded) ? savedIncluded : [];
        const unitName = room.name ? /^unit\b/i.test(room.name) ? room.name : `Unit ${room.name}` : `Unit ${index + 1}`;
        return <button type="button" key={room.id || index} className="market-apartment-unit" onClick={() => onSelect(room)}>
          <div className="market-apartment-unit-photo">{room.images?.[0] ? <img src={getImageUrl(room.images[0])} alt={room.name || `Unit ${index + 1}`}/> : <DoorOpen/>}</div>
          <div className="market-apartment-unit-information">
            <div className="market-apartment-unit-heading"><h3>{unitName}</h3><span className={`market-unit-status market-unit-status-${status}`}>{labels[status]}</span></div>
            <p className="market-apartment-unit-rent">₱ {Number(room.price || 0).toLocaleString("en-PH")} / month</p>
            <div className="market-apartment-unit-facts"><span>{room.bedrooms == null ? "Bedrooms not provided" : `${room.bedrooms} ${Number(room.bedrooms) === 1 ? "Bedroom" : "Bedrooms"}`}</span><span>{Number(room.sqft) > 0 ? `${Math.round(Number(room.sqft) * 0.09290304)} sqm` : "Floor area not provided"}</span></div>
            <div className="market-apartment-unit-included"><strong>Unit Included</strong>{included.length ? included.map(item => <span key={item}>{item}</span>) : <small>No included items listed.</small>}</div>
            <div className="market-apartment-unit-description"><strong>Description</strong><p>{room.description || "No unit description provided."}</p></div>
          </div>
        </button>;
      }) : <p>No unit information available.</p>}</div>
    </section>;
}
