import { Button } from "@/components/ui/button";
import {
    fetchMaintenanceSettings,
    MAINTENANCE_PORTALS,
    subscribeToMaintenanceSettings,
    updateMaintenanceSetting,
} from "@/services/maintenanceService";
import { Building2, Loader2, Save, Users, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import "./SuperAdminMaintenanceControl.css";

const PORTAL_META = {
    tenant: { label: "Tenant Portal", icon: Users },
    landlord: { label: "Landlord Portal", icon: Building2 },
};

function toLocalInput(value) {
    if (!value)
        return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

function toIso(value) {
    if (!value)
        return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function MaintenanceControl({ currentUser }) {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [savingPortal, setSavingPortal] = useState("");

    const loadSettings = useCallback(async ({ silent = false } = {}) => {
        if (!silent)
            setLoading(true);
        try {
            const rows = await fetchMaintenanceSettings();
            setSettings(Object.fromEntries(rows.map((row) => [row.portal, {
                ...row,
                starts_at: toLocalInput(row.starts_at),
                ends_at: toLocalInput(row.ends_at),
            }])));
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to load maintenance settings.");
        }
        finally {
            if (!silent)
                setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSettings();
        return subscribeToMaintenanceSettings(() => void loadSettings({ silent: true }));
    }, [loadSettings]);

    const updateDraft = (portal, field, value) => {
        setSettings((current) => ({
            ...current,
            [portal]: { ...current[portal], portal, [field]: value },
        }));
    };

    const save = async (portal) => {
        const draft = settings[portal];
        if (!draft || savingPortal)
            return;
        const startsAt = toIso(draft.starts_at);
        const endsAt = toIso(draft.ends_at);
        if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
            toast.error("Maintenance end time must be later than its start time.");
            return;
        }
        setSavingPortal(portal);
        try {
            const saved = await updateMaintenanceSetting(portal, {
                ...draft,
                starts_at: startsAt,
                ends_at: endsAt,
            }, currentUser?.id);
            setSettings((current) => ({
                ...current,
                [portal]: { ...saved, starts_at: toLocalInput(saved.starts_at), ends_at: toLocalInput(saved.ends_at) },
            }));
            toast.success(`${PORTAL_META[portal].label} maintenance settings saved.`);
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to save maintenance settings.");
        }
        finally {
            setSavingPortal("");
        }
    };

    return (
        <section className="maintenance-control" aria-labelledby="maintenance-control-title">
            <div className="maintenance-control-heading">
                <span><Wrench aria-hidden="true" /></span>
                <div>
                    <h2 id="maintenance-control-title">Portal Maintenance</h2>
                    <p>Temporarily pause tenant or landlord access without affecting administrators.</p>
                </div>
            </div>
            {loading ? (
                <div className="maintenance-control-loading"><Loader2 aria-hidden="true" /> Loading maintenance settings...</div>
            ) : (
                <div className="maintenance-control-portals">
                    {MAINTENANCE_PORTALS.map((portal) => {
                        const meta = PORTAL_META[portal];
                        const Icon = meta.icon;
                        const setting = settings[portal] ?? { portal, enabled: false, title: "", message: "", starts_at: "", ends_at: "" };
                        return (
                            <article className="maintenance-control-portal" key={portal}>
                                <header>
                                    <span className="maintenance-control-icon"><Icon aria-hidden="true" /></span>
                                    <div><h3>{meta.label}</h3><p>{setting.enabled ? "Maintenance is enabled" : "Portal is available"}</p></div>
                                    <label className="maintenance-control-switch">
                                        <input type="checkbox" checked={setting.enabled} onChange={(event) => updateDraft(portal, "enabled", event.target.checked)} />
                                        <span aria-hidden="true" />
                                        <strong>{setting.enabled ? "On" : "Off"}</strong>
                                    </label>
                                </header>
                                <div className="maintenance-control-fields">
                                    <label>Title<input value={setting.title} onChange={(event) => updateDraft(portal, "title", event.target.value)} placeholder={`${meta.label} is under maintenance`} /></label>
                                    <label className="maintenance-control-wide">Message<textarea value={setting.message} onChange={(event) => updateDraft(portal, "message", event.target.value)} placeholder="We are improving this portal. Please check back shortly." rows="3" /></label>
                                    <label>Starts at <small>Optional</small><input type="datetime-local" value={setting.starts_at} onChange={(event) => updateDraft(portal, "starts_at", event.target.value)} /></label>
                                    <label>Ends at <small>Optional</small><input type="datetime-local" value={setting.ends_at} onChange={(event) => updateDraft(portal, "ends_at", event.target.value)} /></label>
                                </div>
                                <footer><Button type="button" onClick={() => void save(portal)} disabled={Boolean(savingPortal)}>{savingPortal === portal ? <Loader2 className="maintenance-control-spin" /> : <Save />} Save {meta.label}</Button></footer>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
