import "./LandlordSidebar.css";
import { Bell, HelpCircle, LayoutGrid, ListPlus, LogOut, Settings, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { LogoutConfirmation } from "@/components/LogoutConfirmation";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

const mainItems = [
  { label: "My Properties", section: "overview", icon: LayoutGrid },
  { label: "Market Trends", section: "market", icon: TrendingUp, href: "/browse" },
  { label: "Notifications", section: "notifications", icon: Bell },
];

const manageItems = [
  { label: "Add Property", section: "add-property", icon: ListPlus, href: "/add-apartment" },
];

const accountItems = [
  { label: "Settings", section: "settings", icon: Settings },
  { label: "Help & Support", section: "help", icon: HelpCircle },
];

export function LandlordSidebar({ user, activeSection, unreadNotifications, needsFacebookLink = false, onSectionChange, onClose, onLogout }) {
  const liveUnreadNotifications = useUnreadNotifications(user?.id);
  const notificationCount = liveUnreadNotifications ?? unreadNotifications ?? 0;

  const selectSection = (section) => {
    onSectionChange(section);
    onClose?.();
  };

  const renderItem = ({ label, section, icon: Icon, href }) => {
    const isActive = activeSection === section;
    const content = <>
      <Icon className="landlord-sidebar-nav-icon" />
      <span>{label}</span>
      {section === "settings" && needsFacebookLink && <span className="landlord-sidebar-reminder">Add Facebook link</span>}
      {section === "notifications" && notificationCount > 0 && <span className="app-sidebar-badge">{notificationCount > 99 ? "99+" : notificationCount}</span>}
    </>;

    if (href) {
      return <Link key={section} to={href} onClick={onClose} aria-current={isActive ? "page" : undefined} className="app-sidebar-nav-item landlord-sidebar-nav-item">{content}</Link>;
    }

    return <button key={section} type="button" onClick={() => selectSection(section)} aria-current={isActive ? "page" : undefined} className="app-sidebar-nav-item landlord-sidebar-nav-item">{content}</button>;
  };

  return <aside className="app-sidebar landlord-sidebar">
    <button type="button" onClick={() => selectSection("overview")} className="app-sidebar-brand landlord-sidebar-brand">
      <span className="landlord-sidebar-brand-row">
        <img src="/aptfindr-wordmark.png?v=2" alt="AptFindr" className="landlord-sidebar-wordmark" />
      </span>
    </button>

    <div className="landlord-sidebar-profile-wrap">
      <div className="app-sidebar-profile landlord-sidebar-profile">
        <span className="landlord-sidebar-avatar">{user?.avatar ? <img src={user.avatar} alt="Profile" /> : (user?.name?.[0]?.toUpperCase() ?? "L")}</span>
        <span className="landlord-sidebar-profile-copy"><strong>{user?.name || "Name unavailable"}</strong><small>{user?.email ?? ""}</small></span>
      </div>
    </div>

    <nav className="landlord-sidebar-nav" aria-label="Main navigation">
      <p className="landlord-sidebar-section-title">Main</p>
      {mainItems.map(renderItem)}
    </nav>

    <nav className="landlord-sidebar-nav" aria-label="Property management navigation">
      <p className="landlord-sidebar-section-title">Manage</p>
      {manageItems.map(renderItem)}
    </nav>

    <nav className="landlord-sidebar-nav" aria-label="Account navigation">
      <p className="landlord-sidebar-section-title">Account</p>
      {accountItems.map(renderItem)}
    </nav>

    <div className="landlord-sidebar-footer">
      <LogoutConfirmation onConfirm={onLogout}>
        <button type="button" className="app-sidebar-logout landlord-sidebar-logout"><LogOut />Log Out</button>
      </LogoutConfirmation>
    </div>
  </aside>;
}
