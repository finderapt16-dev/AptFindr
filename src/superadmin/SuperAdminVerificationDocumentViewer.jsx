import "./SuperAdminVerificationDocumentViewer.css";
import { ArrowLeft, Download, Minus, Plus } from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { useState } from "react";

const value = (input, fallback = "Not provided") => String(input ?? "").trim() || fallback;
const formatDate = (input) => {
  if (!input) return "Not provided";
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? "Not provided" : date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};

export function AdminVerificationDocumentViewer({ landlord, profile, property, documents = [], onBack }) {
  const [zoom, setZoom] = useState(100);
  const [isDownloading, setIsDownloading] = useState(false);
  const verification = property?.features?.verification && typeof property.features.verification === "object" ? property.features.verification : {};
  const businessPermitDocument = documents.find((document) => document.documentType === "mayors_business_permit") ?? documents.find((document) => document.documentType === "proof_of_ownership");
  const documentUrl = businessPermitDocument?.previewUrl ?? profile?.verification_document_url ?? profile?.business_permit_url;
  const isPdfDocument = businessPermitDocument?.mimeType === "application/pdf" || /\.pdf(?:\?|$)/i.test(documentUrl ?? "");
  const permitNumber = verification.businessPermit ?? profile?.business_permit_number ?? profile?.permit_number ?? landlord?.business_permit_number ?? landlord?.permit_number;
  const address = landlord?.address ?? landlord?.business_address ?? profile?.address ?? profile?.business_address ?? [landlord?.barangay, landlord?.city].filter(Boolean).join(", ");
  const submittedOn = property?.createdAt ?? property?.created_at ?? profile?.created_at;
  const setZoomWithinRange = (nextZoom) => setZoom(Math.max(70, Math.min(150, nextZoom)));
  const handleDownload = async () => {
    if (!documentUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(documentUrl);
      if (!response.ok) throw new Error("Unable to download the document.");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = objectUrl;
      downloadLink.download = businessPermitDocument?.fileName || `business-permit.${isPdfDocument ? "pdf" : "jpg"}`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error("Unable to download business permit:", error);
      // Preserve a usable fallback if a browser blocks downloading a signed file.
      window.open(documentUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsDownloading(false);
    }
  };

  return <div className="admin-verification-document-viewer">
    <header className="admin-verification-document-viewer__header">
      <button type="button" onClick={onBack}><ArrowLeft aria-hidden="true" />Back to Review</button>
      <div><h1>Business Permit</h1><p>Submitted verification document</p></div>
      <span aria-hidden="true" />
    </header>

    <div className="admin-verification-document-viewer__toolbar">
      <span>Page 1 of 1</span>
      <div>
        <button type="button" aria-label="Zoom out" onClick={() => setZoomWithinRange(zoom - 10)} disabled={zoom <= 70}><Minus aria-hidden="true" /></button>
        <output aria-live="polite">{zoom}%</output>
        <button type="button" aria-label="Zoom in" onClick={() => setZoomWithinRange(zoom + 10)} disabled={zoom >= 150}><Plus aria-hidden="true" /></button>
      </div>
    </div>

    <section className="admin-verification-document-viewer__canvas" aria-label="Business permit preview">
      {documentUrl && (isPdfDocument
        ? <iframe className="admin-verification-document-viewer__actual-pdf" style={{ "--document-zoom": zoom / 100 }} src={`${documentUrl}#toolbar=0&navpanes=0`} title="Submitted business permit" />
        : <div className="admin-verification-document-viewer__actual-image-frame" style={{ "--document-zoom": zoom / 100 }}><ImageWithFallback src={documentUrl} alt="Submitted business permit" className="admin-verification-document-viewer__actual-image" /></div>
      )}
      {!documentUrl && <article className="admin-verification-document-viewer__permit" style={{ "--document-zoom": zoom / 100 }}>
        <div className="admin-verification-document-viewer__seal" aria-hidden="true" />
        <p className="admin-verification-document-viewer__city">CITY OF ILOILO</p>
        <h2>BUSINESS PERMIT</h2>
        <hr />
        <dl>
          <div><dt>Permit Number</dt><dd>{value(permitNumber)}</dd></div>
          <div><dt>Business Owner</dt><dd>{value(landlord?.name ?? landlord?.full_name)}</dd></div>
          <div><dt>Business Address</dt><dd>{value(address)}</dd></div>
          <div><dt>Date Issued</dt><dd>{formatDate(verification.issuedAt ?? verification.dateIssued ?? profile?.permit_issued_at)}</dd></div>
          <div><dt>Date Submitted</dt><dd>{formatDate(submittedOn)}</dd></div>
        </dl>
        <div className="admin-verification-document-viewer__rules" aria-hidden="true"><i /><i /><i /><i /></div>
        <p className="admin-verification-document-viewer__note">Document preview for administrative verification.</p>
        <div className="admin-verification-document-viewer__signature" aria-hidden="true"><b>⌁⌁〰⌁</b><small>Authorized Signature</small></div>
      </article>}
      {documentUrl && <button type="button" className="admin-verification-document-viewer__download" onClick={() => void handleDownload()} disabled={isDownloading}><Download aria-hidden="true" />{isDownloading ? "Downloading..." : "Download Document"}</button>}
      {!documentUrl && <span className="admin-verification-document-viewer__download is-disabled"><Download aria-hidden="true" />Original document unavailable</span>}
    </section>
  </div>;
}
