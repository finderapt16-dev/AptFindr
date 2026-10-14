import "./AdminCaseList.css";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, CalendarDays, CheckCircle2, Download, ExternalLink, Eye, FileText, ImageIcon, MapPin, MessageCircle, Send, Settings2, UserRound, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { decideAppeal, finalizeReportListing, requestAppealEvidence } from "@/services/dashboardSupabaseService";
import { getReportEvidence } from "@/services/reportEvidenceService";
import { formatApartmentLocation } from "@/utils/apartmentLocation";

const dateFor = (value) => value ? new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—";
const deadlineFor = (value) => value ? new Date(value).toLocaleString("en-PH", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Not set";
const metadata = (appeal, kind) => (appeal.supporting_docs || []).find((item) => item && typeof item === "object" && item.kind === kind);
const labelFor = (status) => ({ pending_review: "Pending review", additional_evidence_submitted: "Additional evidence submitted", more_evidence_requested: "Waiting for landlord evidence", evidence_deadline_expired: "Evidence deadline expired", approved: "Appeal approved", dismissed: "Appeal dismissed" }[status] || String(status || "pending review").replace(/_/g, " "));
const imageFor = (apartment) => [apartment?.image, ...(Array.isArray(apartment?.images) ? apartment.images : [])].find((image) => typeof image === "string" && image.trim());
const documentName = (item, index, fallback) => item?.file_name || item?.name || `${fallback} ${index + 1}`;
const documentSize = (item) => {
  const bytes = Number(item?.file_size ?? item?.fileSize ?? 0);
  return Number.isFinite(bytes) && bytes > 0 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : "Supporting document";
};

export function AdminAppeals({ landlords, reports, archivedReports, allApartments, appeals, selectedAppeal, setAppeals, setSelectedAppeal, appealSearch, setAppealSearch, navigate, apartmentDetailBasePath, portalBasePath, onWorkflowChanged }) {
  const [action, setAction] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [reportEvidence, setReportEvidence] = useState([]);
  const landlordMap = useMemo(() => new Map(landlords.map((item) => [String(item.id), item])), [landlords]);
  const contextFor = (appeal) => {
    const report = [...reports, ...archivedReports].find((item) => String(item.id) === String(appeal.report_id));
    const source = metadata(appeal, "source") || {};
    const apartmentId = appeal.apartment_id || report?.apartment_id || report?.apartmentId || source.apartment_id;
    return { report, source, apartmentId, apartment: allApartments.find((item) => String(item.id) === String(apartmentId)) };
  };
  useEffect(() => {
    let alive = true;
    if (!selectedAppeal?.report_id) { setReportEvidence([]); return undefined; }
    getReportEvidence(selectedAppeal.report_id).then((items) => alive && setReportEvidence(items || [])).catch(() => alive && setReportEvidence([]));
    return () => { alive = false; };
  }, [selectedAppeal?.report_id]);
  const visible = useMemo(() => appeals.filter((appeal) => {
    const context = contextFor(appeal); const landlord = landlordMap.get(String(appeal.landlord_id)); const query = (appealSearch || "").trim().toLowerCase();
    return !query || [appeal.id, appeal.description, context.apartment?.title, landlord?.name, landlord?.email, appeal.status].some((value) => String(value || "").toLowerCase().includes(query));
  }), [appeals, appealSearch, landlordMap, reports, archivedReports, allApartments]);
  const save = async () => {
    if (!action || !notes.trim()) return void toast.error("A message for the case record is required.");
    setSaving(true);
    try {
      let updated;
      if (action === "request_evidence") updated = await requestAppealEvidence(selectedAppeal.id, notes);
      else if (action === "keep_published" || action === "unpublish_listing") {
        await finalizeReportListing(selectedAppeal.report_id, action, notes);
        updated = { ...selectedAppeal, final_listing_decision: action };
      } else updated = await decideAppeal(selectedAppeal.id, action, notes);
      setAppeals((items) => items.map((item) => item.id === updated.id ? updated : item));
      setSelectedAppeal(updated); setAction(null); setNotes("");
      await onWorkflowChanged?.();
      toast.success(action === "request_evidence" ? "Evidence request sent to the landlord." : action === "unpublish_listing" ? "Listing unpublished and case resolved." : action === "keep_published" ? "Case resolved with no listing change." : "Appeal decision saved.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save this workflow action."); }
    finally { setSaving(false); }
  };
  if (!selectedAppeal) return <main className="admin-appeals-reference admin-case-list">
    <header className="admin-appeals-reference-header"><h1>Reports & Appeals</h1><p>Review landlord appeals against administrator-approved tenant reports.</p></header>
    <section className="admin-appeals-reference-controls"><label className="admin-appeals-reference-search"><input value={appealSearch} onChange={(event) => setAppealSearch(event.target.value)} placeholder="Search appeal, apartment, or landlord" /></label></section>
    {visible.length ? <section className="admin-appeals-reference-table"><div className="admin-appeals-reference-table-head"><span>Appeal</span><span>Apartment / Landlord</span><span>Related Report</span><span>Submitted</span><span>Status</span><span>Action</span></div><div>{visible.map((appeal) => { const context = contextFor(appeal); const landlord = landlordMap.get(String(appeal.landlord_id)); return <article key={appeal.id} className="admin-appeals-reference-row"><div><strong>#{String(appeal.id).slice(0, 8)}</strong><small>Property report appeal</small></div><div><strong>{context.apartment?.title || context.source.apartment_title || "Apartment unavailable"}</strong><small>{landlord?.name || "Landlord unavailable"}</small></div><div><strong>{appeal.report_id ? `#${String(appeal.report_id).slice(0, 8)}` : "—"}</strong><small>Tenant report</small></div><time>{dateFor(appeal.submitted_at || appeal.created_at)}</time><span className="admin-appeals-reference-badge is-pending">{labelFor(appeal.status)}</span><Button size="sm" onClick={() => setSelectedAppeal(appeal)}>View appeal</Button></article>; })}</div></section> : <section className="admin-appeals-reference-empty"><FileText/><h2>No appeals submitted.</h2><p>Appeals appear here only after an administrator has approved the related tenant report.</p></section>}
  </main>;
  const context = contextFor(selectedAppeal); const landlord = landlordMap.get(String(selectedAppeal.landlord_id));
  const status = String(selectedAppeal.status || "pending_review"); const reviewable = ["pending_review", "additional_evidence_submitted"].includes(status); const finalDecisionRequired = status === "dismissed" || ["appeal_period_expired", "evidence_deadline_expired", "appeal_dismissed_pending_final_decision"].includes(context.report?.status);
  const appealEvidence = (selectedAppeal.supporting_docs || []).filter((item) => item && typeof item === "object" && item.kind === "evidence");
  const apartmentName = context.apartment?.title || context.source.apartment_title || "Apartment unavailable";
  const reportDate = dateFor(context.report?.submitted_at || context.report?.created_at);
  const appealDate = dateFor(selectedAppeal.submitted_at || selectedAppeal.created_at);
  return <main className="admin-appeal-review-shell">
    <header className="admin-appeal-review-heading">
      <button className="admin-appeal-review-back" aria-label="Back to Appeals" onClick={() => setSelectedAppeal(null)}><ArrowLeft size={22}/></button>
      <div><h1>Appeal Details</h1><p>Review the original report, landlord appeal, and take action.</p></div>
    </header>

    <section className="admin-appeal-review-card admin-appeal-review-section">
      <div className="admin-appeal-review-section-title"><span><Building2/></span><div><h2>Apartment Information</h2><p>Details about the apartment involved in this report.</p></div></div>
      <div className="admin-appeal-review-property">
        <ImageWithFallback src={imageFor(context.apartment)} alt={apartmentName} className="admin-appeal-review-property-image" />
        <div className="admin-appeal-review-property-details"><h3>{apartmentName}</h3><p><MapPin/> {context.apartment ? formatApartmentLocation(context.apartment) : "Location unavailable"}</p><p><UserRound/> Landlord: {landlord?.name || "Unavailable"}</p>{context.apartmentId && <Button variant="outline" size="sm" className="admin-appeal-review-card-action" onClick={() => navigate(`${apartmentDetailBasePath}/${context.apartmentId}`, { state: { returnTo: `${portalBasePath}?section=appeals`, backLabel: "Back to Appeals" } })}><Eye size={16}/> View Apartment <ArrowRight size={16}/></Button>}</div>
      </div>
    </section>

    <section className="admin-appeal-review-card admin-appeal-review-section">
      <div className="admin-appeal-review-section-title"><span><FileText/></span><div><h2>Original Tenant Report</h2><p>The issue reported by the tenant.</p></div></div>
      <div className="admin-appeal-review-summary-grid">
        <div className="admin-appeal-review-summary-issue"><small>Tenant-submitted problem</small><strong>{context.report?.details || context.report?.issue_type || context.report?.category || "Report details unavailable."}</strong></div>
        <div><CalendarDays/><small>Submitted</small><strong>{reportDate}</strong></div>
        <div><CalendarDays/><small>Appeal deadline</small><strong>{deadlineFor(context.report?.appeal_deadline)}</strong></div>
      </div>
      <div className="admin-appeal-review-evidence-group"><p>Evidence</p>{reportEvidence.length ? <div className="admin-appeal-review-evidence">{reportEvidence.map((item, index) => <a key={item.id || item.path || index} href={item.file_url || item.url} target="_blank" rel="noreferrer"><FileText size={18}/><span>View report evidence {index + 1}</span><ExternalLink size={16}/></a>)}</div> : <p className="admin-appeal-review-empty-note">No report evidence uploaded.</p>}</div>
    </section>

    <section className="admin-appeal-review-card admin-appeal-review-section">
      <div className="admin-appeal-review-section-title"><span><MessageCircle/></span><div><h2>Landlord Appeal</h2><p>The landlord&apos;s explanation and supporting documents.</p></div></div>
      <div className="admin-appeal-review-summary-grid admin-appeal-review-appeal-summary">
        <div className="admin-appeal-review-summary-issue"><small>Appeal statement</small><strong>{selectedAppeal.appeal_message || selectedAppeal.description || "No appeal message provided."}</strong></div>
        <div><CalendarDays/><small>Submitted</small><strong>{appealDate}</strong></div>
      </div>
      {(selectedAppeal.evidence_request_message || selectedAppeal.evidence_deadline) && <div className="admin-appeal-review-workflow-note">{selectedAppeal.evidence_request_message && <p><strong>Evidence request:</strong> {selectedAppeal.evidence_request_message}</p>}{selectedAppeal.evidence_deadline && <p><strong>Submit by:</strong> {deadlineFor(selectedAppeal.evidence_deadline)}</p>}</div>}
      <div className="admin-appeal-review-evidence-group"><p>Attached Screenshots</p>{appealEvidence.length ? <div className="admin-appeal-review-evidence">{appealEvidence.map((item, index) => <a key={item.path || item.id || index} href={item.file_url || item.url} target="_blank" rel="noreferrer"><ImageIcon size={22}/><span><strong>{documentName(item, index, "Supporting evidence")}</strong><small>{documentSize(item)}</small></span><Download size={19}/></a>)}</div> : <p className="admin-appeal-review-empty-note">No supporting evidence submitted.</p>}</div>
    </section>

    <section className="admin-appeal-review-card admin-appeal-review-section admin-appeal-review-decision">
      <div className="admin-appeal-review-section-title"><span><Settings2/></span><div><h2>Admin Actions</h2><p>Take action on this appeal based on your review.</p></div></div>
      {reviewable ? <div className="admin-appeal-review-actions"><Button onClick={() => setAction("approved")}><CheckCircle2 size={18}/> Approve Appeal</Button><Button variant="outline" onClick={() => setAction("request_evidence")}><Send size={18}/> Request More Evidence</Button><Button variant="destructive" onClick={() => setAction("dismissed")}><XCircle size={18}/> Dismiss Appeal</Button></div> : finalDecisionRequired ? <><p className="admin-appeal-review-decision-note">The appeal is dismissed or its response period expired. Choose the final listing decision.</p><div className="admin-appeal-review-actions"><Button onClick={() => setAction("keep_published")}>Keep Published / Close Case</Button><Button variant="destructive" onClick={() => setAction("unpublish_listing")}>Unpublish Listing</Button></div></> : <div className="admin-appeal-review-decision-summary"><strong>{labelFor(status)}</strong><p>{selectedAppeal.admin_response || "No final response recorded."}</p></div>}
    </section>
    <Dialog open={Boolean(action)} onOpenChange={(open) => !saving && !open && setAction(null)}><DialogContent aria-describedby="appeal-workflow-description"><DialogTitle>{action === "request_evidence" ? "Request More Evidence" : action === "approved" ? "Approve Appeal" : action === "dismissed" ? "Dismiss Appeal" : action === "unpublish_listing" ? "Unpublish Listing" : "Keep Listing Published"}</DialogTitle><p id="appeal-workflow-description">{action === "request_evidence" ? "State exactly what evidence is required. The landlord receives seven days to respond." : "Record the reason for this decision. Both parties receive the relevant resolution notice."}</p><textarea className="admin-appeals-textarea" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Decision notes or evidence request..."/><div className="admin-appeals-row-7"><Button variant="outline" disabled={saving} onClick={() => setAction(null)}>Cancel</Button><Button disabled={saving || !notes.trim()} onClick={() => void save()}>{saving ? "Saving..." : "Confirm"}</Button></div></DialogContent></Dialog>
  </main>;
}
