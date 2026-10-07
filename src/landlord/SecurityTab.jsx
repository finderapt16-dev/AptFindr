import "./SecurityTab.css";

import { Button } from "@/components/ui/button";

import {
    SettingsField as Field,
    SettingsInput,
    SettingsSelect,
    SettingsToggle as Toggle,
} from "@/landlord/SettingsFormFields";

import { toast } from "sonner";

import {
    Eye,
    EyeOff,
    Monitor,
    Smartphone,
} from "lucide-react";

export const SecurityTab = ({
    security,
    passwordState,
    setPasswordState,
    handlePasswordChange,
    twoFAState,
    handleSetup2FA,
    updateSecurity,
    setTwoFAState,
    handleCancel2FASetup,
    handleVerify2FA,
    handleSaveSecurity,
    handleDeleteAccount,
}) => {
    return (
        <div className="security-tab-panel">
            {/* =========================================================
                PASSWORD
            ========================================================= */}

            <section className="security-tab-card security-tab-password-card">
                <div className="security-tab-heading">
                    <h2>Change Password</h2>

                    <p>
                        Update your password to keep your landlord
                        account secure.
                    </p>
                </div>

                <div className="security-tab-password-fields">
                    <Field label="Current Password">
                        <div className="security-tab-panel-2">
                            <SettingsInput
                                type={
                                    passwordState.showCurrent
                                        ? "text"
                                        : "password"
                                }
                                placeholder="Enter current password"
                                value={passwordState.current}
                                onChange={(e) =>
                                    setPasswordState((p) => ({
                                        ...p,
                                        current: e.target.value,
                                    }))
                                }
                            />

                            <button
                                type="button"
                                className="security-tab-button"
                                aria-label={
                                    passwordState.showCurrent
                                        ? "Hide current password"
                                        : "Show current password"
                                }
                                onClick={() =>
                                    setPasswordState((p) => ({
                                        ...p,
                                        showCurrent:
                                            !p.showCurrent,
                                    }))
                                }
                            >
                                {passwordState.showCurrent ? (
                                    <EyeOff size={17} />
                                ) : (
                                    <Eye size={17} />
                                )}
                            </button>
                        </div>
                    </Field>

                    <Field
                        label="New Password"
                        hint="At least 8 characters with letters, numbers, and symbols."
                    >
                        <div className="security-tab-panel-2">
                            <SettingsInput
                                type={
                                    passwordState.showNew
                                        ? "text"
                                        : "password"
                                }
                                placeholder="Enter new password"
                                value={passwordState.new}
                                onChange={(e) =>
                                    setPasswordState((p) => ({
                                        ...p,
                                        new: e.target.value,
                                    }))
                                }
                            />

                            <button
                                type="button"
                                className="security-tab-button"
                                aria-label={
                                    passwordState.showNew
                                        ? "Hide new password"
                                        : "Show new password"
                                }
                                onClick={() =>
                                    setPasswordState((p) => ({
                                        ...p,
                                        showNew: !p.showNew,
                                    }))
                                }
                            >
                                {passwordState.showNew ? (
                                    <EyeOff size={17} />
                                ) : (
                                    <Eye size={17} />
                                )}
                            </button>
                        </div>
                    </Field>

                    <Field label="Confirm New Password">
                        <div className="security-tab-panel-2">
                            <SettingsInput
                                type={
                                    passwordState.showConfirm
                                        ? "text"
                                        : "password"
                                }
                                placeholder="Re-enter new password"
                                value={passwordState.confirm}
                                onChange={(e) =>
                                    setPasswordState((p) => ({
                                        ...p,
                                        confirm: e.target.value,
                                    }))
                                }
                            />

                            <button
                                type="button"
                                className="security-tab-button"
                                aria-label={
                                    passwordState.showConfirm
                                        ? "Hide password"
                                        : "Show password"
                                }
                                onClick={() =>
                                    setPasswordState((p) => ({
                                        ...p,
                                        showConfirm:
                                            !p.showConfirm,
                                    }))
                                }
                            >
                                {passwordState.showConfirm ? (
                                    <EyeOff size={17} />
                                ) : (
                                    <Eye size={17} />
                                )}
                            </button>
                        </div>
                    </Field>
                </div>

                <div className="security-tab-password-actions">
                    <button
                        type="button"
                        className="security-tab-cancel-password"
                        disabled={passwordState.isChanging}
                        onClick={() =>
                            setPasswordState((p) => ({
                                ...p,
                                current: "",
                                new: "",
                                confirm: "",
                            }))
                        }
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="security-tab-button-2"
                        onClick={handlePasswordChange}
                        disabled={passwordState.isChanging}
                    >
                        {passwordState.isChanging
                            ? "Updating..."
                            : "Update Password"}
                    </button>
                </div>
            </section>

            {/* =========================================================
                TWO-FACTOR AUTHENTICATION
            ========================================================= */}

            <section className="security-tab-card">
                <div className="security-tab-heading">
                    <h2>Two-Factor Authentication</h2>

                    <p>
                        Add an extra layer of protection to your
                        account.
                    </p>
                </div>

                {!security.twoFactor &&
                !twoFAState.setupMode ? (
                    <div className="security-tab-2fa-content">
                        <div className="security-tab-card-2">
                            <div>
                                <p className="security-tab-two-factor-authentication">
                                    Two-Factor Authentication
                                </p>

                                <p className="security-tab-text">
                                    Disabled — your account has
                                    standard password protection.
                                </p>
                            </div>

                            <span className="security-tab-status security-tab-status-disabled">
                                Disabled
                            </span>
                        </div>

                        <div className="security-tab-section-actions">
                            <button
                                type="button"
                                onClick={handleSetup2FA}
                                className="security-tab-enable-2-fa"
                            >
                                Enable 2FA
                            </button>
                        </div>
                    </div>
                ) : security.twoFactor &&
                  !twoFAState.setupMode ? (
                    <div className="security-tab-2fa-content">
                        <div className="security-tab-card-3">
                            <div>
                                <p className="security-tab-two-factor-authentication">
                                    Two-Factor Authentication
                                </p>

                                <p className="security-tab-text-2">
                                    Enabled — your account is
                                    protected.
                                </p>
                            </div>

                            <span className="security-tab-status security-tab-status-enabled">
                                Enabled
                            </span>
                        </div>

                        <Field label="2FA Method">
                            <SettingsSelect
                                value={
                                    security.twoFactorMethod
                                }
                                onChange={(e) =>
                                    updateSecurity((p) => ({
                                        ...p,
                                        twoFactorMethod:
                                            e.target.value,
                                    }))
                                }
                            >
                                <option value="sms">
                                    SMS to mobile number
                                </option>

                                <option value="email">
                                    Email OTP
                                </option>

                                <option value="authenticator">
                                    Authenticator App (Google /
                                    Authy)
                                </option>
                            </SettingsSelect>
                        </Field>

                        <div className="security-tab-section-actions">
                            <button
                                type="button"
                                onClick={() =>
                                    toast.success(
                                        "2FA is already enabled"
                                    )
                                }
                                className="security-tab-2-fa-enabled"
                            >
                                2FA Enabled
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="security-tab-setup-container">
                        <div className="security-tab-card-2">
                            <div>
                                <p className="security-tab-setup-2-fa">
                                    Setup 2FA
                                </p>

                                <p className="security-tab-text-3">
                                    Follow the steps below to
                                    enable two-factor
                                    authentication.
                                </p>
                            </div>
                        </div>

                        <div className="security-tab-card-4">
                            <p className="security-tab-step-1-open-your-authenticator-app">
                                Step 1: Open your authenticator
                                app
                            </p>

                            <p className="security-tab-text-4">
                                Download Google Authenticator,
                                Authy, or Microsoft Authenticator
                                if you haven't already.
                            </p>
                        </div>

                        <div className="security-tab-card-4">
                            <p className="security-tab-step-2-scan-the-qr-code">
                                Step 2: Scan the QR code
                            </p>

                            <div className="security-tab-card-5">
                                <div className="security-tab-panel-3">
                                    <p className="security-tab-text-5">
                                        {twoFAState.secret}
                                    </p>

                                    <p className="security-tab-or-enter-this-code-manually">
                                        Or enter this code
                                        manually
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Field label="Verification Code">
                            <SettingsInput
                                type="text"
                                inputMode="numeric"
                                placeholder="Enter 6-digit code"
                                value={
                                    twoFAState.verificationCode
                                }
                                onChange={(e) => {
                                    const val =
                                        e.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6);

                                    setTwoFAState((p) => ({
                                        ...p,
                                        verificationCode: val,
                                    }));
                                }}
                                maxLength={6}
                            />
                        </Field>

                        <div className="security-tab-row">
                            <button
                                type="button"
                                onClick={
                                    handleCancel2FASetup
                                }
                                className="security-tab-cancel"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleVerify2FA}
                                disabled={
                                    twoFAState.isVerifying ||
                                    twoFAState
                                        .verificationCode
                                        .length !== 6
                                }
                                className="security-tab-button-3"
                            >
                                {twoFAState.isVerifying
                                    ? "Verifying..."
                                    : "Verify & Enable"}
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* =========================================================
                LOGIN & SESSIONS
            ========================================================= */}

            <section className="security-tab-card">
                <div className="security-tab-heading">
                    <h2>Login & Sessions</h2>

                    <p>
                        Manage active sessions and login
                        security.
                    </p>
                </div>

                <div className="security-tab-panel-4">
                    {[
                        {
                            key: "loginAlerts",
                            label: "Login Alerts",
                            hint:
                                "Get notified when your account is accessed from a new device or location.",
                        },
                        {
                            key: "trustedDevices",
                            label: "Remember Trusted Devices",
                            hint:
                                "Skip 2FA on devices you've verified before.",
                        },
                    ].map(
                        ({
                            key,
                            label,
                            hint,
                        }) => (
                            <div
                                key={key}
                                className="security-tab-card-6"
                            >
                                <div className="security-tab-option-copy">
                                    <p className="security-tab-text-6">
                                        {label}
                                    </p>

                                    <p className="security-tab-text-7">
                                        {hint}
                                    </p>
                                </div>

                                <Toggle
                                    checked={security[key]}
                                    onChange={(v) =>
                                        updateSecurity(
                                            (p) => ({
                                                ...p,
                                                [key]: v,
                                            })
                                        )
                                    }
                                />
                            </div>
                        )
                    )}

                    <Field
                        label="Auto Session Timeout"
                        hint="Automatically log out after inactivity."
                    >
                        <SettingsSelect
                            value={
                                security.sessionTimeout
                            }
                            onChange={(e) =>
                                updateSecurity((p) => ({
                                    ...p,
                                    sessionTimeout:
                                        e.target.value,
                                }))
                            }
                        >
                            <option value="15">
                                15 minutes
                            </option>

                            <option value="30">
                                30 minutes
                            </option>

                            <option value="60">
                                1 hour
                            </option>

                            <option value="240">
                                4 hours
                            </option>

                            <option value="0">
                                Never
                            </option>
                        </SettingsSelect>
                    </Field>
                </div>

                <div className="security-tab-sessions">
                    <p className="security-tab-active-sessions">
                        Active Sessions
                    </p>

                    <div className="security-tab-panel-5">
                        {security.activeDevices.length ===
                            0 && (
                            <div className="security-tab-no-active-session-data-is-available">
                                No active session data is
                                available.
                            </div>
                        )}

                        {security.activeDevices.map((d) => (
                            <div
                                key={d.id}
                                className={`security-tab-card-7 ${
                                    d.current
                                        ? "security-tab-panel-6"
                                        : "security-tab-panel-7"
                                }`}
                            >
                                <div className="security-tab-row-2">
                                    <span className="security-tab-device-icon">
                                        {d.name.includes(
                                            "iPhone"
                                        ) ||
                                        d.name.includes(
                                            "Android"
                                        ) ? (
                                            <Smartphone
                                                size={20}
                                            />
                                        ) : (
                                            <Monitor
                                                size={20}
                                            />
                                        )}
                                    </span>

                                    <div>
                                        <p className="security-tab-text-8">
                                            {d.name}

                                            {d.current && (
                                                <span className="security-tab-this-device">
                                                    THIS DEVICE
                                                </span>
                                            )}
                                        </p>

                                        <p className="security-tab-text-9">
                                            {d.location} ·{" "}
                                            {d.lastActive}
                                        </p>
                                    </div>
                                </div>

                                {!d.current && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            updateSecurity(
                                                (p) => ({
                                                    ...p,
                                                    activeDevices:
                                                        p.activeDevices.filter(
                                                            (
                                                                x
                                                            ) =>
                                                                x.id !==
                                                                d.id
                                                        ),
                                                })
                                            )
                                        }
                                        className="security-tab-revoke"
                                    >
                                        Revoke
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* =========================================================
                ACCOUNT RECOVERY
            ========================================================= */}

            <section className="security-tab-card">
                <div className="security-tab-heading">
                    <h2>Account Recovery</h2>

                    <p>
                        Backup contacts if you lose access to
                        your account.
                    </p>
                </div>

                <div className="security-tab-recovery-grid">
                    <Field
                        label="Recovery Email"
                        hint="Must be different from your primary email."
                    >
                        <SettingsInput
                            type="email"
                            value={
                                security.recoveryEmail
                            }
                            onChange={(e) =>
                                updateSecurity((p) => ({
                                    ...p,
                                    recoveryEmail:
                                        e.target.value,
                                }))
                            }
                            placeholder="backup@email.com"
                        />
                    </Field>

                    <Field label="Recovery Mobile Number">
                        <SettingsInput
                            type="tel"
                            value={
                                security.recoveryMobile
                            }
                            onChange={(e) =>
                                updateSecurity((p) => ({
                                    ...p,
                                    recoveryMobile:
                                        e.target.value,
                                }))
                            }
                            placeholder="09XXXXXXXXX"
                        />
                    </Field>
                </div>
            </section>

            {/* =========================================================
                PRIVACY & DATA
            ========================================================= */}

            <section className="security-tab-card">
                <div className="security-tab-heading">
                    <h2>Privacy & Data</h2>

                    <p>
                        Control how your data is used on the
                        platform.
                    </p>
                </div>

                <div className="security-tab-privacy-options">
                    {[
                        {
                            key: "profileIndexing",
                            label:
                                "Allow search engine indexing",
                            hint:
                                "Your profile may appear in Google / Bing search results.",
                        },
                        {
                            key: "analyticsConsent",
                            label:
                                "Share usage analytics",
                            hint:
                                "Help improve the platform with anonymous usage data.",
                        },
                        {
                            key: "dataSharing",
                            label:
                                "Share data with third-party partners",
                            hint:
                                "Used for fraud detection and identity verification services.",
                        },
                    ].map(
                        ({
                            key,
                            label,
                            hint,
                        }) => (
                            <div
                                key={key}
                                className="security-tab-card-6"
                            >
                                <div className="security-tab-option-copy">
                                    <p className="security-tab-text-6">
                                        {label}
                                    </p>

                                    <p className="security-tab-text-7">
                                        {hint}
                                    </p>
                                </div>

                                <Toggle
                                    checked={security[key]}
                                    onChange={(v) =>
                                        updateSecurity(
                                            (p) => ({
                                                ...p,
                                                [key]: v,
                                            })
                                        )
                                    }
                                />
                            </div>
                        )
                    )}
                </div>
            </section>

            {/* =========================================================
                SAVE SETTINGS
            ========================================================= */}

            <div className="security-tab-save-row">
                <Button
                    onClick={handleSaveSecurity}
                    className="security-tab-save-security-settings"
                >
                    Save Security Settings
                </Button>
            </div>

            {/* =========================================================
                DANGER ZONE
            ========================================================= */}

            <section className="security-tab-card-8">
                <div className="security-tab-danger-content">
                    <div>
                        <h3>Delete Account</h3>

                        <p className="security-tab-text-10">
                            Permanently delete your account and
                            all associated data. This action
                            cannot be undone.
                        </p>
                    </div>

                    <Button
                        variant="destructive"
                        className="security-tab-delete-my-account"
                        onClick={handleDeleteAccount}
                    >
                        Delete Account
                    </Button>
                </div>
            </section>
        </div>
    );
};
