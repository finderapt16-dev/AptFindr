import "./reset_password.css";

import { AlertCircle, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { exchangeAuthCode, getAuthSession, signOutAuthSession, updateAuthPassword } from "@/services/authService";

export function ResetPassword({ embedded = false, onBackToLogin }) {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const goToLogin = () => {
    if (typeof onBackToLogin === "function") {
      onBackToLogin();
      return;
    }
    navigate("/login", { replace: true, state: { message: "Your password has been changed successfully." } });
  };

  useEffect(() => {
    let active = true;

    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const callbackError = params.get("error_description") || params.get("error");
      if (callbackError) {
        if (active) {
          setError("This password reset link is invalid or has expired. Request a new one.");
          setCheckingSession(false);
        }
        return;
      }

      const code = params.get("code");
      if (code) await exchangeAuthCode(code);

      const { data } = await getAuthSession();
      if (!active) return;

      setHasRecoverySession(Boolean(data.session));
      if (!data.session) setError("This password reset link is invalid or has expired. Request a new one.");
      setCheckingSession(false);
    })();

    return () => { active = false; };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await updateAuthPassword(password);
    setSaving(false);

    if (updateError) {
      setError(/same password/i.test(updateError.message) ? "Choose a password you have not used before." : "Unable to change your password. Request a new reset link and try again.");
      return;
    }

    await signOutAuthSession();
    setCompleted(true);
  };

  const content = (
    <>
        {checkingSession ? (
          <div className="password-reset-loading"><Loader2 aria-hidden="true" /> Validating reset link...</div>
        ) : completed ? (
          <div className="password-recovery-success" aria-live="polite">
            <div className="password-recovery-icon password-recovery-icon--green"><Check aria-hidden="true" /></div>
            <div className="password-recovery-heading">
              <h1 id="reset-password-title">Password Updated</h1>
              <p>Your password has been successfully changed. You can now sign in using your new password.</p>
            </div>
            <button type="button" className="password-recovery-primary" onClick={goToLogin}>Back to Sign In</button>
          </div>
        ) : hasRecoverySession ? (
          <form className="password-reset-form" onSubmit={submit}>
            <div className="password-recovery-heading password-reset-heading">
              <h1 id="reset-password-title">Create New Password</h1>
            </div>

            <PasswordField id="new-password" label="New Password" value={password} setValue={setPassword} visible={showPassword} setVisible={setShowPassword} />
            <PasswordField id="confirm-password" label="Confirm Password" value={confirmPassword} setValue={setConfirmPassword} visible={showConfirmPassword} setVisible={setShowConfirmPassword} />

            <div className="password-reset-help"><strong>Password must contain:</strong><span>At least 8 characters, an uppercase and lowercase letter, a number, and a special character (e.g. !@#$%).</span></div>
            {error && <p className="password-recovery-error" role="alert"><AlertCircle aria-hidden="true" />{error}</p>}
            <button className="password-recovery-primary" type="submit" disabled={saving}>{saving ? "Resetting Password..." : "Reset Password"}</button>
          </form>
        ) : (
          <div className="password-reset-invalid">
            <AlertCircle aria-hidden="true" />
            <div className="password-recovery-heading"><h1 id="reset-password-title">Link Unavailable</h1><p>{error}</p></div>
            <Link className="password-recovery-primary password-reset-request-link" to="/forgot-password">Request a New Link</Link>
          </div>
        )}
    </>
  );

  if (embedded) return <div className="password-recovery-embedded password-reset-embedded">{content}</div>;

  return <main className="password-recovery-page"><section className="password-recovery-card password-reset-card" aria-labelledby="reset-password-title">{content}</section></main>;
}

function PasswordField({ id, label, value, setValue, visible, setVisible }) {
  return (
    <label className="password-recovery-field" htmlFor={id}>
      <span>{label}</span>
      <span className="password-reset-input-wrap">
        <input id={id} type={visible ? "text" : "password"} autoComplete="new-password" value={value} onChange={(event) => setValue(event.target.value)} required />
        <button type="button" onClick={() => setVisible((current) => !current)} aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}>
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </span>
    </label>
  );
}
