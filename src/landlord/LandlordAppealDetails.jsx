import "./LandlordAppealDetails.css";

import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { PropertyGuidelines } from "@/landlord/PropertyGuidelines";
import { getImageUrl } from "@/utils/images";
import { Eye, MapPin, X } from "lucide-react";
import { useState } from "react";

const displayDate = (value) => value ? new Date(value).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "Not available";
const sourceMetadata = (appeal) => (appeal?.supporting_docs || []).find((item) => item && typeof item === "object" && item.kind === "source") || {};
const normalizeStatus = (status) => String(status || "pending_review").trim().toLowerCase().replace(/[ -]/g, "_");

function appealOutcome(status) {
  if (status === "approved") return { tone: "approved", label: "Appeal Approved", message: "The admin has approved your appeal. Your apartment remains published on AptFindr.", defaultResponse: "Your appeal was approved after the submitted information was reviewed. The report has been resolved and no further action is required.", isFinal: true };
  if (["denied", "rejected", "dismissed"].includes(status)) return { tone: "denied", label: "Appeal Denied", message: "The admin has denied your appeal. The original decision remains in place.", defaultResponse: "Your appeal was not approved. Please review the listing guidelines and the administrator's decision.", isFinal: true, showGuidelines: true };
  if (status === "more_evidence_requested") return { tone: "evidence", label: "Additional Evidence Required", message: "The administrator requested more information before making a final decision.", defaultResponse: "Please submit the requested evidence before the deadline so the administrator can continue reviewing your appeal.", needsEvidence: true };
  if (status === "evidence_deadline_expired") return { tone: "expired", label: "Evidence Deadline Expired", message: "The time to submit the requested evidence has expired. An administrator will make the final decision.", defaultResponse: "The requested evidence was not submitted before the deadline.", isFinal: true };
  return { tone: "review", label: status === "additional_evidence_submitted" ? "Evidence Submitted" : "Under Review", message: status === "additional_evidence_submitted" ? "Your additional evidence was submitted and is being reviewed by the administrator." : "Your appeal is currently being reviewed by the admin. You will be notified once a decision has been made." };
}

export function LandlordAppealDetails({ appeal, apartment, onBack, onViewApartment, onSubmitEvidence }) {
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const source = sourceMetadata(appeal);
  const status = normalizeStatus(appeal?.status);
  const outcome = appealOutcome(status);
  const image = apartment?.image || apartment?.image_url || apartment?.images?.[0] || apartment?.apartment_images?.[0]?.url;
  const listingStatus = apartment?.is_published === true || apartment?.isPublished === true ? "Published" : "Unpublished";
  const evidenceDeadline = appeal?.evidence_deadline;
  const evidenceExpired = Boolean(evidenceDeadline && new Date(evidenceDeadline).getTime() <= Date.now());
  const canSubmitEvidence = outcome.needsEvidence && !evidenceExpired;
  const hasAdminResponse = Boolean(appeal?.admin_response?.trim());

  return <div className="landlord-appeal-details__overlay" role="presentation" onMouseDown={onBack}>
    <main className="landlord-appeal-details" role="dialog" aria-modal="true" aria-labelledby="landlord-appeal-details-title" onMouseDown={(event) => event.stopPropagation()}>
    <header className="landlord-appeal-details__header"><div><h1 id="landlord-appeal-details-title">Appeal Details</h1><p>View the details of your appeal and the admin&apos;s decision.</p></div><button className="landlord-appeal-details__close" type="button" onClick={onBack} aria-label="Close appeal details"><X size={20}/></button></header>

    <section className="landlord-appeal-details__apartment">
      {image ? <ImageWithFallback className="landlord-appeal-details__image" src={getImageUrl(image)} alt="Apartment" /> : <div className="landlord-appeal-details__image-placeholder" />}
      <div><h2>{apartment?.title || source.apartment_title || "Apartment unavailable"}</h2><p><MapPin size={15}/>{apartment?.address || apartment?.location || source.apartment_location || "Location unavailable"}</p><small>Report · {displayDate(appeal?.report_submitted_at || source.report_submitted_at)}</small></div>
    </section>

    <section className={`landlord-appeal-details__status is-${outcome.tone}`}><small>APPEAL DECISION</small><h2>{outcome.label}</h2><p>{outcome.message}</p></section>

    <section className="landlord-appeal-details__panel"><h2>Appeal Information</h2><dl><dt>Appeal Type</dt><dd>Property Report Appeal</dd><dt>Date Submitted</dt><dd>{displayDate(appeal?.submitted_at || appeal?.created_at)}</dd><dt>Reason for Appeal</dt><dd>{appeal?.appeal_message || appeal?.description || appeal?.reason || "No reason provided."}</dd></dl></section>

    {outcome.needsEvidence && <section className="landlord-appeal-details__additional"><h2>Requested Evidence</h2><p className="landlord-appeal-details__notice">{appeal?.evidence_request_message || appeal?.admin_response || outcome.defaultResponse}{evidenceDeadline && <><br/><strong>Submit before: {displayDate(evidenceDeadline)}{evidenceExpired ? " (expired)" : ""}</strong></>}</p></section>}

    {(outcome.isFinal || hasAdminResponse) && !outcome.needsEvidence && <section className="landlord-appeal-details__additional"><h2>Admin Response</h2><p className="landlord-appeal-details__notice">{appeal?.admin_response || outcome.defaultResponse}</p></section>}

    {outcome.tone === "review" && <section className="landlord-appeal-details__additional"><h2>Additional Information</h2><p className="landlord-appeal-details__notice">Our team is reviewing the submitted documents and information. This usually takes 2–3 business days.</p></section>}

    {outcome.tone === "approved" && <section className="landlord-appeal-details__listing"><h2>Current Status</h2><strong>{listingStatus}</strong><p>{listingStatus === "Published" ? "Your apartment is visible to tenants on AptFindr." : "Check your listing for its current availability."}</p></section>}

    <footer>
      <Button variant="outline" onClick={onBack}>Back to Notifications</Button>
      {canSubmitEvidence ? <Button onClick={onSubmitEvidence}>Submit Evidence</Button> : outcome.showGuidelines ? <Button onClick={() => setGuidelinesOpen(true)}>View Guidelines</Button> : <Button disabled={!apartment?.id} onClick={onViewApartment}><Eye size={17}/>View Apartment</Button>}
    </footer>

    {guidelinesOpen && <PropertyGuidelines onAccept={() => setGuidelinesOpen(false)} onClose={() => setGuidelinesOpen(false)} />}
    </main>
  </div>;
}
