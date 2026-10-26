import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabaseClient";
import { DEFAULT_APPLICATION_SETTINGS, validateApplicationSettings } from "./applicationSettingsValidation";

let snapshot = DEFAULT_APPLICATION_SETTINGS;
let request;
const listeners = new Set();
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const publish = row => { snapshot = { ...DEFAULT_APPLICATION_SETTINGS, ...row }; listeners.forEach(listener => listener()); return snapshot; };
export function fetchApplicationSettings() {
    if (!request) {
        request = supabase.from("application_settings").select("*").eq("id", true).single()
            .then(({ data, error }) => { if (error) throw new Error(error.message); return publish(data); })
            .finally(() => { request = null; });
    }
    return request;
}
export async function saveApplicationSettings(values) {
    const payload = validateApplicationSettings(values);
    const { data, error } = await supabase.from("application_settings")
        .update({ ...payload, updated_at: new Date().toISOString() }).eq("id", true).select("*").single();
    if (error || !data) throw new Error(error?.message || "Unable to save system settings.");
    return publish(data);
}
export function useApplicationSettings() {
    const value = useSyncExternalStore(subscribe, () => snapshot, () => DEFAULT_APPLICATION_SETTINGS);
    useEffect(() => { void fetchApplicationSettings().catch(error => console.warn("Unable to load application settings", error)); }, []);
    return value;
}
