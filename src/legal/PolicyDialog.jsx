import { memo, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/components/ui/utils";
import { getCachedPolicy, loadPolicy } from "./policyLoader";
import { PolicyDocument } from "./PolicyDocument";

/**
 * The floating popup for Terms of Service / Privacy Policy, used where the
 * visitor must keep their place on the page - currently the signup consent
 * checkbox. Nothing navigates when it is opened: the document sits on top of
 * the current screen and closes with the X, Escape, or a click outside.
 *
 * The shareable, linkable version of the same documents is the public page,
 * `PolicyPage.jsx`; both render the identical body via `PolicyDocument.jsx`.
 *
 * The panel is rendered from a memory cache when the text has already been
 * prefetched, which is the normal case because every link warms the chunk on
 * hover, focus, or touch.
 */

function fallbackLabels(policyId) {
  const [audience, kind] = String(policyId ?? "").split("-");
  return {
    audienceLabel: audience === "landlord" ? "Landlord" : "Tenant",
    kindLabel: kind === "privacy" ? "Privacy Policy" : "Terms of Service",
  };
}

function PolicySkeleton() {
  return (
    <div className="apf-policy-skeleton" aria-hidden="true">
      {[92, 78, 84, 66, 88, 72, 80, 60].map((width, index) => (
        <span key={index} className="apf-policy-skeleton-line" style={{ width: `${width}%` }} />
      ))}
    </div>
  );
}

export const PolicyDialog = memo(function PolicyDialog({
  policyId,
  onClose,
  returnFocusRef,
  contentClassName,
  overlayClassName,
}) {
  const [policy, setPolicy] = useState(() => getCachedPolicy(policyId));
  const contentRef = useRef(null);
  const labels = fallbackLabels(policyId);

  useEffect(() => {
    const cached = getCachedPolicy(policyId);
    if (cached) {
      setPolicy(cached);
      return undefined;
    }
    let active = true;
    setPolicy(null);
    loadPolicy(policyId)
      .then((loaded) => { if (active && loaded) setPolicy(loaded); })
      .catch((error) => { console.error("[LEGAL] Unable to open policy", error); });
    return () => { active = false; };
  }, [policyId]);

  const closeDialog = () => onClose?.();

  return (
    <Dialog open onOpenChange={(open) => { if (!open) closeDialog(); }}>
      <DialogContent
        ref={contentRef}
        className={cn("apf-policy-dialog", contentClassName)}
        overlayClassName={cn("apf-policy-overlay", overlayClassName)}
        aria-busy={!policy}
        aria-describedby={undefined}
        // Nested dialogs (for example inside the landing signup modal) must
        // close only this panel when Escape is pressed.
        onEscapeKeyDown={(event) => { event.preventDefault(); event.stopPropagation(); closeDialog(); }}
        onKeyDownCapture={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeDialog(); } }}
        onOpenAutoFocus={(event) => {
          // Start keyboard focus on the scroll region so the document can be
          // read with the arrow keys, and the page never scrolls on open.
          event.preventDefault();
          contentRef.current?.querySelector(".apf-policy-scroll")?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(event) => {
          const trigger = returnFocusRef?.current;
          if (trigger?.isConnected) {
            event.preventDefault();
            trigger.focus({ preventScroll: true });
          }
        }}
      >
        <header className="apf-policy-head">
          <DialogTitle className="apf-policy-title">{policy?.title ?? labels.kindLabel}</DialogTitle>
        </header>

        <div className="apf-policy-scroll" tabIndex={-1} role="region" aria-label={`${policy?.title ?? labels.kindLabel} content`}>
          {policy ? <PolicyDocument policy={policy} /> : <PolicySkeleton />}
        </div>

      </DialogContent>
    </Dialog>
  );
});
