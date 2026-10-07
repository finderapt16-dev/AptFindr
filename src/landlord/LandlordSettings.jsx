import { FileText, LockKeyhole, Pencil } from "lucide-react";

import "./LandlordSettings.css";

const formatPermitDate = (value) => {
  if (!value) return "Not provided";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
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

    <section className="landlord-settings-card landlord-settings-business-card">
      <header className="landlord-settings-card-header landlord-settings-business-header">
        <div>
          <h2>Business Information</h2>
          <p>Manage your business verification and permit details.</p>
        </div>
        <span className="landlord-settings-read-only"><LockKeyhole aria-hidden="true" strokeWidth={1.6} /> READ-ONLY</span>
      </header>

      <div className="landlord-settings-permit-file">
        <span className="landlord-settings-file-icon"><FileText aria-hidden="true" /></span>
        <div>
          {business.documentUrl ? <a href={business.documentUrl} target="_blank" rel="noreferrer">{permitFileName(business.documentUrl)}</a> : <strong>{permitFileName(business.documentUrl)}</strong>}
          <small>{business.documentUrl ? "Open submitted business permit" : "Upload a permit when creating or updating a property."}</small>
        </div>
      </div>

      <dl className="landlord-settings-permit-details">
        <div className="landlord-settings-permit-number"><dt>Permit Number</dt><dd>{business.permitNumber || "Not provided"}</dd></div>
        <div><dt>Issue Date</dt><dd>{formatPermitDate(business.issuedAt)}</dd></div>
        <div><dt>Expiry Date</dt><dd>{formatPermitDate(business.permitExpiry)}</dd></div>
      </dl>
    </section>

    {securityTab}
  </div>
);
