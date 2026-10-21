# Email confirmation expiry and resend

Selected behavior: expired confirmation links are rejected; pending Auth records remain so the user can request another confirmation email. No automatic deletion or cleanup is used. The previously proposed cleanup files were removed, and the cleanup job was never deployed.

## Required Supabase setting

In project finder (`kwsmakrkxtbvrdqrqgvw`), open Authentication > Sign In / Providers > Email. Set **Email OTP Expiration** to **60 seconds** and save. Depending on dashboard version, the label may be Email OTP expiry. This is a server-side Auth setting, not a SQL migration or a JavaScript timer.

The connector available in this workspace does not expose Auth configuration updates, and no Management API access token is configured. The production expiry therefore has **not** been changed or verified by this code update. Set the dashboard value before treating confirmation links as having a one-minute lifetime.

Supabase shares this setting across email OTPs and email links, including signup confirmation, password recovery, email change, magic links, and invitations. Setting it to 60 seconds shortens all those link lifetimes; it does not affect Google identity verification. See https://supabase.com/docs/guides/auth/auth-email-passwordless and https://supabase.com/docs/reference/api/v1-update-auth-service-config.

## Application changes

The existing signup countdown stays labeled `Resend in ...`: it is the resend cooldown. It does not claim to enforce or measure the server's link expiry. No frontend-only timer is used to authorize email confirmation.

An expired-link callback stops before session/profile hydration and sends the user to login with an explicit resend option. They enter their email and click Resend Verification Email; the existing Supabase resend API requests another link for that account. It does not create another account. The existing 60-second resend cooldown still applies.

Users whose email was already confirmed can sign in normally. Unverified accounts remain blocked from an application profile and dashboard. Supabase Auth validates whether each link is expired or already used.

## Verify after saving the setting

1. Register a fresh email/password account and wait more than 60 seconds before opening its link.
2. The expired link must be rejected, with no application profile/dashboard access.
3. Enter the email at login and request a new verification email.
4. Open the new link within 60 seconds and confirm that confirmation succeeds.
5. Verify that the existing pending Auth record was reused rather than creating a duplicate.

Deploy the updated frontend to Vercel for the new resend guidance. No SQL changes are needed.
