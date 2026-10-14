import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { enrollSuperAdminMfa, getSuperAdminMfaState, verifySuperAdminMfa } from "@/services/superAdminMfaService";
import { KeyRound, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import "./super_admin_mfa.css";

export function SuperAdminMfaGate({ children }) {
  const { logout } = useAuth();
  const [status, setStatus] = useState("loading");
  const [factorId, setFactorId] = useState("");
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const loadState = useCallback(async () => {
    setError("");
    setStatus("loading");
    try {
      const state = await getSuperAdminMfaState();
      if (state.verified) {
        setStatus("verified");
        return;
      }
      if (state.verifiedFactor) {
        setFactorId(state.verifiedFactor.id);
        setStatus("challenge");
        return;
      }
      setStatus("enroll-required");
    } catch (stateError) {
      setError(stateError instanceof Error ? stateError.message : "Unable to check multi-factor authentication.");
      setStatus("error");
    }
  }, []);

  useEffect(() => { void loadState(); }, [loadState]);

  const startEnrollment = async () => {
    setError("");
    setStatus("working");
    try {
      const nextEnrollment = await enrollSuperAdminMfa();
      setEnrollment(nextEnrollment);
      setFactorId(nextEnrollment.factorId);
      setStatus("enroll");
    } catch (enrollError) {
      setError(enrollError instanceof Error ? enrollError.message : "Unable to start MFA enrollment.");
      setStatus("enroll-required");
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    const normalizedCode = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setError("");
    setStatus("working");
    try {
      await verifySuperAdminMfa(factorId, normalizedCode);
      await loadState();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "The verification code is invalid or expired.");
      setStatus(enrollment ? "enroll" : "challenge");
    }
  };

  const signOut = async () => {
    await logout();
    window.location.assign("/");
  };

  if (status === "verified") return children;

  const loading = status === "loading" || status === "working";
  return (
    <main className="super-admin-mfa-page">
      <section className="super-admin-mfa-panel" aria-labelledby="super-admin-mfa-title">
        <img src="/aptfindr-wordmark.png?v=2" alt="AptFindr" />
        <span className="super-admin-mfa-icon"><ShieldCheck aria-hidden="true" /></span>
        <h1 id="super-admin-mfa-title">Super Admin Verification</h1>
        <p>Multi-factor authentication is required before accessing administrative data and controls.</p>

        {loading && <div className="super-admin-mfa-loading"><Loader2 aria-hidden="true" /> Verifying security status...</div>}

        {status === "enroll-required" && (
          <Button type="button" onClick={() => void startEnrollment()}><KeyRound aria-hidden="true" /> Set up authenticator</Button>
        )}

        {status === "enroll" && enrollment && (
          <div className="super-admin-mfa-enrollment">
            <p>Scan this QR code using Google Authenticator, Microsoft Authenticator, or another TOTP app.</p>
            <img className="super-admin-mfa-qr" src={enrollment.qrCode} alt="Authenticator enrollment QR code" />
            <div className="super-admin-mfa-secret"><span>Manual setup key</span><code>{enrollment.secret}</code></div>
          </div>
        )}

        {(status === "challenge" || status === "enroll") && (
          <form onSubmit={verify}>
            <label htmlFor="super-admin-mfa-code">Authentication code</label>
            <input id="super-admin-mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" autoFocus />
            <Button type="submit"><ShieldCheck aria-hidden="true" /> Verify and continue</Button>
          </form>
        )}

        {status === "error" && <Button type="button" variant="outline" onClick={() => void loadState()}>Try again</Button>}
        {error && <p className="super-admin-mfa-error" role="alert">{error}</p>}
        <button className="super-admin-mfa-logout" type="button" onClick={() => void signOut()}><LogOut aria-hidden="true" /> Sign out</button>
      </section>
    </main>
  );
}
