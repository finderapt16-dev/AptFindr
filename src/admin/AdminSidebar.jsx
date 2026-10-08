import { LogoutConfirmation } from "@/components/LogoutConfirmation";
import {
  Bell,
  Building2,
  Flag,
  Gavel,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";

const MAIN_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", section: "landlords" },
  { icon: UserRound, label: "Landlord", section: "landlords" },
  { icon: Building2, label: "Apartments", section: "apartments" },
  { icon: Bell, label: "Notifications", section: "notifications" },
];

const MANAGEMENT_ITEMS = [
  { icon: Flag, label: "Reports", section: "reports" },
  { icon: Gavel, label: "Appeals", section: "appeals" },
];

const ACCOUNT_ITEMS = [
  { icon: Settings, label: "Settings", section: "admininfo" },
];

export function AdminSidebar({
  activeSection,
  isSupportView = false,
  pendingReports,
  activeAppealsCount,
  unreadNotifsCount,
  user,
  navigateToAdminModule,
  navigateToSupport,
  handleLogout,
  onNavigate,
}) {
  const countFor = (section, label) => {
    if (label === "Help & Support") return 0;
    if (section === "reports") return pendingReports;
    if (section === "appeals") return activeAppealsCount;
    if (section === "notifications") return unreadNotifsCount;
    return 0;
  };

  const renderGroup = (label, items) => (
    <nav aria-label={label} className="admin-figma-sidebar-group">
      <p>{label}</p>
      {items.map(({ icon: Icon, label: itemLabel, section }) => {
        const count = countFor(section, itemLabel);
        const isCurrent = itemLabel === "Dashboard"
          ? false
          : itemLabel === "Help & Support"
          ? isSupportView
          : activeSection === section && !(isSupportView && section === "notifications");

        return (
          <button
            aria-current={isCurrent ? "page" : undefined}
            className={`admin-figma-sidebar-item ${isCurrent ? "is-active" : ""}`}
            key={itemLabel}
            onClick={() => {
              if (itemLabel === "Help & Support") {
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
            {count > 0 && <small>{count}</small>}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="app-sidebar admin-figma-sidebar">
      <div className="admin-figma-sidebar-brand">
        <img alt="AptFindr" src="/aptfindr-wordmark.png?v=2" />
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

      {renderGroup("Main", MAIN_ITEMS)}
      {renderGroup("Management", MANAGEMENT_ITEMS)}
      {renderGroup("Account", ACCOUNT_ITEMS)}

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
