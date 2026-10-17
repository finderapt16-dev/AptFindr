import { Bell, Heart, HelpCircle, LogOut, Menu, Search, Settings, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogoutConfirmation } from "@/components/LogoutConfirmation";
import { useAuth } from "@/contexts/AuthContext";
import { isTenantRole } from "@/services/authService";
import { useFavorites } from "@/tenant/useFavorites";
export function MobileNavigation({ active = "apartments", unreadCount = 0 }) {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { unreadFavoriteCount } = useFavorites();
    const [open, setOpen] = useState(false);
    const isTenant = isTenantRole(user?.role);
    const unreadNotificationCount = Math.max(0, Number(unreadCount) || 0);
    const navigationCount = unreadNotificationCount + unreadFavoriteCount;
    const navigationBadge = navigationCount > 99 ? "99+" : navigationCount;
    const portalLabel = user?.email ?? "";
    const displayName = user?.name?.trim();
    useEffect(() => {
        if (!open)
            return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKeyDown = (event) => {
            if (event.key === "Escape")
                setOpen(false);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);
    if (!isTenant)
        return null;
    const handleLogout = () => {
        setOpen(false);
        logout?.();
        navigate("/", { replace: true });
    };
    const navItemClass = (key) => `app-sidebar-nav-item ${active === key
        ? "tenant-mobile-nav-active"
        : "tenant-mobile-nav-idle"}`;
    const NavLink = ({ icon: Icon, label, to, section, badge, }) => (<Link to={to} state={section === "apartments" ? { resetBrowseMode: true } : undefined} onClick={() => setOpen(false)} aria-current={active === section ? "page" : undefined} className={navItemClass(section)}>
      <Icon className="tenant-mobile-navigation-icon-icon"/>
      <span className="tenant-mobile-navigation-span">{label}</span>
      {badge !== undefined && badge > 0 && (<span className="app-sidebar-badge">
          {badge}
        </span>)}
    </Link>);
    return (<>
      <button aria-label={navigationCount ? `Open navigation, ${navigationCount} total items: ${unreadNotificationCount} unread notifications and ${unreadFavoriteCount} new favorites` : "Open navigation"} onClick={() => setOpen(true)} className="app-sidebar-trigger">
        <Menu className="tenant-mobile-navigation-menu-icon"/>
        {navigationCount > 0 && <span className="app-sidebar-trigger-notification-badge" aria-hidden="true">{navigationBadge}</span>}
      </button>

      {open && (<div className="tenant-mobile-navigation-overlay">
          <button aria-label="Close navigation" className="tenant-mobile-navigation-close-navigation" onClick={() => setOpen(false)}/>
          <aside className="app-sidebar-drawer tenant-mobile-navigation-drawer is-open">
            <button aria-label="Close navigation" onClick={() => setOpen(false)} className="app-sidebar-close">
              <X className="tenant-mobile-navigation-x-icon"/>
            </button>

            <div className="app-sidebar tenant-figma-sidebar">
              <div className="app-sidebar-brand">
                <Link to="/browse" state={{ resetBrowseMode: true }} onClick={() => setOpen(false)} className="tenant-mobile-navigation-row">
                  <img src="/aptfindr-wordmark.svg" alt="AptFindr" className="tenant-mobile-navigation-wordmark"/>
                </Link>
              </div>

              <div className="tenant-mobile-navigation-panel">
                <Link to="/tenant/dashboard?section=settings" onClick={() => setOpen(false)} className="app-sidebar-profile app-sidebar-profile-button" aria-label="Open personal information settings">
                  <div className="tenant-mobile-navigation-row-2">
                    {user?.avatar ? <img src={user.avatar} alt="Profile" className="tenant-mobile-navigation-image-2"/> : user?.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="tenant-mobile-navigation-panel-2">
                    <p className="tenant-mobile-navigation-text">{displayName || "Username unavailable"}</p>
                    <p className="tenant-mobile-navigation-text-2">{portalLabel}</p>
                  </div>
                </Link>
              </div>

              <nav className="tenant-mobile-navigation-nav">
                <p className="tenant-mobile-navigation-main">Main</p>
                <NavLink icon={Search} label="Apartments" to="/browse" section="apartments"/>
                <NavLink icon={Heart} label="Favorites" to="/favorites" section="favorites" badge={unreadFavoriteCount}/>
                <NavLink icon={Bell} label="Notifications" to="/tenant/dashboard?section=notifications" section="notifications" badge={unreadCount}/>
              </nav>

              <nav className="tenant-mobile-navigation-nav-2">
                <p className="tenant-mobile-navigation-account">Account</p>
                <NavLink icon={Settings} label="Settings" to="/tenant/dashboard?section=settings" section="settings"/>
                <NavLink icon={TriangleAlert} label="Report a Problem" to="/tenant/dashboard?section=report" section="report"/>
                <NavLink icon={HelpCircle} label="Help" to="/tenant/dashboard?section=help" section="help"/>
              </nav>

              <div className="tenant-mobile-navigation-panel-3">
                <LogoutConfirmation onConfirm={handleLogout}>
                  <button className="app-sidebar-logout">
                    <LogOut className="tenant-mobile-navigation-log-out-icon"/>
                    Log Out
                  </button>
                </LogoutConfirmation>
              </div>
            </div>
          </aside>
        </div>)}
    </>);
}
