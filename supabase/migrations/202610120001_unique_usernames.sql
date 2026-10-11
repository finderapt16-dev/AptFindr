-- Existing duplicate usernames must be resolved before these indexes can be created.
-- Availability also checks pending email registrations in auth.users.
-- The unique index enforces uniqueness on app profiles; pending registrations
-- are checked for availability but are not protected by an auth.users index.
create unique index if not exists app_users_username_ci_unique
on public.app_users (lower(trim(username))) where username is not null and trim(username) <> '';

create or replace function public.is_username_available(p_username text)
returns boolean language sql security definer set search_path = ''
as $$
 select not exists (
   select 1 from public.app_users where lower(trim(username)) = lower(trim(p_username))
     and auth_id is distinct from auth.uid()
 ) and not exists (
   select 1 from auth.users where lower(trim(raw_user_meta_data->>'username')) = lower(trim(p_username))
     and id is distinct from auth.uid()
 );
$$;
revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;
