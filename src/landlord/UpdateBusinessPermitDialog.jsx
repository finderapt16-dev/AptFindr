import { useRef, useState } from "react";
import { Check, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { submitBusinessPermitUpdate } from "@/services/businessPermitRenewalService";
import { toast } from "sonner";

export function UpdateBusinessPermitDialog({ permit, landlordId, onClose, onSubmitted }) {
    const [form, setForm] = useState({ permitNumber: permit.permitNumber || "", businessAccount: permit.businessAccount || "", issuedAt: (permit.issuedAt || "").slice(0, 10) });
    const [files, setFiles] = useState([]);
    const [saving, setSaving] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const picker = useRef(null);
    const addFiles = selected => {
        if (saving) return;
        const valid = [];
        for (const file of Array.from(selected)) {
            if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) { toast.error("Use PDF, JPG, JPEG, or PNG files."); continue; }
            if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} exceeds 5 MB.`); continue; }
            if (![...files, ...valid].some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified)) valid.push(file);
        }
        if (files.length + valid.length > 5) toast.error("Upload up to five files.");
        setFiles(current => [...current, ...valid].slice(0, 5));
    };
    const submit = async event => {
        event.preventDefault();
        if (saving) return;
        if (!files.length || !form.permitNumber.trim() || !form.businessAccount.trim() || !form.issuedAt) return void toast.error("Upload a permit and complete all fields.");
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
        if (form.issuedAt > today) return void toast.error("The issued date cannot be in the future.");
        setSaving(true);
        try {
            await submitBusinessPermitUpdate({ landlordId, apartmentId: permit.apartmentId, ...form, files });
            setSubmitted(true);
            onSubmitted();
        } catch (error) { toast.error(error.message || "Unable to submit the permit."); }
        finally { setSaving(false); }
    };
    return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
      <DialogContent className={`permit-update-dialog ${submitted ? "permit-update-success" : ""}`} overlayClassName="permit-update-overlay" showCloseButton={submitted} aria-describedby={submitted ? "permit-submission-description" : undefined}>
        {submitted ? <>
          <span className="permit-success-check"><Check aria-hidden="true"/></span>
          <DialogTitle>Permit Details Submitted</DialogTitle>
          <p id="permit-submission-description">Your updated business permit verification records have been successfully uploaded and are currently under review by our administration team.<br/>This process typically takes 1 to 2 business days.</p>
          <button type="button" className="permit-update-primary" onClick={onClose}>Close</button>
        </> : <>
          <DialogTitle>Update Business Permit</DialogTitle>
          <form onSubmit={submit}>
            <fieldset disabled={saving}>
              <label className="permit-upload-label">Upload Permit <small>( PDF or Image )</small></label>
              <input ref={picker} type="file" multiple accept="application/pdf,image/jpeg,image/png" hidden onChange={event => { addFiles(event.target.files); event.target.value = ""; }}/>
              <button type="button" className="permit-update-dropzone" onClick={() => picker.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); addFiles(event.dataTransfer.files); }}><Upload/><strong>Drag and drop files here or click to browse</strong><span>PDF, JPG, JPEG, or PNG • Max 5MB • Up to 5 files</span></button>
              {files.length > 0 && <ul className="permit-update-files">{files.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(current => current.filter((_, position) => position !== index))}><X/></button></li>)}</ul>}
              <label>Permit Number<input value={form.permitNumber} onChange={event => setForm({ ...form, permitNumber: event.target.value })} placeholder="BP 2026-1231" required/></label>
              <label>Business Account Number<input value={form.businessAccount} onChange={event => setForm({ ...form, businessAccount: event.target.value })} placeholder="A-A1087" required/></label>
              <label>Date Issued<input type="date" value={form.issuedAt} onChange={event => setForm({ ...form, issuedAt: event.target.value })} required/></label>
            </fieldset>
            <footer><button type="button" disabled={saving} onClick={onClose}>Close</button><button type="submit" className="permit-update-primary" disabled={saving}>{saving ? "Submitting..." : "Submit"}</button></footer>
          </form>
        </>}
      </DialogContent>
    </Dialog>;
}
