/**
 * Lazy loader for the legal documents.
 *
 * Why this file exists: the policy text is the largest static block of copy in
 * the application, and most visits never open a policy. Loading it through a
 * dynamic import keeps it out of the initial bundle, while the cache below
 * makes every later open instant:
 *
 *   - the first request starts (and shares) a single network fetch
 *   - once resolved, every document is cached in memory
 *   - components can render synchronously from the cache, with no flash
 *
 * `prefetchPolicy` is wired to hover, focus, and touch-start on the policy
 * links, so the chunk is usually already in the browser by the time a tap
 * turns into a click.
 */

const cache = new Map();
let modulePromise = null;

function loadContentModule() {
  if (!modulePromise) {
    modulePromise = import("./policyContent.js").catch((error) => {
      // Allow a later retry if the chunk failed to download once.
      modulePromise = null;
      throw error;
    });
  }
  return modulePromise;
}

/** Returns an already-downloaded policy, or null. Never triggers a request. */
export function getCachedPolicy(id) {
  return cache.get(id) ?? null;
}

/** Downloads (once) and returns the requested policy. */
export function loadPolicy(id) {
  const cached = cache.get(id);
  if (cached) return Promise.resolve(cached);
  return loadContentModule().then((module) => {
    for (const [key, value] of Object.entries(module.POLICIES)) cache.set(key, value);
    return cache.get(id) ?? null;
  });
}

/** Fire-and-forget warm-up used by hover / focus / touch handlers. */
export function prefetchPolicy(id) {
  void loadPolicy(id).catch(() => {
    // Prefetching is best effort: the dialog retries on open.
  });
}

/** Warms up every document that belongs to one audience ("tenant" | "landlord"). */
export function prefetchAudience(audience) {
  prefetchPolicy(`${audience === "landlord" ? "landlord" : "tenant"}-terms`);
  prefetchPolicy(`${audience === "landlord" ? "landlord" : "tenant"}-privacy`);
}

/** Test helper: clears the in-memory cache so loading can be re-measured. */
export function resetPolicyCache() {
  cache.clear();
  modulePromise = null;
}
