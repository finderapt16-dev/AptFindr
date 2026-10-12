/**
 * Policy identifiers.
 *
 * Kept in its own tiny module so components can resolve a document id without
 * importing policyContent.js, which is code-split and only downloaded when a
 * popup actually opens.
 */

export const POLICY_AUDIENCES = ["tenant", "landlord"];
export const POLICY_KINDS = ["terms", "privacy"];

/** Normalizes any user-supplied value to a known audience. */
export function resolveAudience(value) {
  return value === "landlord" ? "landlord" : "tenant";
}

/** Normalizes any user-supplied value to a known document kind. */
export function resolveKind(value) {
  return value === "privacy" ? "privacy" : "terms";
}

/** Maps an audience ("tenant" | "landlord") and kind ("terms" | "privacy") to a policy id. */
export function policyIdFor(audience, kind) {
  return `${resolveAudience(audience)}-${resolveKind(kind)}`;
}

/** Reads a policy id back into its parts, e.g. "landlord-privacy". */
export function parsePolicyId(policyId) {
  const [audience, kind] = String(policyId ?? "").split("-");
  return { audience: resolveAudience(audience), kind: resolveKind(kind) };
}
