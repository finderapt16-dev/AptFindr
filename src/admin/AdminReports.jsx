import { ReportReviewDetail } from "./ReportReviewDetail";
import "./AdminCaseList.css";
import "./AdminReports.css";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { Archive, ArrowLeft, Bell, Building2, Calendar, CheckCheck, CheckCircle2, ChevronLeft, ChevronRight, FileX, Clock, Eye, Flag, Mail, Phone, RotateCcw, Search, Trash2, User as UserIcon, X, XCircle } from "lucide-react";
import { ArchiveEmpty, formatOptionalDate, OverviewEmpty, SEVERITY_LABEL, text } from './adminDashboardHelpers';
export function AdminReports({ reports, reportArchiveView, archivedReports, reportSearch, allApartments, reportStatusFilter, reportTypeFilter, reportSort, selectedReport, selectedReportDetails, setSelectedReport, setActiveSection, unreadNotifsCount, setViewingUserProfile, navigate, apartmentDetailBasePath, portalBasePath, selectedReportEvidence, onReportUpdated, resolveReport, setDismissReportModal, setCaseAction, setReportSearch, setReportStatusFilter, setReportTypeFilter, setReportSort, setReportArchiveView, dismissReportModal, dismissReport, viewingUserProfile, }) {
    const [page, setPage] = useState(1);
    const reportStatus = (report) => {
        const status = String(report.status ?? "pending").toLowerCase().replace(/[ -]/g, "_");
        if (["pending", "open", "pending_review", "in_review", "reviewing"].includes(status))
            return "under_review";
        if (["dismissed", "rejected"].includes(status))
            return "dismissed";
        if (["awaiting_landlord_appeal", "under_appeal", "appeal_period_expired", "evidence_deadline_expired", "appeal_dismissed_pending_final_decision"].includes(status))
            return "in_progress";
        if (["resolved", "closed", "approved", "completed", "resolved_appeal_approved"].includes(status))
            return "resolved";
        return "under_review";
    };
    const reportSource = reportArchiveView ? archivedReports : reports;
    const normalizedSearch = reportSearch.trim().toLowerCase();
    const getReportApartment = (report) => allApartments.find((apartment) => String(apartment.id) === String(report.apartmentId ?? report.apartment_id));
    const getReportApartmentTitle = (report) => report.apartment_title ?? report.apartment ?? getReportApartment(report)?.title ?? "Apartment unavailable";
    const getReporterLabel = (report) => report.reporter_name ?? report.reporter ?? "Reporter unavailable";
    const visibleReports = reportSource.filter((report) => {
        const statusFilter = ["pending", "open"].includes(reportStatusFilter)
            ? "under_review"
            : reportStatusFilter;
        const matchesStatus = reportArchiveView || statusFilter === "all" || reportStatus(report) === statusFilter;
        const matchesSearch = !normalizedSearch || [getReportApartmentTitle(report), getReporterLabel(report), report.issueType, report.issue_type, report.category, report.details, report.id, getReportApartment(report)?.landlordName]
            .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
        return matchesStatus && matchesSearch;
    }).sort((left, right) => new Date(right.submittedAt ?? right.submitted_at ?? right.created_at ?? 0) - new Date(left.submittedAt ?? left.submitted_at ?? left.created_at ?? 0));
    useEffect(() => { setPage(1); }, [reportSearch, reportStatusFilter, reportArchiveView]);
    const pageSize = 5;
    const pageCount = Math.max(1, Math.ceil(visibleReports.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const visiblePageNumbers = [Math.max(1, Math.min(currentPage - 1, pageCount - 1)), Math.max(1, Math.min(currentPage - 1, pageCount - 1)) + 1].filter((number) => number <= pageCount);
    const pageReports = visibleReports.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const summaryCards = [
        { label: "Total Reports", value: reports.length, note: "All submitted reports", icon: FileX, tone: "total", filterValue: "all" },
        { label: "Under Review", value: reports.filter((report) => reportStatus(report) === "under_review").length, note: "Currently investigating", icon: Eye, tone: "review", filterValue: "under_review" },
        { label: "Resolved", value: reports.filter((report) => reportStatus(report) === "resolved").length, note: "Closed cases", icon: CheckCircle2, tone: "resolved", filterValue: "resolved" },
        { label: "Dismissed", value: reports.filter((report) => reportStatus(report) === "dismissed").length, note: "Closed without action", icon: XCircle, tone: "dismissed", filterValue: "dismissed" },
    ];
    const currentDate = new Date().toLocaleDateString("en-PH", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
    if (selectedReport) {
        const listedApartment = getReportApartment(selectedReport);
        const reportApartment = listedApartment ? { ...selectedReportDetails?.apartment, ...listedApartment } : selectedReportDetails?.apartment;
        return <ReportReviewDetail key={selectedReport.id} report={selectedReport} apartment={reportApartment} details={selectedReportDetails} evidence={selectedReportEvidence} onBack={() => setSelectedReport(null)} onViewApartment={() => reportApartment?.id && navigate(`${apartmentDetailBasePath}/${reportApartment.id}`, { state: { returnTo: `${portalBasePath}?section=reports`, backLabel: "Back to Reports" } })} onUpdated={onReportUpdated} resolveReport={resolveReport} dismissReport={dismissReport} archived={reportArchiveView} onArchive={() => setCaseAction({ type: "archive-report", id: text(selectedReport.id), label: getReportApartmentTitle(selectedReport) })}/>;
    }
    return (<div className="reports-reference admin-case-list">
      <header className="reports-reference-header"><h1>Report</h1><p>Review and manage reports submitted by tenants regarding apartment listings.</p></header>
      <div className="reports-reference-stats" aria-label="Report status filters">{summaryCards.map(({ label, value, note, icon: Icon, tone, filterValue }) => {
        const active = !reportArchiveView && (["pending", "open"].includes(reportStatusFilter) ? "under_review" : reportStatusFilter) === filterValue;
        return <button type="button" key={label} className={`reports-reference-stat ${active ? "is-active" : ""}`} aria-pressed={active} onClick={() => { setReportArchiveView(false); setReportStatusFilter(filterValue); setPage(1); }}><span className={`reports-reference-stat-icon is-${tone}`}><Icon aria-hidden="true"/></span><span><strong>{value} {label}</strong><span className="reports-reference-stat-note">{note}</span></span></button>;
      })}</div>
      <div className="reports-reference-filters">
        <label className="reports-reference-search"><Search aria-hidden="true"/><input aria-label="Search reports" value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search landlords"/></label>
      </div>
      <div className="reports-reference-table-wrap"><table className="reports-reference-table">
        <thead><tr>{["Apartment", "Reported By", "Issue", "Date Submitted", "Status", "Actions"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{pageReports.map((report) => {
          const apartment = getReportApartment(report);
          const status = reportStatus(report);
            const statusLabel = { under_review: "Pending Admin Review", in_progress: "Appeal / Final Review", resolved: "Resolved", dismissed: "Dismissed" }[status];
          return <tr key={report.id}>
            <td><strong>{getReportApartmentTitle(report)}</strong><p>{apartment ? formatApartmentLocation(apartment) || "Location not provided" : report.apartment_address || "Location not provided"}</p></td>
            <td><strong className="reports-reference-reporter">{getReporterLabel(report)}</strong><p className="reports-reference-role">{report.reporter_role ?? report.role ?? "Tenant"}</p></td>
            <td>{report.details || report.issueType || report.issue_type || report.category || "No description provided."}</td>
            <td className="reports-reference-date">{formatOptionalDate(report.submittedAt ?? report.submitted_at ?? report.created_at, { month: "short", day: "numeric", year: "numeric" })}</td>
            <td><span className={`reports-reference-status is-${status}`}>{statusLabel}</span></td>
            <td><button className="reports-reference-review" onClick={() => setSelectedReport(report)}>{status === "under_review" ? "Review" : "View"}</button>{reportArchiveView && <div className="reports-reference-archive-actions"><button onClick={() => setCaseAction({ type: "restore-report", id: text(report.id), label: getReportApartmentTitle(report) })}>Restore</button><button onClick={() => setCaseAction({ type: "delete-report", id: text(report.id), label: getReportApartmentTitle(report) })}>Delete</button></div>}</td>
          </tr>;
        })}{pageReports.length === 0 && <tr><td colSpan={6} className="reports-reference-empty">{reports.length === 0 && !reportArchiveView ? "No reports submitted yet." : "No reports match the selected filters."}</td></tr>}</tbody>
      </table></div>
      <nav className="reports-reference-pagination" aria-label="Report pages">
        <button aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft/></button>
        {visiblePageNumbers.map((number) => <button key={number} aria-label={`Page ${number}`} aria-current={number === currentPage ? "page" : undefined} onClick={() => setPage(number)}>{number}</button>)}
        <button aria-label="Next page" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight/></button>
      </nav>

      {dismissReportModal && (<div className="admin-reports-overlay" onClick={() => setDismissReportModal(null)}>
          <div className="admin-reports-overlay-2"/>
          <div className="admin-reports-card-12" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-reports-dismiss-report-2">Dismiss Report</h3>
            <p className="admin-reports-text-28">
              Why are you dismissing this report? (Optional)
            </p>
            <textarea value={dismissReportModal.reason} onChange={(e) => setDismissReportModal({ ...dismissReportModal, reason: e.target.value })} placeholder="e.g., Investigation inconclusive, False complaint, Already resolved by landlord..." className="admin-reports-textarea" rows={4}/>
            <div className="admin-reports-row-25">
              <Button variant="outline" onClick={() => setDismissReportModal(null)} className="admin-reports-cancel">
                Cancel
              </Button>
              <Button onClick={() => {
                if (dismissReportModal.reportId) {
                    dismissReport(dismissReportModal.reportId, dismissReportModal.reason || undefined);
                }
            }} className="admin-reports-confirm-dismissal">
                Confirm Dismissal
              </Button>
            </div>
          </div>
        </div>)}

      {viewingUserProfile && (<div className="admin-reports-overlay" onClick={() => setViewingUserProfile(null)}>
          <div className="admin-reports-overlay-2"/>
          <div className="admin-reports-card-13" onClick={(e) => e.stopPropagation()}>
            <div className="admin-reports-row-26">
              <h3 className="admin-reports-user-profile">User Profile</h3>
              <button onClick={() => setViewingUserProfile(null)} className="admin-reports-button-6">
                <X className="admin-reports-x-icon"/>
              </button>
            </div>
            <div className="admin-reports-panel-17">
              <div className="admin-reports-row-3">
                <div className="admin-reports-row-27">
                  {viewingUserProfile.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="admin-reports-text-29">{viewingUserProfile.name}</p>
                  <p className="admin-reports-text-30">{viewingUserProfile.role}</p>
                </div>
              </div>
              <div className="admin-reports-panel-18">
                <div>
                  <p className="admin-reports-email">Email</p>
                  <p className="admin-reports-text-31">{viewingUserProfile.email}</p>
                </div>
                {viewingUserProfile.mobile && (<div>
                    <p className="admin-reports-phone">Phone</p>
                    <p className="admin-reports-text-31">{viewingUserProfile.mobile}</p>
                  </div>)}
                {typeof viewingUserProfile.address === "string" && viewingUserProfile.address.length > 0 && (<div>
                    <p className="admin-reports-address">Address</p>
                    <p className="admin-reports-text-31">{viewingUserProfile.address}</p>
                  </div>)}
                {viewingUserProfile.is_verified !== undefined && (<div>
                    <p className="admin-reports-verification">Verification</p>
                    <Badge className={`admin-reports-badge ${viewingUserProfile.is_verified ? "admin-reports-badge-2" : "admin-reports-badge-3"}`}>
                      {viewingUserProfile.is_verified ? "Verified" : "Pending"}
                    </Badge>
                  </div>)}
              </div>
            </div>
          </div>
        </div>)}
    </div>);
}
