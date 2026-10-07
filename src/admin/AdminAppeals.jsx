import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { canArchiveAppealStatus, updateAppealStatus } from "@/services/dashboardSupabaseService";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { AlertTriangle, Archive, ArrowLeft, Bell, Building2, Calendar, Check, Clock3, Eye, FileText, Flag, Mail, MapPin, Phone, RotateCcw, Search, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { ArchiveEmpty, formatOptionalDate, OverviewEmpty, text } from './adminDashboardHelpers';
export function AdminAppeals({ landlords, reports, archivedReports, violations, allApartments, appealSearch, appealArchiveView, archivedAppeals, appeals, appealTypeFilter, appealSort, selectedAppeal, user, appealStatus, appealResponse, setAppeals, setSelectedAppeal, setAppealResponse, setAppealStatus, setActiveSection, unreadNotifsCount, setSelectedReport, navigate, apartmentDetailBasePath, portalBasePath, setCaseAction, setAppealSearch, setAppealTypeFilter, setAppealSort, setAppealArchiveView, }) {
    const landlordMap = new Map();
    landlords.forEach((l) => {
        if (l.id)
            landlordMap.set(l.id, l);
    });
    const getAppealMetadata = (appeal, kind) => {
        const documents = Array.isArray(appeal.supporting_docs) ? appeal.supporting_docs : [];
        return [...documents].reverse().find((entry) => entry && typeof entry === "object" && !Array.isArray(entry) && entry.kind === kind);
    };
    const getAppealContext = (appeal) => {
        const report = reports.find((item) => item.id === appeal.report_id) ?? archivedReports.find((item) => item.id === appeal.report_id);
        const violation = violations.find((item) => item.id === appeal.violation_id);
        const source = getAppealMetadata(appeal, "source");
        const apartmentId = String(report?.apartment_id ?? report?.apartmentId ?? violation?.apartment_id ?? source?.apartment_id ?? "");
        const apartment = allApartments.find((item) => item.id === apartmentId);
        return { report, violation, source, apartmentId, apartment };
    };
    const normalizedSearch = appealSearch.trim().toLowerCase();
    const appealSource = appealArchiveView ? archivedAppeals : appeals;
    const visibleAppeals = appealSource
        .filter((appeal) => {
        const landlord = landlordMap.get(appeal.landlord_id ?? "");
        const type = appeal.report_id ? "report" : appeal.violation_id ? "violation" : "general";
        const matchesStatus = appealTypeFilter === "all"
            || (appealTypeFilter === "pending" && ["pending", "under_review", "needs_information"].includes(appeal.status))
            || (appealTypeFilter === "approved" && appeal.status === "approved")
            || (appealTypeFilter === "denied" && ["rejected", "dismissed"].includes(appeal.status));
        const context = getAppealContext(appeal);
        const matchesSearch = !normalizedSearch || [landlord?.name, landlord?.email, appeal.reason, appeal.description, appeal.id, context.apartment?.title, context.source?.related_label]
            .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
        return matchesStatus && matchesSearch;
    })
        .sort((left, right) => {
        const leftTime = new Date(left.submitted_at ?? left.created_at ?? 0).getTime();
        const rightTime = new Date(right.submitted_at ?? right.created_at ?? 0).getTime();
        return appealSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
    const pendingAppealCount = appeals.filter((appeal) => appeal.status === "pending" || appeal.status === "under_review" || appeal.status === "needs_information").length;
    const approvedAppealCount = appeals.filter((appeal) => appeal.status === "approved").length;
    const deniedAppealCount = appeals.filter((appeal) => appeal.status === "rejected" || appeal.status === "dismissed").length;
    const currentDate = new Date().toLocaleDateString("en-PH", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
    const handleUpdateAppealStatus = async (nextStatus = appealStatus) => {
        if (!selectedAppeal?.id || !user?.id) {
            toast.error("Cannot update appeal - missing information");
            return;
        }
        if (["needs_information", "approved", "rejected", "dismissed"].includes(nextStatus) && !appealResponse.trim()) {
            toast.error("Please enter a message for the landlord.");
            return;
        }
        try {
            const updated = await updateAppealStatus(selectedAppeal.id, nextStatus, user.id, appealResponse.trim());
            if (updated) {
                toast.success(`Appeal marked as ${nextStatus.replace(/_/g, " ")}`);
                setAppeals((prev) => prev.map((a) => (a.id === selectedAppeal.id ? updated : a)));
                setSelectedAppeal(null);
                setAppealResponse("");
                setAppealStatus("under_review");
            }
            else {
                toast.error("Failed to update appeal");
            }
        }
        catch (error) {
            console.error("Error updating appeal:", error);
            toast.error("Error updating appeal");
        }
    };
    if (selectedAppeal) {
        const landlord = landlordMap.get(selectedAppeal.landlord_id ?? "");
        const context = getAppealContext(selectedAppeal);
        const appealType = selectedAppeal.report_id ? "Report Appeal" : selectedAppeal.violation_id ? context.violation?.mode === "notice" ? "Notice Appeal" : "Violation Appeal" : "General Appeal";
        const evidenceDocuments = (selectedAppeal.supporting_docs ?? []).map((doc, index) => {
            const document = typeof doc === "object" && doc !== null && !Array.isArray(doc) ? doc : null;
            if (document && document.kind !== "evidence")
                return null;
            const url = typeof doc === "string" ? doc : String(document?.file_url ?? document?.url ?? "");
            const name = String(document?.file_name ?? document?.name ?? `Supporting evidence ${index + 1}`);
            return { url, name };
        }).filter((document) => Boolean(document));
        const relatedReportTitle = context.report ? String(context.report.issueType ?? context.report.issue_type ?? context.report.category ?? context.report.apartment_title ?? "Related report") : "Report unavailable";
        const statusClass = selectedAppeal.status === "approved" ? "admin-tone-success-badge admin-status-border-success" : selectedAppeal.status === "rejected" || selectedAppeal.status === "dismissed" ? "admin-tone-muted-icon admin-status-border-muted" : "admin-status-pending";
        const sectionClass = "admin-appeals-section";
        const headingClass = "admin-appeals-1-appeal-submitted-by";
        const apartment = context.apartment;
        const apartmentName = apartment?.title || String(context.source?.apartment_title ?? "Property unavailable");
        const apartmentLocation = apartment ? formatApartmentLocation(apartment) : String(context.source?.related_label ?? "Location not provided");
        const apartmentImages = [
            ...(Array.isArray(apartment?.apartment_images) ? apartment.apartment_images.map((image) => typeof image === "string" ? image : image?.url) : []),
            ...(Array.isArray(apartment?.images) ? apartment.images : []),
            apartment?.image,
            apartment?.image_url,
        ].filter(Boolean);
        const apartmentImage = apartmentImages[0];
        const roomCount = Array.isArray(apartment?.apartment_rooms) ? apartment.apartment_rooms.length : Array.isArray(apartment?.rooms) ? apartment.rooms.length : null;
        const rent = apartment?.rent ?? apartment?.price ?? apartment?.monthly_rent;
        const rentText = rent && Number.isFinite(Number(rent)) ? `₱${Number(rent).toLocaleString()} / month` : rent ? String(rent) : "";
        const landlordVerified = landlord?.is_verified === true || landlord?.isVerified === true;
        const displayStatus = selectedAppeal.status === "approved" ? "Approved" : ["rejected", "dismissed"].includes(selectedAppeal.status) ? "Denied" : selectedAppeal.status === "needs_information" ? "Request Changes" : "Pending Review";
        const detailStatusTone = selectedAppeal.status === "approved" ? "approved" : ["rejected", "dismissed"].includes(selectedAppeal.status) ? "denied" : "pending";
        return <main className="admin-appeal-detail-reference">
          <button type="button" className="admin-appeal-detail-back" onClick={() => { setSelectedAppeal(null); setAppealResponse(""); setAppealStatus("under_review"); }}><ArrowLeft aria-hidden="true" />Back to Appeals</button>
          <header className="admin-appeal-detail-title"><h1>Appeal Details</h1><p>Review the landlord&apos;s appeal and supporting documents.</p></header>

          <div className="admin-appeal-detail-layout">
            <div className="admin-appeal-detail-primary">
              <section className="admin-appeal-detail-card">
                <h2>Landlord Information</h2>
                <div className="admin-appeal-detail-person"><span>{landlord?.name?.[0]?.toUpperCase() ?? "L"}</span><strong>{landlord?.name || "Landlord unavailable"}</strong>{landlordVerified && <em>Verified Landlord</em>}</div>
                <dl className="admin-appeal-detail-contact"><div><dt><Mail aria-hidden="true" />Email</dt><dd>{landlord?.email || "Not provided"}</dd></div><div><dt><Phone aria-hidden="true" />Contact Number</dt><dd>{landlord?.mobile || "Not provided"}</dd></div><div><dt><MapPin aria-hidden="true" />Address</dt><dd>{landlord?.address || landlord?.location || "Not provided"}</dd></div></dl>
              </section>

              <section className="admin-appeal-detail-card">
                <h2>Appeal Information</h2>
                <dl className="admin-appeal-detail-info"><div><dt>Appeal Type</dt><dd>{appealType}</dd></div><div><dt>Related Property</dt><dd>{apartmentName}</dd></div><div><dt>Date Submitted</dt><dd>{formatOptionalDate(selectedAppeal.submitted_at ?? selectedAppeal.created_at, { month: "long", day: "numeric", year: "numeric" })}</dd></div><div><dt>Status</dt><dd><span className={`admin-appeal-detail-status is-${detailStatusTone}`}>{displayStatus}</span></dd></div></dl>
              </section>

              <section className="admin-appeal-detail-card">
                <h2>Appeal Message</h2>
                <p className="admin-appeal-detail-message">{selectedAppeal.description || selectedAppeal.reason || "No appeal message was provided."}</p>
              </section>

              <section className="admin-appeal-detail-card">
                <div className="admin-appeal-detail-documents-heading"><h2>Supporting Documents</h2><span>{evidenceDocuments.length} file{evidenceDocuments.length === 1 ? "" : "s"}</span></div>
                {evidenceDocuments.length > 0 ? <div className="admin-appeal-detail-documents">{evidenceDocuments.map((document, index) => <a key={`${document.url}-${index}`} href={document.url || undefined} target={document.url ? "_blank" : undefined} rel={document.url ? "noreferrer" : undefined} className="admin-appeal-detail-document"><span><FileText aria-hidden="true" /></span><strong>{document.name}</strong><small>{document.url ? "Open document" : "Supporting document"}</small></a>)}</div> : <p className="admin-appeal-detail-no-documents">No supporting documents were submitted.</p>}
              </section>
            </div>

            <aside className="admin-appeal-detail-sidebar">
              <section className="admin-appeal-detail-card admin-appeal-detail-property"><h2>Property Summary</h2><div>{apartmentImage ? <img src={apartmentImage} alt={apartmentName} /> : <span className="admin-appeal-detail-property-placeholder"><Building2 aria-hidden="true" /></span>}<article><strong>{apartmentName}</strong><small><MapPin aria-hidden="true" />{apartmentLocation}</small>{rentText && <small>{rentText}</small>}{roomCount !== null && <small>{roomCount} room{roomCount === 1 ? "" : "s"} · Apartment</small>}</article></div>{context.apartmentId && <Button variant="outline" onClick={() => navigate(`${apartmentDetailBasePath}/${context.apartmentId}`, { state: { returnTo: `${portalBasePath}?section=appeals`, backLabel: "Back to Appeals" } })}>View property</Button>}</section>
              <section className="admin-appeal-detail-card"><h2>Appeal Information</h2><dl className="admin-appeal-detail-side-info"><div><dt>Date</dt><dd>{formatOptionalDate(selectedAppeal.reviewed_at ?? selectedAppeal.submitted_at ?? selectedAppeal.created_at, { month: "long", day: "numeric", year: "numeric" })}</dd></div><div><dt>Decision</dt><dd><span className={`admin-appeal-detail-status is-${detailStatusTone}`}>{displayStatus}</span></dd></div><div><dt>Reason</dt><dd>{selectedAppeal.reason || "Not provided"}</dd></div></dl></section>
              <section className="admin-appeal-detail-card admin-appeal-detail-decision"><h2>Admin Decision</h2><label>Status<select disabled={appealArchiveView} value={appealStatus} onChange={(event) => setAppealStatus(event.target.value)}><option value="under_review">Pending Review</option><option value="approved">Approved</option><option value="needs_information">Request Changes</option><option value="rejected">Denied</option></select></label><label>Admin Notes<textarea disabled={appealArchiveView} value={appealResponse} onChange={(event) => setAppealResponse(event.target.value)} placeholder="Add notes about your decision..." /></label><div className="admin-appeal-detail-decision-actions"><Button disabled={appealArchiveView} onClick={() => void handleUpdateAppealStatus("approved")}><Check aria-hidden="true" />Approve Appeal</Button><Button disabled={appealArchiveView} variant="outline" onClick={() => void handleUpdateAppealStatus("needs_information")}><FileText aria-hidden="true" />Request Changes</Button><Button disabled={appealArchiveView} variant="outline" onClick={() => void handleUpdateAppealStatus("rejected")}><X aria-hidden="true" />Deny Appeal</Button></div>{!appealArchiveView && canArchiveAppealStatus(selectedAppeal.status) && <button type="button" className="admin-appeal-detail-archive" onClick={() => setCaseAction({ type: "archive-appeal", id: text(selectedAppeal.id), label: selectedAppeal.reason || text(selectedAppeal.id) })}>Archive appeal</button>}</section>
            </aside>
          </div>
        </main>;
        return <div className="admin-appeals-container">
      <div className="admin-appeals-row"><button onClick={() => { setSelectedAppeal(null); setAppealResponse(""); setAppealStatus("under_review"); }} className="admin-appeals-back-to-appeals"><ArrowLeft className="admin-appeals-arrow-left-icon"/>Back to Appeals</button><div className="admin-appeals-row-2"><button onClick={() => setActiveSection("notifications")} title="Notifications" className="admin-appeals-button"><Bell className="admin-appeals-bell-icon"/>{unreadNotifsCount > 0 && <span className="admin-appeals-span">{unreadNotifsCount}</span>}</button><div className="admin-appeals-card"><Calendar className="admin-appeals-calendar-icon"/>{currentDate}</div></div></div>

      <header className="admin-appeals-header"><span className="admin-appeals-row-3"><Flag className="admin-appeals-flag-icon"/></span><div><h1 className="admin-appeals-review-appeal">Review Appeal</h1><p className="admin-appeals-text">Review the appeal, related case, supporting evidence, and administrative decision.</p></div></header>
      <div className="admin-appeals-row-4"><span className="admin-appeals-card-2">{appealType}</span><span className={`admin-appeals-card-3 ${statusClass}`}>{String(selectedAppeal.status || "Pending").replace(/_/g, " ")}</span><span className="admin-appeals-submitted">Submitted {formatOptionalDate(selectedAppeal.submitted_at ?? selectedAppeal.created_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>

      <section className={sectionClass}><h2 className={headingClass}>1. Appeal Submitted By</h2><div className="admin-appeals-row-5"><span className="admin-appeals-row-6">{landlord?.name?.[0]?.toUpperCase() ?? "L"}</span><div className="admin-appeals-panel"><p className="admin-appeals-text-2">{landlord?.name || "Landlord unavailable"}</p>{landlord?.email && <p className="admin-appeals-text-3"><Mail className="admin-appeals-mail-icon"/>{landlord.email}</p>}{landlord?.mobile && <p className="admin-appeals-text-4"><Phone className="admin-appeals-phone-icon"/>{landlord.mobile}</p>}</div></div></section>

      <section className={sectionClass}><h2 className={headingClass}>2. Related Case</h2><div className="admin-appeals-grid"><div><p className="admin-appeals-appeal-type">Appeal Type</p><p className="admin-appeals-text-5">{appealType}</p><p className="admin-appeals-apartment">Apartment</p><p className="admin-appeals-text-5">{context.apartment?.title || String(context.source?.apartment_title ?? "Apartment unavailable")}</p>{context.apartment && <p className="admin-appeals-text-6">{formatApartmentLocation(context.apartment) || "Location not provided"}</p>}</div><div><p className="admin-appeals-text-7">{selectedAppeal.report_id ? "Related Report" : selectedAppeal.violation_id ? "Related Violation" : "Related Record"}</p><p className="admin-appeals-text-5">{selectedAppeal.report_id ? relatedReportTitle : selectedAppeal.violation_id ? context.violation?.mode === "notice" ? "Administrative notice" : "Administrative violation" : String(context.source?.related_label ?? "Unavailable")}</p>{(selectedAppeal.report_id || selectedAppeal.violation_id) && <p className="admin-appeals-record-id">Record ID: {selectedAppeal.report_id || selectedAppeal.violation_id}</p>}</div></div><div className="admin-appeals-row-7">{context.report && <Button variant="outline" onClick={() => { setSelectedReport(context.report); setActiveSection("reports"); }} className="admin-appeals-view-report"><Eye className="admin-appeals-eye-icon"/>View Report</Button>}{context.apartmentId && <Button variant="outline" onClick={() => navigate(`${apartmentDetailBasePath}/${context.apartmentId}`, { state: { returnTo: `${portalBasePath}?section=appeals`, backLabel: "Back to Appeals" } })} className="admin-appeals-view-apartment"><Building2 className="admin-appeals-building2-icon"/>View Apartment</Button>}</div></section>

      <section className={sectionClass}><h2 className={headingClass}>3. Appeal Reason</h2><div className="admin-appeals-panel-2"><p className="admin-appeals-reason">Reason</p><p className="admin-appeals-text-8">{selectedAppeal.reason || "—"}</p>{selectedAppeal.description && <div className="admin-appeals-panel-3"><p className="admin-appeals-landlord-apos-s-explanation">Landlord&apos;s Explanation</p><p className="admin-appeals-text-9">{selectedAppeal.description}</p></div>}</div></section>

      <section className={sectionClass}><h2 className={headingClass}>4. Supporting Evidence ({evidenceDocuments.length})</h2>{evidenceDocuments.length > 0 ? <div className="admin-appeals-panel-4">{evidenceDocuments.map((document, index) => <div key={`${document.url}-${index}`} className="admin-appeals-card-4"><span className="admin-appeals-row-8"><FileText className="admin-appeals-file-text-icon"/></span><div className="admin-appeals-panel-5"><p className="admin-appeals-text-10">{document.name}</p><p className="admin-appeals-submitted-evidence">Submitted evidence</p></div>{document.url && <a href={document.url} target="_blank" rel="noreferrer" className="admin-appeals-preview"><Eye className="admin-appeals-eye-icon-2"/>Preview</a>}</div>)}</div> : <p className="admin-appeals-no-supporting-evidence-submitted">No supporting evidence submitted.</p>}</section>

      <section className={sectionClass}><h2 className={headingClass}>5. Admin Decision</h2>{selectedAppeal.admin_response && <div className="admin-appeals-card-5"><div className="admin-appeals-row-9"><div><p className="admin-appeals-decision">Decision</p><span className={`admin-appeals-card-6 ${statusClass}`}>{String(selectedAppeal.status || "Pending").replace(/_/g, " ")}</span></div>{selectedAppeal.reviewed_at && <div><p className="admin-appeals-decision-date">Decision Date</p><p className="admin-appeals-text-11">{formatOptionalDate(selectedAppeal.reviewed_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>}</div><div className="admin-appeals-panel-6"><p className="admin-appeals-admin-response">Admin Response</p><p className="admin-appeals-text-12">{selectedAppeal.admin_response}</p></div></div>}
        <div className="admin-appeals-panel-2"><label className="admin-appeals-update-status">Update Status</label><div className="admin-appeals-grid-2">{["under_review", "needs_information", "approved", "rejected", "dismissed"].map((status) => <Button key={status} disabled={appealArchiveView} onClick={() => setAppealStatus(status)} className={`admin-appeals-button-2 ${appealStatus === status ? "admin-appeals-button-3" : "admin-appeals-button-4"}`}>{status === "under_review" ? "Under Review" : status === "needs_information" ? "Request Info" : status.charAt(0).toUpperCase() + status.slice(1)}</Button>)}</div></div>
        <div className="admin-appeals-panel-2"><label className="admin-appeals-admin-response-message">Admin Response Message</label><textarea disabled={appealArchiveView} value={appealResponse} onChange={(event) => setAppealResponse(event.target.value)} placeholder="Enter your decision and explanation..." className="admin-appeals-textarea"/></div>
        <div className="admin-appeals-row-7"><Button disabled={appealArchiveView} onClick={handleUpdateAppealStatus} className="admin-appeals-save-appeal-decision">Save Appeal Decision</Button><Button onClick={() => { setSelectedAppeal(null); setAppealResponse(""); setAppealStatus("under_review"); }} variant="outline" className="admin-appeals-cancel">Cancel</Button></div>{!appealArchiveView && canArchiveAppealStatus(selectedAppeal.status) && <Button variant="outline" onClick={() => setCaseAction({ type: "archive-appeal", id: text(selectedAppeal.id), label: selectedAppeal.reason || text(selectedAppeal.id) })} className="admin-appeals-archive"><Archive className="admin-appeals-archive-icon"/>Archive</Button>}</section>
    </div>;
    }
    return ((selectedAppeal) => (<div className="admin-appeals-panel-7">
      {selectedAppeal ? (
        // Detail view
        <div className="admin-appeals-panel-9">
          <Button onClick={() => {
                setSelectedAppeal(null);
                setAppealResponse("");
                setAppealStatus("under_review");
            }} variant="outline" className="admin-appeals-back-to-appeals-2">
            Back to Appeals
          </Button>

          <Card className="admin-appeals-card-9">
            <CardContent className="admin-appeals-card-content">
              {selectedAppeal.landlord_id && (<div className="admin-appeals-card-10">
                  <h3 className="admin-appeals-landlord-information">Landlord Information</h3>
                  {(() => {
                    const landlord = landlordMap.get(selectedAppeal.landlord_id);
                    return landlord ? (<div className="admin-appeals-panel-10">
                        <p><strong>Name:</strong> {landlord.name || "—"}</p>
                        <p><strong>Email:</strong> {landlord.email || "—"}</p>
                        <p><strong>Phone:</strong> {landlord.mobile || "—"}</p>
                      </div>) : (<p className="admin-appeals-landlord-record-unavailable">Landlord record unavailable.</p>);
                })()}
                </div>)}

              {(() => {
                const context = getAppealContext(selectedAppeal);
                const contact = getAppealMetadata(selectedAppeal, "contact");
                return <div className="admin-appeals-grid-3">
                  <div><p className="admin-appeals-apartment-2">Apartment</p><p className="admin-appeals-text-13">{context.apartment?.title || String(context.source?.apartment_title ?? "Unavailable")}</p>{context.apartmentId && <Button size="sm" variant="outline" onClick={() => navigate(`${apartmentDetailBasePath}/${context.apartmentId}`, { state: { returnTo: `${portalBasePath}?section=appeals`, backLabel: "Back to Appeals" } })} className="admin-appeals-open-apartment"><Eye className="admin-appeals-eye-icon-3"/>Open Apartment</Button>}</div>
                  <div><p className="admin-appeals-related-record">Related record</p><p className="admin-appeals-text-14">{selectedAppeal.violation_id ? `${context.violation?.mode === "notice" ? "Notice" : "Violation"}: ${selectedAppeal.violation_id}` : selectedAppeal.report_id ? `Report: ${selectedAppeal.report_id}` : String(context.source?.related_label ?? "Admin message")}</p>{context.report && <Button size="sm" variant="outline" onClick={() => { setSelectedReport(context.report); setActiveSection("reports"); }} className="admin-appeals-open-report"><Flag className="admin-appeals-flag-icon-3"/>Open Report</Button>}</div>
                  <div><p className="admin-appeals-contact-information">Contact information</p><p className="admin-appeals-text-14">{String(contact?.value ?? landlordMap.get(selectedAppeal.landlord_id ?? "")?.email ?? "Not provided")}</p></div>
                <div><p className="admin-appeals-submitted-2">Submitted</p><p className="admin-appeals-text-15">{formatOptionalDate(selectedAppeal.submitted_at ?? selectedAppeal.created_at, { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
                </div>;
            })()}

              <div className="admin-appeals-panel-11">
                <h3 className="admin-appeals-appeal-details">Appeal Details</h3>

                {selectedAppeal.report_id && (<div className="admin-appeals-card-11">
                    <Badge className="admin-appeals-report-appeal">Report Appeal</Badge>
                    <p className="admin-appeals-text-16">Linked report information is available to the review workflow.</p>
                  </div>)}

                {selectedAppeal.violation_id && (<div className="admin-appeals-card-12">
                    <Badge className="admin-appeals-badge">{getAppealContext(selectedAppeal).violation?.mode === "notice" ? "Notice Appeal" : "Violation Appeal"}</Badge>
                    <p className="admin-appeals-the-linked">The linked {getAppealContext(selectedAppeal).violation?.mode === "notice" ? "notice" : "violation"} is attached to this review.</p>
                  </div>)}

                <div>
                  <label className="admin-appeals-reason-for-appeal">Reason for Appeal</label>
                  <div className="admin-appeals-card-13">
                    {selectedAppeal.reason || "—"}
                  </div>
                </div>

                {selectedAppeal.description && (<div>
                    <label className="admin-appeals-description">Description</label>
                    <div className="admin-appeals-card-13">
                      {selectedAppeal.description}
                    </div>
                  </div>)}

                {selectedAppeal.supporting_docs && selectedAppeal.supporting_docs.some((doc) => typeof doc === "string" || (doc && typeof doc === "object" && !Array.isArray(doc) && doc.kind === "evidence")) && (<div>
                    <label className="admin-appeals-supporting-documents">Supporting Documents</label>
                    <div className="admin-appeals-panel-12">
                      {selectedAppeal.supporting_docs.map((doc, i) => {
                    const document = typeof doc === "object" && doc !== null ? doc : null;
                    if (document && document.kind !== "evidence")
                        return null;
                    const url = typeof doc === "string" ? doc : String(document?.file_url ?? document?.url ?? "");
                    const name = String(document?.file_name ?? document?.name ?? `Supporting document ${i + 1}`);
                    return url ? (<a key={`${url}-${i}`} href={url} target="_blank" rel="noreferrer" className="admin-appeals-a">{name}</a>) : (<p key={i} className="admin-appeals-text-17">{name}</p>);
                })}
                    </div>
                  </div>)}

                <div className="admin-appeals-grid-4">
                  <div>
                    <p className="admin-appeals-submitted-3">Submitted</p>
                    <p className="admin-appeals-text-18">
                      {selectedAppeal.submitted_at
                ? new Date(selectedAppeal.submitted_at).toLocaleDateString("en-PH")
                : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="admin-appeals-status">Status</p>
                    <Badge className={`admin-appeals-badge-2 ${selectedAppeal.status === "pending"
                ? "admin-appeals-badge-3"
                : selectedAppeal.status === "under_review"
                    ? "admin-appeals-badge-4"
                    : selectedAppeal.status === "approved"
                        ? "admin-appeals-badge-5"
                        : "admin-appeals-badge-6"}`}>
                      {selectedAppeal.status?.toUpperCase() || "PENDING"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="admin-appeals-panel-13">
                <h3 className="admin-appeals-admin-response-2">Admin Response</h3>

                {selectedAppeal.admin_response && (<div className="admin-appeals-card-14">
                    <p className="admin-appeals-previous-response">Previous Response</p>
                    <p className="admin-appeals-text-19">{selectedAppeal.admin_response}</p>
                  </div>)}

                <div>
                  <label className="admin-appeals-update-status-2">Update Status</label>
                  <div className="admin-appeals-grid-5">
                    {["under_review", "needs_information", "approved", "rejected", "dismissed"].map((status) => (<Button key={status} disabled={appealArchiveView} onClick={() => setAppealStatus(status)} className={`admin-appeals-button-6 ${appealStatus === status
                    ? status === "under_review" ? "admin-appeals-button-7"
                        : status === "needs_information" ? "admin-appeals-button-8"
                            : status === "approved" ? "admin-appeals-button-9"
                                : status === "dismissed" ? "admin-appeals-button-10"
                                    : "admin-appeals-button-11"
                    : "admin-appeals-button-12"}`}>
                        {status === "under_review" ? "Under Review" : status === "needs_information" ? "Request Info" : status.charAt(0).toUpperCase() + status.slice(1)}
                      </Button>))}
                  </div>
                </div>

                <div>
                  <label className="admin-appeals-admin-response-message-2">Admin Response Message</label>
                  <textarea disabled={appealArchiveView} value={appealResponse} onChange={(e) => setAppealResponse(e.target.value)} placeholder="Enter your decision and explanation..." className="resize-vertical"/>
                </div>

                <div className="admin-appeals-row-12">
                  <Button disabled={appealArchiveView} onClick={handleUpdateAppealStatus} className="admin-appeals-save-appeal-decision-2">
                    Save Appeal Decision
                  </Button>
                  <Button onClick={() => {
                setSelectedAppeal(null);
                setAppealResponse("");
                setAppealStatus("under_review");
            }} variant="outline" className="admin-appeals-cancel-2">
                    Cancel
                  </Button>
                </div>
                {!appealArchiveView && canArchiveAppealStatus(selectedAppeal.status) && (<Button variant="outline" onClick={() => setCaseAction({ type: "archive-appeal", id: text(selectedAppeal.id), label: selectedAppeal.reason || text(selectedAppeal.id) })} className="admin-appeals-archive-2">
                    <Archive className="admin-appeals-archive-icon-2"/>Archive
                  </Button>)}
              </div>
            </CardContent>
          </Card>
        </div>) : (
        // List view
        <div className="admin-appeals-reference">
          <header className="admin-appeals-reference-header">
            <h1>Appeals</h1>
            <p>Review and manage appeals submitted by landlords.</p>
          </header>

          <section className="admin-appeals-reference-controls" aria-label="Appeal filters">
            <label className="admin-appeals-reference-search">
              <Search aria-hidden="true" />
              <input value={appealSearch} onChange={(event) => setAppealSearch(event.target.value)} placeholder="Search landlords" />
            </label>
          </section>

          <section className="admin-appeals-reference-stats" aria-label="Appeal statistics">
            {[
                { label: "Total Appeals", value: appeals.length, note: "All submitted appeals", icon: UserRound, tone: "total", filterValue: "all" },
                { label: "Pending Review", value: pendingAppealCount, note: "Needs action", icon: Clock3, tone: "pending", filterValue: "pending" },
                { label: "Approved", value: approvedAppealCount, note: "Appeals approved", icon: Check, tone: "approved", filterValue: "approved" },
                { label: "Denied", value: deniedAppealCount, note: "Appeals denied", icon: X, tone: "denied", filterValue: "denied" },
            ].map(({ label, value, note, icon: Icon, tone, filterValue }) => <button type="button" key={label} className={`admin-appeals-reference-stat ${appealTypeFilter === filterValue && !appealArchiveView ? "is-active" : ""}`} aria-pressed={appealTypeFilter === filterValue && !appealArchiveView} onClick={() => { setAppealArchiveView(false); setAppealTypeFilter(filterValue); }}><span className={`admin-appeals-reference-stat-icon is-${tone}`}><Icon aria-hidden="true" /></span><span><strong>{value}</strong><b>{label}</b><small>{note}</small></span></button>)}
          </section>

          {appealArchiveView && archivedAppeals.length === 0 ? <section className="admin-appeals-reference-empty"><ArchiveEmpty kind="appeals" icon={FileText}/></section> : !appealArchiveView && appeals.length === 0 ? <section className="admin-appeals-reference-empty"><AlertTriangle aria-hidden="true" /><h2>No appeals submitted.</h2><p>Landlord appeals will appear here when submitted.</p></section> : visibleAppeals.length === 0 ? <section className="admin-appeals-reference-empty"><OverviewEmpty icon={Search} text="No appeals match the selected filters."/></section> : <section className="admin-appeals-reference-table">
            <div className="admin-appeals-reference-table-head"><span>Landlord</span><span>Related Cases</span><span>Submitted</span><span>Status</span><span>Actions</span></div>
            <div>{visibleAppeals.map((appeal) => {
                const landlord = landlordMap.get(appeal.landlord_id ?? "");
                const context = getAppealContext(appeal);
                const caseTitle = appeal.report_id ? "Report appeal" : appeal.violation_id ? context.violation?.mode === "notice" ? "Violation notice" : "Violation appeal" : "General appeal";
                const apartmentName = context.apartment?.title || String(context.source?.apartment_title ?? "Related case unavailable");
                const location = context.apartment ? formatApartmentLocation(context.apartment) : String(context.source?.related_label ?? "");
                const isDenied = ["rejected", "dismissed"].includes(appeal.status);
                const statusLabel = appeal.status === "approved" ? "Approved" : isDenied ? "Denied" : appeal.status === "needs_information" ? "Needs Info" : "Pending Review";
                const statusTone = appeal.status === "approved" ? "approved" : isDenied ? "denied" : "pending";
                return <article key={appeal.id} className="admin-appeals-reference-row" onClick={() => setSelectedAppeal(appeal)}>
                  <div className="admin-appeals-reference-landlord">{landlord?.avatar_url ? <img src={landlord.avatar_url} alt="" /> : <span>{landlord?.name?.[0]?.toUpperCase() ?? "L"}</span>}<div><strong>{landlord?.name || "Landlord unavailable"}</strong><small>{landlord?.email || "Contact unavailable"}</small></div></div>
                  <div className="admin-appeals-reference-case"><strong>{caseTitle}</strong><small>{apartmentName}</small>{location && <small>{location}</small>}</div>
                  <time dateTime={appeal.submitted_at ?? appeal.created_at}>{formatOptionalDate(appeal.submitted_at ?? appeal.created_at, { month: "short", day: "numeric", year: "numeric" })}</time>
                  <span className={`admin-appeals-reference-badge is-${statusTone}`}>{statusLabel}</span>
                  <div className="admin-appeals-reference-actions" onClick={(event) => event.stopPropagation()}><Button size="sm" onClick={() => setSelectedAppeal(appeal)}>{statusTone === "pending" ? "Review" : "View"}</Button>{appealArchiveView && <><Button size="sm" variant="outline" onClick={() => setCaseAction({ type: "restore-appeal", id: text(appeal.id), label: appeal.reason || text(appeal.id) })}>Restore</Button><Button size="sm" variant="outline" onClick={() => setCaseAction({ type: "delete-appeal", id: text(appeal.id), label: appeal.reason || text(appeal.id) })}>Delete</Button></>}</div>
                </article>;
            })}</div>
          </section>}
        </div>)}
    </div>))(selectedAppeal);
}
