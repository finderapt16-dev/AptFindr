import "./AdminLandlordVerificationReview.css";
import { ArrowLeft, CalendarDays, Mail, MapPin, Phone, UserRound } from "lucide-react";

const value = (input, fallback = "Not provided") => String(input ?? "").trim() || fallback;

const formatDate = (input) => {
  if (!input) return "Not provided";
  const date = new Date(input);
  return Number.isNaN(date.getTime())
    ? "Not provided"
    : date.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
};

const propertyLocation = (property) => {
  const parts = [property.address, property.barangay, property.city].filter(Boolean);
  return parts.length ? [...new Set(parts)].join(", ") : "Location not provided";
};

const propertyStatus = (property) => {
  const status = String(property.verificationStatus ?? property.verification_status ?? property.approvalStatus ?? property.status ?? "").toLowerCase();
  if (property.isVerified === true || property.is_verified === true || property.isPublished === true || property.is_published === true || status === "approved" || status === "verified") return "verified";
  if (["rejected", "denied", "declined"].includes(status)) return "rejected";
  return "pending";
};

export function AdminLandlordVerificationReview({ landlord, details, isLoading, onBack, onViewProperty }) {
  const profile = details?.profile ?? {};
  const properties = details?.properties ?? [];
  const landlordIsVerified = landlord.isVerified === true || landlord.is_verified === true || profile.is_verified === true;
  const address = landlord.address ?? landlord.business_address ?? profile.address ?? profile.business_address ?? [landlord.barangay, landlord.city].filter(Boolean).join(", ");
  const phone = landlord.mobile ?? landlord.phone ?? landlord.contact ?? landlord.mobileNumber;
  const avatarUrl = String(landlord.avatar_url ?? landlord.avatar ?? "").trim();
  const landlordName = value(landlord.name ?? landlord.full_name);
  const rows = properties.map((property) => {
    const verification = property.features?.verification && typeof property.features.verification === "object" ? property.features.verification : {};
    return {
      property,
      permitNumber: verification.businessPermit ?? profile.business_permit_number ?? profile.permit_number ?? landlord.business_permit_number ?? landlord.permit_number ?? landlord.permitNumber,
      businessAccount: verification.businessAccount ?? profile.permit_number ?? landlord.permit_number ?? landlord.permitNumber,
      issuedAt: verification.issuedAt ?? property.createdAt ?? property.created_at,
      status: propertyStatus(property),
    };
  });

  return (
    <div className="admin-landlord-profile-listing">
      <button type="button" className="admin-landlord-profile-listing__back" onClick={onBack}><ArrowLeft aria-hidden="true" />Back to landlords overview</button>
      <header className="admin-landlord-profile-listing__heading">
        <h1>Landlord Profile &amp; Listing</h1>
        <p>Review landlord information, apartment listings, and business permits.</p>
      </header>
      {isLoading && <p className="admin-landlord-profile-listing__loading">Loading the latest landlord information...</p>}

      <section className="admin-landlord-profile-listing__information">
        <h2>Landlord Information</h2>
        <div className="admin-landlord-profile-listing__person"><span>{avatarUrl ? <img src={avatarUrl} alt="" /> : landlordName.charAt(0).toUpperCase()}</span><div><strong>{landlordName}</strong><small>{value(landlord.email)}</small></div></div>
        <dl>
          <div><dt><span><UserRound aria-hidden="true" /></span>Full Name</dt><dd>{landlordName} {landlordIsVerified && <em>Verified Landlord</em>}</dd></div>
          <div><dt><span><Mail aria-hidden="true" /></span>Email</dt><dd>{value(landlord.email)}</dd></div>
          <div><dt><span><Phone aria-hidden="true" /></span>Contact Number</dt><dd>{value(phone)}</dd></div>
          <div><dt><span><MapPin aria-hidden="true" /></span>Address</dt><dd>{value(address)}</dd></div>
          <div><dt><span><CalendarDays aria-hidden="true" /></span>Date Registered</dt><dd>{formatDate(landlord.created_at ?? landlord.createdAt)}</dd></div>
        </dl>
      </section>

      <section className="admin-landlord-profile-listing__properties" aria-labelledby="landlord-properties-heading">
        <h2 id="landlord-properties-heading" className="sr-only">Apartment listings</h2>
        <div className="admin-landlord-profile-listing__table-scroll">
          <table>
            <thead><tr><th>Apartment Name</th><th>Permit Number</th><th>Business Account Number</th><th>Date Issued</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{rows.map(({ property, permitNumber, businessAccount, issuedAt, status }) => (
              <tr key={property.id}>
                <td><strong>{value(property.title, "Untitled apartment")}</strong><small><MapPin aria-hidden="true" />{propertyLocation(property)}</small></td>
                <td>{value(permitNumber, "—")}</td><td>{value(businessAccount, "—")}</td><td>{formatDate(issuedAt)}</td>
                <td><span className={`admin-landlord-profile-listing__status ${status}`}>{status === "verified" ? "Verified" : status === "rejected" ? "Rejected" : "Pending"}</span></td>
                <td><button type="button" onClick={() => onViewProperty(property.id)}>View Details</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {!rows.length && <p className="admin-landlord-profile-listing__empty">This landlord has no apartment listings yet.</p>}
      </section>
    </div>
  );
}
