import "./AdminLandlordApartmentDetailsReview.css";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { MapView } from "@/components/MapView";
import { getUnitAmenities } from "@/tenant/apartmentAmenities";
import { fetchApartmentInspectionDetails } from "@/services/apartmentsService";
import { hasValidApartmentCoordinates } from "@/utils/mapCoordinates";

const list = (value) => Array.isArray(value)
  ? value.filter(Boolean)
  : typeof value === "string"
    ? value.split(",").map((item) => item.trim()).filter(Boolean)
    : [];

const money = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? `₱${amount.toLocaleString("en-PH")}` : "Price not provided";
};

const pretty = (value, fallback = "Not provided") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

function roomStatus(room) {
  const status = String(room?.status ?? "").trim().toLowerCase();
  if (room?.isOccupied === true || room?.is_occupied === true || status === "occupied" || status === "reserved") return "Occupied";
  if (status === "maintenance") return "Under Maintenance";
  return "Available";
}

export function AdminLandlordApartmentDetailsReview() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const landlordId = searchParams.get("landlordId") ?? "";
  const apartmentId = searchParams.get("apartmentId") ?? "";
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    let active = true;
    setDetails(null);
    setLoading(true);
    setError("");
    setImageIndex(0);

    if (!id || !landlordId || (apartmentId && apartmentId !== id)) {
      setError("The apartment review link is incomplete or invalid.");
      setLoading(false);
      return () => { active = false; };
    }

    fetchApartmentInspectionDetails(id)
      .then((result) => {
        if (!active) return;
        const apartment = result?.apartment;
        const ownerId = apartment?.landlordId ?? apartment?.landlord_id;
        if (!apartment || String(apartment.id) !== String(id)) {
          setError("This apartment could not be found.");
          return;
        }
        if (String(ownerId ?? "") !== String(landlordId)) {
          setError("This apartment does not belong to the selected landlord.");
          return;
        }
        setDetails(result);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load apartment details.");
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [apartmentId, id, landlordId]);

  const apartment = details?.apartment;
  const rawFeatures = details?.rawApartment?.features;
  const features = rawFeatures && typeof rawFeatures === "object" && !Array.isArray(rawFeatures) ? rawFeatures : {};
  const rooms = apartment?.rooms ?? details?.rooms ?? [];
  const images = useMemo(() => Array.from(new Set([
    ...(details?.images ?? [])
      .slice()
      .sort((left, right) => Number(Boolean(right.is_primary)) - Number(Boolean(left.is_primary)) || Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0))
      .map((image) => image.url),
    ...(apartment?.images ?? []),
    apartment?.image,
  ].filter((image) => typeof image === "string" && image.trim()))), [apartment?.image, apartment?.images, details?.images]);

  const address = apartment
    ? [apartment.address, apartment.barangay, apartment.city, apartment.state].filter(Boolean).filter((part, index, all) => all.indexOf(part) === index).join(", ") || "Location not provided"
    : "";
  const prices = rooms.map((room) => Number(room.price)).filter((price) => Number.isFinite(price) && price > 0);
  const minimumPrice = prices.length ? Math.min(...prices) : Number(apartment?.price ?? 0);
  const maximumPrice = prices.length ? Math.max(...prices) : minimumPrice;
  const priceRange = minimumPrice > 0
    ? `${money(minimumPrice)}${maximumPrice > minimumPrice ? ` – ${money(maximumPrice)}` : ""} / month`
    : "Price not provided";
  const houseRules = list(features.houseRules ?? features.house_rules ?? apartment?.houseRules ?? apartment?.house_rules);
  const utilities = list(features.utilities ?? features.utilitiesIncluded ?? apartment?.utilities);
  const propertyType = features.propertyType ?? features.property_type ?? features.type ?? apartment?.propertyType ?? "Apartment";
  const backUrl = `/admin?section=landlords&landlordId=${encodeURIComponent(landlordId)}&apartmentId=${encodeURIComponent(id ?? "")}`;

  const handleBack = () => {
    const returnTo = location.state?.returnTo;
    if (returnTo === backUrl && Number(window.history.state?.idx) > 0) {
      navigate(-1);
      return;
    }
    navigate(backUrl, { replace: true });
  };

  if (loading) {
    return <main className="admin-landlord-apartment-review"><div className="admin-landlord-apartment-review__state" role="status">Loading apartment details…</div></main>;
  }

  if (error || !apartment) {
    return <main className="admin-landlord-apartment-review">
      <button type="button" className="admin-landlord-apartment-review__back" onClick={handleBack}><ArrowLeft aria-hidden="true" />Apartment Verification</button>
      <div className="admin-landlord-apartment-review__state" role="alert">{error || "Apartment details are unavailable."}</div>
    </main>;
  }

  const coordinatesValid = hasValidApartmentCoordinates(apartment.lat, apartment.lng);

  return <main className="admin-landlord-apartment-review">
    <button type="button" className="admin-landlord-apartment-review__back" onClick={handleBack}><ArrowLeft aria-hidden="true" />Apartment Verification</button>
    <header className="admin-landlord-apartment-review__heading">
      <h1>Apartment Details Review</h1>
      <p>Review the submitted apartment details and unit specifications before approval.</p>
    </header>

    <div className="admin-landlord-apartment-review__grid">
      <section className="admin-landlord-apartment-review__card admin-landlord-apartment-review__information">
        <h2>Apartment Information</h2>
        <div className="admin-landlord-apartment-review__property-grid">
          <div className="admin-landlord-apartment-review__gallery">
            <div className="admin-landlord-apartment-review__hero">
              {images.length
                ? <ImageWithFallback src={images[imageIndex] ?? images[0]} alt={pretty(apartment.title, "Apartment")} />
                : <div className="admin-landlord-apartment-review__placeholder">No apartment image submitted</div>}
              {images.length > 1 && <>
                <button type="button" aria-label="Previous apartment image" onClick={() => setImageIndex((index) => (index - 1 + images.length) % images.length)}><ChevronLeft aria-hidden="true" /></button>
                <button type="button" aria-label="Next apartment image" onClick={() => setImageIndex((index) => (index + 1) % images.length)}><ChevronRight aria-hidden="true" /></button>
                <div className="admin-landlord-apartment-review__dots">{images.map((image, index) => <button key={`${image}-${index}`} type="button" aria-label={`Show image ${index + 1}`} aria-current={index === imageIndex} onClick={() => setImageIndex(index)} />)}</div>
              </>}
            </div>
            {images.length > 1 && <div className="admin-landlord-apartment-review__thumbnails">{images.slice(0, 4).map((image, index) => <button key={`${image}-thumb-${index}`} type="button" className={index === imageIndex ? "is-active" : ""} aria-label={`Show image ${index + 1}`} onClick={() => setImageIndex(index)}><ImageWithFallback src={image} alt="" /></button>)}</div>}
          </div>

          <div className="admin-landlord-apartment-review__details">
            <div className="admin-landlord-apartment-review__title"><h3>{pretty(apartment.title, "Untitled apartment")}</h3><p>{address}</p></div>
            <dl className="admin-landlord-apartment-review__facts">
              <div><dt>Property Type</dt><dd>{pretty(propertyType)}</dd></div>
              <div><dt>Total Rooms</dt><dd>{rooms.length} {rooms.length === 1 ? "room" : "rooms"}</dd></div>
              <div><dt>Price Range</dt><dd>{priceRange}</dd></div>
              <div><dt>Description</dt><dd>{pretty(apartment.description, "No description provided.")}</dd></div>
            </dl>
            <section className="admin-landlord-apartment-review__tag-group"><h3>House Rules &amp; Policies</h3><div>{(houseRules.length ? houseRules : ["Not specified"]).map((item) => <span key={item}>{item}</span>)}</div></section>
            <section className="admin-landlord-apartment-review__tag-group"><h3>Utilities Included</h3><div>{(utilities.length ? utilities : ["Not specified"]).map((item) => <span key={item}>{item}</span>)}</div></section>
          </div>
        </div>
      </section>

      <section className="admin-landlord-apartment-review__card admin-landlord-apartment-review__location">
        <h2>Location</h2>
        <div className="admin-landlord-apartment-review__map">
          {coordinatesValid
            ? <MapView lat={Number(apartment.lat)} lng={Number(apartment.lng)} zoom={15} showSingleMarker />
            : <div className="admin-landlord-apartment-review__map-empty"><MapPin aria-hidden="true" /><strong>{pretty(apartment.title, "Apartment")}</strong><span>{address}</span><small>Location coordinates have not been provided.</small></div>}
        </div>
        <p className="admin-landlord-apartment-review__map-address"><MapPin aria-hidden="true" />{address}</p>
      </section>

      <section className="admin-landlord-apartment-review__card admin-landlord-apartment-review__units">
        <h2>Units Overview</h2>
        <p>Review the submitted units for this apartment.</p>
        {rooms.length
          ? <div className="admin-landlord-apartment-review__unit-list">{rooms.map((room, index) => {
            const roomImages = list(room.images ?? room.image ?? room.image_url);
            const amenities = getUnitAmenities(room, apartment);
            const status = roomStatus(room);
            const capacity = Number(room.maxOccupants ?? room.max_occupants ?? room.capacity);
            const rawBedrooms = room.bedrooms;
            const bedroomCount = rawBedrooms === null || rawBedrooms === undefined || rawBedrooms === ""
              ? 1
              : Number(rawBedrooms);
            const bedrooms = Number.isFinite(bedroomCount) ? bedroomCount : 1;
            return <article className="admin-landlord-apartment-review__unit" key={room.id ?? `${id}-unit-${index}`}>
              <div className="admin-landlord-apartment-review__unit-image">{roomImages[0] ? <ImageWithFallback src={roomImages[0]} alt={pretty(room.name, `Unit ${index + 1}`)} /> : <div>No unit image</div>}</div>
              <div className="admin-landlord-apartment-review__unit-content">
                <div className="admin-landlord-apartment-review__unit-heading"><h3>{pretty(room.name, `Unit ${index + 1}`)}</h3><span className={`is-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span></div>
                <strong className="admin-landlord-apartment-review__rent">{money(room.price)} / month</strong>
                <p className="admin-landlord-apartment-review__unit-meta">{bedrooms} {bedrooms === 1 ? "Bedroom" : "Bedrooms"}<i />{room.sqft ? `${room.sqft}sqm` : "Size not provided"}<i />{Number.isFinite(capacity) && capacity > 0 ? `${capacity} ${capacity === 1 ? "person" : "people"}` : "Capacity not provided"}</p>
                <div className="admin-landlord-apartment-review__amenities"><b>Unit Included</b>{(amenities.length ? amenities : ["No amenities provided"]).map((item) => <span key={item}>{item}</span>)}</div>
                <div className="admin-landlord-apartment-review__description"><strong>Description</strong><p>{pretty(room.description, "No description provided.")}</p></div>
              </div>
            </article>;
          })}</div>
          : <p className="admin-landlord-apartment-review__empty">No units have been submitted for this apartment.</p>}
      </section>
    </div>
  </main>;
}
