import { useState, useEffect, useMemo, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, type User } from "@/app/contexts/AuthContext";
import { apartments as defaultApartments, type ListingRecord } from "@/app/data/apartments";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  fetchAdminReports,
  fetchViolations,
  fetchNotifications,
  fetchUsers,
  fetchApartments,
  fetchFavorites,
  markNotificationRead,
  markAllNotificationsRead,
  markNotificationUnread,
  deleteNotification,
  deleteAllNotifications,
  createViolation,
  updateViolationStatus,
  updateReportStatus,
  updateUserProfile,
  deleteViolation as deleteViolationRecord,
  getDashboardSummary,
  fetchPendingAppeals,
  updateAppealStatus,
  notifyReportResolved,
  notifyReportDismissed,
  fetchReportWithDetails,
  fetchUserById,
  fetchLandlordWithDetails,
  notifyLandlordVerification,
  notifyLandlordViolation,
  notifyLandlordNotice,
  type DashboardUserRow,
  type DashboardReportRow,
  type DashboardViolationRow,
  type DashboardNotificationRow,
  type DashboardAppealRow,
  type DashboardLandlordDetailsRow,
} from "@/app/services/dashboardSupabaseService";
import {
  CheckCircle2, XCircle, Shield, Users, Phone, FileText,
  LayoutDashboard, AlertTriangle, LogOut, Menu, X, Sparkles,
  ChevronRight, Clock, Flag, CheckCheck, Building2, Eye,
  MapPin, Wifi, Car, PawPrint, Sofa, Search, AlertOctagon,
  Bell, BellRing, ShieldAlert, User as UserIcon, Edit2, Trash2, Lock, Calendar,
  Mail, MailOpen,
} from "lucide-react";
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
import { toast } from "sonner";

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV_MAIN = [
  { icon: LayoutDashboard, label: "Overview",       section: "overview" },
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

// ── Mock reports ──────────────────────────────────────────────────────────────
const MOCK_REPORTS = [
  {
    id: "r1", reporter: "Maria Santos", role: "student",
    apartment: "Modern Loft – La Paz", apartmentId: "",
    issueType: "Inaccurate information", severity: "med",
    tags: ["Wrong price", "Misleading photos"],
    details: "The listed price was ₱4,500 but the landlord said it's actually ₱6,200 when I visited.",
    contact: "maria.santos@example.com",
    submittedAt: "2026-04-30T09:14:00Z", status: "pending",
  },
  {
    id: "r2", reporter: "Carlo Mendoza", role: "employee",
    apartment: "Studio 12 – Jaro", apartmentId: "",
    issueType: "Scam / fraudulent listing", severity: "high",
    tags: ["Fake listing", "No contact"],
    details: "I paid a reservation fee but the number is now unreachable and the address doesn't exist.",
    contact: "09171234567",
    submittedAt: "2026-05-01T14:32:00Z", status: "pending",
  },
  {
    id: "r3", reporter: "Ana Reyes", role: "student",
    apartment: "2BR Flat – Mandurriao", apartmentId: "",
    issueType: "Photos don't match", severity: "low",
    tags: ["Misleading photos"],
    details: "The photos show a newly renovated unit but in reality the place is old and rundown.",
    contact: "",
    submittedAt: "2026-04-28T07:55:00Z", status: "resolved",
  },
  {
    id: "r4", reporter: "Liza Garcia", role: "employee",
    apartment: "Room 7 – CPU Area", apartmentId: "",
    issueType: "Unresponsive landlord", severity: "med",
    tags: ["No contact"],
    details: "I've tried calling and messaging the landlord for two weeks with no response.",
    contact: "liza.garcia@wf.com",
    submittedAt: "2026-05-01T11:10:00Z", status: "pending",
  },
];

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

export function AdminDashboard() {
  const { user, verifyLandlord, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // landlords
  const [landlords, setLandlords] = useState<DashboardUserRow[]>([]);
  const [verifyAction, setVerifyAction] = useState<{ landlordId: string; verify: boolean } | null>(null);

  // Loading states for action prevention
  const [deletingNotifId, setDeletingNotifId] = useState<string | null>(null);
  const [isDeletingAllNotifs, setIsDeletingAllNotifs] = useState(false);
  const [isResolvingReportId, setIsResolvingReportId] = useState<string | null>(null);
  const [isDismissingReportId, setIsDismissingReportId] = useState<string | null>(null);
  const [isDeletingViolationId, setIsDeletingViolationId] = useState<string | null>(null);

  // reports
  const [reports, setReports] = useState<DashboardReportRow[]>([]);
  const [selectedReport, setSelectedReport] = useState<DashboardReportRow | null>(null);
  const [selectedReportDetails, setSelectedReportDetails] = useState<{
    report: DashboardReportRow | null;
    reporter: DashboardUserRow | null;
    apartment: any | null;
    landlord: DashboardUserRow | null;
  } | null>(null);
  const [dismissReportModal, setDismissReportModal] = useState<{ reportId: string; reason: string } | null>(null);
  const [viewingUserProfile, setViewingUserProfile] = useState<DashboardUserRow | null>(null);

  // violations / notices  { landlordId, type, category, message, issuedAt, apartmentTitle }
  const [violations, setViolations] = useState<DashboardViolationRow[]>([]);

  // appeals
  const [appeals, setAppeals] = useState<DashboardAppealRow[]>([]);
  const [selectedAppeal, setSelectedAppeal] = useState<DashboardAppealRow | null>(null);
  const [appealResponse, setAppealResponse] = useState("");
  const [appealStatus, setAppealStatus] = useState<"under_review" | "approved" | "rejected">("under_review");

  // violation modal
  const [violationModal, setViolationModal] = useState<{
    open: boolean;
    mode: "violation" | "notice";
    landlordId: string;
    landlordName: string;
    apartmentTitle: string;
    reportId?: string;
  } | null>(null);
  const [vType, setVType]       = useState(VIOLATION_TYPES[0]);
  const [vMessage, setVMessage] = useState("");
  const [nType, setNType]       = useState(NOTICE_TYPES[0]);
  const [nMessage, setNMessage] = useState("");
  const [vExpirationDays, setVExpirationDays] = useState(90);

  // violation edit modal
  const [editViolationModal, setEditViolationModal] = useState<DashboardViolationRow | null>(null);
  const [editVMessage, setEditVMessage] = useState("");
  const [editVExpirationDays, setEditVExpirationDays] = useState(90);

  // password change modal
  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // admin notifications (new property submissions)
  const [adminNotifs, setAdminNotifs] = useState<DashboardNotificationRow[]>([]);
  const [notifSearch, setNotifSearch] = useState("");
  const [notifFilter, setNotifFilter] = useState<"all" | "read" | "unread">("all");

  const markNotifsRead = () => {
    const updated = adminNotifs.map((n) => ({ ...n, read: true, is_read: true }));
    setAdminNotifs(updated);
    if (user?.id) {
      void markAllNotificationsRead(user.id);
    }
  };

  const deleteNotif = (notificationId: string) => {
    if (deletingNotifId === notificationId) {
      toast.error("Deletion in progress...");
      return;
    }
    setDeletingNotifId(notificationId);
    setAdminNotifs((prev) => prev.filter((n) => n.id !== notificationId));
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
    if (window.confirm("Are you sure you want to delete all notifications? This cannot be undone.")) {
      setIsDeletingAllNotifs(true);
      setAdminNotifs([]);
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
    const updated = adminNotifs.map((n) =>
      n.id === notificationId ? { ...n, read: !isCurrentlyRead, is_read: !isCurrentlyRead } : n
    );
    setAdminNotifs(updated);
    if (user?.id) {
      if (isCurrentlyRead) {
        void markNotificationUnread(notificationId, user.id);
      } else {
        void markNotificationRead(notificationId, user.id);
      }
    }
  };

  const filteredNotifs = useMemo(() => {
    return adminNotifs.filter((n) => {
      const matchesSearch = !notifSearch || 
        n.title?.toLowerCase().includes(notifSearch.toLowerCase()) ||
        n.message?.toLowerCase().includes(notifSearch.toLowerCase()) ||
        n.type?.toLowerCase().includes(notifSearch.toLowerCase());
      const matchesFilter = notifFilter === "all" || (notifFilter === "read" ? n.read : !n.read);
      return matchesSearch && matchesFilter;
    });
  }, [adminNotifs, notifSearch, notifFilter]);

  // apartments
  const [aptSearch, setAptSearch]   = useState("");
  const [selectedApt, setSelectedApt] = useState<ListingRecord | null>(null);
  const [aptFilter, setAptFilter] = useState<"all" | "reported">("all");

  // landlord details modal
  const [selectedLandlord, setSelectedLandlord] = useState<DashboardUserRow | null>(null);
  const [selectedLandlordDetails, setSelectedLandlordDetails] = useState<DashboardLandlordDetailsRow | null>(null);

  const [allApartments, setAllApartments] = useState<ListingRecord[]>(
    defaultApartments as ListingRecord[],
  );

  const refreshApartments = () => {
    const custom = JSON.parse(localStorage.getItem("customApartments") || "[]") as ListingRecord[];
    setAllApartments([...defaultApartments, ...custom] as ListingRecord[]);
  };

  const [adminProfile, setAdminProfile] = useState(() => {
    if (user) {
      const storageKey = `userProfile_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Fall through to default
        }
      }
    }
    return {
      firstName: user?.name?.split(" ")[0] || "",
      lastName: user?.name?.split(" ").slice(1).join(" ") || "",
      email: user?.email || "",
      mobile: user?.mobileNumber || "",
      bio: user?.bio || "Platform administrator managing the apartment listing system.",
      language: user?.language || "en",
      timezone: user?.timezone || "Asia/Manila",
      avatar: user?.avatar || "",
      department: user?.department || "Platform Administration",
      adminLevel: user?.adminLevel || "Full Administrator",
    };
  });

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

  const updateAdminProfile = (updater: (prev: AdminProfileState) => AdminProfileState) => {
    setAdminProfile((p: AdminProfileState) => {
      const updated = updater(p);
      if (user) {
        localStorage.setItem(`userProfile_${user.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleUpdateAdminProfile = () => {
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

    void updateUserProfile(updatedUser).then((result) => {
      if (result) {
        const nextUser = {
          ...user,
          name: adminProfile.firstName + " " + adminProfile.lastName,
          email: adminProfile.email,
          mobileNumber: adminProfile.mobile,
          avatar: adminProfile.avatar,
          bio: adminProfile.bio,
          language: adminProfile.language,
          timezone: adminProfile.timezone,
          department: adminProfile.department,
          adminLevel: adminProfile.adminLevel,
        };
        void updateUser(user.id, {
          name: nextUser.name,
          email: nextUser.email,
        });
        localStorage.setItem(`userProfile_${user.id}`, JSON.stringify(adminProfile));
        toast.success("Profile updated successfully!");
      } else {
        toast.error("Failed to update profile");
      }
    });
  };

  const getApartmentReportCount = (apartmentId: string | undefined) => {
    if (!apartmentId) return 0;
    return reports.filter((r) => r.apartmentId === apartmentId && r.status === "pending").length;
  };

  const filteredApts = useMemo(() => {
    const q = aptSearch.toLowerCase();
    let filtered = allApartments.filter(
      (a) => a.title?.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q)
    );

    // Apply report filter
    if (aptFilter === "reported") {
      filtered = filtered.filter((a) => getApartmentReportCount(a.id) > 0);
    }

    return filtered;
  }, [allApartments, aptSearch, aptFilter, reports]);

  useEffect(() => {
    const loadData = async () => {
      const [loadedReports, loadedViolations, loadedNotifications, loadedApartments] = await Promise.all([
        fetchAdminReports(),
        fetchViolations(),
        fetchNotifications(),
        fetchApartments(),
      ]);

      setReports(loadedReports.length > 0 ? loadedReports : MOCK_REPORTS);
      setViolations(loadedViolations);
      setAdminNotifs(loadedNotifications);
      setAllApartments(loadedApartments as unknown as ListingRecord[]);
      await loadLandlords();
    };

    void loadData();
  }, []);

  useEffect(() => {
    if (activeSection === "notifications") {
      void fetchNotifications().then(setAdminNotifs);
    }
    if (activeSection === "reports") {
      void fetchAdminReports().then((items) => setReports(items.length > 0 ? items : MOCK_REPORTS));
    }
    if (activeSection === "apartments") {
      void fetchApartments().then((items) =>
        setAllApartments(items as unknown as ListingRecord[]),
      );
    }
    if (activeSection === "appeals") {
      void fetchPendingAppeals().then(setAppeals);
    }
  }, [activeSection]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "apartmentReports") {
        void fetchAdminReports().then((items) => setReports(items.length > 0 ? items : MOCK_REPORTS));
      }
      if (event.key === "adminViolations") {
        void fetchViolations().then(setViolations);
      }
      if (event.key === "adminNotifications") {
        void fetchNotifications().then(setAdminNotifs);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Fetch full report details when a report is selected
  useEffect(() => {
    if (selectedReport?.id) {
      void fetchReportWithDetails(selectedReport.id).then(setSelectedReportDetails);
    } else {
      setSelectedReportDetails(null);
    }
  }, [selectedReport?.id]);

  // Fetch full landlord details when a landlord is selected
  useEffect(() => {
    if (selectedLandlord?.id) {
      void fetchLandlordWithDetails(selectedLandlord.id).then(setSelectedLandlordDetails);
    } else {
      setSelectedLandlordDetails(null);
    }
  }, [selectedLandlord?.id]);

  const loadLandlords = async () => {
    const users = await fetchUsers();
    setLandlords(users.filter((x) => x.role === "landlord"));
  };

  const saveViolations = async (v: DashboardViolationRow[]) => {
    setViolations(v);
    await Promise.resolve();
  };

  const confirmVerification = () => {
    if (!verifyAction) return;
    const action = verifyAction.verify
      ? verifyLandlord(verifyAction.landlordId)
      : updateUser(verifyAction.landlordId, { isVerified: false, status: "pending" });
    void action.then(async () => {
      // Send notification to landlord
      await notifyLandlordVerification(
        verifyAction.landlordId,
        verifyAction.verify,
        user?.id,
      );
      void loadLandlords();
      toast.success(verifyAction.verify ? "Landlord verified" : "Verification revoked");
      setVerifyAction(null);
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

  const issueViolation = () => {
    if (!violationModal || !user) return;

    const payload = {
      landlord_id: violationModal.landlordId,
      admin_id: user.id,
      mode: violationModal.mode,
      type: violationModal.mode === "violation" ? vType : nType,
      message: violationModal.mode === "violation" ? vMessage : nMessage,
      issued_at: new Date().toISOString(),
      expires_at: violationModal.mode === "violation"
        ? new Date(Date.now() + vExpirationDays * 24 * 60 * 60 * 1000).toISOString()
        : null,
      related_report_id: violationModal.reportId ?? null,
      active: true,
    };

    void createViolation(payload).then(async (created) => {
      if (created) {
        // Send notification to landlord
        if (violationModal.mode === "violation") {
          await notifyLandlordViolation(
            violationModal.landlordId,
            vType,
            vMessage,
          );
        } else {
          await notifyLandlordNotice(violationModal.landlordId, nType, nMessage);
        }

        void fetchViolations().then(setViolations);
        toast.success(violationModal.mode === "violation" ? "Violation issued to landlord" : "Notice sent to landlord");
        setViolationModal(null);
        setVMessage("");
        setNMessage("");
        setVExpirationDays(90);
        if (violationModal.reportId) {
          void updateReportStatus(violationModal.reportId, "resolved").then(() => {
            setReports((p) => p.map((r) => (r.id === violationModal.reportId ? { ...r, status: "resolved" } : r)));
            setSelectedReport(null);
          });
        }
      }
    });
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

  // ── Violation Edit ────────────────────────────────────────────────────────
  const openEditViolation = (violation: DashboardViolationRow) => {
    setEditViolationModal(violation);
    setEditVMessage(violation.message ?? "");
    const expiresAt = violation.expiresAt ?? violation.expires_at;
    const daysLeft = expiresAt
      ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : 90;
    setEditVExpirationDays(daysLeft);
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

  const handleDeleteViolation = (violationId: string) => {
    if (isDeletingViolationId === violationId) {
      toast.error("Deletion in progress...");
      return;
    }
    setIsDeletingViolationId(violationId);
    void deleteViolationRecord(violationId).then((removed) => {
      if (removed) {
        setViolations((p) => p.filter((v) => v.id !== violationId));
        toast.success("Violation deleted");
      }
    }).finally(() => {
      setIsDeletingViolationId(null);
    });
  };

  const openViolationModal = (
    mode: "violation" | "notice",
    landlordId: string,
    landlordName: string,
    apartmentTitle: string,
    reportId?: string,
  ) => {
    setVType(VIOLATION_TYPES[0]);
    setNType(NOTICE_TYPES[0]);
    setVMessage(""); setNMessage("");
    setVExpirationDays(90);
    setViolationModal({ open: true, mode, landlordId, landlordName, apartmentTitle, reportId });
  };

  const getLandlordForApt = (apt: ListingRecord) =>
    landlords.find((l) => l.id === apt.landlordId) ?? null;

  const violationsForLandlord = (lid: string) =>
    violations.filter((v) => v.landlordId === lid);

  const verifiedCount      = landlords.filter((l) => l.isVerified ?? l.is_verified).length;
  const pendingCount       = landlords.filter((l) => !(l.isVerified ?? l.is_verified)).length;
  const pendingReports     = reports.filter((r) => r.status === "pending").length;
  const unreadNotifsCount  = adminNotifs.filter((n) => !n.read).length;

  const handleLogout = () => { logout?.(); navigate("/"); };

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-black text-white text-lg tracking-tight">RentIloilo</span>
        </div>
        <p className="text-white/30 text-xs font-medium mt-1 ml-10">Admin Portal</p>
      </div>
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-3 py-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 font-black text-white text-sm shadow">
            {user?.name?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-sm truncate">{user?.name ?? "Admin"}</p>
            <p className="text-white/40 text-xs truncate">{user?.email ?? ""}</p>
          </div>
          <Shield className="h-4 w-4 text-amber-400 shrink-0" />
        </div>
      </div>
      <nav className="px-3 pt-4 pb-2">
        <p className="text-white/25 text-[10px] font-black uppercase tracking-widest px-3 mb-2">Main</p>
        <div className="space-y-0.5">
          {NAV_MAIN.map(({ icon: Icon, label, section }) => (
            <button key={section}
              onClick={() => { setActiveSection(section); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeSection === section
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-900/30"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {label === "Reports" && pendingReports > 0 && (
                <span className="ml-auto h-5 px-1.5 bg-red-500 rounded-full text-white text-[10px] font-black flex items-center justify-center min-w-[20px]">{pendingReports}</span>
              )}
              {label === "Landlords" && pendingCount > 0 && (
                <span className="ml-auto h-5 px-1.5 bg-orange-500 rounded-full text-white text-[10px] font-black flex items-center justify-center min-w-[20px]">{pendingCount}</span>
              )}
              {label === "Notifications" && unreadNotifsCount > 0 && (
                <span className="ml-auto h-5 px-1.5 bg-indigo-500 rounded-full text-white text-[10px] font-black flex items-center justify-center min-w-[20px]">{unreadNotifsCount}</span>
              )}
            </button>
          ))}
        </div>
      </nav>
      <nav className="px-3 pt-3 pb-2 border-t border-white/10 mt-2">
        <p className="text-white/25 text-[10px] font-black uppercase tracking-widest px-3 mb-2">Account</p>
        <div className="space-y-0.5">
          {NAV_ACCOUNT.map(({ icon: Icon, label, section }) => (
            <button key={section}
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
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
          <LogOut className="h-4 w-4 shrink-0" />Log Out
        </button>
      </div>
    </div>
  );

  // ── Section: Overview ─────────────────────────────────────────────────────
  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <div className="inline-block mb-3 px-4 py-1.5 bg-white/70 backdrop-blur-md border border-amber-200/50 rounded-full shadow-sm">
          <span className="text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2 uppercase tracking-wider">
            <Shield className="h-3.5 w-3.5 text-amber-500" /> Admin Dashboard
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-2">
          Welcome, <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{user?.name}</span>!
        </h1>
        <p className="text-slate-600 text-lg font-medium">Platform overview at a glance.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Landlords", value: landlords.length,   icon: Users,       grad: "from-amber-500 to-orange-600", section: "landlords" },
          { label: "Verified",        value: verifiedCount,      icon: CheckCircle2,grad: "from-green-400 to-emerald-500",section: "landlords" },
          { label: "Pending Verify",  value: pendingCount,       icon: Clock,       grad: "from-orange-400 to-amber-500", section: "landlords" },
          { label: "Open Reports",    value: pendingReports,     icon: Flag,        grad: "from-red-400 to-rose-500",     section: "reports"   },
        ].map(({ label, value, icon: Icon, grad, section }) => (
          <button key={label} onClick={() => setActiveSection(section)}
            className="bg-white/90 backdrop-blur-xl border-2 border-amber-100/50 rounded-2xl p-5 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all text-left group">
            <div className="flex items-center justify-between mb-2">
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
            </div>
            <p className="text-3xl font-black text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">{label}</p>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { section: "apartments", icon: Building2, title: "Browse Apartments", desc: `${allApartments.length} listings on the platform`, grad: "from-amber-500 to-orange-600", light: false },
          { section: "reports",    icon: Flag,      title: "Review Reports",    desc: `${pendingReports} pending reports`,                grad: "", light: true },
          { section: "landlords",  icon: ShieldAlert,title:"Issue Violations",  desc: "Send notices to landlords",                        grad: "", light: true },
        ].map(({ section, icon: Icon, title, desc, grad, light }) => (
          <button key={section} onClick={() => setActiveSection(section)}
            className={`p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all text-left group ${
              !light ? `bg-gradient-to-br ${grad} text-white` : "bg-white/90 backdrop-blur-xl border-2 border-amber-100"
            }`}>
            <Icon className={`h-8 w-8 mb-3 group-hover:scale-110 transition-transform ${light ? "text-amber-600" : ""}`} />
            <h3 className={`text-lg font-black mb-1 ${light ? "text-slate-900" : ""}`}>{title}</h3>
            <p className={`text-sm font-medium ${light ? "text-slate-500" : "text-amber-100"}`}>{desc}</p>
            <div className={`mt-3 flex items-center gap-1 text-sm font-bold ${light ? "text-amber-600" : ""}`}>
              Open <ChevronRight className="h-4 w-4" />
            </div>
          </button>
        ))}
      </div>

      {/* Recent violations issued */}
      {violations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertOctagon className="h-4 w-4 text-red-600" />
            <h3 className="text-xs font-black text-red-600 uppercase tracking-widest">Recently Issued</h3>
          </div>
          <div className="bg-white/90 backdrop-blur-xl border border-red-100 rounded-2xl overflow-hidden shadow">
            {violations.slice(0, 3).map((v, i) => (
              <div key={v.id} className={`flex items-center gap-4 px-5 py-3 ${i < 2 ? "border-b border-red-50" : ""}`}>
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                  v.mode === "violation" ? "bg-red-100" : "bg-amber-100"
                }`}>
                  {v.mode === "violation"
                    ? <AlertOctagon className="h-4 w-4 text-red-600" />
                    : <Bell className="h-4 w-4 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{v.type}</p>
                  <p className="text-xs text-slate-400 font-medium">{v.landlordName} · {v.apartmentTitle}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-medium shrink-0">
                  {formatOptionalDate(v.issuedAt ?? v.issued_at, { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── Section: Notifications ────────────────────────────────────────────────
  const renderNotifications = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">Notifications</h2>
            <p className="text-slate-500 text-sm font-medium">{adminNotifs.length} total</p>
          </div>
        </div>
        {adminNotifs.length > 0 && (
          <div className="flex items-center gap-2">
            {adminNotifs.some((n) => !n.read) && (
              <Button variant="outline" size="sm" onClick={markNotifsRead}
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold rounded-xl text-xs">
                <CheckCheck className="h-3.5 w-3.5 mr-1.5" />Mark all as read
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={deleteAllNotifs}
              className="border-red-200 text-red-700 hover:bg-red-50 font-bold rounded-xl text-xs">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete all
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      {adminNotifs.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search notifications..."
              value={notifSearch}
              onChange={(e) => setNotifSearch(e.target.value)}
              className="w-full rounded-xl border-2 border-indigo-100 bg-indigo-50/30 px-3 py-2 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <select
            value={notifFilter}
            onChange={(e) => setNotifFilter(e.target.value as any)}
            className="rounded-xl border-2 border-indigo-100 bg-indigo-50/30 px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <span className="text-xs text-slate-400 font-medium">{filteredNotifs.length} results</span>
        </div>
      )}

      {adminNotifs.length === 0 ? (
        <div className="py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <Bell className="h-8 w-8 text-indigo-200" />
          </div>
          <p className="text-slate-400 font-medium">No notifications yet</p>
          <p className="text-slate-400 text-sm mt-1">New property submissions will appear here</p>
        </div>
      ) : filteredNotifs.length === 0 ? (
        <div className="py-12 text-center">
          <Bell className="h-8 w-8 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No matching notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map((notif) => (
            <div key={notif.id}
              className={`flex items-start gap-4 p-5 rounded-2xl border-2 transition-all ${
                notif.read
                  ? "bg-white/60 border-slate-100"
                  : "bg-white/95 border-indigo-100 shadow-lg shadow-indigo-50/60"
              }`}>
              <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow bg-gradient-to-br from-indigo-500 to-purple-600">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-slate-900 text-sm">{notif.title}</p>
                      {notif.type && <Badge variant="secondary" className="text-[10px] font-bold">{notif.type}</Badge>}
                    </div>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{notif.message}</p>
                  </div>
                  {!notif.read && (
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <span className="text-xs text-slate-400 font-medium">
                    {formatOptionalDate(notif.createdAt ?? notif.created_at)}
                  </span>
                  <Button size="sm" variant="outline"
                    onClick={() => {
                      const updated = adminNotifs.map((n) => n.id === notif.id ? { ...n, read: true } : n);
                      setAdminNotifs(updated);
                      localStorage.setItem("adminNotifications", JSON.stringify(updated));
                      setActiveSection("apartments");
                      const allApts = [...defaultApartments, ...JSON.parse(localStorage.getItem("customApartments") || "[]")];
                      const apt = allApts.find((a: any) => a.id === notif.apartmentId);
                      if (apt) setSelectedApt(apt);
                    }}
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold rounded-xl text-xs">
                    <Eye className="h-3.5 w-3.5 mr-1.5" />Inspect Property
                  </Button>
                  <Button size="sm" variant="ghost"
                    onClick={() => toggleNotifReadStatus(notif.id || "", notif.read || false)}
                    className="text-slate-600 hover:bg-slate-100 font-bold rounded-xl text-xs">
                    {notif.read ? (
                      <>
                        <Mail className="h-3.5 w-3.5 mr-1.5" />Mark unread
                      </>
                    ) : (
                      <>
                        <MailOpen className="h-3.5 w-3.5 mr-1.5" />Mark read
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="ghost"
                    onClick={() => deleteNotif(notif.id || "")}
                    className="text-red-600 hover:bg-red-50 font-bold rounded-xl text-xs">
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Section: Landlords ────────────────────────────────────────────────────
  const renderLandlords = () => (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900">Landlord Verification</h2>
          <p className="text-slate-500 text-sm font-medium">Review permits and manage violations</p>
        </div>
      </div>

      <Card className="border-2 border-amber-100/50 bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {landlords.length === 0 ? (
            <div className="py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-amber-300" />
              </div>
              <p className="text-slate-400 font-medium">No landlords registered yet</p>
            </div>
          ) : (
            landlords.map((landlord, index) => {
              const lvs = violationsForLandlord(text(landlord.id));
              return (
                <div key={landlord.id}
                  className={`px-6 py-5 ${index < landlords.length - 1 ? "border-b border-amber-50" : ""} hover:bg-amber-50/30 transition-colors cursor-pointer`}
                  onClick={() => setSelectedLandlord(landlord)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shrink-0 font-black text-amber-700 text-sm shadow">
                        {landlord.name?.[0]?.toUpperCase() ?? "L"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-black text-slate-900">{landlord.name}</h3>
                          {landlord.isVerified
                            ? <Badge className="bg-green-100 text-green-800 border border-green-200 font-bold text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                            : <Badge className="bg-orange-100 text-orange-700 border border-orange-200 font-bold text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>}
                          {lvs.length > 0 && (
                            <Badge className="bg-red-100 text-red-700 border border-red-200 font-bold text-xs">
                              <AlertOctagon className="h-3 w-3 mr-1" />{lvs.length} violation{lvs.length > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 font-medium">{landlord.email}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400 font-medium">
                          {landlord.mobileNumber && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{landlord.mobileNumber}</span>}
                          {landlord.permitNumber && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />Permit: {landlord.permitNumber}</span>}
                        </div>
                        {lvs.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {lvs.slice(0, 2).map((v) => (
                              <span key={v.id} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                v.mode === "violation" ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"
                              }`}>{v.type}</span>
                            ))}
                            {lvs.length > 2 && <span className="text-[10px] font-bold text-slate-400">+{lvs.length - 2} more</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {landlord.isVerified
                        ? <Button variant="outline" size="sm" onClick={() => setVerifyAction({ landlordId: text(landlord.id), verify: false })}
                            className="border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl text-xs">
                            <XCircle className="h-3.5 w-3.5 mr-1.5" />Revoke
                          </Button>
                        : <Button size="sm" onClick={() => setVerifyAction({ landlordId: text(landlord.id), verify: true })}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-md text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Verify
                          </Button>}
                      <Button variant="outline" size="sm"
                        onClick={() => openViolationModal("violation", text(landlord.id), text(landlord.name, "Landlord"), "General")}
                        className="border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl text-xs">
                        <AlertOctagon className="h-3.5 w-3.5 mr-1.5" />Violation
                      </Button>
                      <Button variant="outline" size="sm"
                        onClick={() => openViolationModal("notice", text(landlord.id), text(landlord.name, "Landlord"), "General")}
                        className="border-amber-200 text-amber-700 hover:bg-amber-50 font-bold rounded-xl text-xs">
                        <BellRing className="h-3.5 w-3.5 mr-1.5" />Notice
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
      <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <p className="font-black mb-0.5">Verification Requirements</p>
          <p className="text-amber-700 font-medium">Only verified landlords can add and edit apartments. Use violations for serious offenses and notices for warnings.</p>
        </div>
      </div>
    </div>
  );

  // ── Section: Apartments ───────────────────────────────────────────────────
  const renderApartments = () => {
    const reportedCount = allApartments.filter((a) => getApartmentReportCount(a.id) > 0).length;

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">All Apartments</h2>
            <p className="text-slate-500 text-sm font-medium">Browse, inspect, and take action on listings</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-3 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-amber-100 shadow-sm w-fit">
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
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
          <input
            value={aptSearch}
            onChange={(e) => setAptSearch(e.target.value)}
            placeholder="Search by name or location…"
            className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-amber-100 bg-white/90 backdrop-blur-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow"
          />
        </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredApts.map((apt) => {
          const landlord = getLandlordForApt(apt);
          const aptViolations = violations.filter((v) => v.apartmentTitle === apt.title);
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
                      onClick={() => openViolationModal("violation", text(landlord.id), text(landlord.name, "Landlord"), apt.title)}
                      className="border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl text-xs">
                      <AlertOctagon className="h-3.5 w-3.5 mr-1.5" />Violation
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => openViolationModal("notice", text(landlord.id), text(landlord.name, "Landlord"), apt.title)}
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
        <div className="py-16 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-3 text-amber-200" />
          <p className="text-slate-400 font-medium">No apartments found</p>
        </div>
      )}

      {/* Apartment detail modal */}
      {selectedApt && (() => {
        const landlord = getLandlordForApt(selectedApt);
        const aptViolations = violations.filter((v) => v.apartmentTitle === selectedApt.title);
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
                    { label: "Monthly Rent", value: `₱${selectedApt.price?.toLocaleString()}` },
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
                  <Button onClick={() => { setSelectedApt(null); openViolationModal("violation", text(landlord.id), text(landlord.name, "Landlord"), selectedApt.title); }}
                    className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold rounded-xl shadow-md">
                    <AlertOctagon className="h-4 w-4 mr-2" />Issue Violation
                  </Button>
                  <Button variant="outline" onClick={() => { setSelectedApt(null); openViolationModal("notice", text(landlord.id), text(landlord.name, "Landlord"), selectedApt.title); }}
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
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
            <Flag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">Reports</h2>
            <p className="text-slate-500 text-sm font-medium">Submitted by students and employees</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
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
          <Card className="border-2 border-amber-200/60 bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden">
            <div className="px-6 py-3 border-b border-amber-50 bg-amber-50/50 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Pending — needs action</span>
            </div>
            <div className="divide-y divide-amber-50">{pending.map((r: any) => <ReportRow key={r.id} report={r} />)}</div>
          </Card>
        )}
        {(resolved.length > 0 || dismissed.length > 0) && (
          <Card className="border-2 border-slate-100 bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Closed</span>
            </div>
            <div className="divide-y divide-slate-50">{[...resolved, ...dismissed].map((r: any) => <ReportRow key={r.id} report={r} />)}</div>
          </Card>
        )}
        {reports.length === 0 && (
          <div className="py-16 text-center">
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
                    <p className="text-slate-400 text-xs font-medium">
                      ID: {selectedReport.id?.slice(0, 8) || "N/A"}
                    </p>
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
                          <p className="text-slate-400 font-medium">Issue Type</p>
                          <p className="font-bold text-slate-800">{selectedReport.issueType}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">Severity</p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${(SEVERITY_LABEL[selectedReport.severity ?? "med"] ?? SEVERITY_LABEL.med).class}`}>
                            {(SEVERITY_LABEL[selectedReport.severity ?? "med"] ?? SEVERITY_LABEL.med).label}
                          </span>
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
                          <Eye className="h-3.5 w-3.5 mr-1" />View Apartment
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

                {/* Report Tags */}
                {selectedReport.tags && selectedReport.tags.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedReport.tags.map((tag: string) => (
                        <Badge key={tag} className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Report Description */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Details</p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">
                      {selectedReport.details || "No description provided."}
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                {selectedReport.contact && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reporter Contact</p>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-sm font-medium text-slate-800">{selectedReport.contact}</p>
                    </div>
                  </div>
                )}
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
        <div className="flex items-center justify-between">
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
              ← Back to List
            </Button>

            <Card className="border-2 border-amber-100 bg-white/90">
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
                        <p className="text-slate-500 text-xs">Loading landlord info...</p>
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
                      <p className="text-xs text-slate-600"><strong>Report ID:</strong> {selectedAppeal.report_id}</p>
                    </div>
                  )}

                  {selectedAppeal.violation_id && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <Badge className="bg-red-600 mb-2">Violation Appeal</Badge>
                      <p className="text-xs text-slate-600"><strong>Violation ID:</strong> {selectedAppeal.violation_id}</p>
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
                        {selectedAppeal.supporting_docs.map((doc, i) => (
                          <div key={i} className="text-xs text-blue-600 hover:underline cursor-pointer">
                            • Document {i + 1}
                          </div>
                        ))}
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
          <div className="space-y-3">
            {appeals.length > 0 ? (
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
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Section: Admin Info ───────────────────────────────────────────────────
  const renderAdminInfo = () => {
    return (
      <div className="space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">Admin Settings</h2>
            <p className="text-slate-500 text-sm font-medium">Manage your admin account and preferences</p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="border-2 border-amber-100/50 bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl">
          <CardContent className="p-6 space-y-5">
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-100 rounded-2xl">
              <div className="relative h-20 w-20 shrink-0">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-3xl font-black shadow-lg overflow-hidden">
                  {adminProfile.avatar ? (
                    <img src={adminProfile.avatar} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    adminProfile.firstName[0] || user?.name?.[0]?.toUpperCase() || "A"
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-900">{adminProfile.firstName} {adminProfile.lastName}</p>
                <p className="text-sm text-slate-500 font-medium mb-3">{adminProfile.email}</p>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">Administrator</Badge>
              </div>
            </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <div className="text-sm font-black text-slate-500 uppercase tracking-widest">Personal Information</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">First Name</label>
                  <input value={adminProfile.firstName} onChange={(e) => updateAdminProfile(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Last Name</label>
                  <input value={adminProfile.lastName} onChange={(e) => updateAdminProfile(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Email</label>
                <input type="email" value={adminProfile.email} onChange={(e) => updateAdminProfile(p => ({ ...p, email: e.target.value }))} placeholder="admin@example.com" className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Mobile Number</label>
                <input type="tel" value={adminProfile.mobile} onChange={(e) => updateAdminProfile(p => ({ ...p, mobile: e.target.value }))} placeholder="09XXXXXXXXX" className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Bio</label>
                <textarea rows={3} value={adminProfile.bio} onChange={(e) => updateAdminProfile(p => ({ ...p, bio: e.target.value.slice(0, 200) }))} placeholder="Tell us about yourself…" className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
                <p className="text-[11px] text-slate-400 font-medium text-right">{adminProfile.bio.length}/200</p>
              </div>
            </div>

            {/* Admin Information */}
            <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <div className="text-sm font-black text-amber-700 uppercase tracking-widest">Admin Information</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-amber-600 uppercase tracking-widest">Department</label>
                  <input value={adminProfile.department} onChange={(e) => updateAdminProfile(p => ({ ...p, department: e.target.value }))} placeholder="e.g. Platform Administration" className="w-full px-4 py-2.5 rounded-xl border-2 border-amber-200 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-amber-600 uppercase tracking-widest">Admin Level</label>
                  <select value={adminProfile.adminLevel} onChange={(e) => updateAdminProfile(p => ({ ...p, adminLevel: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border-2 border-amber-200 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400">
                    <option value="Full Administrator">Full Administrator</option>
                    <option value="Senior Moderator">Senior Moderator</option>
                    <option value="Moderator">Moderator</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-4">
              <div className="text-sm font-black text-slate-500 uppercase tracking-widest">Preferences</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Language</label>
                  <select value={adminProfile.language} onChange={(e) => updateAdminProfile(p => ({ ...p, language: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400">
                    <option value="en">English</option>
                    <option value="fil">Filipino</option>
                    <option value="hil">Hiligaynon</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Timezone</label>
                  <select value={adminProfile.timezone} onChange={(e) => updateAdminProfile(p => ({ ...p, timezone: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400">
                    <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                  </select>
                </div>
              </div>
            </div>

            <Button onClick={handleUpdateAdminProfile} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-md">
              Save Admin Profile
            </Button>
          </CardContent>
        </Card>

        {/* Security Card - Password Change */}
        <Card className="border-2 border-red-100/50 bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="h-5 w-5 text-red-600" />
              <div className="text-sm font-black text-slate-500 uppercase tracking-widest">Security</div>
            </div>
            <p className="text-sm text-slate-600 mb-4">Change your admin account password regularly to keep your account secure.</p>
            <Button onClick={() => setPasswordModal(true)} className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-bold shadow-md">
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Admin Stats */}
        <Card className="border-2 border-amber-100/50 bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl">
          <CardContent className="p-6 space-y-3">
            <div className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Platform Statistics</div>
            {[
              { label: "Violations Issued", value: violations.length },
              { label: "Total Landlords", value: landlords.length },
              { label: "Total Apartments", value: allApartments.length },
              { label: "Open Reports", value: reports.filter((r: any) => r.status === "pending").length },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-3 border-b border-amber-50 last:border-0">
                <span className="font-bold text-slate-600">{label}</span>
                <span className="font-black text-slate-900 text-lg">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Violations Management */}
        <Card className="border-2 border-orange-100/50 bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-black text-slate-500 uppercase tracking-widest">Recent Violations</div>
                <p className="text-xs text-slate-500 mt-1">Manage issued violations and notices</p>
              </div>
              <Badge className="bg-orange-100 text-orange-800">{violations.length}</Badge>
            </div>

            {violations.length === 0 ? (
              <p className="text-center text-slate-500 py-6">No violations issued yet</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {violations.slice(0, 10).map((v) => {
                  const isExpired = v.expiresAt && new Date(v.expiresAt) < new Date();
                  const daysLeft = v.expiresAt ? Math.ceil((new Date(v.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;
                  return (
                    <div key={v.id} className={`p-3 rounded-lg border-2 space-y-2 ${isExpired ? "bg-gray-50 border-gray-200" : "bg-orange-50 border-orange-200"}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{v.landlordName}</p>
                          <p className="text-xs text-slate-600 truncate">{v.apartmentTitle}</p>
                          <p className="text-xs font-semibold text-slate-700 mt-1 capitalize">{v.mode}: {v.type}</p>
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                          <button onClick={() => openEditViolation(v)} className="h-7 w-7 rounded-md bg-amber-100 hover:bg-amber-200 flex items-center justify-center text-amber-700 transition-colors">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDeleteViolation(v.id ?? "")} className="h-7 w-7 rounded-md bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-700 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        {isExpired ? (
                          <Badge className="bg-gray-200 text-gray-700 text-[10px]">Expired</Badge>
                        ) : daysLeft !== null ? (
                          <Badge className={`text-[10px] ${daysLeft <= 7 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                            {daysLeft} days left
                          </Badge>
                        ) : null}
                        <span className="text-slate-500">{formatOptionalDate(v.issuedAt ?? v.issued_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 flex h-full">
        <aside className="hidden lg:flex flex-col w-60 shrink-0 h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 shadow-2xl shadow-slate-900/40">
          <SidebarContent />
        </aside>
        {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <aside className={`fixed top-0 left-0 h-full z-50 w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all z-10">
            <X className="h-4 w-4" />
          </button>
          <SidebarContent />
        </aside>
        <button onClick={() => setSidebarOpen(true)} className="fixed top-4 left-4 z-30 lg:hidden h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-300/40 hover:from-amber-400 hover:to-orange-500 transition-all">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0 h-full overflow-y-auto">
          <main className="px-4 md:px-6 py-6 lg:pt-6 pt-16">
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setViolationModal(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-amber-100 overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={`flex items-center justify-between px-6 pt-5 pb-4 border-b ${
              violationModal.mode === "violation" ? "border-red-100 bg-red-50/40" : "border-amber-100 bg-amber-50/40"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow ${
                  violationModal.mode === "violation" ? "bg-gradient-to-br from-red-500 to-rose-600" : "bg-gradient-to-br from-amber-500 to-orange-600"
                }`}>
                  {violationModal.mode === "violation" ? <AlertOctagon className="h-5 w-5 text-white" /> : <BellRing className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <p className="font-black text-slate-900">{violationModal.mode === "violation" ? "Issue Violation" : "Send Notice"}</p>
                  <p className="text-xs text-slate-400 font-medium">{violationModal.landlordName}</p>
                </div>
              </div>
              <button onClick={() => setViolationModal(null)} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Type Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {violationModal.mode === "violation" ? "Violation Type" : "Notice Type"}
                </label>
                <select
                  value={violationModal.mode === "violation" ? vType : nType}
                  onChange={(e) => violationModal.mode === "violation" ? setVType(e.target.value) : setNType(e.target.value)}
                  className="w-full rounded-xl border-2 border-amber-100 bg-amber-50/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {(violationModal.mode === "violation" ? VIOLATION_TYPES : NOTICE_TYPES).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {violationModal.mode === "violation" ? "Violation Description" : "Message"} (optional)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {(violationModal.mode === "violation" ? vMessage : nMessage).length}/500
                  </span>
                </div>
                <textarea
                  rows={4} maxLength={500}
                  value={violationModal.mode === "violation" ? vMessage : nMessage}
                  onChange={(e) => violationModal.mode === "violation" ? setVMessage(e.target.value) : setNMessage(e.target.value)}
                  placeholder={violationModal.mode === "violation"
                    ? "Describe the violation in detail…"
                    : "Provide additional context or instructions for the landlord…"}
                  className="w-full rounded-xl border-2 border-amber-100 bg-amber-50/30 px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>

              {/* Expiration (violations only) */}
              {violationModal.mode === "violation" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Calendar className="h-3.5 w-3.5 inline mr-1" />
                    Expiration Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={vExpirationDays}
                    onChange={(e) => setVExpirationDays(Math.max(1, parseInt(e.target.value) || 1))}
                    placeholder="Days"
                    className="w-full rounded-xl border-2 border-red-100 bg-red-50/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              )}

              {/* Info Alert */}
              <div className={`flex gap-3 p-3 rounded-xl border ${
                violationModal.mode === "violation" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
              }`}>
                <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${violationModal.mode === "violation" ? "text-red-500" : "text-amber-600"}`} />
                <p className={`text-xs font-medium ${violationModal.mode === "violation" ? "text-red-700" : "text-amber-700"}`}>
                  {violationModal.mode === "violation"
                    ? "This violation will be recorded on the landlord's profile and the linked listing."
                    : "This notice will be sent to the landlord as a formal warning on record."}
                </p>
              </div>
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-amber-50 flex gap-3">
              <Button onClick={issueViolation}
                className={`flex-1 font-bold rounded-xl shadow-md text-white ${
                  violationModal.mode === "violation"
                    ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
                    : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                }`}>
                {violationModal.mode === "violation" ? <><AlertOctagon className="h-4 w-4 mr-2" />Issue Violation</> : <><BellRing className="h-4 w-4 mr-2" />Send Notice</>}
              </Button>
              <Button variant="outline" onClick={() => setViolationModal(null)} className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl">
                Cancel
              </Button>
            </div>
          </div>
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
                    {selectedLandlordDetails.profile?.is_verified || selectedLandlord.isVerified || selectedLandlord.is_verified
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
                      selectedLandlordDetails.profile?.is_verified || selectedLandlord.is_verified
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}>
                      {selectedLandlordDetails.profile?.is_verified || selectedLandlord.is_verified ? "Verified" : "Pending"}
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
                    {selectedLandlordDetails.profile.business_permit_number && (
                      <div className="p-3 bg-green-50/30 border border-green-100 rounded-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Business Permit</p>
                        <p className="text-sm font-bold text-slate-900">{selectedLandlordDetails.profile.business_permit_number}</p>
                        {selectedLandlordDetails.profile.permit_expiry && (
                          <p className="text-xs text-slate-500 mt-1">Expires: {new Date(selectedLandlordDetails.profile.permit_expiry).toLocaleDateString()}</p>
                        )}
                      </div>
                    )}
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
              {selectedLandlordDetails.profile?.is_verified || selectedLandlord.is_verified ? (
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
