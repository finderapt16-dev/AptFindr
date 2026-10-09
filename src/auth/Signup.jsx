import "./signup.css";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Building2, ChevronRight, Home, Info, Users } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { useAuth } from "@/contexts/AuthContext";
import { clearPendingGoogleOAuthFlow, finalizeGoogleSignup, getAuthUser, isGoogleAuthUser, resendSignupVerification, signOutAuthSession, signupWithGoogle } from "@/services/authService";
import { SignupAccountFields, SignupPersonalFields } from "./SignupFields";
import { SignupAgreement, SignupPolicyDialog } from "./SignupPolicyDialog";
import { getSignupFullName, normalizeSignupValues, validateAccountDetails, validatePersonalInformation } from "./signupValidation";
import { useSignupViewport } from "./useSignupViewport";

const INITIAL_VALUES = {
  role: "", username: "", email: "", password: "", confirmPassword: "",
  firstName: "", lastName: "", middleInitial: "", mobileNumber: "",
};
const LANDLORD_STEPS = ["Account Details", "Personal Information"];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="signup-google-icon" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.23-.19-1.77H12v3.35h5.38a4.6 4.6 0 0 1-1.99 3.02l2.81 2.18c1.64-1.51 2.57-3.74 2.57-6.78Z" />
      <path fill="#34A853" d="M12 21.76c2.62 0 4.82-.86 6.43-2.34l-2.81-2.18c-.78.52-1.78.83-2.98.83-2.52 0-4.66-1.7-5.42-3.99l-2.9 2.24A9.72 9.72 0 0 0 12 21.76Z" />
      <path fill="#FBBC05" d="M7.22 14.08A5.84 5.84 0 0 1 6.9 12c0-.72.12-1.42.32-2.08l-2.9-2.24A9.75 9.75 0 0 0 2.24 12c0 1.57.38 3.06 1.08 4.32l2.9-2.24Z" />
      <path fill="#EA4335" d="M12 5.93c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.82 3 14.62 2.24 12 2.24a9.72 9.72 0 0 0-7.68 5.44l2.9 2.24c.76-2.29 2.9-3.99 5.42-3.99Z" />
    </svg>
  );
}

function getGoogleNameFields(authUser) {
  const metadata = authUser?.user_metadata && typeof authUser.user_metadata === "object"
    ? authUser.user_metadata
    : {};
  const firstName = typeof metadata.given_name === "string" ? metadata.given_name.trim() : "";
  const lastName = typeof metadata.family_name === "string" ? metadata.family_name.trim() : "";
  if (firstName || lastName) return { firstName, lastName };

  const fullName = [metadata.full_name, metadata.name]
    .find((value) => typeof value === "string" && value.trim())?.trim() ?? "";
  const parts = fullName.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function Signup({ embedded = false, redirect = null, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, hydrateSession } = useAuth();
  useSignupViewport();

  const query = new URLSearchParams(location.search);
  const requestedRedirect = (typeof redirect === "string" ? redirect : null) ?? query.get("redirect");
  const redirectTo = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//") ? requestedRedirect : null;
  const loginPath = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";
  const googleSetup = query.get("google") === "setup";
  const googleSetupRole = googleSetup ? "tenant" : "";

  const [googleIdentity, setGoogleIdentity] = useState(null);
  const [values, setValues] = useState(() => ({ ...INITIAL_VALUES, role: googleSetupRole }));
  const [landlordStep, setLandlordStep] = useState(1);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [tenantTermsAccepted, setTenantTermsAccepted] = useState(false);
  const [landlordTermsAccepted, setLandlordTermsAccepted] = useState(false);
  const [policy, setPolicy] = useState(null);
  const formRef = useRef(null);
  const stepHeadingRef = useRef(null);
  const submissionInFlightRef = useRef(false);
  const policyTriggerRef = useRef(null);
  const loading = busy !== null;
  const isLandlord = values.role === "landlord";
  const termsAccepted = isLandlord ? landlordTermsAccepted : tenantTermsAccepted;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    stepHeadingRef.current?.focus({ preventScroll: true });
    stepHeadingRef.current?.scrollIntoView({ block: "nearest" });
  }, [landlordStep, values.role]);

  useEffect(() => {
    if (!googleSetup) return;
    let active = true;
    void getAuthUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !isGoogleAuthUser(data.user) || !data.user.email_confirmed_at) {
        setError("Your Google session has expired. Sign in with Google again.");
        return;
      }
      setGoogleIdentity(data.user);
      const googleName = getGoogleNameFields(data.user);
      setValues(current => ({
        ...current,
        role: current.role || googleSetupRole,
        email: data.user.email || current.email,
        firstName: current.firstName || googleName.firstName,
        lastName: current.lastName || googleName.lastName,
      }));
    }).catch(() => { if (active) setError("Unable to verify your Google session. Please sign in again."); });
    return () => { active = false; };
  }, [googleSetup]);

  const changeField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError("");
  };
  const selectRole = (role) => {
    setValues((current) => ({ ...current, role }));
    setLandlordStep(1);
    setFieldErrors({});
    setError("");
  };
  const focusField = (field) => requestAnimationFrame(() => formRef.current?.elements.namedItem(field)?.focus());
  const showValidation = (errors, step) => {
    setFieldErrors(errors);
    setError("Please check the highlighted fields.");
    if (step) setLandlordStep(step);
    focusField(Object.keys(errors)[0]);
  };
  const nextStep = () => {
    if (loading) return;
    const normalized = normalizeSignupValues(values);
    const errors = landlordStep === 1 ? validateAccountDetails(normalized) : validatePersonalInformation(normalized);
    if (Object.keys(errors).length) {
      showValidation(errors);
      return;
    }
    setValues(normalized);
    setError("");
    setFieldErrors({});
    setLandlordStep((step) => Math.min(step + 1, 2));
  };
  const goBack = (step = landlordStep - 1) => {
    if (loading) return;
    setError("");
    setFieldErrors({});
    setLandlordStep(Math.max(1, step));
  };
  const openPolicy = (nextPolicy, trigger) => {
    policyTriggerRef.current = trigger;
    setPolicy(nextPolicy);
  };
  const changeAgreement = (accepted) => {
    if (isLandlord) setLandlordTermsAccepted(accepted);
    else setTenantTermsAccepted(accepted);
    setError("");
  };

  const createAccount = async () => {
    if (submissionInFlightRef.current || (isLandlord && landlordStep !== 2)) return;
    if (googleSetup && !googleIdentity) {
      setError("Sign in with Google again to verify your email before continuing.");
      return;
    }
    const normalized = normalizeSignupValues(values);
    const accountErrors = validateAccountDetails(normalized);
    if (Object.keys(accountErrors).length) {
      showValidation(accountErrors, isLandlord ? 1 : undefined);
      return;
    }
    if (isLandlord) {
      const personalErrors = validatePersonalInformation(normalized);
      if (Object.keys(personalErrors).length) {
        showValidation(personalErrors, 2);
        return;
      }
    }
    if (!termsAccepted) {
      setError("You must agree to the Terms of Service and Privacy Policy to continue.");
      focusField("termsAccepted");
      return;
    }
    setValues(normalized);
    setError("");
    setFieldErrors({});
    submissionInFlightRef.current = true;
    setBusy("account");
    try {
      const input = {
        ...normalized,
        name: isLandlord ? getSignupFullName(normalized) : normalized.username,
        username: normalized.username,
        email: normalized.email,
        password: normalized.password,
        role: normalized.role,
        middleInitial: isLandlord ? normalized.middleInitial : "",
        address: "",
        mobileNumber: isLandlord ? normalized.mobileNumber : "",
        termsAccepted,
        landlordVerificationAccepted: isLandlord ? termsAccepted : undefined,
      };
      if (googleSetup) {
        const createdProfile = await finalizeGoogleSignup(googleIdentity, input);
        clearPendingGoogleOAuthFlow();
        const profile = await hydrateSession();
        if (!profile || profile.role !== "tenant" || createdProfile?.id !== profile.id) {
          throw new Error("Your tenant account was created, but AptFindr could not start your session. Please sign in with Google.");
        }
        navigate("/browse", { replace: true });
        return;
      }
      const result = await signup(input);
      if (!result.success) {
        setError(result.error || "Signup failed.");
      } else if (result.signup?.existingAccount) {
        setError("An account may already exist for this email. Sign in, resend verification, or reset your password instead of registering again.");
      } else {
        if (!result.signup?.requiresEmailVerification) {
          // Manual AptFindr registration requires Supabase Confirm Email. Do
          // not turn a misconfigured provider into an automatic sign-in.
          await signOutAuthSession({ scope: "local" });
          setError("Email confirmation is disabled in Supabase. Enable Confirm Email in Authentication > Sign In / Providers > Email, then try signing in.");
          return;
        }

        const message = result.signup?.profileSetupError || `Account created! Check ${normalized.email} for your confirmation link (including your spam folder). After confirming your email, sign in with the username and password you created.`;
        setPendingEmail(normalized.email);
        setVerificationMessage(message);
        setResendCooldown(60);
      }
    } catch (submitError) {
      console.error("[AUTH] Unexpected signup UI failure", submitError);
      setError(submitError instanceof Error ? submitError.message : "Unable to finish registration. Please try again.");
    } finally {
      submissionInFlightRef.current = false;
      setBusy(null);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;
    if (!values.role) {
      setError("Please select an account type.");
    } else if (isLandlord && landlordStep < 2) {
      // Enter advances the landlord registration form; account creation is on step two.
      nextStep();
    } else {
      void createAccount();
    }
  };

  const handleGoogleSignup = async () => {
    if (submissionInFlightRef.current) return;
    setError("");
    submissionInFlightRef.current = true;
    setBusy("google");
    try {
      const googleSignup = await signupWithGoogle({ role: "tenant" });
      if (googleSignup?.needsAccount) {
        navigate("/signup?google=setup&role=tenant");
        submissionInFlightRef.current = false;
        setBusy(null);
        return;
      }
      // Otherwise Supabase is redirecting the browser to Google; keep actions locked.
    } catch (googleError) {
      clearPendingGoogleOAuthFlow();
      console.error("[AUTH] Google signup failed", googleError);
      setError(googleError instanceof Error ? googleError.message : "We could not continue with Google. Please try again.");
      submissionInFlightRef.current = false;
      setBusy(null);
    }
  };

  const resendPendingEmail = async () => {
    if (loading || resendCooldown > 0) return;
    setBusy("resend");
    setError("");
    setResendCooldown(60);
    try {
      await resendSignupVerification(pendingEmail);
      setVerificationMessage(`Confirmation email requested for ${pendingEmail}. Check your inbox and spam folder.`);
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Unable to request confirmation. Try again later.");
    } finally {
      setBusy(null);
    }
  };

  if (pendingEmail) {
    return <section className="auth-status-page" aria-labelledby="verification-title">
      <div className="auth-status-card">
        <h1 id="verification-title" className="auth-status-title">Check your email</h1>
        <p className="auth-status-description" role="status">{verificationMessage}</p>
        <p className="auth-status-description">After confirming your email, sign in with the username and password you created.</p>
        {error && <p role="alert" className="signup-message">{error}</p>}
        <button type="button" className="signup-primary-button" disabled={loading || resendCooldown > 0} onClick={resendPendingEmail}>
          {busy === "resend" ? "Requesting email..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend confirmation email"}
        </button>
        <Link to={loginPath} className="auth-status-login-link">Already confirmed? Sign in</Link>
      </div>
    </section>;
  }

  const loginPrompt = <p className="signup-login-prompt">Already have an account? <Link to={loginPath}>Sign In</Link></p>;
  const agreement = <SignupAgreement checked={termsAccepted} onChange={changeAgreement} disabled={loading} onPolicyClick={openPolicy} role={isLandlord ? "landlord" : "tenant"} />;
  const createButton = <button type="submit" disabled={loading} className="signup-primary-button signup-submit-button">{busy === "account" ? <><span className="signup-spinner" aria-hidden="true" /> Creating your account...</> : "Create Account"}</button>;

  return (
    <div className={`auth-palette signup-page${embedded ? " signup-page--floater" : " signup-page--standalone"}${values.role ? ` signup-page--${values.role}` : ""}`}>
      {!embedded && (
        <header className="signup-mobile-header">
          <Link to="/" className="signup-mobile-brand"><AppLogo className="signup-mobile-logo" /><span>AptFindr</span></Link>
          <Link to={loginPath} className="signup-login-link">Sign in</Link>
        </header>
      )}
      <div className="signup-content">
        <div className="signup-form-container">
          <section className="signup-form-shell" aria-labelledby="signup-title">
            <div className="signup-form-heading">
              <h1 id="signup-title" className="signup-title">Create Your Account</h1>
              {!values.role && <p className="signup-description">Choose your role to continue.</p>}
            </div>
            {googleSetup && (
              <div className="signup-google-setup-notice" role="status">
                <Info aria-hidden="true" />
                <p>
                  Google has verified your email{googleIdentity ? ` (${googleIdentity.email})` : ""}. Complete your tenant account and press <strong>Create Account</strong>. Your password also lets you sign in with your username.
                </p>
              </div>
            )}
            {error && (
              <div className="signup-message" role="alert">
                <div className="signup-error-alert"><AlertCircle aria-hidden="true" /><p>{error}</p></div>
                {(error.includes("may already exist") || error.includes("couldn't send the confirmation email")) && (
                  <div className="signup-error-actions">
                    <Link to={loginPath}>Sign in</Link>
                    <Link to="/forgot-password">Forgot password</Link>
                    <Link to={loginPath} state={{ message: "Use Resend Verification Email for this account.", verificationEmail: values.email.trim() }}>Resend verification</Link>
                  </div>
                )}
              </div>
            )}
            <form ref={formRef} className="signup-form" noValidate onSubmit={handleSubmit} aria-busy={loading}>
              {!values.role && (
                <div className="signup-account-type-options">
                  {[{ role: "tenant", label: "Tenant", description: "Find and explore verified apartments in La Paz.", Icon: Users }, { role: "landlord", label: "Landlord", description: "List and manage your apartment apartments.", Icon: Building2 }].map(({ role, label, description, Icon }) => (
                    <button type="button" className="signup-account-type-option" key={role} onClick={() => selectRole(role)}>
                      <span className="signup-account-type-icon"><Icon aria-hidden="true" /></span>
                      <span className="signup-account-type-content"><strong>{label}</strong><span>{description}</span></span>
                      <ChevronRight className="signup-account-type-chevron" aria-hidden="true" />
                    </button>
                  ))}
                  <Link to="/" className="signup-home-link" onClick={embedded && onClose ? (event) => { event.preventDefault(); onClose(); } : undefined}><Home aria-hidden="true" /> Back to Home</Link>
                </div>
              )}
              {values.role === "tenant" && (
                <>
                  <div className="signup-tenant-simple-form"><SignupAccountFields values={values} onChange={changeField} errors={fieldErrors} disabled={loading} idPrefix="tenant" emailReadOnly={googleSetup} /></div>
                  {agreement}
                  {createButton}
                  {!googleSetup && <><div className="signup-social-divider" aria-hidden="true"><span /><b>or</b><span /></div>
                  <button type="button" className="signup-google-button" onClick={handleGoogleSignup} disabled={loading}><GoogleIcon />{busy === "google" ? "Connecting to Google..." : googleSetup ? "Finish Creating Your Account with Google" : "Sign Up with Google"}</button></>}
                  {loginPrompt}
                </>
              )}
              {isLandlord && (
                <div className="signup-landlord-wizard">
                  <nav aria-label="Landlord registration progress">
                    <ol className="signup-landlord-stepper">
                      {LANDLORD_STEPS.map((label, index) => {
                        const step = index + 1;
                        return <li className="signup-landlord-step-item" key={label}>
                          <button type="button" className={`signup-landlord-step-button${landlordStep === step ? " is-active" : ""}`} onClick={() => goBack(step)} disabled={loading || step > landlordStep} aria-current={landlordStep === step ? "step" : undefined} aria-label={`Step ${step}: ${label}`}>
                            <span className="signup-landlord-step-circle">{step}</span><span className="signup-landlord-step-text">{label}</span>
                          </button>
                        </li>;
                      })}
                    </ol>
                  </nav>
                  <section className="signup-landlord-panel" aria-labelledby="signup-step-title">
                    <h2 ref={stepHeadingRef} id="signup-step-title" tabIndex={-1} className="signup-landlord-panel-title">{LANDLORD_STEPS[landlordStep - 1]}</h2>
                    {landlordStep === 1 && (
                      <>
                        <SignupAccountFields values={values} onChange={changeField} errors={fieldErrors} disabled={loading} idPrefix="landlord" emailReadOnly={googleSetup} />
                        <button type="submit" className="signup-primary-button signup-landlord-continue" disabled={loading}>Continue <ArrowRight aria-hidden="true" /></button>
                        {loginPrompt}
                      </>
                    )}
                    {landlordStep === 2 && (
                      <>
                        <SignupPersonalFields values={values} onChange={changeField} errors={fieldErrors} disabled={loading} />
                        {agreement}
                        {createButton}
                      </>
                    )}
                  </section>
                </div>
              )}
            </form>
            {values.role && !googleSetup && <button type="button" className="signup-change-role" disabled={loading} onClick={() => selectRole("")}>Change account type</button>}
          </section>
        </div>
      </div>
      {policy && <SignupPolicyDialog policy={policy} role={isLandlord ? "landlord" : "tenant"} onClose={() => setPolicy(null)} returnFocusRef={policyTriggerRef} />}
    </div>
  );
}
