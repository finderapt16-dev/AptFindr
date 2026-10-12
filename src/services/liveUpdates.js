import { supabase } from "./supabaseClient";

export const NOTIFICATIONS_CHANGED = "aptfindr:notifications-changed";
export function notifyNotificationsChanged(userId) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED, { detail: { userId } }));
}
let subscriptionId = 0;
export function subscribeToLiveUpdates(userId, table, refresh) {
  if (!userId) return () => {};
  let disposed = false;
  let running = false;
  let queued = false;
  const update = async () => {
    if (disposed) return;
    if (running) { queued = true; return; }
    running = true;
    try { await refresh(); } catch (error) { console.warn("Unable to refresh live counts", error); }
    finally { running = false; if (queued && !disposed) { queued = false; void update(); } }
  };
  const visibleUpdate = () => { if (document.visibilityState !== "hidden") void update(); };
  const localUpdate = event => { if (!event.detail?.userId || event.detail.userId === userId) void update(); };
  const channel = supabase.channel('live-'+table+'-'+userId+'-'+(++subscriptionId))
    .on("postgres_changes", { event: "*", schema: "public", table, filter: 'user_id=eq.'+userId }, update)
    .subscribe(status => { if (status === "SUBSCRIBED") void update(); });
  window.addEventListener("focus", visibleUpdate);
  window.addEventListener("online", visibleUpdate);
  document.addEventListener("visibilitychange", visibleUpdate);
  if (table === "notifications") window.addEventListener(NOTIFICATIONS_CHANGED, localUpdate);
  const timer = window.setInterval(visibleUpdate, 15000);
  void update();
  return () => {
    disposed = true;
    window.clearInterval(timer);
    window.removeEventListener("focus", visibleUpdate);
    window.removeEventListener("online", visibleUpdate);
    document.removeEventListener("visibilitychange", visibleUpdate);
    window.removeEventListener(NOTIFICATIONS_CHANGED, localUpdate);
    void supabase.removeChannel(channel);
  };
}
