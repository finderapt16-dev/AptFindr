import { ApartmentCard } from "@/app/shared/components/common/ApartmentCard";
import { EvidenceUploader, type EvidenceFile } from "@/app/shared/components/common/EvidenceUploader";
import { LogoutConfirmation } from "@/app/shared/components/common/LogoutConfirmation";
import { VerifiedBadge } from "@/app/shared/components/common/VerifiedBadge";
import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/shared/components/ui/card";
import { Input } from "@/app/shared/components/ui/input";
import { Label } from "@/app/shared/components/ui/label";
import { useApartmentsContext } from "@/app/shared/contexts/ApartmentsContext";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import { useFavorites } from "@/app/shared/hooks/useFavorites";
import { Settings as AccountSettings } from "@/app/shared/pages/settings/Settings";
import {
  createReport,
  createSupportTicket,
  defaultTenantPreferences,
  fetchApartmentViews,
  fetchFavorites as fetchDashboardFavorites,
  fetchTenantPreferences,
  type DashboardApartmentViewRow,
  type DashboardFavoriteRow,
  type TenantPreferenceSettings
} from "@/app/shared/services/dashboardSupabaseService";
import { uploadReportEvidence } from "@/app/shared/services/reportEvidenceService";
import { getImageUrl } from "@/app/shared/utils/images";
import { getAvailableRoomCount, isTenantVisibleApartment } from "@/app/shared/utils/listingVisibility";
import { rankApartments, type TenantPreferences } from "@/app/shared/utils/rankingEngine";
import {
  AlertTriangle,
  Bath,
  Bed,
  Bookmark,
  BookOpen,
  Building2,
  CheckCircle,
  ChevronRight,
  Clock,
  Eye,
  Grid2X2,
  Heart,
  HelpCircle,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  List,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Loader2,
  RotateCcw,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Square,
  Trash2,
  TrendingUp,
  X,
  type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const NAV_MAIN = [
  { icon: LayoutDashboard, label: "Dashboard",   section: "overview",   isLink: false },
  { icon: Heart,           label: "My Favorites",section: "favorites",  isLink: false },
  { icon: Sparkles,        label: "Suggested",   section: "suggested",  isLink: false },
  { icon: TrendingUp,      label: "Popular",     section: "popular",    isLink: false },
];

const NAV_BROWSE = [
  { icon: Search, label: "Browse All",     href: "/browse", isLink: true },
  { icon: Clock,  label: "Recently Added", section: "recent", isLink: false },
];

const NAV_ACCOUNT = [
  { icon: Settings,      label: "Settings",           section: "settings",  isLink: false },
  { icon: AlertTriangle, label: "Report a Problem",   section: "report",  isLink: false },
  { icon: HelpCircle,    label: "Help",               section: "help",    isLink: false },
];

const DASHBOARD_SECTIONS = ["overview", "favorites", "suggested", "popular", "recent", "settings", "report", "help"];

export function StudentEmployeeDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { favorites: favoriteIds, toggleFavorite, refreshFavorites } = useFavorites();
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [favoriteFilter, setFavoriteFilter] = useState<"all" | "available" | "unavailable">("all");
  const [favoriteSort, setFavoriteSort] = useState<"newest" | "price-low" | "price-high" | "name">("newest");
  const [favoriteView, setFavoriteView] = useState<"grid" | "list">("grid");
  const [removingFavoriteId, setRemovingFavoriteId] = useState<string | null>(null);

  // ── Report form state ────────────────────────────────────────────────────
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportForm, setReportForm] = useState({
    apartment: "",
    details: "",
    contact: user?.email || "",
  });
  const [reportEvidenceFiles, setReportEvidenceFiles] = useState<EvidenceFile[]>([]);

  // ── Help & support state ────────────────────────────────────────────────
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [supportForm, setSupportForm] = useState({
    topic: "",
    message: "",
    contact: user?.email || "",
  });

  // ── Settings state ───────────────────────────────────────────────────────
  const [preferredArea, setPreferredArea]     = useState("");
  const [maxBudget, setMaxBudget]             = useState("6000");
  const [prefPetFriendly, setPrefPetFriendly] = useState(false);
  const [prefParking, setPrefParking]         = useState(false);
  const [prefFurnished, setPrefFurnished]     = useState(false);
  const [recommendationLocation, setRecommendationLocation] = useState(true);
  const [saveBudgetPreferences, setSaveBudgetPreferences] = useState(true);
  const [dashboardFavoriteRows, setDashboardFavoriteRows] = useState<DashboardFavoriteRow[]>([]);
  const [dashboardViewRows, setDashboardViewRows] = useState<DashboardApartmentViewRow[]>([]);

  const {
    apartments: allApartments,
    isLoading: apartmentsLoading,
    error: apartmentsError,
    refreshApartments,
  } = useApartmentsContext();

  const applyTenantPreferences = (preferences: TenantPreferenceSettings) => {
    setPreferredArea(preferences.preferredArea);
    setMaxBudget(String(preferences.maxBudget || 6000));
    setPrefPetFriendly(preferences.petFriendly);
    setPrefParking(preferences.parking);
    setPrefFurnished(preferences.furnished);
    setRecommendationLocation(preferences.recommendationLocation);
    setSaveBudgetPreferences(preferences.saveBudgetPreferences);
  };

  useEffect(() => {
    const section = new URLSearchParams(location.search).get("section");
    if (section && DASHBOARD_SECTIONS.includes(section)) {
      setActiveSection(section);
    }
  }, [location.search]);

  useEffect(() => {
    let mounted = true;

    void Promise.all([fetchDashboardFavorites(), fetchApartmentViews()])
      .then(([favorites, views]) => {
        if (!mounted) return;
        setDashboardFavoriteRows(favorites);
        setDashboardViewRows(views);
      })
      .catch(() => {
        if (!mounted) return;
        setDashboardFavoriteRows([]);
        setDashboardViewRows([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    applyTenantPreferences(defaultTenantPreferences);

    if (!user?.id || (user.role !== "student" && user.role !== "employee")) return;

    let mounted = true;
    const tenantId = user.id;

    void fetchTenantPreferences(tenantId)
      .then((preferences) => {
        if (!mounted || !preferences) return;
        applyTenantPreferences(preferences);
      })
      .catch(() => {
        if (!mounted) return;
        toast.error("Unable to load tenant preferences.");
      });

    return () => {
      mounted = false;
    };
  }, [user?.id, user?.role]);

  const publishedApartments = useMemo(() => {
    return allApartments.filter(isTenantVisibleApartment);
  }, [allApartments]);

  const isApartmentAvailable = isTenantVisibleApartment;

  const availableApartments = useMemo(() => {
    return publishedApartments.filter(isApartmentAvailable);
  }, [publishedApartments]);

  const availableRoomsCount = useMemo(() => {
    return publishedApartments.reduce((total, apt) => total + getAvailableRoomCount(apt), 0);
  }, [publishedApartments]);

  const tenantRankingPreferences = useMemo<TenantPreferences>(() => {
    const parsedBudget = Number(maxBudget);

    return {
      maxBudget: saveBudgetPreferences && Number.isFinite(parsedBudget) && parsedBudget > 0 ? parsedBudget : undefined,
      preferredArea: recommendationLocation && preferredArea.trim() ? preferredArea.trim() : undefined,
      petFriendly: prefPetFriendly,
      parking: prefParking,
      furnished: prefFurnished,
      tenantType: user?.role === "student" ? "student" : "employee",
    };
  }, [maxBudget, preferredArea, recommendationLocation, prefPetFriendly, prefParking, prefFurnished, saveBudgetPreferences, user?.role]);

  // Personalized recommendations based on saved tenant preferences
  const suggestedApartments = useMemo(() => {
    if (user?.role === "student" || user?.role === "employee") {
      const apartmentViewCounts = new Map<string, number>();
      dashboardViewRows.forEach((row) => {
        const apartmentId = row.apartment_id ?? row.apartmentId ?? "";
        if (apartmentId) apartmentViewCounts.set(apartmentId, (apartmentViewCounts.get(apartmentId) ?? 0) + (Number(row.view_count) || 1));
      });
      const apartmentFavoriteCounts = new Map<string, number>();
      dashboardFavoriteRows.forEach((row) => {
        const apartmentId = row.apartment_id ?? row.apartmentId ?? "";
        if (apartmentId) apartmentFavoriteCounts.set(apartmentId, (apartmentFavoriteCounts.get(apartmentId) ?? 0) + 1);
      });
      return rankApartments(publishedApartments, tenantRankingPreferences, favoriteIds, { apartmentViewCounts, apartmentFavoriteCounts }).slice(0, 6);
    }
    return publishedApartments.slice(0, 6);
  }, [dashboardFavoriteRows, dashboardViewRows, favoriteIds, publishedApartments, tenantRankingPreferences, user?.role]);

  // Popular apartments (most viewed, most favorited, highest engagement)
  const popularApartments = useMemo(() => {
    const getApartmentId = (row: DashboardFavoriteRow | DashboardApartmentViewRow) => row.apartment_id ?? row.apartmentId ?? "";
    const getViewWeight = (row: DashboardApartmentViewRow) => Number(row.view_count) || 1;
    const engagementByApartment = new Map<string, number>();

    dashboardFavoriteRows.forEach((row) => {
      const apartmentId = getApartmentId(row);
      if (apartmentId) engagementByApartment.set(apartmentId, (engagementByApartment.get(apartmentId) ?? 0) + 2);
    });

    dashboardViewRows.forEach((row) => {
      const apartmentId = getApartmentId(row);
      if (apartmentId) engagementByApartment.set(apartmentId, (engagementByApartment.get(apartmentId) ?? 0) + getViewWeight(row));
    });

    return [...publishedApartments]
      .filter((apartment) => (engagementByApartment.get(apartment.id) ?? 0) > 0)
      .sort((a, b) => {
        return (engagementByApartment.get(b.id) ?? 0) - (engagementByApartment.get(a.id) ?? 0);
      })
      .slice(0, 6);
  }, [dashboardFavoriteRows, dashboardViewRows, publishedApartments]);

  // Recent apartments sorted by availability date
  const recentApartments = useMemo(() => {
    return [...publishedApartments]
      .sort((a, b) => new Date(b.availableDate).getTime() - new Date(a.availableDate).getTime())
      .slice(0, 6);
  }, [publishedApartments]);

  const favoriteApartments = publishedApartments.filter((apt) => favoriteIds.includes(apt.id));
  const getAvailableRooms = getAvailableRoomCount;

  const visibleFavoriteApartments = useMemo(() => {
    return [...favoriteApartments]
      .filter((apartment) => {
        if (favoriteFilter === "available") return isApartmentAvailable(apartment);
        if (favoriteFilter === "unavailable") return !isApartmentAvailable(apartment);
        return true;
      })
      .sort((a, b) => {
        if (favoriteSort === "price-low") return Number(a.price || 0) - Number(b.price || 0);
        if (favoriteSort === "price-high") return Number(b.price || 0) - Number(a.price || 0);
        if (favoriteSort === "name") return a.title.localeCompare(b.title);

        const bDate = new Date(b.updatedAt || b.createdAt || b.availableDate).getTime();
        const aDate = new Date(a.updatedAt || a.createdAt || a.availableDate).getTime();
        return (Number.isNaN(bDate) ? 0 : bDate) - (Number.isNaN(aDate) ? 0 : aDate);
      });
  }, [favoriteApartments, favoriteFilter, favoriteSort]);
  const displayName = user?.name?.trim();
  const portalLabel = user?.role === "student" ? "Student Portal" : "Employee Portal";
  const dashboardSubtitle = user?.role === "student"
    ? "Find a verified place that fits your study routine."
    : "Discover your ideal home near your workplace.";

  const handleLogout = () => { logout?.(); navigate("/"); };

  const removeFavorite = async (apartmentId: string) => {
    setRemovingFavoriteId(apartmentId);
    try {
      await toggleFavorite(apartmentId);
      await refreshFavorites();
    } finally {
      setRemovingFavoriteId(null);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportForm.apartment) {
      toast.error("Please select the apartment you want to report.");
      return;
    }

    if (!reportForm.details.trim()) {
      toast.error("Please describe the problem before submitting.");
      return;
    }

    if (!user?.id) {
      toast.error("Please sign in to submit a report.");
      return;
    }

    const apartment = allApartments.find((apt) => apt.id === reportForm.apartment);

    try {
      const createdReport = await createReport({
        reporter_id: user.id,
        reporter_role: user.role === "student" || user.role === "employee" ? user.role : "student",
        apartment_id: reportForm.apartment,
        category: "Apartment problem",
        issue_type: "Tenant-submitted problem",
        severity: "med",
        tags: [],
        details: reportForm.details.trim(),
        contact: reportForm.contact.trim() || user.email,
        landlord_id: apartment?.landlordId,
        has_evidence: reportEvidenceFiles.length > 0,
        evidence_count: reportEvidenceFiles.length,
      });

      if (!createdReport?.id) {
        throw new Error("Unable to save report.");
      }

      const reportId = createdReport.id;
      const uploadResults = await Promise.all(
        reportEvidenceFiles.map((evidence) =>
          uploadReportEvidence({
            reportId,
            file: evidence.file,
            fileName: evidence.fileName,
            fileType: evidence.fileType,
            mimeType: evidence.mimeType,
            uploadedBy: user.id,
          }),
        ),
      );

      if (uploadResults.some((result) => !result)) {
        throw new Error("Report saved, but one or more evidence files could not be uploaded. Please contact support.");
      }

      setReportSubmitted(true);
      toast.success("Report submitted successfully. Admin will review it.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit report.";
      toast.error(message);
    }
  };

  const resetReport = () => {
    setReportSubmitted(false);
    setReportForm({ apartment: "", details: "", contact: user?.email || "" });
    setReportEvidenceFiles([]);
  };

  const handleSupportSubmit = async () => {
    if (!supportForm.topic || !supportForm.message.trim()) {
      toast.error("Please choose a topic and describe your concern.");
      return;
    }

    if (!user?.id) return void toast.error("Please sign in to contact support.");
    try {
      await createSupportTicket({
        userId: user.id,
        topic: supportForm.topic,
        message: supportForm.message,
        contact: supportForm.contact,
      });
      setSupportSubmitted(true);
      setSupportForm({ topic: "", message: "", contact: user.email || "" });
      toast.success("Support request sent!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send the support request.");
    }
  };

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="app-sidebar flex flex-col h-full overflow-y-auto">
      <div className="app-sidebar-brand px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-950/30 shrink-0">
            <Home className="h-6 w-6 text-white fill-white/20" />
          </div>
          <div>
            <span className="font-black text-white text-lg tracking-tight">Rent<span className="text-orange-500">Iloilo</span></span>
            <p className="text-white/50 text-xs font-medium -mt-0.5">{portalLabel}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-5">
        <div className="app-sidebar-profile flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.07] px-3 py-3 shadow-inner shadow-white/5">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center shrink-0 font-black text-white text-sm shadow overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              user?.name?.[0]?.toUpperCase() ?? "U"
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-sm truncate">{displayName || "Welcome"}</p>
            <p className="text-white/40 text-xs truncate">{user?.email ?? ""}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-white/40" />
        </div>
      </div>

      <nav className="px-3 pt-4 pb-2">
        <p className="text-orange-400 text-[10px] font-black uppercase tracking-widest px-3 mb-2">Main</p>
        <div className="space-y-0.5">
          {NAV_MAIN.map(({ icon: Icon, label, section }) => (
            <button
              key={section}
              aria-current={activeSection === section ? "page" : undefined}
              onClick={() => { setActiveSection(section); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-all ${
                activeSection === section
                  ? "bg-white text-orange-600 shadow-lg shadow-orange-950/20 ring-1 ring-orange-200"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {label === "My Favorites" && favoriteIds.length > 0 && (
                <span className="app-sidebar-badge ml-auto h-5 px-1.5 bg-pink-500 rounded-full text-white text-[10px] font-black flex items-center justify-center min-w-[20px]">
                  {favoriteIds.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <nav className="px-3 pt-3 pb-2 border-t border-white/10 mt-2">
        <p className="text-white/35 text-[10px] font-black uppercase tracking-widest px-3 mb-2">Browse</p>
        <div className="space-y-0.5">
          {NAV_BROWSE.map(({ icon: Icon, label, href, section, isLink }) =>
            isLink && href ? (
              label === "Browse All" ? (
                <Link
                  key={href}
                  to={href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-lg text-sm font-bold text-white/65 hover:text-white hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ) : (
                <Link
                  key={href}
                  to={href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              )
            ) : (
              <button
                key={section}
                aria-current={activeSection === section ? "page" : undefined}
                onClick={() => { setActiveSection(section!); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-all ${
                  activeSection === section
                    ? "bg-white text-orange-600 shadow-lg shadow-orange-950/20 ring-1 ring-orange-200"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            )
          )}
        </div>
      </nav>

      <nav className="px-3 pt-3 pb-2 border-t border-white/10 mt-2">
        <p className="text-white/35 text-[10px] font-black uppercase tracking-widest px-3 mb-2">Account</p>
        <div className="space-y-0.5">
          {NAV_ACCOUNT.map(({ icon: Icon, label, section, isLink }) =>
            !isLink ? (
              <button
                key={section}
                aria-current={activeSection === section ? "page" : undefined}
                onClick={() => { setActiveSection(section!); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-all ${
                  activeSection === section
                    ? "bg-white text-orange-600 shadow-lg shadow-orange-950/20 ring-1 ring-orange-200"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ) : null
          )}
        </div>
      </nav>

      <div className="flex-1" />

      <div className="px-4 py-4 border-t border-white/10 mt-2">
        <LogoutConfirmation onConfirm={handleLogout}>
          <button className="app-sidebar-logout w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
            <LogOut className="h-4 w-4 shrink-0" />
            Log Out
          </button>
        </LogoutConfirmation>
      </div>
    </div>
  );

  // ── Section: Overview ────────────────────────────────────────────────────
  const SummaryCard = ({
    title,
    value,
    detail,
    icon: Icon,
    tone,
    onClick,
  }: {
    title: string;
    value: number;
    detail: string;
    icon: LucideIcon;
    tone: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="group flex min-h-36 items-center gap-5 rounded-lg border border-slate-200 bg-white p-6 text-left shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(15,23,42,0.12)]"
    >
      <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg shadow-lg ${tone}`}>
        <Icon className="h-8 w-8" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-600">{title}</span>
        <strong className="mt-1 block text-4xl font-black leading-none text-orange-600">{value.toLocaleString()}</strong>
        <span className="mt-2 block text-sm font-medium text-slate-500">{detail}</span>
      </span>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500 transition group-hover:bg-orange-500 group-hover:text-white">
        <ChevronRight className="h-5 w-5" />
      </span>
    </button>
  );

  const FeatureCard = ({
    title,
    description,
    count,
    icon: Icon,
    section,
    accent,
  }: {
    title: string;
    description: string;
    count: number;
    icon: LucideIcon;
    section: string;
    accent: "orange" | "indigo" | "green";
  }) => {
    const accentClass = {
      orange: "bg-orange-50 text-orange-600 border-orange-100",
      indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
      green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    }[accent];

    return (
      <button
        onClick={() => setActiveSection(section)}
        className={`relative min-h-80 overflow-hidden rounded-lg border bg-white p-7 text-left shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(15,23,42,0.12)] ${accentClass}`}
      >
        <div className="relative z-10">
          <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg border bg-white/80 shadow-sm">
            <Icon className="h-7 w-7" />
          </span>
          <h3 className="text-2xl font-black text-slate-950">{title}</h3>
          <p className="mt-4 max-w-72 text-sm font-medium leading-6 text-slate-600">{description}</p>
          <div className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider">
            {count.toLocaleString()} {count === 1 ? "listing" : "listings"}
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-current/25 bg-white px-4 py-2 text-sm font-black">
            Explore Now
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
        <div className="absolute -bottom-10 -right-8 h-36 w-36 rounded-full bg-current/10" />
        <div className="absolute bottom-0 right-0 h-24 w-40 bg-gradient-to-tl from-current/20 to-transparent" />
      </button>
    );
  };

  const EmptyState = ({
    icon: Icon,
    message,
    actionLabel,
    action,
  }: {
    icon: LucideIcon;
    message: string;
    actionLabel?: string;
    action?: () => void;
  }) => (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
        <Icon className="h-7 w-7" />
      </span>
      <p className="max-w-md text-base font-bold text-slate-700">{message}</p>
      {actionLabel && action && (
        <Button onClick={action} className="mt-5 rounded-lg bg-orange-500 font-black text-white hover:bg-orange-600">
          {actionLabel}
        </Button>
      )}
    </div>
  );

  const InfoPill = ({
    icon: Icon,
    value,
    label,
    tone,
  }: {
    icon: LucideIcon;
    value: string;
    label: string;
    tone: string;
  }) => (
    <div className="flex items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-lg font-black leading-none text-slate-950">{value}</p>
        <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
      </div>
    </div>
  );

  const FavoriteApartmentCard = ({ apartment }: { apartment: (typeof favoriteApartments)[number] }) => {
    const status = apartment.status ?? "available";
    const statusClass: Record<string, string> = {
      available: "bg-emerald-600 text-white",
      occupied: "bg-rose-600 text-white",
      reserved: "bg-amber-500 text-white",
      maintenance: "bg-slate-600 text-white",
    };
    const statusLabel: Record<string, string> = {
      available: "Available",
      occupied: "Occupied",
      reserved: "Reserved",
      maintenance: "Maintenance",
    };
    const availableRooms = getAvailableRooms(apartment);
    const images = [apartment.image, ...(apartment.images ?? [])].filter(Boolean);
    const locationLabel = [apartment.city, apartment.state].filter(Boolean).join(", ") || apartment.address;

    return (
      <article className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] ${favoriteView === "list" ? "grid lg:grid-cols-[minmax(280px,0.9fr)_1fr]" : ""}`}>
        <div className="relative bg-slate-100">
          <div className={favoriteView === "list" ? "aspect-[4/3] lg:h-full lg:aspect-auto" : "aspect-[4/3]"}>
            {images[0] ? (
              <img src={getImageUrl(images[0])} alt={apartment.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100">
                <Building2 className="h-12 w-12 text-slate-300" />
              </div>
            )}
          </div>
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            <VerifiedBadge label="Verified Landlord" className="bg-white/95 shadow-lg backdrop-blur-sm" />
            {apartment.petFriendly && <Badge className="rounded-full bg-emerald-600 text-white">Pet Friendly</Badge>}
            <Badge className={`rounded-full ${statusClass[status] ?? statusClass.available}`}>{statusLabel[status] ?? "Available"}</Badge>
          </div>
          <button
            onClick={() => void removeFavorite(apartment.id)}
            disabled={removingFavoriteId === apartment.id}
            className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-rose-500 shadow-lg transition hover:scale-105 disabled:opacity-60"
            aria-label="Remove from favorites"
          >
            <Heart className="h-6 w-6 fill-current" />
          </button>
          {images.length > 1 && (
            <div className="absolute inset-x-4 bottom-4 grid grid-cols-4 gap-2">
              {images.slice(1, 5).map((image, index) => (
                <div key={`${image}-${index}`} className="aspect-[4/3] overflow-hidden rounded-md bg-white/80 shadow">
                  <img src={getImageUrl(image)} alt={`${apartment.title} ${index + 2}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-slate-950">{apartment.title}</h2>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                <MapPin className="h-4 w-4 text-rose-500" />
                <span>{locationLabel}</span>
              </div>
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="text-sm font-black text-orange-600">View room prices</p>
            </div>
          </div>

          <div className="my-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 sm:grid-cols-4">
            <InfoPill icon={Bookmark} value={availableRooms.toLocaleString()} label={availableRooms === 1 ? "Room" : "Rooms"} tone="bg-orange-50 text-orange-600" />
            <InfoPill icon={Bed} value={apartment.rooms?.length ? apartment.rooms.length.toLocaleString() : apartment.bedrooms.toLocaleString()} label={apartment.rooms?.length ? "Room count" : "Beds"} tone="bg-rose-50 text-rose-600" />
            <InfoPill icon={Bath} value={apartment.bathrooms.toLocaleString()} label={apartment.bathrooms === 1 ? "Bath" : "Baths"} tone="bg-purple-50 text-purple-600" />
            <InfoPill icon={Square} value={Number(apartment.sqft || 0).toLocaleString()} label="Sqft" tone="bg-sky-50 text-sky-600" />
          </div>

          {apartment.description && (
            <p className="line-clamp-2 text-sm font-medium leading-6 text-slate-600">{apartment.description}</p>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row">
            <Button asChild variant="outline" className="h-12 flex-1 rounded-lg border-slate-200 font-black text-slate-700 hover:bg-slate-50">
              <Link to={`/apartment/${apartment.id}`} state={{ returnTo: "/dashboard?section=favorites", backLabel: "Back to Favorites" }}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </Button>
            <Button
              variant="outline"
              disabled={removingFavoriteId === apartment.id}
              onClick={() => void removeFavorite(apartment.id)}
              className="h-12 flex-1 rounded-lg border-red-200 bg-red-50 font-black text-red-600 hover:bg-red-100"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {removingFavoriteId === apartment.id ? "Removing..." : "Remove"}
            </Button>
          </div>
        </div>
      </article>
    );
  };

  const renderOverview = () => (
    <div className="mx-auto max-w-7xl space-y-7">
      <section className="relative overflow-hidden rounded-lg border border-orange-100 bg-white px-6 py-8 shadow-[0_22px_60px_rgba(15,23,42,0.08)] md:px-9 md:py-10">
        <div className="relative z-10 max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-orange-600 shadow-sm">
            <LayoutDashboard className="h-4 w-4" />
            Your Dashboard
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
            Welcome back{displayName ? "," : ""}
            {displayName && <span className="block text-orange-600">{displayName}</span>}
          </h1>
          <p className="mt-5 text-lg font-medium text-slate-600">{dashboardSubtitle}</p>
        </div>
        <div className="pointer-events-none absolute right-6 top-6 hidden h-48 w-72 rounded-full bg-orange-100 md:block" />
        <div className="pointer-events-none absolute right-12 top-20 hidden h-28 w-56 rounded-lg border border-orange-100 bg-white/80 shadow-lg md:block">
          <div className="absolute bottom-5 left-7 h-12 w-40 rounded-lg bg-orange-100" />
          <div className="absolute bottom-16 left-12 h-12 w-12 rounded-lg bg-slate-200" />
          <div className="absolute bottom-16 right-12 h-12 w-12 rounded-lg bg-orange-200" />
          <div className="absolute -right-8 bottom-0 h-24 w-10 rounded-full bg-emerald-100" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SummaryCard
          title="Your Favorites"
          value={favoriteIds.length}
          detail="Apartments saved"
          icon={Heart}
          tone="bg-gradient-to-br from-rose-500 to-pink-600 text-white"
          onClick={() => setActiveSection("favorites")}
        />
        <SummaryCard
          title="Available Now"
          value={availableApartments.length}
          detail={`${availableRoomsCount.toLocaleString()} available ${availableRoomsCount === 1 ? "room" : "rooms"}`}
          icon={Clock}
          tone="bg-gradient-to-br from-orange-500 to-amber-500 text-white"
          onClick={() => availableApartments.length > 0 ? navigate("/browse") : setActiveSection("recent")}
        />
      </section>

      {availableApartments.length === 0 && (
        <EmptyState icon={Clock} message="No available apartments at the moment." />
      )}

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <FeatureCard title="Suggested for You" description="Recommendations based on available published apartments and your renter role." count={suggestedApartments.length} icon={Sparkles} section="suggested" accent="orange" />
        <FeatureCard title="Most Popular" description="Published apartments ranked from current listing signals and amenities." count={popularApartments.length} icon={TrendingUp} section="popular" accent="indigo" />
        <FeatureCard title="Recently Added" description="Freshly available published apartments from the current listing records." count={recentApartments.length} icon={Clock} section="recent" accent="green" />
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:flex-row sm:items-center">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600">
          <Search className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black text-slate-950">Looking for something specific?</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Use Browse All to find apartments from the live listing database.</p>
        </div>
        <Button onClick={() => navigate("/browse")} className="rounded-lg bg-orange-500 px-6 font-black text-white hover:bg-orange-600">
          Browse All Apartments
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </section>
    </div>
  );

  // ── Section: Favorites ───────────────────────────────────────────────────
  const renderFavorites = () => (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-orange-100 bg-white px-6 py-8 shadow-[0_22px_60px_rgba(15,23,42,0.08)] md:px-9">
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-500 shadow-sm">
            <Heart className="h-8 w-8 fill-current" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">Your Favorites</h1>
            <p className="mt-2 text-lg font-medium text-slate-600">Apartments you've saved for later</p>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-0 right-8 hidden h-28 w-72 rounded-t-lg bg-orange-50 md:block" />
        <div className="pointer-events-none absolute bottom-8 right-20 hidden h-16 w-36 rounded-lg bg-orange-100 md:block" />
      </section>

      <section className="grid gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:grid-cols-2">
        <div className="flex items-center gap-5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
            <Heart className="h-8 w-8 fill-current" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-600">Total Favorites</p>
            <p className="mt-1 text-4xl font-black text-rose-500">{favoriteApartments.length.toLocaleString()}</p>
            <p className="mt-1 text-sm font-medium text-slate-500">{favoriteApartments.length === 1 ? "apartment saved" : "apartments saved"}</p>
          </div>
        </div>
        <div className="flex items-center gap-5 border-t border-slate-100 pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
            <Bookmark className="h-8 w-8 fill-current" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-600">Save for later</p>
            <p className="mt-2 max-w-sm text-base font-medium leading-7 text-slate-600">Compare and revisit real listings you saved from Browse and Apartment Details.</p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_14px_35px_rgba(15,23,42,0.07)] lg:flex-row lg:items-center lg:justify-between">
        <select value={favoriteFilter} onChange={(event) => setFavoriteFilter(event.target.value as typeof favoriteFilter)} className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100">
          <option value="all">All Favorites ({favoriteApartments.length})</option>
          <option value="available">Available Only</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select value={favoriteSort} onChange={(event) => setFavoriteSort(event.target.value as typeof favoriteSort)} className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100">
            <option value="newest">Newest Added</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name</option>
          </select>
          <div className="grid h-12 grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
            <button onClick={() => setFavoriteView("grid")} className={`flex h-10 w-12 items-center justify-center rounded-md transition ${favoriteView === "grid" ? "bg-orange-50 text-orange-600" : "text-slate-500 hover:bg-slate-50"}`} aria-label="Grid view">
              <Grid2X2 className="h-5 w-5" />
            </button>
            <button onClick={() => setFavoriteView("list")} className={`flex h-10 w-12 items-center justify-center rounded-md transition ${favoriteView === "list" ? "bg-orange-50 text-orange-600" : "text-slate-500 hover:bg-slate-50"}`} aria-label="List view">
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {favoriteApartments.length === 0 ? (
        <EmptyState
          icon={Heart}
          message="No favorites yet. Browse apartments to save listings."
          actionLabel="Browse Apartments"
          action={() => navigate("/browse")}
        />
      ) : visibleFavoriteApartments.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
          <Search className="mb-4 h-10 w-10 text-slate-300" />
          <h2 className="text-xl font-black text-slate-950">No favorites match this filter</h2>
          <Button variant="outline" onClick={() => setFavoriteFilter("all")} className="mt-5 rounded-lg font-black">Show All Favorites</Button>
        </div>
      ) : (
        <div className={favoriteView === "grid" ? "grid grid-cols-1 gap-6 xl:grid-cols-2" : "space-y-6"}>
          {visibleFavoriteApartments.map((apartment) => (
            <FavoriteApartmentCard key={apartment.id} apartment={apartment} />
          ))}
        </div>
      )}

      <section className="flex flex-col gap-4 rounded-lg border border-orange-100 bg-orange-50 p-6 shadow-[0_16px_35px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-orange-600 shadow-sm">
          <Building2 className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black text-slate-950">Explore more apartments</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">Find more places you'll love and add to your favorites.</p>
        </div>
        <Button onClick={() => navigate("/browse")} className="rounded-lg bg-orange-500 px-6 font-black text-white hover:bg-orange-600">
          Browse Apartments
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </section>
    </div>
  );

  // ── Section: Suggested ───────────────────────────────────────────────────
  const renderSuggested = () => (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-3xl font-black text-slate-950">Suggested for You</h2>
          </div>
          <p className="mt-2 text-base font-medium text-slate-600">Recommendations from the current published apartment records.</p>
        </div>
        <Button onClick={() => navigate("/browse")} className="rounded-lg bg-orange-500 font-black text-white hover:bg-orange-600">
          Browse All
        </Button>
      </div>
      {suggestedApartments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {suggestedApartments.map((apartment) => (
            <div key={apartment.id} className="relative">
              <Badge className="absolute top-6 left-6 z-10 bg-orange-500 hover:bg-orange-600 shadow-lg text-white font-bold">Suggested</Badge>
              <ApartmentCard apartment={apartment} detailState={{ returnTo: "/dashboard?section=suggested", backLabel: "Back to Suggested" }} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          message="No suggestions yet. Browse apartments to improve recommendations."
          actionLabel="Browse Apartments"
          action={() => navigate("/browse")}
        />
      )}
    </div>
  );

  // ── Section: Popular ─────────────────────────────────────────────────────
  const renderPopular = () => (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h2 className="text-3xl font-black text-slate-950">Most Popular</h2>
          </div>
          <p className="mt-2 text-base font-medium text-slate-600">Published apartments ranked from current listing signals.</p>
        </div>
        <Button onClick={() => navigate("/browse")} className="rounded-lg bg-orange-500 font-black text-white hover:bg-orange-600">
          Browse All
        </Button>
      </div>
      {popularApartments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {popularApartments.map((apartment) => (
            <div key={apartment.id} className="relative">
              <Badge className="absolute top-6 left-6 z-10 bg-indigo-600 hover:bg-indigo-700 shadow-lg text-white font-bold">Popular</Badge>
              <ApartmentCard apartment={apartment} detailState={{ returnTo: "/dashboard?section=popular", backLabel: "Back to Popular" }} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={TrendingUp} message="No popular apartments yet." />
      )}
    </div>
  );

  // ── Section: Recent ──────────────────────────────────────────────────────
  const renderRecent = () => (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
              <Clock className="h-5 w-5" />
            </div>
            <h2 className="text-3xl font-black text-slate-950">Recently Added</h2>
          </div>
          <p className="mt-2 text-base font-medium text-slate-600">Newest published apartments from the current listing records.</p>
        </div>
        <Button onClick={() => navigate("/browse")} className="rounded-lg bg-orange-500 font-black text-white hover:bg-orange-600">
          Browse All
        </Button>
      </div>
      {recentApartments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {recentApartments.map((apartment) => (
            <div key={apartment.id} className="relative">
              <Badge className="absolute top-6 left-6 z-10 bg-emerald-600 hover:bg-emerald-700 shadow-lg text-white font-bold">New</Badge>
              <ApartmentCard apartment={apartment} detailState={{ returnTo: "/dashboard?section=recent", backLabel: "Back to Recently Added" }} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Clock} message="No available apartments at the moment." />
      )}
    </div>
  );

  // ── Section: Settings ────────────────────────────────────────────────────
  const renderReportPremium = () => (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 shadow-sm">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tight text-slate-950">Report a Problem</h2>
            <p className="mt-2 text-base font-medium text-slate-500">Let us know about any issues you encountered with an apartment listing.</p>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] lg:w-96">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black text-slate-950">Your report matters</p>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">All reports are reviewed by our team to help keep the community safe.</p>
            </div>
          </div>
        </div>
      </header>

      {reportSubmitted ? (
        <Card className="rounded-lg border border-emerald-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.1)]">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-950">Report Submitted</h3>
            <p className="max-w-md text-sm font-medium leading-6 text-slate-500">
              Thank you for helping us keep listings accurate. Our team will review your report and notify you if more details are needed.
            </p>
            <Button onClick={resetReport} className="mt-2 rounded-lg bg-orange-500 px-6 font-black text-white hover:bg-orange-600">
              Submit Another Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.1)]">
          <CardContent className="p-0">
            <ReportStep icon={Building2} step="1" title="Select Apartment" description="Choose the apartment listing related to your report." tone="bg-orange-50 text-orange-600">
              <select value={reportForm.apartment} onChange={(e) => setReportForm((f) => ({ ...f, apartment: e.target.value }))} className="h-14 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100">
                <option value="">Select an apartment...</option>
                {publishedApartments.map((apt) => <option key={apt.id} value={apt.id}>{apt.title}</option>)}
              </select>
            </ReportStep>

            <ReportStep icon={MessageCircle} step="2" title="Describe the Problem" description="Please provide as much detail as possible." tone="bg-orange-50 text-orange-600">
              <div className="relative">
                <textarea rows={5} maxLength={500} value={reportForm.details} onChange={(e) => setReportForm((f) => ({ ...f, details: e.target.value }))} placeholder="Describe what you experienced in as much detail as possible..." className="min-h-40 w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100" />
                <span className="absolute bottom-3 right-4 text-xs font-bold text-slate-400">{reportForm.details.length}/500</span>
              </div>
            </ReportStep>

            <ReportStep icon={ImageIcon} step="3" title="Upload Image / Evidence" description="Attach images or documents that can help us understand the issue." note="Optional" tone="bg-violet-50 text-violet-600">
              <EvidenceUploader evidenceFiles={reportEvidenceFiles} onEvidenceChange={setReportEvidenceFiles} maxFiles={5} maxFileSize={10} required={false} />
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-violet-100 bg-violet-50 p-4">
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
                <div>
                  <p className="text-sm font-black text-violet-900">Evidence helps us review your report faster.</p>
                  <p className="mt-1 text-xs font-medium text-violet-700">Clear screenshots, photos, or documents are very helpful.</p>
                </div>
              </div>
            </ReportStep>

            <ReportStep icon={Mail} step="4" title="Contact Information" description="We may contact you for more details if needed." tone="bg-emerald-50 text-emerald-600">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input type="text" value={reportForm.contact} onChange={(e) => setReportForm((f) => ({ ...f, contact: e.target.value }))} placeholder={user?.email || "Enter your email address"} className="h-14 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm font-bold text-slate-800 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100" />
              </div>
            </ReportStep>

            <div className="grid gap-4 border-t border-slate-100 bg-slate-50/70 p-5 lg:grid-cols-[220px_1fr_260px] lg:items-center">
              <Button variant="outline" onClick={resetReport} className="h-12 rounded-lg border-slate-200 font-black text-slate-600 hover:bg-white">
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear Form
              </Button>
              <div className="flex items-center justify-center gap-3 text-center text-sm font-medium text-slate-500">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm"><LockKeyhole className="h-4 w-4" /></span>
                <span><strong className="font-black text-slate-700">Your information is secure.</strong> We only use this information for this report.</span>
              </div>
              <Button onClick={handleReportSubmit} disabled={!reportForm.apartment || !reportForm.details.trim()} className="h-12 rounded-lg bg-orange-500 font-black text-white shadow-lg shadow-orange-200 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">
                <Send className="mr-2 h-4 w-4" />
                Submit Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderSettings = () => <AccountSettings embedded />;

  // ── Section: Help ────────────────────────────────────────────────────────
  const renderHelp = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="h-4 w-4 text-amber-600" />
          <h2 className="text-xs font-black text-amber-600 uppercase tracking-widest">Help & Support</h2>
        </div>
        <h1 className="text-3xl font-black text-slate-900">How can we help?</h1>
        <p className="text-slate-600 font-medium mt-1">Guides, safety reminders, and support for using RentIloilo.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Search, title: "Browse apartments", desc: "Search, filter, and compare available places.", action: () => navigate("/browse") },
          { icon: Heart, title: "Review favorites", desc: "Return to apartments you saved earlier.", action: () => setActiveSection("favorites") },
          { icon: AlertTriangle, title: "Report listing issue", desc: "Flag wrong details, scams, or unavailable units.", action: () => setActiveSection("report") },
        ].map(({ icon: Icon, title, desc, action }) => (
          <button
            key={title}
            onClick={action}
            className="text-left p-5 rounded-2xl bg-white/90 border border-amber-100 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-3">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <p className="font-black text-slate-900">{title}</p>
            <p className="text-sm text-slate-500 font-medium mt-1">{desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-amber-100 shadow-lg bg-white/90 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 font-black">
              <BookOpen className="h-5 w-5 text-amber-600" />
              Renter Guide
            </CardTitle>
            <CardDescription>Put these inside Help so users know what to do next.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Search and filters", "Use area, budget, bedrooms, parking, pet-friendly, and furnished filters to narrow listings."],
              ["Favorites", "Tap the heart on an apartment to save it for later comparison."],
              ["Listing details", "Check rent, available date, amenities, address, photos, and landlord verification before contacting."],
              ["Saved preferences", "Update Settings > Search to make Browse open with your preferred filters."],
            ].map(([title, desc]) => (
              <div key={title} className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                <p className="font-black text-sm text-slate-900">{title}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-100 shadow-lg bg-white/90 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 font-black">
              <Shield className="h-5 w-5 text-amber-600" />
              Safety & Support
            </CardTitle>
            <CardDescription>Keep renter support focused on trust and listing accuracy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Before visiting", "Confirm the exact address, rent inclusions, deposit terms, and viewing schedule."],
              ["Avoid scams", "Do not send deposits before verifying the unit and landlord details."],
              ["Report problems", "Use Report a Problem for fake listings, wrong photos, wrong prices, or unavailable units."],
              ["Account help", "Use the form below for login, profile, favorites, or general app issues."],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-black text-sm text-slate-900">{title}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-100 shadow-lg bg-white/90 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 font-black">
            <MessageCircle className="h-5 w-5 text-amber-600" />
            Contact Support
          </CardTitle>
          <CardDescription>Submitted requests are saved locally for this prototype.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {supportSubmitted ? (
            <div className="p-5 rounded-2xl bg-green-50 border border-green-200 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-black text-slate-900">Support request received</p>
              <p className="text-sm text-slate-500 font-medium mt-1">Our team will review your concern and contact you using the details provided.</p>
              <Button
                onClick={() => setSupportSubmitted(false)}
                className="mt-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold"
              >
                Send Another Request
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Topic</Label>
                  <select
                    value={supportForm.topic}
                    onChange={(e) => setSupportForm((f) => ({ ...f, topic: e.target.value }))}
                    className="w-full rounded-xl border border-amber-200 bg-amber-50/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">Choose a topic...</option>
                    <option value="Account or login">Account or login</option>
                    <option value="Search and filters">Search and filters</option>
                    <option value="Favorites">Favorites</option>
                    <option value="Contacting landlord">Contacting landlord</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Contact</Label>
                  <Input
                    value={supportForm.contact}
                    onChange={(e) => setSupportForm((f) => ({ ...f, contact: e.target.value }))}
                    placeholder="Email or phone number"
                    className="rounded-xl border-amber-200 bg-amber-50/30"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Message</Label>
                  <span className="text-xs text-slate-400 font-medium">{supportForm.message.length}/500</span>
                </div>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={supportForm.message}
                  onChange={(e) => setSupportForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us what happened or what you need help with..."
                  className="w-full rounded-xl border border-amber-200 bg-amber-50/30 px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
              <Button
                onClick={handleSupportSubmit}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-md"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Support Request
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const sectionMap: Record<string, () => ReactElement> = {
    overview:  renderOverview,
    favorites: renderFavorites,
    suggested: renderSuggested,
    popular:   renderPopular,
    recent:    renderRecent,
    report:    renderReportPremium,
    settings:  renderSettings,
    help:      renderHelp,
  };

  const renderDashboardLoading = () => (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-lg border border-orange-100 bg-white px-6 py-8 shadow-[0_22px_60px_rgba(15,23,42,0.08)] md:px-9">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-lg border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-orange-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading Dashboard
            </div>
            <div className="h-12 w-72 max-w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="h-5 w-96 max-w-full animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="grid w-full gap-3 md:w-80">
            <div className="h-20 animate-pulse rounded-lg bg-orange-50" />
            <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[0, 1].map((item) => (
          <div key={item} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 animate-pulse rounded-lg bg-orange-50" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                <div className="h-8 w-20 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-44 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="min-h-64 rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
            <div className="h-14 w-14 animate-pulse rounded-lg bg-slate-100" />
            <div className="mt-6 h-6 w-40 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-slate-100" />
            <div className="mt-8 h-10 w-32 animate-pulse rounded-lg bg-orange-50" />
          </div>
        ))}
      </section>
    </div>
  );

  const renderDashboardError = () => (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4">
      <section className="w-full rounded-lg border border-rose-100 bg-white p-8 text-center shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
          <AlertTriangle className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-black text-slate-950">Dashboard data could not load</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-slate-500">
          {apartmentsError || "We could not load the latest apartment records. Please try again."}
        </p>
        <Button onClick={() => void refreshApartments()} className="mt-6 rounded-lg bg-orange-500 px-6 font-black text-white hover:bg-orange-600">
          <RotateCcw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </section>
    </div>
  );

  const activeContent = apartmentsError && allApartments.length === 0
    ? renderDashboardError()
    : apartmentsLoading && allApartments.length === 0
      ? renderDashboardLoading()
      : (sectionMap[activeSection] ?? renderOverview)();
  return (
    <div className="app-shell fixed inset-0 z-50 overflow-hidden bg-[#f8fafc]">
      <div className="app-shell-frame relative z-10 flex h-full">
        <aside className="app-shell-sidebar hidden lg:flex flex-col w-64 shrink-0 h-full bg-[#07142f] shadow-2xl shadow-slate-900/40">
          {SidebarContent()}
        </aside>

        {sidebarOpen && (
          <div className="app-sidebar-overlay fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside
          className={`app-sidebar-drawer fixed top-0 left-0 h-full z-50 w-64 bg-[#07142f] shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className="app-sidebar-close absolute top-4 right-4 h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all z-10"
          >
            <X className="h-4 w-4" />
          </button>
          {SidebarContent()}
        </aside>

        <button
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
          className="app-sidebar-trigger fixed top-4 left-4 z-30 lg:hidden h-10 w-10 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-300/40 hover:bg-orange-600 transition-all"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="app-shell-main flex-1 min-w-0 h-full overflow-y-auto">
          <main className="app-shell-content app-shell-content-mobile-nav px-4 py-6 pt-16 md:px-8 lg:px-10 lg:pt-8">
            {activeContent}
          </main>
        </div>
      </div>
    </div>
  );
}

function ReportStep({
  icon: Icon,
  step,
  title,
  description,
  note,
  tone,
  children,
}: {
  icon: LucideIcon;
  step: string;
  title: string;
  description: string;
  note?: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-5 border-b border-slate-100 p-5 last:border-b-0 lg:grid-cols-[360px_1fr] lg:p-8">
      <div className="flex gap-5">
        <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-9 w-9" />
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-black text-white">{step}</span>
            <h3 className="font-black text-slate-950">{title}</h3>
            {note && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">{note}</span>}
          </div>
          <p className="text-sm font-medium leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
