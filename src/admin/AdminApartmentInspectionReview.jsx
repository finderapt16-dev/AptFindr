import "./AdminApartmentInspectionReview.css";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Check, Clock3, FileText, MapPin, Trash2, UserRound, X } from "lucide-react";
import { MapView } from "@/components/MapView";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { useState } from "react";

const list = (value) => Array.isArray(value) ? value.filter(Boolean) : typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
const amount = (value) => Number(value || 0).toLocaleString("en-PH");

export function AdminApartmentInspectionReview({ apartment, images, rooms, landlord, propertyType, listingStatus, submittedOn, rules, utilities, onApprove, onBack, onReject, onRequestChanges, onSelectImage, selectedImageIndex, onViewLandlord }) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [message, setMessage] = useState("");
  const isPublished = apartment.isPublished !== false;
  const statusLabel = isPublished ? "Published" : listingStatus || "Pending Review";
  const location = [apartment.address, apartment.barangay, apartment.city, apartment.state].filter(Boolean).join(", ") || "Location not provided";
  const roomPrices = rooms.map((room) => Number(room.price || 0)).filter((price) => price > 0);
  const lowestPrice = roomPrices.length ? Math.min(...roomPrices) : Number(apartment.price || 0);
  const highestPrice = roomPrices.length ? Math.max(...roomPrices) : Number(apartment.price || 0);
  const submitRequest = async () => {
    if (!message.trim()) return;
    const sent = await onRequestChanges(message.trim());
    if (sent !== false) { setMessage(""); setRequestOpen(false); }
  };

  return <div className="admin-inspection-review">
    <button type="button" className="admin-inspection-review-back" onClick={onBack}><ArrowLeft aria-hidden="true" />Back to Apartments</button>
    <header className="admin-inspection-review-heading"><h1>Apartment Details Review</h1><p>Review the submitted apartment details, and unit specifications before approval.</p></header>
    <div className="admin-inspection-review-layout">
      <div className="admin-inspection-review-main">
        <section className="admin-inspection-review-card">
          <h2>Apartment Information</h2>
          <div className="admin-inspection-review-property">
            <div className="admin-inspection-review-gallery">
              <div className="admin-inspection-review-main-photo">
              {images.length ? <ImageWithFallback src={images[selectedImageIndex] ?? images[0]} alt={apartment.title || "Apartment"} className="admin-inspection-review-cover" /> : <div className="admin-inspection-review-no-image">No apartment image</div>}
                {images.length > 1 && <>
                  <button type="button" className="photo-navigation-arrow admin-inspection-photo-prev" aria-label="Previous apartment image" onClick={() => onSelectImage(((selectedImageIndex ?? 0) - 1 + images.length) % images.length)}><ChevronLeft /></button>
                  <button type="button" className="photo-navigation-arrow admin-inspection-photo-next" aria-label="Next apartment image" onClick={() => onSelectImage(((selectedImageIndex ?? 0) + 1) % images.length)}><ChevronRight /></button>
                </>}
              </div>
              {images.length > 1 && <div className="admin-inspection-review-dots">{images.slice(0, 6).map((image, index) => <button type="button" aria-label={`View image ${index + 1}`} aria-current={selectedImageIndex === index} key={`${image}-${index}`} onClick={() => onSelectImage(index)} />)}</div>}
              {images.length > 1 && <div className="admin-inspection-review-thumbnails">{images.slice(0, 4).map((image, index) => <button type="button" key={`${image}-thumbnail-${index}`} onClick={() => onSelectImage(index)}><ImageWithFallback src={image} alt={`Property image ${index + 1}`} /></button>)}</div>}
            </div>
            <div className="admin-inspection-review-summary">
              <div className="admin-inspection-review-title"><div><h3>{apartment.title || "Untitled apartment"}</h3><p>{location}</p></div><span className={isPublished ? "published" : "pending"}>{statusLabel}</span></div>
              <dl>
                <div><dt>Apartment Type</dt><dd>{propertyType}</dd></div><div><dt>Total Units</dt><dd>{rooms.length || apartment.bedrooms || 0} rooms</dd></div>
                <div><dt>Price Range</dt><dd>{lowestPrice ? `₱${amount(lowestPrice)}${highestPrice && highestPrice !== lowestPrice ? ` - ₱${amount(highestPrice)}` : ""} / month` : "Not set"}</dd></div>
                <div><dt>Description</dt><dd>{apartment.description || "No description submitted."}</dd></div>
              </dl>
              <div className="admin-inspection-review-tags"><strong>House Rules & Policies</strong><div>{(rules.length ? rules : ["No rules specified"]).map((rule) => <span key={rule}>{rule}</span>)}</div></div>
              <div className="admin-inspection-review-tags"><strong>Utilities Included</strong><div>{(utilities.length ? utilities : ["No utilities specified"]).map((utility) => <span key={utility}>{utility}</span>)}</div></div>
            </div>
          </div>
        </section>
        <section className="admin-inspection-review-card"><h2>Units Overview</h2><p className="admin-inspection-review-subtitle">Review the submitted units for this apartment.</p><div className="admin-inspection-review-rooms">{rooms.length ? rooms.map((room, index) => <article key={room.id ?? index}><ImageWithFallback src={list(room.images ?? room.image ?? room.image_url)[0]} alt={room.name || `Unit ${index + 1}`} /><strong>{room.name || `Unit ${index + 1}`}</strong><b>{room.price ? `₱${amount(room.price)} / month` : "Price not set"}</b><span>{room.bedrooms ?? 1} Bed | {room.bathrooms ?? 1} Bath</span><span>{room.maxOccupants ?? room.max_occupants ?? 1} Occupancy</span><em>{String(room.status || "available").replace(/\b\w/g, (letter) => letter.toUpperCase())}</em></article>) : <p>No units submitted for this apartment.</p>}</div></section>
        <section className="admin-inspection-review-card"><h2>Location</h2><div className="admin-inspection-review-map">{Number.isFinite(Number(apartment.lat)) && Number.isFinite(Number(apartment.lng)) ? <MapView lat={Number(apartment.lat)} lng={Number(apartment.lng)} zoom={15} showSingleMarker /> : <div><MapPin aria-hidden="true" />Location coordinates have not been provided.</div>}</div></section>
      </div>
      <aside className="admin-inspection-review-side">
        <section className="admin-inspection-review-card"><h2>Listing Status</h2><p>Submitted on {submittedOn}</p><span className={`admin-inspection-review-status ${isPublished ? "published" : "pending"}`}><Clock3 aria-hidden="true" />{statusLabel}</span></section>
        <section className="admin-inspection-review-card"><h2>Landlord Profile</h2><div className="admin-inspection-review-landlord"><span>{(landlord?.name || "L").charAt(0).toUpperCase()}</span><div><strong>{landlord?.name || "Landlord unavailable"}</strong><p>Member since {landlord?.created_at ? new Date(landlord.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "Not available"}</p></div></div><button type="button" className="admin-inspection-review-outline" disabled={!landlord} onClick={onViewLandlord}><UserRound aria-hidden="true" />View Landlord Profile<ArrowRight aria-hidden="true" /></button></section>
        <section className="admin-inspection-review-card"><h2>Admin Actions</h2><p>Approve or deny this apartment listing based on photo and detail accuracy.</p><div className="admin-inspection-review-actions"><button type="button" className="admin-inspection-review-approve" onClick={onApprove}><Check aria-hidden="true" />{isPublished ? "Unpublish Listing" : "Approve Listing"}</button><button type="button" className="admin-inspection-review-outline" onClick={() => setRequestOpen(true)}><FileText aria-hidden="true" />Request Changes</button><button type="button" className="admin-inspection-review-reject" onClick={onReject}><Trash2 aria-hidden="true" />Reject Listing</button></div></section>
      </aside>
    </div>
    {requestOpen && <div className="admin-inspection-review-dialog" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="request-changes-title"><button type="button" aria-label="Close" className="admin-inspection-review-dialog-close" onClick={() => setRequestOpen(false)}><X /></button><h2 id="request-changes-title">Request changes</h2><p>Tell the landlord what must be updated before this listing can be approved.</p><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe the changes needed…" rows={5} /><button type="button" disabled={!message.trim()} className="admin-inspection-review-approve" onClick={() => void submitRequest()}>Send Request</button></div></div>}
  </div>;
}
