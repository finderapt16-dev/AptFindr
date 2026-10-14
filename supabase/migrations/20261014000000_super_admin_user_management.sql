-- Super Admin User Management support.
-- Review and run in Supabase SQL editor before deploying the super-admin-users Edge Function.
-- This migration is additive: it does not delete data or change existing rows.

create or replace function public.fn_is_super_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users
    where (auth_id = p_user_id or id = p_user_id)
      and role = 'super_admin'
      and coalesce(status, 'active') not in ('disabled', 'inactive', 'deactivated', 'deleted')
  );
$$;

grant execute on function public.fn_is_super_admin(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'app_users')
     and exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_users'
     ) then
    execute 'alter publication supabase_realtime add table public.app_users';
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'app_users') then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'app_users' and policyname = 'Super admins can read managed users'
    ) then
      create policy "Super admins can read managed users"
      on public.app_users
      for select
      to authenticated
      using (public.fn_is_super_admin());
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'app_users' and policyname = 'Super admins can update managed users'
    ) then
      create policy "Super admins can update managed users"
      on public.app_users
      for update
      to authenticated
      using (public.fn_is_super_admin())
      with check (public.fn_is_super_admin());
    end if;
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'admin_profiles') then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'admin_profiles' and policyname = 'Super admins can manage admin profiles'
    ) then
      create policy "Super admins can manage admin profiles"
      on public.admin_profiles
      for all
      to authenticated
      using (public.fn_is_super_admin())
      with check (public.fn_is_super_admin());
    end if;
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'landlord_profiles') then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'landlord_profiles' and policyname = 'Super admins can manage landlord profiles'
    ) then
      create policy "Super admins can manage landlord profiles"
      on public.landlord_profiles
      for all
      to authenticated
      using (public.fn_is_super_admin())
      with check (public.fn_is_super_admin());
    end if;
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'tenant_profiles') then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'tenant_profiles' and policyname = 'Super admins can manage tenant profiles'
    ) then
      create policy "Super admins can manage tenant profiles"
      on public.tenant_profiles
      for all
      to authenticated
      using (public.fn_is_super_admin())
      with check (public.fn_is_super_admin());
    end if;
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'audit_logs') then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'audit_logs' and policyname = 'Super admins can insert user-management audit logs'
    ) then
      create policy "Super admins can insert user-management audit logs"
      on public.audit_logs
      for insert
      to authenticated
      with check (public.fn_is_super_admin());
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'audit_logs' and policyname = 'Super admins can read user-management audit logs'
    ) then
      create policy "Super admins can read user-management audit logs"
      on public.audit_logs
      for select
      to authenticated
      using (public.fn_is_super_admin());
    end if;
  end if;
end $$;
