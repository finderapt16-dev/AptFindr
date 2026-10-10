import "./AddApartment.css";
import { PropertyLocationPicker } from "@/landlord/PropertyLocationPicker";
import { LandlordSidebar } from "@/landlord/LandlordSidebar";
import { LandlordMenuTrigger } from "@/landlord/LandlordMenuTrigger";
import { PropertyGuidelines } from "@/landlord/PropertyGuidelines";
import { MultiImageUploader } from "@/components/MultiImageUploader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { useAuth } from "@/contexts/AuthContext";
import { apartmentFormValuesFromApartment, createApartment, deleteApartment, fetchApartmentWithImages, resolveAppUserId, uploadApartmentImage, } from "@/data/apartments";
import { BUSINESS_PERMIT_DOCUMENT_TYPE, uploadVerificationDocuments, } from "@/services/verificationDocumentsService";
import { notifyAdminsOfPropertySubmission, updateUserProfile } from "@/services/dashboardSupabaseService";
import { deletePropertyDraft, fetchPropertyDraft, savePropertyDraft, } from "@/services/propertyDraftService";
import { DEFAULT_LA_PAZ_MAP_CENTER, hasValidApartmentCoordinates, } from "@/utils/mapCoordinates";
import { supabase } from "@/services/supabaseClient";
import { AlertCircle, ArrowLeft, ArrowRight, Building2, Camera, Check, Cloud, CloudUpload, FileText, MapPin, RotateCcw, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
function isPropertyDraft(value) {
    if (!value || typeof value !== "object")
        return false;
    const draft = value;
    return draft.version === 2 && typeof draft.savedAt === "string" && Number.isFinite(draft.currentStep);
}
const SUGGESTED_AMENITIES = [
    "Wi-Fi", "Laundry Area", "AC", "Parking", "CCTV", "Gym", "Study Lounge", "Balcony", "Pool", "Elevator",
];
const SUGGESTED_HOUSE_RULES = ["Students Only", "Visitors Allowed", "Cooking Allowed", "No Smoking", "No Alcohol", "Pets Allowed"];
const INCLUDED_FEATURES = [
    { label: "Pet Friendly", source: "feature" },
    { label: "Parking", source: "feature" },
    { label: "Own Bathroom", source: "amenity" },
    { label: "AC", source: "amenity" },
    { label: "Laundry Area", source: "amenity" },
    { label: "Wi-Fi", source: "amenity" },
    { label: "Water", source: "utility" },
    { label: "Electricity", source: "utility" },
    { label: "Internet", source: "utility" },
    { label: "Cooking Area", source: "amenity" },
    { label: "Furnished", source: "feature" },
    { label: "Balcony", source: "amenity" },
];
const INCLUDED_AMENITIES = INCLUDED_FEATURES.filter((item) => item.source === "amenity").map((item) => item.label);
const INCLUDED_UTILITIES = INCLUDED_FEATURES.filter((item) => item.source === "utility").map((item) => item.label);
const DISPLAY_HOUSE_RULES = ["Students Only", "Visitors Allowed", "No Smoking", "No Alcohol"];
const CONTRACT_DURATIONS = ["1 Month", "3 Months", "6 Months", "12 Months", "Flexible"];
const propertyGuidelinesStorageKey = (userId) => `aptfindr:add-property-guidelines-seen:${userId ?? "anonymous"}`;
const splitChoiceValues = (value) => String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
const getCustomChoiceValues = (value, suggestedValues) => {
    const suggested = new Set(suggestedValues.map((item) => item.toLowerCase()));
    return splitChoiceValues(value).filter((item) => !suggested.has(item.toLowerCase()));
};
const normalizeListValues = (value) => {
    const canonical = new Map(SUGGESTED_AMENITIES.map((item) => [item.toLowerCase(), item]));
    return value.split(",").map((item) => item.trim()).filter(Boolean).reduce((items, item) => {
        const normalized = canonical.get(item.toLowerCase()) ?? item;
        if (!items.some((existing) => existing.toLowerCase() === normalized.toLowerCase()))
            items.push(normalized);
        return items;
    }, []);
};
const INITIAL_FORM_DATA = {
    title: "",
    // The streamlined first step uses Apartment as the default listing type.
    // This preserves the existing submission contract without adding a field
    // that is not present in the requested layout.
    propertyType: "Apartment",
    price: "",
    securityDeposit: "",
    sqft: 500,
    address: "",
    barangay: "",
    city: "La Paz",
    state: "Iloilo City",
    zip: "5000",
    description: "",
    availableDate: new Date().toISOString().split("T")[0],
    petFriendly: false,
    parking: false,
    furnished: false,
    image: "",
    images: [],
    amenities: [],
    utilities: false,
    status: "available",
};
const INITIAL_VERIFICATION_DATA = {
    businessPermit: "",
    businessAccount: "",
    permitIssuedAt: "",
    permitExpiry: "",
};
export function AddApartment() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [guidelinesOpen, setGuidelinesOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { refreshApartments } = useApartmentsContext();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const totalSteps = 4;
    const stepConfig = [
        { number: 1, title: "Apartment Verification", description: "Permit details and verification documents." },
        { number: 2, title: "Apartment Information", description: "Photos, name, and basic details." },
        { number: 3, title: "Location Details", description: "Specify your exact address and map position." },
        { number: 4, title: "House Rules & Included", description: "Select the included features, set the house rules, and specify the contract duration for your apartment." },
    ];
    const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });
    const [locationLookupRequest, setLocationLookupRequest] = useState(0);
    const [locationPinned, setLocationPinned] = useState(false);
    const [locationResolving, setLocationResolving] = useState(false);
    const [barangayUnverified, setBarangayUnverified] = useState(false);
    const [coverageUnverified, setCoverageUnverified] = useState(false);
    const [manualAddressEdited, setManualAddressEdited] = useState(false);
    const lastAutoGeocodedAddressRef = useRef("");
    const [uploadedImages, setUploadedImages] = useState([]);
    const [amenitiesInput, setAmenitiesInput] = useState("");
    const [utilitiesInput, setUtilitiesInput] = useState("");
    const [customAmenityInput, setCustomAmenityInput] = useState("");
    const [customUtilityInput, setCustomUtilityInput] = useState("");
    const [customRuleInput, setCustomRuleInput] = useState("");
    const [features, setFeatures] = useState([]);
    const [houseRules, setHouseRules] = useState([]);
    const [contractDuration, setContractDuration] = useState("");
    const toggleCommaValue = (setValue, value) => setValue((current) => {
        const values = splitChoiceValues(current);
        return values.some((item) => item.toLowerCase() === value.toLowerCase())
            ? values.filter((item) => item.toLowerCase() !== value.toLowerCase()).join(", ")
            : [...values, value].join(", ");
    });
    const appendCommaValue = (setValue, value, clear) => {
        const trimmed = value.trim();
        if (!trimmed)
            return;
        setValue((current) => {
            const values = splitChoiceValues(current);
            return values.some((item) => item.toLowerCase() === trimmed.toLowerCase()) ? values.join(", ") : [...values, trimmed].join(", ");
        });
        clear("");
    };
    const removeCommaValue = (setValue, value) => setValue((current) => splitChoiceValues(current)
        .filter((item) => item.toLowerCase() !== value.toLowerCase())
        .join(", "));
    const addCustomHouseRule = () => {
        const rule = customRuleInput.trim();
        if (rule && !houseRules.some((item) => item.toLowerCase() === rule.toLowerCase()))
            setHouseRules((current) => [...current, rule]);
        setCustomRuleInput("");
    };
    const choiceIsSelected = (value, choice) => splitChoiceValues(value).some((item) => item.toLowerCase() === choice.toLowerCase());
    const includedFeatureIsSelected = ({ label, source }) => source === "feature"
        ? features.some((item) => item.toLowerCase() === label.toLowerCase())
        : choiceIsSelected(source === "utility" ? utilitiesInput : amenitiesInput, label);
    const toggleIncludedFeature = ({ label, source }) => {
        if (source === "feature") {
            setFeatures((current) => current.some((item) => item.toLowerCase() === label.toLowerCase())
                ? current.filter((item) => item.toLowerCase() !== label.toLowerCase())
                : [...current, label]);
            return;
        }
        toggleCommaValue(source === "utility" ? setUtilitiesInput : setAmenitiesInput, label);
    };
    const [featureInput, setFeatureInput] = useState("");
    const [verificationData, setVerificationData] = useState({ ...INITIAL_VERIFICATION_DATA });
    const [verificationDocuments, setVerificationDocuments] = useState([]);
    const [pendingDraft, setPendingDraft] = useState(null);
    const [draftStatus, setDraftStatus] = useState("idle");
    const [draftReady, setDraftReady] = useState(false);
    const [imageReuploadRequired, setImageReuploadRequired] = useState(false);
    const autoSaveTimerRef = useRef(null);
    const skipNextAutoSaveRef = useRef(false);
    const submissionCompleteRef = useRef(false);
    useEffect(() => {
        try {
            setGuidelinesOpen(localStorage.getItem(propertyGuidelinesStorageKey(user?.id)) !== "true");
        }
        catch {
            // If browser storage is unavailable, retain the normal first-visit prompt.
            setGuidelinesOpen(true);
        }
    }, [user?.id]);
    const dismissGuidelines = () => {
        try {
            localStorage.setItem(propertyGuidelinesStorageKey(user?.id), "true");
        }
        catch {
            // The dialog can still close if browser storage is unavailable.
        }
        setGuidelinesOpen(false);
    };
    const addPermitFiles = (fileList) => {
        const files = Array.from(fileList ?? []);
        if (files.length + verificationDocuments.length > 5) {
            toast.error("Upload up to 5 files.");
            return;
        }
        for (const file of files) {
            if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type) || file.size > 8 * 1024 * 1024) {
                toast.error("Use JPG, PNG, or PDF files up to 8MB each.");
                return;
            }
        }
        setVerificationDocuments((current) => {
            const used = new Set(current.map((document) => document.type));
            return [...current, ...files.map((file) => {
                const type = Array.from({ length: 5 }, (_, index) => index === 0 ? BUSINESS_PERMIT_DOCUMENT_TYPE : `${BUSINESS_PERMIT_DOCUMENT_TYPE}_${index + 1}`).find((key) => !used.has(key));
                used.add(type);
                return { type, file, previewUrl: URL.createObjectURL(file) };
            })];
        });
    };
    const removePendingVerificationDocument = (type) => {
        setVerificationDocuments((current) => {
            const document = current.find((item) => item.type === type);
            if (document?.previewUrl.startsWith("blob:"))
                URL.revokeObjectURL(document.previewUrl);
            return current.filter((item) => item.type !== type);
        });
    };
    const hasDraftContent = useMemo(() => {
        const verificationHasContent = Object.values(verificationData).some((value) => value.trim().length > 0);
        return Boolean(String(formData.title ?? "").trim()
            || String(formData.description ?? "").trim()
            || String(formData.address ?? "").trim()
            || amenitiesInput.trim()
            || utilitiesInput.trim()
            || features.length > 0
            || houseRules.length > 0
            || contractDuration
            || featureInput.trim()
            || uploadedImages.length > 0
            || verificationDocuments.length > 0
            || verificationHasContent
            || currentStep > 1);
    }, [amenitiesInput, contractDuration, currentStep, featureInput, features, formData, houseRules, uploadedImages, utilitiesInput, verificationData, verificationDocuments]);
    const resetDraftForm = () => {
        setCurrentStep(1);
        setFormData({ ...INITIAL_FORM_DATA });
        setUploadedImages([]);
        setAmenitiesInput("");
        setUtilitiesInput("");
        setFeatures([]);
        setHouseRules([]);
        setContractDuration("");
        setFeatureInput("");
        setVerificationData({ ...INITIAL_VERIFICATION_DATA });
        setVerificationDocuments((current) => {
            current.forEach((document) => {
                if (document.previewUrl.startsWith("blob:"))
                    URL.revokeObjectURL(document.previewUrl);
            });
            return [];
        });
        setValidationErrors({});
        setImageReuploadRequired(false);
        setLocationPinned(false);
        setLocationResolving(false);
        setBarangayUnverified(false);
        setCoverageUnverified(false);
        setManualAddressEdited(false);
        lastAutoGeocodedAddressRef.current = "";
    };
    const discardDraft = (resetForm = true) => {
        if (user?.id) {
            void deletePropertyDraft(user.id).catch((error) => {
                console.error("Unable to delete the apartment draft:", error);
            });
        }
        setPendingDraft(null);
        setDraftReady(true);
        setDraftStatus("idle");
        if (resetForm)
            resetDraftForm();
    };
    const continueDraft = () => {
        if (!pendingDraft)
            return;
        skipNextAutoSaveRef.current = true;
        setCurrentStep(pendingDraft.flowOrder === "verification-first"
            ? Math.min(totalSteps, Math.max(1, pendingDraft.currentStep || 1))
            : ({ 1: 2, 2: 3, 3: 4, 4: 1 }[pendingDraft.currentStep] ?? 1));
        const restoredFormData = { ...INITIAL_FORM_DATA, ...pendingDraft.formData, image: "", images: [] };
        setFormData(restoredFormData);
        setLocationPinned(hasValidApartmentCoordinates(restoredFormData.lat, restoredFormData.lng));
        setUploadedImages(pendingDraft.uploadedImages ?? []);
        setAmenitiesInput(pendingDraft.amenitiesInput ?? "");
        setUtilitiesInput(pendingDraft.utilitiesInput ?? "");
        setFeatures(pendingDraft.features ?? []);
        setHouseRules(pendingDraft.houseRules ?? []);
        setContractDuration(pendingDraft.contractDuration ?? "");
        setFeatureInput(pendingDraft.featureInput ?? "");
        setVerificationData({ ...INITIAL_VERIFICATION_DATA, ...pendingDraft.verificationData });
        setImageReuploadRequired(Boolean(pendingDraft.requiresImageReupload));
        setPendingDraft(null);
        setDraftReady(true);
        setDraftStatus("restored");
        toast.success("Apartment draft restored");
    };
    useEffect(() => {
        if (!user?.id)
            return;
        let active = true;
        setDraftReady(false);
        setPendingDraft(null);
        void fetchPropertyDraft(user.id)
            .then((parsed) => {
            if (!active)
                return;
            if (parsed && isPropertyDraft(parsed)) {
                setPendingDraft(parsed);
            }
            else if (parsed) {
                void deletePropertyDraft(user.id).catch((error) => {
                    console.error("Unable to remove an invalid apartment draft:", error);
                });
            }
        })
            .catch((error) => {
            console.error("Unable to read the Add Apartment draft:", error);
        })
            .finally(() => {
            if (active)
                setDraftReady(true);
        });
        return () => {
            active = false;
        };
    }, [user?.id]);
    const persistDraft = useCallback(async (updateStatus = true) => {
        if (!user?.id || !hasDraftContent || submissionCompleteRef.current)
            return;
        const persistentImages = uploadedImages
            .filter((image) => !image.file && /^https?:\/\//i.test(image.url))
            .map((image) => ({ ...image, file: undefined }));
        const hasLocalPropertyImages = uploadedImages.some((image) => Boolean(image.file) || /^(data:|blob:)/i.test(image.url));
        const { image: _image, images: _images, ...safeFormData } = formData;
        const draft = {
            version: 2,
            flowOrder: "verification-first",
            savedAt: new Date().toISOString(),
            currentStep,
            formData: safeFormData,
            amenitiesInput,
            utilitiesInput,
            features,
            houseRules,
            contractDuration,
            featureInput,
            verificationData: INITIAL_VERIFICATION_DATA,
            uploadedImages: persistentImages,
            requiresImageReupload: hasLocalPropertyImages || imageReuploadRequired,
        };
        try {
            await savePropertyDraft(user.id, draft);
            if (updateStatus)
                setDraftStatus("saved");
        }
        catch (error) {
            console.error("Unable to save the Add Apartment draft:", error);
            if (updateStatus)
                setDraftStatus("error");
        }
    }, [amenitiesInput, contractDuration, currentStep, featureInput, features, formData, hasDraftContent, houseRules, imageReuploadRequired, uploadedImages, user?.id, utilitiesInput, verificationData]);
    useEffect(() => {
        if (!draftReady || !user?.id || submissionCompleteRef.current)
            return;
        if (skipNextAutoSaveRef.current) {
            skipNextAutoSaveRef.current = false;
            return;
        }
        if (autoSaveTimerRef.current)
            clearTimeout(autoSaveTimerRef.current);
        if (!hasDraftContent) {
            void deletePropertyDraft(user.id).catch((error) => {
                console.error("Unable to clear the empty apartment draft:", error);
            });
            setDraftStatus("idle");
            return;
        }
        setDraftStatus("saving");
        autoSaveTimerRef.current = setTimeout(() => void persistDraft(), 700);
        return () => {
            if (autoSaveTimerRef.current)
                clearTimeout(autoSaveTimerRef.current);
        };
    }, [draftReady, hasDraftContent, persistDraft, user?.id]);
    const fieldClass = (field) => validationErrors[field]
        ? "landlord-field-invalid"
        : "landlord-field-normal";
    const clearValidationError = (field) => {
        setValidationErrors((previous) => {
            if (!previous[field])
                return previous;
            const next = { ...previous };
            delete next[field];
            return next;
        });
    };
    const FieldError = ({ field }) => validationErrors[field] ? <p className="add-apartment-text">{validationErrors[field]}</p> : null;
    const persistedStreetAddress = useMemo(() => [formData.address, formData.barangay].filter(Boolean).join(", "), [formData.address, formData.barangay]);
    const locationAddressQuery = useMemo(() => [formData.address, formData.barangay, formData.city, formData.state, formData.zip, "Philippines"].filter(Boolean).join(", "), [formData.address, formData.barangay, formData.city, formData.state, formData.zip]);
    useEffect(() => {
        if (currentStep !== 3 || ![formData.address, formData.barangay].some((value) => String(value ?? "").trim()))
            return;
        const normalizedQuery = locationAddressQuery.trim().replace(/\s+/g, " ").toLowerCase();
        if (!normalizedQuery || normalizedQuery === lastAutoGeocodedAddressRef.current)
            return;
        const timer = window.setTimeout(() => {
            if (normalizedQuery === lastAutoGeocodedAddressRef.current)
                return;
            lastAutoGeocodedAddressRef.current = normalizedQuery;
            setLocationResolving(true);
            setLocationLookupRequest((request) => request + 1);
        }, 800);
        return () => window.clearTimeout(timer);
    }, [currentStep, formData.address, formData.barangay, locationAddressQuery]);
    const getSubmittedAmenities = () => normalizeListValues(amenitiesInput);
    const getSubmittedFeatures = () => {
        const submittedFeatures = featureInput.trim() ? [...features, featureInput.trim()] : features;
        return submittedFeatures.filter((feature, index, list) => list.findIndex((item) => item.toLowerCase() === feature.toLowerCase()) === index);
    };
    const validateAllFields = () => {
        const errors = {};
        if (!String(formData.title ?? "").trim())
            errors.title = "Apartment name is required.";
        if (!Number(formData.sqft))
            errors.sqft = "Total apartment area is required.";
        if (!String(formData.description ?? "").trim())
            errors.description = "Apartment description is required.";
        if (uploadedImages.length === 0)
            errors.images = "Upload at least one apartment image.";
        if (!String(formData.address ?? "").trim())
            errors.address = "Complete address is required.";
        if (!String(formData.barangay ?? "").trim())
            errors.barangay = "Barangay is required.";
        if (locationResolving) {
            errors.mapLocation = "Finding this address on the map. Please wait a moment.";
        }
        else if (!locationPinned || !hasValidApartmentCoordinates(formData.lat, formData.lng)) {
            errors.mapLocation = "Select the apartment's real map location before submitting.";
        }
        if (!String(verificationData.businessPermit).trim())
            errors.businessPermit = "Business permit number is required.";
        if (!String(verificationData.businessAccount).trim())
            errors.businessAccount = "Business account number is required.";
        if (!String(verificationData.permitIssuedAt).trim())
            errors.permitIssuedAt = "Permit issue date is required.";
        if (!contractDuration)
            errors.contractDuration = "Select a contract duration.";
        const firstStep = errors.businessPermit || errors.businessAccount || errors.permitIssuedAt || errors.permitExpiry
            ? 1
            : errors.title || errors.sqft || errors.description || errors.images
                ? 2
                : errors.address || errors.barangay || errors.mapLocation
                    ? 3
                    : errors.contractDuration
                        ? 4
                        : currentStep;
        return { isValid: Object.keys(errors).length === 0, errors, firstStep };
    };
    const validateStep = (step) => {
        const { errors } = validateAllFields();
        const belongsToStep = (field) => {
            if (step === 1)
                return ["businessPermit", "businessAccount", "permitIssuedAt", "permitExpiry"].includes(field);
            if (step === 2)
                return ["title", "sqft", "description", "images"].includes(field);
            if (step === 3)
                return ["address", "barangay", "mapLocation"].includes(field);
            if (step === 4)
                return field === "contractDuration";
            return false;
        };
        const stepErrors = Object.fromEntries(Object.entries(errors).filter(([field]) => belongsToStep(field)));
        setValidationErrors(stepErrors);
        return Object.keys(stepErrors).length === 0;
    };
    const handleStepClick = (targetStep) => {
        if (targetStep === currentStep || isSubmitting)
            return;
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
        }
        else {
            if (currentStep === 2 && uploadedImages.length === 0) {
                toast.error("Please upload at least one apartment image");
            }
            else {
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
    const handleSubmit = async (e) => {
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
            toast.error("Please upload at least one apartment image");
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
        const draftApartment = {
            id: "",
            title: formData.title || "",
            price: Number(formData.price) || 0,
            bedrooms: 0,
            bathrooms: 0,
            sqft: Number(formData.sqft) || 500,
            address: persistedStreetAddress,
            city: formData.city || "La Paz",
            state: formData.state || "Iloilo City",
            zip: formData.zip || "5000",
            image: primaryImageUrl,
            images: uploadedImages.map((img) => img.url),
            description: formData.description || "",
            propertyType: formData.propertyType || "Apartment",
            securityDeposit: String(formData.securityDeposit ?? ""),
            amenities: submittedAmenities,
            availableDate: formData.availableDate || new Date().toISOString().split("T")[0],
            petFriendly: featureLower.includes("pet friendly"),
            parking: featureLower.includes("parking"),
            furnished: featureLower.includes("furnished"),
            utilities: utilityItems,
            lat: Number(formData.lat),
            lng: Number(formData.lng),
            landlordId: user.id,
            isPublished: false,
            status: formData.status ?? "available",
        };
        let createdApartmentId = null;
        let requiredSetupComplete = false;
        setIsSubmitting(true);
        try {
            const formValues = {
                ...apartmentFormValuesFromApartment(draftApartment),
                utilityItems,
                customFeatures: submittedFeatures,
                propertyType: formData.propertyType || "Apartment",
                securityDeposit: String(formData.securityDeposit ?? ""),
                houseRules,
                contractDuration,
                verification: {
                    propertyName: formData.title || "",
                    propertyAddress: [persistedStreetAddress, formData.city, formData.state, formData.zip].filter(Boolean).join(", "),
                    businessPermit: verificationData.businessPermit,
                    businessAccount: verificationData.businessAccount,
                    issuedAt: verificationData.permitIssuedAt,
                    permitExpiry: verificationData.permitExpiry,
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
            const created = await createApartment({ ...formValues, landlordId: resolvedLandlordId }, resolvedLandlordId);
            createdApartmentId = created.id;
            // Upload all images and collect their URLs
            const uploadedImageUrls = [];
            for (let i = 0; i < uploadedImages.length; i++) {
                const img = uploadedImages[i];
                if (img.file) {
                    const url = await uploadApartmentImage(created.id, img.file, `apartment-image-${i}.jpg`);
                    uploadedImageUrls.push(url);
                }
                else {
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
                const { error: imageMetadataError } = await supabase.from("apartment_images").insert(insertPayload);
                if (imageMetadataError)
                    throw new Error(imageMetadataError.message || "Unable to save apartment images.");
            }
            const uploadedVerificationDocuments = await uploadVerificationDocuments(created.id, resolvedLandlordId, verificationDocuments);
            const businessPermitDocument = uploadedVerificationDocuments.find((document) => document.documentType === BUSINESS_PERMIT_DOCUMENT_TYPE);
            await updateUserProfile({
                id: resolvedLandlordId,
                role: "landlord",
                email: user.email,
                name: user.name,
                permit_number: verificationData.businessAccount.trim(),
                business_permit_number: verificationData.businessPermit.trim(),
                permit_issued_at: verificationData.permitIssuedAt || null,
                permit_expiry: verificationData.permitExpiry || null,
                // Keep the storage path, not a short-lived signed URL. Settings and
                // the admin review page each create their own signed viewing link.
                verification_document_url: businessPermitDocument?.storagePath,
            });
            const persistedApartment = await fetchApartmentWithImages(created.id);
            if (!persistedApartment || persistedApartment.images.length !== uploadedImageUrls.length) {
                throw new Error("The apartment was created, but its permanent images could not be verified.");
            }
            requiredSetupComplete = true;
            try {
                const notifiedAdminCount = await notifyAdminsOfPropertySubmission(created.id);
                if (notifiedAdminCount === 0) {
                    console.warn("No administrator accounts were available for the apartment-submission notification.");
                }
            }
            catch (notificationError) {
                // The property itself is complete. Do not roll it back merely
                // because a notification delivery needs to be retried.
                console.error("Unable to notify administrators about the submitted apartment:", notificationError);
                toast.warning("Your apartment was submitted, but the admin notification could not be delivered yet.");
            }
            await refreshApartments();
            submissionCompleteRef.current = true;
            if (autoSaveTimerRef.current)
                clearTimeout(autoSaveTimerRef.current);
            await deletePropertyDraft(user.id);
            setDraftStatus("idle");
            toast.success("Apartment submitted successfully and is awaiting admin review.");
            navigate("/landlord/dashboard?section=overview");
        }
        catch (error) {
            console.error("Failed to submit apartment:", error);
            const message = error instanceof Error ? error.message : "Unable to save apartment.";
            let rollbackFailed = false;
            if (createdApartmentId && !requiredSetupComplete) {
                try {
                    await deleteApartment(createdApartmentId);
                }
                catch (rollbackError) {
                    rollbackFailed = true;
                    console.error("Failed to roll back incomplete apartment:", rollbackError);
                }
            }
            toast.error(rollbackFailed
                ? `${message} The incomplete apartment may still appear in My Apartments; please remove it before trying again.`
                : message);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (user?.role !== "landlord") {
        return <Navigate to="/browse" replace/>;
    }
    return (<div className="app-shell landlord-shell landlord-add-property-shell">
      <div className="app-shell-frame">
        <aside className="app-shell-sidebar landlord-add-property-sidebar">
          <LandlordSidebar user={user} verified={user?.isVerified === true} activeSection="add-property" onSectionChange={(section) => navigate(`/landlord/dashboard?section=${section}`)} onLogout={() => {
                logout?.();
                navigate("/", { replace: true });
            }}/>
        </aside>

        {sidebarOpen && <div className="app-sidebar-overlay landlord-add-property-overlay" onClick={() => setSidebarOpen(false)} />}
        <aside className={`app-sidebar-drawer landlord-add-property-drawer ${sidebarOpen ? "is-open" : ""}`} aria-label="Landlord navigation">
          <button type="button" aria-label="Close navigation" className="app-sidebar-close" onClick={() => setSidebarOpen(false)}><X /></button>
          <LandlordSidebar user={user} verified={user?.isVerified === true} activeSection="add-property" onSectionChange={(section) => { setSidebarOpen(false); navigate(`/landlord/dashboard?section=${section}`); }} onClose={() => setSidebarOpen(false)} onLogout={() => {
                logout?.();
                navigate("/", { replace: true });
            }}/>
        </aside>
        <LandlordMenuTrigger expanded={sidebarOpen} className="landlord-add-property-trigger" onClick={() => setSidebarOpen(true)} />

        <main className="app-shell-main landlord-add-property-main">
          <div className={`landlord-add-property add-apartment-page ${currentStep === 1 ? "verification-reference" : ""}`}>
            <div className="app-shell-content add-apartment-page-content add-apartment-flow-container">
        <div className="add-apartment-panel-4">
          <h1 className="add-apartment-add-property">Add Apartment</h1>
          <p className="add-apartment-text-4">Submit apartment information for review, then manage individual units separately.</p>
          <p className="add-apartment-step">Step {currentStep} of {totalSteps}</p>
          <div className="add-apartment-row-3">
            {draftStatus !== "idle" && (<span className={`add-apartment-card-3 ${draftStatus === "error" ? "add-apartment-span" : "add-apartment-span-2"}`}>
                {draftStatus === "saving" ? <Cloud className="add-apartment-cloud-icon"/> : <CloudUpload className="add-apartment-cloud-upload-icon"/>}
                {draftStatus === "saving" && "Saving..."}
                {draftStatus === "saved" && "Draft saved"}
                {draftStatus === "restored" && "Restored from draft"}
                {draftStatus === "error" && "Draft could not be saved"}
              </span>)}
            {hasDraftContent && draftReady && (<button type="button" onClick={() => {
                if (window.confirm("Discard this apartment draft and clear all entered details?"))
                    discardDraft(true);
            }} className="add-apartment-discard-draft">
                <RotateCcw className="add-apartment-rotate-ccw-icon"/>Discard Draft
              </button>)}
          </div>
        </div>

        {!user?.isVerified && (<Alert className="add-apartment-card-4">
            <AlertCircle className="add-apartment-alert-circle-icon"/>
            <AlertTitle className="add-apartment-verification-pending">Verification Pending</AlertTitle>
            <AlertDescription className="add-apartment-alert-description">
              You can submit and manage the apartment while verification is pending. It will only become visible to tenants after the required admin verification and publication approval.
            </AlertDescription>
          </Alert>)}

        <div className="add-apartment-container">
          <div className="add-apartment-stepper">
            {stepConfig.map((step, idx) => (<div key={step.number} className="add-apartment-step-item">
                <button type="button" onClick={() => handleStepClick(step.number)} disabled={isSubmitting} aria-label={`Go to step ${step.number}: ${step.title}`} aria-current={currentStep === step.number ? "step" : undefined} className={`add-apartment-button-3 ${currentStep >= step.number
                ? "add-apartment-button-4"
                : "add-apartment-button-5"}`}>
                  {currentStep > step.number ? <Check className="add-apartment-check-icon"/> : step.number}
                </button>
                {idx < stepConfig.length - 1 && (<div className={`add-apartment-panel-5 ${currentStep > step.number
                    ? "add-apartment-panel-6"
                    : "add-apartment-panel-7"}`}/>)}
                <button type="button" onClick={() => handleStepClick(step.number)} disabled={isSubmitting} aria-label={`Go to ${step.title}`} className={`add-apartment-button-6 ${currentStep === step.number
                ? "add-apartment-button-7"
                : currentStep > step.number
                    ? "add-apartment-button-8"
                    : "add-apartment-button-9"}`}>
                  <span>{step.number === 4 ? "Amenities & House Rules" : step.title}</span>
                </button>
              </div>))}
          </div>
        </div>

        <Card className="add-apartment-card-5">
          <CardHeader className="add-apartment-card-header">
            <button
              type="button"
              className="add-apartment-close-wizard"
              aria-label="Close Add Apartment"
              title="Close Add Apartment"
              disabled={isSubmitting}
              onClick={() => {
                if (hasDraftContent && !window.confirm("Leave Add Apartment? Your entered details will remain saved as a draft."))
                  return;
                navigate("/landlord/dashboard");
              }}
            >
              <X aria-hidden="true" />
            </button>
            <CardTitle className="add-apartment-card-title">{stepConfig[currentStep - 1].title}</CardTitle>
            <CardDescription>{stepConfig[currentStep - 1].description}</CardDescription>
          </CardHeader>

          <CardContent className="add-apartment-card-content">
            <form onSubmit={handleSubmit} noValidate className="add-apartment-form">
              {currentStep === 1 && (<div className="add-apartment-panel-8 add-apartment-verification-step">
                  <div className="add-apartment-row-6">
                    <ShieldCheck className="add-apartment-shield-check-icon"/>
                    <h3 className="add-apartment-property-verification">Apartment Information</h3>
                  </div>
                  <p className="add-apartment-verification-intro">Provide the basic apartment details used for verification.</p>

                  <div className="add-apartment-panel-9">
                    <Label className="add-apartment-property-name-2">
                      <Building2 className="add-apartment-building2-icon-2"/> Apartment Name
                    </Label>
                    <Input value={String(formData.title ?? "")} onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))} placeholder="Luna" className="add-apartment-input-3"/>
                    <p className="add-apartment-text-5">Carried from Apartment Information. Go back to step 1 to edit this name.</p>
                  </div>

                  <div className="add-apartment-panel-9">
                    <Label className="add-apartment-property-address">
                      <MapPin className="add-apartment-map-pin-icon-2"/> Apartment Address
                    </Label>
                    <Input value={formData.address} onChange={(event) => { setFormData((current) => ({ ...current, address: event.target.value })); setLocationPinned(false); setManualAddressEdited(true); }} placeholder="Luna, La Paz, Iloilo City, 5000" className="add-apartment-input-3"/>
                    <p className="add-apartment-text-5">Carried from Location. Go back to step 2 to change this address.</p>
                  </div>

                  <div className="add-apartment-grid-4">
                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-business-permit-number">
                        <FileText className="add-apartment-file-text-icon"/> Business Permit Number <span aria-hidden="true">*</span>
                      </Label>
                      <Input value={verificationData.businessPermit} onChange={(e) => {
                setVerificationData({ ...verificationData, businessPermit: e.target.value });
                if (e.target.value.trim())
                    clearValidationError("businessPermit");
            }} aria-invalid={Boolean(validationErrors.businessPermit)} placeholder="e.g., B-2024-0001" className={fieldClass("businessPermit")}/>
                      <FieldError field="businessPermit"/>
                    </div>

                    <div className="add-apartment-panel-9">
                      <Label>Business Account Number <span aria-hidden="true">*</span></Label>
                      <Input value={verificationData.businessAccount} onChange={(e) => {
                setVerificationData({ ...verificationData, businessAccount: e.target.value });
                if (e.target.value.trim())
                    clearValidationError("businessAccount");
            }} aria-invalid={Boolean(validationErrors.businessAccount)} placeholder="e.g., A-A10087" className={fieldClass("businessAccount")}/>
                      <FieldError field="businessAccount"/>
                    </div>

                    <div className="add-apartment-panel-9">
                      <Label>Date Issued <span aria-hidden="true">*</span></Label>
                      <Input type="date" value={verificationData.permitIssuedAt} onChange={(e) => {
                setVerificationData({ ...verificationData, permitIssuedAt: e.target.value });
                if (e.target.value)
                    clearValidationError("permitIssuedAt");
            }} aria-invalid={Boolean(validationErrors.permitIssuedAt)} className={fieldClass("permitIssuedAt")}/>
                      <FieldError field="permitIssuedAt"/>
                    </div>


                  </div>

                  <div className="verification-reference-documents">
                    <h3>VERIFICATION DOCUMENT</h3>
                    <p>Upload your business permit documents for admin review.</p>
                    <label className="verification-reference-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addPermitFiles(event.dataTransfer.files); }}>
                      <input type="file" multiple accept=".jpg,.jpeg,.png,.pdf" onChange={(event) => { addPermitFiles(event.target.files); event.target.value = ""; }}/>
                      <Upload aria-hidden="true"/>
                      <strong>Drag and drop files here or click to browse</strong>
                      <span>JPG, PNG, or PDF {"\u2022"} Max 8MB {"\u2022"} Up to 5 files</span>
                    </label>
                    {verificationDocuments.length > 0 && <ul className="verification-reference-files">{verificationDocuments.map((document) => <li key={document.type}><a href={document.previewUrl} target="_blank" rel="noopener noreferrer">{document.file.name}</a><button type="button" aria-label={`Remove ${document.file.name}`} onClick={() => removePendingVerificationDocument(document.type)}><X size={16}/></button></li>)}</ul>}
                  </div>
                </div>)}

              {currentStep === 2 && (<>
                  <div className="add-apartment-panel-8">
                    <div className="add-apartment-row-6">
                      <Upload className="add-apartment-upload-icon"/>
                      <h3 className="add-apartment-property-photos">Upload Photos</h3>
                    </div>

                    <MultiImageUploader images={uploadedImages} onImagesChange={(images) => {
                setUploadedImages(images);
                if (images.length > 0)
                    setImageReuploadRequired(false);
                setValidationErrors((prev) => {
                    const next = { ...prev };
                    delete next.images;
                    return next;
                });
            }} maxImages={5} maxFileSize={5}/>
                    <p className="add-apartment-text-5">Upload clear photos of the apartment exterior, common areas, and facilities. Individual unit photos can be managed separately in Manage Units.</p>
                    {imageReuploadRequired && (<Alert className="add-apartment-card-6">
                        <Upload className="add-apartment-upload-icon-2"/>
                        <AlertDescription className="add-apartment-alert-description-2">Please re-upload images before submitting.</AlertDescription>
                      </Alert>)}
                    <FieldError field="images"/>
                  </div>

                  <div className="add-apartment-panel-8">
                    <div className="add-apartment-row-6">
                      <Building2 className="add-apartment-building2-icon"/>
                    <h3 className="add-apartment-basic-information">Apartment Information</h3>
                    </div>

                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-property-name">Apartment Name *</Label>
                      <Input value={formData.title} onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (e.target.value.trim())
                    clearValidationError("title");
            }} placeholder="e.g., Sunset Residences" required aria-invalid={Boolean(validationErrors.title)} className={fieldClass("title")}/>
                      <FieldError field="title"/>
                    </div>

                    <div className="add-apartment-panel-9 add-apartment-property-basics-grid">
                      <Label className="add-apartment-total-property-area-sq-ft">Total Apartment Floor Area *</Label>
                      <Input type="number" value={formData.sqft || ""} onChange={(e) => {
                setFormData({ ...formData, sqft: Number(e.target.value) });
                if (Number(e.target.value) > 0)
                    clearValidationError("sqft");
            }} required aria-invalid={Boolean(validationErrors.sqft)} className={`${fieldClass("sqft")} hide-number-spinners`}/>
                      <FieldError field="sqft"/>
                    </div>

                    <div className="add-apartment-panel-9 add-apartment-description-panel">
                      <Label className="add-apartment-description">Description *</Label>
                      <Textarea value={formData.description} onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                if (e.target.value.trim())
                    clearValidationError("description");
            }} rows={4} required aria-invalid={Boolean(validationErrors.description)} placeholder="Describe the apartment, surrounding area, accessibility, and other important details." className={`${fieldClass("description")} add-apartment-textarea`}/>
                      <FieldError field="description"/>
                    </div>


                  </div>
                </>)}

              {currentStep === 3 && (<div className="add-apartment-panel-8 add-apartment-location-step">
                  <p className="add-apartment-location-section-label">Address</p>
                  <div className="add-apartment-location-primary-grid">
                    <div className="add-apartment-panel-9">
                      <Label>Barangay *</Label>
                      <Input value={formData.barangay} onChange={(e) => {
                setFormData((current) => ({ ...current, barangay: e.target.value }));
                setManualAddressEdited(locationPinned);
                if (e.target.value.trim())
                    clearValidationError("barangay");
            }} placeholder="e.g., Nabitasan" required aria-invalid={Boolean(validationErrors.barangay)} className={fieldClass("barangay")}/>
                      <FieldError field="barangay"/>
                    </div>
                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-detailed-address-street-address">Street *</Label>
                      <Input value={formData.address} onChange={(e) => {
                setFormData((current) => ({ ...current, address: e.target.value }));
                setManualAddressEdited(locationPinned);
                if (e.target.value.trim())
                    clearValidationError("address");
            }} placeholder="House number, street, subdivision" required aria-invalid={Boolean(validationErrors.address)} className={fieldClass("address")}/>
                      <FieldError field="address"/>
                    </div>
                  </div>
                  <div className="add-apartment-grid-3 add-apartment-location-fields">
                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-district-area">District / Area</Label>
                      <Input value={formData.city} readOnly placeholder="La Paz" className="add-apartment-input"/>
                    </div>
                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-city">City</Label>
                      <Input value={formData.state} readOnly placeholder="Iloilo City" className="add-apartment-input"/>
                    </div>
                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-zip-code">ZIP Code</Label>
                      <Input value={formData.zip} readOnly placeholder="5000" className="add-apartment-input"/>
                    </div>
                  </div>

                  <div className="add-apartment-panel-9">
                    <Label className="add-apartment-map-location">Map Location</Label>
                    <p className="add-apartment-text-6">Click or drag the map pin to select your apartment's exact location. The address details will update based on your selected point.</p>
                    <div className="add-apartment-card-7">
                      <PropertyLocationPicker lat={Number.isFinite(Number(formData.lat)) ? Number(formData.lat) : DEFAULT_LA_PAZ_MAP_CENTER.lat} lng={Number.isFinite(Number(formData.lng)) ? Number(formData.lng) : DEFAULT_LA_PAZ_MAP_CENTER.lng} addressQuery={locationAddressQuery} geocodeRequestKey={locationLookupRequest} onGeocodeStatusChange={(status) => setLocationResolving(status === "loading")} onMapAddressChange={(detectedAddress) => {
                setFormData((current) => ({
                    ...current,
                    // A pin selection is authoritative. Clear unavailable OSM
                    // fields instead of retaining labels from the old location.
                    address: detectedAddress.street,
                    barangay: detectedAddress.barangay || detectedAddress.barangayCandidate || "",
                    city: detectedAddress.district,
                    state: detectedAddress.city,
                    zip: detectedAddress.zip,
                }));
                setLocationPinned(!detectedAddress.unresolved);
                setBarangayUnverified(!detectedAddress.unresolved && !detectedAddress.barangayVerified);
                setCoverageUnverified(!detectedAddress.unresolved && !detectedAddress.coverageVerified);
                setManualAddressEdited(false);
                lastAutoGeocodedAddressRef.current = [detectedAddress.street, detectedAddress.barangay || detectedAddress.barangayCandidate, detectedAddress.district, detectedAddress.city, detectedAddress.zip, "Philippines"].filter(Boolean).join(", ").trim().replace(/\s+/g, " ").toLowerCase();
                if (!detectedAddress.unresolved) {
                    clearValidationError("address");
                    clearValidationError("barangay");
                    clearValidationError("mapLocation");
                }
            }} onLocationChange={(lat, lng, metadata = {}) => {
                setFormData((current) => ({ ...current, lat, lng }));
                const resolved = Boolean(metadata.locationResolved || metadata.verified) && hasValidApartmentCoordinates(lat, lng);
                setLocationPinned(resolved);
                if (metadata.source === "map")
                    lastAutoGeocodedAddressRef.current = locationAddressQuery.trim().replace(/\s+/g, " ").toLowerCase();
                if (metadata.source === "address") {
                    setManualAddressEdited(false);
                    setCoverageUnverified(!metadata.coverageVerified);
                }
                if (resolved)
                    clearValidationError("mapLocation");
            }}/>
                    </div>
                    {barangayUnverified && <p className="add-apartment-text">Barangay could not be verified from official map boundary data. Enter or correct it manually; the selected pin will stay in place.</p>}
                    {coverageUnverified && <p className="add-apartment-text">La Paz coverage could not be verified from map boundary data. Review the selected pin before continuing.</p>}
                    {manualAddressEdited && <p className="add-apartment-text">The address was edited after selecting the map pin. The pin was not moved; review the address details before continuing.</p>}
                    <FieldError field="mapLocation"/>
                  </div>
                </div>)}

              {currentStep === 4 && (<>
                  <div className="add-apartment-step-three-reference">
                    <section className="add-apartment-step-section">
                      <h3 className="add-apartment-section-title">Included Features <span aria-hidden="true">*</span></h3>
                      <p className="add-apartment-section-description">Select the amenities and utilities included in the base rent price.</p>
                      <div className="add-apartment-choice-grid add-apartment-included-features-grid">
                        {INCLUDED_FEATURES.map((feature) => {
                const selected = includedFeatureIsSelected(feature);
                return <button key={feature.label} type="button" aria-pressed={selected} onClick={() => toggleIncludedFeature(feature)} className={`add-apartment-choice ${selected ? "is-selected" : ""}`}>{feature.label}</button>;
            })}
                      </div>
                      <p className="add-apartment-other-label">Other included feature <span>(optional)</span></p>
                      <div className="add-apartment-add-choice"><Input value={customAmenityInput} onChange={(event) => setCustomAmenityInput(event.target.value)} placeholder="Type a feature and press Enter" onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), appendCommaValue(setAmenitiesInput, customAmenityInput, setCustomAmenityInput))}/><Button type="button" onClick={() => appendCommaValue(setAmenitiesInput, customAmenityInput, setCustomAmenityInput)}>Add</Button></div>
                      <AddedChoiceTags values={getCustomChoiceValues(amenitiesInput, INCLUDED_AMENITIES)} label="included feature" onRemove={(value) => removeCommaValue(setAmenitiesInput, value)}/>
                      <AddedChoiceTags values={getCustomChoiceValues(utilitiesInput, INCLUDED_UTILITIES)} label="included utility" onRemove={(value) => removeCommaValue(setUtilitiesInput, value)}/>
                    </section>

                    <section className="add-apartment-step-section">
                      <h3 className="add-apartment-section-title">House Rules <span aria-hidden="true">*</span></h3>
                      <p className="add-apartment-section-description">Specify the rules and restrictions for tenants.</p>
                      <div className="add-apartment-choice-grid add-apartment-house-rules-grid">
                        {DISPLAY_HOUSE_RULES.map((rule) => {
                const selected = houseRules.some((item) => item.toLowerCase() === rule.toLowerCase());
                return <button type="button" key={rule} aria-pressed={selected} onClick={() => setHouseRules((current) => selected ? current.filter((item) => item.toLowerCase() !== rule.toLowerCase()) : [...current, rule])} className={`add-apartment-choice ${selected ? "is-selected" : ""}`}>{rule}</button>;
            })}
                      </div>
                      <p className="add-apartment-other-label">Other rule <span>(optional)</span></p>
                      <div className="add-apartment-add-choice"><Input value={customRuleInput} onChange={(event) => setCustomRuleInput(event.target.value)} placeholder="Type a rule and press Enter" onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addCustomHouseRule())}/><Button type="button" onClick={addCustomHouseRule}>Add</Button></div>
                      <AddedChoiceTags values={houseRules.filter((rule) => !DISPLAY_HOUSE_RULES.some((suggested) => suggested.toLowerCase() === rule.toLowerCase()))} label="rule" onRemove={(value) => setHouseRules((current) => current.filter((rule) => rule.toLowerCase() !== value.toLowerCase()))}/>
                    </section>

                    <section className="add-apartment-step-section add-apartment-contract-section">
                      <h3 className="add-apartment-section-title">Contract Duration <span aria-hidden="true">*</span></h3>
                      <p className="add-apartment-section-description">Select the rental contract duration required for this apartment.</p>
                      <div className="add-apartment-choice-grid add-apartment-contract-grid">
                        {CONTRACT_DURATIONS.map((duration) => <button key={duration} type="button" aria-pressed={contractDuration === duration} onClick={() => { setContractDuration(duration); clearValidationError("contractDuration"); }} className={`add-apartment-choice ${contractDuration === duration ? "is-selected" : ""}`}>{duration}</button>)}
                      </div>
                      <FieldError field="contractDuration"/>
                    </section>
                  </div>
                  <section className="add-apartment-panel-8 add-apartment-choice-section">
                    <div className="add-apartment-row-6"><h3>Amenities</h3></div>
                    <p className="add-apartment-text-5">Select the available amenities for the apartment listing.</p>
                    <div className="add-apartment-choice-grid add-apartment-amenity-grid">
                      {SUGGESTED_AMENITIES.map((amenity) => {
                const selected = getSubmittedAmenities().some((item) => item.toLowerCase() === amenity.toLowerCase());
                return <button key={amenity} type="button" onClick={() => toggleCommaValue(setAmenitiesInput, amenity)} className={`add-apartment-choice ${selected ? "is-selected" : ""}`}>{amenity}</button>;
            })}
                    </div>
                    <p className="add-apartment-other-label">Other amenity (optional)</p>
                    <div className="add-apartment-add-choice"><Input value={customAmenityInput} onChange={(event) => setCustomAmenityInput(event.target.value)} placeholder="Type an amenity and press Enter" onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), appendCommaValue(setAmenitiesInput, customAmenityInput, setCustomAmenityInput))}/><Button type="button" onClick={() => appendCommaValue(setAmenitiesInput, customAmenityInput, setCustomAmenityInput)}>Add</Button></div>
                    <AddedChoiceTags values={getCustomChoiceValues(amenitiesInput, SUGGESTED_AMENITIES)} label="amenity" onRemove={(value) => removeCommaValue(setAmenitiesInput, value)}/>
                    <FieldError field="amenities"/>
                  </section>

                  <section className="add-apartment-panel-8 add-apartment-choice-section">
                    <div className="add-apartment-row-6"><h3>Utilities Included</h3></div>
                    <p className="add-apartment-text-5">Select which operational utilities are included in the base rent price.</p>
                    <div className="add-apartment-choice-grid add-apartment-utility-grid">
                      {["Water", "Electricity", "Internet", "Gas", "Other"].map((utility) => {
                const selected = String(utilitiesInput).split(",").some((item) => item.trim().toLowerCase() === utility.toLowerCase());
                return <button key={utility} type="button" onClick={() => toggleCommaValue(setUtilitiesInput, utility)} className={`add-apartment-choice ${selected ? "is-selected" : ""}`}>{utility}</button>;
            })}
                    </div>
                    <p className="add-apartment-other-label">Other utility (optional)</p>
                    <div className="add-apartment-add-choice"><Input value={customUtilityInput} onChange={(event) => setCustomUtilityInput(event.target.value)} placeholder="Type a utility and press Enter" onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), appendCommaValue(setUtilitiesInput, customUtilityInput, setCustomUtilityInput))}/><Button type="button" onClick={() => appendCommaValue(setUtilitiesInput, customUtilityInput, setCustomUtilityInput)}>Add</Button></div>
                    <AddedChoiceTags values={getCustomChoiceValues(utilitiesInput, ["Water", "Electricity", "Internet", "Gas", "Other"])} label="utility" onRemove={(value) => removeCommaValue(setUtilitiesInput, value)}/>
                  </section>

                  <section className="add-apartment-panel-8 add-apartment-choice-section">
                    <div className="add-apartment-row-6"><h3>House Rules &amp; Policies</h3></div>
                    <p className="add-apartment-text-5">Specify conditions for tenants for boarding houses and apartments.</p>
                    <div className="add-apartment-choice-grid add-apartment-rules-grid">
                      {SUGGESTED_HOUSE_RULES.map((rule) => {
                const selected = houseRules.includes(rule);
                return <button type="button" key={rule} onClick={() => setHouseRules((current) => selected ? current.filter((item) => item !== rule) : [...current, rule])} className={`add-apartment-choice ${selected ? "is-selected" : ""}`}>{rule}</button>;
            })}
                    </div>
                    <p className="add-apartment-other-label">Other rule (optional)</p>
                    <div className="add-apartment-add-choice"><Input value={customRuleInput} onChange={(event) => setCustomRuleInput(event.target.value)} placeholder="Type a rule and press Enter" onKeyDown={(event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomHouseRule();
                }
            }}/><Button type="button" onClick={addCustomHouseRule}>Add</Button></div>
                    <AddedChoiceTags values={houseRules.filter((rule) => !SUGGESTED_HOUSE_RULES.some((suggested) => suggested.toLowerCase() === rule.toLowerCase()))} label="rule" onRemove={(value) => setHouseRules((current) => current.filter((rule) => rule.toLowerCase() !== value.toLowerCase()))}/>
                  </section>
                </>)}

              <div className="add-apartment-row-10">
                {currentStep > 1 ? (<Button type="button" variant="outline" onClick={handlePrevStep} className="add-apartment-previous">
                    <ArrowLeft className="add-apartment-arrow-left-icon"/> Previous
                  </Button>) : (<Button type="button" variant="outline" onClick={() => navigate(-1)} className="add-apartment-cancel">
                    {currentStep === 1 ? <><ArrowLeft className="add-apartment-arrow-left-icon"/> Previous</> : "Cancel"}
                  </Button>)}

                {currentStep < totalSteps ? (<Button type="button" onClick={handleNextStep} className="add-apartment-next">
                    {currentStep === 1 ? "Submit" : <>Next <ArrowRight className="add-apartment-arrow-right-icon"/></>}
                  </Button>) : (<Button type="submit" disabled={isSubmitting || locationResolving} className="add-apartment-button-14">
                    {isSubmitting ? "Submitting..." : locationResolving ? "Finding location..." : "Submit"}
                  </Button>)}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {pendingDraft && (<div className="add-apartment-overlay" role="dialog" aria-modal="true" aria-labelledby="draft-dialog-title">
          <div className="add-apartment-card-10">
            <div className="add-apartment-row-11">
              <span className="add-apartment-row-12">
                <CloudUpload className="add-apartment-cloud-upload-icon-2"/>
              </span>
              <div className="add-apartment-panel-12">
                <h2 id="draft-dialog-title" className="add-apartment-draft-dialog-title">Continue your apartment draft?</h2>
                <p className="add-apartment-saved">
                  Saved {new Date(pendingDraft.savedAt).toLocaleString("en-PH")}. You can resume your saved apartment details or start over.
                </p>
              </div>
            </div>
            {pendingDraft.requiresImageReupload && (<div className="add-apartment-card-11">
                <Upload className="add-apartment-upload-icon-4"/>
                Please re-upload images before submitting.
              </div>)}
            <div className="add-apartment-grid-8">
              <Button type="button" onClick={continueDraft} className="add-apartment-continue-draft">
                Continue Draft
              </Button>
              <Button type="button" variant="outline" onClick={() => discardDraft(true)} className="add-apartment-discard-draft-2">
                Discard Draft
              </Button>
            </div>
          </div>
        </div>)}
      {guidelinesOpen && draftReady && !pendingDraft && (
        <PropertyGuidelines
          onAccept={dismissGuidelines}
          onClose={() => {
                dismissGuidelines();
                navigate("/landlord/dashboard?section=overview");
            }}
        />
      )}
            </div>
        </main>
      </div>
    </div>);
}

function AddedChoiceTags({ values, label, onRemove }) {
    if (values.length === 0)
        return null;
    return (<div className="add-apartment-added-choice-tags" aria-label={`Added ${label}s`}>
      {values.map((value) => (<span key={value.toLowerCase()} className="add-apartment-added-choice-tag">
          {value}
          <button type="button" onClick={() => onRemove(value)} aria-label={`Remove ${value}`} title={`Remove ${value}`}>
            <X aria-hidden="true"/>
          </button>
        </span>))}
    </div>);
}
