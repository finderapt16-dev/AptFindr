import { useState, useEffect, useMemo, type ReactElement } from "react";
import {
  deleteApartment as deleteApartmentInDb,
  fetchApartmentsForLandlord,
  updateApartment,
  updateApartmentPublication,
  updateApartmentStatus,
  type Apartment,
  type ApartmentStatus,
} from "@/app/data/apartments";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  fetchApartmentViews,
  fetchFavorites,
  fetchUsers,
  updateUserProfile,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markNotificationUnread,
  deleteNotification,
  deleteAllNotifications,
  fetchViolations,
  createAppeal,
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
  Send,
  AlertTriangle,
  Eye as EyeOpen,
  EyeOff,
  CheckCircle2,
  MessageSquare,
  Mail,
  MailOpen,
} from "lucide-react";

// ── Nav groups ───────────────────────────────────────────────────────────────
const NAV_MAIN = [
  { icon: LayoutDashboard, label: "Overview",       section: "overview",       isLink: false },
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
  { icon: HelpCircle, label: "Help",     section: "help",     isLink: false },
];

const STATUS_OPTIONS: { value: ApartmentStatus; label: string; className: string }[] = [
  { value: "available", label: "Available", className: "bg-green-100 text-green-700 border-green-200" },
  { value: "occupied", label: "Occupied", className: "bg-red-100 text-red-700 border-red-200" },
  { value: "reserved", label: "Reserved", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "maintenance", label: "Under Maintenance", className: "bg-slate-100 text-slate-600 border-slate-200" },
];

const getStatusOption = (status?: string) =>
  STATUS_OPTIONS.find((option) => option.value === status) ?? STATUS_OPTIONS[0];

// ── Realistic placeholder names ──────────────────────────────────────────────
const VIEWER_NAMES = [
  "Maria Santos",   "Juan dela Cruz",   "Ana Reyes",      "Carlo Mendoza",
  "Liza Garcia",    "Miguel Torres",    "Rosa Villanueva","Paolo Castillo",
  "Cristina Lim",   "Andrei Fernandez", "Jasmine Aquino", "Mark Bautista",
  "Sheila Ramos",   "Dennis Navarro",   "Lovely Cruz",    "Jerome Manalo",
  "Patricia Sy",    "Rodel Abad",       "Maribel Tan",    "Francis Ocampo",
  "Gina Pascual",   "Ryan Flores",      "Elena Morales",  "Jose Domingo",
  "Aileen Soriano", "Benedict Reyes",   "Nica Salazar",   "Raffy Gomez",
  "Theresa Aguilar","Ken Villanueva",
];

const FAVORITER_NAMES = [
  "Camille Buenaventura", "Jomar Evangelista",  "Shaina dela Torre",
  "Aldrin Macapagal",     "Tricia Soriano",     "Nelson Bañez",
  "Maricel Concepcion",   "Renz Ybañez",        "Danica Espiritu",
  "Joseph Magbanua",      "Kristine Abella",    "Arvin Paras",
  "Joanna Dimaculangan",  "Mark Lagonera",      "Sheena Caballes",
  "Harvy Ilustrisimo",    "Melissa Balderama",  "Jhun Recio",
];

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [apartmentsRefresh, setApartmentsRefresh] = useState(0);
  const [supportForm, setSupportForm] = useState({
    topic: "",
    message: "",
    contact: user?.email || "",
  });
  const [propertyFilter, setPropertyFilter] = useState<"all" | ApartmentStatus>("all");
  const [favoriteRows, setFavoriteRows] = useState<DashboardFavoriteRow[]>([]);
  const [viewRows, setViewRows] = useState<DashboardApartmentViewRow[]>([]);
  const [favoriteUsers, setFavoriteUsers] = useState<DashboardUserRow[]>([]);
  const [notifications, setNotifications] = useState<DashboardNotificationRow[]>([]);
  const [violations, setViolations] = useState<DashboardViolationRow[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notifSearch, setNotifSearch] = useState("");
  const [notifFilter, setNotifFilter] = useState<"all" | "read" | "unread">("all");

  // Loading states for action prevention
  const [deletingNotifId, setDeletingNotifId] = useState<string | null>(null);
  const [isDeletingAllNotifs, setIsDeletingAllNotifs] = useState(false);
  const [deletingApartmentId, setDeletingApartmentId] = useState<string | null>(null);
  const [updatingApartmentStatusId, setUpdatingApartmentStatusId] = useState<string | null>(null);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const deleteNotif = (notificationId: string) => {
    if (deletingNotifId === notificationId) {
      toast.error("Deletion in progress...");
      return;
    }
    setDeletingNotifId(notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    if (user?.id) {
      void deleteNotification(notificationId, user.id).finally(() => {
        setDeletingNotifId(null);
      });
    } else {
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

  const toggleNotifReadStatus = (notificationId: string, isCurrentlyRead: boolean) => {
    const updated = notifications.map((n) =>
      n.id === notificationId ? { ...n, read: !isCurrentlyRead, is_read: !isCurrentlyRead } : n
    );
    setNotifications(updated);
    if (user?.id) {
      if (isCurrentlyRead) {
        void markNotificationUnread(notificationId, user.id);
      } else {
        void markNotificationRead(notificationId, user.id);
      }
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

  const myViolationsCount = violations.filter((v) => v.landlord_id === user?.id || v.landlordId === user?.id).length;

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
          : view.viewer_id ?? view.viewerId ?? "Viewer";
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
          : favorite.user_id ?? favorite.userId ?? "Saved renter";
      });
    setModal({ open: true, type: "favorites", names: names.slice(0, count || names.length), aptTitle });
  };
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const handleSupportSubmit = () => {
    if (!supportForm.topic || !supportForm.message.trim()) {
      toast.error("Please choose a topic and describe your concern.");
      return;
    }

    const tickets = JSON.parse(localStorage.getItem("supportTickets") || "[]");
    tickets.unshift({
      id: Date.now().toString(),
      userId: user?.id,
      name: user?.name || "Landlord",
      email: user?.email || "",
      role: user?.role || "landlord",
      topic: supportForm.topic,
      message: supportForm.message.trim(),
      contact: supportForm.contact.trim(),
      status: "open",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("supportTickets", JSON.stringify(tickets));
    setSupportSubmitted(true);
    setSupportForm({ topic: "", message: "", contact: user?.email || "" });
    toast.success("Support request sent!");
  };

  const [myApartments, setMyApartments] = useState<any[]>([]);

  useEffect(() => {
    let active = true;

    const loadLandlordApartments = async () => {
      if (!user?.id) {
        setMyApartments([]);
        return;
      }

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
      }
    };

    void loadActivityData();

    return () => {
      active = false;
    };
  }, [apartmentsRefresh]);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      if (!user?.id) {
        setNotifications([]);
        setUnreadNotificationCount(0);
        return;
      }

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
    if (!notification.read && notification.id) {
      await markNotificationRead(notification.id, user?.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
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
  const totalViews     = landlordViewRows.length;
  const totalInquiries = landlordFavoriteRows.length;
  const occupancyRate  = myApartments.length > 0
    ? Math.round((occupiedCount / (totalUnits || myApartments.length)) * 100)
    : 0;

  const aptViews = (aptId: string) => {
    return viewRows.filter((view) => (view.apartment_id ?? view.apartmentId) === aptId).length;
  };
  const aptFavs = (aptId: string) => {
    return favoriteRows.filter((favorite) => (favorite.apartment_id ?? favorite.apartmentId) === aptId).length;
  };
  const filteredApartments = propertyFilter === "all"
    ? myApartments
    : myApartments.filter((apartment) => getApartmentStatus(apartment) === propertyFilter);

  const handleTogglePublication = async (apartmentId: string, nextValue: boolean) => {
    try {
      await updateApartmentPublication(apartmentId, nextValue);
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
      await updateApartmentStatus(apartmentId, status);
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
    if (user) {
      const storageKey = `landlordProfile_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved) as LandlordProfile;
        } catch {
          // Fall through to default
        }
      }
    }
    return {
      firstName: user?.name?.split(" ")[0] || "Ramon",
      lastName: user?.name?.split(" ").slice(1).join(" ") || "Villanueva",
      email: user?.email || "ramon.villanueva@gmail.com",
      mobile: user?.mobileNumber || "09171234567",
      bio: "Experienced landlord with 8+ years in Iloilo City. I manage quality units in Jaro, La Paz, and Mandurriao.",
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
    if (user) {
      const storageKey = `landlordBusiness_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved) as LandlordBusiness;
        } catch {
          // Fall through to default
        }
      }
    }
    return {
      businessName: "Villanueva Properties",
      permitNumber: user?.permitNumber || "BP-2024-ILO-00482",
      permitExpiry: "2025-12-31",
      taxId: "123-456-789-000",
      businessType: "sole_proprietor",
      yearsActive: "8",
      totalUnits: "6",
      serviceAreas: "Jaro, La Paz, Mandurriao, CPU Area",
      depositPolicy: "2",
      advancePolicy: "1",
      minLeaseTerm: "6",
      petPolicy: "case_by_case",
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
          return JSON.parse(saved) as LandlordSecurity;
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
      activeDevices: [
        { id: 1, name: "Chrome on Windows 11", location: "Iloilo City, PH", lastActive: "Now", current: true },
        { id: 2, name: "Safari on iPhone 14", location: "Iloilo City, PH", lastActive: "2 hours ago", current: false },
      ],
      passwordLastChanged: "2024-11-14",
      recoveryEmail: "ramon.backup@gmail.com",
      recoveryMobile: "09209876543",
      dataSharing: false,
      analyticsConsent: true,
      profileIndexing: true,
    };
  });

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
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-black text-white text-lg tracking-tight">RentIloilo</span>
        </div>
        <p className="text-white/30 text-xs font-medium mt-1 ml-10">Landlord Portal</p>
      </div>

      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-3 py-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 font-black text-white text-sm shadow">
            {user?.name?.[0]?.toUpperCase() ?? "L"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-sm truncate">{user?.name ?? "Landlord"}</p>
            <p className="text-white/40 text-xs truncate">{user?.email ?? ""}</p>
          </div>
          {user?.isVerified && <ShieldCheck className="h-4 w-4 text-green-400 shrink-0" />}
        </div>
      </div>

      <nav className="px-3 pt-4 pb-2">
        <p className="text-white/25 text-[10px] font-black uppercase tracking-widest px-3 mb-2">Main</p>
        <div className="space-y-0.5">
          {NAV_MAIN.map(({ icon: Icon, label, section }) => (
            <button
              key={section}
              onClick={() => { setActiveSection(section); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeSection === section
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-900/30"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {label === "Notifications" && myViolationsCount > 0 && (
                <span className="ml-auto h-4 w-4 bg-red-500 rounded-full text-white text-[10px] font-black flex items-center justify-center">{myViolationsCount}</span>
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
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all"
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeSection === section
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-900/30"
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
  const renderOverview = () => (
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
  const renderProperties = () => (
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
                  <Link to={`/apartment/${apartment.id}`} className="flex-1">
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
  const renderActivity = () => (
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
  const renderNotifications = () => {
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
      <div className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-5 p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-100 rounded-2xl">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-3xl font-black shadow-lg shrink-0">
            {profile.firstName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900">{profile.firstName} {profile.lastName}</p>
            <p className="text-sm text-slate-500 font-medium mb-3">{profile.email}</p>
            <div className="flex gap-2">
              <button className="px-4 py-1.5 bg-amber-500 text-white text-xs font-black rounded-lg hover:bg-amber-600 transition-colors">Upload Photo</button>
              <button className="px-4 py-1.5 bg-white border-2 border-slate-200 text-slate-600 text-xs font-black rounded-lg hover:bg-slate-50 transition-colors">Remove</button>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
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
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
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

        <Button onClick={handleUpdateProfile} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-md shadow-amber-200">
          Save Profile Changes
        </Button>
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

        <Button onClick={handleSaveBusiness} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-md shadow-amber-200">
          Save Business Details
        </Button>
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
            subtitle={`Last changed: ${new Date(security.passwordLastChanged).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`}
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
      <div className="space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="h-4 w-4 text-amber-600" />
          <h2 className="text-xs font-black text-amber-600 uppercase tracking-widest">Settings</h2>
        </div>

        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="space-y-5">
          <TabsList className="grid w-full grid-cols-4 bg-white/80 border border-amber-100 rounded-2xl p-1 shadow-sm">
            <TabsTrigger value="profile" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs">
              <User className="h-3.5 w-3.5 mr-1.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="alerts" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs">
              <Bell className="h-3.5 w-3.5 mr-1.5" /> Alerts
            </TabsTrigger>
            <TabsTrigger value="business" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs">
              <Building2 className="h-3.5 w-3.5 mr-1.5" /> Business
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs">
              <Shield className="h-3.5 w-3.5 mr-1.5" /> Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">{renderProfileTab()}</TabsContent>
          <TabsContent value="alerts">{renderAlertsTab()}</TabsContent>
          <TabsContent value="business">{renderBusinessTab()}</TabsContent>
          <TabsContent value="security">{renderSecurityTab()}</TabsContent>
        </Tabs>
      </div>
    );
  };

  // ── Section: Help ────────────────────────────────────────────────────────
  const renderHelp = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="h-4 w-4 text-amber-600" />
          <h2 className="text-xs font-black text-amber-600 uppercase tracking-widest">Help &amp; Support</h2>
        </div>
        <h1 className="text-3xl font-black text-slate-900">Landlord Support Center</h1>
        <p className="text-slate-600 font-medium mt-1">Guides and support for managing listings, verification, and renter inquiries.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: ListPlus, title: "Add a property", desc: "Create a listing with photos, rent, rooms, and location.", action: () => navigate("/add-apartment") },
          { icon: Building2, title: "Manage listings", desc: "Review your posted properties and listing performance.", action: () => setActiveSection("properties") },
          { icon: Settings, title: "Business settings", desc: "Update permit details, rental policies, and visibility.", action: () => setActiveSection("settings") },
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
              <div key={title} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
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

      <Card className="border-amber-100 shadow-lg bg-white/90 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 font-black">
            <MessageSquare className="h-5 w-5 text-amber-600" />
            Contact Support
          </CardTitle>
          <CardDescription>Submitted landlord requests are saved locally for this prototype.</CardDescription>
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

  // ── Section: Messaging ──────────────────────────────────────────────────


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
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-300/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex h-full">

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 shadow-2xl shadow-slate-900/40">
          <SidebarContent />
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Mobile drawer */}
        <aside className={`fixed top-0 left-0 h-full z-50 w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
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
          className="fixed top-4 left-4 z-30 lg:hidden h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-300/40 hover:from-amber-400 hover:to-orange-500 transition-all"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Main content */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto">
          <main className="px-4 md:px-6 py-6 lg:pt-6 pt-16">
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
