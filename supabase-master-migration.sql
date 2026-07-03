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
-- Authentication secrets belong exclusively to Supabase Auth.
alter table public.app_users drop column if exists password;

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
  id_document_url text,
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
alter table public.landlord_profiles add column if not exists verification_document_url text;
alter table public.landlord_profiles add column if not exists id_document_url text;

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
  is_published boolean not null default false,
  approval_status text not null default 'pending',
  is_archived boolean not null default false,
  deleted_at timestamptz,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.apartments add column if not exists legacy_id text;
alter table public.apartments add column if not exists status text not null default 'available';
alter table public.apartments add column if not exists approval_status text not null default 'pending';
alter table public.apartments add column if not exists is_archived boolean not null default false;
alter table public.apartments add column if not exists deleted_at timestamptz;
alter table public.apartments alter column is_published set default false;
alter table public.apartments alter column features set default '{}'::jsonb;
alter table public.apartments drop constraint if exists apartments_status_check;
alter table public.apartments add constraint apartments_status_check check (status in ('available', 'occupied', 'reserved', 'maintenance'));
alter table public.apartments drop constraint if exists apartments_approval_status_check;
alter table public.apartments add constraint apartments_approval_status_check check (approval_status in ('pending', 'approved', 'rejected'));

-- Preserve listings that were already live before explicit property approval
-- existed. New listings retain the `pending` default and start unpublished.
update public.apartments
set approval_status = 'approved'
where is_published = true
  and approval_status = 'pending';

create unique index if not exists apartments_legacy_id_key on public.apartments (legacy_id) where legacy_id is not null;
create index if not exists idx_apartments_landlord on public.apartments (landlord_id);
create index if not exists idx_apartments_city on public.apartments (city);
create index if not exists idx_apartments_published on public.apartments (is_published);
create index if not exists idx_apartments_status on public.apartments (status);
create index if not exists idx_apartments_approval on public.apartments (approval_status);
create index if not exists idx_apartments_legacy on public.apartments (legacy_id);
drop index if exists public.idx_apartments_browse;
create index idx_apartments_browse on public.apartments (is_published, approval_status, is_archived, status, city, price);

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
alter table public.apartment_rooms add column if not exists price numeric(12, 2) not null default 0;
alter table public.apartment_rooms add column if not exists rent numeric(12, 2) not null default 0;
alter table public.apartment_rooms add column if not exists bathroom_type text;
alter table public.apartment_rooms add column if not exists shared_bath_location text;
alter table public.apartment_rooms add column if not exists has_ac boolean not null default false;
alter table public.apartment_rooms add column if not exists status text not null default 'available';
alter table public.apartment_rooms add column if not exists description text;
alter table public.apartment_rooms add column if not exists images text[] not null default '{}';
alter table public.apartment_rooms add column if not exists created_at timestamptz not null default now();
alter table public.apartment_rooms drop constraint if exists apartment_rooms_status_check;
alter table public.apartment_rooms add constraint apartment_rooms_status_check check (status in ('available', 'occupied', 'reserved', 'maintenance'));

-- Existing databases may have either `price` or `rent`. Keep both columns for
-- compatibility while making `rent` authoritative.
update public.apartment_rooms
set rent = price
where coalesce(rent, 0) = 0 and coalesce(price, 0) > 0;

create or replace function public.sync_apartment_room_rent_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.rent, 0) > 0 then new.price := new.rent;
    elsif coalesce(new.price, 0) > 0 then new.rent := new.price;
    end if;
  elsif new.rent is distinct from old.rent then
    new.price := new.rent;
  elsif new.price is distinct from old.price then
    new.rent := new.price;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_apartment_room_rent_columns on public.apartment_rooms;
create trigger trg_sync_apartment_room_rent_columns
before insert or update on public.apartment_rooms
for each row execute function public.sync_apartment_room_rent_columns();

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
create index if not exists idx_apartment_views_apartment_recent on public.apartment_views (apartment_id, viewed_at desc);

insert into storage.buckets (id, name, public)
values ('apartment-images', 'apartment-images', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values
  ('user-avatars', 'user-avatars', true),
  ('report-evidence', 'report-evidence', false),
  ('verification-documents', 'verification-documents', false)
on conflict (id) do update set public = excluded.public;

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
create index if not exists idx_reports_status_submitted on public.reports (status, submitted_at desc);

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
create index if not exists idx_violations_landlord_active on public.violations (landlord_id, active);

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
create index if not exists idx_notifications_user_unread on public.notifications (user_id, read, is_deleted);

-- Property-specific verification files. Files remain private in Storage; this
-- table stores only the owning property, document category, and storage path.
create table if not exists public.apartment_verification_documents (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  landlord_id uuid not null references public.app_users (id) on delete cascade,
  document_type text not null,
  file_name text not null,
  mime_type text not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (apartment_id, document_type)
);

create index if not exists idx_apartment_verification_documents_apartment
  on public.apartment_verification_documents (apartment_id);
create index if not exists idx_apartment_verification_documents_landlord
  on public.apartment_verification_documents (landlord_id);

create or replace function public.notify_admins_of_verification_document_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document public.apartment_verification_documents%rowtype;
  v_property public.apartments%rowtype;
  v_landlord_name text;
  v_action text;
begin
  v_document := case when tg_op = 'DELETE' then old else new end;
  select * into v_property from public.apartments where id = v_document.apartment_id;

  -- Initial documents are covered by the property-submission notification.
  if v_property.created_at >= now() - interval '1 minute' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select coalesce(nullif(name, ''), 'A landlord') into v_landlord_name
  from public.app_users where id = v_document.landlord_id;
  v_action := case tg_op when 'DELETE' then 'removed' when 'UPDATE' then 'replaced' else 'uploaded' end;

  insert into public.notifications (
    user_id, type, title, message, payload, read, action_url, action_target_id, action_target_type
  )
  select
    admin_user.id,
    'verification_documents_updated',
    'Verification documents updated',
    format('%s %s a verification document for "%s".', v_landlord_name, v_action, coalesce(v_property.title, 'a property')),
    jsonb_build_object(
      'apartment_id', v_document.apartment_id,
      'landlord_id', v_document.landlord_id,
      'action', 'verification_documents_updated'
    ),
    false,
    '/admin/apartment/' || v_document.apartment_id::text || '#admin-verification',
    v_document.apartment_id,
    'apartment'
  from public.app_users admin_user
  where admin_user.role = 'admin'
    and not exists (
      select 1 from public.notifications recent
      where recent.user_id = admin_user.id
        and recent.type = 'verification_documents_updated'
        and recent.payload ->> 'apartment_id' = v_document.apartment_id::text
        and recent.created_at >= now() - interval '15 seconds'
    );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_notify_admins_verification_document_change on public.apartment_verification_documents;
create trigger trg_notify_admins_verification_document_change
after insert or update or delete on public.apartment_verification_documents
for each row execute function public.notify_admins_of_verification_document_change();

-- Support requests submitted from renter and landlord help screens
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  topic text not null,
  message text not null,
  contact text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  assigned_admin_id uuid references public.app_users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_user on public.support_tickets (user_id);
create index if not exists idx_support_tickets_status_created on public.support_tickets (status, created_at desc);

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
create index if not exists idx_audit_logs_target on public.audit_logs (target_type, target_id, created_at desc);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);

-- Convert persisted landlord property/room audit entries into durable admin
-- notifications. The audit row is the single source event, preventing duplicate
-- notifications when clients refresh or reconnect to Realtime.
create or replace function public.notify_admins_of_landlord_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role public.app_user_role;
  v_landlord_name text;
  v_landlord_id uuid;
  v_property_name text;
  v_room_id uuid;
  v_room_name text;
  v_status text;
  v_action_type text := new.action;
  v_title text;
  v_message text;
  v_action_url text;
  v_changed_fields text;
  v_old_image_count int := 0;
  v_new_image_count int := 0;
begin
  select role, coalesce(nullif(name, ''), 'A landlord')
    into v_actor_role, v_landlord_name
  from public.app_users where id = new.admin_id;

  if v_actor_role is distinct from 'landlord'::public.app_user_role
     or new.action not in (
       'apartment_created', 'apartment_updated', 'apartment_deleted', 'apartment_status_updated', 'apartment_images_updated',
       'apartment_room_created', 'apartment_room_updated',
       'apartment_room_status_updated', 'apartment_room_deleted'
     ) then
    return new;
  end if;

  select landlord_id, coalesce(nullif(title, ''), 'Untitled property'), status
    into v_landlord_id, v_property_name, v_status
  from public.apartments where id = new.target_id;
  v_landlord_id := coalesce(v_landlord_id, new.admin_id);
  v_property_name := coalesce(v_property_name, nullif(new.details ->> 'property_name', ''), 'a property');

  begin
    v_room_id := nullif(new.details ->> 'room_id', '')::uuid;
  exception when invalid_text_representation then
    v_room_id := null;
  end;
  if v_room_id is not null then
    select coalesce(nullif(name, ''), nullif(room_type, ''), 'Room') into v_room_name
    from public.apartment_rooms where id = v_room_id;
  end if;
  v_room_name := coalesce(
    v_room_name,
    nullif(new.details #>> '{changes,room,new,name}', ''),
    nullif(new.details #>> '{changes,room,old,name}', ''),
    'Room'
  );
  v_status := coalesce(
    nullif(new.details ->> 'status', ''),
    nullif(new.details #>> '{changes,room_status,new}', ''),
    nullif(new.details #>> '{changes,room,new,status}', ''),
    v_status
  );

  if jsonb_typeof(new.details -> 'changed_fields') = 'array' then
    select string_agg(replace(field_name, '_', ' '), ', ')
      into v_changed_fields
    from jsonb_array_elements_text(new.details -> 'changed_fields') as fields(field_name);
  elsif jsonb_typeof(new.details -> 'changes') = 'object' then
    select string_agg(replace(field_name, '_', ' '), ', ')
      into v_changed_fields
    from jsonb_object_keys(new.details -> 'changes') as fields(field_name);
  end if;

  if new.action = 'apartment_room_updated' then
    if jsonb_typeof(new.details #> '{changes,room,old,images}') = 'array' then
      v_old_image_count := jsonb_array_length(new.details #> '{changes,room,old,images}');
    end if;
    if jsonb_typeof(new.details #> '{changes,room,new,images}') = 'array' then
      v_new_image_count := jsonb_array_length(new.details #> '{changes,room,new,images}');
    end if;
    if new.details -> 'changed_fields' = '["images"]'::jsonb then
      v_action_type := case
        when v_new_image_count > v_old_image_count then 'room_images_uploaded'
        when v_new_image_count < v_old_image_count then 'room_images_deleted'
        else 'room_images_reordered'
      end;
    end if;
  end if;

  v_title := case v_action_type
    when 'apartment_created' then 'New landlord property submitted'
    when 'apartment_updated' then 'Property updated'
    when 'apartment_deleted' then 'Property deleted'
    when 'apartment_status_updated' then 'Property status updated'
    when 'apartment_images_updated' then 'Property images updated'
    when 'apartment_room_created' then 'Room added'
    when 'apartment_room_updated' then 'Room updated'
    when 'apartment_room_status_updated' then 'Room status updated'
    when 'apartment_room_deleted' then 'Room deleted'
    when 'room_images_uploaded' then 'Room images uploaded'
    when 'room_images_deleted' then 'Room images deleted'
    when 'room_images_reordered' then 'Room images reordered'
    else 'Landlord activity'
  end;

  v_message := case v_action_type
    when 'apartment_created' then format('%s submitted %s for review.', v_landlord_name, v_property_name)
    when 'apartment_updated' then format('%s updated %s%s.', v_landlord_name, v_property_name, case when v_changed_fields is null then '' else ' (' || v_changed_fields || ')' end)
    when 'apartment_deleted' then format('%s deleted %s.', v_landlord_name, v_property_name)
    when 'apartment_status_updated' then format('%s updated the status of %s%s.', v_landlord_name, v_property_name, case when v_status is null then '' else ' to ' || initcap(v_status) end)
    when 'apartment_images_updated' then format('%s updated property images for %s (%s images now).', v_landlord_name, v_property_name, coalesce(new.details ->> 'image_count', '0'))
    when 'apartment_room_created' then format('%s added %s to %s.', v_landlord_name, v_room_name, v_property_name)
    when 'apartment_room_updated' then format('%s updated %s at %s%s.', v_landlord_name, v_room_name, v_property_name, case when v_changed_fields is null then '' else ' (' || v_changed_fields || ')' end)
    when 'apartment_room_status_updated' then format('%s marked %s at %s as %s.', v_landlord_name, v_room_name, v_property_name, initcap(coalesce(v_status, 'updated')))
    when 'apartment_room_deleted' then format('%s deleted %s from %s.', v_landlord_name, v_room_name, v_property_name)
    when 'room_images_uploaded' then format('%s uploaded room images for %s at %s (%s images now).', v_landlord_name, v_room_name, v_property_name, v_new_image_count)
    when 'room_images_deleted' then format('%s removed room images from %s at %s (%s images remain).', v_landlord_name, v_room_name, v_property_name, v_new_image_count)
    when 'room_images_reordered' then format('%s reordered room images for %s at %s.', v_landlord_name, v_room_name, v_property_name)
    else format('%s updated %s.', v_landlord_name, v_property_name)
  end;

  v_action_url := case
    when new.action = 'apartment_deleted' then '/dashboard?section=apartments'
    when new.action = 'apartment_created' then '/admin/apartment/' || new.target_id::text || '#admin-verification'
    when v_room_id is not null then '/admin/apartment/' || new.target_id::text || '#admin-room-' || v_room_id::text
    else '/admin/apartment/' || new.target_id::text
  end;

  insert into public.notifications (
    user_id, type, title, message, payload, read, action_url, action_target_id, action_target_type
  )
  select
    admin_user.id,
    'landlord_activity',
    v_title,
    v_message,
    jsonb_build_object(
      'category', 'landlord_activity',
      'activity_type', v_action_type,
      'audit_log_id', new.id,
      'landlord_id', v_landlord_id,
      'landlord_name', v_landlord_name,
      'apartment_id', new.target_id,
      'property_name', v_property_name,
      'room_id', v_room_id,
      'room_name', case when v_room_id is null then null else v_room_name end,
      'status', v_status,
      'changed_fields', coalesce(new.details -> 'changed_fields', '[]'::jsonb)
    ),
    false,
    v_action_url,
    new.target_id,
    case when v_room_id is null then 'apartment' else 'room' end
  from public.app_users admin_user
  where admin_user.role = 'admin'
    and not exists (
      select 1 from public.notifications existing
      where existing.user_id = admin_user.id
        and existing.type = 'landlord_activity'
        and existing.payload ->> 'audit_log_id' = new.id::text
    );

  return new;
end;
$$;

drop trigger if exists trg_notify_admins_landlord_activity on public.audit_logs;
create trigger trg_notify_admins_landlord_activity
after insert on public.audit_logs
for each row execute function public.notify_admins_of_landlord_activity();

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
security definer
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
security definer
set search_path = public
as $$
begin
  insert into public.report_duplicate_check (reporter_id, apartment_id, issue_type)
  values (new.reporter_id, new.apartment_id, coalesce(new.issue_type, new.category))
  on conflict (reporter_id, apartment_id, issue_type)
  do update set submitted_at = excluded.submitted_at;
  return new;
end;
$$;

-- Notify landlord on report
create or replace function public.fn_notify_landlord_on_report()
returns trigger
language plpgsql
security definer
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
security definer
set search_path = public
as $$
begin
  insert into public.notifications (
    user_id, type, title, message, payload
  ) values (
    new.landlord_id,
    case when new.mode = 'notice' then 'notice_issued' else 'violation_issued' end,
    case when new.mode = 'notice' then 'Official Notice: ' else 'Account Notice: ' end || coalesce(new.type, 'Update'),
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
security definer
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
security definer
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

create or replace function public.fn_notify_admin_on_support_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_requester_name text;
begin
  select name into v_requester_name from public.app_users where id = new.user_id;
  insert into public.notifications (user_id, type, title, message, payload)
  select id, 'support_request', 'New support request',
    coalesce(v_requester_name, 'A user') || ' requested help with ' || new.topic || '.',
    jsonb_build_object('ticket_id', new.id, 'topic', new.topic)
  from public.app_users where role = 'admin';
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

drop trigger if exists trg_support_tickets_updated_at on public.support_tickets;
create trigger trg_support_tickets_updated_at before update on public.support_tickets for each row execute function public.app_set_timestamp();

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

drop trigger if exists trg_notify_admin_on_support_ticket on public.support_tickets;
create trigger trg_notify_admin_on_support_ticket after insert on public.support_tickets for each row execute function public.fn_notify_admin_on_support_ticket();

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

-- Resolve the application profile belonging to the active Supabase Auth user.
-- SECURITY DEFINER avoids recursive app_users RLS checks in policies.
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.app_users where auth_id = auth.uid() limit 1
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_users
    where auth_id = auth.uid() and role = 'admin' and status <> 'disabled'
  )
$$;

-- Record landlord property submissions/deletions in the same transaction as
-- the property mutation. The audit trigger above then creates exactly one
-- notification for each administrator.
create or replace function public.record_landlord_apartment_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := public.current_app_user_id();
  v_actor_role public.app_user_role;
  v_apartment public.apartments%rowtype;
  v_action text;
begin
  v_apartment := case when tg_op = 'DELETE' then old else new end;
  select role into v_actor_role from public.app_users where id = v_actor_id;
  if v_actor_role is distinct from 'landlord'::public.app_user_role
     or v_apartment.landlord_id is distinct from v_actor_id then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  v_action := case when tg_op = 'DELETE' then 'apartment_deleted' else 'apartment_created' end;
  insert into public.audit_logs (admin_id, action, target_type, target_id, details)
  values (
    v_actor_id,
    v_action,
    'apartment',
    v_apartment.id,
    jsonb_build_object(
      'actor_id', v_actor_id,
      'landlord_id', v_apartment.landlord_id,
      'property_name', v_apartment.title,
      'status', case when tg_op = 'DELETE' then v_apartment.status else v_apartment.approval_status end,
      'changes', jsonb_build_object(
        'apartment', jsonb_build_object(
          'old', case when tg_op = 'DELETE' then to_jsonb(old) else null end,
          'new', case when tg_op = 'INSERT' then to_jsonb(new) else null end
        )
      )
    )
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_record_landlord_apartment_activity on public.apartments;
create trigger trg_record_landlord_apartment_activity
after insert or delete on public.apartments
for each row execute function public.record_landlord_apartment_activity();

create or replace function public.fn_merge_user_preference_section(
  p_user_id uuid,
  p_section text,
  p_value jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare v_preferences jsonb;
begin
  if p_user_id is distinct from public.current_app_user_id() and not public.current_user_is_admin() then
    raise exception 'Not authorized to update these preferences';
  end if;
  if p_section is null or p_section !~ '^[a-zA-Z][a-zA-Z0-9_]{0,63}$' then
    raise exception 'Invalid preference section';
  end if;

  update public.app_users
  set preferences = jsonb_set(coalesce(preferences, '{}'::jsonb), array[p_section], coalesce(p_value, '{}'::jsonb), true)
  where id = p_user_id
  returning preferences into v_preferences;
  return v_preferences;
end;
$$;

create or replace function public.fn_delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_auth_id uuid := auth.uid();
begin
  if v_auth_id is null then
    raise exception 'Authentication required';
  end if;
  delete from auth.users where id = v_auth_id;
  return found;
end;
$$;

-- Create the app profile transactionally with the Auth account. The client may
-- enrich role-specific fields afterward, but never needs anonymous table writes.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_user_role;
  v_name text;
  v_user_id uuid;
begin
  v_role := case
    when new.raw_user_meta_data ->> 'role' in ('student', 'employee', 'landlord', 'admin')
      then (new.raw_user_meta_data ->> 'role')::public.app_user_role
    else 'student'::public.app_user_role
  end;
  v_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(coalesce(new.email, ''), '@', 1), 'User');

  insert into public.app_users (auth_id, email, name, role, status, mobile, middle_initial, address, is_verified, permit_number, signup_source)
  values (
    new.id, new.email, v_name, v_role,
    case when v_role = 'landlord' then 'pending' else 'active' end,
    nullif(new.raw_user_meta_data ->> 'mobile', ''),
    nullif(new.raw_user_meta_data ->> 'middleInitial', ''),
    nullif(new.raw_user_meta_data ->> 'address', ''),
    v_role <> 'landlord',
    case when v_role = 'landlord' then nullif(new.raw_user_meta_data ->> 'permitNumber', '') else null end,
    'web'
  )
  on conflict (email) do update set
    auth_id = excluded.auth_id,
    permit_number = coalesce(app_users.permit_number, excluded.permit_number)
  returning id into v_user_id;

  if v_role = 'student' then
    insert into public.student_profiles (user_id, school, guardian_name, guardian_address, guardian_contact)
    values (v_user_id, nullif(new.raw_user_meta_data ->> 'school', ''), nullif(new.raw_user_meta_data ->> 'guardianName', ''), nullif(new.raw_user_meta_data ->> 'guardianAddress', ''), nullif(new.raw_user_meta_data ->> 'guardianContact', ''))
    on conflict (user_id) do nothing;
  elsif v_role = 'employee' then
    insert into public.employee_profiles (user_id, company, work_address)
    values (v_user_id, nullif(new.raw_user_meta_data ->> 'company', ''), nullif(new.raw_user_meta_data ->> 'workAddress', ''))
    on conflict (user_id) do nothing;
  elsif v_role = 'landlord' then
    insert into public.landlord_profiles (user_id, permit_number, business_permit_number, is_verified)
    values (v_user_id, nullif(new.raw_user_meta_data ->> 'permitNumber', ''), nullif(new.raw_user_meta_data ->> 'permitNumber', ''), false)
    on conflict (user_id) do update set
      permit_number = coalesce(landlord_profiles.permit_number, excluded.permit_number),
      business_permit_number = coalesce(landlord_profiles.business_permit_number, excluded.business_permit_number);

    insert into public.notifications (user_id, type, title, message, payload)
    select id, 'landlord_registration', 'New landlord registration',
      v_name || ' registered and is waiting for verification review.',
      jsonb_build_object('landlord_id', v_user_id, 'landlord_name', v_name, 'action', 'landlord_registration')
    from public.app_users where role = 'admin';
  elsif v_role = 'admin' then
    insert into public.admin_profiles (user_id, admin_level, department)
    values (v_user_id, 'Full Administrator', 'Platform Administration')
    on conflict (user_id) do nothing;
  end if;

  insert into public.signups (user_id, auth_id, email, role, source, metadata)
  values (v_user_id, new.id, new.email, v_role, 'web', coalesce(new.raw_user_meta_data, '{}'::jsonb));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Repair profiles for Auth users created before this trigger existed.
insert into public.app_users (auth_id, email, name, role, status, is_verified, signup_source)
select
  u.id,
  u.email,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'name'), ''), split_part(coalesce(u.email, ''), '@', 1), 'User'),
  case when u.raw_user_meta_data ->> 'role' in ('student', 'employee', 'landlord', 'admin')
    then (u.raw_user_meta_data ->> 'role')::public.app_user_role else 'student'::public.app_user_role end,
  case when u.raw_user_meta_data ->> 'role' = 'landlord' then 'pending' else 'active' end,
  coalesce(u.raw_user_meta_data ->> 'role', 'student') <> 'landlord',
  'auth_backfill'
from auth.users u
where u.email is not null
on conflict (email) do update set auth_id = excluded.auth_id;

-- Repair pending landlord permits created by older signup flows. Verification
-- must never be required before an administrator can review the submitted
-- permit number.
update public.app_users app_user
set permit_number = nullif(auth_user.raw_user_meta_data ->> 'permitNumber', '')
from auth.users auth_user
where app_user.auth_id = auth_user.id
  and app_user.role = 'landlord'
  and nullif(app_user.permit_number, '') is null
  and nullif(auth_user.raw_user_meta_data ->> 'permitNumber', '') is not null;

insert into public.landlord_profiles (
  user_id, permit_number, business_permit_number, is_verified, verified_at
)
select
  id, permit_number, permit_number, is_verified,
  case when is_verified then now() else null end
from public.app_users
where role = 'landlord'
on conflict (user_id) do update set
  permit_number = coalesce(landlord_profiles.permit_number, excluded.permit_number),
  business_permit_number = coalesce(landlord_profiles.business_permit_number, excluded.business_permit_number),
  is_verified = excluded.is_verified,
  verified_at = case
    when excluded.is_verified then coalesce(landlord_profiles.verified_at, now())
    else null
  end,
  updated_at = now();

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

-- Public listing contact projection. Never expose auth IDs, preferences,
-- internal metadata, verification documents, or administrator fields.
-- The narrow helper deliberately preserves anonymous listing-contact access
-- without granting anon/authenticated direct SELECT access to app_users.
create or replace function public.get_public_landlords()
returns table (
  id uuid,
  email text,
  name text,
  role public.app_user_role,
  status text,
  mobile text,
  avatar_url text,
  is_verified boolean,
  verification_status text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email, u.name, u.role, u.status, u.mobile, u.avatar_url,
         u.is_verified, u.verification_status, u.created_at, u.updated_at
  from public.app_users u
  where u.role = 'landlord' and u.status <> 'disabled'
$$;

revoke all on function public.get_public_landlords() from public;

create or replace view public.public_landlords
with (security_barrier = true, security_invoker = true) as
select * from public.get_public_landlords();
alter view public.public_landlords set (security_barrier = true, security_invoker = true);

-- Authoritative tenant/public publication contract. Ownership and admin
-- access remain separate RLS branches below.
create or replace function public.apartment_is_tenant_visible(p_apartment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.apartments a
    join public.app_users landlord on landlord.id = a.landlord_id
    where a.id = p_apartment_id
      and a.is_published = true
      and a.approval_status = 'approved'
      and a.is_archived = false
      and a.deleted_at is null
      and a.status = 'available'
      and landlord.role = 'landlord'
      and landlord.is_verified = true
      and landlord.status <> 'disabled'
  );
$$;

create or replace function public.sync_landlord_verification_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'landlord' then
    insert into public.landlord_profiles (
      user_id, permit_number, business_permit_number, is_verified, verified_at, updated_at
    ) values (
      new.id, new.permit_number, new.permit_number, new.is_verified,
      case when new.is_verified then now() else null end,
      now()
    )
    on conflict (user_id) do update set
      permit_number = coalesce(landlord_profiles.permit_number, excluded.permit_number),
      business_permit_number = coalesce(landlord_profiles.business_permit_number, excluded.business_permit_number),
      is_verified = excluded.is_verified,
      verified_at = case
        when excluded.is_verified then coalesce(landlord_profiles.verified_at, now())
        else null
      end,
      updated_at = now();

    -- Touch owned listings so apartment realtime subscribers refresh as soon
    -- as verification changes in another session.
    update public.apartments set updated_at = now() where landlord_id = new.id;

    -- Persist the account notification in the same transaction as the
    -- canonical verification change. This works for every admin client and
    -- cannot be lost if a browser closes immediately after approval.
    if old.is_verified is distinct from new.is_verified then
      insert into public.notifications (
        user_id, type, title, message, payload, read, is_deleted
      ) values (
        new.id,
        case when new.is_verified then 'verification_approved' else 'verification_revoked' end,
        case when new.is_verified then 'Account Verified' else 'Verification Revoked' end,
        case
          when new.is_verified then 'Your landlord account has been verified by the Admin. You can now publish and manage apartment listings.'
          else 'Your landlord verification has been revoked by the Admin. Please review your account requirements.'
        end,
        jsonb_build_object(
          'action', case when new.is_verified then 'verification_approved' else 'verification_revoked' end,
          'verified', new.is_verified,
          'changed_at', now(),
          'admin_id', public.current_app_user_id()
        ),
        false,
        false
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_landlord_verification_state on public.app_users;
create trigger trg_sync_landlord_verification_state
after update of is_verified, status, verification_status, landlord_status on public.app_users
for each row
when (
  old.is_verified is distinct from new.is_verified
  or old.status is distinct from new.status
  or old.verification_status is distinct from new.verification_status
  or old.landlord_status is distinct from new.landlord_status
)
execute function public.sync_landlord_verification_state();

create or replace function public.protect_landlord_verification_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_verified is distinct from new.is_verified
     and auth.uid() is not null
     and not public.current_user_is_admin()
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Only an administrator can change landlord verification' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_landlord_verification_state on public.app_users;
create trigger trg_protect_landlord_verification_state
before update of is_verified on public.app_users
for each row
when (old.is_verified is distinct from new.is_verified)
execute function public.protect_landlord_verification_state();

-- The single write API for landlord verification. app_users.is_verified is
-- authoritative; legacy text fields are synchronized only for compatibility.
create or replace function public.fn_set_landlord_verification(
  p_landlord_id uuid,
  p_verified boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  update public.app_users
  set is_verified = p_verified,
      verification_status = case when p_verified then 'verified' else 'pending' end,
      landlord_status = case when p_verified then 'verified' else 'pending' end,
      status = case when p_verified then 'verified' else 'pending' end,
      updated_at = now()
  where id = p_landlord_id
    and role = 'landlord';

  if not found then
    raise exception 'Landlord account not found' using errcode = 'P0002';
  end if;

  return true;
end;
$$;

create or replace function public.protect_apartment_visibility_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SQL migrations and service-role maintenance remain possible. Authenticated
  -- application users must follow the approval workflow below.
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' or public.current_user_is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.is_published
       or new.approval_status <> 'pending'
       or new.is_archived
       or new.deleted_at is not null then
      raise exception 'New apartment listings must await administrator approval' using errcode = '42501';
    end if;
    return new;
  end if;

  if old.approval_status is distinct from new.approval_status then
    raise exception 'Only an administrator can change property approval' using errcode = '42501';
  end if;

  if new.is_published and not old.is_published and (
    new.approval_status <> 'approved'
    or new.is_archived
    or new.deleted_at is not null
  ) then
    raise exception 'Only an approved, active property can be published' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_apartment_visibility_state on public.apartments;
create trigger trg_protect_apartment_visibility_state
before insert or update on public.apartments
for each row execute function public.protect_apartment_visibility_state();

create or replace function public.fn_set_apartment_publication(
  p_apartment_id uuid,
  p_published boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := public.current_app_user_id();
  v_is_admin boolean := public.current_user_is_admin();
  v_landlord_id uuid;
  v_approval_status text;
  v_is_archived boolean;
  v_deleted_at timestamptz;
  v_status text;
begin
  select landlord_id, approval_status, is_archived, deleted_at, status
  into v_landlord_id, v_approval_status, v_is_archived, v_deleted_at, v_status
  from public.apartments
  where id = p_apartment_id
  for update;

  if not found then
    raise exception 'Apartment not found' using errcode = 'P0002';
  end if;

  if not v_is_admin and v_actor_id is distinct from v_landlord_id then
    raise exception 'Not authorized to manage this apartment' using errcode = '42501';
  end if;

  if p_published and v_status <> 'available' then
    raise exception 'Only an active, available apartment can be published' using errcode = '23514';
  end if;

  if p_published and not v_is_admin and (
    v_approval_status <> 'approved' or v_is_archived or v_deleted_at is not null
  ) then
    raise exception 'This apartment must be approved by an administrator before publishing' using errcode = '42501';
  end if;

  update public.apartments
  set is_published = p_published,
      approval_status = case
        when v_is_admin and p_published then 'approved'
        when v_is_admin and not p_published then 'pending'
        else approval_status
      end,
      is_archived = case when v_is_admin and p_published then false else is_archived end,
      deleted_at = case when v_is_admin and p_published then null else deleted_at end,
      updated_at = now()
  where id = p_apartment_id;

  return true;
end;
$$;

create or replace function public.notify_listing_publication_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := public.current_app_user_id();
  v_actor_role public.app_user_role;
  v_title text := coalesce(nullif(new.title, ''), 'Untitled property');
  v_landlord_name text;
begin
  if old.is_published is not distinct from new.is_published then return new; end if;
  select role into v_actor_role from public.app_users where id = v_actor_id;
  select coalesce(nullif(name, ''), 'A landlord') into v_landlord_name from public.app_users where id = new.landlord_id;

  if v_actor_role = 'admin' then
    insert into public.notifications (user_id, type, title, message, payload, read, action_url, action_target_id, action_target_type)
    values (
      new.landlord_id,
      case when new.is_published then 'property_published' else 'property_unpublished' end,
      case when new.is_published then 'Property published' else 'Property unpublished' end,
      format('Your property "%s" was %s by an administrator.', v_title, case when new.is_published then 'published' else 'unpublished' end),
      jsonb_build_object('apartment_id', new.id, 'action', case when new.is_published then 'property_published' else 'property_unpublished' end),
      false,
      '/apartment/' || new.id::text,
      new.id,
      'apartment'
    );
  elsif v_actor_role = 'landlord' then
    insert into public.notifications (user_id, type, title, message, payload, read, action_url, action_target_id, action_target_type)
    select id,
      case when new.is_published then 'property_published' else 'property_unpublished' end,
      case when new.is_published then 'Landlord published a property' else 'Landlord unpublished a property' end,
      format('%s %s "%s".', v_landlord_name, case when new.is_published then 'published' else 'unpublished' end, v_title),
      jsonb_build_object(
        'apartment_id', new.id,
        'landlord_id', new.landlord_id,
        'landlord_name', v_landlord_name,
        'property_name', v_title,
        'category', 'landlord_activity',
        'activity_type', case when new.is_published then 'property_published' else 'property_unpublished' end,
        'status', case when new.is_published then 'published' else 'unpublished' end,
        'action', case when new.is_published then 'property_published' else 'property_unpublished' end
      ),
      false, '/admin/apartment/' || new.id::text, new.id, 'apartment'
    from public.app_users where role = 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_listing_publication_change on public.apartments;
create trigger trg_notify_listing_publication_change
after update of is_published on public.apartments
for each row execute function public.notify_listing_publication_change();

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
select pg_temp.ensure_public_fk('reports', 'landlord_id', 'reports_landlord_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('reports', 'reviewed_by', 'reports_reviewed_by_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('violations', 'landlord_id', 'violations_landlord_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('violations', 'admin_id', 'violations_admin_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('violations', 'related_report_id', 'violations_related_report_id_reports_fkey', 'reports', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('violations', 'apartment_id', 'violations_apartment_id_apartments_fkey', 'apartments', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('notifications', 'user_id', 'notifications_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('audit_logs', 'admin_id', 'audit_logs_admin_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('appeals', 'landlord_id', 'appeals_landlord_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('appeals', 'report_id', 'appeals_report_id_reports_fkey', 'reports', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('appeals', 'violation_id', 'appeals_violation_id_violations_fkey', 'violations', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('appeals', 'admin_id', 'appeals_admin_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('report_evidence', 'report_id', 'report_evidence_report_id_reports_fkey', 'reports', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('report_evidence', 'uploaded_by', 'report_evidence_uploaded_by_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('report_audit_log', 'report_id', 'report_audit_log_report_id_reports_fkey', 'reports', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('report_audit_log', 'admin_id', 'report_audit_log_admin_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('report_responses', 'report_id', 'report_responses_report_id_reports_fkey', 'reports', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('report_responses', 'respondent_id', 'report_responses_respondent_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('report_responses', 'reviewed_by', 'report_responses_reviewed_by_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('report_duplicate_check', 'reporter_id', 'report_duplicate_check_reporter_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('report_duplicate_check', 'apartment_id', 'report_duplicate_check_apartment_id_apartments_fkey', 'apartments', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('support_tickets', 'user_id', 'support_tickets_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('support_tickets', 'assigned_admin_id', 'support_tickets_assigned_admin_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.app_users'::regclass
      and conname = 'app_users_auth_id_auth_users_fkey'
  ) then
    alter table public.app_users
      add constraint app_users_auth_id_auth_users_fkey
      foreign key (auth_id) references auth.users (id) on delete cascade not valid;
  end if;
end $$;

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
alter table public.apartment_verification_documents enable row level security;
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
alter table public.support_tickets enable row level security;

-- This master migration owns policies for these application tables. Clearing
-- them first keeps the file idempotent when policy definitions evolve.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'app_users', 'apartments', 'apartment_images', 'apartment_rooms',
        'apartment_views', 'favorites', 'reports', 'violations', 'notifications',
        'apartment_verification_documents',
        'signups', 'logins', 'student_profiles', 'employee_profiles',
        'landlord_profiles', 'admin_profiles', 'audit_logs', 'appeals',
        'report_evidence', 'report_audit_log', 'report_responses',
        'report_duplicate_check', 'support_tickets'
      ])
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Remove the former anonymous development policies before installing ownership rules.
drop policy if exists "dev_app_users_select" on public.app_users;
drop policy if exists "dev_app_users_insert" on public.app_users;
drop policy if exists "dev_app_users_update" on public.app_users;
drop policy if exists "dev_app_users_delete" on public.app_users;
drop policy if exists "dev_apartments_all" on public.apartments;
drop policy if exists "dev_apartment_images_all" on public.apartment_images;
drop policy if exists "dev_apartment_rooms_all" on public.apartment_rooms;
drop policy if exists "dev_apartment_views_all" on public.apartment_views;
drop policy if exists "dev_apartment_storage_all" on storage.objects;
drop policy if exists "apartment_storage_public_read" on storage.objects;
drop policy if exists "apartment_storage_owner_write" on storage.objects;
drop policy if exists "avatar_storage_public_read" on storage.objects;
drop policy if exists "avatar_storage_owner_write" on storage.objects;
drop policy if exists "evidence_storage_read_related" on storage.objects;
drop policy if exists "evidence_storage_create_reporter" on storage.objects;
drop policy if exists "evidence_storage_delete_admin" on storage.objects;
drop policy if exists "verification_storage_read_related" on storage.objects;
drop policy if exists "verification_storage_owner_write" on storage.objects;
drop policy if exists "dev_favorites_all" on public.favorites;
drop policy if exists "dev_reports_all" on public.reports;
drop policy if exists "dev_violations_all" on public.violations;
drop policy if exists "dev_notifications_all" on public.notifications;
drop policy if exists "dev_signups_all" on public.signups;
drop policy if exists "dev_logins_all" on public.logins;
drop policy if exists "dev_student_profiles_all" on public.student_profiles;
drop policy if exists "dev_employee_profiles_all" on public.employee_profiles;
drop policy if exists "dev_landlord_profiles_all" on public.landlord_profiles;
drop policy if exists "dev_admin_profiles_all" on public.admin_profiles;
drop policy if exists "dev_audit_logs_all" on public.audit_logs;
drop policy if exists "dev_appeals_all" on public.appeals;
drop policy if exists "dev_report_evidence_all" on public.report_evidence;
drop policy if exists "dev_report_audit_log_all" on public.report_audit_log;
drop policy if exists "dev_report_responses_all" on public.report_responses;
drop policy if exists "dev_report_duplicate_check_all" on public.report_duplicate_check;

create policy "app_users_read_authorized" on public.app_users for select to authenticated
  using (id = public.current_app_user_id() or public.current_user_is_admin());
create policy "app_users_update_own_or_admin" on public.app_users for update to authenticated
  using (id = public.current_app_user_id() or public.current_user_is_admin())
  with check (id = public.current_app_user_id() or public.current_user_is_admin());
create policy "app_users_delete_own_or_admin" on public.app_users for delete to authenticated
  using (id = public.current_app_user_id() or public.current_user_is_admin());

create policy "apartments_public_read" on public.apartments for select to anon
  using (public.apartment_is_tenant_visible(id));
create policy "apartments_authenticated_read" on public.apartments for select to authenticated
  using (public.apartment_is_tenant_visible(id) or landlord_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "apartments_owner_insert" on public.apartments for insert to authenticated
  with check (landlord_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "apartments_owner_update" on public.apartments for update to authenticated
  using (landlord_id = public.current_app_user_id() or public.current_user_is_admin())
  with check (landlord_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "apartments_owner_delete" on public.apartments for delete to authenticated
  using (landlord_id = public.current_app_user_id() or public.current_user_is_admin());

create policy "apartment_images_visible_listing" on public.apartment_images for select to anon, authenticated
  using (public.apartment_is_tenant_visible(apartment_id) or exists (select 1 from public.apartments a where a.id = apartment_id and (a.landlord_id = public.current_app_user_id() or public.current_user_is_admin())));
create policy "apartment_images_owner_write" on public.apartment_images for all to authenticated
  using (exists (select 1 from public.apartments a where a.id = apartment_id and (a.landlord_id = public.current_app_user_id() or public.current_user_is_admin())))
  with check (exists (select 1 from public.apartments a where a.id = apartment_id and (a.landlord_id = public.current_app_user_id() or public.current_user_is_admin())));

create policy "apartment_rooms_visible_listing" on public.apartment_rooms for select to anon, authenticated
  using (public.apartment_is_tenant_visible(apartment_id) or exists (select 1 from public.apartments a where a.id = apartment_id and (a.landlord_id = public.current_app_user_id() or public.current_user_is_admin())));
create policy "apartment_rooms_owner_write" on public.apartment_rooms for all to authenticated
  using (exists (select 1 from public.apartments a where a.id = apartment_id and (a.landlord_id = public.current_app_user_id() or public.current_user_is_admin())))
  with check (exists (select 1 from public.apartments a where a.id = apartment_id and (a.landlord_id = public.current_app_user_id() or public.current_user_is_admin())));

create policy "verification_documents_read_related" on public.apartment_verification_documents for select to authenticated
  using (landlord_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "verification_documents_owner_insert" on public.apartment_verification_documents for insert to authenticated
  with check (
    landlord_id = public.current_app_user_id()
    and exists (select 1 from public.apartments a where a.id = apartment_id and a.landlord_id = public.current_app_user_id())
  );
create policy "verification_documents_owner_update" on public.apartment_verification_documents for update to authenticated
  using (landlord_id = public.current_app_user_id() or public.current_user_is_admin())
  with check (landlord_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "verification_documents_owner_delete" on public.apartment_verification_documents for delete to authenticated
  using (landlord_id = public.current_app_user_id() or public.current_user_is_admin());

create policy "apartment_views_read_related" on public.apartment_views for select to authenticated
  using (viewer_id = public.current_app_user_id() or public.current_user_is_admin() or exists (select 1 from public.apartments a where a.id = apartment_id and a.landlord_id = public.current_app_user_id()));
create policy "apartment_views_record_self" on public.apartment_views for insert to authenticated
  with check (viewer_id = public.current_app_user_id());
create policy "apartment_views_update_self" on public.apartment_views for update to authenticated
  using (viewer_id = public.current_app_user_id()) with check (viewer_id = public.current_app_user_id());

create policy "favorites_read_related" on public.favorites for select to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin() or exists (select 1 from public.apartments a where a.id = apartment_id and a.landlord_id = public.current_app_user_id()));
create policy "favorites_manage_self" on public.favorites for all to authenticated
  using (user_id = public.current_app_user_id()) with check (user_id = public.current_app_user_id());

create policy "reports_read_related" on public.reports for select to authenticated
  using (reporter_id = public.current_app_user_id() or landlord_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "reports_create_self" on public.reports for insert to authenticated
  with check (reporter_id = public.current_app_user_id());
create policy "reports_admin_update" on public.reports for update to authenticated
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create policy "violations_read_related" on public.violations for select to authenticated
  using (landlord_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "violations_admin_write" on public.violations for all to authenticated
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create policy "notifications_read_own_or_admin" on public.notifications for select to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "notifications_update_own_or_admin" on public.notifications for update to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin())
  with check (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "notifications_delete_own_or_admin" on public.notifications for delete to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "notifications_create_authorized" on public.notifications for insert to authenticated
  with check (public.current_user_is_admin() or user_id = public.current_app_user_id() or exists (select 1 from public.app_users u where u.id = user_id and u.role = 'admin'));

create policy "signups_read_own_or_admin" on public.signups for select to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "signups_create_own" on public.signups for insert to authenticated
  with check (user_id = public.current_app_user_id());
create policy "logins_read_own_or_admin" on public.logins for select to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "logins_create_own" on public.logins for insert to authenticated
  with check (user_id = public.current_app_user_id());

create policy "student_profiles_own_or_admin" on public.student_profiles for all to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin())
  with check (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "employee_profiles_own_or_admin" on public.employee_profiles for all to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin())
  with check (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "landlord_profiles_read_own_or_admin" on public.landlord_profiles for select to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "landlord_profiles_write_own_or_admin" on public.landlord_profiles for all to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin())
  with check (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "admin_profiles_own_or_admin" on public.admin_profiles for all to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin())
  with check (user_id = public.current_app_user_id() or public.current_user_is_admin());

create policy "appeals_read_related" on public.appeals for select to authenticated
  using (landlord_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "appeals_create_self" on public.appeals for insert to authenticated
  with check (landlord_id = public.current_app_user_id());
create policy "appeals_admin_update" on public.appeals for update to authenticated
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy "appeals_delete_self_or_admin" on public.appeals for delete to authenticated
  using (landlord_id = public.current_app_user_id() or public.current_user_is_admin());

create policy "audit_logs_admin_read" on public.audit_logs for select to authenticated using (public.current_user_is_admin());
create policy "audit_logs_actor_insert" on public.audit_logs for insert to authenticated
  with check (admin_id = public.current_app_user_id() or public.current_user_is_admin());

drop policy if exists "report_evidence_reporter_view" on public.report_evidence;
drop policy if exists "report_evidence_reporter_insert" on public.report_evidence;
create policy "report_evidence_read_related" on public.report_evidence for select to authenticated
  using (exists (select 1 from public.reports r where r.id = report_id and (r.reporter_id = public.current_app_user_id() or r.landlord_id = public.current_app_user_id() or public.current_user_is_admin())));
create policy "report_evidence_create_reporter" on public.report_evidence for insert to authenticated
  with check (uploaded_by = public.current_app_user_id() and exists (select 1 from public.reports r where r.id = report_id and r.reporter_id = public.current_app_user_id()));
create policy "report_evidence_admin_delete" on public.report_evidence for delete to authenticated using (public.current_user_is_admin());

create policy "report_audit_read_related" on public.report_audit_log for select to authenticated
  using (exists (select 1 from public.reports r where r.id = report_id and (r.reporter_id = public.current_app_user_id() or r.landlord_id = public.current_app_user_id() or public.current_user_is_admin())));
create policy "report_audit_admin_insert" on public.report_audit_log for insert to authenticated with check (public.current_user_is_admin());
create policy "report_responses_read_related" on public.report_responses for select to authenticated
  using (respondent_id = public.current_app_user_id() or public.current_user_is_admin() or exists (select 1 from public.reports r where r.id = report_id and r.reporter_id = public.current_app_user_id()));
create policy "report_responses_create_self" on public.report_responses for insert to authenticated with check (respondent_id = public.current_app_user_id());
create policy "report_responses_admin_update" on public.report_responses for update to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy "duplicate_checks_read_self" on public.report_duplicate_check for select to authenticated using (reporter_id = public.current_app_user_id() or public.current_user_is_admin());

create policy "support_tickets_read_related" on public.support_tickets for select to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "support_tickets_create_self" on public.support_tickets for insert to authenticated
  with check (user_id = public.current_app_user_id());
create policy "support_tickets_admin_update" on public.support_tickets for update to authenticated
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- Public assets are readable; uploads and deletes remain ownership-scoped.
create policy "apartment_storage_public_read" on storage.objects for select to anon, authenticated using (bucket_id = 'apartment-images');
create policy "apartment_storage_owner_write" on storage.objects for all to authenticated
  using (bucket_id = 'apartment-images' and (public.current_user_is_admin() or exists (select 1 from public.apartments a where a.id::text = (storage.foldername(name))[1] and a.landlord_id = public.current_app_user_id())))
  with check (bucket_id = 'apartment-images' and (public.current_user_is_admin() or exists (select 1 from public.apartments a where a.id::text = (storage.foldername(name))[1] and a.landlord_id = public.current_app_user_id())));
create policy "avatar_storage_public_read" on storage.objects for select to anon, authenticated using (bucket_id = 'user-avatars');
create policy "avatar_storage_owner_write" on storage.objects for all to authenticated
  using (bucket_id = 'user-avatars' and (public.current_user_is_admin() or (storage.foldername(name))[1] = public.current_app_user_id()::text))
  with check (bucket_id = 'user-avatars' and (public.current_user_is_admin() or (storage.foldername(name))[1] = public.current_app_user_id()::text));
create policy "evidence_storage_read_related" on storage.objects for select to authenticated
  using (bucket_id = 'report-evidence' and exists (select 1 from public.reports r where r.id::text = (storage.foldername(name))[1] and (r.reporter_id = public.current_app_user_id() or r.landlord_id = public.current_app_user_id() or public.current_user_is_admin())));
create policy "evidence_storage_create_reporter" on storage.objects for insert to authenticated
  with check (bucket_id = 'report-evidence' and exists (select 1 from public.reports r where r.id::text = (storage.foldername(name))[1] and r.reporter_id = public.current_app_user_id()));
create policy "evidence_storage_delete_admin" on storage.objects for delete to authenticated
  using (bucket_id = 'report-evidence' and exists (select 1 from public.reports r where r.id::text = (storage.foldername(name))[1] and (r.reporter_id = public.current_app_user_id() or public.current_user_is_admin())));
create policy "verification_storage_read_related" on storage.objects for select to authenticated
  using (bucket_id = 'verification-documents' and (public.current_user_is_admin() or (storage.foldername(name))[1] = public.current_app_user_id()::text));
create policy "verification_storage_owner_write" on storage.objects for all to authenticated
  using (bucket_id = 'verification-documents' and (public.current_user_is_admin() or (storage.foldername(name))[1] = public.current_app_user_id()::text))
  with check (bucket_id = 'verification-documents' and (public.current_user_is_admin() or (storage.foldername(name))[1] = public.current_app_user_id()::text));

-- Keep dashboards synchronized across sessions and browser tabs.
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['app_users', 'apartments', 'apartment_images', 'apartment_rooms', 'apartment_views', 'favorites', 'reports', 'violations', 'notifications', 'apartment_verification_documents', 'appeals', 'audit_logs', 'support_tickets'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- SECTION 8: PERMISSIONS & GRANTS
-- =============================================================================

grant usage on schema public to postgres, anon, authenticated, service_role;
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;
grant select on public.apartments, public.apartment_images, public.apartment_rooms to anon;
grant select on public.public_landlords to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema public grant execute on functions to authenticated, service_role;

grant execute on function public.fn_mark_notification_read(uuid) to authenticated, service_role;
grant execute on function public.fn_mark_all_notifications_read(uuid) to authenticated, service_role;
grant execute on function public.fn_get_unread_notification_count(uuid) to authenticated, service_role;
grant execute on function public.fn_merge_user_preference_section(uuid, text, jsonb) to authenticated, service_role;
revoke execute on function public.fn_set_landlord_verification(uuid, boolean) from public, anon;
grant execute on function public.fn_set_landlord_verification(uuid, boolean) to authenticated, service_role;
revoke execute on function public.fn_set_apartment_publication(uuid, boolean) from public, anon;
grant execute on function public.fn_set_apartment_publication(uuid, boolean) to authenticated, service_role;
grant execute on function public.apartment_is_tenant_visible(uuid) to anon, authenticated, service_role;
grant execute on function public.get_public_landlords() to anon, authenticated, service_role;
grant execute on function public.fn_delete_my_account() to authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;

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

-- Reconcile approvals written by older clients to landlord_profiles or legacy
-- text fields before app_users.is_verified became authoritative. The normal
-- verification trigger creates the persistent notification and refreshes
-- owned listings for every repaired landlord.
update public.app_users landlord
set is_verified = true,
    status = 'verified',
    verification_status = 'verified',
    landlord_status = 'verified',
    updated_at = now()
from public.landlord_profiles profile
where landlord.id = profile.user_id
  and landlord.role = 'landlord'
  and landlord.is_verified = false
  and (
    profile.is_verified = true
    or lower(coalesce(landlord.status, '')) in ('verified', 'approved')
    or lower(coalesce(landlord.verification_status, '')) in ('verified', 'approved')
    or lower(coalesce(landlord.landlord_status, '')) in ('verified', 'approved')
  );

insert into public.notifications (
  user_id, type, title, message, payload, read, is_deleted
)
select
  landlord.id,
  'verification_approved',
  'Account Verified',
  'Your landlord account has been verified by the Admin. You can now publish and manage apartment listings.',
  jsonb_build_object('action', 'verification_approved', 'verified', true, 'backfilled', true),
  false,
  false
from public.app_users landlord
where landlord.role = 'landlord'
  and landlord.is_verified = true
  and not exists (
    select 1
    from public.notifications notification
    where notification.user_id = landlord.id
      and notification.type = 'verification_approved'
  );

update public.app_users set
  signup_source = coalesce(nullif(signup_source, ''), 'web'),
  verification_status = case when role = 'landlord' and is_verified then 'verified' when role = 'landlord' then 'pending' else coalesce(nullif(verification_status, ''), 'verified') end,
  landlord_status = case when role = 'landlord' then case when is_verified then 'verified' else coalesce(nullif(status, ''), 'pending') end else landlord_status end;

update public.landlord_profiles profile
set is_verified = landlord.is_verified,
    verified_at = case when landlord.is_verified then coalesce(profile.verified_at, now()) else null end,
    updated_at = now()
from public.app_users landlord
where landlord.id = profile.user_id
  and landlord.role = 'landlord'
  and profile.is_verified is distinct from landlord.is_verified;

-- =============================================================================
-- MIGRATION COMPLETE ✓
-- All tables, triggers, functions, and policies have been created/updated.
-- Safe to re-run. RLS "always true" warnings are expected for dev policies.
-- =============================================================================
