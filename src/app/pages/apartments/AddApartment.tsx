import { useState, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  apartmentFormValuesFromApartment,
  createApartment,
  insertApartmentImages,
  insertApartmentRooms,
  resolveAppUserId,
  type Apartment,
} from "@/app/data/apartments";
import { createNotification } from "@/app/services/dashboardSupabaseService";
import { fetchAppUsers } from "@/app/services/authService";
import { useApartmentsContext } from "@/app/contexts/ApartmentsContext";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Switch } from "@/app/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { LocationPicker } from "@/app/components/common/LocationPicker";
import {
  ArrowLeft, AlertCircle, Sparkles, Building2, MapPin, ListChecks,
  ArrowRight, ShieldCheck, FileText, Camera, Upload, X, Plus,
  Home, Trash2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { toast } from "sonner";

// ── Room type ─────────────────────────────────────────────────────────────────
type Room = {
  id: string;
  type: string;
  sqft: number;
  maxOccupants: number;
  rent: number;
  hasPrivateBath: boolean;
  bathroomType: string;        // "en-suite" | "separate" | ""
  sharedBathLocation: string;
  isOccupied: boolean;
  hasAC: boolean;
}; 

const ROOM_TYPES = ["Bedroom", "Studio", "Shared room", "Suite", "Loft", "Other"];

const makeRoom = (): Room => ({
  id: Date.now().toString() + Math.random(),
  type: "Bedroom",
  sqft: 150,
  maxOccupants: 1,
  rent: 0,
  hasPrivateBath: false,
  bathroomType: "",
  sharedBathLocation: "",
  isOccupied: false,
  hasAC: false,
});
// ─────────────────────────────────────────────────────────────────────────────

const VALID_ID_TYPES = [
  "Passport",
  "Driver's License",
  "SSS ID",
  "GSIS ID",
  "PhilHealth ID",
  "Postal ID",
  "Voter's ID",
  "PRC ID",
  "National ID (PhilSys)",
  "TIN ID",
  "Barangay ID",
  "Senior Citizen ID",
  "PWD ID",
  "OFW ID",
];

const SUGGESTED_FEATURES = [
  "Pet Friendly",
  "Parking",
  "Furnished",
  "Semi-Furnished",
  "WiFi Ready",
  "CCTV",
  "Security Guard",
  "Swimming Pool",
  "Gym",
  "Balcony",
  "Garden",
  "Elevator",
  "Generator / Backup Power",
  "Water Heater",
  "Laundry Area",
  "Storage Room",
  "Near Market",
  "Near Hospital",
  "Near School",
];

export function AddApartment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshApartments } = useApartmentsContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [formData, setFormData] = useState<Partial<Apartment>>({
    title: "",
    price: 0,
    sqft: 500,
    address: "",
    city: "La Paz",
    state: "Iloilo City",
    zip: "5000",
    description: "",
    availableDate: new Date().toISOString().split("T")[0],
    petFriendly: false,
    parking: false,
    furnished: false,
    lat: 10.7202,
    lng: 122.5621,
    image: "modern-loft-apartment",
    images: ["modern-loft-apartment", "modern-kitchen-interior", "modern-bedroom-interior"],
    amenities: [],
    utilities: false,
  });

  // ── Rooms state ───────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<Room[]>([makeRoom()]);

  const updateRoom = (id: string, patch: Partial<Room>) =>
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRoom = (id: string) =>
    setRooms((prev) => prev.filter((r) => r.id !== id));
  // ─────────────────────────────────────────────────────────────────────────

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [amenitiesInput, setAmenitiesInput] = useState("");
  const [utilitiesInput, setUtilitiesInput] = useState("");

  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");

  const addFeature = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (features.map((f) => f.toLowerCase()).includes(trimmed.toLowerCase())) {
      toast.error("Feature already added");
      return;
    }
    setFeatures((prev) => [...prev, trimmed]);
    setFeatureInput("");
  };

  const removeFeature = (index: number) =>
    setFeatures((prev) => prev.filter((_, i) => i !== index));

  const handleFeatureKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addFeature(featureInput);
    }
  };

  const [verificationData, setVerificationData] = useState({
    propertyName: "",
    propertyAddress: "",
    businessPermit: "",
    tinNumber: "",
    idType: "",
    idNumber: "",
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image size must be less than 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      toast.success("Image uploaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) { videoRef.current.srcObject = stream; setIsCameraActive(true); }
    } catch {
      toast.error("Unable to access camera. Please check permissions.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        setUploadedImage(canvasRef.current.toDataURL("image/jpeg"));
        stopCamera();
        toast.success("Photo captured successfully!");
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      setIsCameraActive(false);
    }
  };

  const clearImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== "landlord") { toast.error("Only landlords can add apartments"); return; }
    if (!user.id) { toast.error("User ID is missing. Please log in again."); return; }

    const primaryImage = uploadedImage || formData.image || "modern-loft-apartment";
    const imageList = uploadedImage
      ? [uploadedImage, ...(formData.images?.filter((img) => img !== "modern-loft-apartment") || [])]
      : formData.images || [];

    const featureLower = features.map((f) => f.toLowerCase());
    const utilityItems = utilitiesInput.split(",").map((u) => u.trim()).filter(Boolean);

    const draftApartment: Apartment = {
      id: "",
      title: formData.title || "",
      price: Number(formData.price) || 0,
      bedrooms: rooms.length,
      bathrooms: rooms.filter((r) => r.hasPrivateBath).length,
      sqft: Number(formData.sqft) || 500,
      address: formData.address || "",
      city: formData.city || "La Paz",
      state: formData.state || "Iloilo City",
      zip: formData.zip || "5000",
      image: primaryImage,
      images: imageList,
      description: formData.description || "",
      amenities: amenitiesInput.split(",").map((a) => a.trim()).filter(Boolean),
      availableDate: formData.availableDate || new Date().toISOString().split("T")[0],
      petFriendly: featureLower.includes("pet friendly"),
      parking: featureLower.includes("parking"),
      furnished: featureLower.includes("furnished"),
      utilities: utilityItems,
      lat: Number(formData.lat) || 10.7202,
      lng: Number(formData.lng) || 122.5621,
      landlordId: user.id,
      isPublished: true,
    };

    try {
      const formValues = {
        ...apartmentFormValuesFromApartment(draftApartment),
        utilityItems,
        customFeatures: features,
        verification: {
          propertyName: verificationData.propertyName,
          propertyAddress: verificationData.propertyAddress,
          businessPermit: verificationData.businessPermit,
          tinNumber: verificationData.tinNumber,
          idType: verificationData.idType,
          idNumber: verificationData.idNumber,
        },
      };
      const landlordIdentity = {
        id: user.id,
        authId: user.authId,
        email: user.email,
        name: user.name,
        role: user.role,
      };
      const resolvedLandlordId = await resolveAppUserId(landlordIdentity);
      const created = await createApartment(
        { ...formValues, landlordId: resolvedLandlordId },
        resolvedLandlordId,
      );

      if (imageList.length > 0) {
        await insertApartmentImages(created.id, imageList);
      }

      await insertApartmentRooms(
        created.id,
        rooms.map((room) => ({
          id: room.id,
          name: room.type,
          sqft: room.sqft,
          maxOccupants: room.maxOccupants,
          price: room.rent,
          hasPrivateBath: room.hasPrivateBath,
          bathroomType: room.bathroomType,
          sharedBathLocation: room.sharedBathLocation,
          hasAC: room.hasAC,
          isOccupied: room.isOccupied,
        })),
      );

      const appUsers = await fetchAppUsers();
      const admin = appUsers.find((entry) => entry.role === "admin");

      if (admin?.id) {
        await createNotification({
          user_id: admin.id,
          type: "info",
          title: "New Property Submitted",
          message: `${user.name} added "${created.title}" at ${created.address}, ${created.city}`,
          payload: { apartmentId: created.id, landlordId: created.landlordId ?? resolvedLandlordId },
        });
      }

      await refreshApartments();
      toast.success("Apartment added successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to submit apartment:", error);
      const message = error instanceof Error ? error.message : "Unable to save apartment.";
      toast.error(message);
    }
  };

  // ── Derived room stats ────────────────────────────────────────────────────
  const totalRooms     = rooms.length;
  const availableRooms = rooms.filter((r) => !r.isOccupied).length;
  const occupiedRooms  = rooms.filter((r) => r.isOccupied).length;
  const withBathRooms  = rooms.filter((r) => r.hasPrivateBath).length;

  if (user?.role !== "landlord") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 pb-20 relative overflow-hidden">
      <div className="absolute top-20 right-0 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 py-12 relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8 text-slate-600 hover:text-amber-600 hover:bg-amber-50 font-bold"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-10">
          <div className="inline-block mb-4 px-4 py-1.5 bg-white/70 backdrop-blur-md border border-amber-200/50 rounded-full shadow-sm">
            <span className="text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center justify-center gap-2 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Management
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            List Your{" "}
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Apartment
            </span>
          </h1>
        </div>

        {!user?.isVerified && (
          <Alert className="mb-10 max-w-3xl mx-auto border-amber-200 bg-white/80 backdrop-blur-xl shadow-lg rounded-2xl">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-900 font-bold">Verification Pending</AlertTitle>
            <AlertDescription className="text-slate-600 font-medium mt-1">
              Your property will be listed, but the "Verified Landlord" badge will appear after permit approval.
            </AlertDescription>
          </Alert>
        )}

        <Card className="max-w-3xl mx-auto border-amber-100/50 shadow-2xl bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="pb-6 border-b border-amber-50">
            <CardTitle className="text-2xl font-bold text-slate-900">Property Details</CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              Provide accurate info for your listing
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleSubmit} className="space-y-10">

              {/* ── Apartment Photo ─────────────────────────────────────────── */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                  <Camera className="h-5 w-5 text-amber-600" />
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest">Apartment Photo</h3>
                </div>

                {uploadedImage && (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-amber-200 bg-slate-100">
                    <img src={uploadedImage} alt="Apartment preview" className="w-full h-64 object-cover" />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {!uploadedImage && (
                  <div className="space-y-4">
                    {!isCameraActive && (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-amber-300 rounded-2xl hover:bg-amber-50 transition bg-white"
                      >
                        <Camera className="h-6 w-6 text-amber-600" />
                        <div className="text-left">
                          <p className="font-bold text-slate-900">Take a Photo</p>
                          <p className="text-sm text-slate-600">Use your device camera</p>
                        </div>
                      </button>
                    )}

                    {isCameraActive && (
                      <div className="space-y-4">
                        <video ref={videoRef} autoPlay playsInline className="w-full rounded-2xl border-2 border-amber-200" />
                        <div className="flex gap-3">
                          <Button type="button" onClick={capturePhoto} className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold">
                            <Camera className="h-4 w-4 mr-2" /> Capture
                          </Button>
                          <Button type="button" onClick={stopCamera} variant="outline" className="flex-1 rounded-xl font-bold">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-amber-300 rounded-2xl hover:bg-amber-50 transition bg-white"
                    >
                      <Upload className="h-6 w-6 text-amber-600" />
                      <div className="text-left">
                        <p className="font-bold text-slate-900">Upload Photo</p>
                        <p className="text-sm text-slate-600">Choose from your device</p>
                      </div>
                    </button>

                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

                    <p className="text-xs text-slate-500 font-medium bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                      📸 Upload a clear photo of your apartment. Accepted formats: JPG, PNG, WebP. Max size: 5MB
                    </p>
                  </div>
                )}
              </div>

              {/* ── Basic Information ───────────────────────────────────────── */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                  <Building2 className="h-5 w-5 text-amber-600" />
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest">Basic Information</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title" className="text-slate-700 font-bold ml-1">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Modern Loft"
                    required
                    className="rounded-xl border-amber-100 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-slate-700 font-bold ml-1">Rent (₱) *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      required
                      className="rounded-xl border-amber-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sqft" className="text-slate-700 font-bold ml-1">Total Sqft *</Label>
                    <Input
                      id="sqft"
                      type="number"
                      value={formData.sqft}
                      onChange={(e) => setFormData({ ...formData, sqft: Number(e.target.value) })}
                      required
                      className="rounded-xl border-amber-100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-700 font-bold ml-1">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    required
                    className="rounded-xl border-amber-100 resize-none"
                  />
                </div>
              </div>

              {/* ── Location ────────────────────────────────────────────────── */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                  <MapPin className="h-5 w-5 text-amber-600" />
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest">Location</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-slate-700 font-bold ml-1">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    className="rounded-xl border-amber-100"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-slate-700 font-bold ml-1">City</Label>
                    <Input id="city" value={formData.city} readOnly className="bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-slate-700 font-bold ml-1">Province</Label>
                    <Input id="state" value={formData.state} readOnly className="bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip" className="text-slate-700 font-bold ml-1">ZIP</Label>
                    <Input id="zip" value={formData.zip} readOnly className="bg-slate-50" />
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden border border-amber-100">
                  <LocationPicker
                    lat={formData.lat ?? 0}
                    lng={formData.lng ?? 0}
                    onLocationChange={(lat, lng) => setFormData({ ...formData, lat, lng })}
                  />
                </div>
              </div>

              {/* ── Rooms ────────────────────────────────────────────────────── */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                  <Home className="h-5 w-5 text-amber-600" />
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest">Rooms</h3>
                </div>

                {rooms.map((room, index) => (
                  <div
                    key={room.id}
                    className="border border-amber-100 rounded-2xl p-5 bg-amber-50/30 space-y-4"
                  >
                    {/* Room header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold bg-amber-100 text-amber-800 rounded-full px-3 py-1">
                        Room {index + 1}
                      </span>
                      {rooms.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeRoom(room.id)}
                          className="text-red-500 border-red-200 hover:bg-red-50 rounded-xl text-xs font-bold gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </Button>
                      )}
                    </div>

                    {/* Type + Size */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-slate-700 font-bold text-xs uppercase tracking-wide">Room Type</Label>
                        <select
                          value={room.type}
                          onChange={(e) => updateRoom(room.id, { type: e.target.value })}
                          className="w-full h-10 rounded-xl border border-amber-100 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {ROOM_TYPES.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-slate-700 font-bold text-xs uppercase tracking-wide">Size (sqft)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={room.sqft}
                          onChange={(e) => updateRoom(room.id, { sqft: Number(e.target.value) })}
                          className="rounded-xl border-amber-100"
                        />
                      </div>
                    </div>

                    {/* Occupants + Rent */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-slate-700 font-bold text-xs uppercase tracking-wide">Max Occupants</Label>
                        <Input
                          type="number"
                          min={1}
                          value={room.maxOccupants}
                          onChange={(e) => updateRoom(room.id, { maxOccupants: Number(e.target.value) })}
                          className="rounded-xl border-amber-100"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-slate-700 font-bold text-xs uppercase tracking-wide">Monthly Rent (₱)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={room.rent}
                          onChange={(e) => updateRoom(room.id, { rent: Number(e.target.value) })}
                          className="rounded-xl border-amber-100"
                        />
                      </div>
                    </div>

                    {/* Private bathroom toggle */}
                    <div className="flex items-center justify-between p-3 border border-amber-100 rounded-xl bg-white">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Has private bathroom</p>
                        <p className="text-xs text-slate-400">En-suite or separate private bath</p>
                      </div>
                      <Switch
                        checked={room.hasPrivateBath}
                        onCheckedChange={(v) =>
                          updateRoom(room.id, {
                            hasPrivateBath: v,
                            bathroomType: v ? "en-suite" : "",
                            sharedBathLocation: "",
                          })
                        }
                      />
                    </div>

                    {room.hasPrivateBath ? (
                      <div className="space-y-1.5 pl-3 border-l-2 border-amber-300">
                        <Label className="text-slate-700 font-bold text-xs uppercase tracking-wide">Bathroom Type</Label>
                        <select
                          value={room.bathroomType}
                          onChange={(e) => updateRoom(room.id, { bathroomType: e.target.value })}
                          className="w-full h-10 rounded-xl border border-amber-100 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="en-suite">Private (en-suite)</option>
                          <option value="separate">Private (separate)</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-2 pl-3 border-l-2 border-slate-200">
                        <p className="text-xs text-slate-400 font-medium">Shares bathroom with other rooms</p>
                        <div className="space-y-1.5">
                          <Label className="text-slate-700 font-bold text-xs uppercase tracking-wide">
                            Shared Bathroom Location <span className="normal-case font-normal">(optional)</span>
                          </Label>
                          <Input
                            placeholder="e.g. 2nd floor hallway"
                            value={room.sharedBathLocation}
                            onChange={(e) => updateRoom(room.id, { sharedBathLocation: e.target.value })}
                            className="rounded-xl border-amber-100"
                          />
                        </div>
                      </div>
                    )}

                    {/* Extra toggles */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 border border-amber-100 rounded-xl bg-white">
                        <span className="text-sm font-bold text-slate-800">Air conditioned</span>
                        <Switch
                          checked={room.hasAC}
                          onCheckedChange={(v) => updateRoom(room.id, { hasAC: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border border-amber-100 rounded-xl bg-white">
                        <span className="text-sm font-bold text-slate-800">Currently occupied</span>
                        <Switch
                          checked={room.isOccupied}
                          onCheckedChange={(v) => updateRoom(room.id, { isOccupied: v })}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add room button */}
                <button
                  type="button"
                  onClick={() => setRooms((prev) => [...prev, makeRoom()])}
                  className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-amber-300 rounded-2xl text-amber-700 font-bold text-sm hover:bg-amber-50 transition"
                >
                  <Plus className="h-4 w-4" /> Add Another Room
                </button>

                {/* Summary bar */}
                <div className="grid grid-cols-4 gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
                  {[
                    { label: "Total rooms", val: totalRooms },
                    { label: "Available",   val: availableRooms },
                    { label: "Occupied",    val: occupiedRooms },
                    { label: "With bath",   val: withBathRooms },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="text-2xl font-black text-amber-700">{val}</p>
                      <p className="text-xs text-slate-400 font-medium">{label}</p>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-slate-500 font-medium bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  🛏️ Each room is listed separately. Tenants can filter by bathroom type and availability.
                </p>
              </div>

              {/* ── Amenities ────────────────────────────────────────────────── */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                  <Building2 className="h-5 w-5 text-amber-600" />
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest">Amenities</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amenities" className="text-slate-700 font-bold ml-1">
                    Amenities (comma-separated)
                  </Label>
                  <Textarea
                    id="amenities"
                    value={amenitiesInput}
                    onChange={(e) => setAmenitiesInput(e.target.value)}
                    placeholder="e.g., Parking, WiFi, Gym, Pool, Security Guard"
                    rows={3}
                    className="rounded-xl border-amber-100 resize-none"
                  />
                  <p className="text-xs text-slate-500 font-medium bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    💡 Separate each amenity with a comma. Examples: Parking, WiFi, Gym, Swimming Pool, 24/7 Security
                  </p>
                </div>
              </div>

              {/* ── Utilities ────────────────────────────────────────────────── */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                  <Home className="h-5 w-5 text-amber-600" />
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest">Utilities Included</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="utilities" className="text-slate-700 font-bold ml-1">
                    Utilities (comma-separated)
                  </Label>
                  <Textarea
                    id="utilities"
                    value={utilitiesInput}
                    onChange={(e) => setUtilitiesInput(e.target.value)}
                    placeholder="e.g., Water, Electricity, Internet, Gas"
                    rows={3}
                    className="rounded-xl border-amber-100 resize-none"
                  />
                  <p className="text-xs text-slate-500 font-medium bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    💡 List utilities included in the rent. Leave empty if none are included.
                  </p>
                </div>
              </div>

              {/* ── Features ─────────────────────────────────────────────────── */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                  <ListChecks className="h-5 w-5 text-amber-600" />
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest">Features</h3>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={handleFeatureKeyDown}
                    placeholder='Type a feature and press Enter — e.g. "Air Conditioning"'
                    className="rounded-xl border-amber-100 focus:ring-amber-500 flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => addFeature(featureInput)}
                    className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {features.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {features.map((feature, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 text-sm font-semibold rounded-full border border-amber-200"
                      >
                        {feature}
                        <button
                          type="button"
                          onClick={() => removeFeature(i)}
                          className="hover:text-red-600 transition-colors"
                          aria-label={`Remove ${feature}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Add</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_FEATURES.filter(
                      (s) => !features.map((f) => f.toLowerCase()).includes(s.toLowerCase())
                    ).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => addFeature(suggestion)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-200 text-slate-600 text-xs font-semibold rounded-full hover:bg-amber-50 hover:border-amber-400 hover:text-amber-700 transition-all"
                      >
                        <Plus className="h-3 w-3" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-500 font-medium bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  🏷️ Add any features that describe your apartment — from amenities to nearby landmarks. These will appear on your listing so tenants know exactly what to expect.
                </p>
              </div>

              {/* ── Legitimacy & Verification ─────────────────────────────────── */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                  <ShieldCheck className="h-5 w-5 text-amber-600" />
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest">
                    Legitimacy &amp; Verification
                  </h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propertyName" className="text-slate-700 font-bold ml-1 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-amber-500" />
                    Property / Apartment Name
                  </Label>
                  <Input
                    id="propertyName"
                    value={verificationData.propertyName}
                    onChange={(e) => setVerificationData({ ...verificationData, propertyName: e.target.value })}
                    placeholder="e.g., Sunset Heights Apartment"
                    className="rounded-xl border-amber-100 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propertyAddress" className="text-slate-700 font-bold ml-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-amber-500" />
                    Complete Property Address
                  </Label>
                  <Input
                    id="propertyAddress"
                    value={verificationData.propertyAddress}
                    onChange={(e) => setVerificationData({ ...verificationData, propertyAddress: e.target.value })}
                    placeholder="Full address in La Paz, Iloilo City"
                    className="rounded-xl border-amber-100 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="businessPermit" className="text-slate-700 font-bold ml-1 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-amber-500" />
                      Business Permit #
                    </Label>
                    <Input
                      id="businessPermit"
                      value={verificationData.businessPermit}
                      onChange={(e) => setVerificationData({ ...verificationData, businessPermit: e.target.value })}
                      placeholder="B-2024-XXXXX"
                      className="rounded-xl border-amber-100 focus:ring-amber-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tinNumber" className="text-slate-700 font-bold ml-1">TIN Number (Tax ID)</Label>
                    <Input
                      id="tinNumber"
                      value={verificationData.tinNumber}
                      onChange={(e) => setVerificationData({ ...verificationData, tinNumber: e.target.value })}
                      placeholder="XXX-XXX-XXX-XXX"
                      className="rounded-xl border-amber-100 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="idType" className="text-slate-700 font-bold ml-1">Valid ID Type</Label>
                    <select
                      id="idType"
                      value={verificationData.idType}
                      onChange={(e) => setVerificationData({ ...verificationData, idType: e.target.value })}
                      className="w-full h-10 rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="" disabled>Select ID Type</option>
                      {VALID_ID_TYPES.map((id) => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idNumber" className="text-slate-700 font-bold ml-1">ID Number</Label>
                    <Input
                      id="idNumber"
                      value={verificationData.idNumber}
                      onChange={(e) => setVerificationData({ ...verificationData, idNumber: e.target.value })}
                      placeholder="Enter ID number"
                      className="rounded-xl border-amber-100 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-500 font-medium bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  🔒 Your verification details are kept confidential and used solely to validate your listing. A "Verified Landlord" badge will appear once documents are reviewed.
                </p>
              </div>

              {/* Hidden canvas for camera capture */}
              <canvas ref={canvasRef} className="hidden" />

              <div className="flex gap-4 pt-6">
                <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1 rounded-2xl">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  List Property <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
