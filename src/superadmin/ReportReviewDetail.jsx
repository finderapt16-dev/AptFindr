import { useEffect, useState } from "react";
import { ArrowLeft, Check, FilePlus2, FileText, FileX, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/supabaseClient";
import { createAuditLog, createNotification, updateReportStatus } from "@/services/dashboardSupabaseService";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { getImageUrl } from "@/utils/images";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { EvidenceViewer } from "./EvidenceViewer";
import "./ReportReviewDetail.css";

const labels = { pending: "Open", open: "Open", under_review: "Under Review", in_review: "Under Review", resolved: "Resolved", dismissed: "Dismissed" };
const fileSize = bytes => bytes ? (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`) : "Size unavailable";

export function ReportReviewDetail({ report, apartment, details, evidence = [], onBack, onUpdated, resolveReport, dismissReport, archived, onArchive }) {
    const { user } = useAuth();
    const [notes, setNotes] = useState("");
    const [processing, setProcessing] = useState(false);
    const [viewAll, setViewAll] = useState(false);
    const [confirmDismiss, setConfirmDismiss] = useState(false);
    useEffect(() => {
        let active = true;
        setNotes("");
        supabase.from("audit_logs").select("details").eq("target_type", "report").eq("target_id", report.id).eq("action", "REPORT_REVIEW_NOTES").order("created_at", { ascending: false }).limit(1).maybeSingle()
            .then(({ data }) => { if (active) setNotes(data?.details?.notes || ""); });
        return () => { active = false; };
    }, [report.id]);
    const saveNotes = async () => {
        const saved = await createAuditLog({ admin_id: user?.id, action: "REPORT_REVIEW_NOTES", target_type: "report", target_id: report.id, details: { notes: notes.trim() } });
        if (!saved) throw new Error("Unable to save admin notes. Please try again.");
    };
    const action = async (status, requestEvidence = false) => {
        if (processing) return;
        if (requestEvidence && !notes.trim()) return void toast.error("Add a note explaining the additional evidence needed.");
        const reporterId = details?.reporter?.id || report.reporter_id || report.user_id;
        if (requestEvidence && !reporterId) return void toast.error("The reporter is unavailable. Evidence cannot be requested.");
        setProcessing(true);
        try {
            await saveNotes();
            if (status === "resolved") { await resolveReport(report.id); return; }
            if (status === "dismissed") { await dismissReport(report.id, notes.trim() || undefined); return; }
            const updated = await updateReportStatus(report.id, status);
            if (!updated) throw new Error("Unable to update report status. Please try again.");
            onUpdated(updated);
            if (requestEvidence) {
                const notification = await createNotification({ user_id: reporterId, type: "report_update", title: "Additional Evidence Requested", message: notes.trim(), action_target_id: report.id, action_target_type: "report", payload: { report_id: report.id } });
                if (!notification) return void toast.error("Report marked under review, but the evidence request could not be delivered. Please retry the request.");
            }
            toast.success(requestEvidence ? "Additional evidence requested." : "Report status updated.");
        } catch (error) { toast.error(error.message || "Unable to update the report."); }
        finally { setProcessing(false); }
    };
    const reporter = details?.reporter;
    const status = String(report.status || "pending").toLowerCase().replace(/[ -]/g, "_");
    const closed = ["resolved", "dismissed"].includes(status);
    const underReview = ["under_review", "in_review", "reviewing"].includes(status);
    const images = [...new Set([apartment?.image, ...(apartment?.images || [])].filter(Boolean))].slice(0, 4);
    const prices = (apartment?.rooms || []).map(room => Number(room.price)).filter(price => Number.isFinite(price) && price > 0);
    const priceRange = prices.length ? `₱${Math.min(...prices).toLocaleString("en-PH")}${Math.max(...prices) !== Math.min(...prices) ? `–₱${Math.max(...prices).toLocaleString("en-PH")}` : ""} / month` : "Price unavailable";
    const published = apartment?.isPublished ?? apartment?.is_published ?? ["published", "active", "available", "occupied", "maintenance"].includes(apartment?.status);
    return <div className={`report-review-detail ${underReview ? "report-review-under-review-page" : ""}`}>
      <button className="report-review-back" onClick={onBack}><ArrowLeft/>Back to Reports</button>
      <header className="report-review-header"><div><h1>Report Details</h1><p>Review the report and take appropriate action.</p></div><span className={`report-review-status is-${underReview ? "under_review" : status}`}>{underReview ? "Under Review" : labels[status] || report.status}</span></header>
      <div className="report-review-columns">
        <div className="report-review-main">
          <section className="report-review-panel report-review-apartment"><h2>Apartment Information</h2><div className="report-review-apartment-content">
            <div className="report-review-photos">{images[0] ? <ImageWithFallback src={getImageUrl(images[0])} alt={apartment?.title || "Reported apartment"} className="report-review-main-photo"/> : <div className="report-review-main-photo report-review-placeholder"><FileText/></div>}<div className="report-review-thumbnails">{Array.from({ length: 3 }, (_, index) => images[index + 1] ? <ImageWithFallback key={index} src={getImageUrl(images[index + 1])} alt={`Apartment photo ${index + 2}`}/> : <span key={index}/>)}</div></div>
            <div className="report-review-apartment-info"><h3>{apartment?.title || report.apartment_title || report.apartment || "Apartment unavailable"}</h3><p className="report-review-location"><MapPin/>{formatApartmentLocation(apartment)}</p><dl><dt>Apartment Type</dt><dd>{apartment?.propertyType || apartment?.type || "Apartment"}</dd><dt>Total Rooms</dt><dd>{apartment ? `${apartment.rooms?.length ?? apartment.totalRooms ?? 0} rooms` : "Unavailable"}</dd><dt>Price Range</dt><dd>{priceRange}</dd><dt>Status</dt><dd><span className={`report-review-publish ${published ? "is-published" : ""}`}>{apartment ? published ? "Published" : "Unpublished" : "Unavailable"}</span></dd></dl></div>
          </div></section>
          <section className="report-review-panel"><h2>Report Information</h2><dl className="report-review-information"><dt>Reported By</dt><dd>{reporter?.name || report.reporter_name || report.reporter || "Reporter unavailable"}{(reporter?.role || report.reporter_role || report.role) && ` (${reporter?.role || report.reporter_role || report.role})`}</dd><dt>Email</dt><dd>{reporter?.email || report.contact || "Not provided"}</dd><dt>Date Submitted</dt><dd>{report.submittedAt || report.submitted_at ? new Date(report.submittedAt || report.submitted_at).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "Not provided"}</dd><dt>Report Type</dt><dd>{report.issueType || report.issue_type || report.category || "Not specified"}</dd><dt>Description</dt><dd className="report-review-description">{report.details || "No description provided."}</dd></dl></section>
          <section className="report-review-panel"><div className="report-review-evidence-heading"><h2>Supporting Evidence</h2>{evidence.length > 0 && <button onClick={() => setViewAll(true)}>View All ({evidence.length})</button>}</div>{evidence.length ? <div className="report-review-evidence-grid">{evidence.slice(0, 4).map((file, index) => <button className="report-review-file" key={file.id || index} onClick={() => setViewAll(true)}><span className="report-review-file-preview">{file.fileType === "image" ? <ImageWithFallback src={file.fileUrl} alt={file.fileName}/> : <FileText/>}</span><strong>{file.fileName || "Supporting document"}</strong><small>{fileSize(file.fileSize)}</small></button>)}</div> : <p className="report-review-empty">No supporting evidence submitted.</p>}</section>
        </div>
        <aside className="report-review-panel report-review-actions"><h2>Admin Actions</h2><label className="report-review-status-field">Status<select value={status === "open" ? "pending" : underReview ? "under_review" : status} disabled={processing || archived || closed} onChange={event => void action(event.target.value)}><option value="pending">Open</option><option value="under_review">Under Review</option><option value="resolved">Resolved</option>{status === "dismissed" && <option value="dismissed">Dismissed</option>}</select></label><label className="report-review-notes">Admin Notes<textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Add notes about your decision..." disabled={processing || archived || closed}/></label>
          {!archived && !closed ? <div className="report-review-action-buttons"><button className="report-review-under-review" disabled={processing} onClick={() => void action(underReview ? "resolved" : "under_review")}><Check/>{underReview ? "Mark as Resolved" : "Mark as Under Review"}</button><button className="report-review-request" disabled={processing} onClick={() => void action("under_review", true)}><FilePlus2/>Request Additional Evidence</button><button className="report-review-resolve" disabled={processing} onClick={() => underReview ? setConfirmDismiss(true) : void action("resolved")}><FileX/>{underReview ? "Dismiss Report" : "Resolve Report"}</button></div> : <p className="report-review-empty">This report is {labels[status]?.toLowerCase() || status}.{!archived && <button className="report-review-archive" onClick={onArchive}>Archive Report</button>}</p>}
        </aside>
      </div>
      <Dialog open={confirmDismiss} onOpenChange={open => { if (!processing) setConfirmDismiss(open); }}><DialogContent className="report-review-dismiss-dialog" aria-describedby="report-dismiss-description"><DialogTitle>Dismiss Report</DialogTitle><p id="report-dismiss-description">Dismiss this report? The reporter will be notified, and your admin notes will be saved with the review.</p><div><button disabled={processing} onClick={() => setConfirmDismiss(false)}>Cancel</button><button disabled={processing} onClick={() => void action("dismissed")}>{processing ? "Dismissing..." : "Confirm Dismissal"}</button></div></DialogContent></Dialog>
      <Dialog open={viewAll} onOpenChange={setViewAll}><DialogContent className="report-review-evidence-dialog" aria-describedby={undefined}><DialogTitle>Supporting Evidence</DialogTitle><EvidenceViewer evidence={evidence} title="Submitted Evidence"/></DialogContent></Dialog>
    </div>;
}
