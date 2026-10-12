import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SignupAccountFields, SignupPersonalFields } from "./SignupFields";
import { ACCOUNT_REVIEW_FIELDS, PERSONAL_REVIEW_FIELDS, normalizeSignupValues, validateAccountDetails, validatePersonalInformation } from "./signupValidation";

// This dialog edits only a local registration draft, never a created account.
// It is portaled outside the signup form, so Enter cannot submit registration.
export function SignupReviewDialog({ section, values, onSave, onClose, returnFocusRef, emailReadOnly = false }) {
  const fields = section === "account" ? ACCOUNT_REVIEW_FIELDS : PERSONAL_REVIEW_FIELDS;
  const [draft, setDraft] = useState(() => Object.fromEntries(fields.map((field) => [field, values[field] ?? ""])));
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const formRef = useRef(null);
  const sectionName = section === "account" ? "Account Details" : "Personal Information";
  const sectionDescription = section === "account" ? "account details" : "personal information";

  const changeField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const save = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const validation = section === "account"
      ? validateAccountDetails(draft, { includePassword: false })
      : validatePersonalInformation(draft);
    setErrors(validation);
    const firstInvalidField = Object.keys(validation)[0];
    if (firstInvalidField) {
      formRef.current?.elements.namedItem(firstInvalidField)?.focus();
      return;
    }
    onSave(normalizeSignupValues(draft));
    setSaved(true);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className={`signup-review-dialog${saved ? " signup-review-dialog--success" : ""}`}
        overlayClassName="signup-review-overlay"
        showCloseButton={false}
        onEscapeKeyDown={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}
        onKeyDownCapture={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        {saved ? (
          <>
            <span className="signup-review-success-icon" aria-hidden="true"><Check strokeWidth={4} /></span>
            <DialogTitle>{sectionName} Updated</DialogTitle>
            <DialogDescription>Your {sectionDescription} have been updated successfully.</DialogDescription>
            <button type="button" className="signup-primary-button signup-review-ok" autoFocus onClick={onClose}>OK</button>
          </>
        ) : (
          <>
            <DialogTitle>Create Your Account</DialogTitle>
            <DialogDescription>Update your {sectionDescription} below.</DialogDescription>
            <form ref={formRef} className="signup-review-form" noValidate onSubmit={save}>
              {Object.values(errors).some(Boolean) && <p className="signup-review-error" role="alert">Please check the highlighted fields.</p>}
              {section === "account" ? (
                <SignupAccountFields values={draft} onChange={changeField} errors={errors} idPrefix="signup-review-account" includePassword={false} emailLabel="Email Address" emailReadOnly={emailReadOnly} />
              ) : (
                <SignupPersonalFields values={draft} onChange={changeField} errors={errors} idPrefix="signup-review-personal" />
              )}
              <div className="signup-review-dialog-actions">
                <button type="button" className="signup-secondary-button" onClick={onClose}>Cancel</button>
                <button type="submit" className="signup-primary-button">Save Changes</button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
