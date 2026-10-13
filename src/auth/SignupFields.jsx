import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthField } from "./AuthField";
import { supabase } from "@/services/supabaseClient";
import { PASSWORD_REQUIREMENTS } from "./signupValidation";

export function SignupAccountFields({ values, onChange, errors = {}, disabled = false, idPrefix = "signup", includePassword = true, emailReadOnly = false, emailLabel = "Email Address", hideEmail = false }) {
  const username = String(values.username ?? "").trim();
  const email = String(values.email ?? "").trim().toLowerCase();
  const [usernameCheck, setUsernameCheck] = useState({ username: "", error: "" });
  const [emailCheck, setEmailCheck] = useState({ email: "", error: "" });

  useEffect(() => {
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      setUsernameCheck({ username: "", error: "" });
      return undefined;
    }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('is_username_available', { p_username: username });
        if (!active) return;
        setUsernameCheck({
          username,
          error: error || typeof data !== 'boolean'
            ? 'Unable to check username availability. Please try again.'
            : data ? '' : 'This username is already taken. Please choose another.',
        });
      } catch {
        if (active) setUsernameCheck({ username, error: 'Unable to check username availability. Please try again.' });
      }
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [username]);

  useEffect(() => {
    if (emailReadOnly || !/^\S+@\S+\.\S+$/.test(email)) {
      setEmailCheck({ email: "", error: "" });
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        // This RPC checks Auth users too, including accounts that are still
        // waiting for email confirmation. The profile lookup is retained as a
        // safe fallback for older database deployments without the RPC.
        const { data, error } = await supabase.rpc('is_email_available', { p_email: email });
        if (!active) return;
        if (!error && typeof data === 'boolean') {
          setEmailCheck({ email, error: data ? '' : 'This email address is already in use. Please use another.' });
          return;
        }

        const { data: profiles, error: profileError } = await supabase
          .from('app_users')
          .select('id')
          .eq('email', email)
          .limit(1);
        if (!active) return;
        setEmailCheck({
          email,
          error: !profileError && profiles?.length
            ? 'This email address is already in use. Please use another.'
            : '',
        });
      } catch {
        // Never block a valid registration merely because the availability
        // request is temporarily unavailable; signup validates it again.
        if (active) setEmailCheck({ email, error: '' });
      }
    }, 350);

    return () => { active = false; clearTimeout(timer); };
  }, [email, emailReadOnly]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fieldProps = (name) => ({
    id: `${idPrefix}-${name}`,
    name,
    value: values[name] ?? "",
    onChange: (value) => onChange(name, value),
    error: errors[name],
    disabled,
  });
  const passwordToggle = (visible, toggle, label) => (
    <button type="button" className="signup-password-toggle" onClick={() => toggle((current) => !current)} disabled={disabled} aria-label={`${visible ? "Hide" : "Show"} ${label}`} aria-pressed={visible}>
      {visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
    </button>
  );

  return (
    <>
      <AuthField {...fieldProps("username")} error={errors.username || (usernameCheck.username === username ? usernameCheck.error : "")} label="Username" required placeholder="Enter your username" autoComplete="username" autoCapitalize="none" spellCheck={false} />
      {!hideEmail && <AuthField {...fieldProps("email")} error={errors.email || (emailCheck.email === email ? emailCheck.error : "")} label={emailLabel} readOnly={emailReadOnly} type="email" required placeholder="Enter your email address" autoComplete="email" autoCapitalize="none" spellCheck={false} inputMode="email" />}
      {includePassword && (
        <>
          <AuthField {...fieldProps("password")} label="Password" type={showPassword ? "text" : "password"} required placeholder="Enter your password" autoComplete="new-password" suffix={passwordToggle(showPassword, setShowPassword, "password")} />
          <AuthField {...fieldProps("confirmPassword")} label="Confirm Password" type={showConfirmPassword ? "text" : "password"} required placeholder="Confirm your password" autoComplete="new-password" suffix={passwordToggle(showConfirmPassword, setShowConfirmPassword, "confirm password")} />
          <div className="signup-password-help">
            <strong>Password must contain:</strong>
            <span>{PASSWORD_REQUIREMENTS}</span>
          </div>
        </>
      )}
    </>
  );
}

export function SignupPersonalFields({ values, onChange, errors = {}, disabled = false, idPrefix = "signup-personal" }) {
  const fieldProps = (name) => ({
    id: `${idPrefix}-${name}`,
    name,
    value: values[name] ?? "",
    onChange: (value) => onChange(name, value),
    error: errors[name],
    disabled,
  });
  return (
    <>
      <SignupFullNameField values={values} onChange={onChange} errors={errors} disabled={disabled} idPrefix={idPrefix} />
      <AuthField {...fieldProps("mobileNumber")} label="Mobile Number" type="tel" required placeholder="Enter your mobile number" autoComplete="tel" inputMode="tel" />
    </>
  );
}

export function SignupFullNameField({ values, onChange, errors = {}, disabled = false, idPrefix = "signup-name" }) {
  return <AuthField id={idPrefix + "-fullName"} name="fullName" label="Full Name" required placeholder="Enter your full name" value={values.fullName ?? ""} onChange={value => onChange("fullName", value)} error={errors.fullName} disabled={disabled} autoComplete="name" />;
}
