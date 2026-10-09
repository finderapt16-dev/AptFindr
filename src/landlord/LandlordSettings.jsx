import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchLandlordBusinessPermits } from "@/services/verificationDocumentsService";
import { ChevronLeft, ChevronRight, FileText, LockKeyhole, Pencil } from "lucide-react";

import "./LandlordSettings.css";
import { UpdateBusinessPermitDialog } from "./UpdateBusinessPermitDialog";
import { supabase } from "@/services/supabaseClient";

const formatPermitDate = (value) => {
  if (!value) return "Not provided";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(date);
};

const permitFileName = (url) => {
  if (!url) return "No business permit uploaded";

  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop()) || "Business permit document";
  } catch {
    return "Business permit document";
  }
};

const ProfileField = ({ label, required = false, hint, children }) => (
  <label className="landlord-settings-field">
    <span className="landlord-settings-field-label">
      {label}{required && <b aria-hidden="true"> *</b>}
    </span>
    <span className="landlord-settings-input-wrap">
      {children}
      <Pencil aria-hidden="true" className="landlord-settings-edit-icon" />
    </span>
    {hint && <small>{hint}</small>}
  </label>
);


function BusinessPermitInformation({ business }) {
  const { user } = useAuth();
  const [permits, setPermits] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [updatePermit, setUpdatePermit] = useState(null);
  const [renewalStatus, setRenewalStatus] = useState("");
  const [renewalExpiry, setRenewalExpiry] = useState("");
  useEffect(() => {
    let active = true;
    if (!user?.id) return;
    void supabase.from("landlord_permit_renewals").select("status, expires_at").eq("landlord_id", user.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => {
      if (active) { setRenewalStatus(data?.status || ""); setRenewalExpiry(data?.status === "approved" ? data.expires_at || "" : ""); }
    });
    return () => { active = false; };
  }, [user?.id, reload]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setPermits([]);
    setPage(0);
    if (!user?.id) { setLoading(false); return; }
    fetchLandlordBusinessPermits(user.id).then(records => {
      if (active) setPermits(records);
    }).catch(reason => {
      if (active) setError(reason.message || "Unable to load business permits.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, reload]);
  const records = permits.length ? permits : business && (business.documentUrl || business.permitNumber) ? [business] : [];
  const currentPage = Math.min(page, Math.max(0, records.length - 1));
  const permit = records[currentPage];
  const size = Number(permit?.fileSize);
  const expiry = renewalExpiry || permit?.permitExpiry || business?.permitExpiry;
  const expiryTimestamp = expiry ? Date.parse(String(expiry).includes("T") ? expiry : `${String(expiry).slice(0, 10)}T00:00:00+08:00`) : NaN;
  const renewalDue = renewalStatus !== "pending_review" && (
    ["expired", "requires_changes", "rejected"].includes(renewalStatus)
    || Date.now() >= expiryTimestamp
  );
  return <section className="landlord-settings-card landlord-settings-business-card">
    <header className="landlord-settings-card-header landlord-settings-business-header">
      <div><h2>Business Information</h2><p>Manage your business verification and permit details.</p></div>
      <span className="landlord-settings-read-only"><LockKeyhole aria-hidden="true" strokeWidth={1.6} />{renewalStatus === "pending_review" ? "UNDER REVIEW" : renewalDue ? "UPDATE AVAILABLE" : "READ-ONLY"}</span>
    </header>
    {loading ? <p role="status">Loading business permits...</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setReload(value => value + 1)}>Try again</button></div> : permit ? <>
      <div className="landlord-settings-business-record">
        <dl className="landlord-settings-permit-details">
          <div><dt>Apartment Name</dt><dd>{permit.apartmentName || permit.businessName || "Not provided"}</dd></div>
          <div><dt>Permit Number</dt><dd>{permit.permitNumber || "Not provided"}</dd></div>
          <div><dt>Business Account Number</dt><dd>{permit.businessAccount || "Not provided"}</dd></div>
          <div><dt>Issued Date</dt><dd>{formatPermitDate(permit.issuedAt)}</dd></div>
        </dl>
        <div className="landlord-settings-permit-file">
          <span className="landlord-settings-file-icon"><FileText aria-hidden="true" /></span>
          <div>
            {renewalDue ? <button type="button" className="landlord-settings-permit-update-link" onClick={() => setUpdatePermit(permit)}>{permit.fileName || "Update business permit"}</button> : permit.documentUrl ? <a href={permit.documentUrl} target="_blank" rel="noreferrer">{permit.fileName || permitFileName(permit.documentUrl)}</a> : <strong>No business permit uploaded</strong>}
            <small>{size > 0 ? size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB` : "Size not provided"}</small>
          </div>
        </div>
      </div>
      <nav className="landlord-settings-permit-pagination" aria-label="Business permit pages">
        <button type="button" aria-label="Previous business permit" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft aria-hidden="true" /></button>
        <span aria-live="polite">Page {currentPage + 1} of {records.length}</span>
        <button type="button" aria-label="Next business permit" disabled={currentPage === records.length - 1} onClick={() => setPage(currentPage + 1)}><ChevronRight aria-hidden="true" /></button>
      </nav>
    </> : <p>No business permits submitted. Upload a permit when creating or updating a apartment.</p>}
    {updatePermit && <UpdateBusinessPermitDialog permit={updatePermit} landlordId={user.id} onClose={() => setUpdatePermit(null)} onSubmitted={() => { setRenewalStatus("pending_review"); setReload(value => value + 1); }}/>}
  </section>;
}

export const LandlordSettings = ({
  profile,
  updateProfile,
  savedProfile,
  setProfile,
  handleUpdateProfile,
  isUpdatingProfile,
  business,
  profileTab,
  securityTab,
}) => (
  <div className="landlord-settings">
    <header className="landlord-settings-page-header">
      <h1>Settings</h1>
      <p>Manage your account, preferences, business information, and security.</p>
    </header>

    <section className="landlord-settings-photo-card" aria-label="Profile photo">
      {profileTab}
    </section>

    <section className="landlord-settings-card">
      <header className="landlord-settings-card-header">
        <h2>Personal Information</h2>
        <p>Update your personal details.</p>
      </header>

      <div className="landlord-settings-profile-grid">
        <ProfileField label="First Name" required>
          <input value={profile.firstName} onChange={(event) => updateProfile((current) => ({ ...current, firstName: event.target.value }))} />
        </ProfileField>
        <ProfileField label="Facebook Link" required>
          <input type="url" required value={profile.facebookLink} onChange={(event) => updateProfile((current) => ({ ...current, facebookLink: event.target.value }))} placeholder="https://facebook.com" />
        </ProfileField>
        <ProfileField label="Middle Initial (Optional)">
          <input value={profile.middleInitial} maxLength={3} onChange={(event) => updateProfile((current) => ({ ...current, middleInitial: event.target.value }))} />
        </ProfileField>
        <ProfileField label="Mobile Number" required>
          <input type="tel" value={profile.mobile} onChange={(event) => updateProfile((current) => ({ ...current, mobile: event.target.value }))} placeholder="09XX-XXX-XXXX" />
        </ProfileField>
        <ProfileField label="Last Name" required>
          <input value={profile.lastName} onChange={(event) => updateProfile((current) => ({ ...current, lastName: event.target.value }))} />
        </ProfileField>
        <ProfileField label="Email Address" required hint="Managed securely through your authenticated account.">
          <input type="email" value={profile.email} readOnly aria-readonly="true" />
        </ProfileField>
      </div>

      <footer className="landlord-settings-actions">
        <button type="button" className="landlord-settings-cancel" onClick={() => setProfile(savedProfile)} disabled={isUpdatingProfile}>Cancel</button>
        <button type="button" className="landlord-settings-save" onClick={() => void handleUpdateProfile()} disabled={isUpdatingProfile}>
          {isUpdatingProfile ? "Saving..." : "Save Changes"}
        </button>
      </footer>
    </section>

    <BusinessPermitInformation business={business} />

    {securityTab}
  </div>
);
