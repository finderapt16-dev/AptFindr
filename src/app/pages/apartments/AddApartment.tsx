import { LocationPicker } from "@/app/components/common/LocationPicker";
import { MultiImageUploader, type UploadedImage } from "@/app/components/common/MultiImageUploader";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { Textarea } from "@/app/components/ui/textarea";
import { useApartmentsContext } from "@/app/contexts/ApartmentsContext";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  apartmentFormValuesFromApartment,
  createApartment,
  createApartmentRoom,
  resolveAppUserId,
  updateApartmentRoom,
  uploadApartmentImage,
  uploadApartmentRoomImage,
  type Apartment,
  type ApartmentStatus,
} from "@/app/data/apartments";
import {
  VERIFICATION_DOCUMENT_TYPES,
  uploadVerificationDocuments,
  validateVerificationFile,
  type PendingVerificationDocument,
  type VerificationDocumentType,
} from "@/app/services/verificationDocumentsService";
import { supabase } from "@/lib/supabaseclient";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  Check,
  Cloud, CloudUpload,
  FileText,
  Home,
  ListChecks,
  MapPin,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
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

type PropertyDraft = {
  version: 1;
  savedAt: string;
  currentStep: number;
  formData: Partial<Apartment>;
  rooms: Room[];
  amenitiesInput: string;
  utilitiesInput: string;
  features: string[];
  featureInput: string;
  verificationData: {
    propertyName: string;
    propertyAddress: string;
    businessPermit: string;
    tinNumber: string;
    idType: string;
    idNumber: string;
  };
  uploadedImages: UploadedImage[];
  requiresImageReupload: boolean;
};

type DraftStatus = "idle" | "saving" | "saved" | "restored" | "error";

const getDraftStorageKey = (userId: string) => `rentiloilo:add-property-draft:${userId}`;

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

const INITIAL_FORM_DATA: Partial<Apartment> = {
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
  image: "",
  images: [],
  amenities: [],
  utilities: false,
  status: "available",
};

const INITIAL_VERIFICATION_DATA = {
  propertyName: "",
  propertyAddress: "",
  businessPermit: "",
  tinNumber: "",
  idType: "",
  idNumber: "",
};

export function AddApartment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshApartments } = useApartmentsContext();

  // ── Wizard State ───────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const totalSteps = 4;

  const stepConfig = [
    { number: 1, title: "Property Information", description: "Photos, title, and basic details" },
    { number: 2, title: "Verification", description: "Permit details and supporting documents" },
    { number: 3, title: "Location", description: "Address and map location" },
    { number: 4, title: "Amenities & Features", description: "Utilities and additional features" },
  ];
  // ─────────────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState<Partial<Apartment>>({ ...INITIAL_FORM_DATA });
  const [locationLookupRequest, setLocationLookupRequest] = useState(0);

  // ── Rooms state ───────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<Room[]>([makeRoom()]);

  const updateRoom = (id: string, patch: Partial<Room>) =>
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRoom = (id: string) =>
    setRooms((prev) => prev.filter((r) => r.id !== id));
  // ─────────────────────────────────────────────────────────────────────

  // ── Multiple Images State ──────────────────────────────────────────────
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  // ─────────────────────────────────────────────────────────────────────

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
    setValidationErrors((previous) => {
      if (!previous.features) return previous;
      const next = { ...previous };
      delete next.features;
      return next;
    });
  };

  const removeFeature = (index: number) =>
    setFeatures((prev) => prev.filter((_, i) => i !== index));

  const handleFeatureKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addFeature(featureInput);
    }
  };

  const [verificationData, setVerificationData] = useState({ ...INITIAL_VERIFICATION_DATA });
  const [verificationDocuments, setVerificationDocuments] = useState<PendingVerificationDocument[]>([]);
  const [pendingDraft, setPendingDraft] = useState<PropertyDraft | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("idle");
  const [draftReady, setDraftReady] = useState(false);
  const [imageReuploadRequired, setImageReuploadRequired] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutoSaveRef = useRef(false);
  const submissionCompleteRef = useRef(false);

  const selectVerificationDocument = (type: VerificationDocumentType, file?: File) => {
    if (!file) return;
    const error = validateVerificationFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setVerificationDocuments((current) => {
      const previous = current.find((document) => document.type === type);
      if (previous?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(previous.previewUrl);
      return [
        ...current.filter((document) => document.type !== type),
        { type, file, previewUrl: URL.createObjectURL(file) },
      ];
    });
  };

  const removePendingVerificationDocument = (type: VerificationDocumentType) => {
    setVerificationDocuments((current) => {
      const document = current.find((item) => item.type === type);
      if (document?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(document.previewUrl);
      return current.filter((item) => item.type !== type);
    });
  };

  const hasDraftContent = useMemo(() => {
    const roomHasContent = rooms.length > 1 || rooms.some((room) =>
      Boolean(
        room.roomName.trim()
        || room.description.trim()
        || Number(room.rent) > 0
        || room.images.length > 0
        || room.hasPrivateBath
        || room.hasAC
        || room.status !== "available"
        || room.type !== "Bedroom"
        || room.sqft !== 150
        || (Number(room.maxOccupants) > 0 && Number(room.maxOccupants) !== 1),
      ),
    );
    const verificationHasContent = Object.values(verificationData).some((value) => value.trim().length > 0);

    return Boolean(
      String(formData.title ?? "").trim()
      || String(formData.description ?? "").trim()
      || String(formData.address ?? "").trim()
      || amenitiesInput.trim()
      || utilitiesInput.trim()
      || features.length > 0
      || featureInput.trim()
      || uploadedImages.length > 0
      || verificationDocuments.length > 0
      || roomHasContent
      || verificationHasContent
      || currentStep > 1,
    );
  }, [amenitiesInput, currentStep, featureInput, features, formData, rooms, uploadedImages, utilitiesInput, verificationData, verificationDocuments]);

  const resetDraftForm = () => {
    setCurrentStep(1);
    setFormData({ ...INITIAL_FORM_DATA });
    setRooms([makeRoom()]);
    setUploadedImages([]);
    setAmenitiesInput("");
    setUtilitiesInput("");
    setFeatures([]);
    setFeatureInput("");
    setVerificationData({ ...INITIAL_VERIFICATION_DATA });
    setVerificationDocuments((current) => {
      current.forEach((document) => {
        if (document.previewUrl.startsWith("blob:")) URL.revokeObjectURL(document.previewUrl);
      });
      return [];
    });
    setValidationErrors({});
    setImageReuploadRequired(false);
  };

  const discardDraft = (resetForm = true) => {
    if (user?.id) localStorage.removeItem(getDraftStorageKey(user.id));
    setPendingDraft(null);
    setDraftReady(true);
    setDraftStatus("idle");
    if (resetForm) resetDraftForm();
  };

  const continueDraft = () => {
    if (!pendingDraft) return;
    skipNextAutoSaveRef.current = true;
    setCurrentStep(Math.min(totalSteps, Math.max(1, pendingDraft.currentStep || 1)));
    setFormData({ ...INITIAL_FORM_DATA, ...pendingDraft.formData, image: "", images: [] });
    setRooms(pendingDraft.rooms.length > 0 ? pendingDraft.rooms : [makeRoom()]);
    setUploadedImages(pendingDraft.uploadedImages ?? []);
    setAmenitiesInput(pendingDraft.amenitiesInput ?? "");
    setUtilitiesInput(pendingDraft.utilitiesInput ?? "");
    setFeatures(pendingDraft.features ?? []);
    setFeatureInput(pendingDraft.featureInput ?? "");
    setVerificationData({ ...INITIAL_VERIFICATION_DATA, ...pendingDraft.verificationData });
    setImageReuploadRequired(Boolean(pendingDraft.requiresImageReupload));
    setPendingDraft(null);
    setDraftReady(true);
    setDraftStatus("restored");
    toast.success("Property draft restored");
  };

  useEffect(() => {
    if (!user?.id) return;
    setDraftReady(false);
    setPendingDraft(null);
    try {
      const savedDraft = localStorage.getItem(getDraftStorageKey(user.id));
      if (!savedDraft) {
        setDraftReady(true);
        return;
      }
      const parsed = JSON.parse(savedDraft) as PropertyDraft;
      if (parsed.version !== 1 || !parsed.savedAt) {
        localStorage.removeItem(getDraftStorageKey(user.id));
        setDraftReady(true);
        return;
      }
      setPendingDraft(parsed);
    } catch (error) {
      console.error("Unable to read the Add Property draft:", error);
      localStorage.removeItem(getDraftStorageKey(user.id));
      setDraftReady(true);
    }
  }, [user?.id]);

  const persistDraft = useCallback((updateStatus = true) => {
    if (!user?.id || !hasDraftContent || submissionCompleteRef.current) return;
    const persistentImages = uploadedImages
      .filter((image) => !image.file && /^https?:\/\//i.test(image.url))
      .map((image) => ({ ...image, file: undefined }));
    const hasLocalPropertyImages = uploadedImages.some((image) => Boolean(image.file) || /^(data:|blob:)/i.test(image.url));
    const safeRooms = rooms.map((room) => ({
      ...room,
      images: room.images.filter((image) => /^https?:\/\//i.test(image)),
    }));
    const hasLocalRoomImages = rooms.some((room) => room.images.some((image) => !/^https?:\/\//i.test(image)));
    const { image: _image, images: _images, ...safeFormData } = formData;
    const draft: PropertyDraft = {
      version: 1,
      savedAt: new Date().toISOString(),
      currentStep,
      formData: safeFormData,
      rooms: safeRooms,
      amenitiesInput,
      utilitiesInput,
      features,
      featureInput,
      verificationData,
      uploadedImages: persistentImages,
      requiresImageReupload: hasLocalPropertyImages || hasLocalRoomImages || imageReuploadRequired,
    };

    try {
      localStorage.setItem(getDraftStorageKey(user.id), JSON.stringify(draft));
      if (updateStatus) setDraftStatus("saved");
    } catch (error) {
      console.error("Unable to save the Add Property draft:", error);
      if (updateStatus) setDraftStatus("error");
    }
  }, [amenitiesInput, currentStep, featureInput, features, formData, hasDraftContent, imageReuploadRequired, rooms, uploadedImages, user?.id, utilitiesInput, verificationData]);

  useEffect(() => {
    if (!draftReady || !user?.id || submissionCompleteRef.current) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (!hasDraftContent) {
      localStorage.removeItem(getDraftStorageKey(user.id));
      setDraftStatus("idle");
      return;
    }

    setDraftStatus("saving");
    autoSaveTimerRef.current = setTimeout(() => persistDraft(), 700);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [draftReady, hasDraftContent, persistDraft, user?.id]);

  const fieldClass = (field: string) => validationErrors[field]
    ? "rounded-xl border-red-400 focus-visible:border-red-500 focus-visible:ring-red-100"
    : "rounded-xl border-slate-200 focus-visible:border-amber-500 focus-visible:ring-amber-100";

  const clearValidationError = (field: string) => {
    setValidationErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const FieldError = ({ field }: { field: string }) =>
    validationErrors[field] ? <p className="text-xs font-bold text-red-600">{validationErrors[field]}</p> : null;

  const getSubmittedAmenities = () =>
    amenitiesInput.split(",").map((amenity) => amenity.trim()).filter(Boolean);

  const getSubmittedFeatures = () => {
    const submittedFeatures = featureInput.trim() ? [...features, featureInput.trim()] : features;
    return submittedFeatures.filter((feature, index, list) =>
      list.findIndex((item) => item.toLowerCase() === feature.toLowerCase()) === index,
    );
  };

  const validateAllFields = (): { isValid: boolean; errors: Record<string, string>; firstStep: number } => {
    const errors: Record<string, string> = {};

    if (!String(formData.title ?? "").trim()) errors.title = "Property title is required.";
    if (!Number(formData.sqft)) errors.sqft = "Total property area is required.";
    if (!String(formData.description ?? "").trim()) errors.description = "Property description is required.";
    if (uploadedImages.length === 0) errors.images = "Upload at least one property image.";

    if (!String(formData.address ?? "").trim()) errors.address = "Complete address is required.";
    if (!Number.isFinite(Number(formData.lat)) || !Number.isFinite(Number(formData.lng))) {
      errors.mapLocation = "Map location is required.";
    }

    if (!String(verificationData.businessPermit).trim()) errors.businessPermit = "Business permit number is required.";

    if (getSubmittedAmenities().length === 0) {
      errors.amenities = "Please select at least one amenity before submitting your property.";
    }
    if (getSubmittedFeatures().length === 0) {
      errors.features = "Please add at least one feature before submitting your property.";
    }

    const firstStep = errors.title || errors.sqft || errors.description || errors.images
      ? 1
      : errors.businessPermit
        ? 2
        : errors.address || errors.mapLocation
          ? 3
          : errors.amenities || errors.features
            ? 4
            : currentStep;

    return { isValid: Object.keys(errors).length === 0, errors, firstStep };
  };

  // ── Step validation ────────────────────────────────────────────────────
  const validateStep = (step: number): boolean => {
    const { errors } = validateAllFields();
    const belongsToStep = (field: string) => {
      if (step === 1) return ["title", "sqft", "description", "images"].includes(field);
      if (step === 2) return field === "businessPermit";
      if (step === 3) return ["address", "mapLocation"].includes(field);
      if (step === 4) return ["amenities", "features"].includes(field);
      return false;
    };
    const stepErrors = Object.fromEntries(Object.entries(errors).filter(([field]) => belongsToStep(field)));
    setValidationErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === currentStep || isSubmitting) return;

    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    for (let step = currentStep; step < targetStep; step += 1) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        toast.error(`Complete ${stepConfig[step - 1].title} before continuing.`);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    setCurrentStep(targetStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      if (currentStep === 1 && uploadedImages.length === 0) {
        toast.error("Please upload at least one property image");
      } else {
        toast.error("Please fill in all required fields for this step");
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate submissions while async operation is in flight
    if (isSubmitting) {
      toast.error("Please wait for your submission to complete...");
      return;
    }
    
    if (!user || user.role !== "landlord") {
      toast.error("Only landlords can add apartments");
      return;
    }
    if (!user.id) {
      toast.error("User ID is missing. Please log in again.");
      return;
    }

    if (uploadedImages.length === 0) {
      toast.error("Please upload at least one property image");
      return;
    }

    const validation = validateAllFields();
    setValidationErrors(validation.errors);
    if (!validation.isValid) {
      setCurrentStep(validation.firstStep);
      toast.error("Please complete all required fields before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const submittedAmenities = getSubmittedAmenities();
    const submittedFeatures = getSubmittedFeatures();
    const featureLower = submittedFeatures.map((f) => f.toLowerCase());
    const utilityItems = utilitiesInput.split(",").map((u) => u.trim()).filter(Boolean);

    // Get primary image or use first image
    const primaryImageUrl = uploadedImages.find((img) => img.isPrimary)?.url || uploadedImages[0].url;

    const draftApartment: Apartment = {
      id: "",
      title: formData.title || "",
      price: 0,
      bedrooms: 0,
      bathrooms: 0,
      sqft: Number(formData.sqft) || 500,
      address: formData.address || "",
      city: formData.city || "La Paz",
      state: formData.state || "Iloilo City",
      zip: formData.zip || "5000",
      image: primaryImageUrl,
      images: uploadedImages.map((img) => img.url),
      description: formData.description || "",
      amenities: submittedAmenities,
      availableDate: formData.availableDate || new Date().toISOString().split("T")[0],
      petFriendly: featureLower.includes("pet friendly"),
      parking: featureLower.includes("parking"),
      furnished: featureLower.includes("furnished"),
      utilities: utilityItems,
      lat: Number(formData.lat) || 10.7202,
      lng: Number(formData.lng) || 122.5621,
      landlordId: user.id,
      isPublished: false,
      status: formData.status ?? "available",
    };

    setIsSubmitting(true);
    try {
      const formValues = {
        ...apartmentFormValuesFromApartment(draftApartment),
        utilityItems,
        customFeatures: submittedFeatures,
        verification: {
          propertyName: verificationData.propertyName || formData.title || "",
          propertyAddress: verificationData.propertyAddress || formData.address || "",
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
      const { error: profileSyncError } = await supabase.from("landlord_profiles").upsert({
        user_id: resolvedLandlordId,
        permit_number: verificationData.businessPermit.trim(),
        business_permit_number: verificationData.businessPermit.trim(),
        tin_number: verificationData.tinNumber.trim() || null,
        id_type: verificationData.idType || null,
        id_number: verificationData.idNumber.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (profileSyncError) throw new Error(profileSyncError.message || "Unable to synchronize verification details.");
      const { error: userPermitError } = await supabase.from("app_users").update({
        permit_number: verificationData.businessPermit.trim(),
        updated_at: new Date().toISOString(),
      }).eq("id", resolvedLandlordId);
      if (userPermitError) throw new Error(userPermitError.message || "Unable to synchronize the permit number.");

      // Upload all images and collect their URLs
      const uploadedImageUrls: string[] = [];
      for (let i = 0; i < uploadedImages.length; i++) {
        const img = uploadedImages[i];
        if (img.file) {
          const url = await uploadApartmentImage(created.id, img.file, `apartment-image-${i}.jpg`);
          uploadedImageUrls.push(url);
        } else {
          // If it's a data URL (from camera), convert and upload
          if (img.url.startsWith("data:")) {
            // Extract base64 data from data URL
            const base64 = img.url.split(",")[1];
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let j = 0; j < binaryString.length; j++) {
              bytes[j] = binaryString.charCodeAt(j);
            }
            const blob = new Blob([bytes], { type: "image/jpeg" });
            const url = await uploadApartmentImage(created.id, blob, `apartment-image-${i}.jpg`);
            uploadedImageUrls.push(url);
          }
        }
      }

      if (uploadedImageUrls.length > 0) {
        // Insert with primary flag
        const imagesToInsert = uploadedImageUrls.map((url, idx) => {
          const originalImg = uploadedImages[idx];
          return {
            url,
            is_primary: originalImg.isPrimary || idx === 0,
            sort_order: idx,
          };
        });
        // Insert directly into database with proper structure
        const insertPayload = imagesToInsert.map((img) => ({
          apartment_id: created.id,
          url: img.url,
          is_primary: img.is_primary,
          sort_order: img.sort_order,
        }));
        await supabase.from("apartment_images").insert(insertPayload);
      }

      for (const room of rooms) {
        const createdRoom = await createApartmentRoom(created.id, {
          name: room.roomName,
          type: room.type,
          sqft: room.sqft,
          maxOccupants: room.maxOccupants,
          price: room.rent,
          hasPrivateBath: room.hasPrivateBath,
          bathroomType: room.bathroomType,
          sharedBathLocation: room.sharedBathLocation,
          status: room.status,
          isOccupied: room.status === "occupied",
          hasAC: room.hasAC,
          description: room.description,
          images: [],
        }, resolvedLandlordId);

        if (createdRoom.id && room.images.length > 0) {
          const roomImageUrls: string[] = [];
          for (let imageIndex = 0; imageIndex < room.images.length; imageIndex += 1) {
            const source = room.images[imageIndex];
            if (/^https?:\/\//i.test(source)) {
              roomImageUrls.push(source);
              continue;
            }
            const blob = await (await fetch(source)).blob();
            const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
            roomImageUrls.push(await uploadApartmentRoomImage(created.id, createdRoom.id, blob, `room-image-${imageIndex}.${extension}`));
          }
          await updateApartmentRoom(created.id, createdRoom.id, { ...createdRoom, images: roomImageUrls }, resolvedLandlordId);
        }
      }

      await uploadVerificationDocuments(created.id, resolvedLandlordId, verificationDocuments);

      await refreshApartments();
      submissionCompleteRef.current = true;
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      localStorage.removeItem(getDraftStorageKey(user.id));
      setDraftStatus("idle");
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
          <div className="mt-3 flex min-h-8 flex-wrap items-center justify-center gap-2">
            {draftStatus !== "idle" && (
              <span className={`inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs font-bold shadow-sm ${
                draftStatus === "error" ? "border-red-200 text-red-600" : "border-amber-200 text-amber-700"
              }`}>
                {draftStatus === "saving" ? <Cloud className="h-3.5 w-3.5 animate-pulse" /> : <CloudUpload className="h-3.5 w-3.5" />}
                {draftStatus === "saving" && "Saving..."}
                {draftStatus === "saved" && "Draft saved"}
                {draftStatus === "restored" && "Restored from draft"}
                {draftStatus === "error" && "Draft could not be saved"}
              </span>
            )}
            {hasDraftContent && draftReady && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Discard this property draft and clear all entered details?")) discardDraft(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-red-600"
              >
                <RotateCcw className="h-3.5 w-3.5" />Discard Draft
              </button>
            )}
          </div>
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
                <button
                  type="button"
                  onClick={() => handleStepClick(step.number)}
                  disabled={isSubmitting}
                  aria-label={`Go to step ${step.number}: ${step.title}`}
                  aria-current={currentStep === step.number ? "step" : undefined}
                  className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60 hover:scale-105 ${
                    currentStep >= step.number
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {currentStep > step.number ? <Check className="h-5 w-5" /> : step.number}
                </button>
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
              <button
                key={step.number}
                type="button"
                onClick={() => handleStepClick(step.number)}
                disabled={isSubmitting}
                aria-label={`Go to ${step.title}`}
                className={`rounded-md px-1 py-1 text-center text-xs font-bold uppercase transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 disabled:cursor-not-allowed disabled:opacity-60 ${
                    currentStep === step.number
                      ? "text-amber-600"
                      : currentStep > step.number
                      ? "text-slate-500"
                      : "text-slate-400"
                  }`}
              >
                {step.title}
              </button>
            ))}
          </div>
        </div>

        <Card className="max-w-4xl mx-auto border-amber-100/50 shadow-2xl bg-white/90 rounded-3xl">
          <CardHeader className="pb-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
            <CardTitle className="text-2xl">{stepConfig[currentStep - 1].title}</CardTitle>
            <CardDescription>{stepConfig[currentStep - 1].description}</CardDescription>
          </CardHeader>

          <CardContent className="pt-10">
            <form onSubmit={handleSubmit} noValidate className="space-y-8">
              {/* ──────── STEP 1: Property Information ──────── */}
              {currentStep === 1 && (
                <>
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                      <Upload className="h-5 w-5 text-amber-600" />
                      <h3 className="text-sm font-bold text-amber-600 uppercase">Property Photos</h3>
                    </div>

                    <MultiImageUploader
                      images={uploadedImages}
                      onImagesChange={(images) => {
                        setUploadedImages(images);
                        if (images.length > 0) setImageReuploadRequired(false);
                        setValidationErrors((prev) => {
                          const next = { ...prev };
                          delete next.images;
                          return next;
                        });
                      }}
                      maxImages={10}
                      maxFileSize={5}
                    />
                    {imageReuploadRequired && (
                      <Alert className="rounded-lg border-amber-200 bg-amber-50">
                        <Upload className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="font-semibold text-amber-800">Please re-upload images before submitting.</AlertDescription>
                      </Alert>
                    )}
                    <FieldError field="images" />
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
                        onChange={(e) => {
                          setFormData({ ...formData, title: e.target.value });
                          if (e.target.value.trim()) clearValidationError("title");
                        }}
                        placeholder="e.g., Modern Loft"
                        required
                        aria-invalid={Boolean(validationErrors.title)}
                        className={fieldClass("title")}
                      />
                      <FieldError field="title" />
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-3">
                        <Label className="text-slate-700 font-bold">Total Property Area (sqft) *</Label>
                        <Input
                          type="number"
                          value={formData.sqft || ""}
                          onChange={(e) => {
                            setFormData({ ...formData, sqft: Number(e.target.value) });
                            if (Number(e.target.value) > 0) clearValidationError("sqft");
                          }}
                          required
                          aria-invalid={Boolean(validationErrors.sqft)}
                          className={`${fieldClass("sqft")} hide-number-spinners`}
                        />
                        <FieldError field="sqft" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">Description *</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => {
                          setFormData({ ...formData, description: e.target.value });
                          if (e.target.value.trim()) clearValidationError("description");
                        }}
                        rows={4}
                        required
                        aria-invalid={Boolean(validationErrors.description)}
                        placeholder="Describe your property..."
                        className={`${fieldClass("description")} resize-none`}
                      />
                      <FieldError field="description" />
                    </div>
                  </div>
                </>
              )}

              {/* ──────── STEP 3: Location ──────── */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                    <MapPin className="h-5 w-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-amber-600 uppercase">Location Details</h3>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-slate-700 font-bold">Street Address *</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => {
                        setFormData({ ...formData, address: e.target.value });
                        if (e.target.value.trim()) clearValidationError("address");
                      }}
                      onBlur={() => setLocationLookupRequest((request) => request + 1)}
                      placeholder="House number, street, subdivision"
                      required
                      aria-invalid={Boolean(validationErrors.address)}
                      className={fieldClass("address")}
                    />
                    <FieldError field="address" />
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
                    <div className="rounded-2xl border-2 border-amber-200 overflow-hidden bg-white shadow-sm" style={{ height: "500px" }}>
                      <LocationPicker
                        lat={formData.lat ?? 0}
                        lng={formData.lng ?? 0}
                        addressQuery={[formData.address, formData.city, formData.state, formData.zip, "Philippines"].filter(Boolean).join(", ")}
                        geocodeRequestKey={locationLookupRequest}
                        onLocationChange={(lat, lng) => setFormData((current) => ({ ...current, lat, lng }))}
                      />
                    </div>
                    <FieldError field="mapLocation" />
                  </div>
                </div>
              )}

              {/* Legacy room editor disabled; rooms are managed through Manage Rooms. */}
              {false && (
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
                            onChange={(e) => {
                              updateRoom(room.id, { roomName: e.target.value });
                              if (e.target.value.trim()) clearValidationError(`rooms.${index}.roomName`);
                            }}
                            placeholder="e.g., Room 101"
                            required
                            aria-invalid={Boolean(validationErrors[`rooms.${index}.roomName`])}
                            className={fieldClass(`rooms.${index}.roomName`)}
                          />
                          <FieldError field={`rooms.${index}.roomName`} />
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
                          <Label className="text-xs uppercase font-bold">Max Occupants *</Label>
                          <Input
                            type="number"
                            min={1}
                            value={room.maxOccupants || ""}
                            onChange={(e) => {
                              updateRoom(room.id, { maxOccupants: e.target.value === "" ? undefined : Number(e.target.value) });
                              if (Number(e.target.value) > 0) clearValidationError(`rooms.${index}.maxOccupants`);
                            }}
                            aria-invalid={Boolean(validationErrors[`rooms.${index}.maxOccupants`])}
                            className={`${fieldClass(`rooms.${index}.maxOccupants`)} hide-number-spinners`}
                          />
                          <FieldError field={`rooms.${index}.maxOccupants`} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase font-bold">Monthly Rent (₱) *</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="any"
                            value={room.rent || ""}
                            onChange={(e) => {
                              updateRoom(room.id, { rent: e.target.value === "" ? undefined : Number(e.target.value) });
                              if (Number(e.target.value) > 0) clearValidationError(`rooms.${index}.rent`);
                            }}
                            aria-invalid={Boolean(validationErrors[`rooms.${index}.rent`])}
                            className={`${fieldClass(`rooms.${index}.rent`)} hide-number-spinners`}
                          />
                          <FieldError field={`rooms.${index}.rent`} />
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
                          className={`w-full h-10 rounded-xl border bg-white px-3 text-sm ${
                            validationErrors[`rooms.${index}.status`] ? "border-red-300 focus:ring-red-400" : "border-amber-100"
                          }`}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <FieldError field={`rooms.${index}.status`} />
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

                      <div className="space-y-3 border-t border-amber-100 pt-4">
                        <div><Label className="text-xs font-bold uppercase">Room Images</Label><p className="mt-1 text-xs text-slate-500">Upload, take photos, reorder thumbnails, and select the room cover image.</p></div>
                        <MultiImageUploader
                          images={room.images.map((url, imageIndex) => ({ id: `${room.id}-image-${imageIndex}`, url, isPrimary: imageIndex === 0, sortOrder: imageIndex }))}
                          onImagesChange={(nextImages) => {
                            const ordered = [...nextImages].sort((left, right) => left.isPrimary === right.isPrimary ? left.sortOrder - right.sortOrder : left.isPrimary ? -1 : 1);
                            updateRoom(room.id, { images: ordered.map((image) => image.url) });
                          }}
                          maxImages={10}
                          maxFileSize={8}
                        />
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
                      <Label className="text-slate-700 font-bold">Amenities (comma-separated) *</Label>
                      <Textarea
                        value={amenitiesInput}
                        onChange={(e) => {
                          setAmenitiesInput(e.target.value);
                          if (e.target.value.split(",").some((amenity) => amenity.trim())) {
                            clearValidationError("amenities");
                          }
                        }}
                        aria-invalid={Boolean(validationErrors.amenities)}
                        placeholder="e.g., Parking, WiFi, Gym, Pool"
                        rows={3}
                        className={`${fieldClass("amenities")} resize-none`}
                      />
                      <FieldError field="amenities" />
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
                        onChange={(e) => {
                          setFeatureInput(e.target.value);
                          if (e.target.value.trim()) clearValidationError("features");
                        }}
                        onKeyDown={handleFeatureKeyDown}
                        aria-invalid={Boolean(validationErrors.features)}
                        placeholder="Type feature and press Enter"
                        className={`${fieldClass("features")} flex-1`}
                      />
                      <Button type="button" onClick={() => addFeature(featureInput)} className="bg-amber-500 rounded-xl px-4">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FieldError field="features" />

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

              {/* ──────── STEP 2: Verification ──────── */}
              {currentStep === 2 && (
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
                      onChange={(e) => {
                        setVerificationData({ ...verificationData, propertyName: e.target.value });
                        if (e.target.value.trim()) clearValidationError("verificationPropertyName");
                      }}
                      aria-invalid={Boolean(validationErrors.verificationPropertyName)}
                      placeholder="e.g., Sunset Heights"
                      className={fieldClass("verificationPropertyName")}
                    />
                    <FieldError field="verificationPropertyName" />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-slate-700 font-bold flex items-center gap-1.5">
                      <MapPin className="h-3.5" /> Complete Property Address
                    </Label>
                    <Input
                      value={verificationData.propertyAddress}
                      onChange={(e) => {
                        setVerificationData({ ...verificationData, propertyAddress: e.target.value });
                        if (e.target.value.trim()) clearValidationError("verificationPropertyAddress");
                      }}
                      aria-invalid={Boolean(validationErrors.verificationPropertyAddress)}
                      placeholder="Full address"
                      className={fieldClass("verificationPropertyAddress")}
                    />
                    <FieldError field="verificationPropertyAddress" />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold flex items-center gap-1.5">
                        <FileText className="h-3.5" /> Business Permit # *
                      </Label>
                      <Input
                        value={verificationData.businessPermit}
                        onChange={(e) => {
                          setVerificationData({ ...verificationData, businessPermit: e.target.value });
                          if (e.target.value.trim()) clearValidationError("businessPermit");
                        }}
                        aria-invalid={Boolean(validationErrors.businessPermit)}
                        placeholder="B-2024-XXXXX"
                        className={fieldClass("businessPermit")}
                      />
                      <FieldError field="businessPermit" />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">TIN Number (optional)</Label>
                      <Input
                        value={verificationData.tinNumber}
                        onChange={(e) => {
                          setVerificationData({ ...verificationData, tinNumber: e.target.value });
                          if (e.target.value.trim()) clearValidationError("tinNumber");
                        }}
                        aria-invalid={Boolean(validationErrors.tinNumber)}
                        placeholder="XXX-XXX-XXX-XXX"
                        className={fieldClass("tinNumber")}
                      />
                      <FieldError field="tinNumber" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">Valid ID Type (optional)</Label>
                      <select
                        value={verificationData.idType}
                        onChange={(e) => {
                          setVerificationData({ ...verificationData, idType: e.target.value });
                          if (e.target.value) clearValidationError("idType");
                        }}
                        aria-invalid={Boolean(validationErrors.idType)}
                        className={`w-full h-11 rounded-xl border bg-white px-3 text-sm outline-none transition focus:ring-[3px] ${
                          validationErrors.idType ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-slate-200 focus:border-amber-500 focus:ring-amber-100"
                        }`}
                      >
                        <option value="">Select ID Type</option>
                        {VALID_ID_TYPES.map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </select>
                      <FieldError field="idType" />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">ID Number (optional)</Label>
                      <Input
                        value={verificationData.idNumber}
                        onChange={(e) => {
                          setVerificationData({ ...verificationData, idNumber: e.target.value });
                          if (e.target.value.trim()) clearValidationError("idNumber");
                        }}
                        aria-invalid={Boolean(validationErrors.idNumber)}
                        placeholder="Enter ID number"
                        className={fieldClass("idNumber")}
                      />
                      <FieldError field="idNumber" />
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-amber-100 pt-6">
                    <div>
                      <h3 className="font-black text-slate-900">Supporting documents</h3>
                      <p className="mt-1 text-sm font-medium text-slate-500">Upload available documents now. Missing items appear as “Not provided” for the admin and can be supplied later.</p>
                      <p className="mt-1 text-xs font-bold text-amber-700">JPG, JPEG, PNG, WebP, or PDF · maximum 10 MB each</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {VERIFICATION_DOCUMENT_TYPES.map((documentType) => {
                        const document = verificationDocuments.find((item) => item.type === documentType.key);
                        const uploadId = `verification-upload-${documentType.key}`;
                        const cameraId = `verification-camera-${documentType.key}`;
                        return (
                          <div key={documentType.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex min-h-16 items-center gap-3 border-b border-slate-100 p-4">
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><FileText className="h-5 w-5" /></span>
                              <div className="min-w-0"><p className="text-sm font-black text-slate-900">{documentType.label}</p><p className="truncate text-xs font-medium text-slate-400">{document?.file.name || "Not provided"}</p></div>
                            </div>
                            {document && (
                              <div className="border-b border-slate-100 bg-slate-50 p-3">
                                {document.file.type === "application/pdf" ? (
                                  <a href={document.previewUrl} target="_blank" rel="noopener noreferrer" className="flex h-28 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700"><FileText className="h-6 w-6 text-rose-500" />Preview PDF</a>
                                ) : (
                                  <a href={document.previewUrl} target="_blank" rel="noopener noreferrer"><img src={document.previewUrl} alt={`${documentType.label} preview`} className="h-28 w-full rounded-xl object-cover" /></a>
                                )}
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2 p-3">
                              <input id={uploadId} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(event) => { selectVerificationDocument(documentType.key, event.target.files?.[0]); event.currentTarget.value = ""; }} />
                              <label htmlFor={uploadId} className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 text-xs font-black text-slate-700 hover:bg-slate-50"><Upload className="h-3.5 w-3.5" />{document ? "Replace" : "Upload"}</label>
                              <input id={cameraId} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(event) => { selectVerificationDocument(documentType.key, event.target.files?.[0]); event.currentTarget.value = ""; }} />
                              <label htmlFor={cameraId} className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 text-xs font-black text-slate-700 hover:bg-slate-50"><Camera className="h-3.5 w-3.5" />Take photo</label>
                              {document && <button type="button" onClick={() => removePendingVerificationDocument(documentType.key)} className="col-span-2 flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 text-xs font-black text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" />Remove file</button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

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
                  <Button type="submit" disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl h-12 font-bold disabled:opacity-60 disabled:cursor-not-allowed">
                    <Check className="h-5 w-5" /> {isSubmitting ? "Submitting..." : "List Property"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {pendingDraft && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="draft-dialog-title">
          <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <CloudUpload className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h2 id="draft-dialog-title" className="text-xl font-black text-slate-900">Continue your property draft?</h2>
                <p className="mt-1 text-sm font-medium leading-5 text-slate-500">
                  Saved {new Date(pendingDraft.savedAt).toLocaleString("en-PH")}. You can return to step {Math.min(totalSteps, Math.max(1, pendingDraft.currentStep || 1))} or start over.
                </p>
              </div>
            </div>
            {pendingDraft.requiresImageReupload && (
              <div className="mt-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                <Upload className="mt-0.5 h-4 w-4 shrink-0" />
                Please re-upload images before submitting.
              </div>
            )}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button type="button" onClick={continueDraft} className="h-11 rounded-lg bg-orange-500 font-bold text-white hover:bg-orange-600">
                Continue Draft
              </Button>
              <Button type="button" variant="outline" onClick={() => discardDraft(true)} className="h-11 rounded-lg border-slate-300 font-bold text-slate-700 hover:bg-slate-50">
                Discard Draft
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
