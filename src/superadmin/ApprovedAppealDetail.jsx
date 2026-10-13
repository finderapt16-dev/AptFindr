import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, FileText, Mail, MapPin, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { fetchUserById } from "@/services/dashboardSupabaseService";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import "./ApprovedAppealDetail.css";

const date = value => value ? new Date(value).toLocaleDateString("en-PH", { timeZone: "Asia/Shanghai", month: "long", day: "numeric", year: "numeric" }) : "Not recorded";
const size = bytes => bytes ? bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB` : "Size unavailable";

export function ApprovedAppealDetail({ appeal, landlord, apartment, apartmentName, appealType, documents, onBack, onViewListing, user }) {
    const [viewAll, setViewAll] = useState(false);
    const [reviewer, setReviewer] = useState(null);
    useEffect(() => {
        let active = true;
        const adminId = appeal.admin_id || appeal.reviewed_by;
        if (adminId === user?.id) setReviewer(user);
        else if (adminId) fetchUserById(adminId).then(person => { if (active) setReviewer(person); });
        return () => { active = false; };
    }, [appeal.admin_id, appeal.reviewed_by, user?.id]);
    const published = apartment?.isPublished === true || apartment?.is_published === true;
    const documentCard = (document, index) => <a key={index} href={document.url || undefined} target={document.url ? "_blank" : undefined} rel="noreferrer" className="approved-appeal-document"><span>{document.mimeType?.startsWith("image/") && document.url ? <ImageWithFallback src={document.url} alt={document.name}/> : <FileText/>}</span><strong>{document.name}</strong><small>{size(document.fileSize)}</small></a>;
    return <main className="approved-appeal-page">
      <button className="approved-appeal-back" onClick={onBack}><ArrowLeft/>Back to Appeals</button>
      <header><h1>Appeal Details</h1><p>Review the landlord’s appeal and supporting documents.</p></header>
      <div className="approved-appeal-columns">
        <div className="approved-appeal-main">
          <section><h2>Landlord Information</h2><div className="approved-appeal-person"><span>{landlord?.name?.[0]?.toUpperCase() || "L"}</span><strong>{landlord?.name || "Landlord unavailable"}</strong>{(landlord?.is_verified || landlord?.isVerified) && <small>Verified Landlord</small>}</div><dl className="approved-appeal-contact"><dt><Mail/>Email</dt><dd>{landlord?.email || "Not provided"}</dd><dt><Phone/>Contact Number</dt><dd>{landlord?.mobile || landlord?.mobileNumber || "Not provided"}</dd><dt><MapPin/>Address</dt><dd>{landlord?.address || "Not provided"}</dd></dl></section>
          <section><h2>Appeal Information</h2><dl><dt>Appeal Type</dt><dd>{appealType}</dd><dt>Related Property</dt><dd>{apartmentName}</dd><dt>Date Submitted</dt><dd>{date(appeal.submitted_at || appeal.created_at)}</dd><dt>Status</dt><dd><span className="approved-appeal-status">Approved</span></dd></dl></section>
          <section><h2>Appeal Message</h2><p className="approved-appeal-message">{appeal.description || appeal.reason || "No appeal message was provided."}</p></section>
          <section><div className="approved-appeal-documents-heading"><h2>Supporting Documents</h2>{documents.length > 0 && <button onClick={() => setViewAll(true)}>View All ({documents.length})</button>}</div>{documents.length ? <div className="approved-appeal-documents">{documents.slice(0, 4).map(documentCard)}</div> : <p className="approved-appeal-empty">No supporting documents were submitted.</p>}</section>
        </div>
        <aside><h2>Admin Decision</h2><div className="approved-appeal-banner"><CheckCircle2/><div><strong>Appeal Approved</strong><p>This appeal has been approved.{published ? " The listing has been reactivated." : ""}</p></div></div><dl><dt>Date Decided</dt><dd>{date(appeal.reviewed_at)}</dd><dt>Decided By</dt><dd>{reviewer?.name || "Admin"}</dd></dl><label className="approved-appeal-notes">Admin Notes<textarea readOnly value={appeal.admin_response || "No admin notes recorded."}/></label><button className="approved-appeal-view" disabled={!apartment?.id} onClick={onViewListing}><Eye/>View Related Listing</button></aside>
      </div>
      <Dialog open={viewAll} onOpenChange={setViewAll}><DialogContent className="approved-appeal-documents-dialog" aria-describedby={undefined}><DialogTitle>Supporting Documents ({documents.length})</DialogTitle><div className="approved-appeal-documents">{documents.map(documentCard)}</div></DialogContent></Dialog>
    </main>;
}
