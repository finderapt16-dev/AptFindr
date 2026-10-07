export const ACCOUNT_REVIEW_FIELDS = ["username", "email"];
export const PERSONAL_REVIEW_FIELDS = ["firstName", "lastName", "middleInitial", "mobileNumber"];

export const PASSWORD_REQUIREMENTS = "At least 8 characters, an uppercase and lowercase letter, a number, and a special character (e.g. !@#$%).";

export function validateSignupPassword(password = "") {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return "Include an uppercase and a lowercase letter in your password.";
  }
  if (!/[0-9]/.test(password)) return "Include a number in your password.";
  if (!/[^A-Za-z0-9\s]/.test(password)) return "Include a special character in your password.";
  return "";
}

export function validateAccountDetails(values, { includePassword = true } = {}) {
  const errors = {};
  if (!/^[A-Za-z0-9_]{4,30}$/.test(String(values.username ?? "").trim())) {
    errors.username = "Use 4–30 letters, numbers, or underscores, with no spaces.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.email ?? "").trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (includePassword) {
    const passwordError = validateSignupPassword(values.password);
    if (passwordError) errors.password = passwordError;
    if (!values.confirmPassword || values.password !== values.confirmPassword) {
      errors.confirmPassword = "Passwords must match.";
    }
  }
  return errors;
}

export function validatePersonalInformation(values) {
  const errors = {};
  if (!String(values.firstName ?? "").trim()) errors.firstName = "First name is required.";
  if (!String(values.lastName ?? "").trim()) errors.lastName = "Last name is required.";
  const initial = String(values.middleInitial ?? "").trim();
  if (initial && !/^\p{L}\.?$/u.test(initial)) {
    errors.middleInitial = "Enter one letter, or leave this optional field blank.";
  }
  const mobile = String(values.mobileNumber ?? "").trim();
  const digits = mobile.replace(/\D/g, "");
  if (!mobile) {
    errors.mobileNumber = "Mobile number is required.";
  } else if (!/^\+?[\d\s().-]+$/.test(mobile) || digits.length < 10 || digits.length > 15) {
    errors.mobileNumber = "Enter a valid mobile number, e.g. 0917 123 4567 or +63 917 123 4567.";
  }
  return errors;
}

export function normalizeSignupValues(values) {
  const normalized = { ...values };
  for (const field of [...ACCOUNT_REVIEW_FIELDS, ...PERSONAL_REVIEW_FIELDS]) {
    if (typeof normalized[field] === "string") normalized[field] = normalized[field].trim();
  }
  if (typeof normalized.middleInitial === "string") {
    normalized.middleInitial = normalized.middleInitial.replace(/\.$/, "").toLocaleUpperCase("en-PH");
  }
  // Never trim passwords: spaces may be intentional characters.
  return normalized;
}

export function getSignupFullName(values) {
  const normalized = normalizeSignupValues(values);
  return [normalized.firstName, normalized.middleInitial ? `${normalized.middleInitial}.` : "", normalized.lastName]
    .filter(Boolean)
    .join(" ");
}
