-- One-time repair for landlords who submitted a property before permit values
-- were consistently copied into landlord_profiles. Safe to run in the
-- Supabase SQL Editor; existing profile values are never overwritten.

alter table public.landlord_profiles
  add column if not exists permit_issued_at date;

with latest_property_verification as (
  select distinct on (apartment.landlord_id)
    apartment.landlord_id as user_id,
    nullif(trim(apartment.features -> 'verification' ->> 'businessAccount'), '') as permit_number,
    nullif(trim(apartment.features -> 'verification' ->> 'businessPermit'), '') as business_permit_number,
    case
      when coalesce(nullif(trim(apartment.features -> 'verification' ->> 'issuedAt'), ''), nullif(trim(apartment.features -> 'verification' ->> 'dateIssued'), '')) ~ '^\d{4}-\d{2}-\d{2}$'
        then coalesce(nullif(trim(apartment.features -> 'verification' ->> 'issuedAt'), ''), nullif(trim(apartment.features -> 'verification' ->> 'dateIssued'), ''))::date
      else null
    end as permit_issued_at,
    case
      when nullif(trim(apartment.features -> 'verification' ->> 'permitExpiry'), '') ~ '^\d{4}-\d{2}-\d{2}$'
        then (apartment.features -> 'verification' ->> 'permitExpiry')::date
      else null
    end as permit_expiry
  from public.apartments as apartment
  where apartment.landlord_id is not null
    and apartment.features -> 'verification' ->> 'businessPermit' is not null
  order by apartment.landlord_id, apartment.created_at desc
), latest_permit_document as (
  select distinct on (document.landlord_id)
    document.landlord_id as user_id,
    nullif(trim(document.storage_path), '') as verification_document_url
  from public.apartment_verification_documents as document
  where document.landlord_id is not null
    and document.document_type in ('mayors_business_permit', 'proof_of_ownership')
  order by document.landlord_id, document.updated_at desc nulls last, document.created_at desc
)
insert into public.landlord_profiles (
  user_id,
  permit_number,
  business_permit_number,
  permit_issued_at,
  permit_expiry,
  verification_document_url
)
select
  verification.user_id,
  verification.permit_number,
  verification.business_permit_number,
  verification.permit_issued_at,
  verification.permit_expiry,
  document.verification_document_url
from latest_property_verification as verification
join public.app_users as account
  on account.id = verification.user_id
 and account.role = 'landlord'
left join latest_permit_document as document
  on document.user_id = verification.user_id
on conflict (user_id) do update
set
  permit_number = coalesce(nullif(public.landlord_profiles.permit_number, ''), excluded.permit_number),
  business_permit_number = coalesce(nullif(public.landlord_profiles.business_permit_number, ''), excluded.business_permit_number),
  permit_issued_at = coalesce(public.landlord_profiles.permit_issued_at, excluded.permit_issued_at),
  permit_expiry = coalesce(public.landlord_profiles.permit_expiry, excluded.permit_expiry),
  verification_document_url = coalesce(nullif(public.landlord_profiles.verification_document_url, ''), excluded.verification_document_url)
where public.landlord_profiles.permit_number is null
   or public.landlord_profiles.permit_number = ''
   or public.landlord_profiles.business_permit_number is null
   or public.landlord_profiles.business_permit_number = ''
   or public.landlord_profiles.permit_issued_at is null
   or public.landlord_profiles.permit_expiry is null
   or public.landlord_profiles.verification_document_url is null
   or public.landlord_profiles.verification_document_url = '';

-- Review the repaired rows.
select
  account.name,
  account.email,
  profile.permit_number,
  profile.business_permit_number,
  profile.permit_issued_at,
  profile.permit_expiry,
  profile.verification_document_url
from public.landlord_profiles as profile
join public.app_users as account on account.id = profile.user_id
where account.role = 'landlord'
order by account.created_at;
