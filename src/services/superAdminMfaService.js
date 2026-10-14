import { supabase } from "./supabaseClient";

export async function getSuperAdminMfaState() {
  const [{ data: assurance, error: assuranceError }, { data: factors, error: factorsError }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);
  if (assuranceError) throw assuranceError;
  if (factorsError) throw factorsError;
  const verifiedFactor = factors?.totp?.find((factor) => factor.status === "verified") ?? null;
  return {
    verified: assurance?.currentLevel === "aal2",
    verifiedFactor,
  };
}

export async function enrollSuperAdminMfa() {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    // Supabase hides abandoned, unverified factors from listFactors(), while
    // still reserving their names. A unique suffix keeps setup retryable.
    friendlyName: `AptFindr Super Admin ${Date.now().toString(36)}`,
  });
  if (error) throw error;
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export async function verifySuperAdminMfa(factorId, code) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) throw error;
}
