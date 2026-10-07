-- Read-only diagnostics: run in the Supabase SQL Editor.
-- This script does not delete accounts, change settings, or send emails.

-- Inspect whether account deletion removes the auth.users record as well as
-- the application profile. A missing row means the function is absent.
select pg_get_functiondef(p.oid) as delete_account_function
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'fn_delete_my_account';

-- Replace the placeholder with the affected email before running this query.
-- An Auth record can still reserve the email even when its app profile is gone.
select u.id as auth_id,
       u.email_confirmed_at,
       u.confirmation_sent_at,
       u.deleted_at,
       exists (
           select 1 from public.app_users a where a.auth_id = u.id
       ) as has_app_profile
from auth.users u
where lower(u.email) = lower('REPLACE_WITH_AFFECTED_EMAIL');
