import "./AdminCaseList.css";
import "./AdminReports.css";
import { useEffect, useState } from "react";
import { EvidenceViewer } from "@/admin/EvidenceViewer";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { canArchiveReportStatus } from "@/services/dashboardSupabaseService";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { Archive, ArrowLeft, Bell, Building2, Calendar, CheckCheck, CheckCircle2, ChevronLeft, ChevronRight, FileX, Clock, Eye, Flag, Mail, Phone, RotateCcw, Search, Trash2, User as UserIcon, X, XCircle } from "lucide-react";
import { ArchiveEmpty, formatOptionalDate, OverviewEmpty, SEVERITY_LABEL, text } from './adminDashboardHelpers';
export function AdminReports({ reports, reportArchiveView, archivedReports, reportSearch, allApartments, reportStatusFilter, reportTypeFilter, reportSort, selectedReport, selectedReportDetails, setSelectedReport, setActiveSection, unreadNotifsCount, setViewingUserProfile, navigate, apartmentDetailBasePath, portalBasePath, selectedReportEvidence, resolveReport, setDismissReportModal, setCaseAction, setReportSearch, setReportStatusFilter, setReportTypeFilter, setReportSort, setReportArchiveView, dismissReportModal, dismissReport, viewingUserProfile, }) {
    const [page, setPage] = useState(1);
    const reportStatus = (report) => {
        const status = String(report.status ?? "pending").toLowerCase().replace(/[ -]/g, "_");
        return status === "pending" ? "open" : ["in_review", "reviewing"].includes(status) ? "under_review" : status;
    };
    const reportSource = reportArchiveView ? archivedReports : reports;
    const normalizedSearch = reportSearch.trim().toLowerCase();
    const getReportApartment = (report) => allApartments.find((apartment) => String(apartment.id) === String(report.apartmentId ?? report.apartment_id));
    const getReportApartmentTitle = (report) => report.apartment_title ?? report.apartment ?? getReportApartment(report)?.title ?? "Apartment unavailable";
    const getReporterLabel = (report) => report.reporter_name ?? report.reporter ?? "Reporter unavailable";
    const visibleReports = reportSource.filter((report) => {
        const statusFilter = reportStatusFilter === "pending" ? "open" : reportStatusFilter;
        const matchesStatus = reportArchiveView || statusFilter === "all" || reportStatus(report) === statusFilter;
        const matchesSearch = !normalizedSearch || [getReportApartmentTitle(report), getReporterLabel(report), report.issueType, report.issue_type, report.category, report.details, report.id, getReportApartment(report)?.landlordName]
            .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
        return matchesStatus && matchesSearch;
    }).sort((left, right) => new Date(right.submittedAt ?? right.submitted_at ?? right.created_at ?? 0) - new Date(left.submittedAt ?? left.submitted_at ?? left.created_at ?? 0));
    useEffect(() => { setPage(1); }, [reportSearch, reportStatusFilter, reportArchiveView]);
    const pageCount = Math.max(1, Math.ceil(visibleReports.length / 4));
    const currentPage = Math.min(page, pageCount);
    const pageReports = visibleReports.slice((currentPage - 1) * 4, currentPage * 4);
    const summaryCards = [
        { label: "Total Reports", value: reports.length, note: "All submitted reports", icon: FileX, tone: "total", filterValue: "all" },
        { label: "Open", value: reports.filter((report) => reportStatus(report) === "open").length, note: "Needs action", icon: Clock, tone: "open", filterValue: "open" },
        { label: "Under Review", value: reports.filter((report) => reportStatus(report) === "under_review").length, note: "Currently investigating", icon: Eye, tone: "review", filterValue: "under_review" },
        { label: "Resolved", value: reports.filter((report) => reportStatus(report) === "resolved").length, note: "Closed cases", icon: CheckCircle2, tone: "resolved", filterValue: "resolved" },
    ];
    const currentDate = new Date().toLocaleDateString("en-PH", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
    if (selectedReport) {
        const reportApartment = selectedReportDetails?.apartment ?? getReportApartment(selectedReport);
        const reporter = selectedReportDetails?.reporter;
        const landlord = selectedReportDetails?.landlord;
        const reporterName = reporter?.name ?? selectedReport.reporter_name ?? selectedReport.reporter ?? "Reporter unavailable";
        const reporterRole = reporter?.role ?? selectedReport.reporter_role ?? selectedReport.role ?? "Role unavailable";
        const reporterContact = reporter?.email ?? selectedReport.contact;
        const issueType = String(selectedReport.issueType ?? selectedReport.issue_type ?? selectedReport.category ?? "Report type not specified");
        const apartmentName = selectedReport.apartment_title ?? selectedReport.apartment ?? reportApartment?.title;
        const statusClass = selectedReport.status === "resolved" ? "admin-tone-success-badge admin-status-border-success" : selectedReport.status === "dismissed" ? "admin-tone-muted-icon admin-status-border-muted" : "admin-status-pending";
        const sectionClass = "admin-reports-section";
        const sectionTitleClass = "admin-reports-1-reported-issue";
        return (<div className="admin-reports-container">
        <div className="admin-reports-row">
          <button onClick={() => setSelectedReport(null)} className="admin-reports-back-to-reports"><ArrowLeft className="admin-reports-arrow-left-icon"/>Back to Reports</button>
          <div className="admin-reports-row-2">
            <button onClick={() => setActiveSection("notifications")} title="Notifications" className="admin-reports-button"><Bell className="admin-reports-bell-icon"/>{unreadNotifsCount > 0 && <span className="admin-reports-span">{unreadNotifsCount}</span>}</button>
            <div className="admin-reports-card"><Calendar className="admin-reports-calendar-icon"/>{currentDate}</div>
          </div>
        </div>

        <header className="admin-reports-header">
          <div className="admin-reports-row-3">
            <span className="admin-reports-row-4"><Flag className="admin-reports-flag-icon"/></span>
            <div><h1 className="admin-reports-report-details">Report Details</h1><p className="admin-reports-text">Review the reported issue, related records, and submitted evidence.</p></div>
          </div>
        </header>
        <div className="admin-reports-row-5"><span className={`admin-reports-card-2 ${statusClass}`}>{selectedReport.status || "Pending"}</span><span className="admin-reports-submitted">Submitted {formatOptionalDate(selectedReport.submittedAt ?? selectedReport.submitted_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>

        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>1. Reported Issue</h2>
          <div className="admin-reports-grid">
            <div><p className="admin-reports-issue-type">Issue Type</p><p className="admin-reports-text-2">{issueType}</p></div>
            <div><p className="admin-reports-issue-description">Issue Description</p><p className="admin-reports-text-3">{selectedReport.details || "No description provided."}</p></div>
          </div>
        </section>

        <div className="admin-reports-grid-2">
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>2. Reported By</h2>
            <div className="admin-reports-row-6"><span className="admin-reports-row-7">{text(reporterName).split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase() || "R"}</span><div className="admin-reports-panel"><p className="admin-reports-text-4">{reporterName}</p><p className="admin-reports-text-5">{reporterRole}</p>{reporterContact && <p className="admin-reports-text-6"><Mail className="admin-reports-mail-icon"/>{reporterContact}</p>}</div>{reporter && <Button size="sm" variant="outline" onClick={() => setViewingUserProfile(reporter)} className="admin-reports-view-reporter"><UserIcon className="admin-reports-user-icon-icon"/>View Reporter</Button>}</div>
          </section>

          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>3. Reported Apartment</h2>
            {reportApartment || apartmentName ? <><div className="admin-reports-row-8"><span className="admin-reports-row-9">{reportApartment?.image ? <ImageWithFallback src={reportApartment.image} alt={apartmentName || "Reported apartment"} className="admin-reports-image-with-fallback"/> : <Building2 className="admin-reports-building2-icon"/>}</span><div className="admin-reports-panel-2"><p className="admin-reports-text-7">{apartmentName || "Apartment unavailable"}</p>{reportApartment && <p className="admin-reports-text-8">{formatApartmentLocation(reportApartment) || "Location not provided"}</p>}</div></div><Button variant="outline" disabled={!reportApartment?.id} onClick={() => { if (reportApartment?.id) {
            setSelectedReport(null);
            navigate(`${apartmentDetailBasePath}/${reportApartment.id}`, { state: { returnTo: `${portalBasePath}?section=reports`, backLabel: "Back to Reports" } });
        } }} className="admin-reports-view-apartment"><Eye className="admin-reports-eye-icon"/>View Apartment</Button></> : <div className="admin-reports-panel-3"><p className="admin-reports-apartment-unavailable">Apartment unavailable</p><p className="admin-reports-text-9">The linked apartment information is currently unavailable.</p></div>}
          </section>
        </div>

        {landlord && <section className={sectionClass}><h2 className={sectionTitleClass}>4. Apartment Owner</h2><div className="admin-reports-content"><span className="admin-reports-row-10">{landlord.name?.[0]?.toUpperCase() || "L"}</span><div className="admin-reports-panel"><p className="admin-reports-text-4">{landlord.name}</p>{landlord.email && <p className="admin-reports-text-10"><Mail className="admin-reports-mail-icon-2"/>{landlord.email}</p>}{landlord.mobile && <p className="admin-reports-text-11"><Phone className="admin-reports-phone-icon"/>{landlord.mobile}</p>}</div><Button variant="outline" onClick={() => setViewingUserProfile(landlord)} className="admin-reports-view-landlord"><UserIcon className="admin-reports-user-icon-icon-2"/>View Landlord</Button></div></section>}

        <section className={sectionClass}><h2 className={sectionTitleClass}>5. Evidence ({selectedReportEvidence.length})</h2><div className="admin-reports-panel-3"><EvidenceViewer evidence={selectedReportEvidence} title="Submitted Evidence"/></div></section>

        <section className={sectionClass}><h2 className={sectionTitleClass}>6. Admin Decision</h2>{!reportArchiveView && selectedReport.status === "pending" ? <><p className="admin-reports-text-12">Choose the appropriate action based on your review of the report and evidence.</p><div className="admin-reports-grid-3"><Button onClick={() => resolveReport(text(selectedReport.id))} className="admin-reports-resolve-report"><CheckCheck className="admin-reports-check-check-icon"/>Resolve Report</Button><Button variant="outline" onClick={() => setDismissReportModal({ reportId: text(selectedReport.id), reason: "" })} className="admin-reports-dismiss-report"><XCircle className="admin-reports-xcircle-icon"/>Dismiss Report</Button></div></> : <div className="admin-reports-panel-4"><p className="admin-reports-this-report-has-been">This report has been <span className="admin-reports-span-5">{selectedReport.status}</span> on {formatOptionalDate(selectedReport.resolved_at, { month: "short", day: "numeric" })}.</p>{!reportArchiveView && canArchiveReportStatus(selectedReport.status) && <Button variant="outline" onClick={() => setCaseAction({ type: "archive-report", id: text(selectedReport.id), label: selectedReport.apartment || text(selectedReport.id) })} className="admin-reports-archive"><Archive className="admin-reports-archive-icon"/>Archive</Button>}</div>}</section>
      </div>);
    }
    return (<div className="reports-reference admin-case-list">
      <header className="reports-reference-header"><h1>Report</h1><p>Review and manage reports submitted by tenants regarding apartment listings.</p></header>
      <div className="reports-reference-filters">
        <label className="reports-reference-search"><Search aria-hidden="true"/><input aria-label="Search reports" value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search landlords"/></label>

      </div>
      <div className="reports-reference-stats" aria-label="Report status filters">{summaryCards.map(({ label, value, note, icon: Icon, tone, filterValue }) => {
        const active = !reportArchiveView && (reportStatusFilter === "pending" ? "open" : reportStatusFilter) === filterValue;
        return <button type="button" key={label} className={`reports-reference-stat ${active ? "is-active" : ""}`} aria-pressed={active} onClick={() => { setReportArchiveView(false); setReportStatusFilter(filterValue); setPage(1); }}><span className={`reports-reference-stat-icon is-${tone}`}><Icon aria-hidden="true"/></span><span><strong>{value} {label}</strong><span className="reports-reference-stat-note">{note}</span></span></button>;
      })}</div>
      <div className="reports-reference-table-wrap"><table className="reports-reference-table">
        <thead><tr>{["Apartment", "Reported By", "Issue", "Date Submitted", "Status", "Actions"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{pageReports.map((report) => {
          const apartment = getReportApartment(report);
          const status = reportStatus(report);
          const statusLabel = { open: "Open", under_review: "Under Review", resolved: "Resolved", dismissed: "Dismissed" }[status] ?? report.status ?? "Open";
          return <tr key={report.id}>
            <td><strong>{getReportApartmentTitle(report)}</strong><p>{apartment ? formatApartmentLocation(apartment) || "Location not provided" : report.apartment_address || "Location not provided"}</p><p>Apartment</p></td>
            <td><strong className="reports-reference-reporter">{getReporterLabel(report)}</strong><p className="reports-reference-role">{report.reporter_role ?? report.role ?? "Tenant"}</p></td>
            <td>{report.details || report.issueType || report.issue_type || report.category || "No description provided."}</td>
            <td className="reports-reference-date">{formatOptionalDate(report.submittedAt ?? report.submitted_at ?? report.created_at, { month: "short", day: "numeric", year: "numeric" })}</td>
            <td><span className={`reports-reference-status is-${status}`}>{statusLabel}</span></td>
            <td><button className="reports-reference-review" onClick={() => setSelectedReport(report)}>{status === "open" ? "Review" : "View"}</button>{reportArchiveView && <div className="reports-reference-archive-actions"><button onClick={() => setCaseAction({ type: "restore-report", id: text(report.id), label: getReportApartmentTitle(report) })}>Restore</button><button onClick={() => setCaseAction({ type: "delete-report", id: text(report.id), label: getReportApartmentTitle(report) })}>Delete</button></div>}</td>
          </tr>;
        })}{pageReports.length === 0 && <tr><td colSpan={6} className="reports-reference-empty">{reports.length === 0 && !reportArchiveView ? "No reports submitted yet." : "No reports match the selected filters."}</td></tr>}</tbody>
      </table></div>
      <nav className="reports-reference-pagination" aria-label="Report pages">
        <button aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft/></button>
        {Array.from({ length: pageCount }, (_, index) => index + 1).filter((number) => number === 1 || number === pageCount || Math.abs(number - currentPage) <= 1).map((number, index, pages) => <span key={number}>{index > 0 && number - pages[index - 1] > 1 && <span className="reports-reference-page-gap">?</span>}<button aria-label={`Page ${number}`} aria-current={number === currentPage ? "page" : undefined} onClick={() => setPage(number)}>{number}</button></span>)}
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
