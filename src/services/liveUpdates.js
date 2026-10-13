import { supabase } from "./supabaseClient";

export const NOTIFICATIONS_CHANGED = "aptfindr:notifications-changed";
export function notifyNotificationsChanged(userId) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED, { detail: { userId } }));
}
let subscriptionId = 0;
const LIVE_UPDATE_DEBOUNCE_MS = 1500;
const LIVE_UPDATE_INTERVAL_MS = 60000;
export function subscribeToLiveUpdates(userId, table, refresh) {
  if (!userId) return () => {};
  let disposed = false;
  let running = false;
  let queued = false;
  let debounceTimer = null;
  const update = async () => {
    if (disposed) return;
    if (running) { queued = true; return; }
    running = true;
    try { await refresh(); } catch (error) { console.warn("Unable to refresh live counts", error); }
    finally { running = false; if (queued && !disposed) { queued = false; void update(); } }
  };
  const scheduleUpdate = (delay = LIVE_UPDATE_DEBOUNCE_MS) => {
    if (disposed) return;
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      debounceTimer = null;
      void update();
    }, delay);
  };
  const visibleUpdate = () => { if (document.visibilityState !== "hidden") scheduleUpdate(); };
  const localUpdate = event => { if (!event.detail?.userId || event.detail.userId === userId) scheduleUpdate(); };
  const channel = supabase.channel('live-'+table+'-'+userId+'-'+(++subscriptionId))
    .on("postgres_changes", { event: "*", schema: "public", table, filter: 'user_id=eq.'+userId }, () => scheduleUpdate())
    .subscribe(status => { if (status === "SUBSCRIBED") scheduleUpdate(0); });
  window.addEventListener("focus", visibleUpdate);
  window.addEventListener("online", visibleUpdate);
  document.addEventListener("visibilitychange", visibleUpdate);
  if (table === "notifications") window.addEventListener(NOTIFICATIONS_CHANGED, localUpdate);
  const timer = window.setInterval(() => scheduleUpdate(0), LIVE_UPDATE_INTERVAL_MS);
  void update();
  return () => {
    disposed = true;
    if (debounceTimer) window.clearTimeout(debounceTimer);
    window.clearInterval(timer);
    window.removeEventListener("focus", visibleUpdate);
    window.removeEventListener("online", visibleUpdate);
    document.removeEventListener("visibilitychange", visibleUpdate);
    window.removeEventListener(NOTIFICATIONS_CHANGED, localUpdate);
    void supabase.removeChannel(channel);
  };
}
