import { supabase } from "./supabaseClient";

export const MAINTENANCE_PORTALS = ["tenant", "landlord"];

export function normalizeMaintenanceSetting(row, portal) {
    return {
        portal,
        enabled: row?.enabled === true,
        title: String(row?.title ?? "").trim(),
        message: String(row?.message ?? "").trim(),
        starts_at: row?.starts_at ?? null,
        ends_at: row?.ends_at ?? null,
    };
}

export function isMaintenanceActive(setting, now = new Date()) {
    if (!setting?.enabled)
        return false;
    const currentTime = now.getTime();
    const startsAt = setting.starts_at ? new Date(setting.starts_at).getTime() : null;
    const endsAt = setting.ends_at ? new Date(setting.ends_at).getTime() : null;
    if (startsAt !== null && Number.isFinite(startsAt) && currentTime < startsAt)
        return false;
    if (endsAt !== null && Number.isFinite(endsAt) && currentTime >= endsAt)
        return false;
    return true;
}

export async function fetchMaintenanceSettings() {
    const { data, error } = await supabase
        .from("portal_maintenance")
        .select("portal,enabled,title,message,starts_at,ends_at,updated_at")
        .in("portal", MAINTENANCE_PORTALS);
    if (error)
        throw new Error(error.message || "Unable to load maintenance settings.");
    const byPortal = new Map((data ?? []).map((row) => [row.portal, row]));
    return MAINTENANCE_PORTALS.map((portal) => normalizeMaintenanceSetting(byPortal.get(portal), portal));
}

export async function updateMaintenanceSetting(portal, setting, updatedBy) {
    if (!MAINTENANCE_PORTALS.includes(portal))
        throw new Error("Unknown maintenance portal.");
    const payload = {
        portal,
        enabled: setting.enabled === true,
        title: String(setting.title ?? "").trim() || null,
        message: String(setting.message ?? "").trim() || null,
        starts_at: setting.starts_at || null,
        ends_at: setting.ends_at || null,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
        .from("portal_maintenance")
        .upsert(payload, { onConflict: "portal" })
        .select("portal,enabled,title,message,starts_at,ends_at,updated_at")
        .single();
    if (error)
        throw new Error(error.message || "Unable to update maintenance settings.");
    return normalizeMaintenanceSetting(data, portal);
}

export function subscribeToMaintenanceSettings(onChange) {
    const channel = supabase
        .channel("portal-maintenance-settings")
        .on("postgres_changes", { event: "*", schema: "public", table: "portal_maintenance" }, () => onChange?.())
        .subscribe();
    return () => { void supabase.removeChannel(channel); };
}
