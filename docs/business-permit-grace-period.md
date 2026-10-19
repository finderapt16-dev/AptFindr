# Business permit grace period UI update

Prepared for publication against GitHub main `ee99b68b52aae77a03118b60e503f79616224a4c`. This update adds presentation and existing-record reads; Supabase remains responsible for reminder delivery, approval, and publication changes. Three-way merges retain the newer remote edits in `AdminApartments.jsx`, `AdminDashboard.jsx`, and `LandlordDashboard.jsx`, including the existing expired-permit badge, listing rejection flow, and report links.

## Files added or modified

| File | Change |
| --- | --- |
| `src/utils/businessPermitStatus.js` | Shared, display-only permit status calculation, Philippine dates, annual grace deadline, renewal labels, notification metadata, and landlord ownership grouping. |
| `src/hooks/useManilaDate.js` | Updates the display at Philippine midnight and on browser focus. Uses a calendar timer rather than database polling. |
| `src/components/BusinessPermitStatus.jsx` | Shared status badge, permit dates, renewal status, grace notice, and explanation for approved permits whose listings remain unpublished. |
| `src/styles/businessPermitStatus.css` | Scoped styling for the new permit information, notices, and compact Admin table details. Existing layout CSS is retained. |
| `src/services/businessPermitRenewalService.js` | Reads existing `landlord_profiles` and `landlord_permit_renewals` records. Replacing a pending renewal retains its submitted permit year. Existing upload/review RPCs remain in use. |
| `src/services/verificationDocumentsService.js` | Attaches account permit metadata to the authenticated landlord's existing document records. Preserves ownership checks, signed document links, and document access when renewal metadata cannot be read. |
| `src/landlord/LandlordSettings.jsx` | Displays the permit status, actual expiration, renewal submission status, and approval deadline. Connects the existing update dialog and retains document links and pagination. |
| `src/landlord/UpdateBusinessPermitDialog.jsx` | Loads the existing dialog CSS and corrects the upload hint to its existing one-document limit. |
| `src/landlord/LandlordDashboard.jsx` | Routes permit notifications to Settings. Adds permit-record handlers to its existing property Realtime channel and reuses its debounce for refreshes. |
| `src/landlord/LandlordNotifications.jsx` | Keeps Supabase notification titles/messages, newest-first ordering, and unread behavior. Displays the renewal deadline and affected apartments inside the existing notification grid. |
| `src/admin/AdminDashboard.jsx` | Reads permit monitoring records, builds shared display statuses, refreshes them through the existing dashboard channel, and displays notification deadlines and landlord/apartment information. |
| `src/admin/AdminLandlordVerification.jsx` | Adds permit status, submission status, expiration, deadline, and associated apartments to the existing permit cell. Grace-period landlords appear first within the existing filters. Review buttons and verification status are retained. |
| `src/admin/AdminApartments.jsx` | Uses shared permit statuses for its existing summary card, distinguishing active grace periods from expired permits. |
| `tests/business-permit-grace-period.test.mjs` | Policy scenarios, date boundaries, approval separation, visibility, notification metadata, ownership, and metadata-permission failure coverage. |
| `tests/business-permit-renewal.test.mjs` | Adds coverage for replacing a pending renewal without advancing its permit year. |
| `tests/live-updates.test.mjs` | Updates the timer mock for the existing debounce and verifies coalesced refreshes, reconnect, fallback, and cleanup. The production live-update service is unchanged. |
| `docs/business-permit-grace-period.md` | This implementation and validation report. |

## Display behavior

- The existing exclusive January 1 expiry cutoff is displayed as December 31 at 11:59 PM, in Asia/Manila.
- Grace runs from January 1 through January 31. Its exclusive cutoff is February 1 at midnight Philippine time.
- During grace, a pending renewal remains Pending Renewal and retains its January 31 approval deadline.
- Approval of the current-year renewal removes the unpublishing warning. Account verification alone does not count as permit approval.
- After the deadline, an expired pending renewal still displays its real submission status. “Listings Unpublished” is shown only when the associated backend listing records are actually unpublished.
- A late approval never republishes listings from the frontend.
- Failure to read renewal metadata displays unavailable status and a retry action; it does not hide otherwise accessible permit documents or guess an approval.

## Validation

The final production build passed using `npm run build`. Vite required child-process access outside the Windows sandbox. The build emitted its existing plugin-timing advisory.

Targeted tests: **29 passed, 0 failed**:

```text
node --test --experimental-test-isolation=none --disable-warning=ExperimentalWarning --test-reporter=dot tests/business-permit-grace-period.test.mjs tests/business-permit-renewal.test.mjs tests/live-updates.test.mjs
```

| Required scenario | Result |
| --- | --- |
| December 31, permit approaching expiry | Valid; published listing remains visible. |
| January 1, expired previous permit | Grace Period; published listing remains visible. |
| January 15, no renewal | Grace Period and January 31 deadline. |
| January 20, pending renewal | Pending Renewal plus active grace deadline; no stored approval change. |
| January 25, approved renewal | Renewed; no unpublishing warning. |
| January 31, final minute | Grace remains active until Philippine midnight. |
| February 1, no approved renewal and backend unpublished | Expired / Listings Unpublished; tenant visibility is false. |
| February 1, approved renewal and backend published | Renewed; tenant visibility stays true. |
| February 2, late approval after backend unpublishing | Renewed; listings stay unpublished. |

Additional tests cover UTC/Philippine midnight boundaries, date-only expiry values, old permits not receiving a new grace period each January, superseded history, pending-year replacement, and read-permission failures.

Local fixture rendering checked the shared permit display, existing Admin landlord table, and landlord notification list. Desktop rendering was checked at 1440px. Chrome mobile emulation confirmed a 390px viewport with `clientWidth = scrollWidth = 390`, and the notification metadata stays in its original message column. These checks used local fixture data; live signed-in Supabase flows were not exercised.

A broader isolated full-suite run in the merged publish checkout returned **103 passed, 11 failed, and 1 skipped out of 115 tests**. The skipped SQL workflow test requires migrations that are intentionally excluded from Git. The same 11 failures were also observed before merging with newer GitHub changes. They concern unchanged email/Google signup expectations, pending signup, ranking tie order, legacy role normalization, and Super Admin sidebar badge expectations. They occur in:

- `tests/email-login.test.mjs`
- `tests/google-signup.test.mjs`
- `tests/pending-signup.test.mjs`
- `tests/preference-matching.test.mjs`
- `tests/role-normalization.test.mjs`
- `tests/super-admin-sidebar.test.mjs`

The authentication, ranking, role-normalization implementation, and Super Admin dashboard files behind these failures were not modified by this update.

## Preserved components and behavior

Tenant discovery, maps, apartment cards, favorites, search, and apartment details are unchanged. Their shared visibility utility already follows backend publication and listing availability rather than business permit expiry. Existing approval, report, appeal, sidebar, and review navigation remain in place.

`dashboardSupabaseService.js`, `liveUpdates.js`, `apartmentsService.js`, the tenant visibility utility, SQL files, and the previously fixed `supabase/functions/super-admin-users/index.ts` were inspected or preserved without modification in this task. No new frontend notification creation, automatic unpublishing, automatic republishing, database status writes, or additional Realtime channels were introduced.

## Backend dependencies to verify

1. The deployed Supabase jobs must implement November 30, December 28, December 31, January 1, and February 1 events in Asia/Manila. Scheduler definitions are not present in the current GitHub source, so their live configuration was not verified.
2. The backend must keep existing published listings available during January and unpublish only the relevant listings on February 1 when no approved renewal exists. Late approval must follow the existing required publishing process.
3. Existing `landlord_profiles` and `landlord_permit_renewals` read policies must allow landlords to read their own records and authorized Admins to read monitored records. The UI surfaces denied reads; it does not bypass security.
4. Realtime publication and permissions must include the existing notifications/apartment tables and the permit profile/renewal tables used by the reused channels.
5. Existing permit submission/review RPCs must support the deployed schema and current-year approval rules. No RPC definition or SQL migration was changed here.
6. Backend permit notifications should provide the existing `business_permit_*` type or `permit_event_id`, and their applicable `landlord_id`, `permit_year`, `expiration_at`, `renewal_status`, and apartment names/IDs. The frontend preserves server messages and resolves missing apartment names from authorized loaded listings when possible.

No production records were changed for testing. Publication includes only the permit UI, its tests, and this report. SQL, backend functions, and unrelated security changes are excluded. No Supabase deployment was performed.
