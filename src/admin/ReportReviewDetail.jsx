import { getReportDeadlineNotice } from "./reportDeadline";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, FileText, FileX, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { finalizeReportListing, reviewTenantReport } from "@/services/dashboardSupabaseService";
import "./ReportReviewDetail.css";

const displayDate = (value) => value ? new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Not available";
const labels = { pending_review: "Pending Admin Review", awaiting_landlord_appeal: "Awaiting Landlord Appeal", under_appeal: "Appeal Under Review", appeal_period_expired: "Appeal Period Expired", evidence_deadline_expired: "Evidence Deadline Expired", appeal_dismissed_pending_final_decision: "Final Listing Decision Required", resolved_appeal_approved: "Resolved — Appeal Approved", resolved: "Resolved", dismissed: "Dismissed" };

export function ReportReviewDetail({ report, apartment, details, evidence = [], onBack, onViewApartment, onUpdated, archived, onArchive }) {
  const [action, setAction] = useState(null); const [notes, setNotes] = useState(""); const [processing, setProcessing] = useState(false);
  const status = String(report.status || "pending_review").toLowerCase().replace(/[ -]/g, "_");
  const needsInitialReview = ["pending_review", "pending", "open", "under_review", "in_review"].includes(status);
  const needsFinalDecision = ["appeal_period_expired", "evidence_deadline_expired", "appeal_dismissed_pending_final_decision"].includes(status);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(timer); }, []);
  const deadlineNotice = getReportDeadlineNotice(report, now);
  const closed = ["dismissed", "resolved", "resolved_appeal_approved"].includes(status);
  const save = async () => {
    setProcessing(true);
    try {
      const updated = action === "approve" || action === "dismiss" ? await reviewTenantReport(report.id, action === "approve" ? "approved" : "dismissed", notes) : await finalizeReportListing(report.id, action === "unpublish" ? "unpublish_listing" : "keep_published", notes);
      onUpdated(updated); setAction(null); setNotes("");
      toast.success(action === "approve" ? "Report approved; the landlord now has seven days to appeal." : action === "dismiss" ? "Report dismissed and tenant notified." : action === "unpublish" ? "Listing unpublished and both parties notified." : "Case resolved with no listing change.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save the report decision."); }
    finally { setProcessing(false); }
  };
  const reporter = details?.reporter; const image = apartment?.image || apartment?.image_url || apartment?.images?.[0]; const reporterName = reporter?.name || "Tenant"; const reporterAvatarUrl = String(reporter?.avatar_url ?? reporter?.avatar ?? "").trim();
  return <div className="report-review-detail">
    <button className="report-review-back" onClick={onBack}><ArrowLeft/>Back to Reports</button>
    <header className="report-review-header"><div><h1>Report Details</h1><p>Review the tenant report, deadlines, and any appeal workflow.</p></div></header>
    {deadlineNotice && <section role="status" className="report-review-deadline-notice"><strong>{deadlineNotice.label}</strong><p>{deadlineNotice.message}</p></section>}
    <div className="report-review-columns"><div className="report-review-main">
      <section className="report-review-panel"><h2>Report Information</h2><dl className="report-review-information"><dt>Reported By</dt><dd><span className="report-review-person">{reporterAvatarUrl ? <img src={reporterAvatarUrl} alt="" /> : <span>{reporterName.charAt(0).toUpperCase()}</span>}<strong>{reporterName}</strong></span></dd><dt>Date Submitted</dt><dd>{displayDate(report.submitted_at || report.submittedAt || report.created_at)}</dd><dt>Report Reason</dt><dd>{report.issue_type || report.category || "Not specified"}</dd><dt>Describe the Problem</dt><dd className="report-review-description">{report.details || "No description provided."}</dd><dt>Current Status</dt><dd><span className="report-review-status is-under_review">{labels[status] || status.replace(/_/g, " ")}</span></dd>{report.appeal_deadline && <><dt>Appeal Deadline</dt><dd>{displayDate(report.appeal_deadline)}</dd></>}{report.admin_notes && <><dt>Admin Notes</dt><dd>{report.admin_notes}</dd></>}</dl></section>
      <section className="report-review-panel"><h2>Supporting Evidence</h2>{evidence.length ? <div className="report-review-evidence-grid">{evidence.map((file, index) => <a className="report-review-file" key={file.id || index} href={file.fileUrl || file.file_url} target="_blank" rel="noreferrer"><span className="report-review-file-preview">{file.fileType === "image" ? <ImageWithFallback src={file.fileUrl || file.file_url} alt={file.fileName || "Evidence"}/> : <FileText/>}</span><strong>{file.fileName || file.file_name || "Supporting document"}</strong></a>)}</div> : <p className="report-review-empty">No supporting evidence submitted.</p>}</section>
    </div><aside className="report-review-sidebar">
      <section className="report-review-panel report-review-apartment"><h2>Apartment Information</h2>{image && <ImageWithFallback src={image} alt={apartment?.title || "Apartment"}/>}<div className="report-review-apartment-info"><h3>{apartment?.title || report.apartment_title || "Apartment unavailable"}</h3><p><MapPin size={16}/> {formatApartmentLocation(apartment) || "Location unavailable"}</p><button type="button" className="report-review-view-apartment" disabled={!apartment?.id} onClick={onViewApartment}>View Apartment</button></div></section>
      {needsInitialReview && <section className="report-review-panel report-review-actions"><h2>Admin Actions</h2><p>Approving starts the stored seven-day landlord appeal period.</p><div className="report-review-action-buttons"><button className="report-review-under-review" onClick={() => setAction("approve")}><Check/>Approve Report</button><button className="report-review-resolve" onClick={() => setAction("dismiss")}><FileX/>Dismiss Report</button></div></section>}
      {status === "awaiting_landlord_appeal" && <section className="report-review-panel report-review-decision"><h2>Appeal Period</h2><p>The landlord may appeal until {displayDate(report.appeal_deadline)}. The listing remains published unless an admin later decides otherwise.</p></section>}
      {status === "under_appeal" && <section className="report-review-panel report-review-decision"><h2>Appeal Submitted</h2><p>Open the Appeals section to approve, dismiss, or request more evidence.</p></section>}
      {needsFinalDecision && <section className="report-review-panel report-review-actions"><h2>{labels[status]}</h2><p>{status === "appeal_period_expired" ? "Landlord did not submit an appeal within seven days." : status === "evidence_deadline_expired" ? "Landlord did not submit the requested evidence within seven days." : "The appeal was dismissed. Make the final listing decision manually."}</p><div className="report-review-action-buttons"><button className="report-review-under-review" onClick={() => setAction("keep")}><Check/>Keep Published / Close Case</button><button className="report-review-resolve" onClick={() => setAction("unpublish")}><FileX/>Unpublish Listing</button></div></section>}
      {closed && <section className="report-review-panel report-review-decision"><h2>Case Closed</h2><p>{labels[status] || "Report resolved"}</p>{!archived && <button className="report-review-archive" onClick={onArchive}>Archive Report</button>}</section>}
    </aside></div>
    <Dialog open={Boolean(action)} onOpenChange={(open) => !processing && !open && setAction(null)}><DialogContent aria-describedby="report-workflow-description"><DialogTitle>{action === "approve" ? "Approve Report" : action === "dismiss" ? "Dismiss Report" : action === "unpublish" ? "Unpublish Listing" : "Keep Listing Published"}</DialogTitle><p id="report-workflow-description">{action === "approve" ? "The landlord will receive the report reason, description, and a seven-day appeal deadline." : "Record the decision notes for the case history and notification."}</p><textarea className="admin-appeals-textarea" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional decision notes..."/><div className="admin-appeals-row-7"><Button variant="outline" disabled={processing} onClick={() => setAction(null)}>Cancel</Button><Button disabled={processing} onClick={() => void save()}>{processing ? "Saving..." : "Confirm"}</Button></div></DialogContent></Dialog>
  </div>;
}
