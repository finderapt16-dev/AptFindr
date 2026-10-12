export function AuthField({ id, label, type = "text", value, onChange, required, placeholder, icon, suffix, error, ...inputProps }) {
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [inputProps["aria-describedby"], errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`auth-field${error ? " auth-field--invalid" : ""}`}>
      <label htmlFor={id} className="auth-field-label">
        {label}{required && <span className="auth-field-required" aria-hidden="true">*</span>}
      </label>
      <div className="auth-field-control">
        {icon && <span className="auth-field-icon">{icon}</span>}
        <input
          {...inputProps}
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? `Enter your ${label.toLowerCase()}`}
          required={required}
          aria-invalid={error ? true : inputProps["aria-invalid"]}
          aria-describedby={describedBy}
          className={`auth-field-input ${icon ? "auth-field-with-icon" : ""} ${suffix ? "auth-field-with-suffix" : ""}`}
        />
        {suffix && <div className="auth-field-suffix">{suffix}</div>}
      </div>
      {error && <p id={errorId} className="auth-field-error">{error}</p>}
    </div>
  );
}
