import { useState, useEffect, useMemo, useRef, type ReactElement } from "react";
import { motion } from "motion/react";
import {
  deleteApartment as deleteApartmentInDb,
  fetchApartmentsForLandlord,
  updateApartment,
  updateApartmentPublication,
  updateApartmentStatus,
  type Apartment,
  type ApartmentStatus,
} from "@/app/data/apartments";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/contexts/AuthContext";
import { supabase } from "@/lib/supabaseclient";
import {
  fetchApartmentViews,
  fetchFavorites,
  fetchUsers,
  fetchUserById,
  fetchLandlordProfile,
  updateUserProfile,
  uploadUserAvatar,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markNotificationUnread,
  deleteNotification,
  deleteAllNotifications,
  fetchViolations,
  createAppeal,
  createNotification,
  type DashboardApartmentViewRow,
  type DashboardFavoriteRow,
  type DashboardUserRow,
  type DashboardNotificationRow,
  type DashboardViolationRow,
} from "@/app/services/dashboardSupabaseService";
import { ApartmentCard } from "@/app/components/common/ApartmentCard";
import { EditApartmentDialog } from "@/app/components/common/EditApartmentDialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import { Separator } from "@/app/components/ui/separator";
import { Switch } from "@/app/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { toast } from "sonner";
import { apartmentToFormValues } from "@/app/utils/apartmentMappers";
import {
  Building2,
  Eye,
  Plus,
  Home,
  Calendar,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  Menu,
  X,
  LayoutDashboard,
  Settings,
  LogOut,
  Bell,
  Search,
  ListPlus,
  HelpCircle,
  ChevronRight,
  User,
  Shield,
  CreditCard,
  Trash2,
  XCircle,
  Heart,
  Clock,
  MapPin,
  BookOpen,
  Camera,
  RotateCcw,
  Send,
  AlertTriangle,
  Eye as EyeOpen,
  EyeOff,
  CheckCircle2,
  MessageSquare,
  Mail,
  MailOpen,
  LayoutGrid,
  List,
  BedDouble,
  Bath,
  Ruler,
  Edit2,
  Flag,
  MoreVertical,
  CheckCheck,
  SlidersHorizontal,
  Megaphone,
} from "lucide-react";

// ── Nav groups ───────────────────────────────────────────────────────────────
const NAV_MAIN = [
  { icon: LayoutDashboard, label: "Dashboard",      section: "overview",       isLink: false },
  { icon: Building2,       label: "My Properties",  section: "properties",     isLink: false },
  { icon: TrendingUp,      label: "Activity",       section: "activity",       isLink: false },
  { icon: Bell,            label: "Notifications",  section: "notifications",  isLink: false },
];

const NAV_MANAGE = [
  { icon: ListPlus, label: "Add Property", href: "/add-apartment", isLink: true },
  { icon: Search,   label: "Browse All",   href: "/browse",        isLink: true },
];

const NAV_ACCOUNT = [
  { icon: Settings,   label: "Settings", section: "settings", isLink: false },
  { icon: HelpCircle, label: "Help & Support", section: "help", isLink: false },
];

const LANDLORD_DASHBOARD_SECTIONS = new Set(["overview", "properties", "activity", "notifications", "settings", "help"]);

const STATUS_OPTIONS: { value: ApartmentStatus; label: string; className: string }[] = [
  { value: "available", label: "Available", className: "bg-green-100 text-green-700 border-green-200" },
  { value: "occupied", label: "Occupied", className: "bg-red-100 text-red-700 border-red-200" },
  { value: "reserved", label: "Reserved", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "maintenance", label: "Under Maintenance", className: "bg-slate-100 text-slate-600 border-slate-200" },
];

const getStatusOption = (status?: string) =>
  STATUS_OPTIONS.find((option) => option.value === status) ?? STATUS_OPTIONS[0];

// ── Modal component ──────────────────────────────────────────────────────────
function PeopleModal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor,
  names,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
  names: string[];
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-amber-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-amber-50">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${iconColor}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-black text-slate-900 text-sm">{title}</p>
              <p className="text-slate-400 text-xs font-medium">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-amber-50/60">
          {names.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm font-medium">No one yet</div>
          ) : (
            names.map((name, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-amber-50/40 transition-colors">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shrink-0 font-black text-amber-700 text-xs">
                  {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <span className="text-slate-800 font-semibold text-sm">{name}</span>
              </div>
            ))
          )}
        </div>
        <div className="px-5 py-3 border-t border-amber-50 bg-amber-50/30">
          <p className="text-xs text-slate-400 font-medium text-center">
            {names.length} {names.length === 1 ? "person" : "people"} total
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Shared Settings UI primitives ────────────────────────────────────────────
const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
      checked ? "bg-amber-500" : "bg-slate-200"
    } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
  </button>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-slate-400 font-medium">{hint}</p>}
  </div>
);

const SettingsInput = (props: any) => (
  <input
    {...props}
    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-sm font-semibold text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all"
  />
);

const SettingsInputWithValidation = ({ 
  value, 
  validator, 
  errorMessage, 
  ...props 
}: any) => {
  const isValid = !value || validator(value);
  const hasError = value && !isValid;
  
  return (
    <div>
      <input
        {...props}
        value={value}
        className={`w-full px-4 py-2.5 rounded-xl border-2 bg-white text-sm font-semibold text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 transition-all ${
          hasError 
            ? "border-red-300 focus:ring-red-400 focus:border-red-400" 
            : "border-slate-100 focus:ring-amber-400 focus:border-amber-400"
        }`}
      />
      {hasError && (
        <p className="text-xs text-red-600 font-bold mt-1">{errorMessage}</p>
      )}
    </div>
  );
};

const SettingsSelect = ({ children, ...props }: any) => (
  <select
    {...props}
    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all"
  >
    {children}
  </select>
);

const SettingsTextarea = (props: any) => (
  <textarea
    {...props}
    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-sm font-semibold text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all resize-none"
  />
);

const SectionTitle = ({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-base shadow-md shrink-0">
      {icon}
    </div>
    <div>
      <h3 className="text-base font-black text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
    </div>
  </div>
);

const AlertRow = ({ label, hint, pushVal, onPush }: { label: string; hint?: string; pushVal: boolean; onPush: (v: boolean) => void }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-50 last:border-0">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-slate-800">{label}</p>
      {hint && <p className="text-xs text-slate-400 font-medium mt-0.5">{hint}</p>}
    </div>
    <Toggle checked={pushVal} onChange={onPush} />
  </div>
);

export function LandlordDashboard() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedSection = searchParams.get("section") ?? "overview";
  const [activeSection, setActiveSection] = useState(() => LANDLORD_DASHBOARD_SECTIONS.has(requestedSection) ? requestedSection : "overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [apartmentsRefresh, setApartmentsRefresh] = useState(0);
  const [supportForm, setSupportForm] = useState({
    topic: "",
    message: "",
    contact: user?.email || "",
  });
  const [propertyFilter, setPropertyFilter] = useState<"all" | ApartmentStatus>("all");
  const [propertySort, setPropertySort] = useState<"newest" | "oldest" | "name" | "price-high" | "price-low">("newest");
  const [propertyViewMode, setPropertyViewMode] = useState<"grid" | "list">("grid");
  const [propertyPage, setPropertyPage] = useState(1);
  const [propertiesPerPage, setPropertiesPerPage] = useState(6);
  const [activityRange, setActivityRange] = useState<"7d" | "30d" | "90d" | "all">("all");
  const [activityViewMode, setActivityViewMode] = useState<"list" | "grid">("list");
  const [favoriteRows, setFavoriteRows] = useState<DashboardFavoriteRow[]>([]);
  const [viewRows, setViewRows] = useState<DashboardApartmentViewRow[]>([]);
  const [favoriteUsers, setFavoriteUsers] = useState<DashboardUserRow[]>([]);
  const [notifications, setNotifications] = useState<DashboardNotificationRow[]>([]);
  const [violations, setViolations] = useState<DashboardViolationRow[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notifSearch, setNotifSearch] = useState("");
  const [notifFilter, setNotifFilter] = useState<"all" | "read" | "unread">("all");
  const [notifCategory, setNotifCategory] = useState<"all" | "unread" | "reports" | "verification" | "apartments" | "system">("all");
  const [notifSort, setNotifSort] = useState<"newest" | "oldest">("newest");
  const [openNotifMenuId, setOpenNotifMenuId] = useState<string | null>(null);
  const [isMarkingAllNotifs, setIsMarkingAllNotifs] = useState(false);
  const [isClearingReadNotifs, setIsClearingReadNotifs] = useState(false);

  // Loading states for action prevention
  const [deletingNotifId, setDeletingNotifId] = useState<string | null>(null);
  const [isDeletingAllNotifs, setIsDeletingAllNotifs] = useState(false);
  const [deletingApartmentId, setDeletingApartmentId] = useState<string | null>(null);
  const [updatingApartmentStatusId, setUpdatingApartmentStatusId] = useState<string | null>(null);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isLoadingApartments, setIsLoadingApartments] = useState(true);
  const [isLoadingActivityData, setIsLoadingActivityData] = useState(true);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);

  useEffect(() => {
    if (LANDLORD_DASHBOARD_SECTIONS.has(requestedSection)) {
      setActiveSection(requestedSection);
    }
  }, [requestedSection]);

  const deleteNotif = async (notificationId: string) => {
    if (deletingNotifId === notificationId) {
      toast.error("Deletion in progress...");
      return;
    }
    if (!user?.id) return;
    setDeletingNotifId(notificationId);
    try {
      const deleted = await deleteNotification(notificationId, user.id);
      if (!deleted) {
        toast.error("Unable to delete notification.");
        return;
      }
      setNotifications((previous) => previous.filter((notification) => notification.id !== notificationId));
      setUnreadNotificationCount((previous) => Math.max(0, previous - (notifications.some((notification) => notification.id === notificationId && !(notification.read ?? notification.is_read)) ? 1 : 0)));
      setOpenNotifMenuId(null);
      toast.success("Notification deleted.");
    } finally {
      setDeletingNotifId(null);
    }
  };

  const deleteAllNotifs = () => {
    if (isDeletingAllNotifs) {
      toast.error("Deletion in progress...");
      return;
    }
    if (window.confirm("Are you sure you want to delete all notifications?")) {
      setIsDeletingAllNotifs(true);
      setNotifications([]);
      if (user?.id) {
        void deleteAllNotifications(user.id).finally(() => {
          setIsDeletingAllNotifs(false);
        });
      } else {
        setIsDeletingAllNotifs(false);
      }
    }
  };

  const toggleNotifReadStatus = async (notificationId: string, isCurrentlyRead: boolean) => {
    if (!user?.id) return;
    const updated = isCurrentlyRead
      ? await markNotificationUnread(notificationId, user.id)
      : await markNotificationRead(notificationId, user.id);
    if (!updated) {
      toast.error("Unable to update notification status.");
      return;
    }
    setNotifications((previous) => previous.map((notification) => notification.id === notificationId ? { ...notification, ...updated, read: !isCurrentlyRead, is_read: !isCurrentlyRead } : notification));
    setUnreadNotificationCount((previous) => Math.max(0, previous + (isCurrentlyRead ? 1 : -1)));
    setOpenNotifMenuId(null);
  };

  const markAllLandlordNotificationsRead = async () => {
    if (!user?.id || isMarkingAllNotifs) return;
    const unread = notifications.filter((notification) => !(notification.read ?? notification.is_read));
    if (unread.length === 0) return;
    setIsMarkingAllNotifs(true);
    try {
      const updatedCount = await markAllNotificationsRead(user.id);
      if (updatedCount === 0) {
        toast.error("Unable to mark notifications as read.");
        return;
      }
      setNotifications((previous) => previous.map((notification) => ({ ...notification, read: true, is_read: true, read_at: notification.read_at ?? new Date().toISOString() })));
      setUnreadNotificationCount(0);
      toast.success("All notifications marked as read.");
    } finally {
      setIsMarkingAllNotifs(false);
    }
  };

  const clearReadLandlordNotifications = async () => {
    if (!user?.id || isClearingReadNotifs) return;
    const readNotifications = notifications.filter((notification) => (notification.read ?? notification.is_read) && notification.id);
    if (readNotifications.length === 0) {
      toast.info("There are no read notifications to clear.");
      return;
    }
    setIsClearingReadNotifs(true);
    try {
      const results = await Promise.all(readNotifications.map((notification) => deleteNotification(notification.id!, user.id)));
      const deletedIds = new Set(readNotifications.filter((_, index) => results[index]).map((notification) => notification.id));
      setNotifications((previous) => previous.filter((notification) => !deletedIds.has(notification.id)));
      toast.success(`${deletedIds.size} read ${deletedIds.size === 1 ? "notification" : "notifications"} cleared.`);
    } finally {
      setIsClearingReadNotifs(false);
    }
  };

  const filteredNotifs = useMemo(() => {
    return notifications.filter((n) => {
      const matchesSearch = !notifSearch ||
        n.title?.toLowerCase().includes(notifSearch.toLowerCase()) ||
        n.message?.toLowerCase().includes(notifSearch.toLowerCase()) ||
        n.type?.toLowerCase().includes(notifSearch.toLowerCase());
      const matchesFilter = notifFilter === "all" || (notifFilter === "read" ? n.read : !n.read);
      return matchesSearch && matchesFilter;
    });
  }, [notifications, notifSearch, notifFilter]);

  const [appealModal, setAppealModal] = useState<{
    open: boolean;
    violationId: string | null;
    violationType: string;
  }>({ open: false, violationId: null, violationType: "" });
  const [appealMessage, setAppealMessage] = useState("");
  const [appealStatus, setAppealStatus] = useState<"under_review" | "approved" | "rejected">("under_review");

  const [modal, setModal] = useState<{
    open: boolean;
    type: "views" | "favorites";
    names: string[];
    aptTitle: string;
  }>({ open: false, type: "views", names: [], aptTitle: "" });

  const openViewers = (aptId: string, aptTitle: string, count: number) => {
    const names = viewRows
      .filter((view) => (view.apartment_id ?? view.apartmentId) === aptId)
      .map((view) => {
        const viewer = favoriteUsers.find((entry) => entry.id === (view.viewer_id ?? view.viewerId));
        return viewer?.name
          ? `${viewer.name} (${viewer.role ?? "viewer"})`
          : (view.viewer_id ?? view.viewerId) ? `User ${(view.viewer_id ?? view.viewerId)?.slice(0, 8)}` : "Anonymous viewer";
      });
    setModal({ open: true, type: "views", names: names.slice(0, count || names.length), aptTitle });
  };
  const openFavoriters = (aptId: string, aptTitle: string, count: number) => {
    const names = favoriteRows
      .filter((favorite) => (favorite.apartment_id ?? favorite.apartmentId) === aptId)
      .map((favorite) => {
        const favoriteUser = favoriteUsers.find((entry) => entry.id === (favorite.user_id ?? favorite.userId));
        return favoriteUser?.name
          ? `${favoriteUser.name} (${favoriteUser.role ?? "renter"})`
          : (favorite.user_id ?? favorite.userId) ? `User ${(favorite.user_id ?? favorite.userId)?.slice(0, 8)}` : "Account unavailable";
      });
    setModal({ open: true, type: "favorites", names: names.slice(0, count || names.length), aptTitle });
  };
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const handleSupportSubmit = async () => {
    if (isSubmittingSupport) return;
    if (!supportForm.topic || !supportForm.message.trim() || !supportForm.contact.trim()) {
      toast.error("Please choose a topic and describe your concern.");
      return;
    }
    if (!validateEmail(supportForm.contact.trim())) {
      toast.error("Please enter a valid contact email address.");
      return;
    }
    if (!user?.id) return void toast.error("Please sign in again before sending a support request.");
    setIsSubmittingSupport(true);
    try {
      const ticket = {
        id: crypto.randomUUID(),
        userId: user.id,
        name: user.name || "",
        email: user.email || "",
        role: "landlord",
        topic: supportForm.topic,
        message: supportForm.message.trim(),
        contact: supportForm.contact.trim(),
        status: "open",
        createdAt: new Date().toISOString(),
      };
      const tickets = JSON.parse(localStorage.getItem("supportTickets") || "[]");
      localStorage.setItem("supportTickets", JSON.stringify([ticket, ...tickets]));
      const admins = (await fetchUsers()).filter((account) => account.role === "admin" && account.id);
      await Promise.all(admins.map((admin) => createNotification({
        user_id: admin.id!,
        type: "support_request",
        title: "New landlord support request",
        message: `${ticket.name || "A landlord"} requested help with ${ticket.topic}.`,
        payload: { ticket_id: ticket.id, landlord_id: ticket.userId, topic: ticket.topic, contact: ticket.contact },
      })));
      setSupportSubmitted(true);
      setSupportForm({ topic: "", message: "", contact: profile.email || user.email || "" });
      toast.success("Support request sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send the support request.");
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  const [myApartments, setMyApartments] = useState<any[]>([]);

  useEffect(() => {
    let active = true;

    const loadLandlordApartments = async () => {
      if (!user?.id) {
        setMyApartments([]);
        setIsLoadingApartments(false);
        return;
      }

      setIsLoadingApartments(true);
      try {
        const apartments = await fetchApartmentsForLandlord(user.id);
        if (active) {
          setMyApartments(apartments);
        }
      } catch (error) {
        console.error("Failed to load landlord apartments:", error);
        if (active) {
          setMyApartments([]);
        }
      } finally {
        if (active) setIsLoadingApartments(false);
      }
    };

    void loadLandlordApartments();

    return () => {
      active = false;
    };
  }, [user?.id, apartmentsRefresh]);

  useEffect(() => {
    let active = true;

    const loadActivityData = async () => {
      setIsLoadingActivityData(true);
      try {
        const [favorites, views, users] = await Promise.all([fetchFavorites(), fetchApartmentViews(), fetchUsers()]);
        if (active) {
          setFavoriteRows(favorites);
          setViewRows(views);
          setFavoriteUsers(users);
        }
      } catch (error) {
        console.error("Failed to load landlord activity data:", error);
        if (active) {
          setFavoriteRows([]);
          setViewRows([]);
          setFavoriteUsers([]);
        }
      } finally {
        if (active) setIsLoadingActivityData(false);
      }
    };

    void loadActivityData();

    const channel = supabase
      .channel("landlord-apartment-views")
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_views" }, () => {
        void fetchApartmentViews()
          .then((views) => {
            if (active) setViewRows(views);
          })
          .catch((error) => console.error("Failed to refresh apartment views:", error));
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [apartmentsRefresh]);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      if (!user?.id) {
        setNotifications([]);
        setUnreadNotificationCount(0);
        setIsLoadingNotifications(false);
        return;
      }

      setIsLoadingNotifications(true);
      try {
        const notifs = await fetchNotifications(user.id);
        if (active) {
          setNotifications(notifs);
          const unreadCount = notifs.filter((n) => !n.read).length;
          setUnreadNotificationCount(unreadCount);
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
        if (active) {
          setNotifications([]);
          setUnreadNotificationCount(0);
        }
      } finally {
        if (active) setIsLoadingNotifications(false);
      }
    };

    void loadNotifications();

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;

    const loadViolations = async () => {
      try {
        const allViolations = await fetchViolations();
        if (active) {
          // Filter violations for current landlord
          const myViolations = allViolations.filter((v) => v.landlord_id === user?.id || v.landlordId === user?.id);
          setViolations(myViolations);
        }
      } catch (error) {
        console.error("Failed to load violations:", error);
        if (active) {
          setViolations([]);
        }
      }
    };

    void loadViolations();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleNotificationClick = async (notification: DashboardNotificationRow) => {
    // Mark as read
    if (!(notification.read ?? notification.is_read) && notification.id) {
      const updated = await markNotificationRead(notification.id, user?.id);
      if (updated) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, ...updated, read: true, is_read: true } : n))
        );
        setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
      } else {
        toast.error("Unable to mark notification as read.");
      }
    }

    // Handle navigation based on notification type
    const payload = notification.payload as Record<string, any>;
    switch (notification.type) {
      case "property_reported":
        navigate(`/dashboard?section=notifications&report=${payload?.report_id || ""}`);
        break;
      case "violation_issued":
        navigate(`/dashboard?section=notifications&violation=${payload?.violation_id || ""}`);
        break;
      case "appeal_status_updated":
        navigate(`/dashboard?section=notifications&appeal=${payload?.appeal_id || ""}`);
        break;
      default:
        // Generic notification, just show in notifications tab
        setActiveSection("notifications");
    }
  };

  const refreshApartments = () => {
    setApartmentsRefresh((prev) => prev + 1);
  };

  const getRoomStatus = (room: any): ApartmentStatus => room.status ?? (room.isOccupied ? "occupied" : "available");
  const getApartmentStatus = (apartment: any): ApartmentStatus => {
    const rooms = apartment.rooms ?? [];
    if (rooms.length === 0) {
      return apartment.status ?? "available";
    }
    if (rooms.some((room: any) => getRoomStatus(room) === "available")) {
      return "available";
    }
    if (rooms.every((room: any) => getRoomStatus(room) === "occupied")) {
      return "occupied";
    }
    if (rooms.some((room: any) => getRoomStatus(room) === "maintenance")) {
      return "maintenance";
    }
    return apartment.status ?? "available";
  };
  const allRooms = myApartments.flatMap((apt: any) => apt.rooms ?? []);
  const unitStatuses: ApartmentStatus[] = allRooms.length > 0
    ? allRooms.map(getRoomStatus)
    : myApartments.map(getApartmentStatus);
  const availableCount = unitStatuses.filter((status) => status === "available").length;
  const occupiedCount  = unitStatuses.filter((status) => status === "occupied").length;
  const reservedCount  = unitStatuses.filter((status) => status === "reserved").length;
  const totalUnits = unitStatuses.length;
  const propertyIds = new Set(myApartments.map((apartment) => apartment.id));
  const landlordFavoriteRows = favoriteRows.filter((favorite) => propertyIds.has(favorite.apartment_id ?? favorite.apartmentId ?? ""));
  const landlordViewRows = viewRows.filter((view) => propertyIds.has(view.apartment_id ?? view.apartmentId ?? ""));
  const landlordAccount = favoriteUsers.find((entry) => entry.id === user?.id);
  const landlordVerified = landlordAccount?.is_verified ?? landlordAccount?.isVerified ?? user?.isVerified ?? false;
  const landlordPermit = landlordAccount?.permit_number ?? landlordAccount?.permitNumber ?? user?.permitNumber ?? "";
  const getViewWeight = (view: DashboardApartmentViewRow) => Number(view.view_count) || 1;
  const totalViews     = landlordViewRows.reduce((total, view) => total + getViewWeight(view), 0);
  const totalInquiries = landlordFavoriteRows.length;
  const occupancyRate  = myApartments.length > 0
    ? Math.round((occupiedCount / (totalUnits || myApartments.length)) * 100)
    : 0;

  const aptViews = (aptId: string) => {
    return viewRows
      .filter((view) => (view.apartment_id ?? view.apartmentId) === aptId)
      .reduce((total, view) => total + getViewWeight(view), 0);
  };
  const aptFavs = (aptId: string) => {
    return favoriteRows.filter((favorite) => (favorite.apartment_id ?? favorite.apartmentId) === aptId).length;
  };
  const filteredApartments = useMemo(() => {
    const filtered = propertyFilter === "all"
      ? [...myApartments]
      : myApartments.filter((apartment) => getApartmentStatus(apartment) === propertyFilter);

    return filtered.sort((left, right) => {
      if (propertySort === "name") return String(left.title ?? "").localeCompare(String(right.title ?? ""));
      if (propertySort === "price-high") return Number(right.price ?? 0) - Number(left.price ?? 0);
      if (propertySort === "price-low") return Number(left.price ?? 0) - Number(right.price ?? 0);
      const leftTime = new Date(left.createdAt ?? 0).getTime();
      const rightTime = new Date(right.createdAt ?? 0).getTime();
      return propertySort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
  }, [myApartments, propertyFilter, propertySort]);
  const propertyPageCount = Math.max(1, Math.ceil(filteredApartments.length / propertiesPerPage));
  const safePropertyPage = Math.min(propertyPage, propertyPageCount);
  const paginatedApartments = filteredApartments.slice((safePropertyPage - 1) * propertiesPerPage, safePropertyPage * propertiesPerPage);

  useEffect(() => {
    setPropertyPage(1);
  }, [propertyFilter, propertySort, propertiesPerPage]);

  const handleTogglePublication = async (apartmentId: string, nextValue: boolean) => {
    try {
      await updateApartmentPublication(apartmentId, nextValue, user?.id);
      refreshApartments();
      toast.success(nextValue ? "Listing published" : "Listing unpublished");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update listing.";
      toast.error(message);
    }
  };

  const handleDeleteApartment = async (apartmentId: string) => {
    if (deletingApartmentId === apartmentId) {
      toast.error("Deletion in progress...");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
      return;
    }

    setDeletingApartmentId(apartmentId);
    try {
      await deleteApartmentInDb(apartmentId);
      refreshApartments();
      toast.success("Listing deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete listing.";
      toast.error(message);
    } finally {
      setDeletingApartmentId(null);
    }
  };

  const handleStatusChange = async (apartmentId: string, status: ApartmentStatus) => {
    if (updatingApartmentStatusId === apartmentId) {
      toast.error("Update in progress...");
      return;
    }
    setUpdatingApartmentStatusId(apartmentId);
    try {
      await updateApartmentStatus(apartmentId, status, user?.id);
      setMyApartments((previous) =>
        previous.map((apartment) => apartment.id === apartmentId ? { ...apartment, status } : apartment),
      );
      toast.success("Occupancy status updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update occupancy status.";
      toast.error(message);
    } finally {
      setUpdatingApartmentStatusId(null);
    }
  };

  const handleSaveEditedApartment = async (updatedApartment: Apartment) => {
    if (!editingApartment) return;

    try {
      const saved = await updateApartment(
        editingApartment.id,
        apartmentToFormValues({
          ...updatedApartment,
          id: editingApartment.id,
          landlordId: editingApartment.landlordId,
        }),
        user?.id,
      );
      setMyApartments((previous) =>
        previous.map((apartment) => apartment.id === editingApartment.id ? saved : apartment),
      );
      refreshApartments();
      setEditingApartment(null);
      toast.success("Property updated successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update property.";
      toast.error(message);
      throw error;
    }
  };

  // ── Settings state ───────────────────────────────────────────────────────
  type LandlordProfile = {
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    bio: string;
    language: string;
    timezone: string;
    avatar: string;
  };

  const [profile, setProfile] = useState<LandlordProfile>(() => {
    return {
      firstName: user?.name?.split(" ")[0] || "",
      lastName: user?.name?.split(" ").slice(1).join(" ") || "",
      email: user?.email || "",
      mobile: user?.mobileNumber || "",
      bio: "",
      language: "en",
      timezone: "Asia/Manila",
      avatar: "",
    };
  });

  type LandlordAlerts = {
    reviewPush: boolean;
    reportPush: boolean;
    violationPush: boolean;
    listingPush: boolean;
    systemPush: boolean;
    permitPush: boolean;
    digest: string;
    quietStart: string;
    quietEnd: string;
    quietEnabled: boolean;
  };

  const [alerts, setAlerts] = useState<LandlordAlerts>(() => {
    if (user) {
      const storageKey = `landlordAlerts_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved) as LandlordAlerts;
        } catch {
          // Fall through to default
        }
      }
    }
    return {
      reviewPush: true,
      reportPush: true,
      violationPush: true,
      listingPush: true,
      systemPush: false,
      permitPush: false,
      digest: "daily",
      quietStart: "22:00",
      quietEnd: "07:00",
      quietEnabled: true,
    };
  });

  type LandlordBusiness = {
    businessName: string;
    permitNumber: string;
    permitExpiry: string;
    taxId: string;
    businessType: string;
    yearsActive: string;
    totalUnits: string;
    serviceAreas: string;
    depositPolicy: string;
    advancePolicy: string;
    minLeaseTerm: string;
    petPolicy: string;
    smokingPolicy: string;
    maintenanceResponse: string;
    listingVisibility: string;
  };

  const [business, setBusiness] = useState<LandlordBusiness>(() => {
    return {
      businessName: "",
      permitNumber: user?.permitNumber || "",
      permitExpiry: "",
      taxId: "",
      businessType: "sole_proprietor",
      yearsActive: "",
      totalUnits: "",
      serviceAreas: "",
      depositPolicy: "1",
      advancePolicy: "1",
      minLeaseTerm: "1",
      petPolicy: "no",
      smokingPolicy: "no",
      maintenanceResponse: "24",
      listingVisibility: "public",
    };
  });

  type SecurityDevice = {
    id: number;
    name: string;
    location: string;
    lastActive: string;
    current: boolean;
  };

  type LandlordSecurity = {
    twoFactor: boolean;
    twoFactorMethod: string;
    loginAlerts: boolean;
    sessionTimeout: string;
    trustedDevices: boolean;
    activeDevices: SecurityDevice[];
    passwordLastChanged: string;
    recoveryEmail: string;
    recoveryMobile: string;
    dataSharing: boolean;
    analyticsConsent: boolean;
    profileIndexing: boolean;
  };

  const [security, setSecurity] = useState<LandlordSecurity>(() => {
    if (user) {
      const storageKey = `landlordSecurity_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return { ...(JSON.parse(saved) as LandlordSecurity), activeDevices: [], passwordLastChanged: "" };
        } catch {
          // Fall through to default
        }
      }
    }
    return {
      twoFactor: false,
      twoFactorMethod: "sms",
      loginAlerts: true,
      sessionTimeout: "30",
      trustedDevices: true,
      activeDevices: [],
      passwordLastChanged: "",
      recoveryEmail: "",
      recoveryMobile: "",
      dataSharing: false,
      analyticsConsent: true,
      profileIndexing: true,
    };
  });

  const [savedProfile, setSavedProfile] = useState(profile);
  const [savedBusiness, setSavedBusiness] = useState(business);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);

  useEffect(() => {
    let active = true;
    const loadSettingsData = async () => {
      if (!user?.id) return;
      const [userRow, landlordRow] = await Promise.all([fetchUserById(user.id), fetchLandlordProfile(user.id)]);
      if (!active) return;
      const fullName = (userRow?.name || user.name || "").trim().split(/\s+/).filter(Boolean);
      const nextProfile: LandlordProfile = {
        firstName: fullName[0] || "",
        lastName: fullName.slice(1).join(" "),
        email: userRow?.email || user.email || "",
        mobile: userRow?.mobile || userRow?.mobileNumber || user.mobileNumber || "",
        bio: userRow?.bio || "",
        language: userRow?.language || "en",
        timezone: userRow?.timezone || "Asia/Manila",
        avatar: userRow?.avatar_url || user.avatar || "",
      };
      const nextBusiness: LandlordBusiness = {
        businessName: String(landlordRow?.business_name ?? ""),
        permitNumber: String(landlordRow?.business_permit_number ?? landlordRow?.permit_number ?? user.permitNumber ?? ""),
        permitExpiry: String(landlordRow?.permit_expiry ?? ""),
        taxId: String(landlordRow?.tin_number ?? ""),
        businessType: String(landlordRow?.business_type ?? "sole_proprietor"),
        yearsActive: landlordRow?.years_active == null ? "" : String(landlordRow.years_active),
        totalUnits: landlordRow?.total_units == null ? "" : String(landlordRow.total_units),
        serviceAreas: String(landlordRow?.service_areas ?? ""),
        depositPolicy: String(landlordRow?.deposit_months ?? "1"),
        advancePolicy: String(landlordRow?.advance_months ?? "1"),
        minLeaseTerm: String(landlordRow?.min_lease_months ?? "1"),
        petPolicy: String(landlordRow?.pet_policy ?? "no"),
        smokingPolicy: String(landlordRow?.smoking_policy ?? "no"),
        maintenanceResponse: String(landlordRow?.maintenance_response_hours ?? "24"),
        listingVisibility: String(landlordRow?.listing_visibility ?? "public"),
      };
      setProfile(nextProfile);
      setSavedProfile(nextProfile);
      setSupportForm((current) => ({ ...current, contact: current.contact.trim() ? current.contact : nextProfile.email }));
      setBusiness(nextBusiness);
      setSavedBusiness(nextBusiness);
    };
    void loadSettingsData();
    return () => { active = false; };
  }, [user?.id]);

  const updateProfile = (updater: (prev: typeof profile) => typeof profile) => {
    setProfile((p) => {
      const updated = updater(p);
      // Save to localStorage
      if (user) {
        const storageKey = `landlordProfile_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const setA = (key: string, val: unknown) => {
    setAlerts((p) => {
      const updated = { ...p, [key]: val };
      // Save to localStorage
      if (user) {
        const storageKey = `landlordAlerts_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const setB = (key: string, val: unknown) => {
    setBusiness((p) => {
      const updated = { ...p, [key]: val };
      // Save to localStorage
      if (user) {
        const storageKey = `landlordBusiness_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const updateSecurity = (updater: (prev: typeof security) => typeof security) => {
    setSecurity((p) => {
      const updated = updater(p);
      // Save to localStorage
      if (user) {
        const storageKey = `landlordSecurity_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleUpdateProfile = async () => {
    // Prevent duplicate submissions
    if (isUpdatingProfile) {
      toast.error("Please wait for your update to complete...");
      return;
    }
    
    // Validation
    if (!profile.firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    if (!profile.lastName.trim()) {
      toast.error("Last name is required");
      return;
    }
    if (!profile.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!validateEmail(profile.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!profile.mobile.trim()) {
      toast.error("Mobile number is required");
      return;
    }
    if (!validatePhoneNumber(profile.mobile)) {
      toast.error("Please enter a valid Philippine phone number (09XXXXXXXXX)");
      return;
    }
    if (profile.bio.length > 300) {
      toast.error("Bio cannot exceed 300 characters");
      return;
    }

    setIsUpdatingProfile(true);
    if (user) {
      try {
        const updatedUser = {
          ...user,
          name: `${profile.firstName.trim()} ${profile.lastName.trim()}`,
          email: profile.email.trim(),
          mobileNumber: profile.mobile.trim(),
          permitNumber: business.permitNumber,
        };

        await updateUser(user.id, {
          name: updatedUser.name,
          email: updatedUser.email,
          mobileNumber: updatedUser.mobileNumber,
          permitNumber: updatedUser.permitNumber,
        });

        const synced = await updateUserProfile({
          id: user.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: "landlord",
          mobile: updatedUser.mobileNumber,
          avatar_url: profile.avatar,
          bio: profile.bio,
          language: profile.language,
          timezone: profile.timezone,
          permit_number: business.permitNumber,
          business_permit_number: business.permitNumber,
        });

        if (!synced) {
          throw new Error("Unable to sync profile information.");
        }

        const storageKey = `landlordProfile_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(profile));
        setSavedProfile(profile);

        addAuditLog("PROFILE_UPDATED", `Updated profile information`);
        toast.success("Profile updated successfully!");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save profile information.";
        toast.error(message);
      } finally {
        setIsUpdatingProfile(false);
      }
    }
  };

  const handleSaveAlerts = () => {
    if (user) {
      const storageKey = `landlordAlerts_${user.id}`;
      localStorage.setItem(storageKey, JSON.stringify(alerts));
      addAuditLog("ALERT_PREFERENCES_UPDATED", "Updated notification and alert preferences");
    }
    toast.success("Alert preferences saved!");
  };

  const handleSaveBusiness = async () => {
    // Validation
    if (!business.permitNumber.trim()) {
      toast.error("Business permit number is required");
      return;
    }
    if (!business.permitExpiry) {
      toast.error("Permit expiry date is required");
      return;
    }
    if (new Date(business.permitExpiry) < new Date()) {
      toast.error("Permit has expired. Please renew it.");
      return;
    }
    if (!business.taxId.trim() || !/^\d{3}-\d{3}-\d{3}-\d{3}$/.test(business.taxId)) {
      toast.error("Please enter a valid BIR TIN (XXX-XXX-XXX-000)");
      return;
    }
    if (!business.totalUnits || parseInt(business.totalUnits) <= 0) {
      toast.error("Total units must be at least 1");
      return;
    }
    if (!business.serviceAreas.trim()) {
      toast.error("Service areas are required");
      return;
    }

    if (user) {
      try {
        const storageKey = `landlordBusiness_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(business));
        await updateUser(user.id, {
          name: user.name,
          email: user.email,
          permitNumber: business.permitNumber,
        });

        const synced = await updateUserProfile({
          id: user.id,
          email: user.email,
          name: user.name,
          role: "landlord",
          permit_number: business.permitNumber,
          business_permit_number: business.permitNumber,
          business_name: business.businessName,
          tin_number: business.taxId,
          permit_expiry: business.permitExpiry,
          business_type: business.businessType,
          years_active: business.yearsActive,
          total_units: business.totalUnits,
          service_areas: business.serviceAreas,
          deposit_months: business.depositPolicy,
          advance_months: business.advancePolicy,
          min_lease_months: business.minLeaseTerm,
          pet_policy: business.petPolicy,
          smoking_policy: business.smokingPolicy,
          maintenance_response_hours: business.maintenanceResponse,
          listing_visibility: business.listingVisibility,
        });

        if (!synced) {
          throw new Error("Unable to sync business information.");
        }

        addAuditLog("BUSINESS_INFO_UPDATED", `Updated business permit: ${business.permitNumber}`);
        setSavedBusiness(business);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save business information.";
        toast.error(message);
        return;
      }
    }
    toast.success("Business information saved!");
  };

  const handleSaveSecurity = () => {
    // Validation
    if (security.recoveryEmail && !validateEmail(security.recoveryEmail)) {
      toast.error("Please enter a valid recovery email address");
      return;
    }
    if (security.recoveryMobile && !validatePhoneNumber(security.recoveryMobile)) {
      toast.error("Please enter a valid recovery phone number");
      return;
    }
    if (security.recoveryEmail === security.recoveryEmail) {
      // They're different (profile email is not security recovery email)
      if (security.recoveryEmail && security.recoveryEmail.trim()) {
        // Valid recovery email set
      }
    }

    if (user) {
      const storageKey = `landlordSecurity_${user.id}`;
      localStorage.setItem(storageKey, JSON.stringify(security));
      addAuditLog("SECURITY_SETTINGS_UPDATED", "Updated security preferences");
    }
    toast.success("Security settings saved successfully!");
  };

  const handleDeleteAccount = () => {
    if (!user) return;

    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      const usersStr = localStorage.getItem("users");
      const users: any[] = usersStr ? JSON.parse(usersStr) : [];
      const filtered = users.filter((u) => u.id !== user.id);
      localStorage.setItem("users", JSON.stringify(filtered));
      localStorage.removeItem("currentUser");
      localStorage.removeItem(`landlordProfile_${user.id}`);
      localStorage.removeItem(`landlordAlerts_${user.id}`);
      localStorage.removeItem(`landlordBusiness_${user.id}`);
      localStorage.removeItem(`landlordSecurity_${user.id}`);
      logout();
      toast.success("Account deleted successfully");
      navigate("/");
    }
  };

  const handleLogout = () => {
    // Clear all session data
    if (user?.id) {
      localStorage.removeItem(`landlordProfile_${user.id}`);
      localStorage.removeItem(`landlordAlerts_${user.id}`);
      localStorage.removeItem(`landlordBusiness_${user.id}`);
      localStorage.removeItem(`landlordSecurity_${user.id}`);
      localStorage.removeItem(`landlordSessions_${user.id}`);
      localStorage.removeItem(`landlordAuditLog_${user.id}`);
    }
    logout?.();
    navigate("/");
  };

  // ── Session Management ───────────────────────────────────────────────────
  const addAuditLog = (action: string, details: string) => {
    if (user?.id) {
      const logKey = `landlordAuditLog_${user.id}`;
      const existingLogs = JSON.parse(localStorage.getItem(logKey) || "[]");
      const newLog = {
        id: Date.now(),
        action,
        details,
        timestamp: new Date().toISOString(),
        ipAddress: "Local Session", // In production, get from server
      };
      existingLogs.push(newLog);
      // Keep only last 100 logs
      if (existingLogs.length > 100) {
        existingLogs.shift();
      }
      localStorage.setItem(logKey, JSON.stringify(existingLogs));
    }
  };

  // ── Password Validation ──────────────────────────────────────────────────
  const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (password.length < 8) errors.push("At least 8 characters");
    if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("At least one lowercase letter");
    if (!/[0-9]/.test(password)) errors.push("At least one number");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("At least one special character");
    return { valid: errors.length === 0, errors };
  };

  // ── 2FA Setup ────────────────────────────────────────────────────────────
  const generate2FASecret = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const verify2FACode = (code: string, secret: string): boolean => {
    // In production, use proper TOTP verification
    return code.length === 6 && /^\d+$/.test(code);
  };

  // ── Email Validation ─────────────────────────────────────────────────────
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // ── Phone Validation ─────────────────────────────────────────────────────
  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^09\d{9}$|^\+639\d{9}$/;
    return phoneRegex.test(phone);
  };

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500 shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-black text-white text-lg tracking-tight">RentIloilo</span>
        </div>
        <p className="text-white/30 text-xs font-medium mt-1 ml-10">Landlord Portal</p>
      </div>

      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-sm font-black text-white shadow-sm">
            {user?.name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-sm truncate">{user?.name || "Name unavailable"}</p>
            <p className="text-white/40 text-xs truncate">{user?.email ?? ""}</p>
          </div>
          {landlordVerified && <ShieldCheck className="h-4 w-4 text-green-400 shrink-0" />}
        </div>
      </div>

      <nav className="px-3 pt-4 pb-2">
        <p className="text-white/25 text-[10px] font-black uppercase tracking-widest px-3 mb-2">Main</p>
        <div className="space-y-0.5">
          {NAV_MAIN.map(({ icon: Icon, label, section }) => (
            <button
              key={section}
              onClick={() => { setActiveSection(section); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${
                activeSection === section
                  ? "bg-orange-500 text-white shadow-md shadow-orange-950/30"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {label === "Notifications" && unreadNotificationCount > 0 && (
                <span className="ml-auto flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{unreadNotificationCount}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <nav className="px-3 pt-3 pb-2 border-t border-white/10 mt-2">
        <p className="text-white/25 text-[10px] font-black uppercase tracking-widest px-3 mb-2">Manage</p>
        <div className="space-y-0.5">
          {NAV_MANAGE.map(({ icon: Icon, label, href }) => (
            <Link
              key={href}
              to={href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-white/60 transition-all hover:bg-white/10 hover:text-white"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {label === "Add Property" && (
                <span className="ml-auto h-5 w-5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center shadow">
                  <Plus className="h-3 w-3 text-white" />
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>

      <nav className="px-3 pt-3 pb-2 border-t border-white/10 mt-2">
        <p className="text-white/25 text-[10px] font-black uppercase tracking-widest px-3 mb-2">Account</p>
        <div className="space-y-0.5">
          {NAV_ACCOUNT.map(({ icon: Icon, label, section }) => (
            <button
              key={section}
              onClick={() => { setActiveSection(section); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${
                activeSection === section
                  ? "bg-orange-500 text-white shadow-md shadow-orange-950/30"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1" />

      <div className="px-4 py-4 border-t border-white/10 mt-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log Out
        </button>
      </div>
    </div>
  );

  // ── Section: Overview ────────────────────────────────────────────────────
  const renderLegacyOverview = () => (
    <div className="space-y-5">
      {user?.isVerified ? (
        <Alert className="border-green-200 bg-white/80 backdrop-blur-xl shadow-sm rounded-2xl">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900 font-bold">Account Verified</AlertTitle>
          <AlertDescription className="text-green-800 font-medium mt-0.5">
            Permit: {user.permitNumber}. All listings show the verified badge.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-amber-200 bg-white/80 backdrop-blur-xl shadow-sm rounded-2xl">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900 font-bold">Verification Pending</AlertTitle>
          <AlertDescription className="text-slate-600 font-medium mt-0.5">
            Permit <span className="font-bold text-amber-700">{user?.permitNumber}</span> is under review (1–2 business days).
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 shadow-xl shadow-amber-300/30 overflow-hidden">
          <div className="absolute -top-5 -right-5 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -bottom-6 -left-4 w-20 h-20 bg-white/10 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-white/60" />
            </div>
            <p className="text-5xl font-black text-white leading-none mb-1">{myApartments.length}</p>
            <p className="text-orange-100 font-bold text-xs uppercase tracking-widest">Properties</p>
          </div>
        </div>

        <button
          onClick={() => setActiveSection("activity")}
          className="relative bg-white/90 backdrop-blur-xl border border-amber-100/80 rounded-2xl p-5 shadow-lg overflow-hidden text-left hover:shadow-xl hover:border-amber-300 transition-all group cursor-pointer"
        >
          <div className="absolute -top-5 -right-5 w-24 h-24 bg-amber-50 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center mb-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-5xl font-black text-slate-900 leading-none mb-1">{totalViews.toLocaleString()}</p>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Total Views</p>
            <p className="text-amber-500 text-xs font-bold mt-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              See who viewed <ChevronRight className="h-3 w-3" />
            </p>
          </div>
        </button>

        <button
          onClick={() => setActiveSection("activity")}
          className="relative bg-white/90 backdrop-blur-xl border border-amber-100/80 rounded-2xl p-5 shadow-lg overflow-hidden text-left hover:shadow-xl hover:border-amber-300 transition-all group cursor-pointer"
        >
          <div className="absolute -top-5 -right-5 w-24 h-24 bg-orange-50 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center mb-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                <Heart className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-5xl font-black text-slate-900 leading-none mb-1">{totalInquiries}</p>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Favorites</p>
            <p className="text-amber-500 text-xs font-bold mt-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              See who favorited <ChevronRight className="h-3 w-3" />
            </p>
          </div>
        </button>
      </div>

      <div className="bg-white/90 backdrop-blur-xl border border-amber-100/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-amber-600" />
          <h2 className="text-xs font-black text-amber-600 uppercase tracking-widest">
            {allRooms.length > 0 ? "Room Overview" : "Occupancy Overview"}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200 shrink-0">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-4xl font-black text-slate-900 leading-none">{totalUnits}</p>
              <p className="text-amber-700 font-black text-xs uppercase tracking-widest mt-0.5">Total Units</p>
              <p className="text-slate-400 text-xs font-medium">Apartments or rooms</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md shadow-green-200 shrink-0">
              <Home className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-4xl font-black text-slate-900 leading-none">{availableCount}</p>
              <p className="text-green-700 font-black text-xs uppercase tracking-widest mt-0.5">Available</p>
              <p className="text-slate-400 text-xs font-medium">Ready for tenants</p>
            </div>
          </div>
        </div>
        {myApartments.length > 0 && (
          <div>
            <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
              <span>Occupancy rate</span>
              <span className="text-amber-600">{occupancyRate}%</span>
            </div>
            <div className="h-2.5 bg-amber-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all" style={{ width: `${occupancyRate}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Section: Properties ──────────────────────────────────────────────────
  const renderLegacyProperties = () => (
    <div className="space-y-5">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Building2 className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-black text-amber-600 uppercase tracking-widest">My Properties</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">Your Listings</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPropertyFilter("all")}
            className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all ${
              propertyFilter === "all"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white text-slate-600 border-amber-100 hover:bg-amber-50"
            }`}
          >
            All Units
          </button>
          {STATUS_OPTIONS.slice(0, 1).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPropertyFilter(option.value)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all ${
                propertyFilter === option.value
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-slate-600 border-amber-100 hover:bg-amber-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {myApartments.length > 0 ? (
        filteredApartments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredApartments.map((apartment) => (
            <div key={apartment.id} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              {!apartment.isPublished && (
                <Badge className="absolute top-4 right-4 z-10 bg-gray-500 text-white border-0 shadow-md font-bold">
                  Unpublished
                </Badge>
              )}
              <Badge className="absolute top-4 left-4 z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md font-bold">
                Your Property
              </Badge>
              <ApartmentCard apartment={apartment} />
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusOption(getApartmentStatus(apartment)).className} border font-black`}>
                    {getStatusOption(getApartmentStatus(apartment)).label}
                  </Badge>
                  <span className="flex-1 text-xs font-bold text-slate-500">
                    {(apartment.rooms?.filter((room: any) => getRoomStatus(room) === "available").length ?? 0)} available / {(apartment.rooms?.length ?? 0)} total rooms
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link to={`/apartment/${apartment.id}`} state={{ returnTo: "/dashboard?section=properties" }} className="flex-1">
                    <Button variant="outline" className="w-full rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 font-bold text-sm">
                      View Property
                    </Button>
                  </Link>
                  <Link to={`/landlord/properties/${apartment.id}/rooms`} className="flex-1">
                    <Button className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm">
                      Manage Rooms
                    </Button>
                  </Link>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openViewers(apartment.id, apartment.title, aptViews(apartment.id))}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50 font-bold text-xs transition-all"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {aptViews(apartment.id)} views
                  </button>
                  <button
                    onClick={() => openFavoriters(apartment.id, apartment.title, aptFavs(apartment.id))}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50 font-bold text-xs transition-all"
                  >
                    <Heart className="h-3.5 w-3.5" />
                    {aptFavs(apartment.id)} saved
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingApartment(apartment as Apartment)}
                    className="flex-1 rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 font-bold text-sm"
                  >
                    Edit
                  </Button>
                </div>
                <div className="flex gap-2">
                  {apartment.isPublished ? (
                    <Button
                      onClick={() => void handleTogglePublication(apartment.id, false)}
                      variant="outline"
                      className="flex-1 rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50 font-bold text-xs"
                    >
                      <EyeOff className="h-3.5 w-3.5 mr-1" /> Unpublish
                    </Button>
                  ) : (
                    <Button
                      onClick={() => void handleTogglePublication(apartment.id, true)}
                      variant="outline"
                      className="flex-1 rounded-xl border-green-200 text-green-700 hover:bg-green-50 font-bold text-xs"
                    >
                      <EyeOpen className="h-3.5 w-3.5 mr-1" /> Publish
                    </Button>
                  )}
                  <Button
                    onClick={() => void handleDeleteApartment(apartment.id)}
                    variant="outline"
                    className="flex-1 rounded-xl border-red-200 text-red-700 hover:bg-red-50 font-bold text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-xl border border-amber-100 rounded-2xl p-10 shadow-lg text-center">
            <h3 className="text-xl font-black text-slate-900 mb-1">No Matching Units</h3>
            <p className="text-slate-500 font-medium text-sm">Try another occupancy filter.</p>
          </div>
        )
      ) : (
        <div className="bg-white/90 backdrop-blur-xl border border-amber-100 rounded-2xl p-10 shadow-lg text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-1">No Properties Yet</h3>
          <p className="text-slate-500 font-medium mb-5 max-w-xs mx-auto text-sm">Add your first listing and start attracting tenants today.</p>
          <Link to="/add-apartment">
            <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold gap-2 px-5 shadow-lg shadow-amber-200">
              <Plus className="h-4 w-4" /> Add Your First Property
            </Button>
          </Link>
        </div>
      )}
    </div>
  );

  // ── Section: Activity ────────────────────────────────────────────────────
  const renderLegacyActivity = () => (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-amber-600" />
        <h2 className="text-xs font-black text-amber-600 uppercase tracking-widest">Activity per Property</h2>
      </div>

      <div className="bg-white/90 backdrop-blur-xl border border-amber-100 rounded-2xl shadow-lg overflow-hidden">
        {myApartments.length > 0 ? (
          myApartments.slice(0, 5).map((apartment, index) => {
            const views = aptViews(apartment.id);
            const favs  = aptFavs(apartment.id);
            return (
              <div
                key={apartment.id}
                className={`px-5 py-4 ${index < Math.min(myApartments.length, 5) - 1 ? "border-b border-amber-50" : ""}`}
              >
                <p className="font-black text-slate-900 text-sm mb-3">{apartment.title}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => openViewers(apartment.id, apartment.title, views)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold text-amber-700 transition-all"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {views} viewers
                  </button>
                  <button
                    onClick={() => openFavoriters(apartment.id, apartment.title, favs)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold text-rose-600 transition-all"
                  >
                    <Heart className="h-3.5 w-3.5" />
                    {favs} saved
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center">
            <p className="text-slate-400 font-medium text-sm">No activity yet. Add a property to get started!</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Section: Notifications ───────────────────────────────────────────────
  const renderLegacyNotifications = () => {
    const myViolations = violations.filter((v) => v.landlord_id === user?.id || v.landlordId === user?.id);

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-600" />
            <h2 className="text-xs font-black text-amber-600 uppercase tracking-widest">Notifications</h2>
          </div>
          {unreadNotificationCount > 0 && (
            <Badge className="bg-red-500 text-white font-bold">{unreadNotificationCount}</Badge>
          )}
        </div>

        {unreadNotificationCount > 0 && (
          <Button
            onClick={async () => {
              if (user?.id) {
                await markAllNotificationsRead(user.id);
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                setUnreadNotificationCount(0);
              }
            }}
            variant="outline"
            className="w-full border-amber-200 text-amber-600 hover:bg-amber-50 font-bold text-xs"
          >
            Mark All as Read
          </Button>
        )}

        {myViolations.length > 0 && (
          <div className="bg-white/90 backdrop-blur-xl border-2 border-red-200 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-rose-500 px-5 py-3">
              <h3 className="text-white font-black text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Violations &amp; Notices
              </h3>
            </div>
            <div className="divide-y divide-red-50">
              {myViolations.map((violation) => {
                const issueDate = new Date(violation.issued_at || violation.issuedAt || new Date());
                const isViolation = violation.mode === "violation";
                return (
                  <div key={violation.id} className="flex items-start gap-4 px-5 py-4 bg-red-50/60 hover:bg-red-100/60 transition-colors">
                    <div className="h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 bg-red-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5">
                          {violation.type || "Violation"}
                        </Badge>
                      </div>
                      <p className="font-bold text-slate-900 text-sm">{violation.message || "No message provided"}</p>
                      <p className="text-slate-500 text-xs font-medium mt-1">
                        Issued on {issueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      {isViolation && violation.expires_at && (
                        <p className="text-slate-500 text-xs font-medium">
                          Expires: {new Date(violation.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      )}
                      {isViolation && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAppealModal({ open: true, violationId: violation.id || "", violationType: violation.type || "" })}
                          className="mt-2 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                        >
                          Submit Appeal
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {notifications.length > 0 && (
          <div className="mb-4 flex flex-col sm:flex-row gap-2">
            {unreadNotificationCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const unreadNotifs = notifications.filter((n) => !n.read);
                  unreadNotifs.forEach((notif) => {
                    if (user?.id && notif.id) {
                      void markNotificationRead(notif.id, user.id);
                    }
                  });
                  setNotifications(
                    notifications.map((n) => ({ ...n, read: true, is_read: true }))
                  );
                }}
                className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
              >
                Mark all as read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={deleteAllNotifs}
                className="text-xs bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
              >
                Delete all
              </Button>
            )}
          </div>
        )}

        <div className="mb-4 flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={notifSearch}
              onChange={(e) => setNotifSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={notifFilter}
            onChange={(e) => setNotifFilter(e.target.value as "all" | "read" | "unread")}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Notifications</option>
            <option value="read">Read</option>
            <option value="unread">Unread</option>
          </select>
        </div>

        {filteredNotifs.length > 0 && (
          <p className="text-xs text-slate-500 mb-3">
            Showing {filteredNotifs.length} of {notifications.length} notifications
          </p>
        )}

        {filteredNotifs.length > 0 ? (
          <div className="bg-white/90 backdrop-blur-xl border border-amber-100 rounded-2xl shadow-lg overflow-hidden divide-y divide-amber-50">
            {filteredNotifs.map((notif, i) => (
              <div
                key={notif.id || i}
                className={`flex items-start gap-3 px-5 py-4 transition-colors ${
                  notif.read ? "" : "bg-amber-50/60 hover:bg-amber-100/60"
                } hover:bg-amber-50`}
              >
                <div className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${notif.read ? "bg-slate-200" : "bg-orange-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-bold text-slate-900 text-sm">{notif.title || notif.type}</p>
                    {notif.type && (
                      <Badge className="bg-blue-100 text-blue-700 text-[10px] font-black">
                        {notif.type}
                      </Badge>
                    )}
                    {!notif.read && (
                      <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                    )}
                  </div>
                  <p className="text-slate-600 text-xs font-medium">{notif.message}</p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-amber-100">
                    <span className="text-slate-400 text-[10px] font-medium">
                      {notif.created_at
                        ? new Date(notif.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (notif.id) {
                            toggleNotifReadStatus(notif.id, Boolean(notif.read || notif.is_read));
                          }
                        }}
                        className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-amber-100"
                      >
                        {notif.read || notif.is_read ? (
                          <>
                            <MailOpen className="h-3.5 w-3.5 mr-1" />
                            Mark unread
                          </>
                        ) : (
                          <>
                            <Mail className="h-3.5 w-3.5 mr-1" />
                            Mark read
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (notif.id) {
                            deleteNotif(notif.id);
                          }
                        }}
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-900 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-xl border border-amber-100 rounded-2xl shadow-lg overflow-hidden p-8 text-center">
            <Bell className="h-8 w-8 text-amber-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">No notifications yet</p>
            <p className="text-slate-400 text-xs font-medium mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-xl border border-amber-100 rounded-2xl shadow-lg overflow-hidden p-8 text-center">
            <Search className="h-8 w-8 text-amber-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">No matching notifications</p>
            <p className="text-slate-400 text-xs font-medium mt-1">Try adjusting your search or filter</p>
          </div>
        )}
      </div>
    );
  };

  // ── Section: Settings (full version from File 2) ─────────────────────────
  const [settingsTab, setSettingsTab] = useState("profile");
  const [passwordState, setPasswordState] = useState({
    current: "",
    new: "",
    confirm: "",
    showCurrent: false,
    showNew: false,
    showConfirm: false,
    isChanging: false,
  });
  const [twoFAState, setTwoFAState] = useState({
    setupMode: false,
    secret: "",
    verificationCode: "",
    confirmed: false,
    isVerifying: false,
  });

  // ── Password Change Handler ──────────────────────────────────────────────
  const handlePasswordChange = async () => {
    if (!passwordState.current.trim()) {
      toast.error("Please enter your current password");
      return;
    }

    if (passwordState.new !== passwordState.confirm) {
      toast.error("New passwords do not match");
      return;
    }

    const validation = validatePassword(passwordState.new);
    if (!validation.valid) {
      toast.error("Password must have: " + validation.errors.join(", "));
      return;
    }

    if (passwordState.new === passwordState.current) {
      toast.error("New password must be different from current password");
      return;
    }

    setPasswordState((p) => ({ ...p, isChanging: true }));

    try {
      if (user) {
        await updateUser(user.id, { password: passwordState.new });
      }

      addAuditLog("PASSWORD_CHANGED", "Password successfully changed");
      toast.success("Password changed successfully!");

      // Clear password form
      setPasswordState({
        current: "",
        new: "",
        confirm: "",
        showCurrent: false,
        showNew: false,
        showConfirm: false,
        isChanging: false,
      });
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Failed to change password");
      addAuditLog("PASSWORD_CHANGE_ERROR", "System error during password change");
    }
  };

  // ── 2FA Setup Handler ────────────────────────────────────────────────────
  const handleSetup2FA = () => {
    const secret = generate2FASecret();
    setTwoFAState((prev) => ({
      ...prev,
      setupMode: true,
      secret: secret,
      verificationCode: "",
      confirmed: false,
    }));
    addAuditLog("2FA_SETUP_INITIATED", "User started 2FA setup process");
  };

  const handleVerify2FA = async () => {
    if (!twoFAState.verificationCode.trim()) {
      toast.error("Please enter the verification code");
      return;
    }

    setTwoFAState((prev) => ({ ...prev, isVerifying: true }));

    try {
      const isValid = verify2FACode(twoFAState.verificationCode, twoFAState.secret);

      if (!isValid) {
        toast.error("Invalid verification code");
        addAuditLog("2FA_VERIFICATION_FAILED", "Invalid code provided");
        setTwoFAState((prev) => ({ ...prev, isVerifying: false }));
        return;
      }

      // Enable 2FA in security settings
      updateSecurity((p) => ({
        ...p,
        twoFactor: true,
      }));

      // Save backup codes
      const backupCodes = Array.from({ length: 10 }, () =>
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );
      if (user?.id) {
        localStorage.setItem(
          `2fa_backup_codes_${user.id}`,
          JSON.stringify(backupCodes)
        );
      }

      addAuditLog("2FA_ENABLED", "Two-factor authentication successfully enabled");
      toast.success("2FA enabled successfully! Save your backup codes in a safe place.");

      // Show backup codes
      alert(
        "Backup Codes (save these in a safe place):\n\n" +
          backupCodes.join("\n") +
          "\n\nYou can use these codes if you lose access to your 2FA device."
      );

      setTwoFAState({
        setupMode: false,
        secret: "",
        verificationCode: "",
        confirmed: true,
        isVerifying: false,
      });
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      toast.error("Failed to enable 2FA");
      addAuditLog("2FA_SETUP_ERROR", "System error during 2FA setup");
      setTwoFAState((prev) => ({ ...prev, isVerifying: false }));
    }
  };

  const handleCancel2FASetup = () => {
    setTwoFAState({
      setupMode: false,
      secret: "",
      verificationCode: "",
      confirmed: false,
      isVerifying: false,
    });
  };

  const renderSettings = () => {
    // ── Profile Tab ────────────────────────────────────────────────────────
    const renderProfileTab = () => (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
        {/* Avatar */}
        <div className="flex flex-col gap-5 rounded-lg border border-orange-100 bg-gradient-to-r from-orange-50 via-white to-amber-50 p-6 shadow-sm sm:flex-row sm:items-center xl:col-span-2">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-orange-500 text-3xl font-black text-white shadow-lg">
            {profile.avatar ? <img src={profile.avatar} alt={`${profile.firstName || "Landlord"} profile`} className="h-full w-full object-cover" /> : (profile.firstName[0] || "L").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-black text-slate-950">{`${profile.firstName} ${profile.lastName}`.trim() || "Not provided"}</p>
            <p className="mb-4 text-sm font-medium text-slate-500">{profile.email || "Email not provided"}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={isUploadingProfilePhoto} onClick={() => profilePhotoInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-xs font-black text-white hover:bg-orange-600 disabled:opacity-50"><Camera className="h-4 w-4" />{isUploadingProfilePhoto ? "Uploading..." : "Upload Photo"}</button>
              <button type="button" disabled={!profile.avatar || isUploadingProfilePhoto} onClick={() => void handleRemoveProfilePhoto()} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50">Remove Photo</button>
              <input ref={profilePhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void handleProfilePhoto(event.target.files?.[0])} />
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle icon="👤" title="Personal Information" subtitle="Your public-facing landlord profile" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name">
              <SettingsInput value={profile.firstName} onChange={(e: any) => updateProfile(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" />
            </Field>
            <Field label="Last Name">
              <SettingsInput value={profile.lastName} onChange={(e: any) => updateProfile(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" />
            </Field>
          </div>
          <Field label="Email Address" hint="Used for account login and notifications">
            <SettingsInput type="email" value={profile.email} onChange={(e: any) => updateProfile(p => ({ ...p, email: e.target.value }))} placeholder="you@email.com" />
          </Field>
          <Field label="Mobile Number" hint="Visible to renters if enabled in Business settings">
            <SettingsInput type="tel" value={profile.mobile} onChange={(e: any) => updateProfile(p => ({ ...p, mobile: e.target.value }))} placeholder="09XXXXXXXXX" />
          </Field>
          <Field label="Bio / About You" hint="Shown on your landlord profile page (max 300 characters)">
            <SettingsTextarea rows={3} value={profile.bio} onChange={(e: any) => updateProfile(p => ({ ...p, bio: e.target.value.slice(0, 300) }))} placeholder="Tell renters about yourself…" />
            <p className="text-[11px] text-slate-400 font-medium text-right">{profile.bio.length}/300</p>
          </Field>
        </div>

        {/* Preferences */}
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle icon="⚙️" title="Preferences" subtitle="Language, timezone, and display settings" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Language">
              <SettingsSelect value={profile.language} onChange={(e: any) => updateProfile(p => ({ ...p, language: e.target.value }))}>
                <option value="en">English</option>
                <option value="fil">Filipino</option>
                <option value="hil">Hiligaynon</option>
              </SettingsSelect>
            </Field>
            <Field label="Timezone">
              <SettingsSelect value={profile.timezone} onChange={(e: any) => updateProfile(p => ({ ...p, timezone: e.target.value }))}>
                <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
              </SettingsSelect>
            </Field>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end xl:col-span-2">
          <Button variant="outline" onClick={() => setProfile(savedProfile)} className="rounded-md font-bold"><RotateCcw className="mr-2 h-4 w-4" />Reset Changes</Button>
          <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile} className="rounded-md bg-orange-500 font-bold text-white hover:bg-orange-600">{isUpdatingProfile ? "Saving..." : "Save Changes"}</Button>
        </div>
      </div>
    );

    // ── Alerts Tab ─────────────────────────────────────────────────────────
    const renderAlertsTab = () => (
      <div className="space-y-5">
        {/* Renter Activity */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5">
          <SectionTitle icon="🏠" title="Renter Activity" subtitle="In-app reminders when renters interact with your listings" />
          <AlertRow label="Listing Added to Favorites" hint="A renter saves your apartment to their favorites list" pushVal={alerts.reviewPush} onPush={(v) => setA("reviewPush", v)} />
          <AlertRow label="Listing Appears in Suggested or Popular" hint="Your unit is being surfaced to renters in their dashboard" pushVal={alerts.listingPush} onPush={(v) => setA("listingPush", v)} />
        </div>

        {/* Admin & Compliance */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5">
          <SectionTitle icon="⚠️" title="Admin & Compliance" subtitle="Reports, violations, and notices from platform administrators" />
          <AlertRow label="Report Filed Against Listing" hint="A renter submits a report about your unit" pushVal={alerts.reportPush} onPush={(v) => setA("reportPush", v)} />
          <AlertRow label="Violation / Notice Issued" hint="Admin issues a formal violation or notice" pushVal={alerts.violationPush} onPush={(v) => setA("violationPush", v)} />
          <AlertRow label="Permit Verification Reminder" hint="30-day reminder before your business permit expires" pushVal={alerts.permitPush} onPush={(v) => setA("permitPush", v)} />
        </div>

        {/* System & Platform */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5">
          <SectionTitle icon="🛠️" title="System & Platform" subtitle="Account changes and platform announcements" />
          <AlertRow label="Platform Announcements" hint="New features, policy updates, maintenance" pushVal={alerts.systemPush} onPush={(v) => setA("systemPush", v)} />
        </div>

        {/* Digest & Quiet Hours */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="🕐" title="Delivery Preferences" subtitle="Digest schedule and quiet hours" />
          <Field label="Activity Digest" hint="Receive a summary instead of individual notifications">
            <SettingsSelect value={alerts.digest} onChange={(e: any) => setA("digest", e.target.value)}>
              <option value="realtime">Real-time (no digest)</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </SettingsSelect>
          </Field>
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <div>
              <p className="text-sm font-bold text-slate-800">Quiet Hours</p>
              <p className="text-xs text-slate-500 font-medium">Pause push notifications during rest hours</p>
            </div>
            <Toggle checked={alerts.quietEnabled} onChange={(v) => setA("quietEnabled", v)} />
          </div>
          {alerts.quietEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Quiet From">
                <SettingsInput type="time" value={alerts.quietStart} onChange={(e: any) => setA("quietStart", e.target.value)} />
              </Field>
              <Field label="Quiet Until">
                <SettingsInput type="time" value={alerts.quietEnd} onChange={(e: any) => setA("quietEnd", e.target.value)} />
              </Field>
            </div>
          )}
        </div>

        <Button onClick={handleSaveAlerts} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-md shadow-amber-200">
          Save Alert Preferences
        </Button>
      </div>
    );

    // ── Business Tab ───────────────────────────────────────────────────────
    const renderBusinessTab = () => (
      <div className="space-y-5">
        {/* Business Registration */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="📋" title="Business Registration" subtitle="Permits and legal information required for verification" />
          <Field label="Business / Trade Name" hint="Leave blank to use your personal name">
            <SettingsInput value={business.businessName} onChange={(e: any) => setB("businessName", e.target.value)} placeholder="e.g. Santos Apartments" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Business Type">
              <SettingsSelect value={business.businessType} onChange={(e: any) => setB("businessType", e.target.value)}>
                <option value="sole_proprietor">Sole Proprietor</option>
                <option value="partnership">Partnership</option>
                <option value="corporation">Corporation / OPC</option>
              </SettingsSelect>
            </Field>
            <Field label="Years in Operation">
              <SettingsInput type="number" min="0" value={business.yearsActive} onChange={(e: any) => setB("yearsActive", e.target.value)} placeholder="e.g. 5" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Business Permit No." hint="e.g. BP-2024-ILO-XXXXX">
              <SettingsInput value={business.permitNumber} onChange={(e: any) => setB("permitNumber", e.target.value)} placeholder="BP-XXXX-XXXX" />
            </Field>
            <Field label="Permit Expiry Date">
              <SettingsInput type="date" value={business.permitExpiry} onChange={(e: any) => setB("permitExpiry", e.target.value)} />
            </Field>
          </div>
          <Field label="BIR TIN" hint="Required for official receipts / Tax Identification Number">
            <SettingsInput value={business.taxId} onChange={(e: any) => setB("taxId", e.target.value)} placeholder="XXX-XXX-XXX-000" />
          </Field>

          {business.permitExpiry && new Date(business.permitExpiry) < new Date(Date.now() + 30 * 86400000) && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <span className="text-base shrink-0">⚠️</span>
              <p className="text-xs font-bold text-red-700">Your business permit expires soon. Please renew it and update the date to maintain verified status.</p>
            </div>
          )}
        </div>

        {/* Property Portfolio */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="🏘️" title="Property Portfolio" subtitle="Scope and coverage of your rental properties" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Total Units Managed">
              <SettingsInput type="number" min="1" value={business.totalUnits} onChange={(e: any) => setB("totalUnits", e.target.value)} placeholder="e.g. 4" />
            </Field>
            <Field label="Service Areas">
              <SettingsInput value={business.serviceAreas} onChange={(e: any) => setB("serviceAreas", e.target.value)} placeholder="e.g. Jaro, Mandurriao" />
            </Field>
          </div>
        </div>

        {/* Rental Policies */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="📝" title="Rental Policies" subtitle="Default terms applied to all your listings" />
          <div className="grid grid-cols-3 gap-4">
            <Field label="Security Deposit (months)">
              <SettingsSelect value={business.depositPolicy} onChange={(e: any) => setB("depositPolicy", e.target.value)}>
                <option value="1">1 month</option>
                <option value="2">2 months</option>
                <option value="3">3 months</option>
              </SettingsSelect>
            </Field>
            <Field label="Advance Payment (months)">
              <SettingsSelect value={business.advancePolicy} onChange={(e: any) => setB("advancePolicy", e.target.value)}>
                <option value="1">1 month</option>
                <option value="2">2 months</option>
              </SettingsSelect>
            </Field>
            <Field label="Min. Lease Term (months)">
              <SettingsSelect value={business.minLeaseTerm} onChange={(e: any) => setB("minLeaseTerm", e.target.value)}>
                <option value="1">1 month</option>
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
              </SettingsSelect>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pet Policy">
              <SettingsSelect value={business.petPolicy} onChange={(e: any) => setB("petPolicy", e.target.value)}>
                <option value="no">No pets allowed</option>
                <option value="small">Small pets only</option>
                <option value="case_by_case">Case-by-case basis</option>
                <option value="yes">Pets welcome</option>
              </SettingsSelect>
            </Field>
            <Field label="Smoking Policy">
              <SettingsSelect value={business.smokingPolicy} onChange={(e: any) => setB("smokingPolicy", e.target.value)}>
                <option value="no">Non-smoking</option>
                <option value="outdoor">Outdoor areas only</option>
                <option value="yes">Smoking allowed</option>
              </SettingsSelect>
            </Field>
          </div>
          <Field label="Maintenance Response Time">
            <SettingsSelect value={business.maintenanceResponse} onChange={(e: any) => setB("maintenanceResponse", e.target.value)}>
              <option value="24">Within 24 hours</option>
              <option value="48">Within 48 hours</option>
              <option value="72">Within 72 hours</option>
            </SettingsSelect>
          </Field>
        </div>

        {/* Visibility */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="👁️" title="Visibility" subtitle="Control who can see your listings" />
          <Field label="Listing Visibility">
            <SettingsSelect value={business.listingVisibility} onChange={(e: any) => setB("listingVisibility", e.target.value)}>
              <option value="public">Public – visible to everyone</option>
              <option value="registered">Registered users only</option>
              <option value="hidden">Hidden – not searchable</option>
            </SettingsSelect>
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setBusiness(savedBusiness)} className="rounded-md font-bold"><RotateCcw className="mr-2 h-4 w-4" />Reset Changes</Button>
          <Button onClick={handleSaveBusiness} className="rounded-md bg-orange-500 font-bold text-white hover:bg-orange-600">Save Business Details</Button>
        </div>
      </div>
    );

    // ── Security Tab ───────────────────────────────────────────────────────
    const renderSecurityTab = () => (
      <div className="space-y-5">
        {/* Password */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle
            icon="🔑"
            title="Password"
            subtitle={security.passwordLastChanged ? `Last changed: ${new Date(security.passwordLastChanged).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}` : "Last changed: Not provided"}
          />
          <Field label="Current Password">
            <div className="relative">
              <SettingsInput
                type={passwordState.showCurrent ? "text" : "password"}
                placeholder="Enter current password"
                value={passwordState.current}
                onChange={(e: any) => setPasswordState((p) => ({ ...p, current: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setPasswordState((p) => ({ ...p, showCurrent: !p.showCurrent }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {passwordState.showCurrent ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </Field>
          <Field label="New Password" hint="At least 8 characters with letters, numbers, and symbols">
            <div className="relative">
              <SettingsInput
                type={passwordState.showNew ? "text" : "password"}
                placeholder="New password"
                value={passwordState.new}
                onChange={(e: any) => setPasswordState((p) => ({ ...p, new: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setPasswordState((p) => ({ ...p, showNew: !p.showNew }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {passwordState.showNew ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </Field>
          <Field label="Confirm New Password">
            <div className="relative">
              <SettingsInput
                type={passwordState.showConfirm ? "text" : "password"}
                placeholder="Repeat new password"
                value={passwordState.confirm}
                onChange={(e: any) => setPasswordState((p) => ({ ...p, confirm: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setPasswordState((p) => ({ ...p, showConfirm: !p.showConfirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {passwordState.showConfirm ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </Field>
          <button
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl transition-colors"
            onClick={handlePasswordChange}
            disabled={passwordState.isChanging}
          >
            {passwordState.isChanging ? "Updating..." : "Update Password"}
          </button>
        </div>

        {/* Two-Factor Authentication */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="🛡️" title="Two-Factor Authentication" subtitle="Extra layer of protection for your account" />
          
          {!security.twoFactor && !twoFAState.setupMode ? (
            <>
              <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                <p className="text-sm font-black text-slate-900">Two-Factor Authentication</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">⚠️ Disabled – your account is less secure</p>
              </div>
              <button
                onClick={handleSetup2FA}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-sm font-black rounded-xl transition-colors"
              >
                Enable 2FA
              </button>
            </>
          ) : security.twoFactor && !twoFAState.setupMode ? (
            <>
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                <p className="text-sm font-black text-slate-900">Two-Factor Authentication</p>
                <p className="text-xs text-green-600 font-medium mt-0.5">✅ Enabled – your account is protected</p>
              </div>
              <Field label="2FA Method">
                <SettingsSelect value={security.twoFactorMethod} onChange={(e: any) => updateSecurity(p => ({ ...p, twoFactorMethod: e.target.value }))}>
                  <option value="sms">SMS to mobile number</option>
                  <option value="email">Email OTP</option>
                  <option value="authenticator">Authenticator App (Google / Authy)</option>
                </SettingsSelect>
              </Field>
              <button
                onClick={() => {
                  toast.success("2FA is already enabled");
                }}
                className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-black rounded-xl transition-colors"
              >
                2FA Enabled
              </button>
            </>
          ) : (
            <>
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <p className="text-sm font-black text-slate-900">Setup 2FA</p>
                <p className="text-xs text-blue-600 font-medium mt-0.5">Follow the steps to enable two-factor authentication</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-slate-800">Step 1: Open your authenticator app</p>
                <p className="text-xs text-slate-600">Download Google Authenticator, Authy, or Microsoft Authenticator if you haven't already.</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-slate-800">Step 2: Scan the QR code</p>
                <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-center h-40">
                  <div className="text-slate-400 text-center">
                    <p className="text-xs font-mono">{twoFAState.secret}</p>
                    <p className="text-[10px] mt-2">(Or enter this code manually)</p>
                  </div>
                </div>
              </div>
              <Field label="Verification Code">
                <SettingsInput
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={twoFAState.verificationCode}
                  onChange={(e: any) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setTwoFAState((p) => ({ ...p, verificationCode: val }));
                  }}
                  maxLength="6"
                />
              </Field>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel2FASetup}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-black rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerify2FA}
                  disabled={twoFAState.isVerifying || twoFAState.verificationCode.length !== 6}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl transition-colors"
                >
                  {twoFAState.isVerifying ? "Verifying..." : "Verify & Enable"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Login & Sessions */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="💻" title="Login & Sessions" subtitle="Manage active sessions and login security" />
          <div className="space-y-3">
            {[
              { key: "loginAlerts",     label: "Login Alerts",              hint: "Get notified when your account is accessed from a new device or location" },
              { key: "trustedDevices",  label: "Remember Trusted Devices",  hint: "Skip 2FA on devices you've verified before" },
            ].map(({ key, label, hint }) => (
              <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{hint}</p>
                </div>
                <Toggle checked={(security as any)[key]} onChange={(v) => updateSecurity(p => ({ ...p, [key]: v }))} />
              </div>
            ))}
            <Field label="Auto Session Timeout" hint="Automatically log out after inactivity">
              <SettingsSelect value={security.sessionTimeout} onChange={(e: any) => updateSecurity(p => ({ ...p, sessionTimeout: e.target.value }))}>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="240">4 hours</option>
                <option value="0">Never</option>
              </SettingsSelect>
            </Field>
          </div>

          {/* Active Devices */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Sessions</p>
            <div className="space-y-2">
              {security.activeDevices.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-medium text-slate-500">No active session data is available.</div>
              )}
              {security.activeDevices.map((d: (typeof security.activeDevices)[number]) => (
                <div key={d.id} className={`flex items-center justify-between p-3 rounded-xl border ${d.current ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-100"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{d.name.includes("iPhone") || d.name.includes("Android") ? "📱" : "💻"}</span>
                    <div>
                      <p className="text-xs font-black text-slate-800">
                        {d.name}
                        {d.current && <span className="ml-2 text-[9px] font-black text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">THIS DEVICE</span>}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">{d.location} · {d.lastActive}</p>
                    </div>
                  </div>
                  {!d.current && (
                    <button
                      onClick={() => updateSecurity(p => ({ ...p, activeDevices: p.activeDevices.filter((x: (typeof p.activeDevices)[number]) => x.id !== d.id) }))}
                      className="text-xs font-black text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Account Recovery */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="📧" title="Account Recovery" subtitle="Backup contacts if you lose access to your account" />
          <Field label="Recovery Email" hint="Must be different from your primary email">
            <SettingsInput type="email" value={security.recoveryEmail} onChange={(e: any) => updateSecurity(p => ({ ...p, recoveryEmail: e.target.value }))} placeholder="backup@email.com" />
          </Field>
          <Field label="Recovery Mobile Number">
            <SettingsInput type="tel" value={security.recoveryMobile} onChange={(e: any) => updateSecurity(p => ({ ...p, recoveryMobile: e.target.value }))} placeholder="09XXXXXXXXX" />
          </Field>
        </div>

        {/* Privacy & Data */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="🔐" title="Privacy & Data" subtitle="Control how your data is used on the platform" />
          {[
            { key: "profileIndexing",  label: "Allow search engine indexing",         hint: "Your profile may appear in Google / Bing search results" },
            { key: "analyticsConsent", label: "Share usage analytics",                hint: "Help improve the platform with anonymous usage data" },
            { key: "dataSharing",      label: "Share data with third-party partners", hint: "Used for fraud detection and identity verification services" },
          ].map(({ key, label, hint }) => (
            <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-800">{label}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{hint}</p>
              </div>
              <Toggle checked={(security as any)[key]} onChange={(v) => updateSecurity(p => ({ ...p, [key]: v }))} />
            </div>
          ))}
        </div>

        <Button onClick={handleSaveSecurity} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-md shadow-amber-200">
          Save Security Settings
        </Button>

        {/* Danger Zone */}
        <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="⚠️" title="Danger Zone" subtitle="Irreversible account actions" />
          <p className="text-xs text-slate-600 font-medium">Once you delete your account, there is no going back. Please be certain.</p>
          <Button variant="destructive" className="w-full rounded-xl font-bold" onClick={handleDeleteAccount}>
            Delete My Account
          </Button>
        </div>
      </div>
    );

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-6 pb-8 [&_.rounded-2xl]:rounded-lg [&_.rounded-xl]:rounded-md [&_.border-2]:border">
        <div className="rounded-lg border border-orange-100 bg-gradient-to-r from-white to-orange-50 px-5 py-6 shadow-sm sm:px-7">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-orange-500 text-white shadow-md"><Settings className="h-6 w-6" /></span>
            <div><h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Settings</h1><p className="mt-1 text-sm font-medium text-slate-500">Manage your account, preferences, business information, and security.</p></div>
          </div>
        </div>

        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm sm:grid-cols-4">
            <TabsTrigger value="profile" className="min-h-11 rounded-md font-bold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm">
              <User className="h-3.5 w-3.5 mr-1.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="alerts" className="min-h-11 rounded-md font-bold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm">
              <Bell className="h-3.5 w-3.5 mr-1.5" /> Alerts
            </TabsTrigger>
            <TabsTrigger value="business" className="min-h-11 rounded-md font-bold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm">
              <Building2 className="h-3.5 w-3.5 mr-1.5" /> Business
            </TabsTrigger>
            <TabsTrigger value="security" className="min-h-11 rounded-md font-bold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm">
              <Shield className="h-3.5 w-3.5 mr-1.5" /> Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-0">{renderProfileTab()}</TabsContent>
          <TabsContent value="alerts" className="mt-0">{renderAlertsTab()}</TabsContent>
          <TabsContent value="business" className="mt-0">{renderBusinessTab()}</TabsContent>
          <TabsContent value="security" className="mt-0">{renderSecurityTab()}</TabsContent>
        </Tabs>
      </motion.div>
    );
  };

  // ── Section: Help ────────────────────────────────────────────────────────
  const renderHelp = () => (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5 pb-8">
      <header className="rounded-lg border border-orange-100 bg-gradient-to-r from-white via-orange-50/40 to-amber-50 px-5 py-7 shadow-sm sm:px-7">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-orange-500 text-white shadow-md"><HelpCircle className="h-6 w-6" /></span>
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-orange-600">Help &amp; Support</p><h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">Landlord Support Center</h1><p className="mt-1 text-sm font-medium text-slate-500">Get help managing listings, verification, and renter inquiries.</p></div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: ListPlus, title: "Add a Property", desc: "Create a listing with photos, rent, rooms, and location.", action: () => navigate("/add-apartment"), tone: "bg-orange-50 text-orange-600" },
          { icon: Building2, title: "Manage Listings", desc: "Review your posted properties and listing performance.", action: () => navigate("/dashboard?section=properties"), tone: "bg-violet-50 text-violet-600" },
          { icon: Settings, title: "Business Settings", desc: "Update permit details, rental policies, and visibility.", action: () => { setSettingsTab("business"); navigate("/dashboard?section=settings"); }, tone: "bg-emerald-50 text-emerald-600" },
        ].map(({ icon: Icon, title, desc, action, tone }) => (
          <button
            key={title}
            onClick={action}
            className="group flex min-h-28 items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
          >
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${tone}`}><Icon className="h-6 w-6" /></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900">{title}</strong><span className="mt-1 block text-xs font-medium leading-5 text-slate-500">{desc}</span></span>
            <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500" />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="rounded-lg border-orange-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 font-black">
              <BookOpen className="h-5 w-5 text-amber-600" />
              Listing Guide
            </CardTitle>
            <CardDescription>What landlords should put in each listing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Complete listing details", "Add rent, address, amenities, bedroom count, available date, and clear house rules."],
              ["Use real photos", "Upload accurate photos of the room, bathroom, kitchen, entrance, and shared areas."],
              ["Keep availability updated", "Mark units or rooms occupied as soon as they are no longer available."],
              ["Set clear policies", "Use Business settings for deposit, advance payment, lease term, pet, smoking, and maintenance terms."],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-lg border border-orange-100 bg-orange-50/40 p-4">
                <p className="font-black text-sm text-slate-900">{title}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-blue-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 font-black">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              Verification & Renter Safety
            </CardTitle>
            <CardDescription>Keep listings trustworthy and easy to review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Permit verification", "Make sure your permit number and expiry date are current in Business settings."],
              ["Respond clearly", "Confirm rent inclusions, deposit requirements, viewing schedule, and move-in rules before visits."],
              ["Avoid misleading details", "Do not post outdated prices, unavailable rooms, or photos from a different unit."],
              ["Handle reports", "If a listing receives a report, review the details and update incorrect information quickly."],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50/30 p-4">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-black text-sm text-slate-900">{title}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 font-black">
            <MessageSquare className="h-5 w-5 text-amber-600" />
            Contact Support
          </CardTitle>
          <CardDescription>Your request uses the contact email associated with your landlord profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {supportSubmitted ? (
            <div className="p-5 rounded-2xl bg-green-50 border border-green-200 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
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
                    <option value="Listing setup">Listing setup</option>
                    <option value="Verification">Verification</option>
                    <option value="Property visibility">Property visibility</option>
                    <option value="Renter inquiry issue">Renter inquiry issue</option>
                    <option value="Account or login">Account or login</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Contact Email</Label>
                  <Input
                    value={supportForm.contact}
                    onChange={(e) => setSupportForm((f) => ({ ...f, contact: e.target.value }))}
                    placeholder="your@email.com"
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
                onClick={() => void handleSupportSubmit()}
                disabled={isSubmittingSupport}
                className="w-full rounded-md bg-orange-500 text-white font-bold shadow-sm hover:bg-orange-600"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmittingSupport ? "Sending..." : "Send Support Request"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  // ── Section: Messaging ──────────────────────────────────────────────────


  const renderOverview = () => {
    const recentProperties = [...myApartments]
      .sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime())
      .slice(0, 3);
    const getActorName = (userId: string | null | undefined, fallback: string) =>
      favoriteUsers.find((entry) => entry.id === userId)?.name || fallback;
    const recentActivity = [
      ...landlordViewRows.map((view) => {
        const apartmentId = view.apartment_id ?? view.apartmentId ?? "";
        const apartment = myApartments.find((item) => item.id === apartmentId);
        return {
          id: `view-${view.id ?? `${apartmentId}-${view.viewed_at}`}`,
          timestamp: view.viewed_at ?? "",
          title: apartment ? `${getActorName(view.viewer_id ?? view.viewerId, "Anonymous viewer")} viewed ${apartment.title}` : "Apartment viewed",
          icon: Eye,
          tone: "bg-blue-50 text-blue-600",
        };
      }),
      ...landlordFavoriteRows.map((favorite) => {
        const apartmentId = favorite.apartment_id ?? favorite.apartmentId ?? "";
        const apartment = myApartments.find((item) => item.id === apartmentId);
        return {
          id: `favorite-${favorite.id ?? `${apartmentId}-${favorite.created_at}`}`,
          timestamp: favorite.created_at ?? "",
          title: apartment ? `${getActorName(favorite.user_id ?? favorite.userId, "An account")} saved ${apartment.title}` : "Apartment saved",
          icon: Heart,
          tone: "bg-rose-50 text-rose-600",
        };
      }),
      ...myApartments.map((apartment) => ({
        id: `property-${apartment.id}`,
        timestamp: apartment.createdAt ?? "",
        title: `${apartment.title || "Untitled property"} added`,
        icon: Building2,
        tone: "bg-orange-50 text-orange-600",
      })),
      ...notifications.map((notification) => ({
        id: `notification-${notification.id}`,
        timestamp: notification.created_at ?? notification.createdAt ?? "",
        title: notification.title || "Notification received",
        icon: Bell,
        tone: "bg-violet-50 text-violet-600",
      })),
    ]
      .filter((item) => item.timestamp && !Number.isNaN(new Date(item.timestamp).getTime()))
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 6);
    const itemMotion = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

    return (
      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.055 } } }} className="mx-auto max-w-[1500px] space-y-5">
        <motion.section variants={itemMotion} className={`flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between ${landlordVerified ? "border-emerald-200" : "border-orange-200"}`}>
          <div className="flex items-start gap-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${landlordVerified ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>{landlordVerified ? <ShieldCheck className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}</span>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-lg font-black text-slate-950">{landlordVerified ? "Account Verified" : "Verification Pending"}</h1><Badge className={`rounded-md ${landlordVerified ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>{landlordVerified ? "Verified" : "Under review"}</Badge></div>
              <p className="mt-1 text-sm font-medium text-slate-600">{landlordPermit ? <>Permit <strong>{landlordPermit}</strong> {landlordVerified ? "is verified." : "is being reviewed by the administration team."}</> : "Verification information is available in your account settings."}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => { setSettingsTab("business"); setActiveSection("settings"); }} className="h-10 shrink-0 rounded-md border-orange-200 font-bold text-orange-700 hover:bg-orange-50">View Details<ChevronRight className="ml-2 h-4 w-4" /></Button>
        </motion.section>

        <motion.section variants={itemMotion} className="grid gap-3 sm:grid-cols-3">
          {[{ label: "Properties", value: myApartments.length, detail: "Total properties", icon: Building2, action: () => setActiveSection("properties"), tone: "bg-orange-500 text-white", iconTone: "bg-white/20" }, { label: "Total Views", value: totalViews, detail: "Across all properties", icon: Eye, action: () => setActiveSection("activity"), tone: "border border-slate-200 bg-white text-slate-950", iconTone: "bg-orange-50 text-orange-600" }, { label: "Favorites", value: totalInquiries, detail: "Saved by renters", icon: Heart, action: () => setActiveSection("activity"), tone: "border border-slate-200 bg-white text-slate-950", iconTone: "bg-rose-50 text-rose-600" }].map(({ label, value, detail, icon: Icon, action, tone, iconTone }) => <motion.button key={label} whileHover={{ y: -3 }} onClick={action} className={`group flex min-h-32 items-center gap-4 rounded-lg p-5 text-left shadow-sm transition-shadow hover:shadow-lg ${tone}`}><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${iconTone}`}><Icon className="h-6 w-6" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-black uppercase">{label}</span><strong className="mt-1 block text-3xl">{value.toLocaleString()}</strong><span className={`block text-xs font-medium ${label === "Properties" ? "text-orange-100" : "text-slate-500"}`}>{detail}</span></span><ChevronRight className={`h-4 w-4 transition group-hover:translate-x-0.5 ${label === "Properties" ? "text-white/70" : "text-slate-300"}`} /></motion.button>)}
        </motion.section>

        <motion.section variants={itemMotion} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-orange-600" /><div><h2 className="font-black text-slate-950">{allRooms.length > 0 ? "Room Overview" : "Occupancy Overview"}</h2><p className="text-xs font-medium text-slate-500">Live room availability across your properties.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[{ label: "Total Units", value: totalUnits, detail: "Apartments or rooms", icon: Building2, tone: "bg-orange-50 text-orange-600" }, { label: "Available", value: availableCount, detail: "Ready for tenants", icon: Home, tone: "bg-emerald-50 text-emerald-600" }, { label: "Occupied", value: occupiedCount, detail: "Currently occupied", icon: ShieldCheck, tone: "bg-blue-50 text-blue-600" }].map(({ label, value, detail, icon: Icon, tone }) => <div key={label} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4"><span className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span><span><strong className="block text-2xl text-slate-950">{value}</strong><span className="block text-xs font-black text-slate-700">{label}</span><span className="block text-[11px] text-slate-500">{detail}</span></span></div>)}
          </div>
          {totalUnits > 0 ? <div className="mt-5"><div className="mb-2 flex justify-between text-xs font-black text-slate-500"><span>Occupancy Rate</span><span className="text-orange-600">{occupancyRate}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${occupancyRate}%` }} /></div></div> : <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm font-medium text-slate-500">Room information will appear after a property or room is added.</p>}
        </motion.section>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <motion.section variants={itemMotion} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-3"><div><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-orange-600" /><h2 className="font-black text-slate-950">My Properties</h2></div><p className="mt-1 text-xs font-medium text-slate-500">Your newest database listings.</p></div>{myApartments.length > 0 && <button onClick={() => setActiveSection("properties")} className="text-xs font-black text-orange-600">View all</button>}</div>
            {isLoadingApartments ? <div className="flex min-h-64 items-center justify-center"><Clock className="h-6 w-6 animate-pulse text-orange-500" /></div> : recentProperties.length > 0 ? <div className="divide-y divide-slate-100">{recentProperties.map((apartment) => { const roomCount = apartment.rooms?.length ?? 0; const roomAvailable = apartment.rooms?.filter((room: any) => getRoomStatus(room) === "available").length ?? 0; return <button key={apartment.id} onClick={() => navigate(`/apartment/${apartment.id}`)} className="group flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0"><span className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">{apartment.image ? <img src={apartment.image} alt={apartment.title || "Property"} className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-slate-300" />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{apartment.title || "Untitled property"}</strong><span className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500"><MapPin className="h-3 w-3 shrink-0" />{apartment.address || apartment.city || "Address unavailable"}</span><span className="mt-2 flex flex-wrap gap-2"><Badge className="rounded-md bg-orange-50 text-orange-700">{roomCount} {roomCount === 1 ? "room" : "rooms"}</Badge><Badge className="rounded-md bg-emerald-50 text-emerald-700">{roomAvailable} available</Badge></span></span><ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500" /></button>; })}</div> : <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center"><Building2 className="mb-3 h-8 w-8 text-slate-300" /><h3 className="font-black text-slate-800">No properties yet</h3><p className="mt-1 text-sm font-medium text-slate-500">Add your first property to begin managing rooms and listings.</p><Link to="/add-apartment"><Button className="mt-4 rounded-md bg-orange-500 font-bold text-white hover:bg-orange-600"><Plus className="mr-2 h-4 w-4" />Add Property</Button></Link></div>}
          </motion.section>

          <div className="space-y-5">
            <motion.section variants={itemMotion} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-orange-600" /><h2 className="font-black text-slate-950">Recent Activity</h2></div>{recentActivity.length > 0 && <button onClick={() => setActiveSection("activity")} className="text-xs font-black text-orange-600">View all</button>}</div>
              {isLoadingActivityData ? <div className="flex min-h-44 items-center justify-center"><Clock className="h-6 w-6 animate-pulse text-orange-500" /></div> : recentActivity.length > 0 ? <div className="divide-y divide-slate-100">{recentActivity.slice(0, 4).map(({ id, timestamp, title, icon: Icon, tone }) => <div key={id} className="flex items-center gap-3 py-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800">{title}</span><time className="text-[10px] font-medium text-slate-400">{new Date(timestamp).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></span></div>)}</div> : <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center"><Clock className="mb-2 h-7 w-7 text-slate-300" /><p className="text-sm font-bold text-slate-700">No recent activity.</p><p className="text-xs text-slate-500">Views, favorites, and listing events will appear here.</p></div>}
            </motion.section>

            <motion.section variants={itemMotion} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-orange-600" /><h2 className="font-black text-slate-950">Quick Actions</h2></div>
              <div className="grid grid-cols-2 gap-2">{[{ label: "Add Property", icon: Plus, action: () => navigate("/add-apartment") }, { label: "My Properties", icon: Building2, action: () => setActiveSection("properties") }, { label: "Browse All", icon: Search, action: () => navigate("/browse") }, { label: "View Activity", icon: TrendingUp, action: () => setActiveSection("activity") }].map(({ label, icon: Icon, action }) => <button key={label} onClick={action} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs font-bold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"><Icon className="h-5 w-5" />{label}</button>)}</div>
            </motion.section>
          </div>
        </div>
      </motion.div>
    );
  };

  const handleProfilePhoto = async (file?: File) => {
    if (!file || !user?.id) return;
    setIsUploadingProfilePhoto(true);
    try {
      const avatar = await uploadUserAvatar(user.id, file);
      const next = { ...profile, avatar };
      const synced = await updateUserProfile({ id: user.id, email: next.email, name: `${next.firstName} ${next.lastName}`.trim(), role: "landlord", avatar_url: avatar });
      if (!synced) throw new Error("Unable to save profile photo.");
      updateProfile(() => next);
      setSavedProfile(next);
      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload profile photo.");
    } finally {
      setIsUploadingProfilePhoto(false);
      if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = "";
    }
  };

  const handleRemoveProfilePhoto = async () => {
    if (!user?.id || !profile.avatar) return;
    const synced = await updateUserProfile({ id: user.id, email: profile.email, name: `${profile.firstName} ${profile.lastName}`.trim(), role: "landlord", avatar_url: "" });
    if (!synced) return void toast.error("Unable to remove profile photo.");
    const next = { ...profile, avatar: "" };
    updateProfile(() => next);
    setSavedProfile(next);
    toast.success("Profile photo removed.");
  };

  const renderProperties = () => {
    const availablePropertiesCount = myApartments.filter((apartment) => getApartmentStatus(apartment) === "available").length;

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5 pb-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><Building2 className="h-6 w-6" /></span>
            <div><p className="text-xs font-black uppercase text-orange-600">My Properties</p><h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Your Listings</h1><p className="mt-1 text-sm font-medium text-slate-500">Manage rooms, publication, and listing performance.</p></div>
          </div>
          <Link to="/add-apartment"><Button className="h-11 w-full rounded-lg bg-orange-500 px-5 font-bold text-white shadow-sm hover:bg-orange-600 sm:w-auto"><Plus className="mr-2 h-4 w-4" />Add Property</Button></Link>
        </header>

        <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPropertyFilter("all")} className={`flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-black transition ${propertyFilter === "all" ? "border-orange-500 bg-orange-500 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50"}`}><LayoutGrid className="h-3.5 w-3.5" />All Units <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${propertyFilter === "all" ? "bg-white/20" : "bg-slate-100"}`}>{myApartments.length}</span></button>
            <button type="button" onClick={() => setPropertyFilter("available")} className={`flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-black transition ${propertyFilter === "available" ? "border-orange-500 bg-orange-500 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50"}`}><span className="h-2 w-2 rounded-full bg-emerald-500" />Available <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${propertyFilter === "available" ? "bg-white/20" : "bg-slate-100"}`}>{availablePropertiesCount}</span></button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-500"><span className="shrink-0">Sort by</span><select value={propertySort} onChange={(event) => setPropertySort(event.target.value as typeof propertySort)} className="min-w-32 bg-transparent font-black text-slate-800 outline-none"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Name</option><option value="price-high">Price: High</option><option value="price-low">Price: Low</option></select></label>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1"><button type="button" title="Grid view" onClick={() => setPropertyViewMode("grid")} className={`flex h-8 w-9 items-center justify-center rounded-md transition ${propertyViewMode === "grid" ? "bg-orange-500 text-white shadow-sm" : "text-slate-500 hover:bg-white"}`}><LayoutGrid className="h-4 w-4" /></button><button type="button" title="List view" onClick={() => setPropertyViewMode("list")} className={`flex h-8 w-9 items-center justify-center rounded-md transition ${propertyViewMode === "list" ? "bg-orange-500 text-white shadow-sm" : "text-slate-500 hover:bg-white"}`}><List className="h-4 w-4" /></button></div>
          </div>
        </section>

        {isLoadingApartments ? (
          <div className="flex min-h-96 items-center justify-center rounded-lg border border-slate-200 bg-white"><Clock className="h-7 w-7 animate-pulse text-orange-500" /></div>
        ) : myApartments.length === 0 ? (
          <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm"><span className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-orange-50 text-orange-500"><Building2 className="h-8 w-8" /></span><h2 className="text-xl font-black text-slate-900">No properties yet</h2><p className="mt-1 max-w-sm text-sm font-medium text-slate-500">Add your first property to begin managing rooms and making it visible to renters.</p><Link to="/add-apartment"><Button className="mt-5 rounded-lg bg-orange-500 font-bold text-white hover:bg-orange-600"><Plus className="mr-2 h-4 w-4" />Add Your First Property</Button></Link></div>
        ) : paginatedApartments.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center"><Search className="mb-3 h-8 w-8 text-slate-300" /><h2 className="font-black text-slate-800">No matching properties</h2><p className="mt-1 text-sm font-medium text-slate-500">Try selecting a different availability filter.</p><Button variant="outline" onClick={() => setPropertyFilter("all")} className="mt-4 rounded-md font-bold">Show All Units</Button></div>
        ) : (
          <div className={propertyViewMode === "grid" ? "grid gap-5 xl:grid-cols-2" : "space-y-4"}>
            {paginatedApartments.map((apartment) => {
              const status = getApartmentStatus(apartment);
              const statusOption = getStatusOption(status);
              const roomCount = apartment.rooms?.length ?? 0;
              const availableRooms = apartment.rooms?.filter((room: any) => getRoomStatus(room) === "available").length ?? 0;
              const location = apartment.address || [apartment.city, apartment.state].filter(Boolean).join(", ") || "Address unavailable";
              const roomOrBedCount = roomCount > 0 ? roomCount : Number(apartment.bedrooms ?? 0);
              return (
                <motion.article key={apartment.id} layout whileHover={{ y: -3 }} className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg ${propertyViewMode === "list" ? "md:grid md:grid-cols-[300px_minmax(0,1fr)]" : ""}`}>
                  <div className={`relative overflow-hidden bg-slate-100 ${propertyViewMode === "list" ? "min-h-64 md:h-full" : "aspect-[16/8]"}`}>
                    {apartment.image ? <img src={apartment.image} alt={apartment.title || "Property"} className="h-full w-full object-cover transition duration-500 hover:scale-105" /> : <div className="flex h-full min-h-56 items-center justify-center"><Building2 className="h-10 w-10 text-slate-300" /></div>}
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2"><Badge className="rounded-md bg-orange-500 text-white shadow-sm">Your Property</Badge><Badge className={`rounded-md border ${statusOption.className}`}>{statusOption.label}</Badge>{!apartment.isPublished && <Badge className="rounded-md bg-slate-800 text-white">Unpublished</Badge>}</div>
                  </div>
                  <div className="flex min-w-0 flex-col p-5">
                    <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate text-xl font-black text-slate-950">{apartment.title || "Untitled property"}</h2><p className="mt-1 flex items-center gap-1 truncate text-sm font-medium text-slate-500"><MapPin className="h-4 w-4 shrink-0 text-orange-500" />{location}</p></div><div className="shrink-0 text-right"><p className="text-xl font-black text-orange-600">PHP {Number(apartment.price ?? 0).toLocaleString("en-PH")}</p><p className="text-xs font-medium text-slate-500">per month</p></div></div>
                    <div className="mt-4 grid grid-cols-3 gap-2">{[{ label: roomCount > 0 ? "Rooms" : "Beds", value: roomOrBedCount, icon: BedDouble }, { label: "Bathrooms", value: Number(apartment.bathrooms ?? 0), icon: Bath }, { label: "Floor Area", value: Number(apartment.sqft ?? 0) > 0 ? `${Number(apartment.sqft).toLocaleString("en-PH")} sqft` : "Unavailable", icon: Ruler }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-3"><Icon className="mb-2 h-4 w-4 text-orange-500" /><strong className="block truncate text-sm text-slate-900">{value}</strong><span className="text-[10px] font-semibold text-slate-500">{label}</span></div>)}</div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2"><Badge className="rounded-md bg-emerald-100 text-emerald-700">{statusOption.label}</Badge><span className="text-xs font-bold text-slate-600">{availableRooms} available / {roomCount} total rooms</span></div>
                    <div className="mt-4 grid grid-cols-2 gap-2"><Link to={`/apartment/${apartment.id}`} state={{ returnTo: "/dashboard?section=properties" }}><Button variant="outline" className="h-10 w-full rounded-md border-orange-200 font-bold text-orange-700 hover:bg-orange-50"><Eye className="mr-2 h-4 w-4" />View Property</Button></Link><Link to={`/landlord/properties/${apartment.id}/rooms`}><Button className="h-10 w-full rounded-md bg-orange-500 font-bold text-white hover:bg-orange-600">Manage Rooms</Button></Link></div>
                    <div className="mt-2 grid grid-cols-3 gap-2"><button onClick={() => openViewers(apartment.id, apartment.title, aptViews(apartment.id))} className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"><Eye className="h-4 w-4 text-orange-500" />{aptViews(apartment.id)} Views</button><button onClick={() => openFavoriters(apartment.id, apartment.title, aptFavs(apartment.id))} className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"><Heart className="h-4 w-4 text-rose-500" />{aptFavs(apartment.id)} Saved</button><button onClick={() => setEditingApartment(apartment as Apartment)} className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"><Edit2 className="h-4 w-4 text-blue-500" />Edit</button></div>
                    <div className="mt-2 grid grid-cols-2 gap-2">{apartment.isPublished ? <Button variant="outline" onClick={() => void handleTogglePublication(apartment.id, false)} className="h-10 rounded-md border-orange-200 font-bold text-orange-700 hover:bg-orange-50"><EyeOff className="mr-2 h-4 w-4" />Unpublish</Button> : <Button variant="outline" onClick={() => void handleTogglePublication(apartment.id, true)} className="h-10 rounded-md border-emerald-200 font-bold text-emerald-700 hover:bg-emerald-50"><EyeOpen className="mr-2 h-4 w-4" />Publish</Button>}<Button variant="outline" disabled={deletingApartmentId === apartment.id} onClick={() => void handleDeleteApartment(apartment.id)} className="h-10 rounded-md border-red-200 font-bold text-red-600 hover:bg-red-50"><Trash2 className="mr-2 h-4 w-4" />{deletingApartmentId === apartment.id ? "Deleting..." : "Delete"}</Button></div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        {filteredApartments.length > 0 && <footer className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-500 shadow-sm sm:flex-row sm:items-center sm:justify-between"><span>Showing {(safePropertyPage - 1) * propertiesPerPage + 1}-{Math.min(safePropertyPage * propertiesPerPage, filteredApartments.length)} of {filteredApartments.length} properties</span><div className="flex flex-wrap items-center gap-2"><button type="button" title="Previous page" disabled={safePropertyPage <= 1} onClick={() => setPropertyPage(Math.max(1, safePropertyPage - 1))} className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"><ChevronRight className="h-4 w-4 rotate-180" /></button><span className="flex h-9 min-w-9 items-center justify-center rounded-md bg-orange-500 px-3 font-black text-white">{safePropertyPage}</span><button type="button" title="Next page" disabled={safePropertyPage >= propertyPageCount} onClick={() => setPropertyPage(Math.min(propertyPageCount, safePropertyPage + 1))} className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button><label className="ml-1 flex items-center gap-2 text-xs font-bold"><span>Per page</span><select value={propertiesPerPage} onChange={(event) => setPropertiesPerPage(Number(event.target.value))} className="h-9 rounded-md border border-slate-200 bg-white px-2 font-black text-slate-800"><option value={6}>6</option><option value={10}>10</option><option value={20}>20</option></select></label></div></footer>}
      </motion.div>
    );
  };

  const renderActivity = () => {
    const rangeDays = activityRange === "7d" ? 7 : activityRange === "30d" ? 30 : activityRange === "90d" ? 90 : null;
    const rangeStart = rangeDays === null ? null : Date.now() - rangeDays * 24 * 60 * 60 * 1000;
    const isInSelectedRange = (value: string | null | undefined) => {
      if (rangeStart === null) return true;
      if (!value) return false;
      const timestamp = new Date(value).getTime();
      return !Number.isNaN(timestamp) && timestamp >= rangeStart;
    };
    const rangedViews = landlordViewRows.filter((view) => isInSelectedRange(view.viewed_at));
    const rangedFavorites = landlordFavoriteRows.filter((favorite) => isInSelectedRange(favorite.created_at));
    const activeProperties = myApartments.filter((apartment) => apartment.isPublished !== false && getApartmentStatus(apartment) !== "maintenance").length;
    const availabilityRate = totalUnits > 0 ? Math.round((availableCount / totalUnits) * 100) : 0;
    const propertyPerformance = myApartments
      .map((apartment) => {
        const views = rangedViews
          .filter((view) => (view.apartment_id ?? view.apartmentId) === apartment.id)
          .reduce((total, view) => total + getViewWeight(view), 0);
        const saves = rangedFavorites.filter((favorite) => (favorite.apartment_id ?? favorite.apartmentId) === apartment.id).length;
        const roomCount = apartment.rooms?.length ?? 0;
        const availableRooms = apartment.rooms?.filter((room: any) => getRoomStatus(room) === "available").length ?? 0;
        return { apartment, views, saves, roomCount, availableRooms };
      })
      .filter((item) => item.views > 0 || item.saves > 0)
      .sort((left, right) => (right.views + right.saves) - (left.views + left.saves));
    const hasActivity = rangedViews.length > 0 || rangedFavorites.length > 0;
    const summaryCards = [
      { label: "Total Views", value: rangedViews.reduce((total, view) => total + getViewWeight(view), 0), suffix: "", icon: Eye, tone: "bg-orange-50 text-orange-600" },
      { label: "Total Saves", value: rangedFavorites.length, suffix: "", icon: Heart, tone: "bg-rose-50 text-rose-600" },
      { label: "Active Properties", value: activeProperties, suffix: "", icon: Building2, tone: "bg-violet-50 text-violet-600" },
      { label: "Availability Rate", value: availabilityRate, suffix: "%", icon: TrendingUp, tone: "bg-emerald-50 text-emerald-600" },
    ];

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5 pb-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><TrendingUp className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase text-orange-600">Activity</p><h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Property Activity</h1><p className="mt-1 text-sm font-medium text-slate-500">Track real views, saves, and availability across your listings.</p></div></div>
          <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-500 shadow-sm"><Calendar className="h-4 w-4 text-orange-600" /><select value={activityRange} onChange={(event) => setActivityRange(event.target.value as typeof activityRange)} className="min-w-28 bg-transparent font-black text-slate-800 outline-none"><option value="all">All Time</option><option value="7d">Last 7 Days</option><option value="30d">Last 30 Days</option><option value="90d">Last 90 Days</option></select></label>
        </header>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {summaryCards.map(({ label, value, suffix, icon: Icon, tone }) => <motion.div key={label} whileHover={{ y: -3 }} className="flex min-h-28 items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-lg"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span><span className="min-w-0"><strong className="block text-2xl text-slate-950">{value.toLocaleString()}{suffix}</strong><span className="block text-xs font-semibold text-slate-500">{label}</span></span></motion.div>)}
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-orange-600" /><div><h2 className="font-black text-slate-950">Property Performance</h2><p className="text-xs font-medium text-slate-500">Activity recorded during the selected period.</p></div></div><div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1"><button type="button" onClick={() => setActivityViewMode("list")} className={`flex h-9 items-center gap-2 rounded-md px-3 text-xs font-bold transition ${activityViewMode === "list" ? "bg-orange-500 text-white shadow-sm" : "text-slate-500 hover:bg-white"}`}><List className="h-4 w-4" />List</button><button type="button" onClick={() => setActivityViewMode("grid")} className={`flex h-9 items-center gap-2 rounded-md px-3 text-xs font-bold transition ${activityViewMode === "grid" ? "bg-orange-500 text-white shadow-sm" : "text-slate-500 hover:bg-white"}`}><LayoutGrid className="h-4 w-4" />Grid</button></div></div>

          <div className="p-4 sm:p-5">
            {isLoadingApartments || isLoadingActivityData ? (
              <div className="flex min-h-80 items-center justify-center"><Clock className="h-7 w-7 animate-pulse text-orange-500" /></div>
            ) : myApartments.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center"><Building2 className="mb-3 h-9 w-9 text-slate-300" /><h3 className="font-black text-slate-800">No properties to track</h3><p className="mt-1 text-sm font-medium text-slate-500">Property activity will appear after you add a listing.</p><Link to="/add-apartment"><Button className="mt-4 rounded-md bg-orange-500 font-bold text-white hover:bg-orange-600"><Plus className="mr-2 h-4 w-4" />Add Property</Button></Link></div>
            ) : !hasActivity ? (
              <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center"><TrendingUp className="mb-3 h-9 w-9 text-slate-300" /><h3 className="font-black text-slate-800">No activity in this period</h3><p className="mt-1 max-w-sm text-sm font-medium text-slate-500">Views and saves from renters will appear here when activity is recorded.</p>{activityRange !== "all" && <Button variant="outline" onClick={() => setActivityRange("all")} className="mt-4 rounded-md border-orange-200 font-bold text-orange-700">View All-Time Activity</Button>}</div>
            ) : (
              <div className={activityViewMode === "grid" ? "grid gap-4 xl:grid-cols-2" : "space-y-3"}>
                {propertyPerformance.map(({ apartment, views, saves, roomCount, availableRooms }) => {
                  const statusOption = getStatusOption(getApartmentStatus(apartment));
                  const location = apartment.address || [apartment.city, apartment.state].filter(Boolean).join(", ") || "Address unavailable";
                  const updatedAt = apartment.updatedAt ?? apartment.createdAt;
                  return <motion.article key={apartment.id} layout whileHover={{ y: -2 }} className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md ${activityViewMode === "list" ? "md:grid md:grid-cols-[180px_minmax(0,1fr)]" : ""}`}>
                    <div className={`flex items-center justify-center overflow-hidden bg-slate-100 ${activityViewMode === "grid" ? "aspect-[16/8]" : "min-h-44"}`}>{apartment.image ? <img src={apartment.image} alt={apartment.title || "Property"} className="h-full w-full object-cover" /> : <Building2 className="h-9 w-9 text-slate-300" />}</div>
                    <div className="flex min-w-0 flex-col justify-between gap-4 p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h3 className="truncate text-lg font-black text-slate-950">{apartment.title || "Untitled property"}</h3><p className="mt-1 flex items-center gap-1 truncate text-xs font-medium text-slate-500"><MapPin className="h-3.5 w-3.5 shrink-0 text-orange-500" />{location}</p></div><Button variant="outline" onClick={() => navigate(`/apartment/${apartment.id}`)} className="h-9 shrink-0 rounded-md border-orange-200 text-xs font-bold text-orange-700 hover:bg-orange-50">View Details<ChevronRight className="ml-1 h-3.5 w-3.5" /></Button></div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-lg bg-orange-50 p-3"><Eye className="mb-1 h-4 w-4 text-orange-600" /><strong className="block text-sm text-slate-900">{views}</strong><span className="text-[10px] font-semibold text-slate-500">Views</span></div><div className="rounded-lg bg-rose-50 p-3"><Heart className="mb-1 h-4 w-4 text-rose-600" /><strong className="block text-sm text-slate-900">{saves}</strong><span className="text-[10px] font-semibold text-slate-500">Saved</span></div><div className="rounded-lg bg-emerald-50 p-3"><span className="mb-1 block h-2 w-2 rounded-full bg-emerald-500" /><strong className="block text-xs text-emerald-700">{statusOption.label}</strong><span className="text-[10px] font-semibold text-slate-500">{availableRooms}/{roomCount} rooms</span></div><div className="rounded-lg bg-slate-50 p-3"><Calendar className="mb-1 h-4 w-4 text-slate-500" /><strong className="block text-[11px] text-slate-700">{updatedAt ? new Date(updatedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "Unavailable"}</strong><span className="text-[10px] font-semibold text-slate-500">Last updated</span></div></div>
                    </div>
                  </motion.article>;
                })}
              </div>
            )}
          </div>
        </section>
      </motion.div>
    );
  };

  const renderNotifications = () => {
    const isNotificationRead = (notification: DashboardNotificationRow) => (notification.read ?? notification.is_read) === true;
    const getNotificationCategory = (notification: DashboardNotificationRow): "reports" | "verification" | "apartments" | "system" => {
      const value = `${notification.type ?? ""} ${notification.title ?? ""}`.toLowerCase();
      if (value.includes("report") || value.includes("violation") || value.includes("appeal")) return "reports";
      if (value.includes("verif") || value.includes("permit")) return "verification";
      if (["apartment", "property", "room", "favorite", "view", "application", "inquiry"].some((keyword) => value.includes(keyword))) return "apartments";
      return "system";
    };
    const getNotificationPriority = (notification: DashboardNotificationRow) => {
      const payload = notification.payload as Record<string, unknown> | null | undefined;
      const explicitPriority = String(payload?.priority ?? payload?.severity ?? "").toLowerCase();
      const value = `${notification.type ?? ""} ${notification.title ?? ""}`.toLowerCase();
      return ["high", "urgent", "critical"].includes(explicitPriority) || value.includes("violation") || value.includes("urgent");
    };
    const getCategoryMeta = (category: "reports" | "verification" | "apartments" | "system") => {
      if (category === "reports") return { label: "Reports", icon: Flag, tone: "bg-rose-50 text-rose-600", badge: "bg-rose-50 text-rose-700" };
      if (category === "verification") return { label: "Verification", icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-600", badge: "bg-emerald-50 text-emerald-700" };
      if (category === "apartments") return { label: "Apartments", icon: Home, tone: "bg-blue-50 text-blue-600", badge: "bg-blue-50 text-blue-700" };
      return { label: "System", icon: Megaphone, tone: "bg-orange-50 text-orange-600", badge: "bg-orange-50 text-orange-700" };
    };
    const unreadCount = notifications.filter((notification) => !isNotificationRead(notification)).length;
    const readCount = notifications.length - unreadCount;
    const highPriorityCount = notifications.filter(getNotificationPriority).length;
    const categoryCounts = {
      reports: notifications.filter((notification) => getNotificationCategory(notification) === "reports").length,
      verification: notifications.filter((notification) => getNotificationCategory(notification) === "verification").length,
      apartments: notifications.filter((notification) => getNotificationCategory(notification) === "apartments").length,
      system: notifications.filter((notification) => getNotificationCategory(notification) === "system").length,
    };
    const visibleNotifications = notifications
      .filter((notification) => {
        const query = notifSearch.trim().toLowerCase();
        const matchesSearch = !query || `${notification.title ?? ""} ${notification.message ?? ""} ${notification.type ?? ""}`.toLowerCase().includes(query);
        const read = isNotificationRead(notification);
        const matchesReadFilter = notifFilter === "all" || (notifFilter === "read" ? read : !read);
        const category = getNotificationCategory(notification);
        const matchesCategory = notifCategory === "all" || (notifCategory === "unread" ? !read : category === notifCategory);
        return matchesSearch && matchesReadFilter && matchesCategory;
      })
      .sort((left, right) => {
        const leftTime = new Date(left.created_at ?? left.createdAt ?? 0).getTime();
        const rightTime = new Date(right.created_at ?? right.createdAt ?? 0).getTime();
        return notifSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
      });
    const newestNotification = [...notifications].sort((left, right) => new Date(right.created_at ?? right.createdAt ?? 0).getTime() - new Date(left.created_at ?? left.createdAt ?? 0).getTime())[0];
    const getDateKey = (notification: DashboardNotificationRow) => {
      const value = notification.created_at ?? notification.createdAt;
      if (!value) return "Date unavailable";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "Date unavailable";
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      if (date.toDateString() === today.toDateString()) return "Today";
      if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
      return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
    };
    const summaryCards = [
      { label: "Total Notifications", value: notifications.length, icon: Bell, tone: "bg-orange-50 text-orange-600" },
      { label: "Unread", value: unreadCount, icon: Mail, tone: "bg-violet-50 text-violet-600" },
      { label: "Read", value: readCount, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
      { label: "High Priority", value: highPriorityCount, icon: Flag, tone: "bg-rose-50 text-rose-600" },
    ];
    const tabs: Array<{ key: typeof notifCategory; label: string; count?: number; icon: typeof Bell }> = [
      { key: "all", label: "All", count: notifications.length, icon: LayoutGrid },
      { key: "unread", label: "Unread", count: unreadCount, icon: Mail },
      { key: "reports", label: "Reports", count: categoryCounts.reports, icon: Flag },
      { key: "verification", label: "Verification", count: categoryCounts.verification, icon: ShieldCheck },
      { key: "apartments", label: "Apartments", count: categoryCounts.apartments, icon: Home },
      { key: "system", label: "System", count: categoryCounts.system, icon: Megaphone },
    ];

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5 pb-8">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><Bell className="h-6 w-6" /></span><div><h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Notifications</h1><p className="mt-1 text-sm font-medium text-slate-500">Track updates and administrative actions related to your properties.</p></div></div>
          <div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" disabled={unreadCount === 0 || isMarkingAllNotifs} onClick={() => void markAllLandlordNotificationsRead()} className="h-10 rounded-lg border-orange-200 font-bold text-orange-700 hover:bg-orange-50"><CheckCheck className="mr-2 h-4 w-4" />{isMarkingAllNotifs ? "Updating..." : "Mark all as read"}</Button><label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-500"><SlidersHorizontal className="h-4 w-4" /><select value={notifFilter} onChange={(event) => setNotifFilter(event.target.value as typeof notifFilter)} className="bg-transparent font-black text-slate-800 outline-none"><option value="all">All statuses</option><option value="unread">Unread</option><option value="read">Read</option></select></label><label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-500"><span>Sort</span><select value={notifSort} onChange={(event) => setNotifSort(event.target.value as typeof notifSort)} className="bg-transparent font-black text-slate-800 outline-none"><option value="newest">Newest</option><option value="oldest">Oldest</option></select></label></div>
        </header>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">{summaryCards.map(({ label, value, icon: Icon, tone }) => <motion.div key={label} whileHover={{ y: -3 }} className="flex min-h-28 items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-lg"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span><span><strong className="block text-2xl text-slate-950">{value}</strong><span className="text-xs font-semibold text-slate-500">{label}</span></span></motion.div>)}</section>

        <section className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm"><div className="flex gap-2 overflow-x-auto">{tabs.map(({ key, label, count, icon: Icon }) => <button key={key} onClick={() => setNotifCategory(key)} className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-black transition ${notifCategory === key ? "bg-orange-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><Icon className="h-4 w-4" />{label}{typeof count === "number" && count > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${notifCategory === key ? "bg-white/20" : "bg-slate-100"}`}>{count}</span>}</button>)}</div></section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-3">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={notifSearch} onChange={(event) => setNotifSearch(event.target.value)} placeholder="Search notifications" className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium shadow-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></div>
            {isLoadingNotifications ? <div className="flex min-h-96 items-center justify-center rounded-lg border border-slate-200 bg-white"><Clock className="h-7 w-7 animate-pulse text-orange-500" /></div> : <>
            {visibleNotifications.length > 0 ? <div className="space-y-3">{visibleNotifications.map((notification, index) => { const read = isNotificationRead(notification); const category = getNotificationCategory(notification); const meta = getCategoryMeta(category); const Icon = meta.icon; const highPriority = getNotificationPriority(notification); const notificationId = notification.id ?? `notification-${index}`; const dateKey = getDateKey(notification); const previousDateKey = index > 0 ? getDateKey(visibleNotifications[index - 1]) : null; const createdAt = notification.created_at ?? notification.createdAt; return <div key={notificationId}>{dateKey !== previousDateKey && <div className="mb-2 mt-4 flex items-center gap-2 first:mt-0"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /><h2 className="text-xs font-black text-slate-700">{dateKey}</h2></div>}<article className={`relative flex gap-3 rounded-lg border p-4 shadow-sm transition hover:shadow-md sm:p-5 ${read ? "border-slate-200 bg-white" : "border-orange-200 bg-orange-50/30"}`}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-900">{notification.title || notification.type || "Notification"}</h3>{!read && <Badge className="rounded-md bg-blue-50 text-blue-700">New</Badge>}{highPriority && <Badge className="rounded-md bg-rose-50 text-rose-700">High Priority</Badge>}</div><p className="mt-1 text-sm font-medium leading-6 text-slate-600">{notification.message || "No additional details were provided."}</p><div className="mt-3 flex flex-wrap items-center gap-2"><Badge className={`rounded-md ${meta.badge}`}>{meta.label}</Badge><time className="text-[11px] font-semibold text-slate-400">{createdAt ? new Date(createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Time unavailable"}</time><button onClick={() => void handleNotificationClick(notification)} className="ml-auto text-xs font-black text-orange-600 hover:text-orange-700">View details</button></div></div>{notification.id && <div className="relative"><button title="Notification actions" onClick={() => setOpenNotifMenuId(openNotifMenuId === notification.id ? null : notification.id!)} className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><MoreVertical className="h-4 w-4" /></button>{openNotifMenuId === notification.id && <div className="absolute right-0 top-10 z-20 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-xl"><button onClick={() => void handleNotificationClick(notification)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"><Eye className="h-4 w-4" />View details</button><button onClick={() => void toggleNotifReadStatus(notification.id!, read)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50">{read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}{read ? "Mark unread" : "Mark read"}</button><button disabled={deletingNotifId === notification.id} onClick={() => void deleteNotif(notification.id!)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />Delete</button></div>}</div>}</article></div>; })}</div> : notifications.length === 0 ? <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center"><Bell className="mb-3 h-10 w-10 text-slate-300" /><h2 className="text-lg font-black text-slate-800">No notifications yet</h2><p className="mt-1 text-sm font-medium text-slate-500">Updates about your properties and account will appear here.</p></div> : <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center"><Search className="mb-3 h-9 w-9 text-slate-300" /><h2 className="font-black text-slate-800">No matching notifications</h2><p className="mt-1 text-sm font-medium text-slate-500">Try changing the search, category, or status filter.</p></div>}
            </>}
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-orange-100 bg-white p-5 shadow-sm"><div className="mb-4 flex h-20 items-center justify-center rounded-lg bg-orange-50"><Bell className="h-10 w-10 text-orange-500" /></div><h2 className="font-black text-slate-900">Recent Notification</h2>{newestNotification ? <div className="mt-3 rounded-lg border border-orange-100 bg-orange-50/40 p-4"><h3 className="text-sm font-black text-slate-800">{newestNotification.title || newestNotification.type || "Notification"}</h3><p className="mt-1 line-clamp-3 text-xs font-medium leading-5 text-slate-600">{newestNotification.message || "No additional details were provided."}</p><Button variant="outline" onClick={() => void handleNotificationClick(newestNotification)} className="mt-3 h-9 rounded-md border-orange-200 text-xs font-bold text-orange-700 hover:bg-orange-50">View Details</Button></div> : <p className="mt-2 text-sm font-medium text-slate-500">No recent notification.</p>}</section>
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-3 font-black text-slate-900">Quick Actions</h2><div className="space-y-2"><button onClick={() => { setSettingsTab("alerts"); setActiveSection("settings"); }} className="flex w-full items-center gap-3 rounded-lg border border-slate-100 p-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"><Settings className="h-4 w-4 text-orange-500" /><span className="flex-1">Notification Settings</span><ChevronRight className="h-4 w-4 text-slate-300" /></button><button onClick={() => { setSettingsTab("alerts"); setActiveSection("settings"); }} className="flex w-full items-center gap-3 rounded-lg border border-slate-100 p-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"><Bell className="h-4 w-4 text-violet-500" /><span className="flex-1">Manage Preferences</span><ChevronRight className="h-4 w-4 text-slate-300" /></button><button disabled={readCount === 0 || isClearingReadNotifs} onClick={() => void clearReadLandlordNotifications()} className="flex w-full items-center gap-3 rounded-lg border border-slate-100 p-3 text-left text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /><span className="flex-1">{isClearingReadNotifs ? "Clearing..." : "Clear Read Notifications"}</span><ChevronRight className="h-4 w-4 text-slate-300" /></button></div></section>
          </aside>
        </div>
      </motion.div>
    );
  };

  const sectionMap: Record<string, () => ReactElement> = {
    overview:      renderOverview,
    properties:    renderProperties,
    activity:      renderActivity,
    notifications: renderNotifications,
    settings:      renderSettings,
    help:          renderHelp,
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-50">
      <div className="flex h-full">

        {/* Desktop Sidebar */}
        <aside className="hidden h-full w-60 shrink-0 flex-col bg-slate-950 shadow-xl lg:flex">
          <SidebarContent />
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Mobile drawer */}
        <aside className={`fixed left-0 top-0 z-50 h-full w-64 bg-slate-950 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all z-10"
          >
            <X className="h-4 w-4" />
          </button>
          <SidebarContent />
        </aside>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-white shadow-lg transition hover:bg-orange-600 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Main content */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto">
          <main className="px-4 py-5 pt-16 md:px-6 lg:px-8 lg:pt-6">
            {(sectionMap[activeSection] ?? renderOverview)()}
          </main>
        </div>
      </div>

      {/* People modal */}
      <PeopleModal
        open={modal.open}
        onClose={closeModal}
        title={modal.type === "views" ? "Viewers" : "Saved by"}
        subtitle={modal.aptTitle}
        icon={modal.type === "views" ? Eye : Heart}
        iconColor={modal.type === "views" ? "bg-gradient-to-br from-amber-500 to-orange-500" : "bg-gradient-to-br from-rose-400 to-pink-500"}
        names={modal.names}
      />

      {editingApartment && (
        <EditApartmentDialog
          apartment={editingApartment}
          open={Boolean(editingApartment)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingApartment(null);
            }
          }}
          onSave={handleSaveEditedApartment}
        />
      )}

      {/* Appeal modal */}
      {appealModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setAppealModal({ open: false, violationId: null, violationType: "" })}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-amber-100 overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-amber-100 bg-amber-50/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow bg-gradient-to-br from-amber-500 to-orange-600">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-slate-900">Submit Appeal</p>
                  <p className="text-xs text-slate-400 font-medium">{appealModal.violationType}</p>
                </div>
              </div>
              <button onClick={() => setAppealModal({ open: false, violationId: null, violationType: "" })} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Appeal Message (required)</label>
                  <span className="text-[10px] text-slate-400">{appealMessage.length}/500</span>
                </div>
                <textarea
                  rows={4} maxLength={500}
                  value={appealMessage}
                  onChange={(e) => setAppealMessage(e.target.value)}
                  placeholder="Explain your appeal and provide any supporting information…"
                  className="w-full rounded-xl border-2 border-amber-100 bg-amber-50/30 px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Appeal Status</label>
                <select
                  value={appealStatus}
                  onChange={(e) => setAppealStatus(e.target.value as any)}
                  className="w-full rounded-xl border-2 border-amber-100 bg-amber-50/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className={`flex gap-3 p-3 rounded-xl border bg-amber-50 border-amber-100`}>
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="text-xs font-medium text-amber-700">
                  Your appeal will be reviewed by an administrator. Please provide clear and detailed information.
                </p>
              </div>
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-amber-50 flex gap-3">
              <Button onClick={async () => {
                if (!appealMessage.trim()) {
                  toast.error("Please enter an appeal message");
                  return;
                }
                if (!user?.id || !appealModal.violationId) {
                  toast.error("Missing required information");
                  return;
                }

                try {
                  await createAppeal({
                    violation_id: appealModal.violationId,
                    landlord_id: user.id,
                    reason: appealModal.violationType || "Violation Appeal",
                    description: appealMessage,
                  });
                  toast.success("Appeal submitted successfully");
                  setAppealModal({ open: false, violationId: null, violationType: "" });
                  setAppealMessage("");
                  setAppealStatus("under_review");
                  // Refresh violations to show updated status
                  const allViolations = await fetchViolations();
                  setViolations(allViolations.filter((v) => v.landlord_id === user.id || v.landlordId === user.id));
                } catch (err) {
                  toast.error("Failed to submit appeal");
                }
              }}
                className="flex-1 font-bold rounded-xl shadow-md text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                <MessageSquare className="h-4 w-4 mr-2 inline" />
                Submit Appeal
              </Button>
              <Button variant="outline" onClick={() => setAppealModal({ open: false, violationId: null, violationType: "" })} className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
