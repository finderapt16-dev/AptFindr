-- Run in Supabase SQL Editor for the policies shown in the diagnostic results.
-- The browser inserts auth_id, then uses INSERT ... RETURNING via .select().
-- app_users.id is the application profile ID, not necessarily the Auth ID.
-- Keep existing write rules and administrator access unchanged.
begin;

alter policy "Users can read own app_users profile"
on public.app_users
using ((select auth.uid()) = auth_id);

commit;

-- Confirm the saved policy. Then retry registration through the application.
select policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'app_users'
  and policyname = 'Users can read own app_users profile';
