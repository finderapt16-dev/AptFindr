import { useEffect, useState } from "react";
import { Eye, EyeOff, Info } from "lucide-react";
import { toast } from "sonner";
import { changeAuthPassword } from "@/services/authService";
import { fetchApplicationSettings, saveApplicationSettings, useApplicationSettings } from "@/services/applicationSettingsService";
import "./AdminSettings.css";

export function AdminSettings({ profile, setProfile, loading, saving, onSave, preview, uploading, photoError, onUpload, onRemove }) {
    const name = `${profile.firstName} ${profile.lastName}`.trim();
    const [nameInput, setNameInput] = useState(name);
    useEffect(() => { if (!loading) setNameInput(`${profile.firstName} ${profile.lastName}`.trim()); }, [loading]);
    const settings = useApplicationSettings();
    const [form, setForm] = useState(settings);
    const [systemLoading, setSystemLoading] = useState(true);
    const [systemLoaded, setSystemLoaded] = useState(false);
    const [systemError, setSystemError] = useState("");
    const [systemSaving, setSystemSaving] = useState(false);
    const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
    const [visible, setVisible] = useState({});
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    useEffect(() => {
        let active = true;
        fetchApplicationSettings().then(value => { if (active) { setForm(value); setSystemLoaded(true); } })
            .catch(error => { if (active) setSystemError(error.message); })
            .finally(() => { if (active) setSystemLoading(false); });
        return () => { active = false; };
    }, []);
    const update = (key, value) => setProfile(current => ({ ...current, [key]: value }));
    const updateName = value => {
        setNameInput(value);
        const [firstName = "", ...rest] = value.trimStart().split(/\s+/);
        setProfile(current => ({ ...current, firstName, lastName: rest.join(" ") }));
    };
    const saveSystem = async event => {
        event.preventDefault();
        setSystemSaving(true); setSystemError("");
        try { setForm(await saveApplicationSettings(form)); toast.success("System settings saved."); }
        catch (error) { setSystemError(error.message); }
        finally { setSystemSaving(false); }
    };
    const changePassword = async event => {
        event.preventDefault(); setPasswordError("");
        if (passwords.next.length < 8 || !/[a-z]/i.test(passwords.next) || !/\d/.test(passwords.next) || !/[^a-z\d\s]/i.test(passwords.next)) {
            setPasswordError("Use at least 8 characters including letters, numbers, and a symbol."); return;
        }
        if (passwords.next !== passwords.confirm) { setPasswordError("New passwords do not match."); return; }
        if (passwords.current === passwords.next) { setPasswordError("Choose a password different from your current password."); return; }
        setPasswordSaving(true);
        try {
            await changeAuthPassword(passwords.current, passwords.next);
            setPasswords({ current: "", next: "", confirm: "" });
            setVisible({}); toast.success("Password updated.");
        } catch (error) { setPasswordError(error.message); }
        finally { setPasswordSaving(false); }
    };
    const systemField = (label, key, type = "text", limits = {}) => <label className="admin-settings-v2-system-row">{label}<input type={type} value={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} {...limits}/></label>;
    return <main className="admin-settings-v2">
        <header><h1>Settings</h1><p>Manage your admin account and system settings.</p></header>
        <div className="admin-settings-v2-grid">
            <div className="admin-settings-v2-column">
                <section className="admin-settings-v2-card">
                    <h2>Admin Profile</h2><p>View and update your administrator account information.</p>
                    <form onSubmit={event => { event.preventDefault(); void onSave(); }}>
                        <div className="admin-settings-v2-profile">
                            <div className="admin-settings-v2-photo">
                                <div className="admin-settings-v2-avatar">{preview || profile.avatar ? <img src={preview || profile.avatar} alt="Admin profile"/> : (name[0] || "A").toUpperCase()}</div>
                                <label className={`admin-settings-v2-upload ${uploading || saving || loading ? "is-disabled" : ""}`}>{uploading ? "Uploading..." : "Upload Photo"}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload admin photo" disabled={uploading || saving || loading} onChange={onUpload}/></label>
                                <button type="button" className="admin-settings-v2-remove" onClick={onRemove} disabled={!profile.avatar || uploading || saving || loading}>Remove Photo</button>
                                <p>JPG, PNG, or WebP up to 2MB</p>
                                {uploading && <p role="status">Saving photo...</p>}
                                {photoError && <p role="alert" className="admin-settings-v2-error">{photoError}</p>}
                            </div>
                            <fieldset disabled={saving || loading || uploading}>
                                <label>Full Name<input required value={nameInput} onChange={event => updateName(event.target.value)} autoComplete="name"/></label>
                                <label>Email Address<input required type="email" value={profile.email} onChange={event => update("email", event.target.value)} autoComplete="email"/></label>
                                <label>Contact Number<input type="tel" value={profile.mobile} onChange={event => update("mobile", event.target.value)} autoComplete="tel"/></label>
                                <label>Position<input value={profile.adminLevel} onChange={event => update("adminLevel", event.target.value)}/></label>
                                <div className="admin-settings-v2-actions"><button type="submit">{saving ? "Saving..." : "Save Changes"}</button></div>
                            </fieldset>
                        </div>
                    </form>
                </section>
                <section className="admin-settings-v2-card">
                    <h2>Change Password</h2><p>Update your account password to keep your account secure.</p>
                    <form onSubmit={changePassword}>
                        <fieldset className="admin-settings-v2-password" disabled={passwordSaving}>
                            {[["current", "Current Password"], ["next", "New Password"], ["confirm", "Confirm New Password"]].map(([key, label]) => <label key={key}>{label}<div className="admin-settings-v2-password-input"><input required type={visible[key] ? "text" : "password"} autoComplete={key === "current" ? "current-password" : "new-password"} value={passwords[key]} onChange={event => setPasswords(current => ({ ...current, [key]: event.target.value }))} placeholder={key === "current" ? "Enter current password" : key === "next" ? "Enter new password" : "Confirm new password"}/><button type="button" aria-label={`${visible[key] ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={!!visible[key]} onClick={() => setVisible(current => ({ ...current, [key]: !current[key] }))}>{visible[key] ? <Eye/> : <EyeOff/>}</button></div></label>)}
                            <div className="admin-settings-v2-note"><Info/><span>Password must be at least 8 characters long and include a mix of letters, numbers, and symbols.</span></div>
                            {passwordError && <p role="alert" className="admin-settings-v2-error">{passwordError}</p>}
                            <button type="submit">{passwordSaving ? "Updating..." : "Update Password"}</button>
                        </fieldset>
                    </form>
                </section>
            </div>
            <section className="admin-settings-v2-card">
                <h2>System Settings</h2><p>Configure application settings and business rules.</p>
                <form onSubmit={saveSystem}>
                    <fieldset className="admin-settings-v2-system" disabled={systemLoading || systemSaving || !systemLoaded}>
                        {systemField("Application Name", "application_name", "text", { required: true, maxLength: 80 })}
                        {systemField("Support Email", "support_email", "email", { required: true })}
                        {systemField("Contact Number", "contact_number", "tel")}
                        {systemField("Address", "address")}
                        <label className="admin-settings-v2-system-row">Default Currency<select value={form.default_currency} onChange={event => setForm(current => ({ ...current, default_currency: event.target.value }))}><option value="PHP">Philippine Peso (₱)</option></select></label>
                        <label className="admin-settings-v2-system-row">Permit Renewal Reminder<select value={form.permit_reminder_days} onChange={event => setForm(current => ({ ...current, permit_reminder_days: Number(event.target.value) }))}>{[7,14,30,60,90].map(days => <option key={days} value={days}>{days} days before expiration</option>)}</select></label>
                        {systemField("Max Apartment Photos", "max_apartment_photos", "number", { required: true, min: 1, max: 30, step: 1 })}
                        {systemField("Items Per Page", "items_per_page", "number", { required: true, min: 5, max: 100, step: 1 })}
                        <div className="admin-settings-v2-actions"><button type="submit">{systemLoading ? "Loading..." : systemSaving ? "Saving..." : "Save Changes"}</button></div>
                    </fieldset>
                    <p className="admin-settings-v2-reminder-note">The reminder period is saved here; automatic delivery timing is pending activation.</p>
                    {systemError && <p role="alert" className="admin-settings-v2-error">{systemError}</p>}
                </form>
            </section>
        </div>
    </main>;
}
