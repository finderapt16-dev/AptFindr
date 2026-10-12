/**
 * Public-facing legal metadata.
 *
 * Deliberately tiny and NOT code-split: the public policy page needs the
 * contact address, the "last updated" date, and the canonical route paths
 * before (and while) the document text is still downloading.
 *
 * `POLICY_UPDATED` is the single place to bump whenever the wording in
 * `policyContent.js` changes.
 */

/** ISO date of the last revision to the wording in policyContent.js. */
export const POLICY_UPDATED = "2026-09-30";

/** Shown to visitors on the public policy pages and in the page footer. */
export const POLICY_CONTACT_EMAIL = "rentiloilo@example.com";
export const POLICY_CONTEXT = "La Paz, Iloilo City, Philippines";

/** Formats POLICY_UPDATED for display, e.g. "30 September 2026". */
export function formatPolicyUpdated(isoDate = POLICY_UPDATED) {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Public, shareable paths for the two documents.
 *
 * These are the URLs to paste into third-party settings, most importantly:
 *   Supabase -> Authentication -> URL Configuration
 *     - Application privacy policy link  ->  /privacy-policy
 *     - Application terms of service link -> /terms-of-service
 *
 * They are rendered by the same router as the rest of the app, so they work on
 * a direct visit, a refresh, and a shared link.
 */
export const POLICY_ROUTES = {
  privacy: "/privacy-policy",
  terms: "/terms-of-service",
};

/** The other document, for the in-page "read the other one" navigation. */
export const POLICY_KIND_LABEL = {
  privacy: "Privacy Policy",
  terms: "Terms of Service",
};
