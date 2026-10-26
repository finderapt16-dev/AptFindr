export function getReportDeadlineNotice(report, now = Date.now()) {
    const status = String(report?.status ?? "").toLowerCase().replace(/[ -]/g, "_");
    if (status === "evidence_deadline_expired") return {
        label: "7-day evidence deadline reached",
        message: "The landlord did not submit the requested evidence within seven days. A final admin decision is required.",
    };
    const deadline = Date.parse(report?.appeal_deadline ?? "");
    if (status === "appeal_period_expired" || (
        ["awaiting_landlord_appeal", "waiting_response", "awaiting_response"].includes(status)
        && Number.isFinite(deadline) && Number(now) >= deadline
    )) return {
        label: "7-day appeal deadline reached",
        message: "The landlord did not appeal within seven days. Review this report and make the final listing decision.",
    };
    return null;
}

export function formatReportDeadline(value) {
    if (!value || !Number.isFinite(Date.parse(value))) return "";
    return new Date(value).toLocaleString("en-PH", {
        timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit",
    });
}
