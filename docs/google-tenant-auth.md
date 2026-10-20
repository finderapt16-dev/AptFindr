# Google tenant authentication update

The complete updated files are in this workspace and in `aptfindr-google-auth-update.zip`, with their original relative paths.

Changed application files:

- `src/services/authService.js`: verifies Google users, calls a no-argument database provisioning function, restores OAuth sessions, preserves password sessions with linked Google identities, and shares single-use PKCE code exchanges across repeated callbacks.
- `src/auth/AuthCallback.jsx`: provisions tenants automatically, hydrates context, redirects to `/browse`, and signs restricted roles out locally with the required message. Missing/expired browser flow markers do not gate verified authentication. Email confirmation retains its existing sign-in requirement.
- `src/contexts/AuthContext.jsx`: restores the verified session independently of the user-directory queries and preserves it during partial directory refreshes.
- `src/auth/Signin.jsx`: keeps the Google button and modal layout; removes the manual-registration branch.
- `src/auth/Signup.jsx`: sends Google signup through the same tenant-only flow; old Google setup bookmarks redirect to the callback.

Database file: `supabase/google-tenant-auth.sql`.
Tests: `tests/google-signup.test.mjs`, `tests/email-confirmation.test.mjs`, `tests/google-tenant-database.test.mjs`.
Diagnostic script: `scripts/check-google-auth-deployment.mjs`.

## Confirmed cause of the current failure

On 2026-10-20, the configured project returned HTTP 404 with:

- Code: `PGRST202`
- Message: `Could not find the function public.complete_google_tenant_sign_in without parameters in the schema cache`
- Details: PostgREST searched for the zero-argument function (or one unnamed JSON parameter) and found no match.

Catalog inspection independently confirmed `to_regprocedure('public.complete_google_tenant_sign_in()')` is NULL. Production edge logs contain repeated 404 requests to this RPC during the failed browser logins. Three verified Google Auth users currently have no profile linked by Auth ID. The current `handle_new_auth_user()` trigger explicitly returns without inserting new Google profiles. Together, the missing RPC and deferring trigger leave successful Google authentication without an application account. Changing the banner cannot fix this.

`app_users` requires non-null name, email, role and username. Usernames must be unique and match 4?30 letters/digits/underscores. The corrected function generates a compliant internal username, checks for collisions, and supplies all required values. Users never enter a username/password. Existing unique Auth-ID/email constraints are retained, with normalized-email uniqueness added. Existing INSERT RLS permits tenant/landlord self-inserts; the OAuth guard closes that browser-controlled path while the verified private function creates only tenants.

Current frontend causes:

- `src/services/authService.js` calls the missing RPC. Previously it wrapped the error using only its message, losing code/details/hint. It now preserves diagnostic fields, logs them in development, validates the returned Auth ID, and shares concurrent provisioning requests without caching future sign-ins.
- `src/auth/AuthCallback.jsx` previously provisioned explicitly and then hydrated, causing another provisioning call. It now hydrates/provisions once, checks the session/profile before navigation, and stops stale StrictMode effect instances before they can navigate or sign out another instance.
- `public.handle_new_auth_user()` remains the production-side blocker until the SQL is applied. The complete corrected definition is included in the SQL; Google returns before legacy linking touches existing accounts. The existing password branch is retained.

The diagnostic request is reproducible with `node scripts/check-google-auth-deployment.mjs`. It uses only the configured anonymous key, prints error diagnostics without credentials, and cannot create an account. After deployment, it should be denied as anonymous (rather than reporting a missing function).

## Database deployment status

The SQL has **not been applied**. Automatic approval review rejected the production migration because it adds privileged provisioning code, a normalized email index, and changes shared auth-trigger behavior. Approval is required to apply this exact file to project `finder` (`kwsmakrkxtbvrdqrqgvw`). Do not deploy the frontend until the SQL has been applied and verified: the new RPC does not yet exist in production.

The SQL uses the existing tables and role enum. It adds a normalized email uniqueness index, a private provisioning function behind an authenticated-only invoker RPC, and a guard against browser-controlled OAuth profile creation/role reassignment. The existing auth trigger defers all Google identities to provisioning; its password-signup body remains intact. Server-side identity checks use `auth.uid()`, `auth.users`, and Google `auth.identities`, never browser-supplied role or identity parameters. Existing tenant IDs and account data are preserved. Conflicting identities and non-tenant roles fail without changing their records. Transaction locks and unique constraints prevent duplicate profiles during repeated callbacks. No password or Google token is stored in profile tables.

Preflight against the connected project found no duplicate normalized emails. The corrected SQL passed isolated embedded PostgreSQL tests. Production SQL verification and live Google sign-in remain pending database approval. The Supabase CLI was not present; this is a reviewable standalone SQL deployment file, not an invented CLI migration-history entry.

## Google and Supabase configuration

1. Supabase Authentication > Sign In / Providers > Google: enable Google and supply the Google Web OAuth client ID and secret. Keep email verification enabled; do not enable the skip-email-check option.
2. In Google Cloud, register this Authorized redirect URI for the hosted Supabase project:
   `https://kwsmakrkxtbvrdqrqgvw.supabase.co/auth/v1/callback`
   The Google redirect is the Supabase callback, rather than the application's `/auth/callback` route.
3. Configure the Google application's JavaScript origins with the actual Vercel production origin and local development origin, for example `http://localhost:5173`. Use only the scopes required for identity: `openid`, email, and profile. If Google consent is in Testing mode, add the test accounts or publish the consent app as appropriate.
4. Supabase Authentication > URL Configuration: set Site URL to the actual production Vercel/custom-domain origin. Add these exact Redirect URLs:
   - `http://localhost:5173/auth/callback` (adjust if Vite uses a different port)
   - `https://YOUR-VERCEL-DOMAIN/auth/callback`
   - The equivalent URL for any custom domain or preview origins you actually use.
   Keep existing email confirmation and password-reset URLs. The frontend constructs Google `redirectTo` from `window.location.origin`; no production domain is hardcoded.
5. Vercel: configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the intended environments, then rebuild. Never put the Google client secret or Supabase service-role key in frontend variables. The existing Vercel SPA rewrite already supports direct callback/dashboard requests.

References: [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

## Verification

- 27 focused JavaScript authentication tests pass.
- 10 database scenarios pass against isolated PostgreSQL using PGlite (11 test results including the parent test). This exercises the actual SQL, not a mocked provisioning function.
- The production Vite build passes.
- The broader pre-existing suite has six failures in username/signup expectations, preference matching, legacy role spelling, and sidebar assertions. Those unrelated implementations were not changed.

Reproduce the focused tests:

`node --test tests/google-signup.test.mjs tests/email-confirmation.test.mjs`

The database test skips by default when its optional test engine is unavailable. To run without changing project dependencies, in PowerShell:

`npm.cmd install --prefix "$env:TEMP/aptfindr-auth-sql-check" --no-save --package-lock=false @electric-sql/pglite@0.3.14`

`$env:APTFINDR_PGLITE_DIR = "$env:TEMP/aptfindr-auth-sql-check/node_modules/@electric-sql/pglite"`

`node --test tests/google-tenant-database.test.mjs`

The migration was applied twice successfully in the isolated database. Deployment includes short lock/statement timeouts and a PostgREST schema-cache reload notification. No production user rows have been modified.


The focused mocked-boundary regression tests cover automatic tenant provisioning without form/password arguments; repeated callback and refresh recovery; landlord/admin/super-admin rejection; preservation of their password sessions when Google is linked; unverified identity rejection; database errors; localhost/Vercel callback origins; PKCE replay protection; and unchanged email-confirmation behavior.

After approval, apply the SQL and run the database advisors. Check RPC permissions (anonymous execution must be denied), verify the trigger definitions, then test using real Google sessions:

| Scenario | Expected result |
| --- | --- |
| New verified Google account | One app_users row and tenant_profiles row; tenant role; directly enters `/browse` |
| Existing tenant | Same app_users ID, favorites, preferences and reports retained |
| Repeated/concurrent callbacks | One profile per Auth ID and normalized email |
| Missing tenant profile | Server recreates the missing profile without a signup form |
| Existing landlord/admin/super-admin email | Required role-conflict message; local sign-out; no record or role changes |
| Browser tries to insert a landlord profile during OAuth | Database denies the write |
| User metadata contains a privileged role | Provisioning still assigns tenant only |
| Dashboard refresh | Restores tenant from Supabase session |
| Google cancellation or network failure | Loading ends with an error or a return-to-sign-in action |
| Password login for every existing role | Existing role-specific login behavior retained |

Repeat the new/existing/restricted-role flows on localhost and the actual Vercel origin. Full-page OAuth navigation leaves the login-modal page; callback navigation enters the dashboard with the hydrated context. `/browse` is the existing tenant destination: `/tenant/dashboard` without a section already redirects there in this application.
