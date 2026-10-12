import { AlertTriangle, Facebook, MapPin, Maximize, Phone, Star } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { MapView } from "@/components/MapView";
import "./ApartmentInformationSidebar.css";

export function ApartmentInformationSidebar({ apartment, landlordName, landlordPhone, facebookUrl, verified, ratings, averageRating, rules, included, contractDuration, locationText, mapPinAvailable, copyLandlordPhone, expandMap, reportProblem, includedTitle = "Apartment Included" }) {
    const initials = landlordName === "Not provided" ? "L" : landlordName.split(/\s+/).map(part => part[0]).join("").slice(0, 2);
    return <div className="tenant-property-information">
      <section className="tenant-property-info-panel">
        <h2>Landlord Information</h2>
        <div className="tenant-property-owner">
          <div className="tenant-property-owner-profile">
            <span className="tenant-property-owner-avatar">{initials}</span>
            <div className="tenant-property-owner-identity">
              <strong>{landlordName}</strong>
              {verified && <VerifiedBadge label="Verified"/>}
              <div className="tenant-property-owner-rating">
                {ratings.length ? <><span className="tenant-property-owner-stars" aria-label={`${averageRating.toFixed(1)} out of 5 stars`}>{[1, 2, 3, 4, 5].map(value => <Star key={value} fill={value <= Math.round(averageRating) ? "currentColor" : "none"}/>)}</span><span>{averageRating.toFixed(1)}</span></> : <span>No ratings yet</span>}
              </div>
            </div>
          </div>
          <div className="tenant-property-owner-contact">
            {facebookUrl && <a href={facebookUrl} target="_blank" rel="noreferrer"><Facebook aria-hidden="true"/><span>{facebookUrl}</span></a>}
            {landlordPhone ? <button type="button" onClick={copyLandlordPhone} aria-label={`Copy phone number ${landlordPhone}`} title="Copy phone number"><Phone aria-hidden="true"/><span>{landlordPhone}</span></button> : <span className="tenant-property-no-contact"><Phone aria-hidden="true"/>Phone not provided</span>}
          </div>
        </div>
      </section>
      <section className="tenant-property-info-panel">
        <h2>About this apartment</h2>
        <p className="tenant-property-description">{apartment.description || "No description provided."}</p>
      </section>
      <section className="tenant-property-info-panel">
        <h2>House Rules &amp; Policies</h2>
        {rules.length ? <div className="tenant-property-info-pills">{rules.map((rule, index) => <span key={`${rule}-${index}`}>{rule}</span>)}</div> : <p className="tenant-property-info-empty">No house rules provided.</p>}
      </section>
      <section className="tenant-property-info-panel">
        <h2>Contract Duration</h2>
        <div className="tenant-property-info-pills"><span>{contractDuration || "Not specified"}</span></div>
      </section>
      <section className="tenant-property-info-panel">
        <h2>{includedTitle}</h2>
        {included.length ? <div className="tenant-property-info-pills">{included.map(item => <span key={item}>{item}</span>)}</div> : <p className="tenant-property-info-empty">No inclusions specified.</p>}
      </section>
      <section className="tenant-property-info-panel">
        <h2>Location</h2>
        <p className="tenant-property-location-caption">View the apartment’s location on the map.</p>
        {mapPinAvailable ? <div className="tenant-property-location-map">
          <MapView lat={apartment.lat} lng={apartment.lng} zoom={15} showSingleMarker/>
          <div className="tenant-property-map-label"><MapPin aria-hidden="true"/><div><strong>{apartment.title}</strong><span>{locationText}</span></div></div>
          <button type="button" className="apartment-detail-map-expand" onClick={expandMap} aria-label="Expand map" title="Expand map"><Maximize/></button>
        </div> : <div className="tenant-property-location-empty"><MapPin aria-hidden="true"/><span>{locationText}</span><span>Map location not provided.</span></div>}
      </section>
      {reportProblem && <section className="tenant-property-info-panel tenant-property-report-panel">
        <h2><AlertTriangle aria-hidden="true"/>Report a Problem</h2>
        <p>Let us know if any listing information appears inaccurate or unavailable.</p>
        <button type="button" onClick={reportProblem}>Report a Problem</button>
      </section>}
    </div>;
}
