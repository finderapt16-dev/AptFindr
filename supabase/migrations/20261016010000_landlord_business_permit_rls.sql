-- Business Information must never expose a permit merely because a caller can
-- guess another landlord's account ID. These helpers resolve the requester from
-- the Supabase Auth session and then verify apartment ownership server-side.

create or replace function public.fn_current_landlord_account_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select account.id::text
  from public.app_users as account
  where (account.auth_id::text = auth.uid()::text or account.id::text = auth.uid()::text)
    and lower(account.role::text) = 'landlord'
  limit 1;
$$;

create or replace function public.fn_can_read_business_permit(
  p_landlord_id text,
  p_apartment_id text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with requester as (
    select account.id::text as id, lower(account.role::text) as role
    from public.app_users as account
    where account.auth_id::text = auth.uid()::text or account.id::text = auth.uid()::text
    limit 1
  )
  select exists (
    select 1
    from requester
    where requester.role in ('admin', 'super_admin')
       or (
         requester.role = 'landlord'
         and requester.id = p_landlord_id
         and (
           p_apartment_id is null
           or exists (
             select 1
             from public.apartments as apartment
             where apartment.id::text = p_apartment_id
               and apartment.landlord_id::text = p_landlord_id
           )
         )
       )
  );
$$;

grant execute on function public.fn_current_landlord_account_id() to authenticated;
grant execute on function public.fn_can_read_business_permit(text, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'apartment_verification_documents') then
    alter table public.apartment_verification_documents enable row level security;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'apartment_verification_documents'
        and policyname = 'Business permit documents are visible to owners and admins'
    ) then
      create policy "Business permit documents are visible to owners and admins"
      on public.apartment_verification_documents
      for select
      to authenticated
      using (public.fn_can_read_business_permit(landlord_id::text, apartment_id::text));
    end if;

    -- This restrictive policy also protects the table if an older, broader
    -- permissive SELECT policy exists in a deployed project.
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'apartment_verification_documents'
        and policyname = 'Business permit document ownership is required'
    ) then
      create policy "Business permit document ownership is required"
      on public.apartment_verification_documents
      as restrictive
      for select
      to authenticated
      using (public.fn_can_read_business_permit(landlord_id::text, apartment_id::text));
    end if;
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'landlord_permit_renewals') then
    alter table public.landlord_permit_renewals enable row level security;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'landlord_permit_renewals'
        and policyname = 'Landlord permit renewals are visible to owners and admins'
    ) then
      create policy "Landlord permit renewals are visible to owners and admins"
      on public.landlord_permit_renewals
      for select
      to authenticated
      using (public.fn_can_read_business_permit(landlord_id::text));
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'landlord_permit_renewals'
        and policyname = 'Landlord permit renewal ownership is required'
    ) then
      create policy "Landlord permit renewal ownership is required"
      on public.landlord_permit_renewals
      as restrictive
      for select
      to authenticated
      using (public.fn_can_read_business_permit(landlord_id::text));
    end if;
  end if;
end $$;
