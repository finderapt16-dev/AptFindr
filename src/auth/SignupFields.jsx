import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthField } from "./AuthField";
import { PASSWORD_REQUIREMENTS } from "./signupValidation";

export function SignupAccountFields({ values, onChange, errors = {}, disabled = false, idPrefix = "signup", includePassword = true, emailReadOnly = false, emailLabel = "Email Address" }) {
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
      <AuthField {...fieldProps("username")} label="Username" required placeholder="Enter your username" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={30} />
      <AuthField {...fieldProps("email")} label={emailLabel} readOnly={emailReadOnly} type="email" required placeholder="Enter your email address" autoComplete="email" autoCapitalize="none" spellCheck={false} inputMode="email" />
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
      <AuthField {...fieldProps("firstName")} label="First Name" required placeholder="Enter your first name" autoComplete="given-name" />
      <AuthField {...fieldProps("lastName")} label="Last Name" required placeholder="Enter your last name" autoComplete="family-name" />
      <AuthField {...fieldProps("middleInitial")} label="Middle Initial (Optional)" placeholder="e.g. M" maxLength={2} autoCapitalize="characters" />
      <AuthField {...fieldProps("mobileNumber")} label="Mobile Number" type="tel" required placeholder="Enter your mobile number" autoComplete="tel" inputMode="tel" />
    </>
  );
}
