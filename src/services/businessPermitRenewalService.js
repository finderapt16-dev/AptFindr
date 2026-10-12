import { supabase } from "@/services/supabaseClient";
import { safeRandomId } from "@/utils/safeRandomId";

const MANILA_TIME_ZONE = "Asia/Manila";

const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});

const manilaYear = (date = new Date()) => Number(new Intl.DateTimeFormat("en", {
    year: "numeric",
    timeZone: MANILA_TIME_ZONE,
}).format(date));

export function getRenewalPermitYear(permit, now = new Date()) {
    const currentYear = manilaYear(now);
    const expiry = permit?.permitExpiry || permit?.expiresAt || permit?.expires_at;
    const expiryDate = expiry ? new Date(expiry) : null;
    if (expiryDate && !Number.isNaN(expiryDate.getTime())) {
        // The database stores the exclusive Jan 1 cutoff for a Dec 31 deadline.
        // Step back one second to derive the permit cycle year from that cutoff.
        const expiryYear = manilaYear(new Date(expiryDate.getTime() - 1000));
        return expiryYear >= currentYear ? expiryYear + 1 : currentYear;
    }
    const explicitYear = Number(permit?.permitYear ?? permit?.permit_year);
    if (Number.isInteger(explicitYear) && explicitYear >= currentYear) return explicitYear + 1;
    return currentYear;
}

const safeExtension = (file) => {
    const extension = file?.name?.split(".").pop()?.toLowerCase();
    if (extension && ["jpg", "jpeg", "png", "pdf"].includes(extension)) return extension;
    if (file?.type === "application/pdf") return "pdf";
    if (file?.type === "image/png") return "png";
    return "jpg";
};

const signPermitDocument = async (path) => {
    if (!path || typeof path !== "string") return "";
    if (/^https?:\/\//i.test(path)) return path;
    const { data } = await supabase.storage.from("verification-documents").createSignedUrl(path, 15 * 60);
    return data?.signedUrl ?? "";
};

export async function submitBusinessPermitUpdate({ landlordId, apartmentId, permit, permitYear, permitNumber, businessAccount, issuedAt, files }) {
    void businessAccount;
    const file = files?.[0];
    if (!file) throw new Error("Upload a business permit document.");
    const submissionId = safeRandomId();
    const explicitPermitYear = Number(permitYear);
    const targetPermitYear = Number.isInteger(explicitPermitYear) && explicitPermitYear >= 2000
        ? explicitPermitYear
        : getRenewalPermitYear(permit);
    const extension = safeExtension(file);
    const path = `${landlordId}/${apartmentId || "renewals"}/renewal-${targetPermitYear}-${submissionId}.${extension}`;
    try {
        const { error: uploadError } = await supabase.storage.from("verification-documents").upload(path, file, {
            contentType: file.type,
            upsert: false,
        });
        if (uploadError) throw new Error(uploadError.message || "Unable to upload the permit.");

        const { data, error } = await supabase.rpc("fn_submit_business_permit_renewal", {
            p_permit_number: permitNumber.trim(),
            p_permit_year: targetPermitYear,
            p_permit_issued_at: issuedAt,
            p_document_path: path,
            p_document_name: file.name,
        });
        if (error) throw new Error(error.message || "Unable to submit the permit for review.");
        return data;
    } catch (error) {
        await supabase.storage.from("verification-documents").remove([path]);
        throw error;
    }
}

export async function fetchBusinessPermitMonitoring() {
    const { data, error } = await supabase.rpc("fn_get_business_permit_monitoring");
    if (error) throw new Error(error.message || "Unable to load business permit monitoring.");

    const payload = asObject(data);
    const pendingRenewals = await Promise.all(asArray(payload.pendingRenewals).map(async (renewal) => ({
        ...renewal,
        documentUrl: await signPermitDocument(renewal.document_path),
    })));

    return {
        summary: asObject(payload.summary),
        landlordPermits: asArray(payload.landlordPermits),
        affectedApartments: asArray(payload.affectedApartments),
        pendingRenewals,
    };
}

export async function reviewBusinessPermitRenewal({ renewalId, decision, adminNote = "" }) {
    const { data, error } = await supabase.rpc("fn_review_business_permit_renewal", {
        p_renewal_id: renewalId,
        p_decision: decision,
        p_admin_note: adminNote || null,
    });
    if (error) throw new Error(error.message || "Unable to review this business permit renewal.");
    return data;
}

export async function hasValidBusinessPermit(landlordId) {
    if (!landlordId) return false;
    const { data, error } = await supabase.rpc("fn_landlord_has_valid_business_permit", {
        p_landlord_id: landlordId,
    });
    if (error) {
        if (["42883", "PGRST202"].includes(error.code)) {
            console.warn("Business permit validity RPC is not installed yet; skipping permit publication guard.");
            return true;
        }
        throw new Error(error.message || "Unable to verify the landlord's business permit.");
    }
    return data === true;
}
