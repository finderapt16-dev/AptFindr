import { useCallback, useEffect, useState } from "react";
import { fetchNotifications } from "@/services/dashboardSupabaseService";
import { supabase } from "@/services/supabaseClient";

const isUnread = (notification) => !(notification.read ?? notification.is_read);

export function useUnreadNotifications(userId) {
  const [unreadCount, setUnreadCount] = useState(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    try {
      const notifications = await fetchNotifications(userId);
      setUnreadCount(Array.isArray(notifications) ? notifications.filter(isUnread).length : 0);
    } catch (error) {
      console.warn("Unable to load the unread notification count.", error);
      setUnreadCount(0);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
    if (!userId) return undefined;

    const refreshWhenOnline = () => void refresh();
    window.addEventListener("online", refreshWhenOnline);
    let channel;
    try {
      channel = supabase
        .channel(`menu-notifications-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => void refresh())
        .subscribe();
    } catch (error) {
      console.warn("Unable to subscribe to notification updates.", error);
    }

    return () => {
      window.removeEventListener("online", refreshWhenOnline);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refresh, userId]);

  return unreadCount;
}
