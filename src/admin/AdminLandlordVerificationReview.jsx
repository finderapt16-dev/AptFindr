import { useEffect, useState } from "react";
import { fetchLandlordBusinessPermits } from "@/services/verificationDocumentsService";
import "./AdminLandlordVerificationReview.css";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Eye, FileText, Mail, MapPin, Phone, UserRound, X } from "lucide-react";

const text = (value, fallback = "Not provided") => String(value ?? "").trim() || fallback;

const formatDate = (value) => {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not provided" : date.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
};

export function AdminLandlordVerificationReview({ landlord, details, isLoading, onApprove, onBack, onReject, onRequestChanges, onViewProperty }) {
  const [permits, setPermits] = useState([]);
  const [permitsLoading, setPermitsLoading] = useState(true);
  const [permitsError, setPermitsError] = useState("");
  useEffect(() => {
    let active = true;
    setPermits([]);
    setPermitsLoading(true);
    setPermitsError("");
    fetchLandlordBusinessPermits(landlord.id)
      .then(rows => { if (active) setPermits(rows); })
      .catch(error => { if (active) setPermitsError(error.message || "Unable to load business permits."); })
      .finally(() => { if (active) setPermitsLoading(false); });
    return () => { active = false; };
  }, [landlord.id]);
  const profile = details?.profile ?? {};
  const verified = landlord.isVerified === true || landlord.is_verified === true;
  const rejected = ["rejected", "denied", "declined"].includes(String(landlord.landlord_status ?? landlord.verification_status ?? landlord.status ?? "").toLowerCase());
  const status = verified ? "Verified" : rejected ? "Rejected" : "Pending Review";
  const permitNumber = profile.business_permit_number ?? profile.permit_number ?? landlord.permit_number ?? landlord.permitNumber;
  const permitDocumentUrl = profile.verification_document_url;
  const displayedPermits = permits.length ? permits : [{ id: "account-permit", apartmentName: "Account Business Permit", permitNumber, documentUrl: permitDocumentUrl, issuedAt: profile.permit_issued_at ?? profile.issued_at, permitExpiry: profile.permit_expiry ?? profile.permit_expiry_date ?? profile.expiry_date }];
  const property = details?.properties?.[0] ?? null;
  const address = landlord.address ?? landlord.business_address ?? profile.address ?? profile.business_address ?? [landlord.barangay, landlord.city].filter(Boolean).join(", ");
  const phone = landlord.mobile ?? landlord.phone ?? landlord.contact ?? landlord.mobileNumber;

  return (
    <div className="admin-landlord-review">
      <button type="button" className="admin-landlord-review-back" onClick={onBack}><ArrowLeft aria-hidden="true" />Back to landlords overview</button>
      <header className="admin-landlord-review-heading">
        <h1>Landlord Verification Review</h1>
        <p>Review landlord account information and submitted business permit documents.</p>
      </header>

      {isLoading && <p className="admin-landlord-review-loading">Loading the latest landlord information…</p>}

      <div className="admin-landlord-review-layout">
        <div className="admin-landlord-review-main">
          <section className="admin-landlord-review-card">
            <h2>Account Information</h2>
            <div className="admin-landlord-review-profile">
              <span aria-hidden="true" className="admin-landlord-review-avatar">{text(landlord.name, "L").charAt(0).toUpperCase()}</span>
              <div><strong>{text(landlord.name, "Unnamed landlord")}</strong><span>Apartment Owner</span><span>Member since {formatDate(landlord.created_at ?? landlord.createdAt)}</span></div>
            </div>
            <dl className="admin-landlord-review-details">
              <div><dt><UserRound aria-hidden="true" />Full Name</dt><dd>{text(landlord.name)}</dd></div>
              <div><dt><Mail aria-hidden="true" />Email</dt><dd>{text(landlord.email)}</dd></div>
              <div><dt><Phone aria-hidden="true" />Contact Number</dt><dd>{text(phone)}</dd></div>
              <div><dt><MapPin aria-hidden="true" />Address</dt><dd>{text(address)}</dd></div>
              <div><dt><Clock3 aria-hidden="true" />Date Registered</dt><dd>{formatDate(landlord.created_at ?? landlord.createdAt)}</dd></div>
            </dl>
          </section>

          <section className="admin-landlord-review-card">
            <h2>Permit Document Review</h2>
            <p className="admin-landlord-review-intro">Review the landlord’s business permit and supporting documents.</p>
            {permitsLoading && <p className="admin-landlord-review-loading">Loading submitted permits...</p>}
            {permitsError && <p role="alert" className="admin-landlord-review-missing-document">{permitsError}</p>}
            {displayedPermits.map((permit, index) => <article className="admin-landlord-review-permit-entry" key={permit.id}>
              <h3>{permit.apartmentName || `Business Permit ${index + 1}`}</h3>
            <div className="admin-landlord-review-document">
              {permit.documentUrl && !/\.pdf(?:[?#]|$)/i.test(String(permit.documentUrl)) ? (
                <a className="admin-landlord-review-document-preview admin-landlord-review-document-image" href={permit.documentUrl} target="_blank" rel="noreferrer" aria-label="Open the submitted business permit image">
                  <img src={permit.documentUrl} alt="Submitted business permit" />
                  <span>Open full-size image</span>
                </a>
              ) : (
                <div className="admin-landlord-review-document-preview">
                  <FileText aria-hidden="true" />
                  <strong>Business Permit</strong>
                  <span>{permit.documentUrl ? "PDF document submitted" : "No document submitted"}</span>
                </div>
              )}
              <dl className="admin-landlord-review-document-details">
                <div><dt>Document Type</dt><dd>Business Permit</dd></div>
                <div><dt>Permit Number</dt><dd>{text(permit.permitNumber)}</dd></div>
                <div><dt>Date Issued</dt><dd>{formatDate(permit.issuedAt)}</dd></div>
                <div><dt>Expiry Date</dt><dd>{formatDate(permit.permitExpiry)}</dd></div>
                <div><dt>Issued By</dt><dd>{text(profile.permit_issued_by ?? profile.issued_by, "City licensing authority")}</dd></div>
              </dl>
            </div>
            {permit.documentUrl ? <a className="admin-landlord-review-document-link" href={permit.documentUrl} target="_blank" rel="noreferrer"><Eye aria-hidden="true" />View Full Document</a> : <p className="admin-landlord-review-missing-document">No business permit document was uploaded.</p>}
            </article>)}
          </section>
        </div>

        <aside className="admin-landlord-review-side">
          <section className="admin-landlord-review-card admin-landlord-review-status-card">
            <h2>Verification Status</h2>
            <p>Submitted on {formatDate(profile.created_at ?? landlord.created_at ?? landlord.createdAt)}</p>
            <span className={`admin-landlord-review-status ${verified ? "verified" : rejected ? "rejected" : "pending"}`}>{verified ? <CheckCircle2 aria-hidden="true" /> : rejected ? <X aria-hidden="true" /> : <Clock3 aria-hidden="true" />}{status}</span>
          </section>

          <section className="admin-landlord-review-card">
            <h2>Apartment Review</h2>
            <p>Review the apartment information submitted by this landlord.</p>
            <button type="button" className="admin-landlord-review-secondary-action" disabled={!property} onClick={() => property && onViewProperty(property.id)}><span>View Apartment Details</span><ArrowRight aria-hidden="true" /></button>
          </section>

          <section className="admin-landlord-review-card">
            <h2>Admin Actions</h2>
            <p>Verify the landlord’s business permit and account information.</p>
            <div className="admin-landlord-review-actions">
              <button type="button" className="admin-landlord-review-approve" disabled={verified} onClick={onApprove}><Check aria-hidden="true" />{verified ? "Verification Approved" : "Approve Verification"}</button>
              <button type="button" className="admin-landlord-review-secondary-action" onClick={onRequestChanges}><FileText aria-hidden="true" /><span>Request Changes</span></button>
              <button type="button" className="admin-landlord-review-reject" disabled={!verified && rejected} onClick={onReject}><X aria-hidden="true" />Reject Verification</button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
