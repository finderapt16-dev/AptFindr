import { useCallback, useMemo, useRef, useState } from "react";
import { PolicyDialog } from "./PolicyDialog";
import { prefetchAudience, prefetchPolicy } from "./policyLoader";

/**
 * Opens Terms of Service / Privacy Policy popups from any page.
 *
 * Usage:
 *
 *   const { openPolicy, policyDialog, policyLinkProps } = usePolicyDialog("tenant");
 *   <button {...policyLinkProps("tenant-terms")}>Terms of Service</button>
 *   {policyDialog}
 *
 * `policyLinkProps` returns the handlers that make the popup feel instant:
 * the document chunk is requested on hover, focus, or touch-start, before the
 * click is completed, and the popup then renders straight from the cache.
 */
export function usePolicyDialog(audience = "tenant") {
  const [activePolicyId, setActivePolicyId] = useState(null);
  const triggerRef = useRef(null);
  const resolvedAudience = audience === "landlord" ? "landlord" : "tenant";

  const openPolicy = useCallback((policyId, trigger) => {
    if (!policyId) return;
    prefetchPolicy(policyId);
    const element = trigger?.current instanceof HTMLElement
      ? trigger.current
      : trigger instanceof HTMLElement
        ? trigger
        : document.activeElement;
    triggerRef.current = element instanceof HTMLElement ? element : null;
    setActivePolicyId(policyId);
  }, []);

  const closePolicy = useCallback(() => setActivePolicyId(null), []);

  /** Warms both documents for this audience ahead of a click. */
  const warmPolicies = useCallback(() => prefetchAudience(resolvedAudience), [resolvedAudience]);

  const policyLinkProps = useCallback((policyId) => ({
    type: "button",
    onPointerEnter: () => prefetchPolicy(policyId),
    onPointerDown: () => prefetchPolicy(policyId),
    onTouchStart: () => prefetchPolicy(policyId),
    onFocus: () => prefetchPolicy(policyId),
    onClick: (event) => {
      event.preventDefault();
      event.stopPropagation();
      openPolicy(policyId, event.currentTarget);
    },
  }), [openPolicy]);

  const policyDialog = useMemo(() => (
    activePolicyId
      ? <PolicyDialog policyId={activePolicyId} onClose={closePolicy} returnFocusRef={triggerRef} />
      : null
  ), [activePolicyId, closePolicy]);

  return { openPolicy, closePolicy, warmPolicies, policyLinkProps, policyDialog, audience: resolvedAudience };
}
