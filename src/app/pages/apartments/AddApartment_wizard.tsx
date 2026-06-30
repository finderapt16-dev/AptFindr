import { useState, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  apartmentFormValuesFromApartment,
  createApartment,
  insertApartmentImages,
  insertApartmentRooms,
  resolveAppUserId,
  uploadApartmentImage,
  type Apartment,
  type ApartmentStatus,
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
  Home, Trash2, Check,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { toast } from "sonner";

// ── Room type ─────────────────────────────────────────────────────────────────
type Room = {
  id: string;
  roomName: string;              // Room number or name (e.g., "Room 101", "Unit A")
  type: string;
  sqft: number;
  maxOccupants?: number;
  rent?: number;
  hasPrivateBath: boolean;
  bathroomType: string;        // "en-suite" | "separate" | ""
  sharedBathLocation: string;
  status: ApartmentStatus;
  isOccupied: boolean;
  hasAC: boolean;
  description: string;           // Room description
  images: string[];              // Room images (URLs or data URLs)
}; 

const ROOM_TYPES = ["Bedroom", "Studio", "Shared room", "Suite", "Loft", "Other"];
const STATUS_OPTIONS: { value: ApartmentStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "maintenance", label: "Under Maintenance" },
];

const makeRoom = (): Room => ({
  id: Date.now().toString() + Math.random(),
  roomName: "",
  type: "Bedroom",
  sqft: 150,
  maxOccupants: undefined,
  rent: undefined,
  hasPrivateBath: false,
  bathroomType: "",
  sharedBathLocation: "",
  status: "available",
  isOccupied: false,
  hasAC: false,
  description: "",
  images: [],
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

  // ── Wizard State ───────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  const stepConfig = [
    { number: 1, title: "Property Information", description: "Photo, title, and basic details" },
    { number: 2, title: "Location", description: "Address and map location" },
    { number: 3, title: "Rooms", description: "Room details and amenities" },
    { number: 4, title: "Amenities & Features", description: "Utilities and additional features" },
    { number: 5, title: "Verification", description: "Business permit and ID information" },
  ];
  // ─────────────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState<Partial<Apartment>>({
    title: "",
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
    status: "available",
  });
  const [locationLookupRequest, setLocationLookupRequest] = useState(0);

  // ── Rooms state ───────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<Room[]>([makeRoom()]);

  const updateRoom = (id: string, patch: Partial<Room>) =>
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRoom = (id: string) =>
    setRooms((prev) => prev.filter((r) => r.id !== id));
  // ─────────────────────────────────────────────────────────────────────

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageFile, setUploadedImageFile] = useState<File | Blob | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState("apartment-image.jpg");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [amenitiesInput, setAmenitiesInput] = useState("");
  const [utilitiesInput, setUtilitiesInput] = useState("");

  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // ── Step validation ────────────────────────────────────────────────────
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.title && formData.price && formData.sqft && formData.description);
      case 2:
        return !!(formData.address);
      case 3:
        return rooms.length > 0 && rooms.every((r) => r.roomName && r.sqft > 0 && Number(r.rent) > 0);
      case 4:
        return true; // Optional fields
      case 5:
        return true; // Optional fields for now
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      toast.error("Please fill in all required fields for this step");
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  // ─────────────────────────────────────────────────────────────────────

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image size must be less than 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setUploadedImageFile(file);
      setUploadedImageName(file.name);
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
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            setUploadedImageFile(blob);
            setUploadedImageName(`camera-${Date.now()}.jpg`);
          }
        }, "image/jpeg");
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
    setUploadedImageFile(null);
    setUploadedImageName("apartment-image.jpg");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate submissions while async operation is in flight
    if (isSubmitting) {
      toast.error("Please wait for your submission to complete...");
      return;
    }
    
    if (!user || user.role !== "landlord") { toast.error("Only landlords can add apartments"); return; }
    if (!user.id) { toast.error("User ID is missing. Please log in again."); return; }

    setIsSubmitting(true);
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
      status: formData.status ?? "available",
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

      const storedImages = uploadedImageFile
        ? [await uploadApartmentImage(created.id, uploadedImageFile, uploadedImageName)]
        : imageList;

      if (storedImages.length > 0) {
        await insertApartmentImages(created.id, storedImages);
      }

      await insertApartmentRooms(
        created.id,
        rooms.map((room) => ({
          id: room.id,
          name: room.roomName || room.type,
          sqft: room.sqft,
          maxOccupants: Number(room.maxOccupants),
          price: Number(room.rent),
          hasPrivateBath: room.hasPrivateBath,
          bathroomType: room.bathroomType,
          sharedBathLocation: room.sharedBathLocation,
          hasAC: room.hasAC,
          isOccupied: room.isOccupied,
          status: room.status,
          description: room.description,
        })),
      );

      const appUsers = await fetchAppUsers();
      const admins = appUsers.filter((entry) => entry.role === "admin" && entry.id);

      await Promise.all(admins.map((admin) => createNotification({
        user_id: admin.id!,
        type: "landlord_property_submission",
        title: "New landlord property submitted",
        message: `${user.name} added "${created.title}" at ${created.address}, ${created.city}.`,
        payload: {
          apartment_id: created.id,
          apartmentId: created.id,
          landlord_id: created.landlordId ?? resolvedLandlordId,
          landlordId: created.landlordId ?? resolvedLandlordId,
          action: "property_submission",
        },
      })));

      await refreshApartments();
      toast.success("Apartment added successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to submit apartment:", error);
      const message = error instanceof Error ? error.message : "Unable to save apartment.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived room stats ────────────────────────────────────────────────────
  const totalRooms     = rooms.length;
  const availableRooms = rooms.filter((r) => r.status === "available").length;
  const maintenanceRooms = rooms.filter((r) => r.status === "maintenance").length;
  const withBathRooms  = rooms.filter((r) => r.hasPrivateBath).length;

  if (user?.role !== "landlord") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 pb-20 relative overflow-hidden">
      <div className="absolute top-20 right-0 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 py-8 relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-slate-600 hover:text-amber-600 font-bold"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-8">
          <div className="inline-block mb-3 px-4 py-1.5 bg-white/70 backdrop-blur-md border border-amber-200/50 rounded-full">
            <span className="text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2 uppercase">
              <Sparkles className="h-3.5 w-3.5" /> Management
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            List Your <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Apartment</span>
          </h1>
          <p className="text-slate-600 font-medium">Step {currentStep} of {totalSteps}</p>
        </div>

        {!user?.isVerified && (
          <Alert className="mb-8 max-w-4xl mx-auto border-amber-200 bg-white/80 rounded-2xl">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-900">Verification Pending</AlertTitle>
            <AlertDescription className="text-slate-600">
              You can save and manage this property now. Tenants will only see it after an admin verifies your landlord account.
            </AlertDescription>
          </Alert>
        )}

        <div className="max-w-4xl mx-auto mb-10">
          <div className="flex items-center justify-between">
            {stepConfig.map((step, idx) => (
              <div key={step.number} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    currentStep >= step.number
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {currentStep > step.number ? <Check className="h-5 w-5" /> : step.number}
                </div>
                {idx < stepConfig.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                      currentStep > step.number
                        ? "bg-gradient-to-r from-amber-500 to-orange-500"
                        : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {stepConfig.map((step) => (
              <div key={step.number} className="text-center">
                <p
                  className={`text-xs font-bold uppercase ${
                    currentStep === step.number
                      ? "text-amber-600"
                      : currentStep > step.number
                      ? "text-slate-500"
                      : "text-slate-400"
                  }`}
                >
                  {step.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Card className="max-w-4xl mx-auto border-amber-100/50 shadow-2xl bg-white/90 rounded-3xl">
          <CardHeader className="pb-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
            <CardTitle className="text-2xl">{stepConfig[currentStep - 1].title}</CardTitle>
            <CardDescription>{stepConfig[currentStep - 1].description}</CardDescription>
          </CardHeader>

          <CardContent className="pt-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* ──────── STEP 1: Property Information ──────── */}
              {currentStep === 1 && (
                <>
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                      <Camera className="h-5 w-5 text-amber-600" />
                      <h3 className="text-sm font-bold text-amber-600 uppercase">Property Photo</h3>
                    </div>

                    {uploadedImage && (
                      <div className="relative rounded-2xl border-2 border-amber-200">
                        <img src={uploadedImage} alt="Apartment" className="w-full h-64 object-cover rounded-2xl" />
                        <button
                          type="button"
                          onClick={clearImage}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full"
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
                            className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-amber-300 rounded-2xl hover:bg-amber-50 bg-white"
                          >
                            <Camera className="h-6 w-6 text-amber-600" />
                            <div className="text-left">
                              <p className="font-bold">Take a Photo</p>
                              <p className="text-sm text-slate-600">Use device camera</p>
                            </div>
                          </button>
                        )}

                        {isCameraActive && (
                          <div className="space-y-4">
                            <video ref={videoRef} autoPlay playsInline className="w-full rounded-2xl border-2 border-amber-200" />
                            <div className="flex gap-3">
                              <Button type="button" onClick={capturePhoto} className="flex-1 bg-green-500">
                                <Camera className="h-4 w-4 mr-2" /> Capture
                              </Button>
                              <Button type="button" onClick={stopCamera} variant="outline" className="flex-1">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-amber-300 rounded-2xl hover:bg-amber-50 bg-white"
                        >
                          <Upload className="h-6 w-6 text-amber-600" />
                          <div className="text-left">
                            <p className="font-bold">Upload Photo</p>
                            <p className="text-sm text-slate-600">Browse from device</p>
                          </div>
                        </button>

                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                      <Building2 className="h-5 w-5 text-amber-600" />
                      <h3 className="text-sm font-bold text-amber-600 uppercase">Basic Information</h3>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">Property Title *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., Modern Loft"
                        required
                        className="rounded-xl border-amber-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-slate-700 font-bold">Monthly Rent (₱) *</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={formData.price || ""}
                          onChange={(e) => setFormData({
                            ...formData,
                            price: e.target.value === "" ? undefined : Number(e.target.value),
                          })}
                          required
                          className="hide-number-spinners rounded-xl border-amber-100"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-slate-700 font-bold">Total Area (sqft) *</Label>
                        <Input
                          type="number"
                          value={formData.sqft || ""}
                          onChange={(e) => setFormData({ ...formData, sqft: Number(e.target.value) })}
                          required
                          className="hide-number-spinners rounded-xl border-amber-100"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">Description *</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        required
                        placeholder="Describe your property..."
                        className="rounded-xl border-amber-100 resize-none"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">Occupancy Status</Label>
                      <select
                        value={formData.status ?? "available"}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as ApartmentStatus })}
                        className="w-full h-11 rounded-xl border border-amber-100 bg-white px-3 text-sm"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* ──────── STEP 2: Location ──────── */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                    <MapPin className="h-5 w-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-amber-600 uppercase">Location Details</h3>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-slate-700 font-bold">Street Address *</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      onBlur={() => setLocationLookupRequest((request) => request + 1)}
                      placeholder="House number, street, subdivision"
                      required
                      className="rounded-xl border-amber-100"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">City</Label>
                      <Input value={formData.city} readOnly className="bg-slate-50 rounded-xl" />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">Province</Label>
                      <Input value={formData.state} readOnly className="bg-slate-50 rounded-xl" />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">ZIP Code</Label>
                      <Input value={formData.zip} readOnly className="bg-slate-50 rounded-xl" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-slate-700 font-bold">Map Location</Label>
                    <p className="text-xs text-slate-500">Drag the marker to set location</p>
                    <div className="rounded-2xl border border-amber-100 h-80">
                      <LocationPicker
                        lat={formData.lat ?? 0}
                        lng={formData.lng ?? 0}
                        addressQuery={[formData.address, formData.city, formData.state, formData.zip, "Philippines"].filter(Boolean).join(", ")}
                        geocodeRequestKey={locationLookupRequest}
                        onLocationChange={(lat, lng) => setFormData((current) => ({ ...current, lat, lng }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ──────── STEP 3: Rooms ──────── */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                    <Home className="h-5 w-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-amber-600 uppercase">Room Details</h3>
                  </div>

                  {rooms.map((room, index) => (
                    <div key={room.id} className="border border-amber-100 rounded-2xl p-5 bg-amber-50/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold bg-amber-100 rounded-full px-3 py-1">Room {index + 1}</span>
                        {rooms.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeRoom(room.id)}
                            className="text-red-500"
                          >
                            <Trash2 className="h-3.5" /> Remove
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase font-bold">Room Number/Name *</Label>
                          <Input
                            value={room.roomName}
                            onChange={(e) => updateRoom(room.id, { roomName: e.target.value })}
                            placeholder="e.g., Room 101"
                            required
                            className="rounded-xl border-amber-100"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase font-bold">Room Type</Label>
                          <select
                            value={room.type}
                            onChange={(e) => updateRoom(room.id, { type: e.target.value })}
                            className="w-full h-10 rounded-xl border border-amber-100 bg-white px-3 text-sm"
                          >
                            {ROOM_TYPES.map((t) => (
                              <option key={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold">Size (sqft)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={room.sqft || ""}
                          onChange={(e) => updateRoom(room.id, { sqft: Number(e.target.value) })}
                          className="hide-number-spinners rounded-xl border-amber-100"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase font-bold">Max Occupants</Label>
                          <Input
                            type="number"
                            min={1}
                            value={room.maxOccupants || ""}
                            onChange={(e) => updateRoom(room.id, {
                              maxOccupants: e.target.value === "" ? undefined : Number(e.target.value),
                            })}
                            className="hide-number-spinners rounded-xl border-amber-100"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase font-bold">Monthly Rent (₱)</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="any"
                            value={room.rent || ""}
                            onChange={(e) => updateRoom(room.id, {
                              rent: e.target.value === "" ? undefined : Number(e.target.value),
                            })}
                            className="hide-number-spinners rounded-xl border-amber-100"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 border border-amber-100 rounded-xl bg-white">
                        <div>
                          <p className="font-bold text-sm">Has private bathroom</p>
                          <p className="text-xs text-slate-400">En-suite or separate</p>
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
                        <div className="space-y-2 pl-3 border-l-2 border-amber-300">
                          <Label className="text-xs uppercase font-bold">Bathroom Type</Label>
                          <select
                            value={room.bathroomType}
                            onChange={(e) => updateRoom(room.id, { bathroomType: e.target.value })}
                            className="w-full h-10 rounded-xl border border-amber-100 bg-white px-3 text-sm"
                          >
                            <option value="en-suite">Private (en-suite)</option>
                            <option value="separate">Private (separate)</option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-2 pl-3 border-l-2 border-slate-200">
                          <p className="text-xs text-slate-400">Shares bathroom with other rooms</p>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase font-bold">Bathroom Location (optional)</Label>
                            <Input
                              placeholder="e.g 2nd floor hallway"
                              value={room.sharedBathLocation}
                              onChange={(e) => updateRoom(room.id, { sharedBathLocation: e.target.value })}
                              className="rounded-xl border-amber-100"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold">Room Status</Label>
                        <select
                          value={room.status}
                          onChange={(e) =>
                            updateRoom(room.id, {
                              status: e.target.value as ApartmentStatus,
                              isOccupied: e.target.value === "maintenance" ? false : room.isOccupied,
                            })
                          }
                          className="w-full h-10 rounded-xl border border-amber-100 bg-white px-3 text-sm"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold">Description (optional)</Label>
                        <Textarea
                          value={room.description}
                          onChange={(e) => updateRoom(room.id, { description: e.target.value })}
                          placeholder="Describe features..."
                          rows={3}
                          className="rounded-xl border-amber-100 resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 border border-amber-100 rounded-xl bg-white">
                        <span className="text-sm font-bold">Air conditioned</span>
                        <Switch checked={room.hasAC} onCheckedChange={(v) => updateRoom(room.id, { hasAC: v })} />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setRooms((prev) => [...prev, makeRoom()])}
                    className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-amber-300 rounded-2xl text-amber-700 font-bold text-sm hover:bg-amber-50"
                  >
                    <Plus className="h-4 w-4" /> Add Another Room
                  </button>

                  <div className="grid grid-cols-4 gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
                    {[
                      { label: "Total rooms", val: totalRooms },
                      { label: "Available", val: availableRooms },
                      { label: "Maintenance", val: maintenanceRooms },
                      { label: "With bath", val: withBathRooms },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <p className="text-2xl font-black text-amber-700">{val}</p>
                        <p className="text-xs text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ──────── STEP 4: Amenities & Features ──────── */}
              {currentStep === 4 && (
                <>
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                      <Building2 className="h-5 w-5 text-amber-600" />
                      <h3 className="text-sm font-bold text-amber-600 uppercase">Amenities</h3>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">Amenities (comma-separated)</Label>
                      <Textarea
                        value={amenitiesInput}
                        onChange={(e) => setAmenitiesInput(e.target.value)}
                        placeholder="e.g., Parking, WiFi, Gym, Pool"
                        rows={3}
                        className="rounded-xl border-amber-100 resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                      <Home className="h-5 w-5 text-amber-600" />
                      <h3 className="text-sm font-bold text-amber-600 uppercase">Utilities Included</h3>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">Included Utilities (comma-separated)</Label>
                      <Textarea
                        value={utilitiesInput}
                        onChange={(e) => setUtilitiesInput(e.target.value)}
                        placeholder="e.g., Water, Electricity, Internet"
                        rows={3}
                        className="rounded-xl border-amber-100 resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                      <ListChecks className="h-5 w-5 text-amber-600" />
                      <h3 className="text-sm font-bold text-amber-600 uppercase">Additional Features</h3>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={featureInput}
                        onChange={(e) => setFeatureInput(e.target.value)}
                        onKeyDown={handleFeatureKeyDown}
                        placeholder="Type feature and press Enter"
                        className="rounded-xl border-amber-100 flex-1"
                      />
                      <Button type="button" onClick={() => addFeature(featureInput)} className="bg-amber-500 rounded-xl px-4">
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
                            <button type="button" onClick={() => removeFeature(i)} className="hover:text-red-600">
                              <X className="h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase">Quick Add</p>
                      <div className="flex flex-wrap gap-2">
                        {SUGGESTED_FEATURES.filter(
                          (s) => !features.map((f) => f.toLowerCase()).includes(s.toLowerCase())
                        ).map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => addFeature(suggestion)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-200 text-slate-600 text-xs font-semibold rounded-full hover:bg-amber-50"
                          >
                            <Plus className="h-3" /> {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ──────── STEP 5: Verification ──────── */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                    <ShieldCheck className="h-5 w-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-amber-600 uppercase">Legitimacy & Verification</h3>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-slate-700 font-bold flex items-center gap-1.5">
                      <Building2 className="h-3.5" /> Property / Apartment Name
                    </Label>
                    <Input
                      value={verificationData.propertyName}
                      onChange={(e) => setVerificationData({ ...verificationData, propertyName: e.target.value })}
                      placeholder="e.g., Sunset Heights"
                      className="rounded-xl border-amber-100"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-slate-700 font-bold flex items-center gap-1.5">
                      <MapPin className="h-3.5" /> Complete Property Address
                    </Label>
                    <Input
                      value={verificationData.propertyAddress}
                      onChange={(e) => setVerificationData({ ...verificationData, propertyAddress: e.target.value })}
                      placeholder="Full address"
                      className="rounded-xl border-amber-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold flex items-center gap-1.5">
                        <FileText className="h-3.5" /> Business Permit #
                      </Label>
                      <Input
                        value={verificationData.businessPermit}
                        onChange={(e) => setVerificationData({ ...verificationData, businessPermit: e.target.value })}
                        placeholder="B-2024-XXXXX"
                        className="rounded-xl border-amber-100"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">TIN Number</Label>
                      <Input
                        value={verificationData.tinNumber}
                        onChange={(e) => setVerificationData({ ...verificationData, tinNumber: e.target.value })}
                        placeholder="XXX-XXX-XXX-XXX"
                        className="rounded-xl border-amber-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">Valid ID Type</Label>
                      <select
                        value={verificationData.idType}
                        onChange={(e) => setVerificationData({ ...verificationData, idType: e.target.value })}
                        className="w-full h-11 rounded-xl border border-amber-100 bg-white px-3 text-sm"
                      >
                        <option value="">Select ID Type</option>
                        {VALID_ID_TYPES.map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">ID Number</Label>
                      <Input
                        value={verificationData.idNumber}
                        onChange={(e) => setVerificationData({ ...verificationData, idNumber: e.target.value })}
                        placeholder="Enter ID number"
                        className="rounded-xl border-amber-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />

              <div className="flex gap-4 pt-10 border-t border-amber-100">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    className="flex-1 rounded-2xl h-12 font-bold"
                  >
                    <ArrowLeft className="h-5 mr-2" /> Previous
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="flex-1 rounded-2xl h-12 font-bold"
                  >
                    <ArrowLeft className="h-5 mr-2" /> Cancel
                  </Button>
                )}

                {currentStep < totalSteps ? (
                  <Button type="button" onClick={handleNextStep} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl h-12 font-bold">
                    Next <ArrowRight className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl h-12 font-bold">
                    <Check className="h-5 w-5" /> List Property
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
