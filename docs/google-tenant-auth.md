# Google tenant signup flow

Current behavior:

- **New Google account:** Continue with Google ? verify Google identity ? Create Account as Tenant, with name and read-only email autofilled ? accept terms and submit ? create tenant profile ? hydrate session ? `/browse` (the existing tenant dashboard destination).
- **Existing tenant:** Continue with Google ? load existing tenant profile ? `/browse`, without registration or duplicate records.
- **Existing restricted role:** reject tenant-only Google sign-in; preserve the existing role and account.

A verified Supabase Auth session alone is not a completed AptFindr registration. Session initialization, auth-state listeners, page refreshes, and callback hydration only load an existing `app_users` profile. They never create a new Google profile automatically. New users stay signed in to Google while completing the form. Leaving/reopening the form before submitting does not create an application account.

The Google form fixes the role to tenant, autofills name and verified email, keeps email read-only, and hides username/password fields. The existing database RPC generates the required internal username. User-edited full names are saved to their own profile after provisioning. Password signup keeps its existing fields and validation.

## Changed files

- `src/services/authService.js`: restore existing Google profiles without creating accounts; validate and create the tenant only from `finalizeGoogleSignup` after form submission. Server assigns identity, email, and tenant role.
- `src/auth/AuthCallback.jsx`: send users with no application profile to `/signup?google=setup&role=tenant`; send existing tenants to the dashboard.
- `src/auth/Signup.jsx`: load verified Google identity, prefill tenant signup, require agreement, submit to the existing server function, hydrate, and navigate only after the profile exists.
- `src/auth/SignupFields.jsx`: optional username field, with ordinary signup defaults preserved. Google setup hides username/password fields.
- `tests/google-signup.test.mjs`, `tests/email-confirmation.test.mjs`, `tests/google-signup-form.test.mjs`: registration timing, secure role assignment, account continuity, callback navigation, form prefill, required agreement, and password-login regression coverage.

## Database and deployment

**No additional SQL changes are needed for this flow change.** The previously deployed `complete_google_tenant_sign_in()` function and protections are reused. It is now called when Create Account is submitted, rather than during session restoration. Existing accounts are preserved. Accounts created under the earlier automatic flow already count as existing tenants.

The archive contains complete updated source and the existing database SQL for reference. Redeploy the frontend to Vercel to activate the new flow on the live site. Existing callback URLs remain valid:

- Local app: `http://localhost:5173/auth/callback` (use your actual Vite port).
- Deployed app: `https://apt-findr-ko9f.vercel.app/auth/callback` (and any custom domain in use).
- Google Cloud's authorized redirect URI remains the Supabase provider callback: `https://kwsmakrkxtbvrdqrqgvw.supabase.co/auth/v1/callback`.

Keep these application callbacks in Supabase Authentication URL Configuration. The frontend uses the current origin, so localhost and Vercel use their own callback. Do not place Google secrets or Supabase service-role keys in the frontend.

## Verification

Run focused regression tests:

`node --test tests/google-signup.test.mjs tests/email-confirmation.test.mjs tests/google-signup-form.test.mjs tests/google-name-fields.test.mjs`

The form tests execute the actual signup component with isolated hooks and service boundaries: they verify tenant/name/email prefill, no premature registration/navigation, agreement validation, form submission followed by dashboard navigation, existing-tenant bypass, and restricted-role rejection.

Run the production build with `npm.cmd run build` on PowerShell.

The optional embedded PostgreSQL test (`tests/google-tenant-database.test.mjs`) exercises the previously deployed SQL. No production user data is changed by these tests.
