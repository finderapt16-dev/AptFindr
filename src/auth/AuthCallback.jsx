import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { clearPendingGoogleOAuthFlow, exchangeAuthCode, getAuthUser, getExistingProfileForAuthUser, getPendingGoogleOAuthFlow, isGoogleAuthUser, signOutAuthSession } from "@/services/authService";

const dashboardPathForRole = (role) => role === "admin" ? "/admin" : role === "landlord" ? "/landlord/dashboard" : "/browse";

function getOAuthErrorMessage(params) {
    const error = `${params.get("error_code") || params.get("error") || ""} ${params.get("error_description") || ""}`.trim();
    // A confirmation link that has expired or was already used (mail scanners
    // often open links before the person does) is not a Google problem.
    if (/otp_expired|email link is invalid/i.test(error)) {
        return "This confirmation link has expired or was already used. If you already confirmed your email, sign in with your username and password.";
    }
    if (/access_denied|cancel(?:led|ed)?/i.test(error)) {
        return "Google sign-in was cancelled. You can try again whenever you are ready.";
    }
    if (/database error saving new user|database.*(?:user|profile)|trigger/i.test(error)) {
        return "Supabase could not create this Google account. The AptFindr administrator needs to check the Supabase Auth logs and the auth.users profile trigger.";
    }
    return "Google sign-in could not be completed. Check the Supabase Google provider and callback URL settings, then try again.";
}
export function AuthCallback() {
    const navigate = useNavigate();
    const { hydrateSession } = useAuth();
    const [error, setError] = useState("");
    useEffect(() => {
        let active = true;
        void (async () => {
            const params = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(window.location.hash.slice(1));
            for (const key of ["error", "error_code", "error_description"]) {
                if (!params.has(key) && hashParams.has(key)) params.set(key, hashParams.get(key));
            }
            const callbackError = params.get("error_description") || params.get("error");
            if (callbackError) {
                clearPendingGoogleOAuthFlow();
                console.error("Authentication callback was rejected:", callbackError);
                if (active)
                    navigate("/login", {
                        replace: true,
                        state: { error: getOAuthErrorMessage(params) },
                    });
                return;
            }
            const code = params.get("code");
            if (code) {
                const { error: exchangeError } = await exchangeAuthCode(code);
                if (exchangeError) {
                    console.error("Email verification callback failed:", exchangeError);
                    if (active)
                        setError("This verification link is invalid or has expired. Request a new verification email and try again.");
                    return;
                }
            }
            const { data, error: userError } = await getAuthUser();
            if (userError || !data.user?.email_confirmed_at) {
                if (userError)
                    console.error("Unable to confirm verified user:", userError);
                if (active)
                    setError("Email verification could not be confirmed. Request a new verification email and try again.");
                return;
            }
            try {
                if (isGoogleAuthUser(data.user)) {
                    const oauthFlow = getPendingGoogleOAuthFlow();
                    const existingProfile = await getExistingProfileForAuthUser(data.user);
                    if (oauthFlow === "signup" && !existingProfile) {
                        clearPendingGoogleOAuthFlow();
                        const requestedRole = params.get("signup_role") === "landlord" ? "&role=landlord" : "";
                        if (active) navigate(`/signup?google=setup${requestedRole}`, { replace: true });
                        return;
                    }

                    if (oauthFlow === "signup" && existingProfile) {
                        clearPendingGoogleOAuthFlow();
                        const { error: signOutError } = await signOutAuthSession({ scope: "local" });
                        if (signOutError) throw signOutError;
                        if (active) navigate("/login", {
                            replace: true,
                            state: { message: "An AptFindr account already exists for this Google account. Please sign in to continue." },
                        });
                        return;
                    }

                    if (oauthFlow === "login" && !existingProfile) {
                        clearPendingGoogleOAuthFlow();
                        // A first-time Google visitor starts from Sign In. Keep
                        // their verified Google session so the tenant setup form
                        // can show the email as read-only and finish the account.
                        if (active) navigate("/signup?google=setup&role=tenant", { replace: true });
                        return;
                    }

                    if (!oauthFlow) {
                        clearPendingGoogleOAuthFlow();
                        const { error: signOutError } = await signOutAuthSession({ scope: "local" });
                        if (signOutError) throw signOutError;
                        if (active) navigate("/login", {
                            replace: true,
                            state: { error: "Your Google sign-in request expired. Please try again from Sign In or Create Account." },
                        });
                        return;
                    }
                    const profile = await hydrateSession();
                    if (!profile)
                        throw new Error("The Google account profile is not available.");
                    clearPendingGoogleOAuthFlow();
                    if (active)
                            navigate(dashboardPathForRole(profile.role), { replace: true });
                    return;
                }
                // Email confirmation can create a temporary browser session.
                // Confirmation proves ownership of the address; it must not act
                // as a normal sign-in. End only this browser session, preserving
                // the confirmed address in Supabase, then require credentials.
                const { error: signOutError } = await signOutAuthSession({ scope: "local" });
                if (signOutError)
                    throw signOutError;
                if (active)
                    navigate("/login", {
                        replace: true,
                        state: { message: "Email confirmed successfully. You can now sign in to your AptFindr account." },
                    });
                return;
            }
            catch (profileError) {
                console.error("Authentication succeeded but profile recovery failed:", profileError);
                clearPendingGoogleOAuthFlow();
                await signOutAuthSession();
                const isGoogleAuth = isGoogleAuthUser(data.user);
                if (active)
                    navigate("/login", {
                        replace: true,
                        // A Google account that could not be finished has to read
                        // as a problem, not as the green "account created" banner,
                        // and it has to say what to do next.
                        state: isGoogleAuth
                            ? { error: "Google signed you in, but AptFindr could not finish creating your account. Press Continue with Google to try again, and contact the administrator if this keeps happening." }
                            : { error: "Your email is confirmed, but AptFindr could not load your account. Try signing in, and contact support if this continues." },
                    });
            }
        })();
        return () => { active = false; };
    }, [hydrateSession, navigate]);
    return (<main className="auth-status-page">
      <section className="auth-status-card">
        {error ? (<>
            <h1 className="auth-status-title">Verification unsuccessful</h1>
            <p className="auth-status-description">{error}</p>
            <Link to="/login" className="auth-status-login-link">Return to Sign In</Link>
          </>) : (<>
            <h1 className="auth-status-title">Verifying your email</h1>
            <p className="auth-status-description">Please wait while AptFindr confirms your email address.</p>
          </>)}
      </section>
    </main>);
}
