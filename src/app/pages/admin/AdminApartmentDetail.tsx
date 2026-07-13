import { MapView } from "@/app/components/features/map/MapView";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { useAuth } from "@/app/contexts/AuthContext";
import type { Apartment, ApartmentRoom } from "@/app/data/apartments";
import {
  getLandlordVerification,
  updateApartmentPublication,
} from "@/app/data/apartments";
import {
  fetchApartmentInspectionDetails,
  type ApartmentInspectionDetails,
} from "@/app/services/apartmentsService";
import {
  createViolation,
  fetchPendingAppeals,
  fetchAdminReports,
  fetchApartmentChangeLogs,
  fetchLandlordProfile,
  fetchUserById,
  sendAdminMessageToLandlord,
  updateReportStatus,
  type DashboardAppealRow,
  type DashboardAuditLogRow,
  type DashboardLandlordProfileRow,
  type DashboardReportRow,
  type DashboardUserRow,
} from "@/app/services/dashboardSupabaseService";
import {
  VERIFICATION_DOCUMENT_TYPES,
  fetchApartmentVerificationDocuments,
  type VerificationDocumentRecord,
} from "@/app/services/verificationDocumentsService";
import { formatAuditLogForDisplay } from "@/app/utils/auditLogDisplay";
import { supabase } from "@/lib/supabaseclient";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileSearch,
  FileText,
  Flag,
  Home,
  Image as ImageIcon,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const getRecordText = (value: unknown, keys: string[], fallback: string): string => {
  if (!value || typeof value !== "object") {
    return fallback;
  }
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return fallback;
};

const getRecordNumber = (value: unknown, keys: string[], fallback = 0): number => {
  if (!value || typeof value !== "object") {
    return fallback;
  }
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (candidate !== undefined && candidate !== null && candidate !== "") {
      return toFiniteNumber(candidate, fallback);
    }
  }
  return fallback;
};

const STATUS_BADGE: Record<string, string> = {
  available: "bg-green-600 text-white",
  occupied: "bg-red-600 text-white",
  reserved: "bg-yellow-500 text-white",
  maintenance: "bg-slate-500 text-white",
};

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  maintenance: "Under Maintenance",
};

const SHOW_SELECTED_REPORT_DETAILS = false;

const getAdminPropertyStatusLabel = (status: string | undefined, isPublished: boolean | undefined): string => {
  if (isPublished === false) return "Unpublished";
  const normalizedStatus = status ?? "available";
  if (normalizedStatus === "available") return "Published";
  return STATUS_LABEL[normalizedStatus] ?? STATUS_LABEL.available;
};

const getRoomStatus = (room: Record<string, unknown>): string => {
  const raw = typeof room.status === "string" ? room.status : room.isOccupied ? "occupied" : "available";
  return raw === "occupied" || raw === "reserved" || raw === "maintenance" ? raw : "available";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getText = (record: Record<string, unknown> | null | undefined, keys: string[], fallback = "—"): string => {
  if (!record) return fallback;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "boolean") return value ? "Yes" : "No";
  }
  return fallback;
};

const getStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const scrollToFirstVisibleSection = (ids: string[]) => {
  const target = ids
    .map((id) => document.getElementById(id))
    .find((element) => element && element.offsetParent !== null);
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
};

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
      <p className="text-xs text-slate-500 font-semibold mb-1">{label}</p>
      <div className="text-sm font-bold text-slate-900 break-words">{value || "—"}</div>
    </div>
  );
}

function ImageTile({ src, label }: { src: string; label?: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
      <div className="aspect-video bg-slate-100">
        <ImageWithFallback src={src} alt={label || "Apartment image"} className="h-full w-full object-cover" />
      </div>
      {label && <p className="px-3 py-2 text-xs font-bold text-slate-600">{label}</p>}
    </div>
  );
}

export function AdminApartmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { user } = useAuth();
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [inspectionDetails, setInspectionDetails] = useState<ApartmentInspectionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [landlord, setLandlord] = useState<DashboardUserRow | null>(null);
  const [landlordProfile, setLandlordProfile] = useState<DashboardLandlordProfileRow | null>(null);
  const [verifiedLandlord, setVerifiedLandlord] = useState<{ name?: string } | null>(null);
  const [reports, setReports] = useState<DashboardReportRow[]>([]);
  const [appeals, setAppeals] = useState<DashboardAppealRow[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedReport, setSelectedReport] = useState<DashboardReportRow | null>(null);
  const [moderationMode, setModerationMode] = useState<"view" | "takeAction">("view");
  const [violationType, setViolationType] = useState("Misleading information");
  const [violationMessage, setViolationMessage] = useState("");
  const [isIssuingViolation, setIsIssuingViolation] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [quickNotes, setQuickNotes] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [changeLogOpen, setChangeLogOpen] = useState(false);
  const [changeLogLoading, setChangeLogLoading] = useState(false);
  const [changeLogs, setChangeLogs] = useState<DashboardAuditLogRow[]>([]);
  const [changeLogActors, setChangeLogActors] = useState<Record<string, string>>({});
  const [verificationDocuments, setVerificationDocuments] = useState<VerificationDocumentRecord[]>([]);
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [isUpdatingPublication, setIsUpdatingPublication] = useState(false);
  const returnTo = (() => {
    const value = (routeLocation.state as { returnTo?: unknown } | null)?.returnTo;
    return typeof value === "string" && value.startsWith("/") ? value : "/dashboard?section=apartments";
  })();
  const backLabel = (() => {
    const value = (routeLocation.state as { backLabel?: unknown } | null)?.backLabel;
    return typeof value === "string" && value.trim() ? value : "Back to Apartments";
  })();
  const handleBack = () => navigate(returnTo);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      if (!id) {
        setApartment(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const details = await fetchApartmentInspectionDetails(id);
        const submittedDocuments = await fetchApartmentVerificationDocuments(id);
        if (!active) return;
        const loaded = details?.apartment ?? null;
        setInspectionDetails(details);
        setApartment(loaded);
        setVerificationDocuments(submittedDocuments);

        if (loaded?.landlordId) {
          const landlordData = await fetchUserById(loaded.landlordId);
          if (active && landlordData) {
            setLandlord(landlordData);
          }

          const isVerified = await getLandlordVerification(loaded.landlordId);
          if (active && isVerified) {
            setVerifiedLandlord({ name: "Verified Landlord" });
          }

          const profile = await fetchLandlordProfile(loaded.landlordId);
          if (active) {
            setLandlordProfile(profile);
          }
        }

        const allReports = await fetchAdminReports();
        if (active && allReports) {
          const apartmentReports = allReports.filter((r) => r.apartment_id === id || r.apartmentId === id);
          setReports(apartmentReports);
        }
        const allAppeals = await fetchPendingAppeals();
        if (active) setAppeals(allAppeals);
      } catch (error) {
        console.error("Failed to load apartment data:", error);
        if (active) {
          setApartment(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const refreshInspection = () => {
      void fetchApartmentInspectionDetails(id).then((details) => {
        setInspectionDetails(details);
        setApartment(details?.apartment ?? null);
      });
    };
    const channel = supabase
      .channel(`admin-apartment-detail-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "apartments", filter: `id=eq.${id}` }, refreshInspection)
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_rooms", filter: `apartment_id=eq.${id}` }, refreshInspection)
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_images", filter: `apartment_id=eq.${id}` }, refreshInspection)
      .on("postgres_changes", { event: "*", schema: "public", table: "appeals" }, () => { void fetchPendingAppeals().then(setAppeals); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    const sectionId = routeLocation.hash.replace(/^#/, "");
    if (isLoading || !sectionId.startsWith("admin-")) return;
    const timer = window.setTimeout(() => scrollToSection(sectionId), 100);
    return () => window.clearTimeout(timer);
  }, [isLoading, routeLocation.hash]);

  const handleResolveReport = async (reportId: string | undefined) => {
    if (!reportId) {
      toast.error("Cannot resolve report - missing ID");
      return;
    }

    try {
      const updated = await updateReportStatus(reportId, "resolved");
      if (updated) {
        setReports((prev) => prev.map((r) => (r.id === reportId ? updated : r)));
        if (selectedReport?.id === reportId) {
          setSelectedReport(updated);
        }
        toast.success("Report marked as resolved");
      } else {
        toast.error("Failed to resolve report");
      }
    } catch (error) {
      console.error("Error resolving report:", error);
      toast.error("Error resolving report");
    }
  };

  const handleRefreshData = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const details = await fetchApartmentInspectionDetails(id);
      const submittedDocuments = await fetchApartmentVerificationDocuments(id);
      if (details?.apartment) {
        setInspectionDetails(details);
        setApartment(details.apartment);
        setVerificationDocuments(submittedDocuments);
        
        if (details.apartment?.landlordId) {
          const landlordData = await fetchUserById(details.apartment.landlordId);
          if (landlordData) setLandlord(landlordData);
          
          const isVerified = await getLandlordVerification(details.apartment.landlordId);
          if (isVerified) setVerifiedLandlord({ name: "Verified Landlord" });
          
          const profile = await fetchLandlordProfile(details.apartment.landlordId);
          if (profile) setLandlordProfile(profile);
        }
        
        const allReports = await fetchAdminReports();
        if (allReports) {
          const apartmentReports = allReports.filter((r) => r.apartment_id === id || r.apartmentId === id);
          setReports(apartmentReports);
        }
        
        toast.success("Data refreshed successfully");
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublicationReview = async () => {
    if (!apartment?.id || !user?.id || isUpdatingPublication) return;
    const nextPublished = apartment.isPublished === false;
    setIsUpdatingPublication(true);
    try {
      await updateApartmentPublication(apartment.id, nextPublished, user.id);
      setApartment((current) => current ? {
        ...current,
        isPublished: nextPublished,
        approvalStatus: nextPublished ? "approved" : "pending",
        isArchived: nextPublished ? false : current.isArchived,
        deletedAt: nextPublished ? undefined : current.deletedAt,
      } : current);
      toast.success(nextPublished ? "Property approved and published" : "Property unpublished");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update publication status.");
    } finally {
      setIsUpdatingPublication(false);
    }
  };

  const handleCreateViolation = async () => {
    if (isIssuingViolation) return;
    if (!apartment?.landlordId || !user?.id) {
      toast.error("Missing required information");
      return;
    }

    if (!violationMessage.trim()) {
      toast.error("Please enter a violation message");
      return;
    }

    setIsIssuingViolation(true);
    try {
      const violation = await createViolation({
        landlord_id: apartment.landlordId,
        admin_id: user.id,
        mode: "violation",
        type: violationType,
        message: violationMessage,
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        related_report_id: selectedReport?.id,
        apartment_id: apartment.id,
      });

      if (violation) {
        toast.success("Violation issued and landlord notified");
        setModerationMode("view");
        setViolationMessage("");
        setSelectedReport(null);
      } else {
        toast.error("Failed to create violation");
      }
    } catch (error) {
      console.error("Error creating violation:", error);
      toast.error("Error creating violation");
    } finally {
      setIsIssuingViolation(false);
    }
  };

  const handleViewListingDetails = () => {
    if (!apartment?.id) {
      toast.error("Apartment information is unavailable");
      return;
    }

    if (id !== apartment.id) {
      navigate(`/admin/apartment/${apartment.id}`, { state: { returnTo, backLabel } });
      return;
    }

    scrollToSection("admin-property-details");
  };

  const handleSendMessage = async () => {
    const landlordId = landlord?.id ?? apartment?.landlordId;
    if (!user?.id || !apartment?.id || !landlordId) {
      toast.error("Unable to identify the apartment landlord");
      return;
    }
    if (!messageText.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSendingMessage(true);
    try {
      const sent = await sendAdminMessageToLandlord({
        adminId: user.id,
        landlordId,
        apartmentId: apartment.id,
        apartmentTitle: apartment.title,
        message: messageText.trim(),
        reportId: selectedReport?.id ?? null,
      });
      if (!sent) {
        toast.error("Failed to send the message");
        return;
      }

      setMessageText("");
      setMessageModalOpen(false);
      toast.success("Message sent to landlord");
    } catch (error) {
      console.error("Error sending landlord message:", error);
      toast.error("Failed to send the message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleOpenChangeLog = async () => {
    if (!apartment?.id) {
      toast.error("Apartment information is unavailable");
      return;
    }

    setChangeLogOpen(true);
    setChangeLogLoading(true);
    try {
      const logs = await fetchApartmentChangeLogs(apartment.id);
      const listingChanges = logs.filter((log) => {
        const changes = isRecord(log.details?.changes) ? log.details.changes : null;
        return changes && Object.keys(changes).length > 0;
      });
      setChangeLogs(listingChanges);

      const actorIds = Array.from(new Set(listingChanges.map((log) => {
        const details = log.details;
        return String(log.admin_id ?? details?.actor_id ?? "");
      }).filter(Boolean)));
      const actors = await Promise.all(actorIds.map(async (actorId) => [actorId, await fetchUserById(actorId)] as const));
      setChangeLogActors(Object.fromEntries(actors.map(([actorId, actor]) => [actorId, actor?.name || "Administrator"])));
    } catch (error) {
      console.error("Error loading apartment change log:", error);
      setChangeLogs([]);
      toast.error("Failed to load the change log");
    } finally {
      setChangeLogLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <p className="text-slate-600 font-medium">Loading apartment details...</p>
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Apartment Not Found</h2>
          <p className="text-slate-600 mb-6">Unable to load apartment details.</p>
          <Button onClick={handleBack} className="bg-amber-600 hover:bg-amber-700 text-white">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const rawApartment = inspectionDetails?.rawApartment ?? null;
  const rawFeatures = isRecord(rawApartment?.features) ? rawApartment.features : {};
  const imageRows = inspectionDetails?.images ?? [];
  const roomRows = inspectionDetails?.rooms ?? [];
  const images = Array.from(
    new Set(
      [
        ...imageRows
          .slice()
          .sort((left: Record<string, unknown>, right: Record<string, unknown>) => {
            const leftPrimary = left.is_primary === true ? 1 : 0;
            const rightPrimary = right.is_primary === true ? 1 : 0;
            if (leftPrimary !== rightPrimary) return rightPrimary - leftPrimary;
            return getRecordNumber(left, ["sort_order"]) - getRecordNumber(right, ["sort_order"]);
          })
          .map((image: Record<string, unknown>) => getText(image, ["url"], "")),
        apartment.image,
        ...apartment.images,
      ].filter(Boolean),
    ),
  );
  const coverImage = images[0] || apartment.image;
  const roomsForDisplay = roomRows.length > 0 ? roomRows : (apartment.rooms ?? []).map((room: ApartmentRoom) => room as Record<string, unknown>);
  const availableRoomCount = roomsForDisplay.filter((room: Record<string, unknown>) => getRoomStatus(room) === "available").length;
  const customFeatures = getStringList(rawFeatures.customFeatures ?? apartment.features);
  const verificationData = isRecord(rawFeatures.verification) ? rawFeatures.verification : {};
  const propertyType = getText(rawFeatures, ["propertyType", "property_type", "type"], apartment.propertyType || "—");
  const barangay = getText(rawFeatures, ["barangay", "district", "area"], "—");
  const datePosted = getText(rawApartment, ["created_at", "createdAt"], apartment.createdAt || apartment.availableDate);
  const submittedDocumentCards = VERIFICATION_DOCUMENT_TYPES.map((definition) => ({
    ...definition,
    document: verificationDocuments.find((document) => document.documentType === definition.key),
  }));
  const relatedAppeals = appeals.filter((appeal) => {
    const source = Array.isArray(appeal.supporting_docs)
      ? appeal.supporting_docs.find((entry) => entry && typeof entry === "object" && !Array.isArray(entry) && (entry as Record<string, unknown>).kind === "source") as Record<string, unknown> | undefined
      : undefined;
    return source?.apartment_id === apartment.id || reports.some((report) => report.id === appeal.report_id);
  });
  const selectedImage = images[currentImageIndex] || coverImage;
  const imageCount = images.length;
  const canNavigateImages = imageCount > 1;
  const handlePreviousImage = () => {
    if (!canNavigateImages) return;
    setCurrentImageIndex((index) => (index - 1 + imageCount) % imageCount);
  };
  const handleNextImage = () => {
    if (!canNavigateImages) return;
    setCurrentImageIndex((index) => (index + 1) % imageCount);
  };
  const listingStatusLabel = getAdminPropertyStatusLabel(apartment.status, apartment.isPublished);
  const formattedDatePosted = datePosted
    ? new Date(datePosted).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "—";
  const formattedDatePostedTime = datePosted
    ? new Date(datePosted).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-28">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={handleBack} className="w-fit rounded-lg px-2 font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600">
            <ArrowLeft className="mr-2 h-4 w-4 text-orange-600" />
            {backLabel}
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void handlePublicationReview()}
              disabled={isUpdatingPublication}
              variant="outline"
              className={apartment.isPublished === false ? "h-10 rounded-lg border-emerald-200 bg-emerald-600 px-4 font-black text-white hover:bg-emerald-700" : "h-10 rounded-lg border-red-200 px-4 font-black text-red-600 hover:bg-red-50"}
            >
              {apartment.isPublished === false ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
              {isUpdatingPublication ? "Updating..." : apartment.isPublished === false ? "Approve & Publish" : "Unpublish"}
            </Button>
            <Button
              onClick={handleRefreshData}
              disabled={isLoading}
              variant="outline"
              className="h-10 rounded-lg border-orange-200 px-4 font-black text-slate-700 hover:bg-orange-50"
            >
              {isLoading ? (
                <span className="animate-spin">⟳</span>
              ) : (
                <span>↻</span>
              )}
              {isLoading ? "Syncing..." : "Refresh"}
            </Button>
            <div className="flex items-center gap-2">
              <Badge className="rounded-lg bg-purple-600 px-3 py-1.5 text-white">Admin View</Badge>
              <Badge className={`rounded-lg px-3 py-1.5 ${STATUS_BADGE[apartment.status ?? "available"]}`}>
                {listingStatusLabel}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)_360px]">
          {/* Main Content */}
          <div className="grid gap-6 xl:col-span-2 xl:grid-cols-2 xl:items-start">
            {/* Image Gallery */}
            <Card id="admin-images" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm scroll-mt-6 xl:order-1">
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                {selectedImage ? (
                  <ImageWithFallback
                    src={selectedImage}
                    alt={apartment.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                    <Building2 className="h-14 w-14" />
                    <p className="mt-3 text-sm font-bold">No apartment images uploaded</p>
                  </div>
                )}
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  {coverImage && <Badge className="rounded-lg bg-slate-950/85 px-3 py-1.5 text-white">Main Cover Photo</Badge>}
                  <Badge className="rounded-lg bg-orange-500 px-3 py-1.5 text-white">{imageCount} uploaded image(s)</Badge>
                </div>
                {canNavigateImages && (
                  <>
                    <button
                      type="button"
                      title="Previous image"
                      onClick={handlePreviousImage}
                      className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg transition hover:bg-orange-50 hover:text-orange-600"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      title="Next image"
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg transition hover:bg-orange-50 hover:text-orange-600"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
              <CardContent className="p-4 sm:p-5">
                {imageCount > 0 && (
                  <div className="flex gap-4 overflow-x-auto pb-1">
                    {images.map((img, index) => (
                      <button
                        type="button"
                        key={`${img}-${index}`}
                        title={`View image ${index + 1}`}
                        className={`relative h-24 w-36 shrink-0 overflow-hidden rounded-lg border-2 bg-slate-100 transition ${
                          currentImageIndex === index ? "border-orange-500 shadow-md" : "border-slate-200 hover:border-orange-200"
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      >
                        <ImageWithFallback
                          src={img}
                          alt={`View ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                    {imageRows.length > 0 && (
                      <button
                        type="button"
                        onClick={() => scrollToSection("admin-all-images")}
                        className="flex h-24 w-28 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white text-xs font-black text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
                      >
                        <span className="text-xl leading-none">+</span>
                        View All Images ({imageRows.length})
                      </button>
                    )}
                  </div>
                )}
                {imageRows.length > 0 && (
                  <div id="admin-all-images" className="mt-4 scroll-mt-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-amber-600" />
                      All Property Images
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {imageRows.map((image: Record<string, unknown>, index: number) => {
                        const url = getText(image, ["url"], "");
                        if (!url) return null;
                        return (
                          <ImageTile
                            key={`${url}-${index}`}
                            src={url}
                            label={`${image.is_primary ? "Cover Photo" : "Additional Image"}${getText(image, ["caption"], "") ? ` - ${getText(image, ["caption"], "")}` : ""}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm xl:order-8 xl:col-span-2">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-5 flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <FileSearch className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-slate-950">Inspection Overview</h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Review and verify apartment listing details and landlord information.</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Listing Status", value: listingStatusLabel, helper: apartment.isPublished === false ? "Pending admin approval" : "Active and visible to tenants", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
                    { label: "Submitted On", value: formattedDatePosted, helper: formattedDatePostedTime, icon: CalendarCheck, tone: "bg-blue-50 text-blue-600" },
                    { label: "Reports", value: `${reports.length} report(s)`, helper: reports.length > 0 ? "Requires review" : "No active reports", icon: Flag, tone: "bg-rose-50 text-rose-600" },
                    { label: "Visibility", value: apartment.isPublished === false ? "Hidden" : "Public", helper: apartment.isPublished === false ? "Not visible to tenants" : "Visible to all tenants", icon: Eye, tone: "bg-orange-50 text-orange-600" },
                  ].map(({ label, value, helper, icon: Icon, tone }) => (
                    <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-500">{label}</p>
                          <p className="mt-1 truncate text-base font-black text-slate-950">{value}</p>
                          <p className="mt-0.5 truncate text-xs font-medium text-slate-400">{helper || "—"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm xl:order-9 xl:col-span-2">
              <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <div className="mb-4 flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                      <Edit3 className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="font-black text-slate-950">Quick Notes</h2>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Add notes about this inspection for your records.</p>
                    </div>
                  </div>
                  <div className="relative">
                    <textarea
                      value={quickNotes}
                      onChange={(event) => setQuickNotes(event.target.value)}
                      maxLength={500}
                      rows={5}
                      placeholder="Write your inspection notes here..."
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                    />
                    <span className="absolute bottom-3 right-4 text-[11px] font-bold text-slate-400">{quickNotes.length}/500</span>
                  </div>
                </div>
                <div className="rounded-lg bg-orange-50 p-5 text-sm">
                  <h3 className="mb-3 font-black text-orange-900">Inspection Tips</h3>
                  <div className="space-y-2 font-semibold text-slate-700">
                    {["Verify landlord information", "Check property images", "Review listing details", "Ensure compliance"].map((tip) => (
                      <div key={tip} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-orange-600" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {relatedAppeals.length > 0 && <Card className="border border-blue-200"><CardContent className="pt-5"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-black text-slate-900">Related Appeals</h2><p className="text-xs font-medium text-slate-500">Landlord appeals connected to this apartment or its reports.</p></div><Badge className="bg-blue-100 text-blue-700">{relatedAppeals.length}</Badge></div><div className="divide-y divide-slate-100">{relatedAppeals.map((appeal) => <div key={appeal.id} className="flex items-center gap-3 py-3"><FileText className="h-4 w-4 shrink-0 text-blue-600" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{appeal.reason || "Appeal"}</p><p className="line-clamp-2 text-xs font-medium text-slate-500">{appeal.description || "No explanation provided."}</p></div><Badge className="shrink-0 bg-slate-100 text-slate-700">{String(appeal.status || "pending").replace(/_/g, " ")}</Badge></div>)}</div><Button variant="outline" onClick={() => navigate("/dashboard?section=appeals")} className="mt-3 w-full border-blue-200 font-bold text-blue-700">Open Appeal Management</Button></CardContent></Card>}


            {/* Apartment Info */}
            <Card id="admin-property-details" className="rounded-xl border border-slate-200 bg-white shadow-sm scroll-mt-6 xl:order-2">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-5 flex items-start gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <Building2 className="h-7 w-7" />
                  </span>
                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-black text-slate-950">{apartment.title}</h1>
                    <div className="mt-2 flex items-start text-sm font-semibold text-slate-500">
                      <MapPin className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span>{apartment.address}, {apartment.city}, {apartment.state} {apartment.zip}</span>
                    </div>
                  </div>
                </div>
                <div className="hidden items-center text-slate-600 mb-4">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>{apartment.address}, {apartment.city}, {apartment.state} {apartment.zip}</span>
                </div>

                <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-2 xl:grid-cols-3">
                  <DetailRow label="Property Name" value={apartment.title} />
                  <DetailRow label="Property Type" value={propertyType} />
                  <DetailRow label="Property Description" value={apartment.description} />
                  <DetailRow label="Complete Address" value={`${apartment.address}, ${apartment.city}, ${apartment.state} ${apartment.zip}`} />
                  <DetailRow label="Room Pricing" value="See individual room records" />
                  <DetailRow label="Available Rooms" value={availableRoomCount} />
                  <DetailRow label="Total Rooms" value={roomsForDisplay.length || apartment.bedrooms} />
                  <DetailRow label="Property Status" value={getAdminPropertyStatusLabel(apartment.status, apartment.isPublished)} />
                  <DetailRow label="Date Posted" value={datePosted ? new Date(datePosted).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"} />
                </div>

                <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-3">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-600 font-medium mb-1">Bedrooms</p>
                    <p className="text-2xl font-bold text-slate-900">{apartment.bedrooms}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-600 font-medium mb-1">Bathrooms</p>
                    <p className="text-2xl font-bold text-slate-900">{apartment.bathrooms}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-600 font-medium mb-1">Square Feet</p>
                    <p className="text-2xl font-bold text-slate-900">{apartment.sqft}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {verifiedLandlord && (
                    <Badge className="bg-blue-600">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Verified Landlord
                    </Badge>
                  )}
                  {apartment.petFriendly && <Badge variant="secondary">🐾 Pet Friendly</Badge>}
                  {apartment.parking && <Badge variant="secondary">🚗 Parking</Badge>}
                  {apartment.furnished && <Badge variant="secondary">🛋️ Furnished</Badge>}
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-3">Description</h2>
                  <p className="text-slate-700 leading-relaxed">{apartment.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Amenities & Utilities */}
            <div className="grid grid-cols-1 gap-6 xl:order-4">
              {apartment.amenities.length > 0 && (
                <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <h2 className="text-lg font-bold text-slate-900 mb-3">Amenities</h2>
                    <div className="space-y-2">
                      {apartment.amenities.map((amenity: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-slate-700">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {Array.isArray(apartment.utilities) && apartment.utilities.length > 0 && (
                <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <h2 className="text-lg font-bold text-slate-900 mb-3">Utilities Included</h2>
                    <div className="flex flex-wrap gap-2">
                      {apartment.utilities.map((utility: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {utility}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {(customFeatures.length > 0 || Object.keys(verificationData).length > 0) && (
                <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <h2 className="text-lg font-bold text-slate-900 mb-3">Property Features</h2>
                    {customFeatures.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {customFeatures.map((feature, index) => (
                          <Badge key={`${feature}-${index}`} variant="outline">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {Object.keys(verificationData).length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <DetailRow label="Submitted Property Name" value={getText(verificationData, ["propertyName"])} />
                        <DetailRow label="Submitted Property Address" value={getText(verificationData, ["propertyAddress"])} />
                        <DetailRow label="Submitted Business Permit" value={getText(verificationData, ["businessPermit"])} />
                        <DetailRow label="Submitted TIN" value={getText(verificationData, ["tinNumber"])} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Room Details */}
            {roomsForDisplay.length > 0 && (
              <Card id="admin-rooms" className="rounded-xl border border-slate-200 bg-white shadow-sm scroll-mt-6 xl:order-3">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <Home className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Room Details</h2>
                      <p className="text-sm text-slate-600 font-medium">{roomsForDisplay.length} submitted room(s)</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {roomsForDisplay.map((room: Record<string, unknown>, index: number) => (
                      <div
                        key={getText(room, ["id"], `room-${index}`)}
                        id={`admin-room-${getText(room, ["id"], `room-${index}`)}`}
                        className={`p-5 rounded-2xl border-2 ${
                          getRoomStatus(room) === "occupied"
                            ? "bg-slate-100 border-slate-300"
                            : "bg-white border-blue-200 shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">
                              {getText(room, ["room_name", "name"], `Room ${index + 1}`)}
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 mt-1">
                              {getText(room, ["room_type", "type"], "Room type not specified")}
                            </p>
                            <p className="text-xl font-bold text-amber-600 mt-1">
                              ₱{getRecordNumber(room, ["price", "rent"]).toLocaleString()}/month
                            </p>
                          </div>
                          <Badge className={STATUS_BADGE[getRoomStatus(room)]}>
                            {STATUS_LABEL[getRoomStatus(room)]}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 font-semibold mb-1">Size</p>
                            <p className="text-sm font-bold text-slate-900">{getRecordNumber(room, ["sqft"])} sqft</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 font-semibold mb-1">Max Guests</p>
                            <p className="text-sm font-bold text-slate-900">{getRecordNumber(room, ["maxOccupants", "max_occupants"], 1)}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 font-semibold mb-1">Bathroom</p>
                            <p className="text-sm font-bold text-slate-900">
                              {room.has_private_bath === true || room.hasPrivateBath === true
                                ? `Private${getText(room, ["bathroom_type"], "") ? ` - ${getText(room, ["bathroom_type"], "")}` : ""}`
                                : `Shared${getText(room, ["shared_bath_location"], "") ? ` - ${getText(room, ["shared_bath_location"], "")}` : ""}`}
                            </p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 font-semibold mb-1">AC</p>
                            <p className="text-sm font-bold text-slate-900">{room.has_ac === true || room.hasAC === true ? "Yes" : "No"}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          <DetailRow label="Room Availability Status" value={STATUS_LABEL[getRoomStatus(room)]} />
                          <DetailRow label="Room Description" value={getText(room, ["description", "room_description"], "No room description submitted")} />
                        </div>
                        {getStringList(room.images ?? room.image_url ?? room.imageUrl).length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-bold text-slate-900 mb-2">Room Images</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {getStringList(room.images ?? room.image_url ?? room.imageUrl).map((src, imageIndex) => (
                                <ImageTile key={`${src}-${imageIndex}`} src={src} label={`${getText(room, ["room_name", "name"], `Room ${index + 1}`)} image ${imageIndex + 1}`} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location Details */}
            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm xl:order-5">
              <CardContent className="p-5">
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-amber-600" />
                  Location Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  <DetailRow label="Complete Address" value={`${apartment.address}, ${apartment.city}, ${apartment.state} ${apartment.zip}`} />
                  <DetailRow label="Barangay / District" value={barangay} />
                  <DetailRow label="City" value={apartment.city || "—"} />
                  <DetailRow label="ZIP Code" value={apartment.zip || "—"} />
                  <DetailRow label="Latitude" value={apartment.lat ? apartment.lat.toFixed(6) : "—"} />
                  <DetailRow label="Longitude" value={apartment.lng ? apartment.lng.toFixed(6) : "—"} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Map Location</h3>
                <div className="h-[400px] w-full rounded-lg overflow-hidden border border-slate-200">
                  <MapView
                    lat={apartment.lat}
                    lng={apartment.lng}
                    zoom={15}
                    showSingleMarker={true}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Verification Documents */}
            <Card id="admin-verification" className="rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-sm scroll-mt-6 xl:order-6 xl:col-span-2 xl:hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                      <FileSearch className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Verification Documents</h2>
                      <p className="text-sm text-slate-600 font-medium">{landlord?.name || "Landlord"} · {apartment.title}</p>
                    </div>
                  </div>

                  <div className="mb-5 grid gap-3 sm:grid-cols-3">
                    <DetailRow label="Permit Number" value={getText(verificationData, ["businessPermit"], landlordProfile?.business_permit_number || "Not provided")} />
                    <DetailRow label="Verification Status" value={verifiedLandlord ? "Verified" : "Pending review"} />
                    <DetailRow label="Documents Provided" value={`${verificationDocuments.length} of ${VERIFICATION_DOCUMENT_TYPES.length}`} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(showAllDocuments ? submittedDocumentCards : submittedDocumentCards.slice(0, 4)).map(({ key, label, document }) => (
                      <div key={key} className="p-4 bg-white rounded-lg border border-green-200 hover:border-green-400 transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div><h3 className="font-bold text-slate-900">{label}</h3><p className={`mt-1 text-xs font-bold ${document ? "text-emerald-600" : "text-slate-400"}`}>{document?.fileName || "Not provided"}</p></div>
                          {document && <ExternalLink className="h-4 w-4 text-green-600" />}
                        </div>
                        {document ? <>
                          {document.mimeType === "application/pdf" ? <div className="flex h-48 items-center justify-center rounded-lg border border-slate-200 bg-slate-50"><FileText className="h-12 w-12 text-rose-500" /></div> : <img src={document.previewUrl} alt={label} className="h-48 w-full rounded-lg border border-slate-200 object-cover" />}
                          <Button onClick={() => window.open(document.previewUrl, "_blank", "noopener,noreferrer")} className="mt-3 w-full bg-green-600 text-white hover:bg-green-700"><ExternalLink className="mr-2 h-4 w-4" />View Full Document</Button>
                        </> : <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">Not provided</div>}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAllDocuments((current) => !current)}
                    className="mt-4 w-full rounded-lg border-emerald-200 bg-white font-black text-emerald-700 hover:bg-emerald-50"
                  >
                    <FileSearch className="mr-2 h-4 w-4" />
                    {showAllDocuments ? "Show Fewer Documents" : `View All Documents (${submittedDocumentCards.length})`}
                  </Button>
                </CardContent>
              </Card>

            {/* Reports Section */}
            {reports.length > 0 && (
              <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-slate-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                      <Flag className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Linked Reports</h2>
                      <p className="text-sm text-slate-600 font-medium">{reports.length} report(s) against this listing</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {reports.map((report, idx) => (
                      <div
                        key={report.id || idx}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedReport?.id === report.id
                            ? "bg-white border-red-400 shadow-md"
                            : "bg-white border-red-100 hover:border-red-300"
                        }`}
                        onClick={() => setSelectedReport(report)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-900">{report.issue_type || "Report"}</h3>
                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{getRecordText(report, ["details", "reason"], "—")}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                              <span>{report.reporter_name || "Unknown"}</span>
                              <span>•</span>
                              <span>
                                {report.submitted_at
                                  ? new Date(report.submitted_at).toLocaleDateString("en-PH")
                                  : "—"}
                              </span>
                              {report.severity && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold">
                                    {report.severity === "high" ? "🔴" : report.severity === "med" ? "🟡" : "🟢"} {report.severity.toUpperCase()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge
                            className={`shrink-0 ${
                              report.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : report.status === "resolved"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {report.status?.toUpperCase() || "PENDING"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6 xl:col-span-1">
            {/* Landlord Info */}
            {landlord && (
              <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <CardContent className="p-5">
                  <h2 className="mb-5 flex items-center gap-3 text-lg font-black text-slate-950">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><Users className="h-5 w-5" /></span>
                    Landlord Information
                  </h2>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">Name</p>
                      <p className="font-bold text-slate-900">{landlord.name || "—"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">Email</p>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <a
                          href={`mailto:${landlord.email}`}
                          className="text-blue-600 hover:underline text-sm font-medium break-all"
                        >
                          {landlord.email || "—"}
                        </a>
                      </div>
                    </div>

                    {landlord.mobile && (
                      <div>
                        <p className="text-xs text-slate-500 font-semibold mb-1">Phone</p>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400" />
                          <a
                            href={`tel:${landlord.mobile}`}
                            className="text-blue-600 hover:underline text-sm font-medium"
                          >
                            {landlord.mobile}
                          </a>
                        </div>
                      </div>
                    )}

                    {landlord.is_verified && (
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-800">Verified Landlord</span>
                      </div>
                    )}

                    {landlordProfile && (
                      <>
                        {landlordProfile.business_permit_number && (
                          <div>
                            <p className="text-xs text-slate-500 font-semibold mb-1">Business Permit</p>
                            <p className="font-bold text-slate-900">{landlordProfile.business_permit_number}</p>
                          </div>
                        )}

                        {landlordProfile.tin_number && (
                          <div>
                            <p className="text-xs text-slate-500 font-semibold mb-1">TIN Number</p>
                            <p className="font-bold text-slate-900">{landlordProfile.tin_number}</p>
                          </div>
                        )}

                        {landlordProfile.business_name && (
                          <div>
                            <p className="text-xs text-slate-500 font-semibold mb-1">Business Name</p>
                            <p className="font-bold text-slate-900">{landlordProfile.business_name}</p>
                          </div>
                        )}

                        {landlordProfile.id_number && (
                          <div>
                            <p className="text-xs text-slate-500 font-semibold mb-1">ID Number</p>
                            <p className="font-bold text-slate-900">{landlordProfile.id_number}</p>
                          </div>
                        )}

                        {landlordProfile.years_active && (
                          <div>
                            <p className="text-xs text-slate-500 font-semibold mb-1">Years Active</p>
                            <p className="font-bold text-slate-900">{landlordProfile.years_active} year(s)</p>
                          </div>
                        )}

                        {landlordProfile.total_units && (
                          <div>
                            <p className="text-xs text-slate-500 font-semibold mb-1">Total Units</p>
                            <p className="font-bold text-slate-900">{landlordProfile.total_units}</p>
                          </div>
                        )}
                      </>
                    )}

                    <div className="grid gap-2 pt-2">
                      <Button
                        onClick={() => scrollToFirstVisibleSection(["admin-verification-rail", "admin-verification"])}
                        variant="outline"
                        className="h-10 w-full rounded-lg border-orange-200 text-xs font-black text-slate-700 hover:bg-orange-50"
                      >
                        <FileSearch className="h-4 w-4 mr-1" />
                        View Documents
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin Actions */}
            <Card className="rounded-xl border border-orange-200 bg-orange-50/40 shadow-sm">
              <CardContent className="p-5">
                <h2 className="mb-5 flex items-center gap-3 text-lg font-black text-slate-950">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-orange-600"><ShieldCheck className="h-5 w-5" /></span>
                  Admin Actions
                </h2>

                <div className="space-y-3">
                  <Button
                    onClick={handleViewListingDetails}
                    className="h-11 w-full justify-start rounded-lg bg-orange-600 text-xs font-black text-white hover:bg-orange-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Listing Details
                  </Button>

                  {selectedReport && (
                    <>
                      <div className="border-t border-amber-300 pt-3">
                        <Button
                          onClick={() => setModerationMode(moderationMode === "view" ? "takeAction" : "view")}
                          className="h-10 w-full justify-start rounded-lg bg-orange-600 text-xs font-black text-white hover:bg-orange-700"
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          {moderationMode === "view" ? "Take Action" : "Cancel"}
                        </Button>

                        {moderationMode === "takeAction" && (
                          <>
                            <Button
                              onClick={() => handleResolveReport(selectedReport.id)}
                              className="mt-2 h-10 w-full justify-start rounded-lg bg-green-600 text-xs font-black text-white hover:bg-green-700"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Resolve Report
                            </Button>

                            <div className="border-t border-amber-300 pt-3 mt-3">
                              <p className="text-xs font-bold text-slate-900 mb-2">Issue Violation</p>
                              <select
                                value={violationType}
                                onChange={(e) => setViolationType(e.target.value)}
                                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 mb-2"
                              >
                                <option>Misleading information</option>
                                <option>Policy violation</option>
                                <option>Fraudulent listing</option>
                                <option>Safety concern</option>
                                <option>Permit non-compliance</option>
                              </select>

                              <textarea
                                value={violationMessage}
                                onChange={(e) => setViolationMessage(e.target.value)}
                                placeholder="Enter violation details..."
                                rows={4}
                                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 mb-2 resize-none"
                              />

                              <Button
                                onClick={handleCreateViolation}
                                disabled={isIssuingViolation}
                                className="h-10 w-full justify-start rounded-lg bg-red-600 text-xs font-black text-white hover:bg-red-700"
                              >
                                {isIssuingViolation ? <span className="mr-2 animate-spin">&#8635;</span> : <Lock className="h-4 w-4 mr-2" />}
                                {isIssuingViolation ? "Saving..." : "Issue Violation"}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}

                  <Button
                    onClick={() => setMessageModalOpen(true)}
                    disabled={!apartment.landlordId}
                    variant="outline"
                    className="h-10 w-full justify-start rounded-lg border-slate-200 bg-white text-xs font-black text-slate-700 hover:bg-slate-50"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message to Landlord
                  </Button>

                  <Button
                    onClick={() => void handleOpenChangeLog()}
                    variant="outline"
                    className="h-10 w-full justify-start rounded-lg border-slate-200 bg-white text-xs font-black text-slate-700 hover:bg-slate-50"
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    View Change Log
                  </Button>

                  {reports.length > 0 && (
                    <div className="border-t border-amber-300 pt-3">
                      <p className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <Flag className="h-4 w-4 text-red-600" />
                        Reports: {reports.length}
                      </p>
                      {!selectedReport ? (
                        <p className="text-xs text-slate-600">Click a report in the section below to inspect and take action</p>
                      ) : (
                        <p className="text-xs text-amber-700 bg-amber-100 p-2 rounded border border-amber-200">
                          Report selected. Use buttons above to take action or resolve.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card id="admin-verification-rail" className="hidden rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-sm xl:block">
              <CardContent className="p-5">
                <div className="mb-4 flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    <FileSearch className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-black text-slate-950">Verification Documents</h2>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-600">{landlord?.name || "Landlord"} - {apartment.title}</p>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-2">
                  <DetailRow label="Record Number" value={getText(verificationData, ["businessPermit"], landlordProfile?.business_permit_number || "Not provided")} />
                  <DetailRow label="Verification Status" value={verifiedLandlord ? "Verified" : "Pending"} />
                  <DetailRow label="Documents Provided" value={`${verificationDocuments.length} of ${VERIFICATION_DOCUMENT_TYPES.length}`} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {(showAllDocuments ? submittedDocumentCards : submittedDocumentCards.slice(0, 4)).map(({ key, label, document }) => (
                    <div key={key} className="rounded-lg border border-emerald-100 bg-white p-3">
                      <div className="mb-2 min-h-10">
                        <h3 className="line-clamp-1 text-xs font-black text-slate-900">{label}</h3>
                        <p className={`mt-0.5 truncate text-[11px] font-bold ${document ? "text-emerald-600" : "text-slate-400"}`}>{document?.fileName || "Not provided"}</p>
                      </div>
                      {document ? (
                        <>
                          {document.mimeType === "application/pdf" ? (
                            <div className="flex h-24 items-center justify-center rounded-lg border border-slate-200 bg-slate-50"><FileText className="h-8 w-8 text-rose-500" /></div>
                          ) : (
                            <img src={document.previewUrl} alt={label} className="h-24 w-full rounded-lg border border-slate-200 object-cover" />
                          )}
                          <Button onClick={() => window.open(document.previewUrl, "_blank", "noopener,noreferrer")} className="mt-2 h-8 w-full rounded-md bg-emerald-600 text-[11px] font-black text-white hover:bg-emerald-700">
                            View Full Document
                          </Button>
                        </>
                      ) : (
                        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-400">Not provided</div>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAllDocuments((current) => !current)}
                  className="mt-4 w-full rounded-lg border-emerald-200 bg-white font-black text-emerald-700 hover:bg-emerald-50"
                >
                  {showAllDocuments ? "Show Fewer Documents" : `View All Documents (${submittedDocumentCards.length})`}
                </Button>
              </CardContent>
            </Card>

            {/* Listing Info */}
            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <h2 className="mb-5 flex items-center gap-3 text-lg font-black text-slate-950">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><FileText className="h-5 w-5" /></span>
                  Listing Information
                </h2>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-1">Available From</p>
                    <p className="font-bold text-slate-900">
                      {new Date(apartment.availableDate).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-1">Status</p>
                    <Badge className={`rounded-lg px-3 py-1 ${STATUS_BADGE[apartment.status ?? "available"]}`}>
                      {listingStatusLabel}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-1">Reports</p>
                    <p className="font-bold text-slate-900">{reports.length} report(s)</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-1">Rooms</p>
                    <p className="font-bold text-slate-900">{roomsForDisplay.length || apartment.rooms?.length || 0} room(s)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {messageModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={() => !isSendingMessage && setMessageModalOpen(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Send Message to Landlord</h2>
                  <p className="mt-1 text-xs text-slate-500">To {landlord?.name || "Apartment landlord"} about {apartment.title}</p>
                </div>
                <button onClick={() => setMessageModalOpen(false)} disabled={isSendingMessage} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50"><X className="h-4 w-4" /></button>
              </div>
              <textarea
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                rows={6}
                maxLength={2000}
                placeholder="Write your message to the landlord..."
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400"><span>The landlord will receive this as a notification.</span><span>{messageText.length}/2000</span></div>
              <div className="mt-5 flex gap-3">
                <Button variant="outline" onClick={() => setMessageModalOpen(false)} disabled={isSendingMessage} className="flex-1">Cancel</Button>
                <Button onClick={() => void handleSendMessage()} disabled={isSendingMessage || !messageText.trim()} className="flex-1 bg-amber-600 text-white hover:bg-amber-700"><Send className="mr-2 h-4 w-4" />{isSendingMessage ? "Sending..." : "Send Message"}</Button>
              </div>
            </div>
          </div>
        )}

        {changeLogOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={() => setChangeLogOpen(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div><h2 className="text-lg font-bold text-slate-900">Apartment Change Log</h2><p className="mt-0.5 text-xs text-slate-500">{apartment.title}</p></div>
                <button onClick={() => setChangeLogOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>
              </div>
              <div className="overflow-y-auto p-6">
                {changeLogLoading ? (
                  <div className="py-14 text-center text-sm font-medium text-slate-500">Loading change history...</div>
                ) : changeLogs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-14 text-center"><ClipboardList className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p className="text-sm font-bold text-slate-700">No listing changes recorded yet.</p><p className="mt-1 text-xs text-slate-500">Future property and room updates will appear here.</p></div>
                ) : (
                  <div className="space-y-4">
                    {changeLogs.map((log) => {
                      const displayLog = formatAuditLogForDisplay(log);
                      const actorId = String(log.admin_id ?? log.details?.actor_id ?? "");
                      return (
                        <div key={log.id} className="rounded-lg border border-slate-200 p-4">
                          <div className="mb-3 flex flex-col justify-between gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
                            <div><p className="text-sm font-bold text-slate-900">{displayLog.title}</p><p className="text-xs text-slate-500">By {changeLogActors[actorId] || (actorId ? "Administrator" : "System")}</p></div>
                            <p className="text-xs font-medium text-slate-400">{log.created_at ? new Date(log.created_at).toLocaleString("en-PH") : "Date unavailable"}</p>
                          </div>
                          <div className="space-y-3">
                            {(displayLog.changes.length > 0 ? displayLog.changes : [{ key: "summary", summary: displayLog.detail }]).map((change) => (
                              <div key={change.key} className="rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{change.summary}</div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Selected Report Details */}
        {SHOW_SELECTED_REPORT_DETAILS && selectedReport && (
          <Card className="mt-6 border-2 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Report Investigation Details</h2>
                <Button variant="ghost" onClick={() => setSelectedReport(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Report Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">Issue Type</p>
                      <p className="font-bold text-slate-900">{selectedReport.issue_type || "—"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">Reported By</p>
                      <p className="font-bold text-slate-900">{selectedReport.reporter_name || selectedReport.reporter_role || "Anonymous"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">Severity</p>
                      <Badge
                        className={
                          selectedReport.severity === "high"
                            ? "bg-red-600"
                            : selectedReport.severity === "med"
                              ? "bg-yellow-600"
                              : "bg-green-600"
                        }
                      >
                        {selectedReport.severity?.toUpperCase() || "UNKNOWN"}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">Date Reported</p>
                      <p className="font-bold text-slate-900">
                        {selectedReport.submitted_at
                          ? new Date(selectedReport.submitted_at).toLocaleDateString("en-PH")
                          : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">Status</p>
                      <Badge
                        className={
                          selectedReport.status === "pending"
                            ? "bg-yellow-600"
                            : selectedReport.status === "resolved"
                              ? "bg-green-600"
                              : "bg-slate-600"
                        }
                      >
                        {selectedReport.status?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Report Details & Inspection</h3>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mb-4">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {getRecordText(selectedReport, ["details", "reason"], "No details provided")}
                    </p>
                  </div>

                  {selectedReport.contact && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 font-semibold mb-1">Reporter Contact</p>
                      <p className="font-bold text-slate-900">{selectedReport.contact}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (id) navigate(`/admin/apartment/${id}`, { state: { returnTo, backLabel } });
                      }}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      View Reported Apartment
                    </Button>
                    <Button
                      onClick={() => navigate(`/admin/landlords/${apartment?.landlordId}`)}
                      className="flex-1 bg-slate-600 hover:bg-slate-700 text-white"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View Landlord
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
