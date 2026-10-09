import {
    AlertTriangle,
    Eye,
    EyeOff,
    Pencil,
    Trash2,
} from "lucide-react";
import { useState } from "react";

const personalFields = [
    {
        key: "firstName",
        label: "First Name",
        required: true,
        autoComplete: "given-name",
    },
    {
        key: "lastName",
        label: "Last Name",
        required: true,
        autoComplete: "family-name",
    },
    {
        key: "middleInitial",
        label: "Middle Initial (Optional)",
        autoComplete: "additional-name",
    },
    {
        key: "mobile",
        label: "Mobile Number (Optional)",
        type: "tel",
        autoComplete: "tel",
    },
    {
        key: "email",
        label: "Email Address",
        required: true,
        type: "email",
        autoComplete: "email",
    },
];

export function Settings({
    profile,
    setProfile,
    user,
    onUpload,
    onRemove,
    onSave,
    loading,
    onDeleteAccount,
    onChangePassword,
}) {
    const [busy, setBusy] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const [deleteModalOpen, setDeleteModalOpen] =
        useState(false);

    const [deletingAccount, setDeletingAccount] =
        useState(false);

    const [passwordBusy, setPasswordBusy] =
        useState(false);

    const [passwordError, setPasswordError] =
        useState("");

    const [passwordSuccess, setPasswordSuccess] =
        useState("");

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    const runAction = async (action) => {
        if (!action) return;

        setBusy(true);

        try {
            await action();
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!onDeleteAccount || deletingAccount) {
            return;
        }

        setDeletingAccount(true);
        setDeleteError("");

        try {
            await onDeleteAccount();

            setDeleteModalOpen(false);
        } catch (error) {
            setDeleteError(error instanceof Error ? error.message : "Unable to delete your account. Please try again.");
            console.error(
                "Failed to delete account:",
                error
            );
        } finally {
            setDeletingAccount(false);
        }
    };

    const updateProfileField = (key, value) => {
        setProfile((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const handlePasswordChange = async (event) => {
        event.preventDefault();

        setPasswordError("");
        setPasswordSuccess("");

        if (!onChangePassword) {
            setPasswordError(
                "Password update is not connected yet."
            );
            return;
        }

        if (!passwordForm.currentPassword) {
            setPasswordError(
                "Please enter your current password."
            );
            return;
        }

        if (!passwordForm.newPassword) {
            setPasswordError(
                "Please enter a new password."
            );
            return;
        }

        if (passwordForm.newPassword.length < 8) {
            setPasswordError(
                "New password must be at least 8 characters."
            );
            return;
        }

        if (
            passwordForm.newPassword !==
            passwordForm.confirmPassword
        ) {
            setPasswordError(
                "New password and confirmation do not match."
            );
            return;
        }

        setPasswordBusy(true);

        try {
            await onChangePassword(passwordForm);

            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });

            setPasswordSuccess(
                "Your password has been updated successfully."
            );
        } catch (error) {
            console.error(
                "Failed to change password:",
                error
            );

            setPasswordError(
                error?.message ||
                    "Unable to update your password. Please try again."
            );
        } finally {
            setPasswordBusy(false);
        }
    };

    const handleCancelPassword = () => {
        if (passwordBusy) return;

        setPasswordForm({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        });

        setPasswordError("");
        setPasswordSuccess("");
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords((current) => ({
            ...current,
            [field]: !current[field],
        }));
    };

    const disabled = loading || busy;

    const profileName =
        [
            profile?.firstName,
            profile?.lastName,
        ]
            .filter(Boolean)
            .join(" ") ||
        user?.name ||
        "Your profile";

    const profileEmail =
        profile?.email ||
        user?.email ||
        "";

    const avatarLetter = (
        profile?.firstName?.[0] ||
        user?.name?.[0] ||
        "U"
    ).toUpperCase();

    return (
        <div className="tenant-profile-settings">

            {/* =====================================================
                SETTINGS HEADER
            ===================================================== */}

            <header className="tenant-profile-heading">
                <div>
                    <h1>Settings</h1>

                    <p>
                        Manage your profile details and account
                        security.
                    </p>
                </div>
            </header>


            {/* =====================================================
                PROFILE
            ===================================================== */}

            <section className="tenant-profile-summary">

                <div className="tenant-profile-identity">

                    <div className="tenant-profile-avatar">
                        {profile?.avatar ? (
                            <img
                                src={profile.avatar}
                                alt="Profile"
                            />
                        ) : (
                            avatarLetter
                        )}
                    </div>

                    <div className="tenant-profile-name">

                        <h2>{profileName}</h2>

                        <p>{profileEmail}</p>

                    </div>

                </div>


                <div className="tenant-profile-photo-actions">

                    <label
                        className={`tenant-profile-upload ${
                            disabled
                                ? "is-disabled"
                                : ""
                        }`}
                    >
                        Upload Photo

                        <input
                            aria-label="Upload profile photo"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={disabled}
                            onChange={(event) =>
                                void runAction(() =>
                                    onUpload?.(event)
                                )
                            }
                        />
                    </label>


                    <button
                        type="button"
                        className="tenant-profile-remove-photo"
                        disabled={disabled}
                        onClick={() =>
                            void runAction(onRemove)
                        }
                    >
                        Remove Photo
                    </button>


                    <p>
                        JPG, PNG, or WebP up to 2MB
                    </p>

                </div>

            </section>


            {/* =====================================================
                PERSONAL INFORMATION
            ===================================================== */}

            <form
                className="tenant-profile-information"
                onSubmit={(event) => {
                    event.preventDefault();

                    void runAction(async () => {
                        await onSave?.();
                    });
                }}
            >

                <div className="tenant-profile-section-heading">

                    <h2>Personal Information</h2>

                    <p>
                        Update your personal details.
                    </p>

                </div>


                <div className="tenant-profile-fields">

                    {personalFields.map(
                        ({
                            key,
                            label,
                            required,
                            type = "text",
                            autoComplete,
                        }) => (
                            <div
                                className="tenant-profile-field"
                                key={key}
                            >

                                <label
                                    htmlFor={`tenant-profile-${key}`}
                                >
                                    {label}

                                    {required && (
                                        <span className="required">
                                            {" "}
                                            *
                                        </span>
                                    )}
                                </label>


                                <div className="tenant-profile-input-wrap">

                                    <input
                                        id={`tenant-profile-${key}`}
                                        type={type}
                                        autoComplete={
                                            autoComplete
                                        }
                                        required={required}
                                        disabled={disabled}
                                        value={
                                            profile?.[key] ??
                                            ""
                                        }
                                        onChange={(event) =>
                                            updateProfileField(
                                                key,
                                                event.target.value
                                            )
                                        }
                                    />

                                    <Pencil
                                        aria-hidden="true"
                                        size={15}
                                    />

                                </div>


                                {key === "email" && (
                                    <p className="tenant-profile-helper">
                                        Managed securely through
                                        your authenticated
                                        account.
                                    </p>
                                )}

                            </div>
                        )
                    )}

                </div>


                <div className="tenant-profile-card-actions">

                    <button
                        type="button"
                        className="tenant-profile-secondary-button"
                        disabled={disabled}
                        onClick={() =>
                            setProfile((current) => ({
                                ...current,
                                firstName: "",
                                lastName: "",
                                middleInitial: "",
                                mobile: "",
                                email: "",
                            }))
                        }
                    >
                        Cancel
                    </button>


                    <button
                        type="submit"
                        className="tenant-profile-primary-button"
                        disabled={disabled}
                    >
                        {busy
                            ? "Saving..."
                            : "Save Changes"}
                    </button>

                </div>

            </form>


            {/* =====================================================
                CHANGE PASSWORD
            ===================================================== */}

            <form
                className="tenant-profile-password-card"
                onSubmit={handlePasswordChange}
            >

                <div className="tenant-profile-section-heading">

                    <h2>Change Password</h2>

                    <p>
                        Update your password to keep your
                        account secure.
                    </p>

                </div>


                <div className="tenant-profile-password-fields">

                    {/* Current Password */}

                    <div className="tenant-profile-password-field">

                        <label htmlFor="current-password">
                            Current Password
                        </label>

                        <div className="tenant-profile-password-input-wrap">

                            <input
                                id="current-password"
                                type={
                                    showPasswords.current
                                        ? "text"
                                        : "password"
                                }
                                autoComplete="current-password"
                                placeholder="Enter current password"
                                disabled={passwordBusy}
                                value={
                                    passwordForm.currentPassword
                                }
                                onChange={(event) =>
                                    setPasswordForm(
                                        (current) => ({
                                            ...current,
                                            currentPassword:
                                                event.target
                                                    .value,
                                        })
                                    )
                                }
                            />

                            <button
                                type="button"
                                className="tenant-profile-password-toggle"
                                aria-label={
                                    showPasswords.current
                                        ? "Hide current password"
                                        : "Show current password"
                                }
                                onClick={() =>
                                    togglePasswordVisibility(
                                        "current"
                                    )
                                }
                            >
                                {showPasswords.current ? (
                                    <EyeOff size={16} />
                                ) : (
                                    <Eye size={16} />
                                )}
                            </button>

                        </div>

                    </div>


                    {/* New Password */}

                    <div className="tenant-profile-password-field">

                        <label htmlFor="new-password">
                            New Password
                        </label>

                        <div className="tenant-profile-password-input-wrap">

                            <input
                                id="new-password"
                                type={
                                    showPasswords.new
                                        ? "text"
                                        : "password"
                                }
                                autoComplete="new-password"
                                placeholder="Enter new password"
                                disabled={passwordBusy}
                                value={
                                    passwordForm.newPassword
                                }
                                onChange={(event) =>
                                    setPasswordForm(
                                        (current) => ({
                                            ...current,
                                            newPassword:
                                                event.target
                                                    .value,
                                        })
                                    )
                                }
                            />

                            <button
                                type="button"
                                className="tenant-profile-password-toggle"
                                aria-label={
                                    showPasswords.new
                                        ? "Hide new password"
                                        : "Show new password"
                                }
                                onClick={() =>
                                    togglePasswordVisibility(
                                        "new"
                                    )
                                }
                            >
                                {showPasswords.new ? (
                                    <EyeOff size={16} />
                                ) : (
                                    <Eye size={16} />
                                )}
                            </button>

                        </div>

                        <p className="tenant-profile-helper">
                            At least 8 characters with letters,
                            numbers, and symbols.
                        </p>

                    </div>


                    {/* Confirm Password */}

                    <div className="tenant-profile-password-field">

                        <label htmlFor="confirm-password">
                            Confirm New Password
                        </label>

                        <div className="tenant-profile-password-input-wrap">

                            <input
                                id="confirm-password"
                                type={
                                    showPasswords.confirm
                                        ? "text"
                                        : "password"
                                }
                                autoComplete="new-password"
                                placeholder="Re-enter new password"
                                disabled={passwordBusy}
                                value={
                                    passwordForm.confirmPassword
                                }
                                onChange={(event) =>
                                    setPasswordForm(
                                        (current) => ({
                                            ...current,
                                            confirmPassword:
                                                event.target
                                                    .value,
                                        })
                                    )
                                }
                            />

                            <button
                                type="button"
                                className="tenant-profile-password-toggle"
                                aria-label={
                                    showPasswords.confirm
                                        ? "Hide password confirmation"
                                        : "Show password confirmation"
                                }
                                onClick={() =>
                                    togglePasswordVisibility(
                                        "confirm"
                                    )
                                }
                            >
                                {showPasswords.confirm ? (
                                    <EyeOff size={16} />
                                ) : (
                                    <Eye size={16} />
                                )}
                            </button>

                        </div>

                    </div>

                </div>


                {(passwordError || passwordSuccess) && (
                    <div
                        className={`tenant-profile-password-message ${
                            passwordError
                                ? "is-error"
                                : "is-success"
                        }`}
                        aria-live="polite"
                    >
                        {passwordError ||
                            passwordSuccess}
                    </div>
                )}


                <div className="tenant-profile-card-actions">

                    <button
                        type="button"
                        className="tenant-profile-secondary-button"
                        disabled={passwordBusy}
                        onClick={handleCancelPassword}
                    >
                        Cancel
                    </button>


                    <button
                        type="submit"
                        className="tenant-profile-primary-button"
                        disabled={
                            passwordBusy ||
                            !onChangePassword
                        }
                    >
                        {passwordBusy
                            ? "Updating..."
                            : "Update Password"}
                    </button>

                </div>

            </form>


            {/* =====================================================
                DANGER ZONE
            ===================================================== */}

            <section className="tenant-profile-danger-zone">

                <div className="tenant-profile-danger-content">

                    <div className="tenant-profile-danger-info">
                        <h3>Delete Account</h3>

                        <p>
                            Permanently delete your account and
                            all associated data, including your
                            profile, apartments, and other
                            information.
                            <br />
                            This action cannot be undone.
                        </p>

                    </div>


                    <button
                        type="button"
                        className="tenant-profile-delete-button"
                        disabled={
                            loading ||
                            deletingAccount
                        }
                        onClick={() =>
                            setDeleteModalOpen(true)
                        }
                    >
                        Delete Account
                    </button>

                </div>

            </section>


            {/* =====================================================
                DELETE ACCOUNT MODAL
            ===================================================== */}

            {deleteModalOpen && (
                <div
                    className="tenant-profile-delete-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                                event.currentTarget &&
                            !deletingAccount
                        ) {
                            setDeleteModalOpen(false);
                        }
                    }}
                >

                    <div
                        className="tenant-profile-delete-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="tenant-delete-title"
                    >

                        <div className="tenant-profile-delete-warning">

                            <AlertTriangle
                                aria-hidden="true"
                                size={22}
                            />

                        </div>


                        <h2 id="tenant-delete-title">
                            Delete Account?
                        </h2>


                        <p>
                            This will permanently delete your
                            AptFindr account and associated
                            account data. This action cannot be
                            undone.
                        </p>


                        {deleteError && <p role="alert" className="tenant-profile-delete-unavailable">{deleteError}</p>}
                        {!onDeleteAccount && (
                            <div className="tenant-profile-delete-unavailable">
                                Account deletion is not connected
                                yet. A secure deletion service
                                must be configured before this
                                action can be completed.
                            </div>
                        )}


                        <div className="tenant-profile-delete-actions">

                            <button
                                type="button"
                                className="tenant-profile-delete-cancel"
                                disabled={deletingAccount}
                                onClick={() =>
                                    setDeleteModalOpen(false)
                                }
                            >
                                Cancel
                            </button>


                            <button
                                type="button"
                                className="tenant-profile-delete-confirm"
                                disabled={
                                    deletingAccount ||
                                    !onDeleteAccount
                                }
                                onClick={() =>
                                    void handleDeleteAccount()
                                }
                            >
                                <Trash2
                                    aria-hidden="true"
                                    size={16}
                                />

                                {deletingAccount
                                    ? "Deleting..."
                                    : "Delete Account"}
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}
