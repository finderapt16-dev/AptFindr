import "./AdminApartmentInspectionPage.css";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Clock3, FileText, MapPin, UserRound } from "lucide-react";
import { MapView } from "@/components/MapView";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { getUnitAmenities } from "@/tenant/apartmentAmenities";
import { fetchApartmentInspectionDetails } from "@/services/apartmentsService";
import { createViolation, fetchUserById } from "@/services/dashboardSupabaseService";
import { useAuth } from "@/contexts/AuthContext";
import { AdminRequestChangesDialog } from "@/admin/AdminRequestChangesDialog";
import { rememberAdminModuleLocation } from "@/admin/adminNavigationMemory";
import { rememberAdminModuleLocation as rememberSuperAdminModuleLocation } from "@/superadmin/superAdminNavigationMemory";
import { toast } from "sonner";

const list = (value) => Array.isArray(value) ? value.filter(Boolean) : typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
const money = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? `₱${amount.toLocaleString("en-PH")}` : "";
};
const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
};

export function AdminApartmentInspectionPage() {
  const { id } = useParams();
  const locationState = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [details, setDetails] = useState(null);
  const [landlord, setLandlord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageIndex, setImageIndex] = useState(0);
  const [requestOpen, setRequestOpen] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetchApartmentInspectionDetails(id)
      .then((result) => {
        if (active) {
          setDetails(result);
          if (!result) setError("This apartment could not be found.");
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load apartment details.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    const landlordId = details?.apartment?.landlordId;
    if (!landlordId) { setLandlord(null); return; }
    let active = true;
    fetchUserById(landlordId).then((account) => { if (active) setLandlord(account); }).catch(() => { if (active) setLandlord(null); });
    return () => { active = false; };
  }, [details?.apartment?.landlordId]);

  const apartment = details?.apartment;
  const raw = details?.rawApartment ?? {};
  const features = raw.features && typeof raw.features === "object" && !Array.isArray(raw.features) ? raw.features : {};
  const rooms = details?.rooms?.length ? details.rooms : apartment?.rooms ?? [];
  const images = useMemo(() => Array.from(new Set([
    ...(details?.images ?? []).slice().sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) || Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)).map((item) => item.url),
    ...(apartment?.images ?? []), apartment?.image,
  ].filter((image) => typeof image === "string" && image.trim()))), [details, apartment]);

  const address = apartment ? [apartment.barangay, apartment.city, apartment.state].filter(Boolean).join(", ") || apartment.address || "Location not provided" : "";
  const prices = rooms.map((room) => Number(room.price)).filter((value) => Number.isFinite(value) && value > 0);
  const minPrice = prices.length ? Math.min(...prices) : Number(apartment?.price ?? 0);
  const maxPrice = prices.length ? Math.max(...prices) : minPrice;
  const priceRange = minPrice ? `${money(minPrice)}${maxPrice && maxPrice !== minPrice ? ` - ${money(maxPrice)}` : ""} / month` : "Price not provided";
  const rules = list(features.houseRules ?? features.house_rules ?? apartment?.houseRules ?? apartment?.house_rules);
  const utilities = list(features.utilities ?? features.utilitiesIncluded ?? apartment?.utilities);
  const approvalStatus = String(apartment?.approvalStatus ?? apartment?.approval_status ?? apartment?.status ?? "").trim().toLowerCase();
  const isPublished = apartment?.isPublished === true || apartment?.is_published === true;
  const status = ["rejected", "denied", "declined"].includes(approvalStatus) ? "Rejected" : isPublished ? "Published" : apartment?.isVerified || apartment?.is_verified || ["approved", "verified"].includes(approvalStatus) ? "Verified" : "Pending";
  const portalBasePath = locationState.pathname.startsWith("/super-admin/") ? "/super-admin" : "/admin";
  const fallbackReturnPath = `${portalBasePath}?section=apartments`;
  const landlordName = landlord?.name || landlord?.full_name || "Landlord unavailable";
  const landlordId = apartment?.landlordId ?? apartment?.landlord_id;
  const back = () => navigate(locationState.state?.returnTo || fallbackReturnPath, { replace: true });

  const sendChangesRequest = async ({ requestType, message }) => {
    if (!landlordId || !user?.id || isSendingRequest) return;
    setIsSendingRequest(true);
    try {
      const created = await createViolation({ landlord_id: landlordId, admin_id: user.id, mode: "notice", type: requestType, message, issued_at: new Date().toISOString(), apartment_id: apartment.id, active: true });
      if (!created) throw new Error("The change request could not be sent. Please try again.");
      setRequestOpen(false);
      toast.success("Change request sent to the landlord.");
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Unable to send the change request.");
    } finally {
      setIsSendingRequest(false);
    }
  };

  const openLandlordProfile = () => {
    if (!user?.id || !landlordId) return;
    const remember = portalBasePath === "/super-admin" ? rememberSuperAdminModuleLocation : rememberAdminModuleLocation;
    remember(user.id, "landlords", { view: "landlord-details", landlordId: String(landlordId) });
    navigate(`${portalBasePath}?section=landlords&landlordId=${encodeURIComponent(String(landlordId))}`);
  };

  if (loading) return <main className="admin-apartment-full"><div className="admin-apartment-full__state">Loading apartment details…</div></main>;
  if (error || !apartment) return <main className="admin-apartment-full"><button type="button" className="admin-apartment-full__back" onClick={back}><ArrowLeft />{locationState.state?.backLabel || "Back to Apartments"}</button><div className="admin-apartment-full__state" role="alert">{error || "Apartment details are unavailable."}</div></main>;

  return <main className="admin-apartment-full">
    <button type="button" className="admin-apartment-full__back" onClick={back}><ArrowLeft aria-hidden="true" />{locationState.state?.backLabel || "Back to Apartments"}</button>
    <header className="admin-apartment-full__heading"><h1>Apartment Details Review</h1><p>Review the submitted apartment details and unit specifications before approval.</p></header>

    <div className="admin-apartment-full__layout">
      <div className="admin-apartment-full__main-column">
        <section className="admin-apartment-full__card admin-apartment-full__property">
          <h2>Apartment Information</h2>
          <div className="admin-apartment-full__property-grid">
            <div className="admin-apartment-full__gallery">
              <div className="admin-apartment-full__hero-image">
                {images.length ? <ImageWithFallback src={images[imageIndex] ?? images[0]} alt={apartment.title || "Apartment"} /> : <div className="admin-apartment-full__placeholder">No apartment image</div>}
                {images.length > 1 && <>
                  <button type="button" aria-label="Previous apartment image" onClick={() => setImageIndex((index) => (index - 1 + images.length) % images.length)}><ChevronLeft /></button>
                  <button type="button" aria-label="Next apartment image" onClick={() => setImageIndex((index) => (index + 1) % images.length)}><ChevronRight /></button>
                  <div className="admin-apartment-full__dots">{images.map((image, index) => <button key={`${image}-${index}`} type="button" aria-label={`View image ${index + 1}`} aria-current={index === imageIndex} onClick={() => setImageIndex(index)} />)}</div>
                </>}
              </div>
              {images.length > 1 && <div className="admin-apartment-full__thumbnails">{images.slice(0, 4).map((image, index) => <button type="button" key={`${image}-thumb-${index}`} className={index === imageIndex ? "is-active" : ""} onClick={() => setImageIndex(index)}><ImageWithFallback src={image} alt={`Apartment ${index + 1}`} /></button>)}</div>}
            </div>

            <div className="admin-apartment-full__details">
              <div className="admin-apartment-full__title"><div><h3>{apartment.title || "Untitled apartment"}</h3><p>{address}</p></div><span className={`is-${status.toLowerCase()}`}>{status}</span></div>
              <dl className="admin-apartment-full__facts">
                <div><dt>Property Type</dt><dd>{features.propertyType ?? features.property_type ?? features.type ?? "Apartment"}</dd></div>
                <div><dt>Total Rooms</dt><dd>{rooms.length} {rooms.length === 1 ? "room" : "rooms"}</dd></div>
                <div><dt>Price Range</dt><dd>{priceRange}</dd></div>
                <div><dt>Description</dt><dd>{apartment.description || "No description provided."}</dd></div>
              </dl>
              <section className="admin-apartment-full__tags"><h3>House Rules &amp; Policies</h3><div>{(rules.length ? rules : ["No rules provided"]).map((item) => <span key={item}>{item}</span>)}</div></section>
              <section className="admin-apartment-full__tags"><h3>Utilities Included</h3><div>{(utilities.length ? utilities : ["Not specified"]).map((item) => <span key={item}>{item}</span>)}</div></section>
            </div>
          </div>
        </section>

        <section className="admin-apartment-full__card admin-apartment-full__units">
          <h2>Units Overview</h2><p>Review the submitted units for this apartment.</p>
          {rooms.length ? <div className="admin-apartment-full__unit-list">{rooms.map((room, index) => {
            const roomImages = list(room.images ?? room.image ?? room.image_url);
            const amenities = getUnitAmenities(room, apartment);
            const roomStatus = String(room.status || (room.is_occupied ? "occupied" : "available")).replace(/\b\w/g, (letter) => letter.toUpperCase());
            return <article className="admin-apartment-full__unit" key={room.id ?? index}>
              <div className="admin-apartment-full__unit-photo">{roomImages[0] ? <ImageWithFallback src={roomImages[0]} alt={room.name || `Unit ${index + 1}`} /> : <div>No unit image</div>}</div>
              <div className="admin-apartment-full__unit-content">
                <div className="admin-apartment-full__unit-heading"><h3>{room.name || `Unit ${index + 1}`}</h3><span className={roomStatus.toLowerCase()}>{roomStatus}</span></div>
                <strong className="admin-apartment-full__rent">{money(room.price)} / month</strong>
                <p className="admin-apartment-full__unit-meta">{room.bedrooms ?? 1} Bedrooms <i /> {room.sqft ? `${room.sqft}sqm` : "Size not provided"}</p>
                <div className="admin-apartment-full__amenities"><b>Unit Included</b>{(amenities.length ? amenities : ["No amenities provided"]).map((item) => <span key={item}>{item}</span>)}</div>
                {room.description && <div className="admin-apartment-full__unit-description"><strong>Description</strong><p>{room.description}</p></div>}
              </div>
            </article>;
          })}</div> : <p className="admin-apartment-full__empty">No units have been submitted for this apartment.</p>}
        </section>
        <section className="admin-apartment-full__card admin-apartment-full__map-card">
          <h2>Location</h2>
          <div className="admin-apartment-full__map">
            {Number.isFinite(Number(apartment.lat)) && Number.isFinite(Number(apartment.lng)) && apartment.lat !== null && apartment.lng !== null
              ? <MapView lat={Number(apartment.lat)} lng={Number(apartment.lng)} zoom={15} showSingleMarker />
              : <div className="admin-apartment-full__map-empty"><MapPin /><strong>{apartment.title}</strong><span>{address}</span><small>Location coordinates have not been provided.</small></div>}
          </div>
          <p className="admin-apartment-full__map-address"><MapPin />{address}</p>
        </section>
      </div>
      <aside className="admin-apartment-full__side-column">
        <section className="admin-apartment-full__card admin-apartment-full__landlord-card">
          <h2>Landlord Profile</h2>
          <div className="admin-apartment-full__landlord"><span>{landlord?.avatar_url || landlord?.avatar ? <img src={landlord.avatar_url || landlord.avatar} alt="" /> : landlordName.charAt(0).toUpperCase()}</span><div><strong>{landlordName}</strong><p>Member since {landlord?.created_at ? new Date(landlord.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "Not available"}</p></div></div>
          <button type="button" className="admin-apartment-full__outline-action" disabled={!landlordId} onClick={openLandlordProfile}><UserRound aria-hidden="true" />View Landlord Profile<ArrowRight aria-hidden="true" /></button>
        </section>
        <section className="admin-apartment-full__card admin-apartment-full__actions-card">
          <h2>Admin Actions</h2><p>Request document updates or necessary changes for this apartment listing.</p>
          <button type="button" className="admin-apartment-full__outline-action" disabled={!landlordId} onClick={() => setRequestOpen(true)}><FileText aria-hidden="true" />Request Changes</button>
        </section>
      </aside>
    </div>
    <AdminRequestChangesDialog open={requestOpen} onClose={() => setRequestOpen(false)} onSubmit={sendChangesRequest} isSending={isSendingRequest} />
  </main>;
}
