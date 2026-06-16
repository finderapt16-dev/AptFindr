import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { Apartment, ApartmentRoom } from "@/app/data/apartments";
import {
  getLandlordVerification,
} from "@/app/data/apartments";
import {
  fetchApartmentInspectionDetails,
  type ApartmentInspectionDetails,
} from "@/app/services/apartmentsService";
import {
  fetchAdminReports,
  fetchLandlordProfile,
  fetchUserById,
  updateReportStatus,
  createViolation,
  type DashboardLandlordProfileRow,
  type DashboardReportRow,
  type DashboardUserRow,
} from "@/app/services/dashboardSupabaseService";
import { getImageUrl } from "@/app/utils/images";
import { useAuth } from "@/app/contexts/AuthContext";
import { MapView } from "@/app/components/features/map/MapView";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";
import { toast } from "sonner";
import {
  ArrowLeft,
  ShieldCheck,
  Home,
  Users,
  Droplet,
  Wind,
  DoorOpen,
  CheckCircle2,
  MapPin,
  Bed,
  Bath,
  Square,
  Calendar,
  Check,
  Flag,
  Eye,
  UserCheck,
  AlertTriangle,
  X,
  Mail,
  Phone,
  Lock,
  Trash2,
  MessageSquare,
  ClipboardList,
  Image as ImageIcon,
  FileSearch,
  Building2,
  ExternalLink,
} from "lucide-react";

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
        <img src={getImageUrl(src)} alt={label || "Apartment image"} className="h-full w-full object-cover" />
      </div>
      {label && <p className="px-3 py-2 text-xs font-bold text-slate-600">{label}</p>}
    </div>
  );
}

export function AdminApartmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [inspectionDetails, setInspectionDetails] = useState<ApartmentInspectionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [landlord, setLandlord] = useState<DashboardUserRow | null>(null);
  const [landlordProfile, setLandlordProfile] = useState<DashboardLandlordProfileRow | null>(null);
  const [verifiedLandlord, setVerifiedLandlord] = useState<{ name?: string } | null>(null);
  const [reports, setReports] = useState<DashboardReportRow[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedReport, setSelectedReport] = useState<DashboardReportRow | null>(null);
  const [moderationMode, setModerationMode] = useState<"view" | "takeAction">("view");
  const [violationType, setViolationType] = useState("Misleading information");
  const [violationMessage, setViolationMessage] = useState("");

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
        if (!active) return;
        const loaded = details?.apartment ?? null;
        setInspectionDetails(details);
        setApartment(loaded);

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
      if (details?.apartment) {
        setInspectionDetails(details);
        setApartment(details.apartment);
        
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

  const handleCreateViolation = async () => {
    if (!apartment?.landlordId || !user?.id) {
      toast.error("Missing required information");
      return;
    }

    if (!violationMessage.trim()) {
      toast.error("Please enter a violation message");
      return;
    }

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
      });

      if (violation) {
        toast.success("Violation issued successfully");
        setModerationMode("view");
        setViolationMessage("");
        setSelectedReport(null);
      } else {
        toast.error("Failed to create violation");
      }
    } catch (error) {
      console.error("Error creating violation:", error);
      toast.error("Error creating violation");
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
          <Button onClick={() => navigate(-1)} className="bg-amber-600 hover:bg-amber-700 text-white">
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
  const documentLinks = [
    { label: "Verification Document", url: landlordProfile?.verification_document_url },
    { label: "ID Document", url: landlordProfile?.id_document_url },
  ].filter((item): item is { label: string; url: string } => typeof item.url === "string" && item.url.trim().length > 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefreshData}
              disabled={isLoading}
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              {isLoading ? (
                <span className="animate-spin">⟳</span>
              ) : (
                <span>↻</span>
              )}
              {isLoading ? "Syncing..." : "Refresh"}
            </Button>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-600">Admin View</Badge>
              <Badge className={STATUS_BADGE[apartment.status ?? "available"]}>
                {STATUS_LABEL[apartment.status ?? "available"]}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Image Gallery */}
            <Card id="admin-images" className="border-2 border-slate-200 scroll-mt-6">
              <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
                <img
                  src={getImageUrl(images[currentImageIndex] || coverImage)}
                  alt={apartment.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <Badge className="bg-black/70 text-white">Main Cover Photo</Badge>
                  <Badge className="bg-black/70 text-white">{images.length} uploaded image(s)</Badge>
                </div>
              </div>
              <CardContent className="pt-4">
                {images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((img, index) => (
                      <div
                        key={index}
                        className={`relative aspect-square overflow-hidden rounded-lg cursor-pointer border-2 transition-all ${
                          currentImageIndex === index ? "border-amber-600" : "border-slate-200 hover:border-slate-300"
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      >
                        <img
                          src={getImageUrl(img)}
                          alt={`View ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {imageRows.length > 0 && (
                  <div className="mt-4">
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

            {/* Apartment Info */}
            <Card className="border-2 border-slate-200">
              <CardContent className="pt-6">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{apartment.title}</h1>
                <div className="flex items-center text-slate-600 mb-4">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>{apartment.address}, {apartment.city}, {apartment.state} {apartment.zip}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  <DetailRow label="Property Name" value={apartment.title} />
                  <DetailRow label="Property Type" value={propertyType} />
                  <DetailRow label="Property Description" value={apartment.description} />
                  <DetailRow label="Complete Address" value={`${apartment.address}, ${apartment.city}, ${apartment.state} ${apartment.zip}`} />
                  <DetailRow label="Monthly Rent" value={`₱${apartment.price.toLocaleString()}`} />
                  <DetailRow label="Available Rooms" value={availableRoomCount} />
                  <DetailRow label="Total Rooms" value={roomsForDisplay.length || apartment.bedrooms} />
                  <DetailRow label="Property Status" value={STATUS_LABEL[apartment.status ?? "available"]} />
                  <DetailRow label="Date Posted" value={datePosted ? new Date(datePosted).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-600 font-medium mb-1">Monthly Rent</p>
                    <p className="text-2xl font-bold text-amber-600">₱{apartment.price.toLocaleString()}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {apartment.amenities.length > 0 && (
                <Card className="border-2 border-slate-200">
                  <CardContent className="pt-6">
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
                <Card className="border-2 border-slate-200">
                  <CardContent className="pt-6">
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
                <Card className="border-2 border-slate-200">
                  <CardContent className="pt-6">
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
              <Card id="admin-rooms" className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-slate-50 scroll-mt-6">
                <CardContent className="pt-6">
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
            <Card className="border-2 border-slate-200">
              <CardContent className="pt-6">
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
            {documentLinks.length > 0 && (
              <Card id="admin-verification" className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-slate-50 scroll-mt-6">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                      <FileSearch className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Verification Documents</h2>
                      <p className="text-sm text-slate-600 font-medium">Landlord's verification & identity documents</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documentLinks.map((doc, index) => (
                      <div key={index} className="p-4 bg-white rounded-lg border border-green-200 hover:border-green-400 transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-bold text-slate-900">{doc.label}</h3>
                          <ExternalLink className="h-4 w-4 text-green-600" />
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block"
                        >
                          <img
                            src={getImageUrl(doc.url)}
                            alt={doc.label}
                            className="w-full h-48 object-cover rounded-lg border border-slate-200 hover:opacity-90 transition-opacity cursor-pointer"
                          />
                        </a>
                        <Button
                          onClick={() => window.open(doc.url, '_blank')}
                          className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Full Document
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
          <div className="lg:col-span-1 space-y-6">
            {/* Landlord Info */}
            {landlord && (
              <Card className="border-2 border-slate-200">
                <CardContent className="pt-6">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-amber-600" />
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
                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-bold text-blue-900">Verified Landlord</span>
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

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => navigate(`/admin/landlords/${landlord.id}`)}
                        className="flex-1 bg-slate-600 hover:bg-slate-700 text-white text-xs"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        View Profile
                      </Button>
                      {documentLinks.length > 0 && (
                        <Button
                          onClick={() => scrollToSection('admin-verification')}
                          variant="outline"
                          className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50 text-xs"
                        >
                          <FileSearch className="h-4 w-4 mr-1" />
                          Documents
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin Actions */}
            <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-slate-50">
              <CardContent className="pt-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Admin Actions</h2>

                <div className="space-y-3">
                  <Button
                    onClick={() => navigate(`/admin/apartments/${apartment.id}/edit`)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start text-xs"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Listing Details
                  </Button>

                  {selectedReport && (
                    <>
                      <div className="border-t border-amber-300 pt-3">
                        <Button
                          onClick={() => setModerationMode(moderationMode === "view" ? "takeAction" : "view")}
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white justify-start text-xs"
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          {moderationMode === "view" ? "Take Action" : "Cancel"}
                        </Button>

                        {moderationMode === "takeAction" && (
                          <>
                            <Button
                              onClick={() => handleResolveReport(selectedReport.id)}
                              className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white justify-start text-xs"
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
                                className="w-full bg-red-600 hover:bg-red-700 text-white justify-start text-xs"
                              >
                                <Lock className="h-4 w-4 mr-2" />
                                Issue Violation
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}

                  <Button
                    variant="outline"
                    className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 justify-start text-xs"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message to Landlord
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 justify-start text-xs"
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

            {/* Listing Info */}
            <Card className="border-2 border-slate-200">
              <CardContent className="pt-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Listing Information</h2>

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
                    <Badge className={STATUS_BADGE[apartment.status ?? "available"]}>
                      {STATUS_LABEL[apartment.status ?? "available"]}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-1">Reports</p>
                    <p className="font-bold text-slate-900">{reports.length} report(s)</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-1">Rooms</p>
                    <p className="font-bold text-slate-900">{apartment.rooms?.length || 0} room(s)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Selected Report Details */}
        {selectedReport && (
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
                        if (id) navigate(`/admin/apartments/${id}`);
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
