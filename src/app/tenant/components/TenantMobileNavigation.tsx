import {
  ChevronRight,
  Clock,
  Heart,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { LogoutConfirmation } from "@/app/shared/components/common/LogoutConfirmation";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import { useFavorites } from "@/app/shared/hooks/useFavorites";

type TenantNavSection =
  | "overview"
  | "favorites"
  | "suggested"
  | "popular"
  | "browse"
  | "recent"
  | "settings"
  | "report"
  | "help";

interface TenantMobileNavigationProps {
  active?: TenantNavSection;
}

export function TenantMobileNavigation({ active = "overview" }: TenantMobileNavigationProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();
  const [open, setOpen] = useState(false);

  const isTenant = user?.role === "student" || user?.role === "employee";
  const portalLabel = user?.role === "student" ? "Student Portal" : "Employee Portal";
  const displayName = user?.name?.trim();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!isTenant) return null;

  const handleLogout = () => {
    setOpen(false);
    logout?.();
    navigate("/");
  };

  const navItemClass = (key: TenantNavSection) =>
    `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition ${
      active === key
        ? "bg-white text-orange-600 shadow-lg shadow-orange-950/20 ring-1 ring-orange-200"
        : "text-white/65 hover:bg-white/10 hover:text-white"
    }`;

  const NavLink = ({
    icon: Icon,
    label,
    to,
    section,
    badge,
  }: {
    icon: typeof Home;
    label: string;
    to: string;
    section: TenantNavSection;
    badge?: number;
  }) => (
    <Link to={to} onClick={() => setOpen(false)} aria-current={active === section ? "page" : undefined} className={navItemClass(section)}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="app-sidebar-badge flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
          {badge}
        </span>
      )}
      {section === "browse" && <ChevronRight className="h-4 w-4" />}
    </Link>
  );

  return (
    <>
      <button
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="app-sidebar-trigger fixed left-4 top-4 z-[90] flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-white shadow-lg shadow-orange-300/40 transition hover:bg-orange-600 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="app-sidebar-drawer relative h-full w-64 max-w-[86vw] bg-[#07142f] shadow-2xl">
            <button
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="app-sidebar-close absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/60 transition hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="app-sidebar flex h-full w-full flex-col overflow-y-auto">
              <div className="app-sidebar-brand px-5 pb-5 pt-6">
                <Link to="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-950/30">
                    <Home className="h-6 w-6 fill-white/20 text-white" />
                  </div>
                  <div>
                    <span className="text-lg font-black tracking-tight text-white">
                      Rent<span className="text-orange-500">Iloilo</span>
                    </span>
                    <p className="-mt-0.5 text-xs font-medium text-white/50">{portalLabel}</p>
                  </div>
                </Link>
              </div>

              <div className="px-4 pb-5">
                <div className="app-sidebar-profile flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.07] px-3 py-3 shadow-inner shadow-white/5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-lime-300 to-orange-500 text-sm font-black text-white shadow">
                    {user?.avatar ? <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" /> : user?.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{displayName || "Welcome"}</p>
                    <p className="truncate text-xs text-white/40">{user?.email ?? ""}</p>
                  </div>
                </div>
              </div>

              <nav className="space-y-1 px-3 py-3">
                <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-orange-400">Main</p>
                <NavLink icon={LayoutDashboard} label="Overview" to="/dashboard?section=overview" section="overview" />
                <NavLink icon={Heart} label="My Favorites" to="/favorites" section="favorites" badge={favorites.length} />
                <NavLink icon={Sparkles} label="Suggested" to="/dashboard?section=suggested" section="suggested" />
                <NavLink icon={TrendingUp} label="Popular" to="/dashboard?section=popular" section="popular" />
              </nav>

              <nav className="space-y-1 border-t border-white/10 px-3 py-4">
                <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-white/35">Browse</p>
                <NavLink icon={Search} label="Browse All" to="/browse" section="browse" />
                <NavLink icon={Clock} label="Recently Added" to="/dashboard?section=recent" section="recent" />
              </nav>

              <nav className="space-y-1 border-t border-white/10 px-3 py-4">
                <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-white/35">Account</p>
                <NavLink icon={Settings} label="Settings" to="/dashboard?section=settings" section="settings" />
                <NavLink icon={TriangleAlert} label="Report a Problem" to="/dashboard?section=report" section="report" />
                <NavLink icon={HelpCircle} label="Help" to="/dashboard?section=help" section="help" />
              </nav>

              <div className="mt-auto border-t border-white/10 px-4 py-4">
                <LogoutConfirmation onConfirm={handleLogout}>
                  <button className="app-sidebar-logout flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/10 hover:text-red-300">
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </LogoutConfirmation>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
