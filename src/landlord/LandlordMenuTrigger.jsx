import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

export function LandlordMenuTrigger({ className = "", expanded, iconClassName, onClick, title = "Open navigation" }) {
  const { user } = useAuth();
  const unreadCount = useUnreadNotifications(user?.id);
  const badgeLabel = unreadCount > 99 ? "99+" : unreadCount;
  const accessibleLabel = unreadCount
    ? `${title}, ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
    : title;

  return (
    <button type="button" title={title} aria-label={accessibleLabel} aria-expanded={expanded} className={`app-sidebar-trigger ${className}`.trim()} onClick={onClick}>
      <Menu className={iconClassName} />
      {unreadCount > 0 && <span className="app-sidebar-trigger-notification-badge" aria-hidden="true">{badgeLabel}</span>}
    </button>
  );
}
