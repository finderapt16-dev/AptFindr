import "./SuperAdminRequestChangesDialog.css";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

const REQUEST_TYPES = [
  "Business permit",
  "Apartment information",
  "Location details",
  "Apartment photos",
  "Other",
];

export function AdminRequestChangesDialog({ open, onClose, onSubmit, isSending = false }) {
  const [requestType, setRequestType] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open) {
      setRequestType("");
      setMessage("");
    }
  }, [open]);

  const submit = async (event) => {
    event.preventDefault();
    if (!requestType || !message.trim() || isSending)
      return;
    await onSubmit({ requestType, message: message.trim() });
  };

  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isSending) onClose(); }}>
    <DialogContent className="admin-request-changes" overlayClassName="admin-request-changes__overlay" showCloseButton={false} aria-describedby="admin-request-changes-description">
      <button type="button" className="admin-request-changes__close" onClick={onClose} disabled={isSending} aria-label="Close request changes form"><X aria-hidden="true" /></button>
      <DialogTitle>Request Changes</DialogTitle>
      <p id="admin-request-changes-description">Send a request to the landlord to correct or update their submitted verification information.</p>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          Request Type <span aria-hidden="true">*</span>
          <select value={requestType} onChange={(event) => setRequestType(event.target.value)} disabled={isSending} required>
            <option value="" disabled>Select request type</option>
            {REQUEST_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label>
          Message <span aria-hidden="true">*</span>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explain what needs to be corrected or updated..." maxLength={500} disabled={isSending} required />
        </label>
        <p className="admin-request-changes__count" aria-live="polite">{message.length} / 500</p>
        <footer>
          <button type="button" onClick={onClose} disabled={isSending}>Cancel</button>
          <button type="submit" disabled={isSending || !requestType || !message.trim()}>{isSending ? "Sending..." : "Send Request"}</button>
        </footer>
      </form>
    </DialogContent>
  </Dialog>;
}
