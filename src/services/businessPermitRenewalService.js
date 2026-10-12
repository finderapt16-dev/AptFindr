import { supabase } from "@/services/supabaseClient";
import { safeRandomId } from "@/utils/safeRandomId";

export async function submitBusinessPermitUpdate({ landlordId, apartmentId, permitNumber, businessAccount, issuedAt, files }) {
    const submissionId = safeRandomId();
    const documents = [];
    try {
        for (const file of files) {
            const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
            const path = `${landlordId}/${apartmentId || "renewals"}/renewal-${submissionId}-${documents.length}.${extension}`;
            const { error } = await supabase.storage.from("verification-documents").upload(path, file, { contentType: file.type, upsert: false });
            if (error) throw new Error(error.message || "Unable to upload the permit.");
            documents.push({ path, name: file.name, size: file.size, mimeType: file.type });
        }
        const currentYear = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Shanghai" }).format(new Date()));
        const { data, error } = await supabase.rpc("fn_submit_business_permit_update", {
            p_permit_number: permitNumber.trim(), p_business_account_number: businessAccount.trim(),
            p_permit_year: currentYear, p_permit_issued_at: issuedAt,
            p_apartment_id: apartmentId || null, p_documents: documents,
        });
        if (error) throw new Error(error.message || "Unable to submit the permit for review.");
        return data;
    } catch (error) {
        if (documents.length) await supabase.storage.from("verification-documents").remove(documents.map(document => document.path));
        throw error;
    }
}
