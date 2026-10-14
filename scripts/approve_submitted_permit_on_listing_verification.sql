-- Approve a landlord's submitted business permit as part of the admin's
-- "Verify & Publish Listing" decision. Run once in the Supabase SQL Editor.
-- This project uses public.app_users for roles.

create or replace function public.fn_approve_submitted_business_permit(
  p_landlord_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_year integer := extract(year from timezone('Asia/Manila', now()));
  v_renewal public.landlord_permit_renewals%rowtype;
  v_profile record;
  v_document record;
  v_renewal_id text;
begin
  if not exists (
    select 1
    from public.app_users
    where id = auth.uid()
      and lower(role::text) = 'admin'
  ) then
    raise exception 'Only administrators can approve a business permit';
  end if;

  -- Prefer the current-year renewal submitted by the landlord. An already
  -- approved renewal is retained as-is.
  select * into v_renewal
  from public.landlord_permit_renewals
  where landlord_id::text = p_landlord_id
    and permit_year = v_current_year
    and status in ('pending_review', 'approved')
  order by submitted_at desc nulls last
  limit 1;

  -- Older submissions may only exist in the landlord profile/document table.
  -- Create their current-year review record now, because the administrator is
  -- explicitly reviewing the document from the apartment verification page.
  if not found then
    select
      profile.user_id,
      coalesce(nullif(trim(profile.permit_number), ''), nullif(trim(profile.business_permit_number), '')) as permit_number,
      profile.permit_issued_at,
      profile.permit_expiry,
      profile.verification_document_url
    into v_profile
    from public.landlord_profiles as profile
    where profile.user_id::text = p_landlord_id;

    select document.storage_path, document.file_name
    into v_document
    from public.apartment_verification_documents as document
    where document.landlord_id::text = p_landlord_id
      and document.document_type in ('mayors_business_permit', 'proof_of_ownership')
    order by document.created_at desc nulls last
    limit 1;

    if v_profile.user_id is null then
      raise exception 'The landlord profile for this permit is unavailable';
    end if;

    if coalesce(v_profile.permit_number, '') = '' then
      raise exception 'A permit number is required before this listing can be verified';
    end if;

    if coalesce(v_profile.verification_document_url, v_document.storage_path, '') = '' then
      raise exception 'A business permit document is required before this listing can be verified';
    end if;

    insert into public.landlord_permit_renewals (
      landlord_id,
      permit_number,
      permit_year,
      permit_issued_at,
      expires_at,
      document_path,
      document_name,
      status,
      submitted_at
    ) values (
      v_profile.user_id,
      v_profile.permit_number,
      v_current_year,
      coalesce(v_profile.permit_issued_at, current_date),
      coalesce(v_profile.permit_expiry, make_date(v_current_year + 1, 1, 1)::timestamptz),
      coalesce(v_profile.verification_document_url, v_document.storage_path),
      coalesce(v_document.file_name, 'Business Permit'),
      'pending_review',
      now()
    ) returning id::text into v_renewal_id;
  else
    v_renewal_id := v_renewal.id::text;
  end if;

  if coalesce(v_renewal.status, 'pending_review') <> 'approved' then
    -- Some installations do not have the optional permit-review RPC. The
    -- administrator is reviewing the document on this screen, so mark the
    -- selected permit approved directly without depending on that RPC.
    update public.landlord_permit_renewals
    set status = 'approved'
    where id::text = v_renewal_id;
  end if;

  return jsonb_build_object(
    'renewal_id', v_renewal_id,
    'permit_year', v_current_year,
    'status', 'approved'
  );
end;
$$;

grant execute on function public.fn_approve_submitted_business_permit(text) to authenticated;

-- Make the newly created RPC available to the Supabase REST schema cache now.
notify pgrst, 'reload schema';
