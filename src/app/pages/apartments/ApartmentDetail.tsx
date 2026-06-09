import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import type { Apartment } from "@/app/data/apartments";
import {
  fetchApartmentWithImages,
  getLandlordVerification,
  recordApartmentView,
  updateApartment,
} from "@/app/data/apartments";
import { createReport } from "@/app/services/dashboardSupabaseService";
import { apartmentToFormValues } from "@/app/utils/apartmentMappers";
import { getImageUrl } from "@/app/utils/images";
import { useFavorites } from "@/app/hooks/useFavorites";
import { useAuth } from "@/app/contexts/AuthContext";
import { useApartmentsContext } from "@/app/contexts/ApartmentsContext";
import { MapView } from "@/app/components/features/map/MapView";
import { EditApartmentDialog } from "@/app/components/common/EditApartmentDialog";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";
import { toast } from "sonner";
import {
  Heart,
  Bed,
  Bath,
  Square,
  MapPin,
  Calendar,
  Check,
  ArrowLeft,
  Mail,
  Phone,
  Edit,
  ShieldCheck,
  Home,
  Users,
  Droplet,
  Wind,
  DoorOpen,
  CheckCircle2,
  XCircle,
  Flag,
  X,
  AlertTriangle,
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

export function ApartmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { canEditApartment, user } = useAuth();
  const { refreshApartments } = useApartmentsContext();
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [verifiedLandlord, setVerifiedLandlord] = useState<{ name?: string } | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState("Inaccurate information");
  const [reportDetails, setReportDetails] = useState("");
  const [reportContact, setReportContact] = useState("");

  useEffect(() => {
    let active = true;

    const loadApartment = async () => {
      if (!id) {
        setApartment(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const loaded = await fetchApartmentWithImages(id);
        if (!active) {
          return;
        }

        setApartment(loaded);

        if (loaded?.landlordId) {
          const isVerified = await getLandlordVerification(loaded.landlordId);
          if (active && isVerified) {
            setVerifiedLandlord({ name: 'Verified Landlord' });
          } else if (active) {
            setVerifiedLandlord(null);
          }
        }

        if (
          loaded &&
          (user?.role === "student" || user?.role === "employee") &&
          loaded.landlordId !== user.id
        ) {
          const viewKey = `apartment-viewed:${loaded.id}:${user.id}`;
          if (!sessionStorage.getItem(viewKey)) {
            sessionStorage.setItem(viewKey, "true");
            void recordApartmentView(loaded.id, {
              id: user.id,
              authId: user.authId,
              email: user.email,
              name: user.name,
              role: user.role,
            });
          }
        }
      } catch (error) {
        console.error('Failed to load apartment:', error);
        if (active) {
          setApartment(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadApartment();

    return () => {
      active = false;
    };
  }, [id, user?.authId, user?.email, user?.id, user?.name, user?.role]);

  const hasAccess = (() => {
    if (!apartment) return false;
    if (apartment.landlordId === user?.id) return true;
    if (apartment.isPublished === false) return false;
    return true;
  })();

  // Redirect if no access
  if (apartment && !hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Listing Not Available</h2>
          <p className="text-slate-600 mb-6">This listing has been unpublished by the landlord.</p>
          <Button onClick={() => navigate(-1)} className="bg-amber-600 hover:bg-amber-700 text-white">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const submitReport = async () => {
    if (!apartment) return;

    if (!reportDetails.trim()) {
      toast.error("Please provide details about the issue");
      return;
    }

    if (!user?.id) {
      toast.error("Please sign in to submit a report");
      return;
    }

    try {
      const createdReport = await createReport({
        reporter_id: user.id,
        reporter_role: user.role,
        apartment_id: apartment.id,
        issue_type: reportType,
        tags: [reportType],
        details: reportDetails,
        contact: reportContact || user.email,
      });

      if (!createdReport) {
        throw new Error("Unable to save report.");
      }

      toast.success("Report submitted successfully. Admin will review it.");
      setReportModalOpen(false);
      setReportDetails("");
      setReportContact("");
      setReportType("Inaccurate information");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit report.";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-slate-600">Loading apartment...</p>
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Apartment Not Found</h1>
        <Button onClick={() => navigate("/browse")}>Back to Browse</Button>
      </div>
    );
  }

  const canEdit = canEditApartment(apartment.id, apartment.landlordId);
  const favorite = isFavorite(apartment.id);
  const images = [apartment.image, ...apartment.images].filter(Boolean);

  const handleSaveApartment = async (updatedApartment: Apartment) => {
    try {
      const saved = await updateApartment(apartment.id, apartmentToFormValues(updatedApartment), user?.id);
      setApartment(saved);
      await refreshApartments();
      toast.success("Apartment updated successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update apartment.";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          {canEdit && (
            <Button onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Apartment
            </Button>
          )}
        </div>

        {/* Image Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
            <img
              src={getImageUrl(images[currentImageIndex])}
              alt={apartment.title}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {images.slice(1, 5).map((img, index) => (
              <div
                key={index}
                className="relative aspect-[4/3] overflow-hidden rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setCurrentImageIndex(index + 1)}
              >
                <img
                  src={getImageUrl(img)}
                  alt={`${apartment.title} - ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    {apartment.title}
                  </h1>
                  <div className="flex items-center text-slate-600">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span>
                      {apartment.address}, {apartment.city}, {apartment.state} {apartment.zip}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => void toggleFavorite(apartment.id)}
                    className={favorite ? "text-red-500" : ""}
                  >
                    <Heart className="h-5 w-5" fill={favorite ? "currentColor" : "none"} />
                  </Button>
                  {(user?.role === "student" || user?.role === "employee") && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setReportModalOpen(true)}
                      className="text-orange-600 border-orange-200 hover:bg-orange-50"
                      title="Report a problem"
                    >
                      <Flag className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {verifiedLandlord && (
                  <Badge className="bg-blue-600 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Verified Landlord
                  </Badge>
                )}
                {apartment.petFriendly && <Badge variant="secondary">Pet Friendly</Badge>}
                {apartment.parking && <Badge variant="secondary">Parking</Badge>}
                {apartment.furnished && <Badge variant="secondary">Furnished</Badge>}
                <Badge className={STATUS_BADGE[apartment.status ?? "available"]}>
                  {STATUS_LABEL[apartment.status ?? "available"]}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Bed className="h-5 w-5 text-slate-600" />
                    <div>
                      <p className="text-sm text-slate-600">Bedrooms</p>
                      <p className="text-lg font-semibold">{apartment.bedrooms}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Bath className="h-5 w-5 text-slate-600" />
                    <div>
                      <p className="text-sm text-slate-600">Bathrooms</p>
                      <p className="text-lg font-semibold">{apartment.bathrooms}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Square className="h-5 w-5 text-slate-600" />
                    <div>
                      <p className="text-sm text-slate-600">Square Feet</p>
                      <p className="text-lg font-semibold">{apartment.sqft}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Calendar className="h-5 w-5 text-slate-600" />
                    <div>
                      <p className="text-sm text-slate-600">Available</p>
                      <p className="text-lg font-semibold">
                        {new Date(apartment.availableDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Home className="h-5 w-5 text-slate-600" />
                    <div>
                      <p className="text-sm text-slate-600">Status</p>
                      <p className="text-lg font-semibold">{STATUS_LABEL[apartment.status ?? "available"]}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-3">Description</h2>
                <p className="text-slate-700 leading-relaxed">{apartment.description}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Amenities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {apartment.amenities.map((amenity: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {Array.isArray(apartment.utilities) && apartment.utilities.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Utilities Included</h2>
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

            {/* Room Details */}
            {apartment.rooms && apartment.rooms.length > 0 && (
              <Card className="border-2 border-amber-100 bg-gradient-to-br from-white to-amber-50/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                      <Home className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Room Details</h2>
                      <p className="text-sm text-slate-600 font-medium">Individual room breakdown</p>
                    </div>
                  </div>

                  {/* Room Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-white rounded-xl border border-amber-100">
                    <div className="text-center">
                      <p className="text-2xl font-black text-amber-600">{apartment.rooms.length}</p>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Total Rooms</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-green-600">
                        {apartment.rooms.filter((r: any) => !r.isOccupied).length}
                      </p>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Available</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-blue-600">
                        {apartment.rooms.filter((r: any) => r.isOccupied).length}
                      </p>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Occupied</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-purple-600">
                        {apartment.rooms.filter((r: any) => r.hasPrivateBath).length}
                      </p>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">With Bath</p>
                    </div>
                  </div>

                  {/* Individual Rooms */}
                  <div className="space-y-4">
                    {apartment.rooms.map((room: any, index: number) => (
                      <div
                        key={room.id || index}
                        className={`p-5 rounded-2xl border-2 transition-all ${
                          room.isOccupied
                            ? "bg-slate-50 border-slate-200"
                            : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm"
                        }`}
                      >
                        {/* Room Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-md ${
                                room.isOccupied
                                  ? "bg-gradient-to-br from-slate-400 to-slate-500"
                                  : "bg-gradient-to-br from-green-400 to-emerald-500"
                              }`}
                            >
                              <DoorOpen className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black text-slate-900">
                                  {getRecordText(room, ["name", "type", "room_type"], "Room")} #{index + 1}
                                </h3>
                                <Badge className={STATUS_BADGE[getRoomStatus(room)]}>
                                  {STATUS_LABEL[getRoomStatus(room)]}
                                </Badge>
                              </div>
                              <p className="text-2xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mt-1">
                                PHP {getRecordNumber(room, ["price", "rent"]).toLocaleString("en-US")}/month
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Room Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-amber-100">
                            <Square className="h-4 w-4 text-amber-600" />
                            <div>
                              <p className="text-xs text-slate-500 font-semibold">Size</p>
                              <p className="text-sm font-black text-slate-900">{getRecordNumber(room, ["sqft"])} sqft</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-amber-100">
                            <Users className="h-4 w-4 text-amber-600" />
                            <div>
                              <p className="text-xs text-slate-500 font-semibold">Max Guests</p>
                              <p className="text-sm font-black text-slate-900">{getRecordNumber(room, ["maxOccupants", "max_occupants"], 1)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-amber-100">
                            <Droplet className="h-4 w-4 text-amber-600" />
                            <div>
                              <p className="text-xs text-slate-500 font-semibold">Bathroom</p>
                              <p className="text-sm font-black text-slate-900">
                                {room.hasPrivateBath ? "Private" : "Shared"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-amber-100">
                            <Wind className="h-4 w-4 text-amber-600" />
                            <div>
                              <p className="text-xs text-slate-500 font-semibold">AC</p>
                              <p className="text-sm font-black text-slate-900">
                                {room.hasAC ? "Yes" : "No"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Bathroom Details */}
                        {room.hasPrivateBath && room.bathroomType && (
                          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-bold text-blue-900">
                              {room.bathroomType === "en-suite"
                                ? "En-suite bathroom (inside the room)"
                                : "Private bathroom (separate)"}
                            </span>
                          </div>
                        )}

                        {!room.hasPrivateBath && room.sharedBathLocation && (
                          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <MapPin className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-bold text-amber-900">
                              Shared bathroom: {room.sharedBathLocation}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-slate-600 font-medium">
                      💡 <strong>Note:</strong> Each room is rented separately. Contact the landlord for availability and booking details.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location Map */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Location</h2>
                <div className="h-[400px] w-full">
                  <MapView
                    lat={apartment.lat}
                    lng={apartment.lng}
                    zoom={15}
                    showSingleMarker={true}
                  />
                </div>
                <div className="mt-4 flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    {apartment.address}, {apartment.city}, {apartment.state} {apartment.zip}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Contact Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <p className="text-4xl font-bold text-slate-900 mb-1">
                    ${apartment.price}
                  </p>
                  <p className="text-slate-600">/month</p>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-slate-600 text-center">
                    Available from{" "}
                    <span className="font-semibold">
                      {new Date(apartment.availableDate).toLocaleDateString()}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Apartment Dialog */}
      {editDialogOpen && (
        <EditApartmentDialog
          apartment={apartment}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSaveApartment}
        />
      )}

      {/* Report Problem Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={() => setReportModalOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-amber-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-rose-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shadow">
                  <Flag className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-slate-900">Report a Problem</p>
                  <p className="text-xs text-slate-500 font-medium">{apartment.title}</p>
                </div>
              </div>
              <button onClick={() => setReportModalOpen(false)} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Issue Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full rounded-xl border-2 border-amber-100 bg-amber-50/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option>Inaccurate information</option>
                  <option>Scam / fraudulent listing</option>
                  <option>Photos don't match</option>
                  <option>Unresponsive landlord</option>
                  <option>Safety concerns</option>
                  <option>Price discrepancy</option>
                  <option>Property condition issue</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Details *</label>
                  <span className="text-[10px] text-slate-400">{reportDetails.length}/500</span>
                </div>
                <textarea
                  rows={5}
                  maxLength={500}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Please describe the issue in detail..."
                  className="w-full rounded-xl border-2 border-amber-100 bg-amber-50/30 px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Info (Optional)</label>
                <input
                  type="text"
                  value={reportContact}
                  onChange={(e) => setReportContact(e.target.value)}
                  placeholder="Email or phone number"
                  className="w-full rounded-xl border-2 border-amber-100 bg-amber-50/30 px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex gap-3 p-3 rounded-xl border border-amber-100 bg-amber-50">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="text-xs font-medium text-amber-700">
                  Your report will be sent to administrators for review. Please provide as much detail as possible.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-amber-50 flex gap-3">
              <Button onClick={submitReport}
                className="flex-1 font-bold rounded-xl shadow-md text-white bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700">
                <Flag className="h-4 w-4 mr-2" />Submit Report
              </Button>
              <Button variant="outline" onClick={() => setReportModalOpen(false)} className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
