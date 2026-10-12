import "./forgot_password.css";

import { Check, LockKeyhole, Mail, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { requestPasswordResetEmail } from "@/services/authService";

export function ForgotPassword({ embedded = false, onBackToLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const goToLogin = () => {
    if (typeof onBackToLogin === "function") {
      onBackToLogin();
      return;
    }
    navigate("/login");
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    const { error: resetError } = await requestPasswordResetEmail(normalizedEmail);
    setLoading(false);

    if (resetError?.status === 429 || /rate|too many|seconds/i.test(resetError?.message || "")) {
      setError("Too many email requests. Please wait before trying again.");
      return;
    }

    // Do not disclose whether the email belongs to an account.
    setSent(true);
    toast.success("If an account exists for this email, a password reset link has been sent.");
  };

  const content = (
    <>
        {!sent ? (
          <form className="password-recovery-form" onSubmit={handleEmailSubmit}>
            <div className="password-recovery-icon password-recovery-icon--blue"><LockKeyhole aria-hidden="true" /></div>
            <div className="password-recovery-heading">
              <h1 id="forgot-password-title">Forgot Password?</h1>
              <p>No worries! We&apos;ll send a verification link to your registered email.</p>
            </div>

            <label className="password-recovery-field" htmlFor="recovery-email">
              <span>Email Address</span>
              <span className="password-recovery-input-wrap">
                <Mail aria-hidden="true" />
                <input id="recovery-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" required />
              </span>
            </label>

            {error && <p className="password-recovery-error" role="alert">{error}</p>}

            <button className="password-recovery-primary" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Verification Link"}
            </button>
            <div className="password-recovery-divider"><span />or<span /></div>
            <button className="password-recovery-back-link" type="button" onClick={goToLogin}>← Back to Login</button>
          </form>
        ) : (
          <div className="password-recovery-success" aria-live="polite">
            <div className="password-recovery-icon password-recovery-icon--green"><Check aria-hidden="true" /></div>
            <div className="password-recovery-heading">
              <h1 id="forgot-password-title">Check Your Email</h1>
              <p>If an account exists for <strong>{email}</strong>, a password reset link has been sent.</p>
            </div>
            <p className="password-recovery-instruction">Please check your inbox and click the password reset link to continue.</p>
            <button type="button" className="password-recovery-primary" onClick={goToLogin}>Back to Sign In</button>
            <button type="button" className="password-recovery-text-button" onClick={() => { setSent(false); setError(""); }}>
              <RefreshCw aria-hidden="true" /> Use a different email
            </button>
          </div>
        )}
    </>
  );

  if (embedded) return <div className="password-recovery-embedded">{content}</div>;

  return <main className="password-recovery-page"><section className="password-recovery-card" aria-labelledby="forgot-password-title">{content}</section></main>;
}
