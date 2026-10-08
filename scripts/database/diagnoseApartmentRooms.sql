-- AptFindr apartment_rooms: read-only connection and schema diagnostic.
-- Run this first in the Supabase SQL Editor. It does not change schema or data.
--
-- The current frontend requires these columns:
-- id, apartment_id, name, room_type, sqft, max_occupants, rent,
-- has_private_bath, bathroom_type, shared_bath_location, has_ac,
-- is_occupied, status, description, images, created_at.

-- 1) Check every column the current Manage Rooms UI selects or writes.
with required_columns(column_name) as (
  values
    ('id'),
    ('apartment_id'),
    ('name'),
    ('room_type'),
    ('sqft'),
    ('max_occupants'),
    ('rent'),
    ('has_private_bath'),
    ('bathroom_type'),
    ('shared_bath_location'),
    ('has_ac'),
    ('is_occupied'),
    ('status'),
    ('description'),
    ('images'),
    ('created_at')
)
select
  required_columns.column_name,
  columns.data_type,
  columns.udt_name,
  columns.is_nullable,
  columns.column_default,
  case when columns.column_name is null then 'MISSING' else 'OK' end as status
from required_columns
left join information_schema.columns as columns
  on columns.table_schema = 'public'
 and columns.table_name = 'apartment_rooms'
 and columns.column_name = required_columns.column_name
order by required_columns.column_name;

-- 2) Inspect all current columns, including possible legacy duplicates such as price.
select
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'apartment_rooms'
order by ordinal_position;

-- 3) Check price/rent values before considering any later removal of price.
-- The app uses rent. This query identifies rows that would need a backfill.
select
  id,
  apartment_id,
  name,
  price as legacy_price,
  rent as application_rent
from public.apartment_rooms
where price is distinct from rent
order by created_at desc nulls last;

-- 4) Check redundant occupancy data. Both columns are currently required by code.
select
  id,
  apartment_id,
  name,
  status,
  is_occupied
from public.apartment_rooms
where (status = 'occupied') is distinct from is_occupied
order by created_at desc nulls last;

-- 5) Check values that would prevent future validation constraints.
select
  id,
  apartment_id,
  name,
  sqft,
  max_occupants,
  rent,
  status
from public.apartment_rooms
where coalesce(sqft, 0) < 0
   or coalesce(max_occupants, 0) < 1
   or coalesce(rent, 0) < 0
   or status not in ('available', 'occupied', 'maintenance');

-- 6) Confirm apartment foreign key, indexes, RLS, and policies.
select
  constraint_name,
  constraint_type
from information_schema.table_constraints
where table_schema = 'public'
  and table_name = 'apartment_rooms'
order by constraint_type, constraint_name;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'apartment_rooms'
order by indexname;

select
  class.relrowsecurity as rls_enabled,
  class.relforcerowsecurity as rls_forced
from pg_class as class
join pg_namespace as namespace on namespace.oid = class.relnamespace
where namespace.nspname = 'public'
  and class.relname = 'apartment_rooms';

select
  policyname,
  cmd,
  roles,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename = 'apartment_rooms'
order by policyname;

-- 7) Confirm that Manage Rooms realtime updates can be delivered.
select
  pubname as publication_name,
  schemaname,
  tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename = 'apartment_rooms';
