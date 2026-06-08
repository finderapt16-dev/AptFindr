-- =============================================================================

-- Apartment Finder PWA — FULL SCHEMA (copy & paste into Supabase SQL Editor)

-- =============================================================================

-- HOW TO USE:

--   1. Select ALL text in this file (Ctrl+A)

--   2. Copy (Ctrl+C)

--   3. Supabase Dashboard → SQL Editor → New query → Paste → Run

--

-- Safe to re-run on the same project (idempotent: drops/recreates policies, view, triggers).

--

-- WHAT THE APP STORES IN THE DATABASE

-- -----------------------------------------------------------------------------

-- app_users        Sign up, login, profile, landlord verification, admin users

-- apartments       Listings (landlord create/update/delete, browse, admin)

-- apartment_images Optional gallery per listing

-- apartment_rooms  Optional room breakdown per listing

-- favorites        Saved apartments per user (heart / favorites page)

-- reports          Tenant reports on listings (detail page + admin dashboard)

-- violations       Admin warnings/notices to landlords

-- notifications    Admin/system messages to users

-- signups / logins Audit trail (optional; ready for future auth logging)

-- *_profiles       Role-specific profile extensions (optional; future use)

-- audit_logs       Admin action history (optional; future use)

-- =============================================================================



create extension if not exists pgcrypto;



-- -----------------------------------------------------------------------------

-- Enums

-- -----------------------------------------------------------------------------

do $$ begin

  create type public.app_user_role as enum ('student', 'employee', 'landlord', 'admin');

exception when duplicate_object then null;

end $$;



do $$ begin

  create type public.report_status as enum ('pending', 'resolved', 'dismissed');

exception when duplicate_object then null;

end $$;



do $$ begin

  create type public.report_severity as enum ('low', 'med', 'high');

exception when duplicate_object then null;

end $$;



do $$ begin

  create type public.auth_event_type as enum (

    'sign_up', 'sign_in', 'sign_out', 'password_reset', 'verify_landlord'

  );

exception when duplicate_object then null;

end $$;



do $$ begin

  create type public.violation_mode as enum ('violation', 'notice');

exception when duplicate_object then null;

end $$;



-- -----------------------------------------------------------------------------

-- app_users — authService.ts, dashboardSupabaseService.ts

-- -----------------------------------------------------------------------------

create table if not exists public.app_users (

  id uuid primary key default gen_random_uuid(),

  auth_id uuid unique,

  legacy_id text unique,

  email text not null unique,

  password text,

  name text not null,

  middle_initial text,

  address text,

  role public.app_user_role not null,

  status text not null default 'active',

  mobile text,

  avatar_url text,

  bio text,

  language text not null default 'en',

  timezone text not null default 'Asia/Manila',

  is_verified boolean not null default false,

  verification_status text,

  landlord_status text,

  permit_number text,

  department text,

  admin_level text,

  signup_source text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()

);



alter table public.app_users add column if not exists auth_id uuid;

alter table public.app_users add column if not exists legacy_id text;

alter table public.app_users add column if not exists password text;

alter table public.app_users add column if not exists middle_initial text;

alter table public.app_users add column if not exists address text;

alter table public.app_users add column if not exists status text default 'active';

alter table public.app_users add column if not exists verification_status text;

alter table public.app_users add column if not exists landlord_status text;

alter table public.app_users add column if not exists permit_number text;

alter table public.app_users add column if not exists department text;

alter table public.app_users add column if not exists admin_level text;

alter table public.app_users add column if not exists signup_source text;



create unique index if not exists app_users_legacy_id_key on public.app_users (legacy_id) where legacy_id is not null;



create index if not exists idx_app_users_role on public.app_users (role);

create index if not exists idx_app_users_email on public.app_users (email);

create index if not exists idx_app_users_status on public.app_users (status);

create index if not exists idx_app_users_legacy on public.app_users (legacy_id);



-- -----------------------------------------------------------------------------

-- Auth audit (optional)

-- -----------------------------------------------------------------------------

create table if not exists public.signups (

  id uuid primary key default gen_random_uuid(),

  user_id uuid references public.app_users (id) on delete cascade,

  auth_id uuid,

  email text,

  role public.app_user_role,

  source text,

  metadata jsonb default '{}'::jsonb,

  created_at timestamptz not null default now()

);



create table if not exists public.logins (

  id uuid primary key default gen_random_uuid(),

  user_id uuid references public.app_users (id) on delete cascade,

  auth_id uuid,

  event public.auth_event_type not null,

  success boolean not null default true,

  user_agent text,

  ip text,

  metadata jsonb default '{}'::jsonb,

  created_at timestamptz not null default now()

);



-- -----------------------------------------------------------------------------

-- Role profiles (optional)

-- -----------------------------------------------------------------------------

create table if not exists public.student_profiles (

  user_id uuid primary key references public.app_users (id) on delete cascade,

  school text,

  guardian_name text,

  guardian_address text,

  guardian_contact text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()

);



create table if not exists public.employee_profiles (

  user_id uuid primary key references public.app_users (id) on delete cascade,

  company text,

  work_address text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()

);



create table if not exists public.landlord_profiles (

  user_id uuid primary key references public.app_users (id) on delete cascade,

  permit_number text,

  business_permit_number text,

  verified_at timestamptz,

  verification_document_url text,

  is_verified boolean not null default false,

  organization text,

  business_name text,

  tin_number text,

  id_type text,

  id_number text,

  permit_expiry date,

  business_type text,

  years_active int,

  total_units int,

  service_areas text,

  deposit_months int,

  advance_months int,

  min_lease_months int,

  pet_policy text,

  smoking_policy text,

  maintenance_response_hours int,

  listing_visibility text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()

);

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



create table if not exists public.admin_profiles (

  user_id uuid primary key references public.app_users (id) on delete cascade,

  admin_level text,

  department text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()

);



-- -----------------------------------------------------------------------------

-- apartments — apartmentsService.ts, dashboardSupabaseService.ts

-- -----------------------------------------------------------------------------

create table if not exists public.apartments (

  id uuid primary key default gen_random_uuid(),

  legacy_id text unique,

  landlord_id uuid not null references public.app_users (id) on delete cascade,

  title text not null,

  description text,

  price numeric(12, 2) not null default 0,

  bedrooms int not null default 0,

  bathrooms int not null default 0,

  sqft int,

  address text,

  city text,

  state text,

  zip text,

  lat double precision,

  lng double precision,

  pet_friendly boolean not null default false,

  parking boolean not null default false,

  furnished boolean not null default false,

  utilities text[] default array[]::text[],

  amenities text[] default array[]::text[],

  features jsonb not null default '{}'::jsonb,

  is_published boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()

);



alter table public.apartments add column if not exists legacy_id text;

alter table public.apartments alter column features set default '{}'::jsonb;



create unique index if not exists apartments_legacy_id_key on public.apartments (legacy_id) where legacy_id is not null;



create index if not exists idx_apartments_landlord on public.apartments (landlord_id);

create index if not exists idx_apartments_city on public.apartments (city);

create index if not exists idx_apartments_published on public.apartments (is_published);

create index if not exists idx_apartments_legacy on public.apartments (legacy_id);



create table if not exists public.apartment_images (

  id uuid primary key default gen_random_uuid(),

  apartment_id uuid not null references public.apartments (id) on delete cascade,

  url text not null,

  caption text,

  is_primary boolean not null default false,

  sort_order int not null default 0,

  created_at timestamptz not null default now()

);



create index if not exists idx_apartment_images_apartment on public.apartment_images (apartment_id);



create table if not exists public.apartment_rooms (

  id uuid primary key default gen_random_uuid(),

  apartment_id uuid not null references public.apartments (id) on delete cascade,

  room_type text,

  sqft int,

  max_occupants int not null default 1,

  rent numeric(12, 2) not null default 0,

  has_private_bath boolean not null default false,

  bathroom_type text,

  shared_bath_location text,

  has_ac boolean not null default false,

  is_occupied boolean not null default false,

  created_at timestamptz not null default now()

);

alter table public.apartment_rooms add column if not exists bathroom_type text;
alter table public.apartment_rooms add column if not exists shared_bath_location text;
alter table public.apartment_rooms add column if not exists has_ac boolean not null default false;



create index if not exists idx_apartment_rooms_apartment on public.apartment_rooms (apartment_id);



-- -----------------------------------------------------------------------------

-- favorites — apartmentsService.ts (expects column "id")

-- -----------------------------------------------------------------------------

create table if not exists public.favorites (

  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.app_users (id) on delete cascade,

  apartment_id uuid not null references public.apartments (id) on delete cascade,

  created_at timestamptz not null default now(),

  unique (user_id, apartment_id)

);



-- Upgrade old favorites table that only had composite PK (no id column)

do $$

begin

  if exists (

    select 1 from information_schema.tables

    where table_schema = 'public' and table_name = 'favorites'

  ) and not exists (

    select 1 from information_schema.columns

    where table_schema = 'public' and table_name = 'favorites' and column_name = 'id'

  ) then

    alter table public.favorites add column id uuid default gen_random_uuid();

    update public.favorites set id = gen_random_uuid() where id is null;

    alter table public.favorites alter column id set not null;

    alter table public.favorites drop constraint if exists favorites_pkey;

    alter table public.favorites add primary key (id);

    begin

      alter table public.favorites

        add constraint favorites_user_apartment_unique unique (user_id, apartment_id);

    exception

      when duplicate_object then null;

    end;

  end if;

end $$;



create index if not exists idx_favorites_user on public.favorites (user_id);

create index if not exists idx_favorites_apartment on public.favorites (apartment_id);



-- -----------------------------------------------------------------------------

-- reports — apartmentsService.ts + dashboardSupabaseService.ts

-- -----------------------------------------------------------------------------

create table if not exists public.reports (

  id uuid primary key default gen_random_uuid(),

  reporter_id uuid references public.app_users (id) on delete set null,

  user_id uuid references public.app_users (id) on delete set null,

  apartment_id uuid references public.apartments (id) on delete set null,

  reporter_role text,

  issue_type text,

  reason text,

  tags text[] default array[]::text[],

  details text,

  contact text,

  severity public.report_severity not null default 'med',

  submitted_at timestamptz not null default now(),

  status public.report_status not null default 'pending',

  resolved_at timestamptz,

  created_at timestamptz not null default now()

);



alter table public.reports add column if not exists user_id uuid references public.app_users (id) on delete set null;

alter table public.reports add column if not exists reason text;

alter table public.reports add column if not exists issue_type text;

alter table public.reports add column if not exists reporter_role text;

alter table public.reports add column if not exists tags text[] default array[]::text[];

alter table public.reports add column if not exists contact text;

alter table public.reports add column if not exists resolved_at timestamptz;



do $$

begin

  if exists (

    select 1 from information_schema.columns

    where table_schema = 'public'

      and table_name = 'reports'

      and column_name = 'reporter_role'

      and udt_name = 'app_user_role'

  ) then

    alter table public.reports alter column reporter_role type text using reporter_role::text;

  end if;

end $$;



create index if not exists idx_reports_apartment on public.reports (apartment_id);

create index if not exists idx_reports_status on public.reports (status);

create index if not exists idx_reports_reporter on public.reports (reporter_id);

create index if not exists idx_reports_user on public.reports (user_id);



-- -----------------------------------------------------------------------------

-- violations — dashboardSupabaseService.ts

-- -----------------------------------------------------------------------------

create table if not exists public.violations (

  id uuid primary key default gen_random_uuid(),

  landlord_id uuid not null references public.app_users (id) on delete cascade,

  admin_id uuid references public.app_users (id) on delete set null,

  mode public.violation_mode not null default 'violation',

  type text,

  message text,

  issued_at timestamptz not null default now(),

  expires_at timestamptz,

  related_report_id uuid references public.reports (id) on delete set null,

  active boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()

);



create index if not exists idx_violations_landlord on public.violations (landlord_id);

create index if not exists idx_violations_active on public.violations (active);



-- -----------------------------------------------------------------------------

-- notifications — dashboardSupabaseService.ts

-- -----------------------------------------------------------------------------

create table if not exists public.notifications (

  id uuid primary key default gen_random_uuid(),

  user_id uuid references public.app_users (id) on delete cascade,

  type text not null default 'info',

  title text,

  message text,

  payload jsonb default '{}'::jsonb,

  read boolean not null default false,

  created_at timestamptz not null default now()

);



do $$

begin

  if exists (

    select 1 from information_schema.columns

    where table_schema = 'public'

      and table_name = 'notifications'

      and column_name = 'type'

      and udt_name = 'notification_type'

  ) then

    alter table public.notifications alter column type type text using type::text;

  end if;

end $$;



create index if not exists idx_notifications_user on public.notifications (user_id);

create index if not exists idx_notifications_read on public.notifications (read);



-- -----------------------------------------------------------------------------

-- audit_logs (optional)

-- -----------------------------------------------------------------------------

create table if not exists public.audit_logs (

  id uuid primary key default gen_random_uuid(),

  admin_id uuid references public.app_users (id) on delete set null,

  action text not null,

  target_type text,

  target_id uuid,

  details jsonb default '{}'::jsonb,

  created_at timestamptz not null default now()

);



create index if not exists idx_audit_logs_admin on public.audit_logs (admin_id);



-- -----------------------------------------------------------------------------

-- Trigger functions (search_path set — clears Security Advisor warnings)

-- -----------------------------------------------------------------------------

create or replace function public.sync_report_fields()

returns trigger

language plpgsql

security invoker

set search_path = public

as $$

begin

  if new.user_id is null and new.reporter_id is not null then

    new.user_id := new.reporter_id;

  end if;

  if new.reporter_id is null and new.user_id is not null then

    new.reporter_id := new.user_id;

  end if;

  if new.reason is null and new.issue_type is not null then

    new.reason := new.issue_type;

  end if;

  if new.issue_type is null and new.reason is not null then

    new.issue_type := new.reason;

  end if;

  return new;

end;

$$;



create or replace function public.app_set_timestamp()

returns trigger

language plpgsql

security invoker

set search_path = public

as $$

begin

  new.updated_at = now();

  return new;

end;

$$;



-- Legacy name used by some older triggers / migrations

create or replace function public.trigger_set_timestamp()

returns trigger

language plpgsql

security invoker

set search_path = public

as $$

begin

  new.updated_at = now();

  return new;

end;

$$;



drop trigger if exists trg_reports_sync_fields on public.reports;

create trigger trg_reports_sync_fields

  before insert or update on public.reports

  for each row execute function public.sync_report_fields();



drop trigger if exists trg_app_users_updated_at on public.app_users;

create trigger trg_app_users_updated_at

  before update on public.app_users

  for each row execute function public.app_set_timestamp();



drop trigger if exists trg_student_profiles_updated_at on public.student_profiles;

create trigger trg_student_profiles_updated_at

  before update on public.student_profiles

  for each row execute function public.app_set_timestamp();



drop trigger if exists trg_employee_profiles_updated_at on public.employee_profiles;

create trigger trg_employee_profiles_updated_at

  before update on public.employee_profiles

  for each row execute function public.app_set_timestamp();



drop trigger if exists trg_landlord_profiles_updated_at on public.landlord_profiles;

create trigger trg_landlord_profiles_updated_at

  before update on public.landlord_profiles

  for each row execute function public.app_set_timestamp();



drop trigger if exists trg_admin_profiles_updated_at on public.admin_profiles;

create trigger trg_admin_profiles_updated_at

  before update on public.admin_profiles

  for each row execute function public.app_set_timestamp();



drop trigger if exists trg_apartments_updated_at on public.apartments;

create trigger trg_apartments_updated_at

  before update on public.apartments

  for each row execute function public.app_set_timestamp();



drop trigger if exists trg_violations_updated_at on public.violations;

create trigger trg_violations_updated_at

  before update on public.violations

  for each row execute function public.app_set_timestamp();



-- -----------------------------------------------------------------------------

-- Helper view

-- -----------------------------------------------------------------------------

drop view if exists public.vw_app_users_by_role;



create view public.vw_app_users_by_role

with (security_invoker = true) as

select

  u.id,

  u.email,

  u.name,

  u.role,

  u.status,

  u.mobile,

  u.is_verified,

  u.permit_number,

  u.created_at,

  u.updated_at

from public.app_users u;



-- -----------------------------------------------------------------------------

-- Row Level Security (development — anon key can read/write)

-- Tighten before production. Security Advisor will warn on using (true).

-- -----------------------------------------------------------------------------

alter table public.app_users enable row level security;

alter table public.apartments enable row level security;

alter table public.apartment_images enable row level security;

alter table public.apartment_rooms enable row level security;

alter table public.favorites enable row level security;

alter table public.reports enable row level security;

alter table public.violations enable row level security;

alter table public.notifications enable row level security;

alter table public.signups enable row level security;

alter table public.logins enable row level security;

alter table public.student_profiles enable row level security;

alter table public.employee_profiles enable row level security;

alter table public.landlord_profiles enable row level security;

alter table public.admin_profiles enable row level security;

alter table public.audit_logs enable row level security;



drop policy if exists "dev_app_users_select" on public.app_users;

drop policy if exists "dev_app_users_insert" on public.app_users;

drop policy if exists "dev_app_users_update" on public.app_users;

drop policy if exists "dev_app_users_delete" on public.app_users;

create policy "dev_app_users_select" on public.app_users for select to anon, authenticated using (true);

create policy "dev_app_users_insert" on public.app_users for insert to anon, authenticated with check (true);

create policy "dev_app_users_update" on public.app_users for update to anon, authenticated using (true) with check (true);

create policy "dev_app_users_delete" on public.app_users for delete to anon, authenticated using (true);



drop policy if exists "dev_apartments_all" on public.apartments;

create policy "dev_apartments_all" on public.apartments for all to anon, authenticated using (true) with check (true);



drop policy if exists "dev_apartment_images_all" on public.apartment_images;

create policy "dev_apartment_images_all" on public.apartment_images for all to anon, authenticated using (true) with check (true);



drop policy if exists "dev_apartment_rooms_all" on public.apartment_rooms;

create policy "dev_apartment_rooms_all" on public.apartment_rooms for all to anon, authenticated using (true) with check (true);



drop policy if exists "dev_favorites_all" on public.favorites;

create policy "dev_favorites_all" on public.favorites for all to anon, authenticated using (true) with check (true);



drop policy if exists "dev_reports_all" on public.reports;

create policy "dev_reports_all" on public.reports for all to anon, authenticated using (true) with check (true);



drop policy if exists "dev_violations_all" on public.violations;

create policy "dev_violations_all" on public.violations for all to anon, authenticated using (true) with check (true);



drop policy if exists "dev_notifications_all" on public.notifications;

create policy "dev_notifications_all" on public.notifications for all to anon, authenticated using (true) with check (true);



drop policy if exists "dev_signups_all" on public.signups;

create policy "dev_signups_all" on public.signups for all to anon, authenticated using (true) with check (true);



drop policy if exists "dev_logins_all" on public.logins;

create policy "dev_logins_all" on public.logins for all to anon, authenticated using (true) with check (true);



drop policy if exists "dev_student_profiles_all" on public.student_profiles;

create policy "dev_student_profiles_all" on public.student_profiles for all to anon, authenticated using (true) with check (true);



drop policy if exists "dev_employee_profiles_all" on public.employee_profiles;

create policy "dev_employee_profiles_all" on public.employee_profiles for all to anon, authenticated using (true) with check (true);



drop policy if exists "dev_landlord_profiles_all" on public.landlord_profiles;

create policy "dev_landlord_profiles_all" on public.landlord_profiles for all to anon, authenticated using (true) with check (true);



drop policy if exists "dev_admin_profiles_all" on public.admin_profiles;

create policy "dev_admin_profiles_all" on public.admin_profiles for all to anon, authenticated using (true) with check (true);



drop policy if exists "dev_audit_logs_all" on public.audit_logs;

create policy "dev_audit_logs_all" on public.audit_logs for all to anon, authenticated using (true) with check (true);



-- -----------------------------------------------------------------------------

-- Grants (required so the app anon key can access tables)

-- -----------------------------------------------------------------------------

grant usage on schema public to postgres, anon, authenticated, service_role;



grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

grant execute on all functions in schema public to anon, authenticated, service_role;



alter default privileges in schema public

  grant select, insert, update, delete on tables to anon, authenticated, service_role;

alter default privileges in schema public

  grant usage, select on sequences to anon, authenticated, service_role;

alter default privileges in schema public

  grant execute on functions to anon, authenticated, service_role;



-- Supabase template helper — not for browser/anon RPC (clears 2 Security Advisor warnings)

do $$

begin

  if exists (

    select 1

    from pg_proc p

    join pg_namespace n on n.oid = p.pronamespace

    where n.nspname = 'public'

      and p.proname = 'rls_auto_enable'

      and pg_get_function_identity_arguments(p.oid) = ''

  ) then

    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

    grant execute on function public.rls_auto_enable() to service_role;

  end if;

end $$;



-- -----------------------------------------------------------------------------

-- Optional seed accounts (comment out if you do not want test data)

-- -----------------------------------------------------------------------------

insert into public.app_users (email, password, name, role, status, is_verified, permit_number)

values

  ('admin@test.com', 'admin123', 'Admin User', 'admin', 'active', true, null),

  ('landlord@test.com', 'password123', 'Test Landlord', 'landlord', 'pending', false, 'BPN-2024-001234')

on conflict (email) do update set

  password = excluded.password,

  name = excluded.name,

  role = excluded.role,

  status = excluded.status,

  is_verified = excluded.is_verified,

  permit_number = excluded.permit_number;



-- =============================================================================

-- Done. Table Editor: app_users, apartments, favorites, reports, …

-- Re-run is safe. RLS "always true" warnings are expected for dev policies.

-- =============================================================================

