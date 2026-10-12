import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

export function LandlordMenuTrigger({ className = "", expanded, iconClassName, onClick, title = "Open navigation", needsFacebookLink = false }) {
  const { user } = useAuth();
  const unreadCount = useUnreadNotifications(user?.id);
  const navigationCount = unreadCount + (needsFacebookLink ? 1 : 0);
  const badgeLabel = navigationCount > 99 ? "99+" : navigationCount;
  const accessibleLabel = navigationCount
    ? `${title}, ${navigationCount} total items: ${unreadCount} unread notifications${needsFacebookLink ? " and 1 profile reminder" : ""}`
    : title;

  return (
    <button type="button" title={title} aria-label={accessibleLabel} aria-expanded={expanded} className={`app-sidebar-trigger ${className}`.trim()} onClick={onClick}>
      <Menu className={iconClassName} />
      {navigationCount > 0 && <span className="app-sidebar-trigger-notification-badge" aria-hidden="true">{badgeLabel}</span>}
    </button>
  );
}
