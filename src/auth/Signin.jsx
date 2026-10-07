import { AuthField } from "./AuthField";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

import { Button } from "@/components/ui/button";

import { useAuth } from "@/contexts/AuthContext";

import {
    isTenantRole,
    loginWithGoogle,
    resendSignupVerification,
    signOutAuthSession,
    clearPendingGoogleOAuthFlow,
} from "@/services/authService";

import {
    AlertCircle,
    CheckCircle2,
    Eye,
    EyeOff,
} from "lucide-react";

import {
    useEffect,
    useState,
} from "react";

import {
    useLocation,
    useNavigate,
} from "react-router-dom";

import "./signin.css";


/*
 * Google's mark, shared by the sign-in button and by the create-account notice
 * so both render the same artwork.
 */
function GoogleIcon({ className = "login-google-icon" }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.23-.19-1.77H12v3.35h5.38a4.6 4.6 0 0 1-1.99 3.02l2.81 2.18c1.64-1.51 2.57-3.74 2.57-6.78Z" />
            <path fill="#34A853" d="M12 21.76c2.62 0 4.82-.86 6.43-2.34l-2.81-2.18c-.78.52-1.78.83-2.98.83-2.52 0-4.66-1.7-5.42-3.99l-2.9 2.24A9.72 9.72 0 0 0 12 21.76Z" />
            <path fill="#FBBC05" d="M7.22 14.08A5.84 5.84 0 0 1 6.9 12c0-.72.12-1.42.32-2.08l-2.9-2.24A9.75 9.75 0 0 0 2.24 12c0 1.57.38 3.06 1.08 4.32l2.9-2.24Z" />
            <path fill="#EA4335" d="M12 5.93c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.82 3 14.62 2.24 12 2.24a9.72 9.72 0 0 0-7.68 5.44l2.9 2.24c.76-2.29 2.9-3.99 5.42-3.99Z" />
        </svg>
    );
}


export function Login({
    onSuccess,
    onCreateAccount,
    onForgotPassword,
}) {
    const navigate =
        useNavigate();

    const location =
        useLocation();

    const { login } = useAuth();


    /* =====================================================
       FORM STATE
    ===================================================== */

    const [
        username,
        setUsername,
    ] = useState("");

    const [
        password,
        setPassword,
    ] = useState("");

    const [
        showPassword,
        setShowPassword,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    const [
        successMessage,
        setSuccessMessage,
    ] = useState("");

    const [
        loading,
        setLoading,
    ] = useState(false);


    /* =====================================================
       EMAIL VERIFICATION
    ===================================================== */

    const [
        verificationEmail,
        setVerificationEmail,
    ] = useState("");

    const [
        resending,
        setResending,
    ] = useState(false);

    const [
        resendCooldown,
        setResendCooldown,
    ] = useState(0);


    /* =====================================================
       REDIRECT
    ===================================================== */

    const requestedRedirect =
        new URLSearchParams(
            location.search
        ).get("redirect");

    const hasRequestedRedirect =
        requestedRedirect?.startsWith(
            "/"
        ) &&
        !requestedRedirect.startsWith(
            "//"
        );

    const redirectTo =
        hasRequestedRedirect
            ? requestedRedirect
            : null;


    /* =====================================================
       RECEIVE MESSAGE FROM SIGNUP
    ===================================================== */

    useEffect(() => {
        if (
            location.state?.message
        ) {
            setSuccessMessage(
                location.state.message
            );
        }

        if (
            location.state?.error
        ) {
            setError(
                location.state.error
            );
        }

        if (
            typeof location.state
                ?.verificationEmail ===
            "string"
        ) {
            setVerificationEmail(
                location.state
                    .verificationEmail
            );
        }

    }, [location.state]);


    /* =====================================================
       RESEND COOLDOWN
    ===================================================== */

    useEffect(() => {
        if (
            resendCooldown <= 0
        ) {
            return;
        }

        const timer =
            window.setInterval(
                () => {
                    setResendCooldown(
                        (current) =>
                            Math.max(
                                0,
                                current - 1
                            )
                    );
                },
                1000
            );

        return () => {
            window.clearInterval(
                timer
            );
        };
    }, [resendCooldown]);


    /* =====================================================
       RESEND VERIFICATION
    ===================================================== */

    const resendVerification =
        async () => {
            if (
                !verificationEmail ||
                resending ||
                resendCooldown > 0
            ) {
                return;
            }

            setResending(true);
            setError("");

            try {
                await resendSignupVerification(
                    verificationEmail
                );

                setSuccessMessage(
                    "Verification email requested. Check your inbox and spam folder."
                );

                setResendCooldown(
                    60
                );
            }
            catch (
                resendError
            ) {
                console.error(
                    "Unable to resend verification email:",
                    resendError
                );

                setError(
                    resendError instanceof Error
                        ? resendError.message
                        : "Unable to resend the verification email. Please try again later."
                );
            }
            finally {
                setResending(
                    false
                );
            }
        };


    /* =====================================================
       LOGIN
    ===================================================== */

    const handleSubmit =
        async (event) => {
            event.preventDefault();

            if (loading) {
                return;
            }

            setError("");
            setLoading(true);

            try {
                const result =
                    await login({
                        username:
                            username.trim(),
                        password,
                    });

                if (
                    !result.success
                ) {
                    setError(
                        result.error ||
                            "Invalid username or password."
                    );

                    return;
                }

                setPassword("");
                /*
                 * When used inside Landing.jsx,
                 * Landing handles navigation.
                 */
                if (
                    typeof onSuccess ===
                    "function"
                ) {
                    onSuccess(
                        result.user
                    );

                    return;
                }


                /*
                 * Fallback if this component
                 * is ever rendered directly.
                 */
                if (
                    redirectTo && result.user?.role === "admin"
                ) {
                    navigate(
                        redirectTo,
                        {
                            replace: true,
                        }
                    );

                    return;
                }

                if (
                    result.user?.role ===
                    "admin"
                ) {
                    navigate(
                        "/admin",
                        {
                            replace: true,
                        }
                    );

                    return;
                }

                if (
                    isTenantRole(
                        result.user?.role
                    )
                ) {
                    navigate(
                    "/browse",
                        {
                            replace: true,
                        }
                    );

                    return;
                }

                navigate(
                    "/landlord/dashboard",
                    {
                        replace: true,
                    }
                );
            }
            catch (
                loginError
            ) {
                console.error(
                    "Unable to sign in:",
                    loginError
                );

                setError(
                    "Unable to sign in. Check your connection and try again."
                );
            }
            finally {
                setLoading(
                    false
                );
            }
        };


    const handleGoogleLogin =
        async () => {
            if (loading) {
                return;
            }

            setError("");
            setLoading(true);

            try {
                const result =
                    await loginWithGoogle();

                /*
                 * A provider session without an AptFindr profile is never a
                 * login. End it locally and require an explicit signup flow.
                 */
                if (result?.needsAccount) {
                    const { error: signOutError } = await signOutAuthSession({ scope: "local" });
                    if (signOutError) throw signOutError;
                    clearPendingGoogleOAuthFlow();
                    setError("No AptFindr account was found for this Google account. Create an account first, then sign in with Google.");
                    setLoading(false);
                    return;
                }
            } catch (googleError) {
                clearPendingGoogleOAuthFlow();
                console.error("[AUTH] Google sign-in failed", googleError);
                setError(
                    googleError instanceof Error
                        ? googleError.message
                        : "We could not continue with Google. Please try again."
                );
                setLoading(false);
            }
        };

    /* =====================================================
       CREATE ACCOUNT
    ===================================================== */

    const handleCreateAccount =
        () => {
            if (
                typeof onCreateAccount ===
                "function"
            ) {
                onCreateAccount();

                return;
            }

            navigate(
                "/signup"
            );
        };


    /* =====================================================
       FORGOT PASSWORD
    ===================================================== */

    const handleForgotPassword =
        () => {
            if (
                typeof onForgotPassword ===
                "function"
            ) {
                onForgotPassword();

                return;
            }

            navigate(
                "/forgot-password"
            );
        };


    /* =====================================================
       LOGIN FORM
    ===================================================== */

    return (
        <div className="login-form-shell">

            <div className="login-form-heading">

                <h2 className="login-title">
                    Sign in to AptFindr
                </h2>

                <p className="login-subtitle">
                    Enter your username and
                    password to continue.
                </p>

            </div>


            {/* SUCCESS */}

            {successMessage && (

                <div className="login-message">

                    <Alert className="login-success-alert">

                        <CheckCircle2 className="login-success-icon" />

                        <AlertDescription className="login-success-text">
                            {successMessage}
                        </AlertDescription>

                    </Alert>


                    {verificationEmail && (

                        <button
                            type="button"
                            disabled={
                                resending ||
                                resendCooldown > 0
                            }
                            onClick={() =>
                                void resendVerification()
                            }
                            className="login-resend-link"
                        >
                            {resending
                                ? "Sending..."
                                : resendCooldown > 0
                                ? `Resend available in ${resendCooldown}s`
                                : "Resend Verification Email"}
                        </button>

                    )}

                </div>

            )}


            {/* ERROR */}

            {error && (

                <div className="login-message">

                    <Alert
                        variant="destructive"
                        className="login-error-alert"
                    >

                        <AlertCircle className="login-error-icon" />

                        <AlertDescription className="login-error-text">
                            {error}
                        </AlertDescription>

                    </Alert>

                </div>

            )}

            {/* FORM */}

            <form
                onSubmit={
                    handleSubmit
                }
                className="login-form"
            >

                <div className="login-form-fields">

                    {/* USERNAME */}

                    <AuthField
                        id="login-username"
                        label="Username"
                        value={
                            username
                        }
                        onChange={
                            setUsername
                        }
                        required
                    />


                    {/* PASSWORD */}

                    <div className="login-password-field">

                        <AuthField
                            id="login-password"
                            label="Password"
                            type={
                                showPassword
                                    ? "text"
                                    : "password"
                            }
                            value={
                                password
                            }
                            onChange={
                                setPassword
                            }
                            required
                            suffix={
                                <button
                                    type="button"
                                    className="auth-password-toggle login-password-toggle"
                                    onClick={() =>
                                        setShowPassword(
                                            (current) =>
                                                !current
                                        )
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                    aria-pressed={
                                        showPassword
                                    }
                                >
                                    {showPassword ? (
                                        <Eye aria-hidden="true" />
                                    ) : (
                                        <EyeOff aria-hidden="true" />
                                    )}
                                </button>
                            }
                        />


                        <div className="login-recovery-link-row">

                            <button
                                type="button"
                                onClick={
                                    handleForgotPassword
                                }
                                className="login-recovery-link"
                            >
                                Forgot password?
                            </button>

                        </div>

                    </div>

                </div>


                {/* SUBMIT */}

                <Button
                    type="submit"
                    disabled={
                        loading
                    }
                    className="login-submit-button"
                >

                    {loading ? (
                        <>
                            <div className="login-spinner" />
                            Signing in...
                        </>
                    ) : (
                        "Sign In"
                    )}

                </Button>


                <div className="login-social-divider" aria-hidden="true">
                    <span />
                    <b>or</b>
                    <span />
                </div>


                <button
                    type="button"
                    className="login-google-button"
                    onClick={
                        handleGoogleLogin
                    }
                    disabled={
                        loading
                    }
                >
                    <GoogleIcon />
                    {loading ? "Connecting to Google..." : "Continue with Google"}
                </button>


                {/* CREATE ACCOUNT */}

                <p className="login-signup-prompt">

                    Don't have an account?{" "}

                    <button
                        type="button"
                        onClick={
                            handleCreateAccount
                        }
                        className="login-create-link"
                    >
                        Create account
                    </button>

                </p>

            </form>
        </div>
    );
}
