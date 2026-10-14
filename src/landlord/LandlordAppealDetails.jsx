import "./LandlordAppealDetails.css";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { getImageUrl } from "@/utils/images";
import { CheckCircle2, Clock3, MapPin, ShieldAlert, ArrowLeft, Eye } from "lucide-react";

const displayDate = (value) => value ? new Date(value).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "Not available";
const sourceMetadata = (appeal) => (appeal?.supporting_docs || []).find((item) => item && typeof item === "object" && item.kind === "source") || {};

export function LandlordAppealDetails({ appeal, apartment, onBack, onViewApartment }) {
  const source = sourceMetadata(appeal);
  const status = String(appeal?.status || "under_review").toLowerCase();
  const approved = status === "approved";
  const denied = status === "denied" || status === "rejected" || status === "dismissed";
  const waitingForEvidence = status === "more_evidence_requested";
  const evidenceExpired = status === "evidence_deadline_expired";
  const StatusIcon = approved ? CheckCircle2 : denied ? ShieldAlert : Clock3;
  const label = approved ? "Appeal Approved" : denied ? "Appeal Dismissed" : waitingForEvidence ? "Additional Evidence Required" : evidenceExpired ? "Evidence Deadline Expired" : "Under Review";
  const message = approved
    ? "The admin has approved your appeal."
    : denied
      ? "The admin has denied your appeal. The original decision remains in place."
      : waitingForEvidence ? "The administrator requested additional evidence. Submit it before the deadline in your notification." : evidenceExpired ? "The evidence deadline expired. An administrator will make the final decision." : "Your appeal is currently being reviewed by the admin. You will be notified once a decision has been made.";
  const image = apartment?.image || apartment?.image_url || apartment?.images?.[0] || apartment?.apartment_images?.[0]?.url;
  const listingStatus = apartment?.status || (apartment?.is_published ?? apartment?.isPublished ? "published" : "unpublished");

  return <main className="landlord-appeal-details">
    <button type="button" className="landlord-appeal-details__back" onClick={onBack}><ArrowLeft size={17}/> Back to Notifications</button>
    <header><h1>Appeal Details</h1><p>View the details of your appeal and the admin's decision.</p></header>
    <section className="landlord-appeal-details__apartment">
      {image ? <ImageWithFallback src={getImageUrl(image)} alt="Apartment"/> : <div className="landlord-appeal-details__image-placeholder"/>}
      <div><h2>{apartment?.title || source.apartment_title || "Apartment unavailable"}</h2><p><MapPin size={15}/> {apartment?.address || apartment?.location || source.apartment_location || "Location unavailable"}</p><small>Report · {displayDate(appeal?.report_submitted_at || source.report_submitted_at)}</small></div>
    </section>
    <section className={`landlord-appeal-details__status is-${approved ? "approved" : denied ? "denied" : "review"}`}>
      <StatusIcon/><div><small>APPEAL DECISION</small><h2>{label}</h2><p>{message}</p></div>
    </section>
    <section className="landlord-appeal-details__panel"><h2>Appeal Information</h2><dl><dt>Appeal Type</dt><dd>Property Report Appeal</dd><dt>Date Submitted</dt><dd>{displayDate(appeal?.submitted_at || appeal?.created_at)}</dd><dt>Reason for Appeal</dt><dd>{appeal?.appeal_message || appeal?.description || appeal?.reason || "No reason provided."}</dd></dl></section>
    {appeal?.admin_response && <section className="landlord-appeal-details__panel"><h2>Admin Response</h2><p>{appeal.admin_response}</p></section>}
    {appeal?.evidence_request_message && <section className="landlord-appeal-details__panel"><h2>Requested Evidence</h2><p>{appeal.evidence_request_message}</p><p>Submit before: {displayDate(appeal.evidence_deadline)}</p></section>}
    {approved && <section className="landlord-appeal-details__listing"><h2>Current Status</h2><strong>{String(listingStatus).replace(/_/g, " ")}</strong><p>{String(listingStatus).toLowerCase() === "published" ? "Your apartment is visible to tenants on AptFindr." : "Check your listing for its current availability."}</p></section>}
    {!approved && !denied && <section className="landlord-appeal-details__notice">Your appeal is being reviewed. This usually takes 2–3 business days.</section>}
    <footer><Button variant="outline" onClick={onBack}>Back to Notifications</Button><Button disabled={!apartment?.id} onClick={onViewApartment}><Eye size={17}/> View Apartment</Button></footer>
  </main>;
}
