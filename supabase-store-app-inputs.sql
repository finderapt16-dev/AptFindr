-- Store the fields users fill in the app instead of leaving related columns null.
-- Run this once in Supabase SQL Editor, or rerun safely after the main schema.

alter table public.app_users add column if not exists middle_initial text;
alter table public.app_users add column if not exists address text;

alter table public.landlord_profiles add column if not exists business_name text;
alter table public.landlord_profiles add column if not exists tin_number text;
alter table public.landlord_profiles add column if not exists id_type text;
alter table public.landlord_profiles add column if not exists id_number text;
alter table public.landlord_profiles add column if not exists permit_expiry date;
alter table public.landlord_profiles add column if not exists business_type text;
alter table public.landlord_profiles add column if not exists years_active int;
alter table public.landlord_profiles add column if not exists total_units int;
alter table public.landlord_profiles add column if not exists service_areas text;
alter table public.landlord_profiles add column if not exists deposit_months int;
alter table public.landlord_profiles add column if not exists advance_months int;
alter table public.landlord_profiles add column if not exists min_lease_months int;
alter table public.landlord_profiles add column if not exists pet_policy text;
alter table public.landlord_profiles add column if not exists smoking_policy text;
alter table public.landlord_profiles add column if not exists maintenance_response_hours int;
alter table public.landlord_profiles add column if not exists listing_visibility text;

alter table public.apartment_rooms add column if not exists bathroom_type text;
alter table public.apartment_rooms add column if not exists shared_bath_location text;
alter table public.apartment_rooms add column if not exists has_ac boolean not null default false;

update public.app_users
set
  signup_source = coalesce(nullif(signup_source, ''), 'web'),
  verification_status = coalesce(nullif(verification_status, ''), case when is_verified then 'verified' else 'pending' end),
  landlord_status = case
    when role = 'landlord' then coalesce(nullif(landlord_status, ''), status)
    else landlord_status
  end;
