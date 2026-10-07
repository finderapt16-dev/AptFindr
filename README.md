# AptFindr

AptFindr is a Progressive Web Application for discovering and managing apartment listings in La Paz, Iloilo City. It provides separate Tenant, Landlord, and Admin workflows backed by Supabase.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and provide the project-specific public Supabase values.
3. Start development with `npm run dev`.

Never commit `.env`, service-role keys, passwords, or other secrets.

## Commands

- `npm run dev` — start the Vite development server
- `npm run typecheck` — run TypeScript checks
- `npm run lint` — run strict TypeScript unused-code checks
- `npm run build` — create the production build
- `npm run migrate:supabase -- <folder>` — import supported local JSON data using the database utility script

## Project map

- `src/App.jsx` — public, authentication, tenant, landlord, and admin routes
- `src/landing` and `src/auth` — public pages and shared authentication
- `src/tenant`, `src/landlord`, `src/admin` — flat role folders containing pages and their components
- `src/components` — shared controls, layouts, and account settings; `ui` contains the common UI primitives
- `src/services` — Supabase client and existing data-access services
- `src/contexts`, `src/hooks`, `src/data`, `src/utils` — shared state, data types, and helpers
- `src/assets` — images; `src/tools` — the existing design-guide and flowchart pages
- `src/styles` — global variables, base styles, shared sidebar styles, and the ordered stylesheet imports

Page-specific CSS lives beside its page or section. Landing and authentication now use semantic classes and plain CSS. Authentication shares one `AuthField` and common styles in `src/auth/auth.css`; its larger pages have adjacent stylesheets. The role pages and shared controls still need their Tailwind-to-CSS pass.

See [the tenant source guide](docs/TENANT_STRUCTURE.md) for tenant page locations, shared dependencies, cleanup details, and verification commands.

## Supabase

The local `supabase-master-migration.sql` is intentionally ignored and must not be committed. Run the current migration manually in the Supabase SQL Editor when required. Configure production Site URL, allowed `/auth/callback` and `/reset-password` redirects, and custom SMTP in Supabase.

### Google OAuth profile setup

Supabase's `signInWithOAuth()` does not accept custom user metadata in its `options`. AptFindr therefore assigns the tenant role and generated username **after** Google returns, once the user has accepted the signup terms. The `auth.users` trigger `handle_new_auth_user` must let Google Auth users through without trying to create an `app_users` row first; keep its existing email/password profile setup intact. Add this guard at the start of that trigger function:

```sql
IF COALESCE(NEW.raw_app_meta_data ->> 'provider', '') = 'google' THEN
  RETURN NEW;
END IF;
```

The authenticated client then creates the tenant's `app_users` profile. Confirm the existing RLS policy permits an authenticated user to insert only their own profile (`auth_id = auth.uid()`). If Google signup redirects back with `Database error saving new user`, open Supabase **Authentication → Logs** and the Postgres logs; the `auth.users` trigger is rejecting the new user before the app callback can run. The trigger body is project-specific, so apply the guard to the existing function rather than replacing it with a guessed schema.

`/auth/callback` decides what to do with the returned Google session from the signup intent marker (`aptfindr.google-oauth-flow`), which is written to `localStorage` with a 10-minute TTL because mobile browsers and installed PWAs often return from Google in a new tab where `sessionStorage` is not shared. A signed-up Google user is therefore never mistaken for a bare login and bounced back to the account screens. A Google account with no AptFindr profile returns to the sign-in screen with a "You need to create an account" notice: the Google session is kept live so ticking consent and pressing **Create Account with Google** finishes the tenant profile without a second trip to the provider, and **Use a different Google account** clears the session and reopens Google's chooser.

### Email confirmation (password accounts)

With **Confirm email** turned on in Supabase, a username/password account is registered like this:

1. **Create Account** sends the confirmation email and opens the sign-in screen with a notice and a **Resend Verification Email** link.
2. The link in the email opens `/auth/callback`. It confirms the address but does **not** sign the person in. Supabase starts a session while confirming, so the callback ends it again (`signOut({ scope: 'local' })`, this browser only) and opens the sign-in screen with an "Email confirmed" notice.
3. The person signs in with the username and password they chose when registering.

An expired or already-used link returns to the sign-in screen with an explanation. Google accounts are unaffected and still sign in straight away.

The wording of the email itself lives in Supabase (**Authentication → Emails → Confirm signup**), not in this repo. Keep the `{{ .ConfirmationURL }}` link and, for example, tell people to sign in with the username and password they created once they have confirmed.

## Registration and mobile/PWA checks

- Tenant registration is a single card with username, email, password confirmation, consent, and Google signup.
- Landlord registration progresses through **Account Details → Personal Information → Review**. Business Name is optional. Review edits use a separate floating, validated draft form; Cancel discards changes and Save shows a confirmation without leaving Review.
- New password accounts require at least 8 characters, uppercase/lowercase letters, a number, and a special character. Existing sign-in behavior is unchanged.
- Optional landlord business names are retained in signup metadata and copied into an empty `landlord_profiles.business_name` after authenticated profile setup. This does not overwrite a name subsequently edited in Settings.
- Cards scroll on short screens and use the visual viewport to remain accessible above mobile keyboards. PWA PNG/maskable and Apple icons are generated from the actual logo during `npm run build`. The production service worker precaches the app shell and app chunks for offline navigation; live listings, authentication, and writes still require internet.
- A production PWA needs HTTPS and the real Supabase environment configuration. Installation uses the browser's install/Add to Home Screen controls; registration and live listings still need an internet connection.

## Terms of Service and Privacy Policy

- Four documents are published: `tenant-terms`, `tenant-privacy`, `landlord-terms`, and `landlord-privacy`. They live in `src/legal/policyContent.js` as plain data (title, summary, highlights, sections) and are rendered by one shared body component, `src/legal/PolicyDocument.jsx`, so the popup and the public page can never disagree. Update the text there and, when the wording changes, bump `POLICY_UPDATED` in `src/legal/policyMeta.js`.
- Each document has **two** surfaces, because they serve different purposes:

  | Surface | Entry point | Behaviour |
  | --- | --- | --- |
  | Popup - `src/legal/PolicyDialog.jsx` | Signup consent checkbox | Opens over the current screen. Nothing navigates, so the page, scroll position, and any half-filled form stay exactly as they were. Close with the X, Escape, or a click on the backdrop. |
  | Public page - `src/legal/PolicyPage.jsx` | Landing footer, and any shared URL | Navigates to a real, bookmarkable route that works with no account. |

- The public routes are **`/privacy-policy`** and **`/terms-of-service`**. The landing footer links to them, so the URLs are discoverable from the site itself.
- Tenant and landlord wording differs, but only one URL can be submitted to a third party, so the public page switches audience with a segmented control. The choice lives in the query string (`/privacy-policy?audience=landlord`) and each button is a real anchor, so a shared link always opens the version you meant.
- New surfaces can use the hook (`usePolicyDialog` in `src/legal/usePolicyDialog.jsx`).

### Supabase URL Configuration

Supabase's Authentication settings ask for two public URLs. Set them after the first deploy:

| Supabase field | Value |
| --- | --- |
| **Application privacy policy link** | `https://<your-domain>/privacy-policy` |
| **Application terms of service link** | `https://<your-domain>/terms-of-service` |

Both routes are public, need no session, and are served by the SPA rewrite in `vercel.json`, so they resolve on a direct visit, a refresh, and a shared link. The review screen only checks that the URL is reachable and publicly readable, not that it requires a login.

### Faster loading

- The policy text is code-split: it is only ever fetched through `src/legal/policyLoader.js`, so it is not part of the first page load. The loader caches every document after the first request, and links warm the chunk on hover, focus, or touch-start, so a tap usually opens the popup with no visible wait.
- The landing page no longer bundles the login and signup screens. `src/landing/Landing.jsx` loads them with `React.lazy`, prefetches them once the browser is idle, and warms them again on hover or focus. The landing page's own script payload drops from about 204 kB gzip to 5 kB gzip; the signup code is fetched only when someone actually signs in or registers.

The documents are written for AptFindr's current tenant and landlord flows. The site owner should review their wording - and the contact address - before production use.
