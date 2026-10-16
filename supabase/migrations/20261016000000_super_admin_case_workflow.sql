-- Allow Super Admin accounts to perform the same report and appeal workflow
-- decisions as Admin accounts. The workflow RPCs all delegate authorization
-- to this helper, so replacing it updates existing deployments atomically.

begin;

create or replace function public.fn_workflow_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users account
    where (account.id::text = auth.uid()::text or account.auth_id::text = auth.uid()::text)
      and replace(lower(trim(account.role::text)), '-', '_') in ('admin', 'super_admin')
  );
$$;

revoke all on function public.fn_workflow_is_admin() from public;
grant execute on function public.fn_workflow_is_admin() to authenticated;

commit;
