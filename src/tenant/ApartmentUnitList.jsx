import { getUnitAmenities } from "./apartmentAmenities";
import { getRoomStatus } from "@/utils/roomAvailability";
import { RoomImageGallery } from "@/components/RoomImageGallery";

const labels = { available: "Available", occupied: "Occupied", maintenance: "Under Maintenance" };
export function ApartmentUnitList({ rooms, apartment, tenantStyle = false }) {
    const available = rooms.filter(room => getRoomStatus(room) === "available").length;
    return <section className={`market-apartment-unit-section ${tenantStyle ? "tenant-unit-reference" : ""}`}>
      <header><div><h2>Unit Details</h2><p>Current unit availability in this apartment.</p></div><span className="market-unit-status market-unit-status-available">{available} Available</span></header>
      <div className="market-apartment-unit-list">{rooms.length ? rooms.map((room, index) => {
        const status = getRoomStatus(room);
        const included = getUnitAmenities(room, apartment);
        const unitName = room.name ? /^unit\b/i.test(room.name) ? room.name : `Unit ${room.name}` : `Unit ${index + 1}`;
        const roomImages = Array.isArray(room.images) ? room.images : typeof room.images === "string" ? room.images.split(",") : [];
        return <article key={room.id || index} className="market-apartment-unit">
          <div className="market-apartment-unit-photo market-apartment-unit-gallery">
            <RoomImageGallery images={roomImages} roomName={unitName} unitCard/>
          </div>
          <div className="market-apartment-unit-information">
            <div className="market-apartment-unit-heading"><h3>{unitName}</h3><span className={`market-unit-status market-unit-status-${status}`}>{labels[status]}</span></div>
            <p className="market-apartment-unit-rent">₱ {Number(room.price || 0).toLocaleString("en-PH")} / month</p>
            <div className="market-apartment-unit-facts"><span>{room.bedrooms == null ? "Bedrooms not provided" : `${room.bedrooms} ${Number(room.bedrooms) === 1 ? "Bedroom" : "Bedrooms"}`}</span><span>{Number(room.sqft) > 0 ? `${Math.round(Number(room.sqft) * 0.09290304)} sqm` : "Floor area not provided"}</span></div>
            <div className="market-apartment-unit-included"><strong>Unit Included</strong>{included.length ? included.map(item => <span key={item}>{item}</span>) : <small>No included items listed.</small>}</div>
            <div className="market-apartment-unit-description"><strong>Description</strong><p>{room.description || "No unit description provided."}</p></div>
          </div>
        </article>;
      }) : <p>No unit information available.</p>}</div>
    </section>;
}
