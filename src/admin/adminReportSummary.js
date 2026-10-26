// Dashboard and Reports count the same non-archived report records.
// Search, pagination, and status filters affect table rows, not these totals.
export function getAdminReportStatus(report) {
    const status = String(report?.status ?? "pending").trim().toLowerCase().replace(/[ -]/g, "_");
    if (["dismissed", "rejected"].includes(status)) return "dismissed";
    if (["resolved", "closed", "approved", "completed", "resolved_appeal_approved"].includes(status)) return "resolved";
    if (["awaiting_landlord_appeal", "in_progress", "waiting_response", "awaiting_response", "under_appeal", "appeal_period_expired", "evidence_deadline_expired", "appeal_dismissed_pending_final_decision"].includes(status)) return "waiting_response";
    return "under_review";
}

export function getAdminReportSummary(reports = []) {
    const activeReports = reports.filter(report => report.is_archived !== true);
    const summary = { activeReports, total: activeReports.length, under_review: 0, waiting_response: 0, resolved: 0, dismissed: 0 };
    for (const report of activeReports) summary[getAdminReportStatus(report)] += 1;
    return summary;
}
