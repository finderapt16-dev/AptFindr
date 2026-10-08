-- Read-only diagnostic for the FINAL landlord_profiles structure.
-- Safe to run in Supabase SQL Editor. This script does not alter any schema or data.
--
-- Expected retained columns only:
-- user_id, permit_number, business_permit_number, permit_expiry,
-- verification_document_url, id_document_url, is_verified, business_name,
-- id_number, years_active, total_units, facebook_url, created_at, updated_at

-- 1) Confirm that each retained column exists and inspect its database type.
with expected_columns(column_name, expected_position) as (
  values
    ('user_id', 1),
    ('permit_number', 2),
    ('business_permit_number', 3),
    ('permit_expiry', 4),
    ('verification_document_url', 5),
    ('id_document_url', 6),
    ('is_verified', 7),
    ('business_name', 8),
    ('id_number', 9),
    ('years_active', 10),
    ('total_units', 11),
    ('facebook_url', 12),
    ('created_at', 13),
    ('updated_at', 14)
)
select
  expected.expected_position,
  expected.column_name,
  columns.data_type,
  columns.udt_name,
  columns.is_nullable,
  columns.column_default,
  case when columns.column_name is null then 'MISSING' else 'OK' end as status
from expected_columns as expected
left join information_schema.columns as columns
  on columns.table_schema = 'public'
 and columns.table_name = 'landlord_profiles'
 and columns.column_name = expected.column_name
order by expected.expected_position;

-- 2) Show only the final retained columns as they are currently ordered in the table.
select
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'landlord_profiles'
  and column_name in (
    'user_id',
    'permit_number',
    'business_permit_number',
    'permit_expiry',
    'verification_document_url',
    'id_document_url',
    'is_verified',
    'business_name',
    'id_number',
    'years_active',
    'total_units',
    'facebook_url',
    'created_at',
    'updated_at'
  )
order by ordinal_position;

-- 3) Profile/data health for landlord accounts. No confidential values are returned.
select
  count(*) filter (where app_user.role = 'landlord') as landlord_users,
  count(profile.user_id) as landlord_profiles,
  count(*) filter (where app_user.role = 'landlord' and profile.user_id is null) as landlords_missing_profile,
  count(*) filter (where profile.user_id is not null and profile.is_verified is true) as verified_profiles,
  count(*) filter (where profile.user_id is not null and nullif(trim(profile.facebook_url), '') is not null) as profiles_with_facebook_url,
  count(*) filter (where profile.user_id is not null and nullif(trim(profile.verification_document_url), '') is not null) as profiles_with_permit_document
from public.app_users as app_user
left join public.landlord_profiles as profile
  on profile.user_id = app_user.id;

-- 4) Landlord users that have no profile row. These accounts cannot save/fetch profile details correctly.
select
  app_user.id as user_id,
  app_user.auth_id,
  app_user.name,
  app_user.email,
  app_user.created_at
from public.app_users as app_user
left join public.landlord_profiles as profile
  on profile.user_id = app_user.id
where app_user.role = 'landlord'
  and profile.user_id is null
order by app_user.created_at desc;

-- 5) Duplicate rows would make .maybeSingle() fail. This should return zero rows.
select
  user_id,
  count(*) as profile_count
from public.landlord_profiles
group by user_id
having count(*) > 1;

-- 6) RLS status and policies: send this output if Settings cannot fetch or save.
select
  class.relrowsecurity as rls_enabled,
  class.relforcerowsecurity as rls_forced
from pg_class as class
join pg_namespace as namespace on namespace.oid = class.relnamespace
where namespace.nspname = 'public'
  and class.relname = 'landlord_profiles';

select
  policyname,
  cmd,
  roles,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename = 'landlord_profiles'
order by policyname;

-- 7) Constraints and indexes used for profile fetching/upserting.
select
  constraint_name,
  constraint_type
from information_schema.table_constraints
where table_schema = 'public'
  and table_name = 'landlord_profiles'
order by constraint_type, constraint_name;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'landlord_profiles'
order by indexname;
