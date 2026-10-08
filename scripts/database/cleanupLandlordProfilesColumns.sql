-- Run only after migrateLandlordFacebookUrl.sql in the Supabase SQL Editor.
-- This keeps the landlord_profiles columns confirmed for the current AptFindr
-- flow and permanently removes excluded legacy business-policy fields.
-- It does not delete landlord profile rows or storage documents.

begin;

alter table public.landlord_profiles
  drop column if exists tin_number,
  drop column if exists id_type,
  drop column if exists organization,
  drop column if exists business_type,
  drop column if exists service_areas,
  drop column if exists deposit_months,
  drop column if exists advance_months,
  drop column if exists min_lease_months,
  drop column if exists pet_policy,
  drop column if exists smoking_policy,
  drop column if exists maintenance_response_hours,
  drop column if exists listing_visibility,
  drop column if exists verified_at,
  drop column if exists business_permit_image_path;

commit;
