import { supabase } from "@/services/supabaseClient";
export const VERIFICATION_DOCUMENT_TYPES = [
    { key: "proof_of_ownership", label: "Proof of Ownership or Authority" },
    { key: "business_registration", label: "Business Registration" },
    { key: "barangay_clearance", label: "Barangay Clearance" },
    { key: "mayors_business_permit", label: "Mayor’s / Business Permit" },
    { key: "bir_registration", label: "BIR Registration" },
    { key: "fire_safety_certificate", label: "Fire Safety Inspection Certificate" },
    { key: "occupancy_permit", label: "Occupancy Permit" },
    { key: "building_permit", label: "Building Permit" },
    { key: "sanitary_permit", label: "Sanitary Permit" },
    { key: "environmental_compliance", label: "Environmental / Waste Management Compliance" },
    { key: "rental_documents", label: "Rental Documents" },
    { key: "safety_requirements", label: "Safety Requirements" },
    { key: "additional_supporting_documents", label: "Additional Supporting Documents" },
];
export const BUSINESS_PERMIT_DOCUMENT_TYPE = "mayors_business_permit";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
export function validateVerificationFile(file) {
    if (!ALLOWED_TYPES.has(file.type))
        return "Use a JPG, JPEG, PNG, WebP, or PDF file.";
    if (file.size > MAX_FILE_SIZE)
        return "The file must be 10 MB or smaller.";
    return null;
}
const safeExtension = (file) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension && ["jpg", "jpeg", "png", "webp", "pdf"].includes(extension))
        return extension;
    return file.type === "application/pdf" ? "pdf" : "jpg";
};
export async function uploadVerificationDocuments(apartmentId, landlordId, documents) {
    const uploadedDocuments = [];
    for (const document of documents) {
        const validationError = validateVerificationFile(document.file);
        if (validationError)
            throw new Error(`${document.file.name}: ${validationError}`);
        const { data: previousRow } = await supabase
            .from("apartment_verification_documents")
            .select("storage_path")
            .eq("apartment_id", apartmentId)
            .eq("document_type", document.type)
            .maybeSingle();
        const previousPath = typeof previousRow?.storage_path === "string" ? previousRow.storage_path : null;
        const path = `${landlordId}/${apartmentId}/${document.type}-${Date.now()}.${safeExtension(document.file)}`;
        const { error: uploadError } = await supabase.storage.from("verification-documents").upload(path, document.file, {
            cacheControl: "3600",
            contentType: document.file.type,
            upsert: false,
        });
        if (uploadError)
            throw new Error(uploadError.message || "Unable to upload a verification document.");
        const { error: rowError } = await supabase.from("apartment_verification_documents").upsert({
            apartment_id: apartmentId,
            landlord_id: landlordId,
            document_type: document.type,
            file_name: document.file.name,
            mime_type: document.file.type,
            storage_path: path,
            updated_at: new Date().toISOString(),
        }, { onConflict: "apartment_id,document_type" });
        if (rowError) {
            await supabase.storage.from("verification-documents").remove([path]);
            throw new Error(rowError.message || "Unable to save verification document details.");
        }
        if (previousPath && previousPath !== path) {
            await supabase.storage.from("verification-documents").remove([previousPath]);
        }
        uploadedDocuments.push({
            apartmentId: String(apartmentId),
            landlordId: String(landlordId),
            documentType: document.type,
            fileName: document.file.name,
            mimeType: document.file.type,
            storagePath: path,
        });
    }
    return uploadedDocuments;
}
export async function fetchApartmentVerificationDocuments(apartmentId) {
    const { data, error } = await supabase
        .from("apartment_verification_documents")
        .select("*")
        .eq("apartment_id", apartmentId)
        .order("created_at", { ascending: true });
    if (error)
        throw new Error(error.message || "Unable to load verification documents.");
    return Promise.all((data ?? []).map(async (row) => {
        const { data: signed } = await supabase.storage
            .from("verification-documents")
            .createSignedUrl(String(row.storage_path), 15 * 60);
        return {
            id: String(row.id),
            apartmentId: String(row.apartment_id),
            landlordId: String(row.landlord_id),
            documentType: row.document_type,
            fileName: String(row.file_name),
            mimeType: String(row.mime_type),
            storagePath: String(row.storage_path),
            previewUrl: signed?.signedUrl ?? "",
            createdAt: row.created_at ? String(row.created_at) : undefined,
            updatedAt: row.updated_at ? String(row.updated_at) : undefined,
        };
    }));
}
export async function removeVerificationDocument(document) {
    const { error: deleteError } = await supabase
        .from("apartment_verification_documents")
        .delete()
        .eq("id", document.id);
    if (deleteError)
        throw new Error(deleteError.message || "Unable to remove the document.");
    const { error: storageError } = await supabase.storage.from("verification-documents").remove([document.storagePath]);
    if (storageError)
        throw new Error(storageError.message || "Unable to remove the stored file.");
}

async function getAuthenticatedLandlordAccountId() {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError)
        throw new Error(authError.message || "Unable to verify your session.");
    const authId = authData.user?.id;
    if (!authId)
        throw new Error("Sign in to view business permit information.");

    // `apartments.landlord_id` references the AptFindr account ID, while
    // Supabase Auth identifies the current session with `auth_id`. Resolve the
    // former from the authenticated session instead of accepting an ID from UI
    // state, which also handles legacy accounts where both IDs are the same.
    let { data: account, error } = await supabase
        .from("app_users")
        .select("id, role")
        .eq("auth_id", authId)
        .maybeSingle();
    if (!account && !error) {
        const legacyResult = await supabase
            .from("app_users")
            .select("id, role")
            .eq("id", authId)
            .maybeSingle();
        account = legacyResult.data;
        error = legacyResult.error;
    }
    if (error)
        throw new Error(error.message || "Unable to identify the signed-in landlord.");
    if (!account || String(account.role).toLowerCase() !== "landlord")
        throw new Error("Only the signed-in landlord can view business permit information.");
    return String(account.id);
}

export async function fetchLandlordBusinessPermits() {
    const landlordId = await getAuthenticatedLandlordAccountId();
    const [propertiesResult, documentsResult] = await Promise.all([
        supabase.from("apartments").select("id, landlord_id, title, features").eq("landlord_id", landlordId).order("created_at", { ascending: false }),
        supabase.from("apartment_verification_documents").select("id, apartment_id, landlord_id, file_name, storage_path, created_at").eq("landlord_id", landlordId).eq("document_type", BUSINESS_PERMIT_DOCUMENT_TYPE).order("created_at", { ascending: false }),
    ]);
    if (propertiesResult.error) throw new Error(propertiesResult.error.message);
    if (documentsResult.error) throw new Error(documentsResult.error.message);
    const properties = propertiesResult.data ?? [];
    const documents = documentsResult.data ?? [];

    // Do not trust a document's landlord_id alone. A permit is visible only
    // when its apartment was fetched as owned by this authenticated landlord.
    const ownedProperties = properties.filter(property => String(property.landlord_id) === landlordId);
    const entries = ownedProperties.flatMap(property => {
        const verification = property.features?.verification ?? {};
        const propertyDocuments = documents.filter(document => String(document.apartment_id) === String(property.id) && String(document.landlord_id) === landlordId);
        if (!propertyDocuments.length && !verification.businessPermit) return [];
        return (propertyDocuments.length ? propertyDocuments : [null]).map(document => ({
            id: String(document?.id ?? property.id),
            apartmentId: String(property.id),
            businessName: verification.businessName || verification.propertyName || property.title || "",
            apartmentName: property.title || verification.propertyName || "",
            businessAccount: verification.businessAccount || "",
            permitNumber: verification.businessPermit || "",
            issuedAt: verification.dateIssued || verification.issuedAt || "",
            permitExpiry: verification.permitExpiry || "",
            fileName: document?.file_name || "",
            // File-size columns differ across existing deployments. The permit
            // viewer already supports an unavailable size, so do not require a
            // column that is not part of the core document relationship.
            fileSize: null,
            storagePath: document?.storage_path || "",
        }));
    });
    const propertyEntries = await Promise.all(entries.map(async entry => {
        if (!entry.storagePath) return { ...entry, documentUrl: "" };
        const { data, error } = await supabase.storage.from("verification-documents").createSignedUrl(entry.storagePath, 15 * 60);
        if (error) throw new Error(error.message || "Unable to open business permit.");
        return { ...entry, documentUrl: data?.signedUrl ?? "" };
    }));
    return propertyEntries;
}
