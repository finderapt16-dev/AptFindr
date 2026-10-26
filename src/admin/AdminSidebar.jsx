import { useApplicationSettings } from "@/services/applicationSettingsService";
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
  { icon: LayoutDashboard, label: "Dashboard", section: "overview" },
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
  pendingReports,
  activeAppealsCount,
  unreadNotifsCount,
  pendingLandlordsCount,
  pendingApartmentsCount,
  user,
  navigateToAdminModule,
  handleLogout,
  onNavigate,
}) {
  const { application_name: applicationName } = useApplicationSettings();
  const countFor = (section) => {
    if (section === "reports") return pendingReports;
    if (section === "appeals") return activeAppealsCount;
    if (section === "notifications") return unreadNotifsCount;
    if (section === "landlords") return pendingLandlordsCount;
    if (section === "apartments") return pendingApartmentsCount;
    return 0;
  };

  const renderGroup = (label, items) => (
    <nav aria-label={label} className="admin-figma-sidebar-group">
      <p>{label}</p>
      {items.map(({ icon: Icon, label: itemLabel, section }) => {
        const count = countFor(section);
        const isCurrent = activeSection === section;

        return (
          <button
            aria-current={isCurrent ? "page" : undefined}
            className={`admin-figma-sidebar-item ${isCurrent ? "is-active" : ""}`}
            key={itemLabel}
            onClick={() => {
              navigateToAdminModule(section);
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
        {applicationName === "AptFindr" ? <img alt="AptFindr" src="/aptfindr-wordmark.svg" /> : <strong style={{ color: "#0da7e1", fontSize: 26 }}>{applicationName}</strong>}
      </div>

      <button type="button" className="admin-figma-sidebar-profile app-sidebar-profile-button" onClick={() => {
        navigateToAdminModule("admininfo");
        onNavigate?.();
      }} aria-label="Open personal information settings">
        <span className="admin-figma-sidebar-avatar" aria-hidden="true">
          {user?.avatar ? <img alt="" src={user.avatar} /> : (user?.name?.[0]?.toUpperCase() ?? "A")}
        </span>
        <span className="admin-figma-sidebar-profile-copy">
          <strong>{user?.name || "AptFindr Administrator"}</strong>
          <small>{user?.email || "admin@aptfindr.com"}</small>
        </span>
      </button>

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
