-- =============================================================================
-- APARTMENT FINDER PWA — COMPLETE DATABASE MIGRATION (MASTER FILE)
-- =============================================================================
-- This file contains ALL database migrations for the Apartment Finder PWA.
-- It is idempotent (safe to re-run) and organized in logical execution order.
--
-- HOW TO USE:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Copy and paste this ENTIRE file
--   3. Click "Run" to execute all migrations
--   4. Safe to re-run on existing projects
--
-- WHAT THIS CREATES:
--   - Complete database schema for all features
--   - User roles and profile tables
--   - Apartment listings with images and rooms
--   - Storage bucket for apartment images
--   - Reporting system with evidence tracking
--   - Violations and appeals management
--   - Notifications system with soft delete
--   - Audit trails and auto-triggers
--   - Row Level Security policies
--
-- EXECUTION TIME: ~5-10 seconds
-- =============================================================================

-- SECTION 1: MAIN SCHEMA & CORE TABLES
-- =============================================================================

create extension if not exists pgcrypto;

-- Enums
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

do $$ begin
  create type public.appeal_status as enum ('pending', 'under_review', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

-- app_users table
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
  preferences jsonb not null default '{}'::jsonb,
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
alter table public.app_users add column if not exists preferences jsonb not null default '{}'::jsonb;

create unique index if not exists app_users_legacy_id_key on public.app_users (legacy_id) where legacy_id is not null;
create index if not exists idx_app_users_role on public.app_users (role);
create index if not exists idx_app_users_email on public.app_users (email);
create index if not exists idx_app_users_status on public.app_users (status);
create index if not exists idx_app_users_legacy on public.app_users (legacy_id);

-- Auth audit tables
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

-- Role-specific profiles
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

-- Apartments
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
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.apartments add column if not exists legacy_id text;
alter table public.apartments add column if not exists status text not null default 'available';
alter table public.apartments alter column features set default '{}'::jsonb;
alter table public.apartments drop constraint if exists apartments_status_check;
alter table public.apartments add constraint apartments_status_check check (status in ('available', 'occupied', 'reserved', 'maintenance'));

create unique index if not exists apartments_legacy_id_key on public.apartments (legacy_id) where legacy_id is not null;
create index if not exists idx_apartments_landlord on public.apartments (landlord_id);
create index if not exists idx_apartments_city on public.apartments (city);
create index if not exists idx_apartments_published on public.apartments (is_published);
create index if not exists idx_apartments_status on public.apartments (status);
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
  name text,
  room_type text,
  sqft int,
  max_occupants int not null default 1,
  price numeric(12, 2) not null default 0,
  has_private_bath boolean not null default false,
  bathroom_type text,
  shared_bath_location text,
  has_ac boolean not null default false,
  is_occupied boolean not null default false,
  status text not null default 'available',
  description text,
  images text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.apartment_rooms add column if not exists name text;
alter table public.apartment_rooms add column if not exists bathroom_type text;
alter table public.apartment_rooms add column if not exists shared_bath_location text;
alter table public.apartment_rooms add column if not exists has_ac boolean not null default false;
alter table public.apartment_rooms add column if not exists status text not null default 'available';
alter table public.apartment_rooms add column if not exists description text;
alter table public.apartment_rooms add column if not exists images text[] not null default '{}';
alter table public.apartment_rooms add column if not exists created_at timestamptz not null default now();
alter table public.apartment_rooms drop constraint if exists apartment_rooms_status_check;
alter table public.apartment_rooms add constraint apartment_rooms_status_check check (status in ('available', 'occupied', 'reserved', 'maintenance'));

create index if not exists idx_apartment_rooms_apartment on public.apartment_rooms (apartment_id);
create index if not exists idx_apartment_rooms_status on public.apartment_rooms (status);

-- Apartment views (tracking)
create table if not exists public.apartment_views (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  viewer_id uuid references public.app_users (id) on delete set null,
  view_count integer not null default 1,
  viewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  viewer_role text,
  view_date date not null default ((now() at time zone 'Asia/Manila')::date)
);

alter table public.apartment_views add column if not exists viewer_role text;
alter table public.apartment_views add column if not exists view_date date;
update public.apartment_views
set view_date = (viewed_at at time zone 'Asia/Manila')::date
where view_date is null;
update public.apartment_views views
set viewer_role = users.role
from public.app_users users
where views.viewer_id = users.id and views.viewer_role is null;
alter table public.apartment_views alter column view_date set default ((now() at time zone 'Asia/Manila')::date);
alter table public.apartment_views alter column view_date set not null;
alter table public.apartment_views drop constraint if exists apartment_views_apartment_id_viewer_id_key;
drop index if exists public.apartment_views_one_per_user_per_day;

create index if not exists idx_apartment_views_apartment on public.apartment_views (apartment_id);
create index if not exists idx_apartment_views_viewer on public.apartment_views (viewer_id);
create index if not exists idx_apartment_views_viewed_at on public.apartment_views (viewed_at);
create index if not exists idx_apartment_views_view_date on public.apartment_views (view_date);

insert into storage.buckets (id, name, public)
values ('apartment-images', 'apartment-images', true)
on conflict (id) do update set public = true;

-- Favorites
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, apartment_id)
);

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

-- Reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.app_users (id) on delete set null,
  user_id uuid references public.app_users (id) on delete set null,
  apartment_id uuid references public.apartments (id) on delete set null,
  reporter_role text,
  issue_type text,
  reason text,
  category text,
  tags text[] default array[]::text[],
  details text,
  contact text,
  date_of_incident date,
  severity public.report_severity not null default 'med',
  submitted_at timestamptz not null default now(),
  status public.report_status not null default 'pending',
  resolved_at timestamptz,
  landlord_id uuid references public.app_users (id) on delete set null,
  has_evidence boolean not null default false,
  evidence_count integer default 0,
  last_action_at timestamptz default now(),
  reviewed_by uuid references public.app_users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reports add column if not exists user_id uuid references public.app_users (id) on delete set null;
alter table public.reports add column if not exists reason text;
alter table public.reports add column if not exists issue_type text;
alter table public.reports add column if not exists reporter_role text;
alter table public.reports add column if not exists tags text[] default array[]::text[];
alter table public.reports add column if not exists contact text;
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists category text;
alter table public.reports add column if not exists date_of_incident date;
alter table public.reports add column if not exists landlord_id uuid references public.app_users (id) on delete set null;
alter table public.reports add column if not exists has_evidence boolean not null default false;
alter table public.reports add column if not exists evidence_count integer default 0;
alter table public.reports add column if not exists last_action_at timestamptz default now();
alter table public.reports add column if not exists reviewed_by uuid references public.app_users (id) on delete set null;
alter table public.reports add column if not exists reviewed_at timestamptz;

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
create index if not exists idx_reports_category on public.reports (category);
create index if not exists idx_reports_landlord on public.reports (landlord_id);
create index if not exists idx_reports_has_evidence on public.reports (has_evidence);
create index if not exists idx_reports_last_action_at on public.reports (last_action_at);
create index if not exists idx_reports_reviewed_by on public.reports (reviewed_by);

-- Violations
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
  apartment_id uuid references public.apartments (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.violations add column if not exists apartment_id uuid;

create index if not exists idx_violations_landlord on public.violations (landlord_id);
create index if not exists idx_violations_active on public.violations (active);
create index if not exists idx_violations_apartment on public.violations (apartment_id);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users (id) on delete cascade,
  type text not null default 'info',
  title text,
  message text,
  payload jsonb default '{}'::jsonb,
  read boolean not null default false,
  is_deleted boolean not null default false,
  deleted_at timestamptz default null,
  action_url text,
  action_target_id uuid,
  action_target_type text,
  read_at timestamptz,
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

alter table public.notifications add column if not exists is_deleted boolean not null default false;
alter table public.notifications add column if not exists deleted_at timestamptz default null;
alter table public.notifications add column if not exists action_url text;
alter table public.notifications add column if not exists action_target_id uuid;
alter table public.notifications add column if not exists action_target_type text;
alter table public.notifications add column if not exists read_at timestamptz;

create index if not exists idx_notifications_user on public.notifications (user_id);
create index if not exists idx_notifications_read on public.notifications (read);
create index if not exists idx_notifications_deleted on public.notifications (is_deleted);
create index if not exists idx_notifications_user_deleted on public.notifications (user_id, is_deleted);

-- SECTION 2: REPORT EVIDENCE SYSTEM
-- =============================================================================

create table if not exists public.report_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text not null,
  mime_type text,
  file_size integer,
  uploaded_by uuid references public.app_users (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_report_evidence_report on public.report_evidence (report_id);
create index if not exists idx_report_evidence_uploaded_by on public.report_evidence (uploaded_by);

create table if not exists public.report_audit_log (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  admin_id uuid references public.app_users (id) on delete set null,
  action text not null,
  description text,
  changes jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_report_audit_log_report on public.report_audit_log (report_id);
create index if not exists idx_report_audit_log_admin on public.report_audit_log (admin_id);
create index if not exists idx_report_audit_log_created_at on public.report_audit_log (created_at);

create table if not exists public.report_responses (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  respondent_id uuid not null references public.app_users (id) on delete cascade,
  response_text text not null,
  response_type text not null default 'appeal',
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.app_users (id) on delete set null,
  reviewed_at timestamptz,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_report_responses_report on public.report_responses (report_id);
create index if not exists idx_report_responses_respondent on public.report_responses (respondent_id);

create table if not exists public.report_duplicate_check (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.app_users (id) on delete cascade,
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  issue_type text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(reporter_id, apartment_id, issue_type)
);

create index if not exists idx_report_duplicate_check_reporter on public.report_duplicate_check (reporter_id);
create index if not exists idx_report_duplicate_check_apartment on public.report_duplicate_check (apartment_id);

-- SECTION 3: APPEALS
-- =============================================================================

create table if not exists public.appeals (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.app_users (id) on delete cascade,
  report_id uuid references public.reports (id) on delete set null,
  violation_id uuid references public.violations (id) on delete set null,
  reason text not null,
  description text,
  supporting_docs jsonb default '[]'::jsonb,
  status public.appeal_status not null default 'pending',
  admin_response text,
  admin_id uuid references public.app_users (id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appeals_landlord on public.appeals (landlord_id);
create index if not exists idx_appeals_report on public.appeals (report_id);
create index if not exists idx_appeals_violation on public.appeals (violation_id);
create index if not exists idx_appeals_status on public.appeals (status);

-- Audit logs
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

-- SECTION 4: TRIGGER FUNCTIONS
-- =============================================================================

-- Core timestamp update function
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

-- Legacy name compatibility
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

-- Sync report field duplicates
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

-- Create audit log on report insert
create or replace function public.create_report_audit_on_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.report_audit_log (report_id, action, description)
  values (new.id, 'submitted', 'Report submitted by ' || coalesce(new.reporter_role, 'user'));
  return new;
end;
$$;

-- Update duplicate check on report
create or replace function public.update_duplicate_check_on_report()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.report_duplicate_check (reporter_id, apartment_id, issue_type)
  values (new.reporter_id, new.apartment_id, new.category)
  on conflict do nothing;
  return new;
end;
$$;

-- Notify landlord on report
create or replace function public.fn_notify_landlord_on_report()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_landlord_id uuid;
  v_apartment_title text;
begin
  select landlord_id, title into v_landlord_id, v_apartment_title
  from public.apartments
  where id = new.apartment_id;

  if v_landlord_id is not null then
    insert into public.notifications (
      user_id, type, title, message, payload
    ) values (
      v_landlord_id,
      'property_reported',
      'Property Report Filed',
      'Your listing "' || coalesce(v_apartment_title, 'Property') || '" has been reported',
      jsonb_build_object(
        'report_id', new.id, 'apartment_id', new.apartment_id,
        'apartment_title', v_apartment_title, 'reason', new.reason,
        'severity', new.severity, 'issue_type', new.issue_type
      )
    );
  end if;
  return new;
end;
$$;

-- Notify landlord on violation
create or replace function public.fn_notify_landlord_on_violation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.notifications (
    user_id, type, title, message, payload
  ) values (
    new.landlord_id,
    'violation_issued',
    'Account Notice: ' || coalesce(new.type, 'Violation'),
    new.message,
    jsonb_build_object(
      'violation_id', new.id, 'mode', new.mode, 'type', new.type,
      'expires_at', new.expires_at, 'related_report_id', new.related_report_id
    )
  );
  return new;
end;
$$;

-- Notify admin on appeal
create or replace function public.fn_notify_admin_on_appeal()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_admin_ids uuid[];
  v_admin_id uuid;
  v_landlord_name text;
begin
  select name into v_landlord_name from public.app_users where id = new.landlord_id;
  select array_agg(id) into v_admin_ids from public.app_users where role = 'admin';

  if v_admin_ids is not null and array_length(v_admin_ids, 1) > 0 then
    foreach v_admin_id in array v_admin_ids loop
      insert into public.notifications (
        user_id, type, title, message, payload
      ) values (
        v_admin_id,
        'appeal_submitted',
        'New Appeal Submitted',
        'Landlord ' || coalesce(v_landlord_name, 'Unknown') || ' submitted an appeal',
        jsonb_build_object(
          'appeal_id', new.id, 'landlord_id', new.landlord_id,
          'landlord_name', v_landlord_name, 'report_id', new.report_id,
          'violation_id', new.violation_id, 'reason', new.reason
        )
      );
    end loop;
  end if;
  return new;
end;
$$;

-- Notify landlord on appeal status change
create or replace function public.fn_notify_landlord_on_appeal_status()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status_messages text;
begin
  if old.status != new.status then
    case new.status
      when 'under_review' then v_status_messages := 'Your appeal is now under review by our team.';
      when 'approved' then v_status_messages := 'Good news! Your appeal has been approved.';
      when 'rejected' then v_status_messages := 'Your appeal has been reviewed and rejected.';
      else v_status_messages := 'Your appeal status has been updated.';
    end case;

    insert into public.notifications (
      user_id, type, title, message, payload
    ) values (
      new.landlord_id,
      'appeal_status_updated',
      'Appeal Status Updated',
      v_status_messages,
      jsonb_build_object(
        'appeal_id', new.id, 'status', new.status,
        'admin_response', new.admin_response, 'reviewed_at', new.reviewed_at
      )
    );
  end if;
  return new;
end;
$$;

-- Notification read timestamp
create or replace function public.fn_notification_read_timestamp()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.read = true and old.read = false then
    new.read_at := now();
  elsif new.read = false then
    new.read_at := null;
  end if;
  return new;
end;
$$;

-- Attach all triggers
drop trigger if exists trg_reports_sync_fields on public.reports;
create trigger trg_reports_sync_fields before insert or update on public.reports for each row execute function public.sync_report_fields();

drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at before update on public.app_users for each row execute function public.app_set_timestamp();

drop trigger if exists trg_apartments_updated_at on public.apartments;
create trigger trg_apartments_updated_at before update on public.apartments for each row execute function public.app_set_timestamp();

drop trigger if exists trg_violations_updated_at on public.violations;
create trigger trg_violations_updated_at before update on public.violations for each row execute function public.app_set_timestamp();

drop trigger if exists trg_appeals_updated_at on public.appeals;
create trigger trg_appeals_updated_at before update on public.appeals for each row execute function public.app_set_timestamp();

drop trigger if exists trg_student_profiles_updated_at on public.student_profiles;
create trigger trg_student_profiles_updated_at before update on public.student_profiles for each row execute function public.app_set_timestamp();

drop trigger if exists trg_employee_profiles_updated_at on public.employee_profiles;
create trigger trg_employee_profiles_updated_at before update on public.employee_profiles for each row execute function public.app_set_timestamp();

drop trigger if exists trg_landlord_profiles_updated_at on public.landlord_profiles;
create trigger trg_landlord_profiles_updated_at before update on public.landlord_profiles for each row execute function public.app_set_timestamp();

drop trigger if exists trg_admin_profiles_updated_at on public.admin_profiles;
create trigger trg_admin_profiles_updated_at before update on public.admin_profiles for each row execute function public.app_set_timestamp();

drop trigger if exists trg_create_report_audit_on_insert on public.reports;
create trigger trg_create_report_audit_on_insert after insert on public.reports for each row execute function public.create_report_audit_on_insert();

drop trigger if exists trg_update_duplicate_check_on_report on public.reports;
create trigger trg_update_duplicate_check_on_report after insert on public.reports for each row execute function public.update_duplicate_check_on_report();

drop trigger if exists trg_notify_landlord_on_report on public.reports;
create trigger trg_notify_landlord_on_report after insert on public.reports for each row execute function public.fn_notify_landlord_on_report();

drop trigger if exists trg_notify_landlord_on_violation on public.violations;
create trigger trg_notify_landlord_on_violation after insert on public.violations for each row execute function public.fn_notify_landlord_on_violation();

drop trigger if exists trg_notify_admin_on_appeal on public.appeals;
create trigger trg_notify_admin_on_appeal after insert on public.appeals for each row execute function public.fn_notify_admin_on_appeal();

drop trigger if exists trg_notify_landlord_on_appeal_status on public.appeals;
create trigger trg_notify_landlord_on_appeal_status before update on public.appeals for each row execute function public.fn_notify_landlord_on_appeal_status();

drop trigger if exists trg_notification_read_timestamp on public.notifications;
create trigger trg_notification_read_timestamp before update on public.notifications for each row execute function public.fn_notification_read_timestamp();

-- SECTION 5: HELPER FUNCTIONS & VIEWS
-- =============================================================================

-- Mark notification read
create or replace function public.fn_mark_notification_read(p_notification_id uuid)
returns boolean language plpgsql security invoker set search_path = public as $$
declare v_updated int;
begin
  update public.notifications set read = true where id = p_notification_id;
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- Mark all notifications read
create or replace function public.fn_mark_all_notifications_read(p_user_id uuid)
returns int language plpgsql security invoker set search_path = public as $$
declare v_updated int;
begin
  update public.notifications set read = true where user_id = p_user_id and read = false;
  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

-- Get unread count
create or replace function public.fn_get_unread_notification_count(p_user_id uuid)
returns int language plpgsql security invoker set search_path = public as $$
declare v_count int;
begin
  select count(*) into v_count from public.notifications
  where user_id = p_user_id and read = false and is_deleted = false;
  return v_count;
end;
$$;

-- Reports with evidence view
drop view if exists public.reports_with_evidence cascade;
create view public.reports_with_evidence with (security_invoker = true) as
select
  r.id, r.reporter_id, r.apartment_id, r.landlord_id, r.category, r.issue_type,
  r.details, r.severity, r.status, r.submitted_at, r.last_action_at,
  r.reviewed_by, r.reviewed_at,
  coalesce(e.evidence_count, 0) as evidence_count,
  au.name as reporter_name, au.email as reporter_email,
  apt.title as apartment_title, apt.address as apartment_address,
  ll.name as landlord_name
from public.reports r
left join public.app_users au on r.reporter_id = au.id
left join public.apartments apt on r.apartment_id = apt.id
left join public.app_users ll on r.landlord_id = ll.id
left join (select report_id, count(*) as evidence_count from public.report_evidence group by report_id) e on r.id = e.report_id;

-- App users by role view
drop view if exists public.vw_app_users_by_role;
create view public.vw_app_users_by_role with (security_invoker = true) as
select u.id, u.email, u.name, u.role, u.status, u.mobile, u.is_verified, u.permit_number, u.created_at, u.updated_at
from public.app_users u;

-- SECTION 6: FOREIGN KEY REPAIRS
-- =============================================================================

create or replace function pg_temp.ensure_public_fk(
  child_table text, child_column text, constraint_name text,
  parent_table text, parent_column text, on_delete_sql text, on_delete_code "char"
) returns void language plpgsql as $$
declare fk record; has_expected_fk boolean := false;
begin
  for fk in
    select c.conname, pn.nspname as parent_schema, pt.relname as parent_table,
           pa.attname as parent_column, c.confdeltype as delete_code
    from pg_constraint c
    join pg_class ct on ct.oid = c.conrelid
    join pg_namespace cn on cn.oid = ct.relnamespace
    join unnest(c.conkey) with ordinality child_cols(attnum, ord) on true
    join pg_attribute ca on ca.attrelid = c.conrelid and ca.attnum = child_cols.attnum
    join pg_class pt on pt.oid = c.confrelid
    join pg_namespace pn on pn.oid = pt.relnamespace
    join unnest(c.confkey) with ordinality parent_cols(attnum, ord) on parent_cols.ord = child_cols.ord
    join pg_attribute pa on pa.attrelid = c.confrelid and pa.attnum = parent_cols.attnum
    where c.contype = 'f' and cn.nspname = 'public' and ct.relname = child_table and ca.attname = child_column
  loop
    if fk.parent_schema = 'public' and fk.parent_table = parent_table and
       fk.parent_column = parent_column and fk.delete_code = on_delete_code then
      has_expected_fk := true;
    else
      execute format('alter table public.%I drop constraint %I', child_table, fk.conname);
    end if;
  end loop;

  if not has_expected_fk then
    execute format('alter table public.%I add constraint %I foreign key (%I) references public.%I (%I) on delete %s not valid',
      child_table, constraint_name, child_column, parent_table, parent_column, on_delete_sql);
  end if;
end;
$$;

-- Fix all foreign keys
select pg_temp.ensure_public_fk('signups', 'user_id', 'signups_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('logins', 'user_id', 'logins_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('student_profiles', 'user_id', 'student_profiles_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('employee_profiles', 'user_id', 'employee_profiles_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('landlord_profiles', 'user_id', 'landlord_profiles_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('admin_profiles', 'user_id', 'admin_profiles_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('apartments', 'landlord_id', 'apartments_landlord_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('apartment_images', 'apartment_id', 'apartment_images_apartment_id_apartments_fkey', 'apartments', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('apartment_rooms', 'apartment_id', 'apartment_rooms_apartment_id_apartments_fkey', 'apartments', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('apartment_views', 'apartment_id', 'apartment_views_apartment_id_apartments_fkey', 'apartments', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('apartment_views', 'viewer_id', 'apartment_views_viewer_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('favorites', 'user_id', 'favorites_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('favorites', 'apartment_id', 'favorites_apartment_id_apartments_fkey', 'apartments', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('reports', 'reporter_id', 'reports_reporter_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('reports', 'user_id', 'reports_user_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('reports', 'apartment_id', 'reports_apartment_id_apartments_fkey', 'apartments', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('violations', 'landlord_id', 'violations_landlord_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('violations', 'admin_id', 'violations_admin_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('violations', 'related_report_id', 'violations_related_report_id_reports_fkey', 'reports', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('violations', 'apartment_id', 'violations_apartment_id_apartments_fkey', 'apartments', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('notifications', 'user_id', 'notifications_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('audit_logs', 'admin_id', 'audit_logs_admin_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');

-- Orphaned FK integrity checks (informational — returns rows if data is inconsistent)
select 'apartments missing app_users landlord' as check_name, a.id, a.landlord_id
from public.apartments a left join public.app_users u on u.id = a.landlord_id where u.id is null;

select 'favorites missing app_users user' as check_name, f.id, f.user_id
from public.favorites f left join public.app_users u on u.id = f.user_id where u.id is null;

-- SECTION 7: ROW LEVEL SECURITY
-- =============================================================================

alter table public.app_users enable row level security;
alter table public.apartments enable row level security;
alter table public.apartment_images enable row level security;
alter table public.apartment_rooms enable row level security;
alter table public.apartment_views enable row level security;
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
alter table public.appeals enable row level security;
alter table public.report_evidence enable row level security;
alter table public.report_audit_log enable row level security;
alter table public.report_responses enable row level security;
alter table public.report_duplicate_check enable row level security;

-- Development policies (allow all for anon/authenticated)
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

drop policy if exists "dev_apartment_views_all" on public.apartment_views;
create policy "dev_apartment_views_all" on public.apartment_views for all to anon, authenticated using (true) with check (true);

drop policy if exists "dev_apartment_storage_all" on storage.objects;
create policy "dev_apartment_storage_all" on storage.objects for all to anon, authenticated using (bucket_id = 'apartment-images') with check (bucket_id = 'apartment-images');

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

drop policy if exists "dev_appeals_all" on public.appeals;
create policy "dev_appeals_all" on public.appeals for all to anon, authenticated using (true) with check (true);

drop policy if exists "report_evidence_reporter_view" on public.report_evidence;
drop policy if exists "report_evidence_reporter_insert" on public.report_evidence;
drop policy if exists "dev_report_evidence_all" on public.report_evidence;
create policy "dev_report_evidence_all" on public.report_evidence for all to anon, authenticated using (true) with check (true);

drop policy if exists "dev_report_audit_log_all" on public.report_audit_log;
create policy "dev_report_audit_log_all" on public.report_audit_log for all to anon, authenticated using (true) with check (true);

drop policy if exists "dev_report_responses_all" on public.report_responses;
create policy "dev_report_responses_all" on public.report_responses for all to anon, authenticated using (true) with check (true);

drop policy if exists "dev_report_duplicate_check_all" on public.report_duplicate_check;
create policy "dev_report_duplicate_check_all" on public.report_duplicate_check for all to anon, authenticated using (true) with check (true);

-- SECTION 8: PERMISSIONS & GRANTS
-- =============================================================================

grant usage on schema public to postgres, anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

grant execute on function public.fn_mark_notification_read(uuid) to anon, authenticated, service_role;
grant execute on function public.fn_mark_all_notifications_read(uuid) to anon, authenticated, service_role;
grant execute on function public.fn_get_unread_notification_count(uuid) to anon, authenticated, service_role;

do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
    grant execute on function public.rls_auto_enable() to service_role;
  end if;
end $$;

-- SECTION 9: SEED DATA (OPTIONAL)
-- =============================================================================

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

update public.app_users set
  signup_source = coalesce(nullif(signup_source, ''), 'web'),
  verification_status = coalesce(nullif(verification_status, ''), case when is_verified then 'verified' else 'pending' end),
  landlord_status = case when role = 'landlord' then coalesce(nullif(landlord_status, ''), status) else landlord_status end;

-- =============================================================================
-- MIGRATION COMPLETE ✓
-- All tables, triggers, functions, and policies have been created/updated.
-- Safe to re-run. RLS "always true" warnings are expected for dev policies.
-- =============================================================================
