-- Replace the landlord's active business permit with the newly submitted one.
-- The prior renewal row is retained as `superseded` for audit, while its
-- storage path is returned to the client for safe deletion after commit.

create or replace function public.fn_replace_business_permit(
  p_permit_number text,
  p_permit_year integer,
  p_permit_issued_at date,
  p_document_path text,
  p_document_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_landlord_id public.users.id%type := auth.uid();
  v_renewal_id text;
  v_expiry timestamptz := make_date(p_permit_year + 1, 1, 1)::timestamptz;
  v_old_paths jsonb := '[]'::jsonb;
  v_admin record;
begin
  if v_landlord_id is null or not exists (
    select 1 from public.users where id = v_landlord_id and lower(role) = 'landlord'
  ) then
    raise exception 'Only the owning landlord can update a business permit';
  end if;
  if nullif(trim(p_permit_number), '') is null or p_permit_year < 2000
    or p_permit_issued_at is null or nullif(trim(p_document_path), '') is null then
    raise exception 'Complete permit information and a document are required';
  end if;

  -- Keep paths only for cleanup. Do not delete a storage object until every
  -- database pointer has moved to the new object successfully.
  select coalesce(jsonb_agg(distinct storage_path), '[]'::jsonb) into v_old_paths
  from (
    select verification_document_url as storage_path
    from public.landlord_profiles
    where user_id = v_landlord_id and verification_document_url is not null
    union all
    select storage_path
    from public.apartment_verification_documents
    where landlord_id = v_landlord_id
      and document_type = 'mayors_business_permit'
      and storage_path is not null
  ) old_documents
  where storage_path <> p_document_path and storage_path !~* '^https?://';

  -- There is one active source of truth for the landlord permit. Admin views
  -- that read either the profile or an apartment document now receive the new
  -- document and metadata immediately.
  update public.landlord_profiles
  set permit_number = trim(p_permit_number),
      business_permit_number = trim(p_permit_number),
      permit_issued_at = p_permit_issued_at,
      permit_expiry = v_expiry,
      verification_document_url = p_document_path,
      updated_at = now()
  where user_id = v_landlord_id;

  update public.users
  set permit_number = trim(p_permit_number),
      business_permit_number = trim(p_permit_number)
  where id = v_landlord_id;

  update public.apartment_verification_documents
  set storage_path = p_document_path,
      file_name = coalesce(nullif(trim(p_document_name), ''), file_name),
      updated_at = now()
  where landlord_id = v_landlord_id
    and document_type = 'mayors_business_permit';

  -- Keep a review trail but make only the new submission visible as current.
  update public.landlord_permit_renewals
  set status = 'superseded'
  where landlord_id = v_landlord_id
    and status in ('pending_review', 'approved', 'requires_changes', 'rejected');

  insert into public.landlord_permit_renewals (
    landlord_id, permit_number, permit_year, permit_issued_at, expires_at,
    document_path, document_name, status, submitted_at
  ) values (
    v_landlord_id, trim(p_permit_number), p_permit_year, p_permit_issued_at,
    v_expiry, p_document_path, nullif(trim(p_document_name), ''), 'pending_review', now()
  ) returning id::text into v_renewal_id;

  for v_admin in select id from public.users where lower(role) = 'admin' loop
    insert into public.notifications (
      user_id, type, title, message, payload, read, action_target_id, action_target_type
    ) values (
      v_admin.id, 'business_permit_updated', 'Business Permit Updated',
      'A landlord submitted a replacement business permit for review.',
      jsonb_build_object(
        'permit_event_id', v_renewal_id,
        'landlord_id', v_landlord_id,
        'permit_number', trim(p_permit_number),
        'permit_year', p_permit_year,
        'document_path', p_document_path,
        'renewal_status', 'pending_review',
        'expiration_at', v_expiry,
        'notification_status', 'New permit replaces the prior active permit'
      ), false, v_landlord_id, 'landlord'
    );
  end loop;

  return jsonb_build_object(
    'renewal_id', v_renewal_id,
    'old_paths', v_old_paths,
    'document_path', p_document_path,
    'status', 'pending_review'
  );
end;
$$;

grant execute on function public.fn_replace_business_permit(text, integer, date, text, text) to authenticated;
