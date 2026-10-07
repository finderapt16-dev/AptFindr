import { PolicyDialog } from "@/legal/PolicyDialog";
import { prefetchPolicy } from "@/legal/policyLoader";
import { policyIdFor } from "@/legal/policyIds";

/**
 * Signup consent links.
 *
 * The tenant and landlord flows have their own Terms of Service and Privacy
 * Policy, so the document that opens follows the role selected in the form
 * ("tenant-terms", "landlord-privacy", ...). The panel reuses the shared legal
 * popup; only the signup-specific overlay and viewport clamping are added.
 */
export function SignupPolicyDialog({ policy, role, onClose, returnFocusRef }) {
  return (
    <PolicyDialog
      policyId={policyIdFor(role, policy)}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      contentClassName="signup-review-dialog signup-policy-dialog"
      overlayClassName="signup-review-overlay"
    />
  );
}

export function SignupAgreement({ checked, onChange, disabled, onPolicyClick, role = "tenant" }) {
  const warm = (kind) => () => prefetchPolicy(policyIdFor(role, kind));
  return (
    <label className="signup-agreement">
      <input name="termsAccepted" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} className="signup-checkbox" aria-label="I agree to the Terms of Service and Privacy Policy" />
      <span>
        I agree to the {" "}
        <button type="button" className="signup-policy-link" disabled={disabled} onPointerEnter={warm("terms")} onFocus={warm("terms")} onTouchStart={warm("terms")} onClick={(event) => { event.preventDefault(); onPolicyClick("terms", event.currentTarget); }}>Terms of Service</button>
        {" "}and{" "}
        <button type="button" className="signup-policy-link" disabled={disabled} onPointerEnter={warm("privacy")} onFocus={warm("privacy")} onTouchStart={warm("privacy")} onClick={(event) => { event.preventDefault(); onPolicyClick("privacy", event.currentTarget); }}>Privacy Policy</button>.
      </span>
    </label>
  );
}
