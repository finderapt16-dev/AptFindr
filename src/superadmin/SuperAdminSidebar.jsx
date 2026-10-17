import { LogoutConfirmation } from "@/components/LogoutConfirmation";
import {
  Bell,
  Building2,
  Flag,
  Gavel,
  LogOut,
  MessageCircleQuestion,
  Settings,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";

const MAIN_ITEMS = [
  { icon: Users, label: "User Management", section: "users" },
  { icon: UserRound, label: "Landlord", section: "landlords" },
  { icon: Building2, label: "Apartments", section: "apartments" },
  { icon: Bell, label: "Notifications", section: "notifications" },
];

const MANAGEMENT_ITEMS = [
  { icon: Flag, label: "Reports", section: "reports" },
  { icon: Gavel, label: "Appeals", section: "appeals" },
  { icon: MessageCircleQuestion, label: "Contact Support", section: "support" },
  { icon: Wrench, label: "Maintenance", section: "maintenance" },
];

const ACCOUNT_ITEMS = [
  { icon: Settings, label: "Settings", section: "admininfo" },
];

export function AdminSidebar({
  activeSection,
  isSupportView = false,
  pendingLandlordsCount = 0,
  pendingApartmentsCount = 0,
  pendingReports = 0,
  activeAppealsCount = 0,
  unreadNotifsCount = 0,
  unreadSupportCount = 0,
  user,
  navigateToAdminModule,
  navigateToSupport,
  handleLogout,
  onNavigate,
}) {
  const countFor = (section) => {
    if (section === "landlords") return pendingLandlordsCount;
    if (section === "apartments") return pendingApartmentsCount;
    if (section === "support") return unreadSupportCount;
    if (section === "reports") return pendingReports;
    if (section === "appeals") return activeAppealsCount;
    if (section === "notifications") return unreadNotifsCount;
    return 0;
  };

  const renderGroup = (label, items) => (
    <nav aria-label={label} className="admin-figma-sidebar-group">
      <p>{label}</p>
      {items.map(({ icon: Icon, label: itemLabel, section }) => {
        const count = countFor(section);
        const isCurrent = section === "support"
          ? isSupportView
          : activeSection === section && !(isSupportView && section === "notifications");

        return (
          <button
            aria-current={isCurrent ? "page" : undefined}
            className={`admin-figma-sidebar-item ${isCurrent ? "is-active" : ""}`}
            key={itemLabel}
            onClick={() => {
              if (section === "support") {
                navigateToSupport?.();
              } else {
                navigateToAdminModule(section);
              }
              onNavigate?.();
            }}
            type="button"
          >
            <Icon aria-hidden="true" />
            <span>{itemLabel}</span>
            {count > 0 && (
              <small
                className="admin-figma-sidebar-count"
                title={`${count} item${count === 1 ? "" : "s"} requiring attention`}
              >
                {count}
              </small>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="app-sidebar admin-figma-sidebar">
      <div className="admin-figma-sidebar-brand">
        <img alt="AptFindr" src="/aptfindr-wordmark.svg" />
      </div>

      <div className="admin-figma-sidebar-profile">
        <span className="admin-figma-sidebar-avatar" aria-hidden="true">
          {user?.avatar ? <img alt="" src={user.avatar} /> : (user?.name?.[0]?.toUpperCase() ?? "A")}
        </span>
        <span className="admin-figma-sidebar-profile-copy">
          <strong>{user?.name || "AptFindr Administrator"}</strong>
          <small>{user?.email || "admin@aptfindr.com"}</small>
        </span>
      </div>

      {renderGroup("MAIN", MAIN_ITEMS)}
      {renderGroup("MANAGEMENT", MANAGEMENT_ITEMS)}
      {renderGroup("ACCOUNT", ACCOUNT_ITEMS)}

      <div className="admin-figma-sidebar-logout">
        <LogoutConfirmation onConfirm={handleLogout}>
          <button type="button" className="app-sidebar-logout admin-figma-sidebar-logout-button">
            <LogOut aria-hidden="true" />
            <span>Log Out</span>
          </button>
        </LogoutConfirmation>
      </div>
    </div>
  );
}
