-- Apply after addBusinessPermitRenewalAutomation.sql.
-- Renewal details remain separate from approved business information until review.
alter table public.landlord_permit_renewals
  add column if not exists business_account_number text,
  add column if not exists apartment_id uuid references public.apartments(id),
  add column if not exists documents jsonb not null default '[]'::jsonb;

create or replace function public.fn_submit_business_permit_update(
  p_permit_number text, p_business_account_number text, p_permit_year integer,
  p_permit_issued_at date, p_apartment_id uuid, p_documents jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_landlord_id uuid;
  v_renewal_id uuid;
begin
  select id into v_landlord_id from public.app_users
  where (id = auth.uid() or auth_id = auth.uid()) and role = 'landlord';
  if v_landlord_id is null then raise exception 'Only the signed-in landlord may update a permit.'; end if;
  if nullif(trim(p_permit_number), '') is null or nullif(trim(p_business_account_number), '') is null
     or p_permit_issued_at is null or p_permit_issued_at > (now() at time zone 'Asia/Manila')::date then
    raise exception 'Complete the permit number, business account number, and valid issued date.';
  end if;
  if p_documents is null or jsonb_typeof(p_documents) <> 'array' then
    raise exception 'Upload between one and five permit documents.';
  end if;
  if jsonb_array_length(p_documents) not between 1 and 5 then
    raise exception 'Upload between one and five permit documents.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_documents) d
      where coalesce(d->>'path', '') not like v_landlord_id::text || '/%'
      or coalesce(d->>'mimeType', '') not in ('application/pdf', 'image/jpeg', 'image/png')
      or coalesce((d->>'size')::bigint, 0) not between 1 and 5242880) then
    raise exception 'Invalid permit document.';
  end if;
  if p_apartment_id is not null and not exists (
    select 1 from public.apartments where id = p_apartment_id and landlord_id = v_landlord_id
  ) then raise exception 'This apartment does not belong to your account.'; end if;
  perform pg_advisory_xact_lock(hashtext(v_landlord_id::text));
  if exists (select 1 from public.landlord_permit_renewals where landlord_id = v_landlord_id and status = 'pending_review') then
    raise exception 'Your permit update is already under review.';
  end if;
  v_renewal_id := public.fn_submit_business_permit_renewal(
    trim(p_permit_number), p_permit_year, p_permit_issued_at,
    p_documents->0->>'path', p_documents->0->>'name'
  );
  update public.landlord_permit_renewals set business_account_number = trim(p_business_account_number),
    apartment_id = p_apartment_id, documents = p_documents where id = v_renewal_id;
  return v_renewal_id;
end;
$$;
revoke all on function public.fn_submit_business_permit_update(text, text, integer, date, uuid, jsonb) from public;
grant execute on function public.fn_submit_business_permit_update(text, text, integer, date, uuid, jsonb) to authenticated;
