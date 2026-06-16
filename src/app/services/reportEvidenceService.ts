/**
 * Report Evidence Service
 * Handles:
 * - Evidence file uploads to Supabase Storage
 * - Creating report evidence records
 * - Duplicate report detection
 * - Report audit logging
 * - Anti-abuse measures
 */

import { supabase } from "@/lib/supabaseclient";

export interface ReportEvidenceInput {
  reportId: string;
  file: File | Blob;
  fileName: string;
  fileType: "image" | "document" | "screenshot";
  mimeType: string;
  uploadedBy: string;
}

export interface DuplicateCheckInput {
  reporterId: string;
  apartmentId: string;
  issueType: string;
}

export interface ReportAuditLogInput {
  reportId: string;
  adminId?: string | null;
  action: string;
  description?: string | null;
  changes?: Record<string, any>;
}

/**
 * Upload evidence file to Supabase Storage and create record in report_evidence table
 */
export async function uploadReportEvidence(
  input: ReportEvidenceInput
): Promise<{ id: string; url: string } | null> {
  try {
    // Upload file to storage bucket
    const fileExt = input.fileName.split(".").pop();
    const fileName = `${input.reportId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const bucketPath = `report-evidence/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("report-evidence")
      .upload(bucketPath, input.file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError || !uploadData) {
      console.error("Storage upload error:", uploadError);
      return null;
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from("report-evidence")
      .getPublicUrl(uploadData.path);

    if (!publicUrl.publicUrl) {
      return null;
    }

    // Create record in report_evidence table
    const { data, error } = await supabase.from("report_evidence").insert({
      report_id: input.reportId,
      file_name: input.fileName,
      file_url: publicUrl.publicUrl,
      file_type: input.fileType,
      mime_type: input.mimeType,
      file_size: input.file.size,
      uploaded_by: input.uploadedBy,
    });

    if (error) {
      console.error("Evidence record creation error:", error);
      return null;
    }

    return {
      id: uploadData.path,
      url: publicUrl.publicUrl,
    };
  } catch (error) {
    console.error("Error uploading report evidence:", error);
    return null;
  }
}

/**
 * Check if reporter has submitted a similar report recently (within 7 days)
 */
export async function checkDuplicateReport(
  input: DuplicateCheckInput
): Promise<{ isDuplicate: boolean; message?: string }> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("report_duplicate_check")
      .select("*")
      .eq("reporter_id", input.reporterId)
      .eq("apartment_id", input.apartmentId)
      .eq("issue_type", input.issueType)
      .gte("submitted_at", sevenDaysAgo.toISOString())
      .order("submitted_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Duplicate check error:", error);
      return { isDuplicate: false };
    }

    if (data && data.length > 0) {
      const lastReport = new Date(data[0].submitted_at);
      const daysAgo = Math.floor((Date.now() - lastReport.getTime()) / (1000 * 60 * 60 * 24));
      return {
        isDuplicate: true,
        message: `You've already reported this issue ${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago. Please wait before submitting a similar report.`,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error("Error checking duplicate reports:", error);
    return { isDuplicate: false };
  }
}

/**
 * Create an audit log entry for a report action
 */
export async function createReportAuditLog(
  input: ReportAuditLogInput
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("report_audit_log")
      .insert({
        report_id: input.reportId,
        admin_id: input.adminId || null,
        action: input.action,
        description: input.description || null,
        changes: input.changes || {},
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Audit log creation error:", error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error("Error creating audit log:", error);
    return null;
  }
}

/**
 * Get all evidence for a report
 */
export async function getReportEvidence(reportId: string) {
  try {
    const { data, error } = await supabase
      .from("report_evidence")
      .select("*")
      .eq("report_id", reportId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Get evidence error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching report evidence:", error);
    return [];
  }
}

/**
 * Get audit log for a report
 */
export async function getReportAuditLog(reportId: string) {
  try {
    const { data, error } = await supabase
      .from("report_audit_log")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get audit log error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching audit log:", error);
    return [];
  }
}

/**
 * Mark a report as reviewed by admin
 */
export async function markReportAsReviewed(
  reportId: string,
  adminId: string,
  notes?: string
): Promise<boolean> {
  try {
    // Update report status
    const { error: updateError } = await supabase
      .from("reports")
      .update({
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        last_action_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (updateError) {
      console.error("Update error:", updateError);
      return false;
    }

    // Create audit log entry
    await createReportAuditLog({
      reportId,
      adminId,
      action: "reviewed",
      description: notes || "Report reviewed by admin",
    });

    return true;
  } catch (error) {
    console.error("Error marking report as reviewed:", error);
    return false;
  }
}

/**
 * Create a landlord response to a report
 */
export async function createReportResponse(input: {
  reportId: string;
  respondentId: string;
  responseText: string;
  responseType?: "appeal" | "clarification";
}): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("report_responses")
      .insert({
        report_id: input.reportId,
        respondent_id: input.respondentId,
        response_text: input.responseText,
        response_type: input.responseType || "appeal",
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Response creation error:", error);
      return null;
    }

    // Create audit log
    await createReportAuditLog({
      reportId: input.reportId,
      action: "response_received",
      description: `${input.responseType || "appeal"} response submitted`,
    });

    return data.id;
  } catch (error) {
    console.error("Error creating response:", error);
    return null;
  }
}

/**
 * Get report responses
 */
export async function getReportResponses(reportId: string) {
  try {
    const { data, error } = await supabase
      .from("report_responses")
      .select("*")
      .eq("report_id", reportId)
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Get responses error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching responses:", error);
    return [];
  }
}

/**
 * Download evidence file (triggers download in browser)
 */
export async function downloadEvidenceFile(fileUrl: string, fileName: string): Promise<void> {
  try {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error downloading file:", error);
  }
}

/**
 * Escalate a report to higher severity
 */
export async function escalateReport(
  reportId: string,
  adminId: string,
  newSeverity: "low" | "med" | "high"
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("reports")
      .update({
        severity: newSeverity,
        last_action_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (error) {
      console.error("Escalation error:", error);
      return false;
    }

    await createReportAuditLog({
      reportId,
      adminId,
      action: "escalated",
      description: `Report escalated to ${newSeverity} severity`,
      changes: { severity: newSeverity },
    });

    return true;
  } catch (error) {
    console.error("Error escalating report:", error);
    return false;
  }
}
