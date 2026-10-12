import { useCallback, useEffect, useState } from "react";
import { fetchNotifications } from "@/services/dashboardSupabaseService";
import { subscribeToLiveUpdates } from "@/services/liveUpdates";

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
      setUnreadCount(Array.isArray(notifications) ? notifications.filter(item => item.is_deleted !== true && isUnread(item)).length : 0);
    } catch (error) {
      console.warn("Unable to load the unread notification count.", error);
      setUnreadCount(0);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) { setUnreadCount(0); return undefined; }
    setUnreadCount(null);
    return subscribeToLiveUpdates(userId, "notifications", refresh);
  }, [refresh, userId]);

  return unreadCount;
}
