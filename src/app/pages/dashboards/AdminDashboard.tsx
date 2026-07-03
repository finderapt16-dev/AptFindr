import { EvidenceViewer, type EvidenceItem } from "@/app/components/common/EvidenceViewer";
import { LogoutConfirmation } from "@/app/components/common/LogoutConfirmation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { useAuth, type User } from "@/app/contexts/AuthContext";
import { type ListingRecord } from "@/app/data/apartments";
import {
  createAuditLog,
  createViolation,
  deleteNotification,
  deleteViolation as deleteViolationRecord,
  fetchAdminActivityLogs,
  fetchAdminReports,
  fetchApartments,
  fetchLandlordWithDetails,
  fetchNotifications,
  fetchPendingAppeals,
  fetchRecentActivityLogs,
  fetchReportWithDetails,
  fetchUserById,
  fetchUsers,
  fetchViolations,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  notifyReportDismissed,
  notifyReportResolved,
  permanentlyDeleteNotification,
  updateAppealStatus,
  updateReportStatus,
  updateUserProfile,
  type DashboardAppealRow,
  type DashboardAuditLogRow,
  type DashboardLandlordDetailsRow,
  type DashboardNotificationRow,
  type DashboardReportRow,
  type DashboardUserRow,
  type DashboardViolationRow
} from "@/app/services/dashboardSupabaseService";
import { getReportEvidence } from "@/app/services/reportEvidenceService";
import { formatAuditLogForDisplay, formatNotificationType, safeNotificationText } from "@/app/utils/auditLogDisplay";
import { supabase } from "@/lib/supabaseclient";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Archive,
  BarChart3,
  Bell, BellRing,
  Building2,
  Calendar,
  Car,
  CheckCheck,
  CheckCircle2,
  ChevronRight, Clock,
  Edit2,
  Eye,
  FileText,
  Flag,
  Globe2,
  History,
  LayoutDashboard,
  LayoutGrid, List,
  Lock,
  LogOut,
  Mail, MailOpen,
  MapPin,
  Menu,
  PawPrint,
  Phone,
  RefreshCw,
  RotateCcw,
  Ruler,
  Save,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Smartphone,
  Sofa,
  Sparkles,
  Trash2,
  User as UserIcon,
  Users,
  Wifi,
  X,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactElement, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV_MAIN = [
  { icon: LayoutDashboard, label: "Dashboard",      section: "overview" },
  { icon: Bell,            label: "Notifications",  section: "notifications" },
  { icon: Users,           label: "Landlords",      section: "landlords" },
  { icon: Building2,       label: "Apartments",     section: "apartments" },
  { icon: Flag,            label: "Reports",        section: "reports" },
  { icon: AlertTriangle,   label: "Appeals",        section: "appeals" },
];
const NAV_ACCOUNT = [
  { icon: Shield, label: "Settings", section: "admininfo" },
];

// ── Severity map ──────────────────────────────────────────────────────────────
const SEVERITY_LABEL: Record<string, { label: string; class: string }> = {
  low:  { label: "Low",    class: "bg-green-100 text-green-800 border-green-300" },
  med:  { label: "Medium", class: "bg-amber-100 text-amber-800 border-amber-300" },
  high: { label: "High",   class: "bg-red-100 text-red-800 border-red-300" },
};

// ── Violation types ───────────────────────────────────────────────────────────
const VIOLATION_TYPES = [
  "Inaccurate listing information",
  "Fraudulent / scam listing",
  "Misleading photos",
  "Price manipulation",
  "Unresponsive to inquiries",
  "Safety hazard",
  "Permit non-compliance",
  "Other",
];

const NOTICE_TYPES = [
  "Formal warning – first offense",
  "Final warning – second offense",
  "Listing temporarily suspended",
  "Account suspended pending review",
  "Permit re-verification required",
];
const ADMIN_DASHBOARD_SECTIONS = new Set(["overview", "notifications", "landlords", "apartments", "reports", "appeals", "admininfo"]);

type AdminProfileState = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  bio: string;
  language: string;
  timezone: string;
  avatar: string;
  department: string;
  adminLevel: string;
};

type AdminActivityItem = {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  section: string;
};

function toAdminProfileState(source: User | DashboardUserRow | null | undefined): AdminProfileState {
  const name = String(source?.name ?? "").trim();
  const [firstName = "", ...lastNameParts] = name.split(/\s+/).filter(Boolean);
  const dashboardSource = source as DashboardUserRow | undefined;
  const authSource = source as User | undefined;

  return {
    firstName,
    lastName: lastNameParts.join(" "),
    email: String(source?.email ?? ""),
    mobile: String(dashboardSource?.mobile ?? dashboardSource?.mobileNumber ?? authSource?.mobileNumber ?? authSource?.mobile ?? ""),
    bio: String(dashboardSource?.bio ?? authSource?.bio ?? ""),
    language: String(dashboardSource?.language ?? authSource?.language ?? "en"),
    timezone: String(dashboardSource?.timezone ?? authSource?.timezone ?? "Asia/Manila"),
    avatar: String(dashboardSource?.avatar_url ?? authSource?.avatar ?? ""),
    department: String(dashboardSource?.department ?? authSource?.department ?? ""),
    adminLevel: String(dashboardSource?.admin_level ?? dashboardSource?.adminLevel ?? authSource?.adminLevel ?? ""),
  };
}

// ── Mock reports ──────────────────────────────────────────────────────────────
function formatOptionalDate(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", options);
}

function text(value: string | null | undefined, fallback = ""): string {
  return value && value.length > 0 ? value : fallback;
}

function activityTimestamp(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : "";
}

function toEvidenceItem(row: any): EvidenceItem | null {
  const fileUrl = text(row?.file_url);
  if (!fileUrl) return null;

  const fileType =
    row?.file_type === "document" || row?.file_type === "screenshot" ? row.file_type : "image";

  return {
    id: text(row?.id, fileUrl),
    fileName: text(row?.file_name, "Evidence file"),
    fileUrl,
    fileType,
    mimeType: text(row?.mime_type, "image/jpeg"),
    fileSize: typeof row?.file_size === "number" ? row.file_size : undefined,
    uploadedBy: text(row?.uploaded_by),
    uploadedAt: text(row?.uploaded_at),
  };
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: () => void;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="font-black text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      {action && <button onClick={action} className="shrink-0 text-xs font-bold text-amber-600 hover:text-amber-700">View all</button>}
    </div>
  );
}

function OverviewEmpty({ icon: Icon, text: message }: { icon: typeof Building2; text: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <Icon className="mb-3 h-7 w-7 text-slate-300" />
      <p className="text-sm font-bold text-slate-600">{message}</p>
    </div>
  );
}

function NotificationEmpty({
  title,
  message,
  onRefresh,
  refreshing,
}: {
  title: string;
  message: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex min-h-[390px] flex-col items-center justify-center p-6 text-center">
      <span className="relative mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-orange-50 text-orange-500">
        <Bell className="h-10 w-10" />
        <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-white"><CheckCircle2 className="h-4 w-4" /></span>
      </span>
      <h3 className="text-xl font-black text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm font-medium text-slate-500">{message}</p>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="mt-5 h-9 rounded-md border-orange-200 text-xs font-black text-orange-700 hover:bg-orange-50">
        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />Refresh
      </Button>
    </div>
  );
}

function SettingsSectionTitle({
  icon: Icon,
  tone,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tone}`}><Icon className="h-4 w-4" /></span>
      <div><h3 className="font-black text-slate-950">{title}</h3><p className="text-xs font-medium text-slate-500">{description}</p></div>
    </div>
  );
}

function SettingsField({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return <label className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}><span className="text-xs font-bold text-slate-600">{label}</span>{children}</label>;
}

export function AdminDashboard() {
  const { user, verifyLandlord, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedSection = searchParams.get("section") ?? "overview";
  const [activeSection, setActiveSection] = useState(() => ADMIN_DASHBOARD_SECTIONS.has(requestedSection) ? requestedSection : "overview");

  useEffect(() => {
    if (ADMIN_DASHBOARD_SECTIONS.has(requestedSection)) setActiveSection(requestedSection);
  }, [requestedSection]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // landlords
  const [landlords, setLandlords] = useState<DashboardUserRow[]>([]);
  const [verifyAction, setVerifyAction] = useState<{ landlordId: string; verify: boolean } | null>(null);
  const [landlordSearch, setLandlordSearch] = useState("");
  const [landlordStatusFilter, setLandlordStatusFilter] = useState<"all" | "pending" | "verified">("all");
  const [landlordSort, setLandlordSort] = useState<"newest" | "oldest" | "name">("newest");

  // Loading states for action prevention
  const [deletingNotifId, setDeletingNotifId] = useState<string | null>(null);
  const [isMarkingAllNotifs, setIsMarkingAllNotifs] = useState(false);
  const [isResolvingReportId, setIsResolvingReportId] = useState<string | null>(null);
  const [isDismissingReportId, setIsDismissingReportId] = useState<string | null>(null);

  // reports
  const [reports, setReports] = useState<DashboardReportRow[]>([]);
  const [selectedReport, setSelectedReport] = useState<DashboardReportRow | null>(null);
  const [selectedReportDetails, setSelectedReportDetails] = useState<{
    report: DashboardReportRow | null;
    reporter: DashboardUserRow | null;
    apartment: any | null;
    landlord: DashboardUserRow | null;
  } | null>(null);
  const [selectedReportEvidence, setSelectedReportEvidence] = useState<EvidenceItem[]>([]);
  const [dismissReportModal, setDismissReportModal] = useState<{ reportId: string; reason: string } | null>(null);
  const [viewingUserProfile, setViewingUserProfile] = useState<DashboardUserRow | null>(null);
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState<"all" | "pending" | "resolved" | "dismissed">("all");
  const [reportTypeFilter, setReportTypeFilter] = useState("all");
  const [reportSort, setReportSort] = useState<"newest" | "oldest">("newest");

  // violations / notices  { landlordId, type, category, message, issuedAt, apartmentTitle }
  const [violations, setViolations] = useState<DashboardViolationRow[]>([]);

  // appeals
  const [appeals, setAppeals] = useState<DashboardAppealRow[]>([]);
  const [selectedAppeal, setSelectedAppeal] = useState<DashboardAppealRow | null>(null);
  const [appealResponse, setAppealResponse] = useState("");
  const [appealStatus, setAppealStatus] = useState<"under_review" | "approved" | "rejected">("under_review");
  const [appealSearch, setAppealSearch] = useState("");
  const [appealTypeFilter, setAppealTypeFilter] = useState<"all" | "report" | "violation" | "general">("all");
  const [appealSort, setAppealSort] = useState<"newest" | "oldest">("newest");

  // violation modal
  const [violationModal, setViolationModal] = useState<{
    open: boolean;
    mode: "violation" | "notice";
    landlordId: string;
    landlordName: string;
    apartmentTitle: string;
    reportId?: string;
    apartmentId?: string;
  } | null>(null);
  const [vType, setVType]       = useState(VIOLATION_TYPES[0]);
  const [vMessage, setVMessage] = useState("");
  const [nType, setNType]       = useState(NOTICE_TYPES[0]);
  const [nMessage, setNMessage] = useState("");
  const [vExpirationDays, setVExpirationDays] = useState(90);
  const [isIssuingViolation, setIsIssuingViolation] = useState(false);

  // violation edit modal
  const [editViolationModal, setEditViolationModal] = useState<DashboardViolationRow | null>(null);
  const [editVMessage, setEditVMessage] = useState("");
  const [editVExpirationDays, setEditVExpirationDays] = useState(90);

  // password change modal
  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<DashboardAuditLogRow[]>([]);
  const [recentActivityLogs, setRecentActivityLogs] = useState<DashboardAuditLogRow[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // admin notifications (new property submissions)
  const [adminNotifs, setAdminNotifs] = useState<DashboardNotificationRow[]>([]);
  const [notifSearch, setNotifSearch] = useState("");
  const [notifFilter, setNotifFilter] = useState<"all" | "read" | "unread" | "archived">("all");
  const [notifTypeFilter, setNotifTypeFilter] = useState<"all" | "system" | "landlord" | "activities" | "reports" | "appeals">("all");
  const [notifActivityFilter, setNotifActivityFilter] = useState("all");
  const [isRefreshingNotifs, setIsRefreshingNotifs] = useState(false);

  const isNotificationRead = (notification: DashboardNotificationRow) =>
    (notification.read ?? notification.is_read) === true;

  const getNotificationCategory = (notification: DashboardNotificationRow) => {
    const payload = notification.payload ?? {};
    const type = String(notification.type ?? "").toLowerCase();
    const title = String(notification.title ?? "").toLowerCase();
    const message = String(notification.message ?? "").toLowerCase();
    const action = String(payload.action ?? "").toLowerCase();
    const value = `${type} ${title} ${message} ${action}`;

    if (type === "landlord_activity" || payload.category === "landlord_activity" || payload.activity_type) return "activities";
    if (value.includes("report") || value.includes("violation")) return "reports";
    if (value.includes("appeal")) return "appeals";
    if (
      value.includes("landlord") ||
      value.includes("property") ||
      value.includes("submission") ||
      value.includes("verification") ||
      payload.landlord_id ||
      payload.landlordId
    ) return "landlord";
    return "system";
  };

  const loadAdminNotifications = useCallback(async () => {
    if (!user?.id) {
      setAdminNotifs([]);
      return [];
    }

    const notifications = await fetchNotifications(user.id, true);
    setAdminNotifs(notifications);
    return notifications;
  }, [user?.id]);

  const markNotifsRead = async () => {
    if (!user?.id || isMarkingAllNotifs) return;

    const unreadCount = adminNotifs.filter((notification) => !notification.is_deleted && !isNotificationRead(notification)).length;
    if (unreadCount === 0) return;

    setIsMarkingAllNotifs(true);
    setAdminNotifs((previous) => previous.map((notification) => notification.is_deleted ? notification : ({
      ...notification, read: true, is_read: true, read_at: new Date().toISOString(),
    })));

    const updatedCount = await markAllNotificationsRead(user.id);
    await loadAdminNotifications();
    setIsMarkingAllNotifs(false);

    if (updatedCount === 0) {
      toast.error("Could not mark notifications as read. Please try again.");
    }
  };

  const deleteNotif = async (notificationId: string) => {
    if (deletingNotifId === notificationId) {
      toast.error("Deletion in progress...");
      return;
    }
    if (!user?.id || !notificationId) return;

    setDeletingNotifId(notificationId);
    setAdminNotifs((prev) => prev.filter((n) => n.id !== notificationId));

    const deleted = await permanentlyDeleteNotification(notificationId, user.id);
    await loadAdminNotifications();
    setDeletingNotifId(null);

    if (!deleted) {
      toast.error("Could not delete the notification. Please try again.");
    }
  };

  const archiveNotif = async (notificationId: string) => {
    if (!user?.id || !notificationId || deletingNotifId === notificationId) return;
    setDeletingNotifId(notificationId);
    setAdminNotifs((previous) => previous.map((notification) => notification.id === notificationId
      ? { ...notification, is_deleted: true, deleted_at: new Date().toISOString() }
      : notification));

    const archived = await deleteNotification(notificationId, user.id);
    await loadAdminNotifications();
    setDeletingNotifId(null);
    if (!archived) toast.error("Could not archive the notification. Please try again.");
  };

  const refreshAdminNotifications = async () => {
    if (isRefreshingNotifs) return;
    setIsRefreshingNotifs(true);
    await loadAdminNotifications();
    setIsRefreshingNotifs(false);
  };

  const toggleNotifReadStatus = async (notificationId: string, isCurrentlyRead: boolean) => {
    if (!user?.id || !notificationId) return;

    setAdminNotifs((previous) => previous.map((notification) =>
      notification.id === notificationId
        ? { ...notification, read: !isCurrentlyRead, is_read: !isCurrentlyRead }
        : notification
    ));

    const updated = isCurrentlyRead
      ? await markNotificationUnread(notificationId, user.id)
      : await markNotificationRead(notificationId, user.id);

    if (!updated) {
      toast.error("Could not update the notification status. Please try again.");
    }
    await loadAdminNotifications();
  };

  const filteredNotifs = useMemo(() => {
    return adminNotifs.filter((n) => {
      const matchesSearch = !notifSearch || 
        n.title?.toLowerCase().includes(notifSearch.toLowerCase()) ||
        n.message?.toLowerCase().includes(notifSearch.toLowerCase()) ||
        n.type?.toLowerCase().includes(notifSearch.toLowerCase());
      const isRead = isNotificationRead(n);
      const isArchived = n.is_deleted === true;
      const matchesStatus = notifFilter === "archived"
        ? isArchived
        : !isArchived && (notifFilter === "all" || (notifFilter === "read" ? isRead : !isRead));
      const matchesType = notifTypeFilter === "all" || getNotificationCategory(n) === notifTypeFilter;
      const matchesActivity = notifActivityFilter === "all" || String(n.payload?.activity_type ?? n.type ?? "") === notifActivityFilter;
      const payloadText = `${n.payload?.landlord_name ?? ""} ${n.payload?.property_name ?? ""} ${n.payload?.room_name ?? ""}`.toLowerCase();
      const matchesExpandedSearch = matchesSearch || Boolean(notifSearch && payloadText.includes(notifSearch.toLowerCase()));
      return matchesExpandedSearch && matchesStatus && matchesType && matchesActivity;
    });
  }, [adminNotifs, notifSearch, notifFilter, notifTypeFilter, notifActivityFilter]);

  // apartments
  const [aptSearch, setAptSearch]   = useState("");
  const [selectedApt, setSelectedApt] = useState<ListingRecord | null>(null);
  const [aptFilter, setAptFilter] = useState<"all" | "reported">("all");
  const [aptStatusFilter, setAptStatusFilter] = useState<"all" | "available" | "occupied" | "review">("all");
  const [aptPropertyTypeFilter, setAptPropertyTypeFilter] = useState("all");
  const [aptSort, setAptSort] = useState<"newest" | "oldest" | "price-low" | "price-high" | "name">("newest");
  const [aptViewMode, setAptViewMode] = useState<"grid" | "list">("grid");

  // landlord details modal
  const [selectedLandlord, setSelectedLandlord] = useState<DashboardUserRow | null>(null);
  const [selectedLandlordDetails, setSelectedLandlordDetails] = useState<DashboardLandlordDetailsRow | null>(null);
  const [isLoadingLandlordDetails, setIsLoadingLandlordDetails] = useState(false);

  const [allApartments, setAllApartments] = useState<ListingRecord[]>([]);

  const [adminProfile, setAdminProfile] = useState<AdminProfileState>(() => toAdminProfileState(user));
  const [savedAdminProfile, setSavedAdminProfile] = useState<AdminProfileState>(() => toAdminProfileState(user));
  const [isEditingAdminProfile, setIsEditingAdminProfile] = useState(false);
  const [isSavingAdminProfile, setIsSavingAdminProfile] = useState(false);
  const [isLoadingAdminProfile, setIsLoadingAdminProfile] = useState(Boolean(user?.id));

  const updateAdminProfile = (updater: (prev: AdminProfileState) => AdminProfileState) => {
    setAdminProfile(updater);
  };

  const handleUpdateAdminProfile = async () => {
    if (!user) {
      return;
    }

    if (!adminProfile.firstName.trim() || !adminProfile.lastName.trim()) {
      toast.error("Please enter your first and last name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminProfile.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSavingAdminProfile(true);
    const updatedUser = {
      id: user.id,
      email: adminProfile.email,
      name: `${adminProfile.firstName} ${adminProfile.lastName}`,
      mobile: adminProfile.mobile,
      avatar_url: adminProfile.avatar || null,
      bio: adminProfile.bio,
      language: adminProfile.language,
      timezone: adminProfile.timezone,
      department: adminProfile.department,
      admin_level: adminProfile.adminLevel,
      is_verified: user.isVerified ?? false,
      permit_number: user.permitNumber ?? null,
    };

    try {
      const result = await updateUserProfile(updatedUser);
      if (result) {
        await updateUser(user.id, {
          name: `${adminProfile.firstName.trim()} ${adminProfile.lastName.trim()}`,
          email: adminProfile.email.trim(),
        });
        const savedProfile = toAdminProfileState(result);
        setAdminProfile(savedProfile);
        setSavedAdminProfile(savedProfile);
        setIsEditingAdminProfile(false);
        await createAuditLog({
          admin_id: user.id,
          action: "admin_profile_updated",
          target_type: "user",
          target_id: user.id,
          details: { fields: ["name", "email", "mobile", "bio", "language", "timezone", "department", "admin_level"] },
        });
        toast.success("Profile updated successfully!");
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSavingAdminProfile(false);
    }
  };

  const handleResetAdminProfile = () => {
    setAdminProfile(savedAdminProfile);
    setIsEditingAdminProfile(false);
  };

  const openActivityLog = async () => {
    if (!user?.id) return;
    setActivityLogOpen(true);
    setIsLoadingActivity(true);
    try {
      const [adminLogs, platformLogs] = await Promise.all([
        fetchAdminActivityLogs(user.id),
        fetchRecentActivityLogs(),
      ]);
      setActivityLogs(adminLogs);
      setRecentActivityLogs(platformLogs);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const getApartmentReportCount = (apartmentId: string | undefined) => {
    if (!apartmentId) return 0;
    return reports.filter((r) => r.apartmentId === apartmentId && r.status === "pending").length;
  };

  const filteredApts = useMemo(() => {
    const query = aptSearch.trim().toLowerCase();
    let filtered = allApartments.filter((apartment) => {
      const landlordName = landlords.find((landlord) => landlord.id === apartment.landlordId)?.name ?? "";
      const matchesSearch = !query || [apartment.title, apartment.location, apartment.address, landlordName]
        .some((value) => String(value ?? "").toLowerCase().includes(query));
      const status = apartment.isPublished === false
        ? "review"
        : apartment.status === "occupied" ? "occupied" : "available";
      const matchesStatus = aptStatusFilter === "all" || status === aptStatusFilter;
      const matchesType = aptPropertyTypeFilter === "all" || apartment.propertyType === aptPropertyTypeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });

    if (aptFilter === "reported") {
      filtered = filtered.filter((apartment) => getApartmentReportCount(apartment.id) > 0);
    }

    return filtered.sort((left, right) => {
      if (aptSort === "name") return left.title.localeCompare(right.title);
      if (aptSort === "price-low") return Number(left.price || 0) - Number(right.price || 0);
      if (aptSort === "price-high") return Number(right.price || 0) - Number(left.price || 0);
      const leftTime = new Date(left.createdAt ?? 0).getTime();
      const rightTime = new Date(right.createdAt ?? 0).getTime();
      return aptSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
  }, [allApartments, aptSearch, aptFilter, aptStatusFilter, aptPropertyTypeFilter, aptSort, reports, landlords]);

  useEffect(() => {
    let active = true;

    if (!user?.id) {
      const emptyProfile = toAdminProfileState(null);
      setAdminProfile(emptyProfile);
      setSavedAdminProfile(emptyProfile);
      setIsLoadingAdminProfile(false);
      return () => {
        active = false;
      };
    }

    setIsLoadingAdminProfile(true);
    void fetchUserById(user.id)
      .then((profile) => {
        if (!active) return;
        const loadedProfile = toAdminProfileState(profile ?? user);
        setAdminProfile(loadedProfile);
        setSavedAdminProfile(loadedProfile);
      })
      .finally(() => {
        if (active) setIsLoadingAdminProfile(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const loadData = async () => {
      const [loadedReports, loadedViolations, loadedNotifications, loadedApartments, loadedAppeals, loadedActivityLogs] = await Promise.all([
        fetchAdminReports(),
        fetchViolations(),
        user?.id ? fetchNotifications(user.id, true) : Promise.resolve([]),
        fetchApartments(),
        fetchPendingAppeals(),
        fetchRecentActivityLogs(),
      ]);

      setReports(loadedReports);
      setViolations(loadedViolations);
      setAdminNotifs(loadedNotifications);
      setAllApartments(loadedApartments as unknown as ListingRecord[]);
      setAppeals(loadedAppeals);
      setRecentActivityLogs(loadedActivityLogs);
      await loadLandlords();
    };

    void loadData();
  }, [user?.id]);

  useEffect(() => {
    if (activeSection === "notifications") {
      void loadAdminNotifications();
    }
    if (activeSection === "reports") {
      void fetchAdminReports().then(setReports);
    }
    if (activeSection === "apartments") {
      void fetchApartments().then((items) =>
        setAllApartments(items as unknown as ListingRecord[]),
      );
    }
    if (activeSection === "appeals") {
      void fetchPendingAppeals().then(setAppeals);
    }
  }, [activeSection, loadAdminNotifications]);

  useEffect(() => {
    if (user?.role !== "admin") return;
    const channel = supabase
      .channel(`admin-dashboard-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => { void fetchAdminReports().then(setReports); })
      .on("postgres_changes", { event: "*", schema: "public", table: "violations" }, () => { void fetchViolations().then(setViolations); })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => { void loadAdminNotifications(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "appeals" }, () => { void fetchPendingAppeals().then(setAppeals); })
      .on("postgres_changes", { event: "*", schema: "public", table: "apartments" }, () => { void fetchApartments().then((items) => setAllApartments(items as unknown as ListingRecord[])); })
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_rooms" }, () => { void fetchApartments().then((items) => setAllApartments(items as unknown as ListingRecord[])); })
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_images" }, () => { void fetchApartments().then((items) => setAllApartments(items as unknown as ListingRecord[])); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadAdminNotifications, user?.id, user?.role]);

  // Fetch full report details when a report is selected
  useEffect(() => {
    let active = true;

    if (selectedReport?.id) {
      void Promise.all([
        fetchReportWithDetails(selectedReport.id),
        getReportEvidence(selectedReport.id),
      ]).then(([details, evidenceRows]) => {
        if (!active) return;
        setSelectedReportDetails(details);
        setSelectedReportEvidence(
          evidenceRows
            .map(toEvidenceItem)
            .filter((item): item is EvidenceItem => Boolean(item)),
        );
      });
    } else {
      setSelectedReportDetails(null);
      setSelectedReportEvidence([]);
    }

    return () => {
      active = false;
    };
  }, [selectedReport?.id]);

  // Fetch full landlord details when a landlord is selected
  useEffect(() => {
    if (!selectedLandlord?.id) {
      setSelectedLandlordDetails(null);
      setIsLoadingLandlordDetails(false);
      return;
    }

    let active = true;
    const permitNumber = selectedLandlord.permit_number ?? selectedLandlord.permitNumber ?? null;
    setSelectedLandlordDetails({
      user: selectedLandlord,
      profile: {
        user_id: selectedLandlord.id,
        permit_number: permitNumber,
        business_permit_number: permitNumber,
        is_verified: selectedLandlord.is_verified ?? selectedLandlord.isVerified ?? false,
      },
      properties: [],
      violations: [],
      reports: [],
      propertyStats: {
        totalProperties: 0,
        publishedProperties: 0,
        totalViews: 0,
        totalFavorites: 0,
        averagePrice: 0,
      },
    });
    setIsLoadingLandlordDetails(true);

    void fetchLandlordWithDetails(selectedLandlord.id)
      .then((details) => {
        if (active && details) setSelectedLandlordDetails(details);
      })
      .finally(() => {
        if (active) setIsLoadingLandlordDetails(false);
      });

    return () => {
      active = false;
    };
  }, [selectedLandlord]);

  const loadLandlords = async () => {
    const users = await fetchUsers();
    setLandlords(users.filter((x) => x.role === "landlord"));
  };

  const confirmVerification = () => {
    if (!verifyAction) return;
    const pendingAction = verifyAction;
    const previousLandlords = landlords;
    setVerifyAction(null);
    setLandlords((current) => current.map((landlord) =>
      landlord.id === pendingAction.landlordId
        ? {
            ...landlord,
            is_verified: pendingAction.verify,
            isVerified: pendingAction.verify,
            status: pendingAction.verify ? "verified" : "pending",
          }
        : landlord,
    ));
    const toastId = toast.loading(pendingAction.verify ? "Verifying landlord…" : "Revoking verification…");
    const action = verifyLandlord(pendingAction.landlordId, pendingAction.verify);
    void action.then(() => {
      toast.success(pendingAction.verify ? "Landlord verified" : "Verification revoked", { id: toastId });
      void loadLandlords();
    }).catch((error) => {
      setLandlords(previousLandlords);
      console.error("Unable to update landlord verification:", error);
      toast.error(error instanceof Error ? error.message : "Unable to update landlord verification.", { id: toastId });
    });
  };

  const resolveReport = (id: string) => {
    if (isResolvingReportId === id) {
      toast.error("Operation in progress...");
      return;
    }
    setIsResolvingReportId(id);
    void updateReportStatus(id, "resolved").then(async (updated) => {
      if (updated) {
        setReports((p) => p.map((r) => (r.id === id ? updated : r)));
        
        // Send notifications to landlord and reporter
        if (selectedReportDetails?.report?.id && selectedReportDetails?.landlord?.id && selectedReportDetails?.reporter?.id) {
          await notifyReportResolved(
            selectedReportDetails.report.id,
            selectedReportDetails.landlord.id,
            selectedReportDetails.reporter.id,
            selectedReportDetails.report.apartment_title || selectedReportDetails.report.apartment || "Reported Apartment",
          );
        }
        
        setSelectedReport(null);
        toast.success("Report marked as resolved and notifications sent");
      }
    }).finally(() => {
      setIsResolvingReportId(null);
    });
  };

  const dismissReport = (id: string, reason?: string) => {
    if (isDismissingReportId === id) {
      toast.error("Operation in progress...");
      return;
    }
    setIsDismissingReportId(id);
    void updateReportStatus(id, "dismissed").then(async (updated) => {
      if (updated) {
        setReports((p) => p.map((r) => (r.id === id ? updated : r)));
        
        // Send notification to reporter
        if (selectedReportDetails?.report?.id && selectedReportDetails?.reporter?.id) {
          await notifyReportDismissed(
            selectedReportDetails.report.id,
            selectedReportDetails.reporter.id,
            selectedReportDetails.report.apartment_title || selectedReportDetails.report.apartment || "Reported Apartment",
            reason,
          );
        }
        
        setSelectedReport(null);
        setDismissReportModal(null);
        toast.success("Report dismissed and notification sent to reporter");
      }
    }).finally(() => {
      setIsDismissingReportId(null);
    });
  };

  const issueViolation = async () => {
    if (!violationModal || !user || isIssuingViolation) return;

    const type = (violationModal.mode === "violation" ? vType : nType).trim();
    const message = (violationModal.mode === "violation" ? vMessage : nMessage).trim();
    const expirationDays = Number(vExpirationDays);

    if (!violationModal.landlordId) {
      toast.error("The selected landlord could not be identified");
      return;
    }
    if (!type) {
      toast.error(`Please select a ${violationModal.mode} type`);
      return;
    }
    if (violationModal.mode === "violation" && (!Number.isInteger(expirationDays) || expirationDays < 1 || expirationDays > 365)) {
      toast.error("Expiration must be between 1 and 365 days");
      return;
    }

    setIsIssuingViolation(true);
    try {
      const created = await createViolation({
        landlord_id: violationModal.landlordId,
        admin_id: user.id,
        mode: violationModal.mode,
        type,
        message: message || null,
        issued_at: new Date().toISOString(),
        expires_at: violationModal.mode === "violation"
          ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
          : null,
        related_report_id: violationModal.reportId ?? null,
        apartment_id: violationModal.apartmentId ?? null,
        active: true,
      });

      if (!created) throw new Error("The violation record could not be saved");

      setViolations(await fetchViolations());
      if (violationModal.reportId) {
        const updatedReport = await updateReportStatus(violationModal.reportId, "resolved");
        if (updatedReport) {
          setReports((previous) => previous.map((report) => report.id === violationModal.reportId ? updatedReport : report));
          setSelectedReport(null);
        }
      }

      setViolationModal(null);
      setVMessage("");
      setNMessage("");
      setVExpirationDays(90);

      toast.success(violationModal.mode === "violation" ? "Violation issued and landlord notified" : "Notice sent to landlord");
    } catch (error) {
      console.error("Error issuing violation or notice:", error);
      toast.error(error instanceof Error ? error.message : `Unable to issue ${violationModal.mode}`);
    } finally {
      setIsIssuingViolation(false);
    }
  };

  // ── Password Change ───────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!user) {
      toast.error("User not found");
      return;
    }

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      toast.error("All password fields are required");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      await updateUser(user.id, { password: newPassword });
      toast.success("Password changed successfully!");
      setPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to change password.";
      toast.error(message);
    }
  };

  const saveViolationEdit = () => {
    if (!editViolationModal?.id) return;

    if (!editVMessage.trim()) {
      toast.error("Violation message cannot be empty");
      return;
    }

    void createViolation({
      landlord_id: editViolationModal.landlord_id ?? editViolationModal.landlordId ?? null,
      admin_id: editViolationModal.admin_id ?? null,
      mode: editViolationModal.mode ?? "violation",
      type: editViolationModal.type ?? null,
      message: editVMessage,
      issued_at: editViolationModal.issued_at ?? editViolationModal.issuedAt ?? new Date().toISOString(),
      expires_at: new Date(Date.now() + editVExpirationDays * 24 * 60 * 60 * 1000).toISOString(),
      related_report_id: editViolationModal.related_report_id ?? editViolationModal.reportId ?? null,
      active: editViolationModal.active ?? true,
    }).then((created) => {
      if (created) {
        void deleteViolationRecord(editViolationModal.id ?? "");
        void fetchViolations().then(setViolations);
        toast.success("Violation updated successfully");
        setEditViolationModal(null);
        setEditVMessage("");
        setEditVExpirationDays(90);
      }
    });
  };

  const openViolationModal = (
    mode: "violation" | "notice",
    landlordId: string,
    landlordName: string,
    apartmentTitle: string,
    reportId?: string,
    apartmentId?: string,
  ) => {
    setVType(VIOLATION_TYPES[0]);
    setNType(NOTICE_TYPES[0]);
    setVMessage(""); setNMessage("");
    setVExpirationDays(90);
    setViolationModal({ open: true, mode, landlordId, landlordName, apartmentTitle, reportId, apartmentId });
  };

  const getLandlordForApt = (apt: ListingRecord) =>
    landlords.find((l) => l.id === apt.landlordId) ?? null;

  const violationsForLandlord = (lid: string) =>
    violations.filter((v) => v.landlordId === lid);

  const verifiedCount      = landlords.filter((l) => l.isVerified ?? l.is_verified).length;
  const pendingCount       = landlords.filter((l) => !(l.isVerified ?? l.is_verified)).length;
  const pendingReports     = reports.filter((r) => r.status === "pending").length;
  const unreadNotifsCount  = adminNotifs.filter((n) => !n.is_deleted && !isNotificationRead(n)).length;

  const handleLogout = () => { logout?.(); navigate("/"); };
// ── Sidebar ───────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-950 border-r border-white/[0.06] shadow-2xl relative z-10 select-none">
      {/* Cinematic Ambient Glow matching the Left Panel Login backdrop */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-900/75 to-slate-950/95" />
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/15 via-orange-600/5 to-transparent blur-sm" />
        <div className="absolute inset-0 bg-radial-at-t from-transparent via-slate-950/40 to-slate-950/90" />
      </div>

      {/* Brand Logo Section */}
      <div className="px-6 pt-7 pb-5 relative z-10">
        <div className="flex items-center gap-3.5 px-1">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 shadow-xl shadow-orange-500/10 flex items-center justify-center shrink-0 transform transition-transform duration-500 hover:scale-105 hover:rotate-3">
            <Sparkles className="h-5 w-5 text-white filter drop-shadow-sm" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent tracking-tight">
              RentIloilo
            </span>
            <span className="text-[9px] text-amber-400/60 font-black tracking-widest uppercase mt-0.5">
              Admin Portal
            </span>
          </div>
        </div>
      </div>

      {/* Admin User Profile Card */}
      <div className="px-4 py-3 relative z-10">
        <div className="flex items-center gap-3.5 bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent backdrop-blur-xl border border-white/[0.07] rounded-2xl px-3.5 py-3 shadow-lg shadow-black/20 hover:border-white/[0.15] hover:bg-white/[0.06] transition-all duration-300 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 p-[1px] shadow-md shrink-0">
            <div className="h-full w-full rounded-[11px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-black text-white text-sm shadow-inner transform group-hover:scale-105 transition-transform duration-300">
              {user?.name?.[0]?.toUpperCase() ?? "A"}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-200 font-extrabold text-sm truncate tracking-wide leading-snug group-hover:text-white transition-colors">
              {user?.name ?? "Admin"}
            </p>
            <p className="text-white/40 text-xs truncate font-medium mt-0.5">
              {user?.email ?? ""}
            </p>
          </div>
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] flex items-center justify-center shrink-0 group-hover:border-amber-500/30 group-hover:bg-amber-500/5 transition-all duration-300">
            <Shield className="h-4 w-4 text-amber-400 filter drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
          </div>
        </div>
      </div>

      {/* Main Navigation Segment */}
      <nav className="px-3 pt-5 pb-3 space-y-1.5 relative z-10">
        <p className="text-white/30 text-[10px] font-black uppercase tracking-widest px-4 mb-2">
          Main
        </p>
        <div className="space-y-1">
          {NAV_MAIN.map(({ icon: Icon, label, section }) => (
            <button
              key={section}
              onClick={() => {
                setActiveSection(section);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 relative group overflow-hidden ${
                activeSection === section
                  ? "bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white shadow-xl shadow-orange-950/40 border-t border-white/[0.15]"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04] hover:translate-x-0.5"
              }`}
            >
              {activeSection === section && (
                <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-white shadow-[0_0_8px_#fff]" />
              )}
              
              <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                activeSection === section ? "text-white" : "text-slate-400 group-hover:text-amber-400"
              }`} />
              
              <span className="flex-1 text-left">{label}</span>
              
              {/* Dynamic Notification Badges designed as Floating Pills */}
              {label === "Reports" && pendingReports > 0 && (
                <span className="ml-auto h-5 px-2 bg-gradient-to-r from-red-500 to-rose-600 rounded-full text-white text-[10px] font-black tracking-tight flex items-center justify-center min-w-[22px] border border-red-400/20 shadow-md shadow-red-950/50 transform group-hover:scale-105 transition-transform">
                  {pendingReports}
                </span>
              )}
              {label === "Landlords" && pendingCount > 0 && (
                <span className="ml-auto h-5 px-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-white text-[10px] font-black tracking-tight flex items-center justify-center min-w-[22px] border border-amber-400/20 shadow-md shadow-orange-950/50 transform group-hover:scale-105 transition-transform">
                  {pendingCount}
                </span>
              )}
              {label === "Notifications" && unreadNotifsCount > 0 && (
                <span className="ml-auto h-5 px-2 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full text-white text-[10px] font-black tracking-tight flex items-center justify-center min-w-[22px] border border-indigo-400/20 shadow-md shadow-indigo-950/50 transform group-hover:scale-105 transition-transform">
                  {unreadNotifsCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Account Settings Segment */}
      <nav className="px-3 pt-4 pb-3 border-t border-white/[0.06] mt-2 space-y-1.5 relative z-10">
        <p className="text-white/30 text-[10px] font-black uppercase tracking-widest px-4 mb-2">
          Account
        </p>
        <div className="space-y-1">
          {NAV_ACCOUNT.map(({ icon: Icon, label, section }) => (
            <button
              key={section}
              onClick={() => {
                setActiveSection(section);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 relative group overflow-hidden ${
                activeSection === section
                  ? "bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white shadow-xl shadow-orange-950/40 border-t border-white/[0.15]"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04] hover:translate-x-0.5"
              }`}
            >
              {activeSection === section && (
                <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-white shadow-[0_0_8px_#fff]" />
              )}
              <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                activeSection === section ? "text-white" : "text-slate-400 group-hover:text-amber-400"
              }`} />
              <span className="flex-1 text-left">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1" />

      {/* Danger Logout Action Button Container */}
      <div className="px-4 py-4 border-t border-white/[0.06] mt-2 bg-gradient-to-t from-black/20 to-transparent relative z-10">
        <LogoutConfirmation onConfirm={handleLogout}>
          <button className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-black tracking-wide text-rose-400 bg-rose-500/[0.03] border border-rose-500/10 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-rose-600 hover:border-transparent hover:shadow-lg hover:shadow-red-950/40 transition-all duration-300 active:scale-[0.98] group">
            <LogOut className="h-4.5 w-4.5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
            <span>Log Out</span>
          </button>
        </LogoutConfirmation>
      </div>
    </div>
  );
 // ── Section: Notifications ────────────────────────────────────────────────
  const renderOverview = () => {
    const currentDate = new Date().toLocaleDateString("en-PH", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
    const pendingAppealCount = appeals.filter((appeal) => appeal.status === "pending").length;
    const publishedApartmentCount = allApartments.filter((apartment) =>
      apartment.isPublished === true || apartment.is_published === true
    ).length;
    const pendingReviewCount = allApartments.filter((apartment) =>
      String(apartment.status) === "pending" || apartment.verification_status === "pending"
    ).length;
    const pendingLandlords = landlords.filter((landlord) => !(landlord.isVerified ?? landlord.is_verified));
    const tasks = [
      pendingReports > 0 ? { section: "reports", icon: Flag, label: "Review reports", count: pendingReports, tone: "bg-rose-50 text-rose-600 border-rose-100" } : null,
      pendingCount > 0 ? { section: "landlords", icon: ShieldAlert, label: "Verify landlords", count: pendingCount, tone: "bg-amber-50 text-amber-700 border-amber-100" } : null,
      pendingAppealCount > 0 ? { section: "appeals", icon: FileText, label: "Review appeals", count: pendingAppealCount, tone: "bg-blue-50 text-blue-600 border-blue-100" } : null,
      pendingReviewCount > 0 ? { section: "apartments", icon: Building2, label: "Review apartments", count: pendingReviewCount, tone: "bg-emerald-50 text-emerald-600 border-emerald-100" } : null,
    ].filter(Boolean) as Array<{ section: string; icon: typeof Flag; label: string; count: number; tone: string }>;
    const getReportApartment = (report: DashboardReportRow) => allApartments.find((apartment) =>
      apartment.id === (report.apartmentId ?? report.apartment_id)
    );
    const getReportTitle = (report: DashboardReportRow) =>
      report.apartment_title ?? report.apartment ?? getReportApartment(report)?.title ?? "Apartment listing";
    const recentReports = [...reports]
      .sort((left, right) => new Date(right.submittedAt ?? right.submitted_at ?? 0).getTime() - new Date(left.submittedAt ?? left.submitted_at ?? 0).getTime())
      .slice(0, 4);
    const recentApartments = [...allApartments]
      .sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime())
      .slice(0, 4);
    const getNotificationActivityMeta = (notification: DashboardNotificationRow) => {
      const category = getNotificationCategory(notification);
      if (category === "reports") return { icon: Flag, tone: "bg-rose-50 text-rose-600", section: "reports" };
      if (category === "appeals") return { icon: FileText, tone: "bg-blue-50 text-blue-600", section: "appeals" };
      if (category === "landlord") return { icon: Users, tone: "bg-amber-50 text-amber-700", section: "landlords" };
      return { icon: Bell, tone: "bg-slate-100 text-slate-600", section: "notifications" };
    };
    const activity: AdminActivityItem[] = [
      ...reports.map((report) => ({
        id: `report-${report.id}`, timestamp: activityTimestamp(report.submittedAt ?? report.submitted_at),
        title: "Report submitted",
        detail: `${getReportTitle(report)}${report.reporter_name ?? report.reporter ? ` by ${report.reporter_name ?? report.reporter}` : ""}`,
        icon: Flag,
        tone: "bg-rose-50 text-rose-600", section: "reports",
      })),
      ...allApartments.map((apartment) => ({
        id: `apartment-${apartment.id}`, timestamp: activityTimestamp(apartment.createdAt ?? apartment.created_at),
        title: "Apartment added",
        detail: `${apartment.title}${landlords.find((landlord) => landlord.id === apartment.landlordId)?.name ? ` by ${landlords.find((landlord) => landlord.id === apartment.landlordId)?.name}` : ""}`,
        icon: Building2,
        tone: "bg-emerald-50 text-emerald-600", section: "apartments",
      })),
      ...violations.map((violation) => ({
        id: `violation-${violation.id}`, timestamp: activityTimestamp(violation.issuedAt ?? violation.issued_at),
        title: violation.mode === "notice" ? "Notice issued" : "Violation issued",
        detail: [violation.landlordName, violation.apartmentTitle].filter(Boolean).join(" - "),
        icon: violation.mode === "notice" ? Bell : AlertOctagon,
        tone: violation.mode === "notice" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600",
        section: "landlords",
      })),
      ...appeals.map((appeal) => ({
        id: `appeal-${appeal.id}`, timestamp: activityTimestamp(appeal.submitted_at ?? appeal.created_at),
        title: "Appeal submitted",
        detail: landlords.find((landlord) => landlord.id === appeal.landlord_id)?.name ?? "Landlord appeal",
        icon: FileText, tone: "bg-blue-50 text-blue-600", section: "appeals",
      })),
      ...adminNotifs.filter((notification) => !notification.is_deleted).map((notification) => {
        const meta = getNotificationActivityMeta(notification);
        return {
          id: `notification-${notification.id}`,
          timestamp: activityTimestamp(notification.createdAt ?? notification.created_at),
          title: safeNotificationText(notification.title, "Notification received"),
          detail: safeNotificationText(notification.message, "Administrative notification"),
          icon: meta.icon,
          tone: meta.tone,
          section: meta.section,
        };
      }),
      ...recentActivityLogs.map((log) => {
        const displayLog = formatAuditLogForDisplay(log);
        return {
          id: `audit-${log.id}`,
          timestamp: activityTimestamp(log.created_at),
          title: displayLog.title,
          detail: displayLog.detail,
          icon: History,
          tone: "bg-violet-50 text-violet-600",
          section: "admininfo",
        };
      }),
    ].filter((item) => item.timestamp)
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 6);
    const itemMotion = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

    return (
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.055 } } }}
        className="mx-auto max-w-[1500px] space-y-5 text-slate-900"
      >
        <motion.header variants={itemMotion} className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-bold uppercase text-amber-600">Administration workspace</p>
            <h1 className="text-2xl font-black text-slate-950 md:text-3xl">Welcome back, {user?.name || "Admin"}</h1>
            <p className="mt-1 text-sm text-slate-500">Review platform activity and resolve the items that need attention.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <form onSubmit={(event) => { event.preventDefault(); setActiveSection("apartments"); }} className="relative min-w-0 sm:w-[300px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={aptSearch} onChange={(event) => setAptSearch(event.target.value)} placeholder="Search apartments or locations" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium shadow-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
            </form>
            <button onClick={() => setActiveSection("notifications")} title="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-amber-300 hover:text-amber-600">
              <Bell className="h-4 w-4" />
              {unreadNotifsCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-black leading-4 text-white">{unreadNotifsCount}</span>}
            </button>
            <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm"><Calendar className="h-4 w-4 text-amber-600" />{currentDate}</div>
            <button onClick={() => setActiveSection("admininfo")} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 shadow-sm transition hover:border-amber-300">
              {user?.avatar ? <img src={user.avatar} alt="" className="h-7 w-7 rounded-md object-cover" /> : <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-black text-white">{user?.name?.[0]?.toUpperCase() ?? "A"}</span>}
              <span className="hidden max-w-28 truncate text-xs font-bold text-slate-700 md:block">{user?.name || "Admin"}</span>
            </button>
          </div>
        </motion.header>

        <motion.section variants={itemMotion} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: "Pending Reports", value: pendingReports, icon: Flag, section: "reports", tone: "bg-rose-50 text-rose-600" },
            { label: "Pending Verifications", value: pendingCount, icon: ShieldAlert, section: "landlords", tone: "bg-amber-50 text-amber-700" },
            { label: "Active Appeals", value: pendingAppealCount, icon: FileText, section: "appeals", tone: "bg-blue-50 text-blue-600" },
            { label: "Published Apartments", value: publishedApartmentCount, icon: Building2, section: "apartments", tone: "bg-emerald-50 text-emerald-600" },
          ].map(({ label, value, icon: Icon, section, tone }) => (
            <motion.button key={label} whileHover={{ y: -3 }} onClick={() => setActiveSection(section)} className="group flex min-h-[108px] items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-lg">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-2xl font-black text-slate-950">{value}</span><span className="block text-xs font-semibold text-slate-500">{label}</span></span>
              <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-amber-500" />
            </motion.button>
          ))}
        </motion.section>

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <motion.section variants={itemMotion} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeading title="Your Tasks" description="Items currently waiting for administrative action." />
            {tasks.length === 0 ? <OverviewEmpty icon={CheckCircle2} text="No pending administrative tasks." /> : (
              <div className="space-y-2">
                {tasks.map(({ section, icon: Icon, label, count, tone }) => (
                  <button key={section} onClick={() => setActiveSection(section)} className="group flex w-full items-center gap-3 rounded-lg border border-slate-100 p-3 text-left transition hover:border-amber-200 hover:bg-amber-50/30">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${tone}`}><Icon className="h-4 w-4" /></span>
                    <span className="flex-1"><span className="block text-sm font-bold text-slate-800">{label}</span><span className="text-xs text-slate-500">{count} {count === 1 ? "item" : "items"} awaiting review</span></span>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-amber-600" />
                  </button>
                ))}
              </div>
            )}
          </motion.section>

          <motion.section variants={itemMotion} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeading title="Recent Activity" description="Latest events from live platform data." />
            {activity.length === 0 ? <OverviewEmpty icon={Clock} text="No recent activities." /> : (
              <div className="divide-y divide-slate-100">
                {activity.map(({ id, timestamp, title, detail, icon: Icon, tone, section }) => (
                  <button key={id} onClick={() => setActiveSection(section)} className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-slate-50">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-3.5 w-3.5" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800">{title}</span><span className="block truncate text-xs text-slate-500">{detail}</span></span>
                    <span className="shrink-0 text-[10px] font-semibold text-slate-400">{formatOptionalDate(timestamp, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.section>
        </div>

        <div className={`grid gap-5 ${recentReports.length > 0 ? "xl:grid-cols-3" : "xl:grid-cols-2"}`}>
          <motion.section variants={itemMotion} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeading title="Verification Queue" description="Landlords awaiting review." action={() => setActiveSection("landlords")} />
            {pendingLandlords.length === 0 ? <OverviewEmpty icon={Shield} text="No pending verifications." /> : (
              <div className="divide-y divide-slate-100">{pendingLandlords.slice(0, 4).map((landlord) => (
                <div key={landlord.id} className="flex items-center gap-3 py-3">
                  {landlord.avatar_url ? <img src={landlord.avatar_url} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-xs font-black text-amber-700">{landlord.name?.[0]?.toUpperCase() ?? "L"}</span>}
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800">{landlord.name || "Unnamed landlord"}</span><span className="text-[10px] text-slate-400">{formatOptionalDate(landlord.created_at as string | undefined, { month: "short", day: "numeric", year: "numeric" })}</span></span>
                  <button onClick={() => setSelectedLandlord(landlord)} className="rounded-md border border-amber-200 px-2.5 py-1.5 text-[10px] font-black text-amber-700 transition hover:bg-amber-50">Review</button>
                </div>
              ))}</div>
            )}
          </motion.section>

          {recentReports.length > 0 && <motion.section variants={itemMotion} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeading title="Recent Reports" description="Latest tenant submissions." action={() => setActiveSection("reports")} />
            <div className="divide-y divide-slate-100">{recentReports.map((report) => {
              const apartment = getReportApartment(report);
              const severity = SEVERITY_LABEL[report.severity ?? "low"] ?? SEVERITY_LABEL.low;
              return <button key={report.id} onClick={() => setSelectedReport(report)} className="flex w-full items-center gap-3 py-3 text-left">
                <span className="flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100">{apartment?.image ? <img src={apartment.image} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-4 w-4 text-slate-300" />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800">{getReportTitle(report)}</span><span className="block truncate text-[10px] text-slate-500">{report.issueType ?? report.issue_type ?? report.details ?? "Problem reported"}</span><span className="mt-0.5 block text-[9px] text-slate-400">{formatOptionalDate(report.submittedAt ?? report.submitted_at, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span></span>
                <span className={`rounded-md border px-1.5 py-1 text-[9px] font-black ${severity.class}`}>{severity.label}</span>
              </button>;
            })}</div>
          </motion.section>}

          <motion.section variants={itemMotion} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeading title="Recently Added" description="Newest apartment records." action={() => setActiveSection("apartments")} />
            {recentApartments.length === 0 ? <OverviewEmpty icon={Building2} text="No apartments have been added yet." /> : (
              <div className="divide-y divide-slate-100">{recentApartments.map((apartment) => {
                const isPublished = apartment.isPublished === true || apartment.is_published === true;
                return <button key={apartment.id} onClick={() => setSelectedApt(apartment)} className="flex w-full items-center gap-3 py-3 text-left">
                  <span className="flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100">{apartment.image ? <img src={apartment.image} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-4 w-4 text-slate-300" />}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800">{apartment.title}</span><span className="block text-[10px] font-semibold text-slate-500">Prices are listed per room</span><span className="mt-0.5 block text-[9px] text-slate-400">{formatOptionalDate(apartment.createdAt, { month: "short", day: "numeric", year: "numeric" })}</span></span>
                  <span className={`rounded-md px-1.5 py-1 text-[9px] font-black ${isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{isPublished ? "Published" : "Unpublished"}</span>
                </button>;
              })}</div>
            )}
          </motion.section>
        </div>
      </motion.div>
    );
  };

  // ── Section: Landlords ────────────────────────────────────────────────────
  const renderNotifications = () => {
    const activeNotifications = adminNotifs.filter((notification) => !notification.is_deleted);
    const archivedCount = adminNotifs.filter((notification) => notification.is_deleted).length;
    const unreadCount = activeNotifications.filter((notification) => !isNotificationRead(notification)).length;
    const readCount = activeNotifications.filter(isNotificationRead).length;
    const currentDate = new Date().toLocaleDateString("en-PH", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
    const selectNotificationView = (
      status: "all" | "read" | "unread" | "archived",
      type: "all" | "system" | "landlord" | "activities" | "reports" | "appeals" = "all",
    ) => {
      setNotifFilter(status);
      setNotifTypeFilter(type);
      setNotifActivityFilter("all");
    };
    const isViewActive = (status: typeof notifFilter, type: typeof notifTypeFilter = "all") =>
      notifFilter === status && notifTypeFilter === type;
    const notificationTone = (notification: DashboardNotificationRow) => {
      const category = getNotificationCategory(notification);
      if (category === "reports") return { icon: Flag, bg: "bg-rose-50", text: "text-rose-600", badge: "bg-rose-50 text-rose-700 border-rose-100" };
      if (category === "appeals") return { icon: FileText, bg: "bg-blue-50", text: "text-blue-600", badge: "bg-blue-50 text-blue-700 border-blue-100" };
      if (category === "activities") return { icon: Activity, bg: "bg-violet-50", text: "text-violet-600", badge: "bg-violet-50 text-violet-700 border-violet-100" };
      if (category === "landlord") return { icon: Users, bg: "bg-amber-50", text: "text-amber-700", badge: "bg-amber-50 text-amber-700 border-amber-100" };
      return { icon: Bell, bg: "bg-slate-100", text: "text-slate-600", badge: "bg-slate-100 text-slate-700 border-slate-200" };
    };
    const activityTypes = Array.from(new Set(adminNotifs
      .filter((notification) => getNotificationCategory(notification) === "activities")
      .map((notification) => String(notification.payload?.activity_type ?? notification.type ?? ""))
      .filter(Boolean))).sort();

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-200/60"><Bell className="h-5 w-5" /></span>
            <div><h1 className="text-2xl font-black text-slate-950 md:text-3xl">Notifications Center</h1><p className="text-sm font-medium text-slate-500">Review important events and administrative updates.</p></div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative min-w-0 sm:w-[300px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={notifSearch} onChange={(event) => setNotifSearch(event.target.value)} placeholder="Search notifications" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium shadow-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
            </label>
            <button onClick={() => void refreshAdminNotifications()} disabled={isRefreshingNotifs} title="Refresh notifications" className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-amber-300 hover:text-amber-600 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${isRefreshingNotifs ? "animate-spin" : ""}`} /></button>
            <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm"><Calendar className="h-4 w-4 text-amber-600" />{currentDate}</div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: "Total Notifications", value: adminNotifs.length, note: "Database records", icon: Bell, tone: "bg-orange-50 text-orange-600" },
            { label: "Unread", value: unreadCount, note: unreadCount === 0 ? "All caught up" : "Needs attention", icon: Mail, tone: "bg-amber-50 text-amber-700" },
            { label: "Read", value: readCount, note: "Active notifications", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
            { label: "Archived", value: archivedCount, note: "Stored history", icon: Archive, tone: "bg-blue-50 text-blue-600" },
          ].map(({ label, value, note, icon: Icon, tone }) => (
            <motion.div key={label} whileHover={{ y: -3 }} className="flex min-h-[110px] items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-lg">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span>
              <span className="min-w-0"><span className="block text-2xl font-black text-slate-950">{value}</span><span className="block truncate text-xs font-bold text-slate-700">{label}</span><span className="block truncate text-[10px] font-semibold text-slate-400">{note}</span></span>
            </motion.div>
          ))}
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 gap-1 overflow-x-auto pb-1 lg:pb-0">
              {[
                { label: "All", status: "all", type: "all", icon: Bell },
                { label: "Unread", status: "unread", type: "all", icon: Mail },
                { label: "Read", status: "read", type: "all", icon: MailOpen },
                { label: "System", status: "all", type: "system", icon: ShieldAlert },
                { label: "Landlords", status: "all", type: "landlord", icon: Users },
                { label: "Landlord Activities", status: "all", type: "activities", icon: Activity },
                { label: "Reports", status: "all", type: "reports", icon: Flag },
                { label: "Appeals", status: "all", type: "appeals", icon: FileText },
                { label: "Archived", status: "archived", type: "all", icon: Archive },
              ].map(({ label, status, type, icon: Icon }) => {
                const selected = isViewActive(status as typeof notifFilter, type as typeof notifTypeFilter);
                return <button key={label} onClick={() => selectNotificationView(status as typeof notifFilter, type as typeof notifTypeFilter)} className={`flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition ${selected ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}><Icon className="h-3.5 w-3.5" />{label}</button>;
              })}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {(notifTypeFilter === "activities" || notifActivityFilter !== "all") && <select value={notifActivityFilter} onChange={(event) => setNotifActivityFilter(event.target.value)} className="h-9 max-w-56 rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700"><option value="all">All activity types</option>{activityTypes.map((type) => <option key={type} value={type}>{formatNotificationType(type)}</option>)}</select>}
              {unreadCount > 0 && <Button variant="outline" size="sm" onClick={() => void markNotifsRead()} disabled={isMarkingAllNotifs} className="h-9 shrink-0 rounded-md border-orange-200 text-xs font-black text-orange-700 hover:bg-orange-50"><CheckCheck className="mr-1.5 h-3.5 w-3.5" />{isMarkingAllNotifs ? "Marking..." : "Mark all as read"}</Button>}
            </div>
          </div>

          {adminNotifs.length === 0 ? (
            <NotificationEmpty title="No notifications yet." message="New administrative notifications will appear here." onRefresh={() => void refreshAdminNotifications()} refreshing={isRefreshingNotifs} />
          ) : filteredNotifs.length === 0 ? (
            notifFilter === "unread" && !notifSearch && notifTypeFilter === "all"
              ? <NotificationEmpty title="All caught up!" message="You have no unread notifications." onRefresh={() => void refreshAdminNotifications()} refreshing={isRefreshingNotifs} />
              : <NotificationEmpty title="No matching notifications." message="Try adjusting your search or notification filter." onRefresh={() => void refreshAdminNotifications()} refreshing={isRefreshingNotifs} />
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifs.map((notification) => {
                const tone = notificationTone(notification);
                const Icon = tone.icon;
                const archived = notification.is_deleted === true;
                const read = isNotificationRead(notification);
                const apartmentId = String(notification.payload?.apartment_id ?? notification.apartmentId ?? notification.action_target_id ?? "");
                const apartment = apartmentId ? allApartments.find((item) => item.id === apartmentId) : undefined;
                const notificationType = formatNotificationType(notification.type);
                const rawActionUrl = String(notification.action_url ?? notification.payload?.action_url ?? "");
                const actionUrl = rawActionUrl.startsWith("/")
                  ? rawActionUrl
                  : apartment ? `/admin/apartment/${apartmentId}` : "";
                const landlordName = String(notification.payload?.landlord_name ?? "");
                const propertyName = String(notification.payload?.property_name ?? apartment?.title ?? "");
                const roomName = String(notification.payload?.room_name ?? "");
                const activityStatus = String(notification.payload?.status ?? "");
                return (
                  <motion.article key={notification.id} layout className={`flex flex-col gap-3 p-4 transition md:flex-row md:items-center ${!read && !archived ? "bg-amber-50/25" : "hover:bg-slate-50/70"}`}>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone.bg} ${tone.text}`}><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-sm text-slate-900 ${read || archived ? "font-bold" : "font-black"}`}>{safeNotificationText(notification.title, "Notification")}</h3>
                        {notificationType && <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase ${tone.badge}`}>{notificationType}</span>}
                        {!read && !archived && <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500">{safeNotificationText(notification.message, "No additional details provided.")}</p>
                      {(landlordName || propertyName || roomName) && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-slate-500">{landlordName && <span>Landlord: <b className="text-slate-700">{landlordName}</b></span>}{propertyName && <span>Property: <b className="text-slate-700">{propertyName}</b></span>}{roomName && <span>Room: <b className="text-slate-700">{roomName}</b></span>}{activityStatus && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 uppercase text-slate-700">{activityStatus}</span>}</div>}
                      <p className="mt-1.5 text-[10px] font-semibold text-slate-400">{formatOptionalDate(notification.createdAt ?? notification.created_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}{archived && notification.deleted_at ? ` - Archived ${formatOptionalDate(notification.deleted_at, { month: "short", day: "numeric" })}` : ""}</p>
                    </div>
                    <div className="flex shrink-0 items-center justify-end gap-1.5" onClick={(event) => event.stopPropagation()}>
                      {actionUrl && !archived && <Button size="sm" variant="outline" onClick={() => { if (!read && notification.id) void markNotificationRead(notification.id, user?.id); navigate(actionUrl, { state: { returnTo: "/dashboard?section=notifications" } }); }} className="h-8 rounded-md border-slate-200 px-2.5 text-[10px] font-black text-slate-600"><Eye className="mr-1 h-3 w-3" />View Details</Button>}
                      {!archived && <button onClick={() => void toggleNotifReadStatus(notification.id || "", read)} title={read ? "Mark unread" : "Mark read"} className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100">{read ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}</button>}
                      {!archived && <button onClick={() => void archiveNotif(notification.id || "")} title="Archive notification" className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"><Archive className="h-3.5 w-3.5" /></button>}
                      <button onClick={() => void deleteNotif(notification.id || "")} title="Delete notification" className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid gap-4 rounded-lg border border-amber-200 bg-amber-50/60 p-4 md:grid-cols-3">
          {[{ icon: Shield, title: "Database synchronized", text: "Read and archive states are stored with each notification." }, { icon: Search, title: "Focused filtering", text: "Search and filter by status or notification type." }, { icon: RefreshCw, title: "Current updates", text: "Refresh anytime to load the latest administrative events." }].map(({ icon: Icon, title, text: description }) => (
            <div key={title} className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm"><Icon className="h-4 w-4" /></span><div><p className="text-xs font-black text-slate-800">{title}</p><p className="mt-0.5 text-[11px] font-medium leading-relaxed text-slate-500">{description}</p></div></div>
          ))}
        </section>
      </motion.div>
    );
  };

  // ── Section: Apartments ───────────────────────────────────────────────────
  const renderLandlords = () => {
    const normalizedSearch = landlordSearch.trim().toLowerCase();
    const visibleLandlords = landlords
      .filter((landlord) => {
        const verified = (landlord.isVerified ?? landlord.is_verified) === true;
        const matchesStatus = landlordStatusFilter === "all"
          || (landlordStatusFilter === "verified" ? verified : !verified);
        const matchesSearch = !normalizedSearch || [landlord.name, landlord.email, landlord.id]
          .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
        return matchesStatus && matchesSearch;
      })
      .sort((left, right) => {
        if (landlordSort === "name") return String(left.name ?? "").localeCompare(String(right.name ?? ""));
        const leftTime = new Date(String(left.created_at ?? 0)).getTime();
        const rightTime = new Date(String(right.created_at ?? 0)).getTime();
        return landlordSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
      });
    const activeViolationCount = violations.filter((violation) => violation.active !== false).length;
    const currentDate = new Date().toLocaleDateString("en-PH", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-200/60">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-950 md:text-3xl">Landlord Verification</h1>
              <p className="text-sm font-medium text-slate-500">Review credentials and manage landlord compliance.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button onClick={() => setActiveSection("notifications")} title="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-amber-300 hover:text-amber-600">
              <Bell className="h-4 w-4" />
              {unreadNotifsCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-black leading-4 text-white">{unreadNotifsCount}</span>}
            </button>
            <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm"><Calendar className="h-4 w-4 text-amber-600" />{currentDate}</div>
          </div>
        </header>

        <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-4">
          {[
            { label: "Total Landlords", value: landlords.length, note: "Registered", icon: Users, tone: "bg-amber-50 text-amber-700" },
            { label: "Pending Review", value: pendingCount, note: "Awaiting verification", icon: Clock, tone: "bg-orange-50 text-orange-600" },
            { label: "Verified", value: verifiedCount, note: "Active landlords", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
            { label: "Violations", value: activeViolationCount, note: "Require attention", icon: AlertTriangle, tone: "bg-rose-50 text-rose-600" },
          ].map(({ label, value, note, icon: Icon, tone }, index) => (
            <div key={label} className={`flex min-h-[112px] items-center gap-3 p-4 md:p-5 ${index % 2 !== 0 ? "border-l border-slate-100" : ""} ${index > 1 ? "border-t border-slate-100 lg:border-t-0" : ""} ${index > 0 ? "lg:border-l" : ""}`}>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span>
              <span className="min-w-0"><span className="block text-2xl font-black text-slate-950">{value}</span><span className="block truncate text-xs font-bold text-slate-700">{label}</span><span className="block truncate text-[10px] font-semibold text-slate-400">{note}</span></span>
            </div>
          ))}
        </section>

        <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={landlordSearch} onChange={(event) => setLandlordSearch(event.target.value)} placeholder="Search landlords by name, email, or ID" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100" />
          </label>
          <select value={landlordStatusFilter} onChange={(event) => setLandlordStatusFilter(event.target.value as "all" | "pending" | "verified")} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-amber-400">
            <option value="all">Status: All</option><option value="pending">Status: Pending</option><option value="verified">Status: Verified</option>
          </select>
          <select value={landlordSort} onChange={(event) => setLandlordSort(event.target.value as "newest" | "oldest" | "name")} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-amber-400">
            <option value="newest">Sort: Newest</option><option value="oldest">Sort: Oldest</option><option value="name">Sort: Name</option>
          </select>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {landlords.length === 0 ? (
            <OverviewEmpty icon={Users} text="No landlords registered yet." />
          ) : visibleLandlords.length === 0 ? (
            <OverviewEmpty icon={Search} text="No landlords match the selected filters." />
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleLandlords.map((landlord) => {
                const landlordViolations = violationsForLandlord(text(landlord.id));
                const verified = (landlord.isVerified ?? landlord.is_verified) === true;
                const permitNumber = landlord.permitNumber ?? landlord.permit_number;
                return (
                  <motion.article key={landlord.id} whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.85)" }} className="grid cursor-pointer gap-4 p-4 md:p-5 xl:grid-cols-[minmax(250px,1.4fr)_150px_minmax(170px,0.8fr)_150px] xl:items-center" onClick={() => setSelectedLandlord(landlord)}>
                    <div className="flex min-w-0 items-center gap-3">
                      {landlord.avatar_url ? <img src={landlord.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-base font-black text-amber-700">{landlord.name?.[0]?.toUpperCase() ?? "L"}</span>}
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-slate-900">{landlord.name || "Unnamed landlord"}</h3>
                        <p className="truncate text-xs font-medium text-slate-500">{landlord.email || "No email provided"}</p>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-400">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Registered {formatOptionalDate(landlord.created_at as string | undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-black uppercase ${verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {verified ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{verified ? "Verified" : "Pending"}
                      </span>
                      {landlordViolations.length > 0 && <p className="mt-2 text-[10px] font-bold text-rose-600">{landlordViolations.length} recorded {landlordViolations.length === 1 ? "action" : "actions"}</p>}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase text-slate-400">Verification information</p>
                      {permitNumber ? <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-bold text-slate-700"><FileText className="h-3.5 w-3.5 shrink-0 text-emerald-500" />Permit {permitNumber}</p> : <p className="mt-1 text-xs font-medium text-slate-400">No permit information submitted.</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 xl:grid-cols-1" onClick={(event) => event.stopPropagation()}>
                      <Button size="sm" variant={verified ? "outline" : "default"} onClick={() => setVerifyAction({ landlordId: text(landlord.id), verify: !verified })} className={`h-8 rounded-md text-[10px] font-black ${verified ? "border-slate-200 text-slate-600 hover:bg-slate-50" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                        {verified ? <XCircle className="mr-1 h-3 w-3" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}{verified ? "Revoke" : "Verify"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openViolationModal("violation", text(landlord.id), text(landlord.name, "Landlord"), "General")} className="h-8 rounded-md border-rose-200 text-[10px] font-black text-rose-600 hover:bg-rose-50"><AlertOctagon className="mr-1 h-3 w-3" />Violation</Button>
                      <Button variant="outline" size="sm" onClick={() => openViolationModal("notice", text(landlord.id), text(landlord.name, "Landlord"), "General")} className="h-8 rounded-md border-amber-200 text-[10px] font-black text-amber-700 hover:bg-amber-50"><BellRing className="mr-1 h-3 w-3" />Notice</Button>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-4">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div><p className="text-sm font-black text-slate-800">Verification requirements</p><p className="mt-0.5 text-xs font-medium text-slate-600">Only verified landlords can add and edit apartments. Use violations for serious offenses and notices for warnings.</p></div>
        </section>
      </motion.div>
    );
  };

  const renderApartments = () => {
    const reportedCount = allApartments.filter((a) => getApartmentReportCount(a.id) > 0).length;
    const availableCount = allApartments.filter((apartment) => apartment.isPublished !== false && apartment.status === "available").length;
    const occupiedCount = allApartments.filter((apartment) => apartment.isPublished !== false && apartment.status === "occupied").length;
    const reviewCount = allApartments.filter((apartment) => apartment.isPublished === false).length;
    const propertyTypes = Array.from(new Set(allApartments.map((apartment) => apartment.propertyType).filter((value): value is string => Boolean(value)))).sort();
    const currentDate = new Date().toLocaleDateString("en-PH", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });

    return (
      <div className="space-y-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5">
          <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-200/60"><Building2 className="h-5 w-5" /></span>
              <div><h1 className="text-2xl font-black text-slate-950 md:text-3xl">All Apartments</h1><p className="text-sm font-medium text-slate-500">Browse, inspect, and review apartment listings.</p></div>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button onClick={() => setActiveSection("notifications")} title="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-amber-300 hover:text-amber-600"><Bell className="h-4 w-4" />{unreadNotifsCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-black leading-4 text-white">{unreadNotifsCount}</span>}</button>
              <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm"><Calendar className="h-4 w-4 text-amber-600" />{currentDate}</div>
            </div>
          </header>

          <nav className="flex gap-2 overflow-x-auto">
            <button onClick={() => setAptFilter("all")} className={`flex h-10 shrink-0 items-center gap-2 rounded-lg border px-4 text-xs font-black transition ${aptFilter === "all" ? "border-orange-300 bg-orange-50 text-orange-700 shadow-sm" : "border-transparent text-slate-500 hover:bg-white"}`}><Building2 className="h-4 w-4" />All Apartments ({allApartments.length})</button>
            <button onClick={() => setAptFilter("reported")} className={`flex h-10 shrink-0 items-center gap-2 rounded-lg border px-4 text-xs font-black transition ${aptFilter === "reported" ? "border-rose-300 bg-rose-50 text-rose-700 shadow-sm" : "border-transparent text-slate-500 hover:bg-white"}`}><Flag className="h-4 w-4" />Reported ({reportedCount})</button>
          </nav>

          <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[minmax(220px,1fr)_150px_180px_150px_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={aptSearch} onChange={(event) => setAptSearch(event.target.value)} placeholder="Search by name, location, or landlord" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100" />
            </label>
            <select value={aptStatusFilter} onChange={(event) => setAptStatusFilter(event.target.value as typeof aptStatusFilter)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-amber-400"><option value="all">Status: All</option><option value="available">Available</option><option value="occupied">Occupied</option><option value="review">Under Review</option></select>
            <select value={aptPropertyTypeFilter} onChange={(event) => setAptPropertyTypeFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-amber-400"><option value="all">Property Type: All</option>{propertyTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
            <select value={aptSort} onChange={(event) => setAptSort(event.target.value as typeof aptSort)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-amber-400"><option value="newest">Sort: Newest</option><option value="oldest">Sort: Oldest</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option><option value="name">Sort: Name</option></select>
            <div className="grid grid-cols-2 rounded-lg border border-slate-200 p-1">
              <button onClick={() => setAptViewMode("grid")} title="Grid view" className={`flex h-8 w-9 items-center justify-center rounded-md transition ${aptViewMode === "grid" ? "bg-orange-500 text-white" : "text-slate-400 hover:bg-slate-50"}`}><LayoutGrid className="h-4 w-4" /></button>
              <button onClick={() => setAptViewMode("list")} title="List view" className={`flex h-8 w-9 items-center justify-center rounded-md transition ${aptViewMode === "list" ? "bg-orange-500 text-white" : "text-slate-400 hover:bg-slate-50"}`}><List className="h-4 w-4" /></button>
            </div>
          </section>

          <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-4">
            {[
              { label: "Total Apartments", value: allApartments.length, note: "All listings", icon: Building2, tone: "bg-orange-50 text-orange-600" },
              { label: "Available", value: availableCount, note: "Ready for rent", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
              { label: "Occupied", value: occupiedCount, note: "Currently rented", icon: Users, tone: "bg-amber-50 text-amber-700" },
              { label: "Under Review", value: reviewCount, note: "Requires inspection", icon: Clock, tone: "bg-rose-50 text-rose-600" },
            ].map(({ label, value, note, icon: Icon, tone }, index) => (
              <div key={label} className={`flex min-h-[108px] items-center gap-3 p-4 md:p-5 ${index % 2 ? "border-l border-slate-100" : ""} ${index > 1 ? "border-t border-slate-100 lg:border-t-0" : ""} ${index > 0 ? "lg:border-l" : ""}`}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-2xl font-black text-slate-950">{value}</span><span className="block truncate text-xs font-bold text-slate-700">{label}</span><span className="block truncate text-[10px] font-semibold text-slate-400">{note}</span></span></div>
            ))}
          </section>

          {filteredApts.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm"><OverviewEmpty icon={Building2} text={aptFilter === "reported" ? "No reported apartments." : allApartments.length === 0 ? "No apartments have been added yet." : "No apartments match the selected filters."} /></div>
          ) : (
            <section className={aptViewMode === "grid" ? "grid gap-4 md:grid-cols-2" : "space-y-3"}>
              {filteredApts.map((apartment) => {
                const landlord = getLandlordForApt(apartment);
                const reportCount = getApartmentReportCount(apartment.id);
                const isReview = apartment.isPublished === false;
                const status = isReview
                  ? "Under Review"
                  : apartment.status === "occupied" ? "Occupied"
                    : apartment.status === "reserved" ? "Reserved"
                      : apartment.status === "maintenance" ? "Maintenance"
                        : "Available";
                const statusClass = isReview
                  ? "bg-rose-500 text-white"
                  : apartment.status === "occupied" ? "bg-slate-800 text-white"
                    : apartment.status === "reserved" ? "bg-blue-600 text-white"
                      : apartment.status === "maintenance" ? "bg-amber-600 text-white"
                        : "bg-emerald-500 text-white";
                const location = apartment.location || [apartment.address, apartment.city].filter(Boolean).join(", ");
                const roomCount = apartment.rooms?.length || apartment.bedrooms || 0;
                return (
                  <motion.article key={apartment.id} whileHover={{ y: -3 }} onClick={() => setSelectedApt(apartment)} className={`group cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg ${aptViewMode === "list" ? "md:flex" : ""}`}>
                    <div className={`relative shrink-0 overflow-hidden bg-slate-100 ${aptViewMode === "list" ? "h-52 md:h-auto md:w-64" : "h-52"}`}>
                      {apartment.image ? <img src={apartment.image} alt={apartment.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center"><Building2 className="h-10 w-10 text-slate-300" /></div>}
                      <span className={`absolute left-3 top-3 rounded-md px-2 py-1 text-[10px] font-black ${statusClass}`}>{status}</span>
                      {reportCount > 0 && <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-rose-500 px-2 py-1 text-[10px] font-black text-white"><Flag className="h-3 w-3" />{reportCount}</span>}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col p-4">
                      <div className="min-w-0"><h3 className="truncate text-base font-black text-slate-900">{apartment.title}</h3><p className="mt-1 flex items-center gap-1 truncate text-xs font-medium text-slate-500"><MapPin className="h-3 w-3 shrink-0 text-orange-500" />{location || "Location not provided"}</p><p className="mt-2 text-xs font-semibold text-slate-500">{apartment.propertyType || "Property type not specified"}</p></div>
                      <p className="mt-3 text-xs font-black text-orange-600">Prices are listed per room</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md bg-slate-50 p-2"><p className="text-[9px] font-black uppercase text-slate-400">Rooms / Units</p><p className="mt-0.5 font-bold text-slate-800">{roomCount || "Not provided"}</p></div>
                        <div className="rounded-md bg-slate-50 p-2"><p className="text-[9px] font-black uppercase text-slate-400">Floor Area</p><p className="mt-0.5 flex items-center gap-1 font-bold text-slate-800"><Ruler className="h-3 w-3 text-slate-400" />{apartment.sqft ? `${apartment.sqft.toLocaleString()} sqft` : "Not provided"}</p></div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-[10px]"><div><p className="font-black uppercase text-slate-400">Added</p><p className="mt-0.5 font-bold text-slate-700">{formatOptionalDate(apartment.createdAt, { month: "short", day: "numeric", year: "numeric" })}</p></div><div className="min-w-0"><p className="font-black uppercase text-slate-400">Landlord</p><p className="mt-0.5 truncate font-bold text-slate-700">{landlord?.name || "Not available"}</p></div></div>
                      <Button variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); navigate(`/admin/apartment/${apartment.id}`, { state: { returnTo: "/dashboard?section=apartments" } }); }} className="mt-3 h-9 w-full rounded-md border-orange-300 text-xs font-black text-orange-700 hover:bg-orange-50"><Eye className="mr-1.5 h-3.5 w-3.5" />Inspect</Button>
                    </div>
                  </motion.article>
                );
              })}
            </section>
          )}

          <section className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4"><Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><p className="text-sm font-black text-slate-800">Apartment management</p><p className="mt-0.5 text-xs font-medium text-slate-600">Inspect listings to review complete apartment details, landlord information, reports, and listing status.</p></div></section>
        </motion.div>

        <div className="hidden items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">All Apartments</h2>
            <p className="text-slate-500 text-sm font-medium">Browse, inspect, and take action on listings</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="hidden gap-3 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-amber-100 shadow-sm w-fit">
          <Button
            variant={aptFilter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setAptFilter("all")}
            className={`rounded-xl px-6 py-2 transition-all font-bold ${
              aptFilter === "all"
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-orange-300/50"
                : "text-slate-600 hover:text-amber-600 hover:bg-amber-50"
            }`}
          >
            <Building2 className="h-4 w-4 mr-2" />
            All ({allApartments.length})
          </Button>
          <Button
            variant={aptFilter === "reported" ? "default" : "ghost"}
            size="sm"
            onClick={() => setAptFilter("reported")}
            className={`rounded-xl px-6 py-2 transition-all font-bold ${
              aptFilter === "reported"
                ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg hover:shadow-red-300/50"
                : "text-slate-600 hover:text-red-600 hover:bg-red-50"
            }`}
          >
            <Flag className="h-4 w-4 mr-2" />
            Reported ({reportedCount})
          </Button>
        </div>

        {/* Search */}
        <div className="relative hidden">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
          <input
            value={aptSearch}
            onChange={(e) => setAptSearch(e.target.value)}
            placeholder="Search by name or location…"
            className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-amber-100 bg-white/90 backdrop-blur-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow"
          />
        </div>

      {/* Grid */}
      <div className="hidden grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredApts.map((apt) => {
          const landlord = getLandlordForApt(apt);
          const aptViolations = violations.filter((v) => v.apartment_id === apt.id || (!v.apartment_id && v.apartmentTitle === apt.title));
          const aptReportCount = getApartmentReportCount(apt.id);
          const isAvailable = new Date(apt.availableDate) <= new Date();
          return (
            <div key={apt.id}
              className="bg-white/90 backdrop-blur-xl border-2 border-amber-100/60 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer"
              onClick={() => setSelectedApt(apt)}>
              {/* Image */}
              <div className="relative h-44 bg-gradient-to-br from-amber-100 to-orange-100 overflow-hidden">
                {apt.images?.[0]
                  ? <img src={apt.images[0]} alt={apt.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  : <div className="w-full h-full flex items-center justify-center"><Building2 className="h-12 w-12 text-amber-300" /></div>}
                <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow ${
                    isAvailable ? "bg-green-500 text-white" : "bg-slate-500 text-white"
                  }`}>{isAvailable ? "Available" : "Occupied"}</span>
                  {aptReportCount > 0 && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-orange-500 text-white shadow flex items-center gap-1">
                      <Flag className="h-3 w-3" />{aptReportCount} {aptReportCount === 1 ? "Report" : "Reports"}
                    </span>
                  )}
                  {aptViolations.length > 0 && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-500 text-white shadow flex items-center gap-1">
                      <AlertOctagon className="h-3 w-3" />{aptViolations.length}
                    </span>
                  )}
                </div>
                {landlord && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-xl px-2.5 py-1">
                    <div className="h-5 w-5 rounded-lg bg-amber-400 flex items-center justify-center font-black text-white text-[9px]">
                      {landlord.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-white text-[10px] font-bold truncate max-w-[80px]">{landlord.name}</span>
                    {landlord.isVerified && <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />}
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="p-4">
                <h3 className="font-black text-slate-900 truncate mb-1">{apt.title}</h3>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mb-3">
                  <MapPin className="h-3 w-3 text-amber-500" />{apt.location}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-amber-700">₱{apt.price?.toLocaleString()}<span className="text-xs text-slate-400 font-medium">/mo</span></span>
                  <div className="flex gap-1.5">
                    {apt.wifi     && <span className="h-6 w-6 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center"><Wifi className="h-3 w-3 text-amber-600" /></span>}
                    {apt.parking  && <span className="h-6 w-6 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center"><Car className="h-3 w-3 text-amber-600" /></span>}
                    {apt.petFriendly && <span className="h-6 w-6 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center"><PawPrint className="h-3 w-3 text-amber-600" /></span>}
                    {apt.furnished && <span className="h-6 w-6 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center"><Sofa className="h-3 w-3 text-amber-600" /></span>}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-amber-50 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="outline"
                    onClick={() => setSelectedApt(apt)}
                    className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50 font-bold rounded-xl text-xs">
                    <Eye className="h-3.5 w-3.5 mr-1.5" />Inspect
                  </Button>
                  {landlord && <>
                    <Button size="sm" variant="outline"
                      onClick={() => openViolationModal("violation", text(landlord.id), text(landlord.name, "Landlord"), apt.title, undefined, apt.id)}
                      className="border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl text-xs">
                      <AlertOctagon className="h-3.5 w-3.5 mr-1.5" />Violation
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => openViolationModal("notice", text(landlord.id), text(landlord.name, "Landlord"), apt.title, undefined, apt.id)}
                      className="border-amber-200 text-amber-700 hover:bg-amber-50 font-bold rounded-xl text-xs">
                      <Bell className="h-3.5 w-3.5 mr-1.5" />Notice
                    </Button>
                  </>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filteredApts.length === 0 && (
        <div className="hidden py-16 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-3 text-amber-200" />
          <p className="text-slate-400 font-medium">No apartments found</p>
        </div>
      )}

      {/* Apartment detail modal */}
      {selectedApt && (() => {
        const landlord = getLandlordForApt(selectedApt);
        const aptViolations = violations.filter((v) => v.apartment_id === selectedApt.id || (!v.apartment_id && v.apartmentTitle === selectedApt.title));
        const aptReports = reports.filter((r) => r.apartmentId === selectedApt.id && r.status === "pending");
        const isAvailable = new Date(selectedApt.availableDate) <= new Date();
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedApt(null)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-amber-100 overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}>
              {/* Header image */}
              <div className="relative h-52 bg-gradient-to-br from-amber-100 to-orange-100 shrink-0">
                {selectedApt.images?.[0]
                  ? <img src={selectedApt.images[0]} alt={selectedApt.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Building2 className="h-16 w-16 text-amber-300" /></div>}
                <button onClick={() => setSelectedApt(null)}
                  className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-black/50 backdrop-blur-sm hover:bg-black/70 flex items-center justify-center text-white transition-all">
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-4 left-4">
                  <span className={`text-xs font-black px-3 py-1.5 rounded-full shadow ${isAvailable ? "bg-green-500 text-white" : "bg-slate-600 text-white"}`}>
                    {isAvailable ? "Available" : "Occupied"}
                  </span>
                </div>
              </div>
              {/* Body */}
              <div className="overflow-y-auto p-6 space-y-5">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{selectedApt.title}</h3>
                  <p className="text-slate-500 text-sm font-medium flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-amber-500" />{selectedApt.location}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Room Pricing", value: "See individual rooms" },
                    { label: "Bedrooms", value: selectedApt.bedrooms ?? "—" },
                    { label: "Bathrooms", value: selectedApt.bathrooms ?? "—" },
                    { label: "Available", value: new Date(selectedApt.availableDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">{label}</p>
                      <p className="font-black text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
                {selectedApt.description && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{selectedApt.description}</p>
                  </div>
                )}
                {/* Amenities */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amenities</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "wifi",        icon: Wifi,       label: "WiFi" },
                      { key: "parking",     icon: Car,        label: "Parking" },
                      { key: "petFriendly", icon: PawPrint,   label: "Pet-friendly" },
                      { key: "furnished",   icon: Sofa,       label: "Furnished" },
                    ].map(({ key, icon: Icon, label }) => (
                      <span key={key} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border-2 ${
                        selectedApt[key] ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-slate-50 border-slate-200 text-slate-400 line-through"
                      }`}>
                        <Icon className="h-3.5 w-3.5" />{label}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Features */}
                {Array.isArray(selectedApt.features) && selectedApt.features.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Features</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedApt.features.map((f: string, i: number) => (
                        <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Rooms */}
                {(selectedApt.rooms?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Rooms ({selectedApt.rooms?.length ?? 0})
                    </p>
                    <div className="space-y-2">
                      {(selectedApt.rooms ?? []).map((room, i) => {
                        const roomData = room as Record<string, unknown>;
                        return (
                        <div key={String(roomData.id ?? i)} className="p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-amber-800">{String(roomData.type ?? "Room")}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              roomData.isOccupied ? "bg-red-100 text-red-700 border border-red-200" : "bg-green-100 text-green-700 border border-green-200"
                            }`}>
                              {roomData.isOccupied ? "Occupied" : "Available"}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: "Rent", value: `₱${Number(roomData.rent ?? 0).toLocaleString()}/mo` },
                              { label: "Size", value: `${String(roomData.sqft ?? "—")} sqft` },
                              { label: "Max Pax", value: `${String(roomData.maxOccupants ?? "—")}` },
                            ].map(({ label, value }) => (
                              <div key={label} className="text-center p-1.5 bg-white rounded-lg border border-amber-100">
                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">{label}</p>
                                <p className="text-xs font-black text-slate-800 mt-0.5">{value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {Boolean(roomData.hasPrivateBath) && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                {roomData.bathroomType === "en-suite" ? "Private en-suite bath" : "Private separate bath"}
                              </span>
                            )}
                            {!Boolean(roomData.hasPrivateBath) && (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                                Shared bath{roomData.sharedBathLocation ? ` (${String(roomData.sharedBathLocation)})` : ""}
                              </span>
                            )}
                            {Boolean(roomData.hasAC) && (
                              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                                Air conditioned
                              </span>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Landlord */}
                {landlord && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Landlord</p>
                    <div className="flex items-center gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-black text-white text-sm shadow shrink-0">
                        {landlord.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 text-sm">{landlord.name}</p>
                        <p className="text-xs text-slate-400 font-medium">{landlord.email}</p>
                      </div>
                      {landlord.isVerified
                        ? <Badge className="bg-green-100 text-green-800 border border-green-200 font-bold text-xs shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                        : <Badge className="bg-orange-100 text-orange-700 border border-orange-200 font-bold text-xs shrink-0"><Clock className="h-3 w-3 mr-1" />Pending</Badge>}
                    </div>
                  </div>
                )}
                {/* Reports from students/employees */}
                {aptReports.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Flag className="h-3.5 w-3.5" />
                      Pending Reports ({aptReports.length})
                    </p>
                    <div className="space-y-2">
                      {aptReports.map((r) => (
                        <div key={r.id} className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-1">
                              <Badge className="bg-orange-600 text-white text-[10px] font-black">{r.issueType}</Badge>
                              <span className="text-[10px] text-slate-500 font-medium">by {r.reporter} ({r.role})</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              {formatOptionalDate(r.submittedAt ?? r.submitted_at, { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium">{r.details}</p>
                          {r.contact && (
                            <p className="text-[10px] text-slate-500 mt-1">Contact: {r.contact}</p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="outline"
                              onClick={(e) => { e.stopPropagation(); resolveReport(text(r.id)); }}
                              className="flex-1 border-green-200 text-green-700 hover:bg-green-50 font-bold rounded-lg text-xs">
                              <CheckCheck className="h-3.5 w-3.5 mr-1" />Resolve
                            </Button>
                            <Button size="sm" variant="outline"
                              onClick={(e) => { e.stopPropagation(); dismissReport(text(r.id)); }}
                              className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs">
                              <XCircle className="h-3.5 w-3.5 mr-1" />Dismiss
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Past violations for this apartment */}
                {aptViolations.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Violations on this Listing</p>
                    <div className="space-y-2">
                      {aptViolations.map((v) => (
                        <div key={v.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                          <AlertOctagon className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-black text-red-800">{v.type}</p>
                            {v.message && <p className="text-xs text-red-600 font-medium mt-0.5">{v.message}</p>}
                            <p className="text-[10px] text-red-400 mt-1">{formatOptionalDate(v.issuedAt ?? v.issued_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Footer actions */}
              {landlord && (
                <div className="px-6 py-4 border-t border-amber-50 flex gap-3 shrink-0 flex-wrap">
                  <Button onClick={() => navigate(`/admin/apartment/${selectedApt.id}`)}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-md">
                    <Eye className="h-4 w-4 mr-2" />Full Inspection
                  </Button>
                  <Button onClick={() => { setSelectedApt(null); openViolationModal("violation", text(landlord.id), text(landlord.name, "Landlord"), selectedApt.title, undefined, selectedApt.id); }}
                    className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold rounded-xl shadow-md">
                    <AlertOctagon className="h-4 w-4 mr-2" />Issue Violation
                  </Button>
                  <Button variant="outline" onClick={() => { setSelectedApt(null); openViolationModal("notice", text(landlord.id), text(landlord.name, "Landlord"), selectedApt.title, undefined, selectedApt.id); }}
                    className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50 font-bold rounded-xl">
                    <BellRing className="h-4 w-4 mr-2" />Send Notice
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
      </div>
    );
  };

  // ── Section: Reports ──────────────────────────────────────────────────────
  const renderReports = () => {
    const pending   = reports.filter((r: any) => r.status === "pending");
    const resolved  = reports.filter((r: any) => r.status === "resolved");
    const dismissed = reports.filter((r: any) => r.status === "dismissed");
    const reportTypes = Array.from(new Set(reports.map((report) => String(report.issueType ?? report.issue_type ?? report.category ?? "").trim()).filter(Boolean))).sort();
    const normalizedSearch = reportSearch.trim().toLowerCase();
    const getReportApartment = (report: DashboardReportRow) => allApartments.find((apartment) => apartment.id === (report.apartmentId ?? report.apartment_id));
    const getReportApartmentTitle = (report: DashboardReportRow) => report.apartment_title ?? report.apartment ?? getReportApartment(report)?.title ?? report.apartment_id ?? "Apartment unavailable";
    const getReporterLabel = (report: DashboardReportRow) => report.reporter_name ?? report.reporter ?? report.reporter_id ?? "Reporter unavailable";
    const visibleReports = reports
      .filter((report) => {
        const type = String(report.issueType ?? report.issue_type ?? report.category ?? "");
        const matchesStatus = reportStatusFilter === "all" || report.status === reportStatusFilter;
        const matchesType = reportTypeFilter === "all" || type === reportTypeFilter;
        const matchesSearch = !normalizedSearch || [getReportApartmentTitle(report), getReporterLabel(report), type, report.details, report.id]
          .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
        return matchesStatus && matchesType && matchesSearch;
      })
      .sort((left, right) => {
        const leftTime = new Date(left.submittedAt ?? left.submitted_at ?? 0).getTime();
        const rightTime = new Date(right.submittedAt ?? right.submitted_at ?? 0).getTime();
        return reportSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
      });
    const currentDate = new Date().toLocaleDateString("en-PH", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });

    const ReportRow = ({ report }: { report: any }) => {
      const sev = SEVERITY_LABEL[report.severity] ?? SEVERITY_LABEL["med"];
      return (
        <div
          className={`px-6 py-4 hover:bg-amber-50/40 transition-colors cursor-pointer ${
            report.status === "pending" ? "border-l-4 border-l-amber-500" : "border-l-4 border-l-transparent"
          }`}
          onClick={() => setSelectedReport(report)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`mt-1 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs shadow ${
                report.role === "student" ? "bg-gradient-to-br from-blue-100 to-sky-100 text-blue-700" : "bg-gradient-to-br from-purple-100 to-violet-100 text-purple-700"
              }`}>
                {report.reporter.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="font-black text-slate-900 text-sm">{report.reporter}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    report.role === "student" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                  }`}>{report.role}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sev.class}`}>{sev.label}</span>
                  {report.status === "resolved"  && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">Resolved</span>}
                  {report.status === "dismissed" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Dismissed</span>}
                </div>
                <p className="text-xs text-slate-500 font-medium truncate">
                  <span className="text-amber-700 font-bold">{report.apartment}</span> — {report.issueType}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{report.details}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-slate-400 font-medium">
                {formatOptionalDate(report.submittedAt ?? report.submitted_at, { month: "short", day: "numeric" })}
              </p>
              <ChevronRight className="h-4 w-4 text-slate-300 ml-auto mt-1" />
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5">
          <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-200/60"><Flag className="h-5 w-5" /></span>
              <div><h1 className="text-2xl font-black text-slate-950 md:text-3xl">Reports</h1><p className="text-sm font-medium text-slate-500">Review reports submitted by students and employees.</p></div>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button onClick={() => setActiveSection("notifications")} title="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-amber-300 hover:text-amber-600"><Bell className="h-4 w-4" />{unreadNotifsCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-black leading-4 text-white">{unreadNotifsCount}</span>}</button>
              <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm"><Calendar className="h-4 w-4 text-amber-600" />{currentDate}</div>
            </div>
          </header>

          <section className="grid gap-3 md:grid-cols-3">
            {[
              { label: "Pending Reports", value: pending.length, note: "Awaiting review", icon: Clock, tone: "bg-orange-50 text-orange-600" },
              { label: "Resolved Reports", value: resolved.length, note: "Successfully resolved", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
              { label: "Dismissed Reports", value: dismissed.length, note: "No action required", icon: XCircle, tone: "bg-blue-50 text-blue-600" },
            ].map(({ label, value, note, icon: Icon, tone }) => (
              <motion.div key={label} whileHover={{ y: -3 }} className="flex min-h-[112px] items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span><span><span className="block text-2xl font-black text-slate-950">{value}</span><span className="block text-xs font-bold text-slate-700">{label}</span><span className="block text-[10px] font-semibold text-slate-400">{note}</span></span></motion.div>
            ))}
          </section>

          <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[minmax(240px,1fr)_160px_190px_150px]">
            <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search by apartment, reporter, type, or ID" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100" /></label>
            <select value={reportStatusFilter} onChange={(event) => setReportStatusFilter(event.target.value as typeof reportStatusFilter)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-amber-400"><option value="all">Status: All</option><option value="pending">Pending</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select>
            <select value={reportTypeFilter} onChange={(event) => setReportTypeFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-amber-400"><option value="all">Type: All</option>{reportTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
            <select value={reportSort} onChange={(event) => setReportSort(event.target.value as typeof reportSort)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-amber-400"><option value="newest">Sort: Newest</option><option value="oldest">Sort: Oldest</option></select>
          </section>

          <nav className="grid grid-cols-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {[
              { label: "All Reports", value: "all", count: reports.length, icon: FileText },
              { label: "Pending", value: "pending", count: pending.length, icon: Clock },
              { label: "Resolved", value: "resolved", count: resolved.length, icon: CheckCircle2 },
              { label: "Dismissed", value: "dismissed", count: dismissed.length, icon: XCircle },
            ].map(({ label, value, count, icon: Icon }) => (
              <button key={value} onClick={() => setReportStatusFilter(value as typeof reportStatusFilter)} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-md px-2 text-[10px] font-black transition sm:text-xs ${reportStatusFilter === value ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200" : "text-slate-500 hover:bg-slate-50"}`}><Icon className="hidden h-3.5 w-3.5 sm:block" /><span className="truncate">{label}</span><span className="rounded bg-white/80 px-1.5 py-0.5 text-[9px]">{count}</span></button>
            ))}
          </nav>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {reports.length === 0 ? (
              <div className="flex min-h-[390px] flex-col items-center justify-center p-6 text-center"><span className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-orange-50 text-orange-500"><Flag className="h-10 w-10" /></span><h3 className="text-xl font-black text-slate-900">No reports submitted yet.</h3><p className="mt-1 max-w-sm text-sm font-medium text-slate-500">Reports submitted by students or employees will appear here for review.</p></div>
            ) : visibleReports.length === 0 ? (
              <OverviewEmpty icon={Search} text="No reports match the selected filters." />
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleReports.map((report) => {
                  const apartment = getReportApartment(report);
                  const severity = SEVERITY_LABEL[report.severity ?? "med"] ?? SEVERITY_LABEL.med;
                  const statusClass = report.status === "resolved" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : report.status === "dismissed" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-orange-50 text-orange-700 border-orange-100";
                  return (
                    <motion.article key={report.id} whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.85)" }} onClick={() => setSelectedReport(report)} className="grid cursor-pointer gap-4 p-4 md:p-5 xl:grid-cols-[minmax(260px,1.35fr)_minmax(180px,0.8fr)_150px_190px] xl:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">{apartment?.image ? <img src={apartment.image} alt="" className="h-full w-full object-cover" /> : <Flag className="h-5 w-5 text-slate-300" />}</span>
                        <div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-900">{getReportApartmentTitle(report)}</h3><p className="mt-1 truncate text-xs font-medium text-slate-500">{String(report.issueType ?? report.issue_type ?? report.category ?? "Report type not specified")}</p><p className="mt-1 line-clamp-1 text-[10px] text-slate-400">{report.details || "No description provided."}</p></div>
                      </div>
                      <div className="min-w-0"><p className="text-[9px] font-black uppercase text-slate-400">Reported by</p><p className="mt-1 truncate text-xs font-bold text-slate-700">{getReporterLabel(report)}</p><p className="mt-1 text-[10px] font-medium capitalize text-slate-400">{report.reporter_role ?? report.role ?? "Role unavailable"}</p></div>
                      <div className="flex flex-wrap gap-1.5 xl:block"><span className={`inline-flex rounded-md border px-2 py-1 text-[9px] font-black uppercase ${statusClass}`}>{report.status || "Pending"}</span><span className={`ml-1.5 inline-flex rounded-md border px-2 py-1 text-[9px] font-black ${severity.class}`}>{severity.label}</span><p className="mt-2 text-[10px] font-semibold text-slate-400">{formatOptionalDate(report.submittedAt ?? report.submitted_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
                      <div className="grid grid-cols-2 gap-2" onClick={(event) => event.stopPropagation()}><Button size="sm" variant="outline" onClick={() => setSelectedReport(report)} className="h-8 rounded-md border-slate-200 text-[10px] font-black text-slate-600"><Eye className="mr-1 h-3 w-3" />Details</Button><Button size="sm" variant="outline" disabled={!apartment?.id} onClick={() => apartment?.id && navigate(`/admin/apartment/${apartment.id}`)} className="h-8 rounded-md border-orange-200 text-[10px] font-black text-orange-700 hover:bg-orange-50"><Building2 className="mr-1 h-3 w-3" />Apartment</Button></div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="grid gap-4 rounded-lg border border-amber-200 bg-amber-50/60 p-4 md:grid-cols-3">{[{ icon: Shield, title: "Fair review", text: "Every report remains available for administrative investigation." }, { icon: Clock, title: "Timely action", text: "Pending reports stay visible until resolved or dismissed." }, { icon: FileText, title: "Detailed records", text: "Reporter, apartment, evidence, and status details stay connected." }].map(({ icon: Icon, title, text: description }) => <div key={title} className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm"><Icon className="h-4 w-4" /></span><div><p className="text-xs font-black text-slate-800">{title}</p><p className="mt-0.5 text-[11px] font-medium leading-relaxed text-slate-500">{description}</p></div></div>)}</section>
        </motion.div>

        <div className="hidden items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
            <Flag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">Reports</h2>
            <p className="text-slate-500 text-sm font-medium">Submitted by students and employees</p>
          </div>
        </div>
        <div className="hidden grid-cols-3 gap-3">
          {[
            { label: "Pending",   count: pending.length,   grad: "from-amber-500 to-orange-600" },
            { label: "Resolved",  count: resolved.length,  grad: "from-green-500 to-emerald-600" },
            { label: "Dismissed", count: dismissed.length, grad: "from-slate-400 to-slate-500" },
          ].map(({ label, count, grad }) => (
            <div key={label} className="bg-white/90 backdrop-blur-xl border border-amber-100 rounded-2xl p-4 shadow text-center">
              <p className={`text-3xl font-black bg-gradient-to-r ${grad} bg-clip-text text-transparent`}>{count}</p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        {pending.length > 0 && (
          <Card className="hidden border-2 border-amber-200/60 bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden">
            <div className="px-6 py-3 border-b border-amber-50 bg-amber-50/50 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Pending — needs action</span>
            </div>
            <div className="divide-y divide-amber-50">{pending.map((r: any) => <ReportRow key={r.id} report={r} />)}</div>
          </Card>
        )}
        {(resolved.length > 0 || dismissed.length > 0) && (
          <Card className="hidden border-2 border-slate-100 bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Closed</span>
            </div>
            <div className="divide-y divide-slate-50">{[...resolved, ...dismissed].map((r: any) => <ReportRow key={r.id} report={r} />)}</div>
          </Card>
        )}
        {reports.length === 0 && (
          <div className="hidden py-16 text-center">
            <Flag className="h-12 w-12 mx-auto mb-3 text-amber-200" />
            <p className="text-slate-400 font-medium">No reports submitted yet</p>
          </div>
        )}

        {/* Report detail modal */}
        {selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedReport(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-amber-100 overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-amber-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow">
                    <Flag className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900">Report Detail</p>
                    <p className="text-slate-400 text-xs font-medium">Review submitted report</p>
                  </div>
                </div>
                <button onClick={() => setSelectedReport(null)} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>

              {/* Body - Scrollable */}
              <div className="px-6 py-5 space-y-4 overflow-y-auto">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs font-bold ${
                    selectedReport.status === "pending" ? "bg-amber-100 text-amber-800 border border-amber-300" :
                    selectedReport.status === "resolved" ? "bg-green-100 text-green-800 border border-green-300" :
                    "bg-slate-100 text-slate-800 border border-slate-300"
                  }`}>
                    {selectedReport.status?.toUpperCase()}
                  </Badge>
                  <span className="text-xs font-medium text-slate-400">
                    {formatOptionalDate(selectedReport.submittedAt ?? selectedReport.submitted_at, {
                      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </span>
                </div>

                {/* Reporting Tenant Section */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reporting Tenant</p>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm shadow shrink-0 ${
                        selectedReport.role === "student" ? "bg-gradient-to-br from-blue-100 to-sky-200 text-blue-700" : "bg-gradient-to-br from-purple-100 to-violet-200 text-purple-700"
                      }`}>
                        {text(selectedReport.reporter).split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 text-sm">{selectedReport.reporter}</p>
                        <p className="text-xs text-slate-500 font-medium capitalize">{selectedReport.role}</p>
                        {selectedReport.contact && <p className="text-xs text-slate-500 font-medium">{selectedReport.contact}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (selectedReportDetails?.reporter) {
                            setViewingUserProfile(selectedReportDetails.reporter);
                          }
                        }}
                        className="border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-bold rounded-lg shrink-0"
                      >
                        <UserIcon className="h-3.5 w-3.5 mr-1" />View
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Reported Apartment Section */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reported Apartment</p>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="space-y-2">
                      <p className="font-bold text-slate-900">{selectedReport.apartment || "Unknown Apartment"}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-400 font-medium">Date Submitted</p>
                          <p className="font-bold text-slate-800">
                            {formatOptionalDate(selectedReport.submittedAt ?? selectedReport.submitted_at, {
                              month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">Report Status</p>
                          <p className="font-bold text-slate-800 capitalize">{selectedReport.status || "pending"}</p>
                        </div>
                      </div>
                      <div className="pt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (selectedReportDetails?.apartment?.id) {
                              setSelectedReport(null);
                              navigate(`/admin/apartment/${selectedReportDetails.apartment.id}`);
                            }
                          }}
                          className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-100 text-xs font-bold rounded-lg"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />View Reported Apartment
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Landlord Information Section */}
                {selectedReportDetails?.landlord && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Landlord (Property Owner)</p>
                    <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-100 to-amber-200 flex items-center justify-center font-black text-sm shadow text-orange-700 shrink-0">
                          {selectedReportDetails.landlord.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-sm">{selectedReportDetails.landlord.name}</p>
                          <p className="text-xs text-slate-500 font-medium truncate">{selectedReportDetails.landlord.email}</p>
                          {selectedReportDetails.landlord.mobile && <p className="text-xs text-slate-500 font-medium">{selectedReportDetails.landlord.mobile}</p>}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingUserProfile(selectedReportDetails.landlord)}
                          className="border-orange-200 text-orange-600 hover:bg-orange-100 text-xs font-bold rounded-lg shrink-0"
                        >
                          <UserIcon className="h-3.5 w-3.5 mr-1" />View
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Report Description */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Problem Description</p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">
                      {selectedReport.details || "No description provided."}
                    </p>
                  </div>
                </div>

                {/* Uploaded Evidence */}
                <div>
                  <EvidenceViewer
                    evidence={selectedReportEvidence}
                    title="Uploaded Evidence/Image"
                  />
                </div>

                {/* Contact Information */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contact Information</p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-sm font-medium text-slate-800">{selectedReport.contact || "No contact information provided."}</p>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              {selectedReport.status === "pending" && (
                <div className="px-6 py-4 border-t border-amber-50 flex gap-2 shrink-0 flex-wrap">
                  <Button
                    onClick={() => resolveReport(text(selectedReport.id))}
                    className="flex-1 min-w-[120px] bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-md text-sm"
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />Resolve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDismissReportModal({ reportId: text(selectedReport.id), reason: "" })}
                    className="flex-1 min-w-[120px] border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-sm"
                  >
                    <XCircle className="h-4 w-4 mr-2" />Dismiss
                  </Button>
                </div>
              )}
              {selectedReport.status !== "pending" && (
                <div className="px-6 py-4 border-t border-amber-50 text-center shrink-0">
                  <p className="text-sm text-slate-500 font-medium">
                    This report has been <span className="font-black capitalize">{selectedReport.status}</span> on {formatOptionalDate(selectedReport.resolved_at, { month: "short", day: "numeric" })}.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dismiss Report Modal with Reason */}
        {dismissReportModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={() => setDismissReportModal(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-amber-100 p-6"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-black text-slate-900 mb-2">Dismiss Report</h3>
              <p className="text-sm text-slate-500 font-medium mb-4">
                Why are you dismissing this report? (Optional)
              </p>
              <textarea
                value={dismissReportModal.reason}
                onChange={(e) => setDismissReportModal({ ...dismissReportModal, reason: e.target.value })}
                placeholder="e.g., Investigation inconclusive, False complaint, Already resolved by landlord..."
                className="w-full px-4 py-3 rounded-xl border-2 border-amber-200 bg-white/80 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                rows={4}
              />
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setDismissReportModal(null)}
                  className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (dismissReportModal.reportId) {
                      dismissReport(dismissReportModal.reportId, dismissReportModal.reason || undefined);
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl"
                >
                  Confirm Dismissal
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* User Profile Modal */}
        {viewingUserProfile && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={() => setViewingUserProfile(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-amber-100 overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-black text-white">User Profile</h3>
                <button onClick={() => setViewingUserProfile(null)} className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
              <div className="px-6 py-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center font-black text-2xl text-orange-700 shadow shrink-0">
                    {viewingUserProfile.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-slate-900">{viewingUserProfile.name}</p>
                    <p className="text-xs text-slate-500 font-medium capitalize">{viewingUserProfile.role}</p>
                  </div>
                </div>
                <div className="space-y-3 pt-2 border-t border-amber-50">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                    <p className="text-sm font-medium text-slate-800">{viewingUserProfile.email}</p>
                  </div>
                  {viewingUserProfile.mobile && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                      <p className="text-sm font-medium text-slate-800">{viewingUserProfile.mobile}</p>
                    </div>
                  )}
                  {typeof viewingUserProfile.address === "string" && viewingUserProfile.address.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Address</p>
                      <p className="text-sm font-medium text-slate-800">{viewingUserProfile.address}</p>
                    </div>
                  )}
                  {viewingUserProfile.is_verified !== undefined && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Verification</p>
                      <Badge className={`text-xs font-bold ${
                        viewingUserProfile.is_verified ? "bg-green-100 text-green-800 border border-green-300" : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}>
                        {viewingUserProfile.is_verified ? "Verified" : "Pending"}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Section: Appeals Management ─────────────────────────────────────────
  const renderAppeals = () => {
    const landlordMap = new Map<string, DashboardUserRow>();
    landlords.forEach((l) => {
      if (l.id) landlordMap.set(l.id, l);
    });
    const normalizedSearch = appealSearch.trim().toLowerCase();
    const visibleAppeals = appeals
      .filter((appeal) => {
        const landlord = landlordMap.get(appeal.landlord_id ?? "");
        const type = appeal.report_id ? "report" : appeal.violation_id ? "violation" : "general";
        const matchesType = appealTypeFilter === "all" || appealTypeFilter === type;
        const matchesSearch = !normalizedSearch || [landlord?.name, landlord?.email, appeal.reason, appeal.description, appeal.id]
          .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
        return matchesType && matchesSearch;
      })
      .sort((left, right) => {
        const leftTime = new Date(left.submitted_at ?? left.created_at ?? 0).getTime();
        const rightTime = new Date(right.submitted_at ?? right.created_at ?? 0).getTime();
        return appealSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
      });
    const reportAppealCount = appeals.filter((appeal) => Boolean(appeal.report_id)).length;
    const violationAppealCount = appeals.filter((appeal) => Boolean(appeal.violation_id)).length;
    const currentDate = new Date().toLocaleDateString("en-PH", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });

    const handleUpdateAppealStatus = async () => {
      if (!selectedAppeal?.id || !user?.id) {
        toast.error("Cannot update appeal - missing information");
        return;
      }

      try {
        const updated = await updateAppealStatus(
          selectedAppeal.id,
          appealStatus,
          user.id,
          appealResponse
        );

        if (updated) {
          toast.success(`Appeal marked as ${appealStatus}`);
          setAppeals((prev) => prev.map((a) => (a.id === selectedAppeal.id ? updated : a)));
          setSelectedAppeal(null);
          setAppealResponse("");
          setAppealStatus("under_review");
        } else {
          toast.error("Failed to update appeal");
        }
      } catch (error) {
        console.error("Error updating appeal:", error);
        toast.error("Error updating appeal");
      }
    };

    return (
      <div className="space-y-5">
        <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex max-w-[1500px] flex-col gap-4 border-b border-slate-200/80 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-200/60"><AlertTriangle className="h-5 w-5" /></span>
            <div><div className="flex items-center gap-2"><h1 className="text-2xl font-black text-slate-950 md:text-3xl">Appeal Management</h1>{appeals.length > 0 && <span className="rounded-md bg-orange-50 px-2 py-1 text-xs font-black text-orange-700 ring-1 ring-orange-200">{appeals.length}</span>}</div><p className="text-sm font-medium text-slate-500">Review and take action on landlord appeals.</p></div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button onClick={() => setActiveSection("notifications")} title="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-amber-300 hover:text-amber-600"><Bell className="h-4 w-4" />{unreadNotifsCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-black leading-4 text-white">{unreadNotifsCount}</span>}</button>
            <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm"><Calendar className="h-4 w-4 text-amber-600" />{currentDate}</div>
          </div>
        </motion.header>

        <div className="hidden items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="text-xs font-black text-amber-600 uppercase tracking-widest">
              Appeal Management ({appeals.length})
            </h2>
          </div>
        </div>

        {selectedAppeal ? (
          // Detail view
          <div className="space-y-4">
            <Button
              onClick={() => {
                setSelectedAppeal(null);
                setAppealResponse("");
                setAppealStatus("under_review");
              }}
              variant="outline"
              className="border-amber-200 text-amber-600 hover:bg-amber-50 font-bold text-xs"
            >
              Back to Appeals
            </Button>

            <Card className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <CardContent className="pt-6 space-y-4">
                {/* Landlord Info */}
                {selectedAppeal.landlord_id && (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <h3 className="font-bold text-sm text-slate-900 mb-2">Landlord Information</h3>
                    {(() => {
                      const landlord = landlordMap.get(selectedAppeal.landlord_id);
                      return landlord ? (
                        <div className="space-y-1 text-xs">
                          <p><strong>Name:</strong> {landlord.name || "—"}</p>
                          <p><strong>Email:</strong> {landlord.email || "—"}</p>
                          <p><strong>Phone:</strong> {landlord.mobile || "—"}</p>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-xs">Landlord record unavailable.</p>
                      );
                    })()}
                  </div>
                )}

                {/* Appeal Details */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-900">Appeal Details</h3>

                  {selectedAppeal.report_id && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <Badge className="bg-blue-600 mb-2">Report Appeal</Badge>
                      <p className="text-xs text-slate-600">Linked report information is available to the review workflow.</p>
                    </div>
                  )}

                  {selectedAppeal.violation_id && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <Badge className="bg-red-600 mb-2">Violation Appeal</Badge>
                      <p className="text-xs text-slate-600">Linked violation information is available to the review workflow.</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">Reason for Appeal</label>
                    <div className="p-3 rounded-lg bg-slate-100 text-slate-700 text-xs border border-slate-200">
                      {selectedAppeal.reason || "—"}
                    </div>
                  </div>

                  {selectedAppeal.description && (
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">Description</label>
                      <div className="p-3 rounded-lg bg-slate-100 text-slate-700 text-xs border border-slate-200">
                        {selectedAppeal.description}
                      </div>
                    </div>
                  )}

                  {selectedAppeal.supporting_docs && selectedAppeal.supporting_docs.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">Supporting Documents</label>
                      <div className="space-y-1">
                        {selectedAppeal.supporting_docs.map((doc, i) => {
                          const document = typeof doc === "object" && doc !== null ? doc as Record<string, unknown> : null;
                          const url = typeof doc === "string" ? doc : String(document?.file_url ?? document?.url ?? "");
                          const name = String(document?.file_name ?? document?.name ?? `Supporting document ${i + 1}`);
                          return url ? (
                            <a key={`${url}-${i}`} href={url} target="_blank" rel="noreferrer" className="block text-xs font-bold text-blue-600 hover:underline">{name}</a>
                          ) : (
                            <p key={i} className="text-xs font-medium text-slate-500">{name}</p>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500 font-medium">Submitted</p>
                      <p className="text-slate-900 font-bold">
                        {selectedAppeal.submitted_at
                          ? new Date(selectedAppeal.submitted_at).toLocaleDateString("en-PH")
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Status</p>
                      <Badge
                        className={`inline-block font-bold text-[10px] ${
                          selectedAppeal.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : selectedAppeal.status === "under_review"
                              ? "bg-blue-100 text-blue-800"
                              : selectedAppeal.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedAppeal.status?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Admin Action Section */}
                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <h3 className="font-bold text-sm text-slate-900">Admin Response</h3>

                  {selectedAppeal.admin_response && (
                    <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
                      <p className="text-xs text-slate-500 font-medium mb-1">Previous Response</p>
                      <p className="text-xs text-slate-700">{selectedAppeal.admin_response}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-2">Update Status</label>
                    <div className="flex gap-2">
                      {(["under_review", "approved", "rejected"] as const).map((status) => (
                        <Button
                          key={status}
                          onClick={() => setAppealStatus(status)}
                          className={`flex-1 text-xs font-bold py-2 ${
                            appealStatus === status
                              ? status === "under_review"
                                ? "bg-blue-600 text-white"
                                : status === "approved"
                                  ? "bg-green-600 text-white"
                                  : "bg-red-600 text-white"
                              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                          }`}
                        >
                          {status === "under_review" ? "Under Review" : status.charAt(0).toUpperCase() + status.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">Admin Response Message</label>
                    <textarea
                      value={appealResponse}
                      onChange={(e) => setAppealResponse(e.target.value)}
                      placeholder="Enter your decision and explanation..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:border-transparent text-xs font-medium text-slate-900 placeholder-slate-400 resize-vertical min-h-[100px]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateAppealStatus}
                      className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-xs hover:shadow-lg"
                    >
                      Save Appeal Decision
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedAppeal(null);
                        setAppealResponse("");
                        setAppealStatus("under_review");
                      }}
                      variant="outline"
                      className="border-amber-300 text-amber-600 hover:bg-amber-50 font-bold text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // List view
          <div className="mx-auto max-w-[1500px] space-y-5">
            <section className="grid gap-3 md:grid-cols-3">
              {[
                { label: "Pending Appeals", value: appeals.length, note: "Awaiting review", icon: AlertTriangle, tone: "bg-orange-50 text-orange-600" },
                { label: "Report Appeals", value: reportAppealCount, note: "Related to reports", icon: Flag, tone: "bg-blue-50 text-blue-600" },
                { label: "Violation Appeals", value: violationAppealCount, note: "Related to violations", icon: ShieldAlert, tone: "bg-rose-50 text-rose-600" },
              ].map(({ label, value, note, icon: Icon, tone }) => (
                <motion.div key={label} whileHover={{ y: -3 }} className="flex min-h-[110px] items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span><span><span className="block text-2xl font-black text-slate-950">{value}</span><span className="block text-xs font-bold text-slate-700">{label}</span><span className="block text-[10px] font-semibold text-slate-400">{note}</span></span></motion.div>
              ))}
            </section>

            <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[minmax(220px,1fr)_190px_150px]">
              <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={appealSearch} onChange={(event) => setAppealSearch(event.target.value)} placeholder="Search by landlord, reason, email, or ID" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100" /></label>
              <select value={appealTypeFilter} onChange={(event) => setAppealTypeFilter(event.target.value as typeof appealTypeFilter)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-amber-400"><option value="all">Type: All Appeals</option><option value="report">Report Appeals</option><option value="violation">Violation Appeals</option><option value="general">General Appeals</option></select>
              <select value={appealSort} onChange={(event) => setAppealSort(event.target.value as typeof appealSort)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-amber-400"><option value="newest">Sort: Newest</option><option value="oldest">Sort: Oldest</option></select>
            </section>

            {appeals.length === 0 ? (
              <section className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm"><span className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-orange-50 text-orange-500"><AlertTriangle className="h-10 w-10" /></span><h3 className="text-xl font-black text-slate-900">No pending appeals.</h3><p className="mt-1 max-w-sm text-sm font-medium text-slate-500">All submitted appeals have been reviewed.</p></section>
            ) : visibleAppeals.length === 0 ? (
              <section className="rounded-lg border border-slate-200 bg-white shadow-sm"><OverviewEmpty icon={Search} text="No appeals match the selected filters." /></section>
            ) : (
              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="divide-y divide-slate-100">{visibleAppeals.map((appeal) => {
                  const landlord = landlordMap.get(appeal.landlord_id ?? "");
                  const type = appeal.report_id ? "Report Appeal" : appeal.violation_id ? "Violation Appeal" : "General Appeal";
                  const typeClass = appeal.report_id ? "bg-blue-50 text-blue-700 border-blue-100" : appeal.violation_id ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-slate-100 text-slate-700 border-slate-200";
                  return <motion.article key={appeal.id} whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.85)" }} onClick={() => setSelectedAppeal(appeal)} className="grid cursor-pointer gap-4 p-4 md:p-5 xl:grid-cols-[minmax(240px,1fr)_minmax(220px,1.2fr)_170px_110px] xl:items-center">
                    <div className="flex min-w-0 items-center gap-3">{landlord?.avatar_url ? <img src={landlord.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-sm font-black text-amber-700">{landlord?.name?.[0]?.toUpperCase() ?? "L"}</span>}<div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-900">{landlord?.name || "Landlord unavailable"}</h3><p className="truncate text-xs font-medium text-slate-500">{landlord?.email || "Contact unavailable"}</p></div></div>
                    <div className="min-w-0"><span className={`inline-flex rounded-md border px-2 py-1 text-[9px] font-black uppercase ${typeClass}`}>{type}</span><p className="mt-2 line-clamp-2 text-xs font-medium text-slate-600">{appeal.reason || "No reason provided."}</p></div>
                    <div><span className="inline-flex rounded-md border border-orange-100 bg-orange-50 px-2 py-1 text-[9px] font-black uppercase text-orange-700">{appeal.status || "Pending"}</span><p className="mt-2 text-[10px] font-semibold text-slate-400">{formatOptionalDate(appeal.submitted_at ?? appeal.created_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
                    <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); setSelectedAppeal(appeal); }} className="h-8 rounded-md border-orange-200 text-[10px] font-black text-orange-700 hover:bg-orange-50"><Eye className="mr-1 h-3 w-3" />Review</Button>
                  </motion.article>;
                })}</div>
              </section>
            )}

            <section className="grid gap-4 rounded-lg border border-amber-200 bg-amber-50/60 p-4 md:grid-cols-3">{[{ icon: Shield, title: "Fair decisions", text: "Each appeal is reviewed from its stored evidence and context." }, { icon: Clock, title: "Timely review", text: "Pending appeals remain visible until an admin decision is saved." }, { icon: FileText, title: "Transparent process", text: "Admin responses and final outcomes stay attached to each appeal." }].map(({ icon: Icon, title, text: description }) => <div key={title} className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm"><Icon className="h-4 w-4" /></span><div><p className="text-xs font-black text-slate-800">{title}</p><p className="mt-0.5 text-[11px] font-medium leading-relaxed text-slate-500">{description}</p></div></div>)}</section>

            {false && (appeals.length > 0 ? (
              appeals.map((appeal) => {
                const landlord = landlordMap.get(appeal.landlord_id ?? "");
                return (
                  <Card
                    key={appeal.id}
                    onClick={() => setSelectedAppeal(appeal)}
                    className="border-2 border-amber-100 hover:border-amber-300 bg-white/90 cursor-pointer transition-all shadow-md hover:shadow-lg"
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-slate-900">
                            {landlord?.name || "Unknown Landlord"}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">{landlord?.email || "—"}</p>
                        </div>
                        <Badge
                          className={`shrink-0 font-bold text-[10px] ${
                            appeal.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : appeal.status === "under_review"
                                ? "bg-blue-100 text-blue-800"
                                : appeal.status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                          }`}
                        >
                          {appeal.status?.toUpperCase() || "PENDING"}
                        </Badge>
                      </div>

                      <div className="mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <p className="text-xs text-slate-600 font-medium line-clamp-2">
                          {appeal.reason || "No reason provided"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex gap-2 items-center">
                          {appeal.report_id && (
                            <Badge className="bg-blue-100 text-blue-700 text-[10px]">Report</Badge>
                          )}
                          {appeal.violation_id && (
                            <Badge className="bg-red-100 text-red-700 text-[10px]">Violation</Badge>
                          )}
                        </div>
                        <span className="text-slate-400 font-medium">
                          {appeal.submitted_at
                            ? new Date(appeal.submitted_at).toLocaleDateString("en-PH")
                            : "—"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="border-2 border-amber-100 bg-white/90">
                <CardContent className="pt-6 text-center py-10">
                  <AlertTriangle className="h-8 w-8 text-amber-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium text-sm">No pending appeals</p>
                  <p className="text-slate-400 text-xs font-medium mt-1">All appeals have been reviewed!</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAdminInfo = () => {
    const inputClass = "h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
    const adminName = `${adminProfile.firstName} ${adminProfile.lastName}`.trim();
    const platformStats = [
      { label: "Violations Issued", value: violations.length, icon: AlertTriangle, tone: "bg-rose-50 text-rose-600" },
      { label: "Total Landlords", value: landlords.length, icon: Users, tone: "bg-violet-50 text-violet-600" },
      { label: "Total Apartments", value: allApartments.length, icon: Building2, tone: "bg-orange-50 text-orange-600" },
      { label: "Open Reports", value: reports.filter((report) => report.status === "pending").length, icon: Flag, tone: "bg-blue-50 text-blue-600" },
    ];

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1400px] space-y-5 pb-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm"><Settings className="h-5 w-5" /></span>
            <div>
              <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">Admin Settings</h2>
              <p className="mt-0.5 text-sm font-medium text-slate-500">Manage your account, security, and preferences.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void openActivityLog()} className="h-10 rounded-md border-orange-200 bg-white font-bold text-orange-700 hover:bg-orange-50"><History className="mr-2 h-4 w-4" />View Activity Log</Button>
        </header>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-orange-500 text-3xl font-black text-white">
              {adminProfile.avatar ? <img src={adminProfile.avatar} alt={adminName || "Admin profile"} className="h-full w-full object-cover" /> : (adminProfile.firstName[0]?.toUpperCase() || <UserIcon className="h-8 w-8" />)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-xl font-black text-slate-950">{isLoadingAdminProfile ? "Loading profile..." : (adminName || "Profile name unavailable")}</h3>
                {user?.role && <Badge className="rounded-md bg-orange-100 text-orange-700 hover:bg-orange-100">{user.role}</Badge>}
              </div>
              <p className="mt-1 truncate text-sm font-medium text-slate-500">{adminProfile.email || "Email unavailable"}</p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-500">
                <span>Department: <strong className="text-slate-700">{adminProfile.department || "Not provided"}</strong></span>
                <span>Access: <strong className="text-slate-700">{adminProfile.adminLevel || "Not provided"}</strong></span>
                <span>Status: <strong className="capitalize text-emerald-600">{user?.status || "Unavailable"}</strong></span>
              </div>
            </div>
            <Button variant="outline" onClick={() => setIsEditingAdminProfile(true)} disabled={isEditingAdminProfile || isLoadingAdminProfile} className="h-10 shrink-0 rounded-md border-orange-200 font-bold text-orange-700 hover:bg-orange-50"><Edit2 className="mr-2 h-4 w-4" />Edit Profile</Button>
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="space-y-5">
            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <SettingsSectionTitle icon={UserIcon} tone="bg-violet-50 text-violet-600" title="Personal Information" description="Your saved account and contact details." />
                <fieldset disabled={!isEditingAdminProfile || isSavingAdminProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
                  <SettingsField label="First Name"><input value={adminProfile.firstName} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, firstName: event.target.value }))} className={inputClass} /></SettingsField>
                  <SettingsField label="Last Name"><input value={adminProfile.lastName} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, lastName: event.target.value }))} className={inputClass} /></SettingsField>
                  <SettingsField label="Email Address" wide><input type="email" value={adminProfile.email} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, email: event.target.value }))} className={inputClass} /></SettingsField>
                  <SettingsField label="Mobile Number" wide><div className="relative"><Smartphone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input type="tel" value={adminProfile.mobile} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, mobile: event.target.value }))} placeholder="Not provided" className={`${inputClass} pl-9`} /></div></SettingsField>
                  <SettingsField label="Bio" wide><textarea rows={4} value={adminProfile.bio} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, bio: event.target.value.slice(0, 200) }))} placeholder="No bio provided" className={`${inputClass} h-auto resize-none py-3`} /><span className="block text-right text-[11px] font-semibold text-slate-400">{adminProfile.bio.length}/200</span></SettingsField>
                </fieldset>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <SettingsSectionTitle icon={Shield} tone="bg-blue-50 text-blue-600" title="Admin Information" description="Your stored administrative role details." />
                <fieldset disabled={!isEditingAdminProfile || isSavingAdminProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
                  <SettingsField label="Department"><input value={adminProfile.department} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, department: event.target.value }))} placeholder="Not provided" className={inputClass} /></SettingsField>
                  <SettingsField label="Admin Level"><select value={adminProfile.adminLevel} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, adminLevel: event.target.value }))} className={inputClass}><option value="">Not provided</option>{adminProfile.adminLevel && !["Full Administrator", "Senior Moderator", "Moderator"].includes(adminProfile.adminLevel) && <option value={adminProfile.adminLevel}>{adminProfile.adminLevel}</option>}<option value="Full Administrator">Full Administrator</option><option value="Senior Moderator">Senior Moderator</option><option value="Moderator">Moderator</option></select></SettingsField>
                </fieldset>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <SettingsSectionTitle icon={Globe2} tone="bg-emerald-50 text-emerald-600" title="Preferences" description="Language and regional settings for your account." />
                <fieldset disabled={!isEditingAdminProfile || isSavingAdminProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
                  <SettingsField label="Language"><select value={adminProfile.language} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, language: event.target.value }))} className={inputClass}><option value="en">English</option><option value="fil">Filipino</option><option value="hil">Hiligaynon</option></select></SettingsField>
                  <SettingsField label="Timezone"><select value={adminProfile.timezone} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, timezone: event.target.value }))} className={inputClass}><option value="Asia/Manila">Asia/Manila (GMT+8)</option></select></SettingsField>
                </fieldset>
              </CardContent>
            </Card>

            {isEditingAdminProfile && <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="outline" onClick={handleResetAdminProfile} disabled={isSavingAdminProfile} className="h-10 rounded-md font-bold"><RotateCcw className="mr-2 h-4 w-4" />Reset Changes</Button><Button onClick={() => void handleUpdateAdminProfile()} disabled={isSavingAdminProfile} className="h-10 rounded-md bg-orange-500 px-6 font-bold text-white hover:bg-orange-600"><Save className="mr-2 h-4 w-4" />{isSavingAdminProfile ? "Saving..." : "Save Changes"}</Button></div>}
          </div>

          <div className="space-y-5">
            <Card className="rounded-lg border-slate-200 bg-white shadow-sm"><CardContent className="p-5 sm:p-6"><SettingsSectionTitle icon={Lock} tone="bg-rose-50 text-rose-600" title="Security" description="Update the password for your authenticated admin account." /><Button onClick={() => setPasswordModal(true)} className="mt-5 h-10 w-full rounded-md bg-orange-500 font-bold text-white hover:bg-orange-600"><Lock className="mr-2 h-4 w-4" />Change Password</Button></CardContent></Card>
            <Card className="rounded-lg border-slate-200 bg-white shadow-sm"><CardContent className="p-5 sm:p-6"><SettingsSectionTitle icon={BarChart3} tone="bg-orange-50 text-orange-600" title="Platform Statistics" description="Live totals from platform records." /><div className="mt-3 divide-y divide-slate-100">{platformStats.map(({ label, value, icon: Icon, tone }) => <div key={label} className="flex items-center gap-3 py-3"><span className={`flex h-9 w-9 items-center justify-center rounded-md ${tone}`}><Icon className="h-4 w-4" /></span><span className="flex-1 text-sm font-bold text-slate-600">{label}</span><strong className="text-lg text-slate-950">{value}</strong></div>)}</div></CardContent></Card>
          </div>
        </div>
      </motion.div>
    );
  };

  const sectionMap: Record<string, () => ReactElement> = {
    overview:      renderOverview,
    notifications: renderNotifications,
    landlords:     renderLandlords,
    apartments:    renderApartments,
    reports:       renderReports,
    appeals:       renderAppeals,
    admininfo:     renderAdminInfo,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-50">
      <div className="relative z-10 flex h-full">
        <aside className="hidden lg:flex h-full w-60 shrink-0 flex-col bg-slate-950 shadow-xl">
          <SidebarContent />
        </aside>
        {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <aside className={`fixed left-0 top-0 z-50 h-full w-64 bg-slate-950 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all z-10">
            <X className="h-4 w-4" />
          </button>
          <SidebarContent />
        </aside>
        <button onClick={() => setSidebarOpen(true)} className="fixed top-4 left-4 z-30 lg:hidden h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-300/40 hover:from-amber-400 hover:to-orange-500 transition-all">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0 h-full overflow-y-auto">
          <main className="px-4 py-5 pt-16 md:px-6 lg:px-8 lg:pt-6">
            {(sectionMap[activeSection] ?? renderOverview)()}
          </main>
        </div>
      </div>

      {/* Verify dialog */}
      <AlertDialog open={!!verifyAction} onOpenChange={() => setVerifyAction(null)}>
        <AlertDialogContent className="rounded-2xl border-amber-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">{verifyAction?.verify ? "Verify Landlord" : "Revoke Verification"}</AlertDialogTitle>
            <AlertDialogDescription>
              {verifyAction?.verify
                ? "This landlord will be able to add and edit apartments on the platform."
                : "This landlord will no longer be able to add or edit apartments."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmVerification}
              className={`rounded-xl font-bold ${verifyAction?.verify ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
              {verifyAction?.verify ? "Verify" : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Violation / Notice modal */}
      {violationModal?.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-md" onClick={() => !isIssuingViolation && setViolationModal(null)}>
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="violation-modal-title"
            className="relative z-10 my-6 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_30px_90px_rgba(2,6,23,0.42)]"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start gap-4 border-b border-slate-200 px-5 py-5 sm:px-7 sm:py-6">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg ${
                  violationModal.mode === "violation" ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-200" : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-200"
                }`}>
                {violationModal.mode === "violation" ? <ShieldAlert className="h-7 w-7 text-white" /> : <BellRing className="h-7 w-7 text-white" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="violation-modal-title" className="text-xl font-black text-slate-950 sm:text-2xl">{violationModal.mode === "violation" ? "Issue Violation" : "Send Notice"}</h2>
                <p className="mt-1 truncate text-sm font-bold text-slate-700">{violationModal.landlordName || "Landlord unavailable"}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{violationModal.apartmentId ? violationModal.apartmentTitle : "No listing linked"}</span>
                </p>
              </div>
              <button type="button" aria-label="Close modal" disabled={isIssuingViolation} onClick={() => setViolationModal(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Body */}
            <div className="max-h-[calc(100vh-220px)] space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              {/* Type Selection */}
              <div className="space-y-2">
                <label htmlFor="violation-type" className="text-xs font-black uppercase text-slate-600">
                  {violationModal.mode === "violation" ? "Violation Type" : "Notice Type"}
                </label>
                <div className="relative">
                  <AlertTriangle className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${violationModal.mode === "violation" ? "text-rose-500" : "text-amber-500"}`} />
                  <select
                    id="violation-type"
                    value={violationModal.mode === "violation" ? vType : nType}
                    onChange={(e) => violationModal.mode === "violation" ? setVType(e.target.value) : setNType(e.target.value)}
                    disabled={isIssuingViolation}
                    className={`h-14 w-full appearance-none rounded-lg border bg-white pl-12 pr-10 text-sm font-bold text-slate-900 outline-none transition focus:ring-4 disabled:opacity-60 ${violationModal.mode === "violation" ? "border-rose-200 focus:border-rose-400 focus:ring-rose-100" : "border-amber-200 focus:border-amber-400 focus:ring-amber-100"}`}
                  >
                    {(violationModal.mode === "violation" ? VIOLATION_TYPES : NOTICE_TYPES).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 rotate-90 text-slate-500" />
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="violation-description" className="text-xs font-black uppercase text-slate-600">
                    {violationModal.mode === "violation" ? "Violation Description" : "Message"} <span className="font-semibold text-slate-400">(optional)</span>
                  </label>
                  <span className="text-xs font-semibold tabular-nums text-slate-400">
                    {(violationModal.mode === "violation" ? vMessage : nMessage).length}/500
                  </span>
                </div>
                <textarea
                  id="violation-description" rows={5} maxLength={500}
                  value={violationModal.mode === "violation" ? vMessage : nMessage}
                  onChange={(e) => violationModal.mode === "violation" ? setVMessage(e.target.value) : setNMessage(e.target.value)}
                  disabled={isIssuingViolation}
                  placeholder={violationModal.mode === "violation"
                    ? "Describe the violation in detail…"
                    : "Provide additional context or instructions for the landlord…"}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 disabled:opacity-60"
                />
              </div>

              {/* Expiration (violations only) */}
              {violationModal.mode === "violation" && (
                <div className="space-y-2">
                  <label htmlFor="violation-expiration" className="text-xs font-black uppercase text-slate-600">
                    <Calendar className="h-3.5 w-3.5 inline mr-1" />
                    Expiration Days
                  </label>
                  <input
                    id="violation-expiration"
                    type="number"
                    min="1"
                    max="365"
                    value={vExpirationDays}
                    step="1"
                    onChange={(e) => setVExpirationDays(Number(e.target.value))}
                    disabled={isIssuingViolation}
                    placeholder="Days"
                    className="h-14 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100 disabled:opacity-60"
                  />
                  <p className="text-xs font-medium text-slate-400">Enter a whole number from 1 to 365.</p>
                </div>
              )}

              {/* Info Alert */}
              <div className={`flex gap-3 rounded-lg border p-4 ${
                violationModal.mode === "violation" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
              }`}>
                <AlertTriangle className={`h-5 w-5 shrink-0 ${violationModal.mode === "violation" ? "text-red-500" : "text-amber-600"}`} />
                <p className={`text-sm font-semibold leading-5 ${violationModal.mode === "violation" ? "text-red-800" : "text-amber-800"}`}>
                  {violationModal.mode === "violation"
                    ? `This violation will be recorded on the landlord's profile${violationModal.apartmentId ? " and linked to this listing" : ""}.`
                    : "This notice will be sent to the landlord as a formal warning on record."}
                </p>
              </div>
            </div>
            {/* Footer */}
            <div className="grid gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:grid-cols-2 sm:px-7">
              <Button onClick={() => void issueViolation()} disabled={isIssuingViolation}
                className={`h-12 rounded-lg font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${
                  violationModal.mode === "violation"
                    ? "bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-700 hover:to-red-600 shadow-rose-200"
                    : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-200"
                }`}>
                {isIssuingViolation
                  ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                  : violationModal.mode === "violation"
                    ? <><ShieldAlert className="mr-2 h-4 w-4" />Issue Violation</>
                    : <><BellRing className="mr-2 h-4 w-4" />Send Notice</>}
              </Button>
              <Button type="button" variant="outline" onClick={() => setViolationModal(null)} disabled={isIssuingViolation} className="h-12 rounded-lg border-slate-300 bg-white font-black text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">
                Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Landlord Details Modal - Enhanced */}
      {selectedLandlord && selectedLandlordDetails && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={() => setSelectedLandlord(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-amber-100 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 font-black text-white text-2xl shadow-lg">
                  {selectedLandlord.name?.[0]?.toUpperCase() ?? "L"}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-black text-slate-900">{selectedLandlord.name}</h2>
                    {selectedLandlord.isVerified || selectedLandlord.is_verified
                      ? <Badge className="bg-green-100 text-green-800 border border-green-200 font-bold text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                      : <Badge className="bg-orange-100 text-orange-700 border border-orange-200 font-bold text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>}
                  </div>
                  <p className="text-sm text-slate-600 font-medium">{selectedLandlord.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedLandlord(null)} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            {/* Body - scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {isLoadingLandlordDetails && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Loading property history and activity…
                </div>
              )}
              {/* Account Information */}
              <div>
                <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Account Information
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                    <p className="text-sm font-bold text-slate-900">{selectedLandlord.email}</p>
                  </div>
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                    <p className="text-sm font-bold text-slate-900 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-amber-600" />
                      {selectedLandlord.mobile || "Not provided"}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Status</p>
                    <Badge className="inline-block bg-green-100 text-green-800 font-bold text-xs">Active</Badge>
                  </div>
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Verification</p>
                    <Badge className={`inline-block font-bold text-xs ${
                      selectedLandlord.isVerified || selectedLandlord.is_verified
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}>
                      {selectedLandlord.isVerified || selectedLandlord.is_verified ? "Verified" : "Pending"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Verification Documents */}
              {selectedLandlordDetails.profile && (
                <div>
                  <h3 className="text-xs font-black text-green-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Verification Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-green-50/30 border border-green-100 rounded-xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Business Permit</p>
                      <p className="text-sm font-bold text-slate-900">
                        {selectedLandlordDetails.profile.business_permit_number
                          || selectedLandlordDetails.profile.permit_number
                          || selectedLandlord.permit_number
                          || selectedLandlord.permitNumber
                          || "Not provided"}
                      </p>
                      {selectedLandlordDetails.profile.permit_expiry && (
                        <p className="text-xs text-slate-500 mt-1">Expires: {new Date(selectedLandlordDetails.profile.permit_expiry).toLocaleDateString()}</p>
                      )}
                    </div>
                    {selectedLandlordDetails.profile.tin_number && (
                      <div className="p-3 bg-green-50/30 border border-green-100 rounded-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TIN Number</p>
                        <p className="text-sm font-bold text-slate-900">{selectedLandlordDetails.profile.tin_number}</p>
                      </div>
                    )}
                    {selectedLandlordDetails.profile.id_type && (
                      <div className="p-3 bg-blue-50/30 border border-blue-100 rounded-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valid ID Type</p>
                        <p className="text-sm font-bold text-slate-900">{selectedLandlordDetails.profile.id_type}</p>
                      </div>
                    )}
                    {selectedLandlordDetails.profile.id_number && (
                      <div className="p-3 bg-blue-50/30 border border-blue-100 rounded-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Number</p>
                        <p className="text-sm font-bold text-slate-900">{selectedLandlordDetails.profile.id_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Property Information */}
              <div>
                <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Properties ({selectedLandlordDetails.properties.length})
                </h3>
                {selectedLandlordDetails.properties.length > 0 ? (
                  <div className="space-y-2">
                    {selectedLandlordDetails.properties.map((apt) => (
                      <div
                        key={apt.id}
                        onClick={() => {
                          navigate(`/admin/apartment/${apt.id}`);
                          setSelectedLandlord(null);
                        }}
                        className="p-3 bg-white border border-amber-100 rounded-xl hover:shadow-md transition-all cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shrink-0">
                            <Building2 className="h-6 w-6 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">{String(apt.title || "—")}</p>
                            <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                              <Badge variant="outline" className="text-[9px] font-bold">
                                {(apt.is_published ?? apt.isPublished) ? "Published" : "Draft"}
                              </Badge>
                            </p>
                          </div>
                          <span className="text-sm font-black text-amber-700 shrink-0">₱{(apt.price || 0)?.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center bg-amber-50/30 border border-amber-100 rounded-xl">
                    <Building2 className="h-8 w-8 text-amber-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-400">No properties listed yet</p>
                  </div>
                )}
              </div>

              {/* Property Statistics */}
              <div>
                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Statistics
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50/30 border border-blue-100 rounded-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Views</p>
                    <p className="text-lg font-black text-blue-700">{selectedLandlordDetails.propertyStats.totalViews}</p>
                  </div>
                  <div className="p-3 bg-pink-50/30 border border-pink-100 rounded-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Favorites</p>
                    <p className="text-lg font-black text-pink-700">{selectedLandlordDetails.propertyStats.totalFavorites}</p>
                  </div>
                  <div className="p-3 bg-purple-50/30 border border-purple-100 rounded-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Price</p>
                    <p className="text-lg font-black text-purple-700">₱{selectedLandlordDetails.propertyStats.averagePrice?.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="p-3 bg-emerald-50/30 border border-emerald-100 rounded-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Published</p>
                    <p className="text-lg font-black text-emerald-700">{selectedLandlordDetails.propertyStats.publishedProperties}/{selectedLandlordDetails.propertyStats.totalProperties}</p>
                  </div>
                </div>
              </div>

              {/* Reports */}
              {selectedLandlordDetails.reports.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    Reports ({selectedLandlordDetails.reports.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedLandlordDetails.reports.map((report) => (
                      <div
                        key={report.id}
                        onClick={() => {
                          setSelectedReport(report);
                          setSelectedLandlord(null);
                        }}
                        className="p-3 bg-red-50/30 border border-red-200 rounded-xl hover:shadow-md transition-all cursor-pointer">
                        <div className="flex items-start gap-2 justify-between">
                          <div className="flex-1">
                            <Badge className={`text-xs font-bold mb-1 ${
                              report.severity === "high" ? "bg-red-600 text-white" : report.severity === "med" ? "bg-amber-600 text-white" : "bg-green-600 text-white"
                            }`}>
                              {report.severity?.toUpperCase() || "MEDIUM"}
                            </Badge>
                            <p className="text-xs font-bold text-slate-900">{report.issue_type || "Reported Issue"}</p>
                            <p className="text-[10px] text-slate-500 mt-1">Status: {report.status || "pending"}</p>
                          </div>
                          <Badge className={`text-[10px] font-bold shrink-0 ${
                            report.status === "resolved" ? "bg-green-100 text-green-800" : report.status === "dismissed" ? "bg-gray-100 text-gray-800" : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {report.status === "resolved" ? "Resolved" : report.status === "dismissed" ? "Dismissed" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Violations & Notices */}
              {selectedLandlordDetails.violations.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4" />
                    Violations & Notices ({selectedLandlordDetails.violations.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedLandlordDetails.violations.map((v) => (
                      <div key={v.id} className={`p-3 border rounded-xl ${
                        v.mode === "violation" ? "bg-red-50/50 border-red-200" : "bg-amber-50/50 border-amber-200"
                      }`}>
                        <div className="flex items-start gap-2 mb-2">
                          <Badge className={`text-[10px] font-black uppercase ${
                            v.mode === "violation" ? "bg-red-600 text-white" : "bg-amber-600 text-white"
                          }`}>
                            {v.mode}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-bold border-slate-300 text-slate-700">
                            {v.type}
                          </Badge>
                        </div>
                        {v.message && <p className="text-xs font-medium text-slate-700 mb-1">{v.message}</p>}
                        <p className="text-[10px] text-slate-400 font-medium">
                          Issued on {new Date(v.issuedAt ?? v.issued_at ?? "").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer - actions */}
            <div className="px-6 py-4 border-t border-amber-100 bg-amber-50/30 shrink-0 flex gap-2">
              {selectedLandlord.isVerified || selectedLandlord.is_verified ? (
                <Button variant="outline" size="sm"
                  onClick={(e) => { e.stopPropagation(); setVerifyAction({ landlordId: text(selectedLandlord.id), verify: false }); setSelectedLandlord(null); }}
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl">
                  <XCircle className="h-4 w-4 mr-2" />Revoke Verification
                </Button>
              ) : (
                <Button size="sm"
                  onClick={(e) => { e.stopPropagation(); setVerifyAction({ landlordId: text(selectedLandlord.id), verify: true }); setSelectedLandlord(null); }}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-md">
                  <CheckCircle2 className="h-4 w-4 mr-2" />Verify Landlord
                </Button>
              )}
              <Button variant="outline" size="sm"
                onClick={(e) => { e.stopPropagation(); openViolationModal("violation", text(selectedLandlord.id), text(selectedLandlord.name, "Landlord"), "General"); setSelectedLandlord(null); }}
                className="border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl">
                <AlertOctagon className="h-4 w-4 mr-2" />Issue Violation
              </Button>
              <Button variant="outline" size="sm"
                onClick={(e) => { e.stopPropagation(); openViolationModal("notice", text(selectedLandlord.id), text(selectedLandlord.name, "Landlord"), "General"); setSelectedLandlord(null); }}
                className="border-amber-200 text-amber-700 hover:bg-amber-50 font-bold rounded-xl">
                <BellRing className="h-4 w-4 mr-2" />Send Notice
              </Button>
            </div>
          </div>
        </div>
      )}

      {activityLogOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={() => setActivityLogOpen(false)}>
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          <div className="relative z-10 flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-orange-600"><History className="h-5 w-5" /></span><div><h3 className="font-black text-slate-950">Admin Activity Log</h3><p className="text-xs font-medium text-slate-500">Recorded actions for this administrator.</p></div></div>
              <button type="button" title="Close activity log" onClick={() => setActivityLogOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-64 flex-1 overflow-y-auto p-5">
              {isLoadingActivity ? (
                <div className="flex min-h-56 items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-orange-500" /></div>
              ) : activityLogs.length === 0 ? (
                <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center"><History className="mb-3 h-8 w-8 text-slate-300" /><h4 className="font-black text-slate-800">No activity recorded yet.</h4><p className="mt-1 text-sm font-medium text-slate-500">Administrative actions will appear here after they are saved.</p></div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activityLogs.map((log) => {
                    const displayLog = formatAuditLogForDisplay(log);
                    return <div key={log.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-orange-50 text-orange-600"><CheckCircle2 className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800">{displayLog.title}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{displayLog.detail}</p>
                        {displayLog.changes.length > 1 && <div className="mt-2 space-y-1 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">{displayLog.changes.slice(1).map((change) => <p key={change.key}>{change.summary}</p>)}</div>}
                      </div>
                      <time className="shrink-0 text-right text-[11px] font-semibold text-slate-400">{log.created_at ? new Date(log.created_at).toLocaleString("en-PH") : "Time unavailable"}</time>
                    </div>;
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3"><Button variant="outline" onClick={() => void openActivityLog()} disabled={isLoadingActivity} className="h-9 rounded-md font-bold"><RefreshCw className={`mr-2 h-4 w-4 ${isLoadingActivity ? "animate-spin" : ""}`} />Refresh</Button></div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={() => setPasswordModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-red-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-red-100 bg-red-50/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-slate-900">Change Password</p>
                  <p className="text-xs text-slate-400 font-medium">Update your admin account password</p>
                </div>
              </div>
              <button onClick={() => setPasswordModal(false)} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full rounded-xl border-2 border-red-100 bg-red-50/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (minimum 6 characters)"
                  className="w-full rounded-xl border-2 border-red-100 bg-red-50/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-xl border-2 border-red-100 bg-red-50/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div className="flex gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                <p className="text-xs font-medium text-red-700">
                  Use a strong password with a mix of letters, numbers, and special characters for better security.
                </p>
              </div>
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-red-100 flex gap-3">
              <Button onClick={handleChangePassword}
                className="flex-1 font-bold rounded-xl shadow-md text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">
                <Lock className="h-4 w-4 mr-2" />Change Password
              </Button>
              <Button variant="outline" onClick={() => setPasswordModal(false)} className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Violation Modal */}
      {editViolationModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={() => setEditViolationModal(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-amber-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-amber-100 bg-amber-50/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow">
                  <Edit2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-slate-900">Edit {editViolationModal.mode === "violation" ? "Violation" : "Notice"}</p>
                  <p className="text-xs text-slate-400 font-medium">{editViolationModal.landlordName}</p>
                </div>
              </div>
              <button onClick={() => setEditViolationModal(null)} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message</label>
                  <span className="text-[10px] text-slate-400">
                    {editVMessage.length}/300
                  </span>
                </div>
                <textarea
                  rows={4} maxLength={300}
                  value={editVMessage}
                  onChange={(e) => setEditVMessage(e.target.value)}
                  placeholder="Edit the violation message…"
                  className="w-full rounded-xl border-2 border-amber-100 bg-amber-50/30 px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Expiration Days (for violations only)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={editVExpirationDays}
                  onChange={(e) => setEditVExpirationDays(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="Days"
                  className="w-full rounded-xl border-2 border-amber-100 bg-amber-50/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <p className="text-[10px] text-slate-500">
                  This violation will expire in {editVExpirationDays} days ({new Date(Date.now() + editVExpirationDays * 24 * 60 * 60 * 1000).toLocaleDateString()})
                </p>
              </div>
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-amber-100 flex gap-3">
              <Button onClick={saveViolationEdit}
                className="flex-1 font-bold rounded-xl shadow-md text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                <CheckCheck className="h-4 w-4 mr-2" />Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditViolationModal(null)} className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
