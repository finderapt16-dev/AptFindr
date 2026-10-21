# AptFindr confirmation email — supplied reference design

The template matches the supplied reference: white background, house logo and cyan AptFindr wordmark, welcome label, confirmation heading, full-width cyan button, sign-in/resend guidance, and a pale gray footer. It uses email-compatible presentation tables, inline styles, an Outlook width fallback, standard fonts, and mobile spacing rules. No JavaScript, tracking, or embedded data images are used in the production template.

## Files

- `supabase/templates/confirmation.html` — complete Supabase email HTML.
- `supabase/templates/confirmation.subject.txt` — subject line.
- `public/aptfindr-email-icon.png` — email-compatible PNG generated from the existing AptFindr SVG logo.
- `docs/email-confirmation-preview.html` — local preview with a nonfunctional example.invalid confirmation URL and local logo path. Do not paste this preview into Supabase.
- `docs/email-confirmation-preview.png` — rendered preview image.

## Activate

1. Deploy `public/aptfindr-email-icon.png` with the site (commit/push it to the Git repository connected to Vercel). The resulting path is `/aptfindr-email-icon.png` on the public site.
2. Confirm Supabase's Site URL points to that deployed site, with no trailing slash, so `{{ .SiteURL }}/aptfindr-email-icon.png` resolves correctly.
3. In Supabase > Authentication > Email Templates (or Emails > Templates) > Confirm signup, save a copy of the current template, replace its HTML with the full contents of `supabase/templates/confirmation.html`, set the subject from the subject text file, and save.
4. Request a fresh confirmation email through signup/resend and inspect the result in Gmail. Existing delivered messages retain their old design.

The primary button keeps `{{ .ConfirmationURL }}` exactly as provided by Supabase. It verifies the same account and follows the existing callback flow. Expiry is controlled by Supabase's Email OTP Expiration setting, not the template. See https://supabase.com/docs/guides/auth/auth-email-templates.

The logo requires a site deployment because it is a new hosted image. Template text/styles are saved in Supabase separately. No SQL, account changes, or database migration is required. The connected tools do not expose hosted email-template updates, so the design has been prepared locally, not applied to outgoing mail.

The existing SVG was rasterized into a transparent 172×124 PNG and displayed at 43×31 for a sharp logo. Email clients that block remote images still show the adjacent text wordmark. Browser rendering was checked; actual Gmail/Outlook rendering should be verified after activation, because clients differ in CSS support.
