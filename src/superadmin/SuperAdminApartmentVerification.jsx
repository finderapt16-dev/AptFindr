import "./SuperAdminApartmentVerification.css";
import { ArrowLeft, Check, Clock3, Eye, FileText, MapPin, Phone, UserRound, X } from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";

const value = (input, fallback = "Not provided") => String(input ?? "").trim() || fallback;

const formatDate = (input) => {
  if (!input) return "Not provided";
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? "Not provided" : date.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
};

const imagesFor = (property) => Array.from(new Set([
  ...(Array.isArray(property?.images) ? property.images : []),
  property?.image,
  property?.image_url,
  property?.imageUrl,
].filter((image) => typeof image === "string" && image.trim())));

const money = (amount) => {
  const number = Number(amount);
  return Number.isFinite(number) && number > 0 ? `\u20B1${number.toLocaleString("en-PH")}` : null;
};

export function AdminApartmentVerification({ landlord, profile, property, inspection, documents = [], isLoading, hasAvailableUnit, onBack, onViewDocument, onApprove, onRequestChanges, onReject, onViewApartment, isApproving, isRejecting }) {
  const submittedApartment = inspection?.apartment ?? {};
  const rawApartment = inspection?.rawApartment ?? {};
  const apartment = {
    ...property,
    ...submittedApartment,
    features: rawApartment.features ?? submittedApartment.features ?? property?.features,
    rooms: inspection?.rooms?.length ? inspection.rooms : submittedApartment.rooms ?? property?.rooms,
  };
  const verification = apartment.features?.verification && typeof apartment.features.verification === "object" ? apartment.features.verification : {};
  const submittedImages = (inspection?.images ?? []).slice().sort((left, right) => Number(Boolean(right.is_primary)) - Number(Boolean(left.is_primary)) || Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0)).map((image) => image.url);
  const images = Array.from(new Set([...submittedImages, ...imagesFor(apartment)].filter(Boolean)));
  const location = [apartment.address, apartment.barangay, apartment.city, apartment.state].filter(Boolean).filter((item, index, all) => all.indexOf(item) === index).join(", ") || "Location not provided";
  const phone = landlord?.mobile ?? landlord?.phone ?? landlord?.contact ?? landlord?.mobileNumber;
  const address = landlord?.address ?? landlord?.business_address ?? profile?.address ?? profile?.business_address ?? [landlord?.barangay, landlord?.city].filter(Boolean).join(", ");
  const rooms = Array.isArray(apartment.rooms) ? apartment.rooms : [];
  const prices = rooms.map((room) => Number(room.price)).filter((price) => Number.isFinite(price) && price > 0);
  const basePrice = money(apartment.price ?? apartment.monthlyRent ?? apartment.monthly_rent);
  const priceRange = prices.length ? `${money(Math.min(...prices))}${Math.max(...prices) !== Math.min(...prices) ? ` - ${money(Math.max(...prices))}` : ""} / month` : basePrice ? `${basePrice} / month` : "Not provided";
  const duration = apartment.features?.contractDuration ?? apartment.contractDuration ?? apartment.contract_duration ?? "Not specified";
  const statusValue = String(apartment.verificationStatus ?? apartment.verification_status ?? apartment.approvalStatus ?? apartment.approval_status ?? apartment.status ?? "").toLowerCase();
  const isRejected = ["rejected", "denied", "declined"].includes(statusValue);
  const isPublished = apartment.isPublished === true || apartment.is_published === true;
  const isApproved = !isRejected && (isPublished || apartment.isVerified === true || apartment.is_verified === true || ["approved", "verified", "published"].includes(statusValue));
  const statusLabel = isRejected ? "Rejected" : isPublished ? "Published" : isApproved ? "Approved" : "Pending Review";
  const permitNumber = verification.businessPermit ?? profile?.business_permit_number ?? profile?.permit_number ?? landlord?.business_permit_number ?? landlord?.permit_number ?? landlord?.permitNumber;
  const businessPermitDocument = documents.find((document) => document.documentType === "mayors_business_permit") ?? documents.find((document) => document.documentType === "proof_of_ownership");
  const documentUrl = businessPermitDocument?.previewUrl ?? profile?.verification_document_url ?? profile?.business_permit_url ?? apartment.business_permit_url;

  return <div className="admin-apartment-verification">
    <button type="button" className="admin-apartment-verification__back" onClick={onBack}><ArrowLeft aria-hidden="true" />Back to Landlord Overview</button>
    <header className="admin-apartment-verification__heading">
      <h1>Apartment Verification</h1>
      <p>Review the landlord's information, apartment details, and submitted documents.</p>
    </header>
      {isLoading && <p className="admin-apartment-verification__loading">Loading the submitted Add Apartment details...</p>}

    <div className="admin-apartment-verification__layout">
      <main className="admin-apartment-verification__main">
        <section className="admin-apartment-verification__card">
          <h2>1. Landlord Information</h2>
          <dl className="admin-apartment-verification__landlord-info">
            <div><dt><UserRound aria-hidden="true" />Full Name</dt><dd>{value(landlord?.name ?? landlord?.full_name)}</dd></div>
            <div><dt><Phone aria-hidden="true" />Contact Number</dt><dd>{value(phone)}</dd></div>
            <div><dt><MapPin aria-hidden="true" />Address</dt><dd>{value(address)}</dd></div>
          </dl>
        </section>

        <section className="admin-apartment-verification__card">
          <h2>2. Apartment Information</h2>
          <div className="admin-apartment-verification__property">
            <div className="admin-apartment-verification__gallery">
              {images[0] ? <ImageWithFallback src={images[0]} alt={value(apartment.title, "Apartment")} className="admin-apartment-verification__main-image" /> : <div className="admin-apartment-verification__no-image">No apartment image submitted</div>}
              {images.length > 1 && <div className="admin-apartment-verification__thumbnails">{images.slice(1, 4).map((image, index) => <ImageWithFallback key={`${image}-${index}`} src={image} alt={`Apartment image ${index + 2}`} />)}</div>}
            </div>
            <div className="admin-apartment-verification__property-details">
              <h3>{value(apartment.title, "Untitled apartment")}</h3>
              <dl>
                <div><dt>Location</dt><dd>{location}</dd></div>
                <div><dt>Total Units</dt><dd>{rooms.length || apartment.totalUnits || apartment.total_units || apartment.bedrooms || "Not provided"}{rooms.length || apartment.totalUnits || apartment.total_units ? " units" : ""}</dd></div>
                <div><dt>Price Range</dt><dd>{priceRange}</dd></div>
                <div><dt>Contract Duration</dt><dd>{duration}</dd></div>
              </dl>
            </div>
          </div>
          <button type="button" className="admin-apartment-verification__outline-action" onClick={onViewApartment} disabled={!isApproved} title={isApproved ? "Open apartment inspection" : "Verify this apartment before opening inspection"}><Eye aria-hidden="true" />View Full Apartment Details</button>
          {!isApproved && <small className="admin-apartment-verification__inspection-note">Verify this apartment before opening its full inspection page.</small>}
        </section>

        <section className="admin-apartment-verification__card">
          <h2>3. Submitted Documents</h2>
          <div className="admin-apartment-verification__documents">
            <div className="admin-apartment-verification__document-preview">
              {documentUrl && /\.(png|jpe?g|webp|gif)(?:\?|$)/i.test(documentUrl) ? <ImageWithFallback src={documentUrl} alt="Business permit" /> : <FileText aria-hidden="true" />}
              <button type="button" onClick={onViewDocument}><Eye aria-hidden="true" />View Full Document</button>
            </div>
            <dl className="admin-apartment-verification__document-info">
              <div><dt>Document Type</dt><dd>Business Permit</dd></div>
              <div><dt>Permit Number</dt><dd>{value(permitNumber)}</dd></div>
              <div><dt>Date Issued</dt><dd>{formatDate(verification.issuedAt ?? profile?.permit_issued_at ?? profile?.created_at ?? property?.created_at)}</dd></div>
              <div><dt>Issued By</dt><dd>{value(verification.issuedBy ?? profile?.permit_issued_by ?? "City of Iloilo")}</dd></div>
            </dl>
          </div>
        </section>
      </main>

      <aside className="admin-apartment-verification__side">
        <section className="admin-apartment-verification__card">
          <h2>Verification Status</h2>
          <p>Submitted on {formatDate(apartment.createdAt ?? apartment.created_at)}</p>
          <span className={`admin-apartment-verification__status ${isRejected ? "rejected" : isApproved ? "approved" : "pending"}`}><Clock3 aria-hidden="true" />{statusLabel}</span>
        </section>
        <section className="admin-apartment-verification__card admin-apartment-verification__actions">
          <h2>Admin Actions</h2>
          <p>Verify the business permit and apartment details, then publish the listing for tenants.</p>
          {!isPublished && <button type="button" className="admin-apartment-verification__approve" onClick={onApprove} disabled={isApproving || !hasAvailableUnit} title={hasAvailableUnit ? "Verify and publish listing" : "Add an available unit before publishing"}><Check aria-hidden="true" />{isApproving ? "Verifying & publishing..." : "Verify & Publish Listing"}</button>}
          {!isPublished && !hasAvailableUnit && <small className="admin-apartment-verification__publish-note">Add at least one available unit before this listing can be verified and published.</small>}
          {isPublished && <small className="admin-apartment-verification__publish-note">This listing is already published. Use the apartment inspection page to unpublish it if needed.</small>}
          <button type="button" className="admin-apartment-verification__outline-action" onClick={onRequestChanges}><FileText aria-hidden="true" />Request Changes</button>
          <button type="button" className="admin-apartment-verification__reject" onClick={onReject} disabled={isApproving || isRejecting}><X aria-hidden="true" />{isRejecting ? "Rejecting..." : "Reject Listing"}</button>
        </section>
      </aside>
    </div>
  </div>;
}
