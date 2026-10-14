import { useEffect, useMemo, useState } from "react";
import { Building2, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { MapView } from "@/components/MapView";
import { fetchApartmentRooms } from "@/services/apartmentsService";
import { getImageUrl } from "@/utils/images";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import "./ReportPropertyInspection.css";

const asList = (value) => Array.isArray(value)
  ? value.filter(Boolean).map(String)
  : typeof value === "string"
    ? value.split(",").map(item => item.trim()).filter(Boolean)
    : [];

const personName = (person) => person?.fullName || person?.full_name || person?.name || [person?.first_name, person?.last_name].filter(Boolean).join(" ") || "Landlord unavailable";
const hasCoordinates = (apartment) => Number.isFinite(Number(apartment?.lat)) && Number.isFinite(Number(apartment?.lng));

export function ReportPropertyInspection({ apartment, landlord }) {
  const [rooms, setRooms] = useState(() => Array.isArray(apartment?.rooms) ? apartment.rooms : []);
  const [unitsLoading, setUnitsLoading] = useState(Boolean(apartment?.id));
  const features = apartment?.features && typeof apartment.features === "object" && !Array.isArray(apartment.features) ? apartment.features : {};
  const images = useMemo(() => [...new Set([apartment?.image, ...(apartment?.images || [])].filter(Boolean))].slice(0, 4), [apartment]);
  const rules = asList(features.safetyRules ?? features.houseRules ?? apartment?.houseRules);
  const included = [...new Set([...asList(apartment?.utilities), ...asList(apartment?.amenities), ...asList(features.customFeatures)])];
  const contractDuration = features.contractDuration || apartment?.contractDuration || "Not specified";

  useEffect(() => {
    let active = true;
    if (!apartment?.id) {
      setRooms([]);
      setUnitsLoading(false);
      return undefined;
    }
    setUnitsLoading(true);
    fetchApartmentRooms(apartment.id)
      .then(result => { if (active) setRooms(result); })
      .catch(() => { if (active) setRooms(Array.isArray(apartment.rooms) ? apartment.rooms : []); })
      .finally(() => { if (active) setUnitsLoading(false); });
    return () => { active = false; };
  }, [apartment?.id]);

  if (!apartment) return null;

  return <section className="report-property-inspection" aria-label="Reported apartment inspection">
    <div className="report-property-inspection__header">
      <div><h2>{apartment.title || "Apartment unavailable"}</h2><p><MapPin aria-hidden="true" />{formatApartmentLocation(apartment) || "Location unavailable"}</p></div>
      <span>{apartment.isPublished ?? apartment.is_published ? "Published" : "Unpublished"}</span>
    </div>
    <div className="report-property-inspection__grid">
      <div className="report-property-inspection__primary">
        <section className="report-property-inspection__card">
          <h3>Apartment Image</h3>
          <div className="report-property-inspection__photos">
            {images[0] ? <ImageWithFallback src={getImageUrl(images[0])} alt={apartment.title || "Apartment"} /> : <div className="report-property-inspection__image-placeholder"><Building2 aria-hidden="true" /></div>}
            <div>{Array.from({ length: 4 }, (_, index) => images[index + 1] ? <ImageWithFallback key={index} src={getImageUrl(images[index + 1])} alt={`Apartment photo ${index + 2}`} /> : <span key={index} aria-hidden="true" />)}</div>
          </div>
        </section>
        <section className="report-property-inspection__card">
          <div className="report-property-inspection__section-heading"><div><h3>Unit Details</h3><p>Current availability in this apartment</p></div><span>{rooms.length} unit{rooms.length === 1 ? "" : "s"}</span></div>
          {unitsLoading ? <p className="report-property-inspection__empty">Loading units…</p> : rooms.length ? <div className="report-property-inspection__units">{rooms.map(room => {
            const roomImage = room.images?.[0] || room.image;
            const available = String(room.status || "available").toLowerCase() === "available" && !room.isOccupied;
            return <article key={room.id} className="report-property-inspection__unit">
              {roomImage ? <ImageWithFallback src={getImageUrl(roomImage)} alt={room.name || "Unit"} /> : <div className="report-property-inspection__unit-placeholder"><Building2 aria-hidden="true" /></div>}
              <div><header><strong>{room.name || "Unit"}</strong><span className={available ? "is-available" : "is-unavailable"}>{available ? "Available" : "Unavailable"}</span></header><b>₱{Number(room.price || 0).toLocaleString("en-PH")} / month</b><div className="report-property-inspection__tags">{[room.type, room.bedrooms != null ? `${room.bedrooms} bedroom${Number(room.bedrooms) === 1 ? "" : "s"}` : null, room.hasPrivateBath ? "Private bath" : null].filter(Boolean).map(tag => <span key={tag}>{tag}</span>)}</div>{room.description && <p>{room.description}</p>}</div>
            </article>;
          })}</div> : <p className="report-property-inspection__empty">No units have been added to this apartment.</p>}
        </section>
      </div>
      <aside className="report-property-inspection__side">
        <section className="report-property-inspection__card"><h3>Landlord Information</h3><div className="report-property-inspection__landlord"><span>{personName(landlord).charAt(0).toUpperCase()}</span><div><strong>{personName(landlord)}</strong><small>{landlord?.is_verified || landlord?.isVerified ? "Verified landlord" : "Landlord"}</small></div></div><dl><div><dt><Mail aria-hidden="true" />Email</dt><dd>{landlord?.email || "Not provided"}</dd></div><div><dt><Phone aria-hidden="true" />Phone</dt><dd>{landlord?.mobile || landlord?.mobileNumber || landlord?.phone || "Not provided"}</dd></div></dl></section>
        <section className="report-property-inspection__card"><h3>About this apartment</h3><p className="report-property-inspection__about">{apartment.description || features.description || "No apartment description provided."}</p></section>
        <section className="report-property-inspection__card"><h3>House Rules</h3><div className="report-property-inspection__pills">{(rules.length ? rules : ["No house rules provided."]).map(rule => <span key={rule}>{rule}</span>)}</div></section>
        <section className="report-property-inspection__card"><h3>Contract Duration</h3><div className="report-property-inspection__pills"><span>{contractDuration}</span></div></section>
        <section className="report-property-inspection__card"><h3>Apartment Included</h3><div className="report-property-inspection__pills">{(included.length ? included : ["No inclusions provided."]).map(item => <span key={item}>{item}</span>)}</div></section>
        <section className="report-property-inspection__card"><h3>Location</h3><p className="report-property-inspection__map-caption">The landlord's saved apartment location</p><div className="report-property-inspection__map">{hasCoordinates(apartment) ? <MapView lat={Number(apartment.lat)} lng={Number(apartment.lng)} zoom={15} showSingleMarker /> : <p><MapPin aria-hidden="true" />Location coordinates have not been provided.</p>}</div></section>
      </aside>
    </div>
  </section>;
}
