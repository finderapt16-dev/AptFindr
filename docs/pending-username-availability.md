# Provisional usernames for pending email registrations

Deployed to project finder (`kwsmakrkxtbvrdqrqgvw`) by migration `ignore_unconfirmed_username_reservations`.

An unconfirmed Auth signup no longer makes its requested username unavailable. Leaving the email-confirmation screen or letting its link expire does not reserve that username. The Auth record remains available for resending confirmation; no account deletion or cleanup job is involved.

Usernames belonging to an existing `app_users` profile or a confirmed Auth user remain protected. Legacy application profiles without an Auth ID are protected for anonymous callers too. A signed-in user can retain their own username. Checks remain case-insensitive and ignore surrounding spaces.

The existing `public.is_username_available(text)` RPC was changed; the frontend already uses it for live validation and before signup. No frontend deployment is required for this database-only rule change. Refresh/re-enter the username to run a fresh availability check.

Pending choices are provisional: if another person finishes registration with the same name first, the earlier pending signup cannot displace that completed account. Existing uniqueness constraints and confirmation-trigger conflict handling remain in place. This change does not delete stored pending metadata or change email confirmation expiry.

Files: `supabase/pending-username-availability.sql`, `tests/pending-username-availability.test.mjs`.

Five isolated PostgreSQL scenarios pass (six results including the parent test): unconfirmed names available; confirmed/profile names reserved; confirmation reserves the name; anonymous boolean checks work without table grants; self-username retention preserves other users' names. The SQL was deployed twice successfully in the isolated test. Production post-deployment verification checked that the shown name is now available and existing app usernames remain unavailable. The migration contains no account INSERT/UPDATE/DELETE statements.
