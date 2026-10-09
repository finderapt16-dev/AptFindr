-- AptFindr business-permit renewal and expiry automation
--
-- Run this in the Supabase SQL Editor in TWO PHASES:
--   1. Run everything through the "SCHEDULER" heading.
--   2. Confirm/correct the permit year for every existing verified landlord,
--      then run the scheduler block at the end.
--
-- This migration does not delete landlords, apartments, documents, rooms,
-- images, or existing notifications. It adds an immutable permit-history
-- source of truth and records every automation action so retries are safe.
--
-- Important: this creates IN-APP notifications. Sending email/SMS needs an
-- Edge Function or an email provider; never put a service-role key in React.

begin;

create extension if not exists pgcrypto;

-- Fail early if this is run against the wrong project or an incomplete schema.
do $$
begin
  if to_regclass('public.app_users') is null
     or to_regclass('public.landlord_profiles') is null
     or to_regclass('public.apartments') is null
     or to_regclass('public.notifications') is null
     or to_regclass('public.audit_logs') is null then
    raise exception 'Required AptFindr tables are missing. Run this only in the AptFindr Supabase project.';
  end if;
end;
$$;

-- `permit_expiry` is a legacy date used by the current UI. The timestamp below
-- is the new authoritative value and is always timezone-aware.
alter table public.landlord_profiles
  add column if not exists business_permit_year integer,
  add column if not exists permit_expiration_at timestamptz,
  add column if not exists permit_renewal_status text;

-- A permit is valid through 11:59:59 PM Manila time on December 31. Storing
-- the following midnight as an exclusive timestamp avoids an ambiguous
-- "11:59 PM" second and makes the January 1 12:00 AM job exact.
create or replace function public.fn_business_permit_expires_at(p_permit_year integer)
returns timestamptz
language sql
immutable
set search_path = public
as $$
  select make_timestamptz(p_permit_year + 1, 1, 1, 0, 0, 0, 'Asia/Manila');
$$;

create table if not exists public.landlord_permit_renewals (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.app_users(id) on delete cascade,
  permit_number text not null,
  permit_year integer not null check (permit_year between 2000 and 2100),
  permit_issued_at date,
  document_path text not null,
  document_name text,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'requires_changes', 'rejected', 'expired')),
  admin_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.app_users(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists landlord_permit_renewals_landlord_year_idx
  on public.landlord_permit_renewals (landlord_id, permit_year desc, submitted_at desc);
create index if not exists landlord_permit_renewals_review_queue_idx
  on public.landlord_permit_renewals (status, submitted_at)
  where status = 'pending_review';
-- A landlord can resubmit a rejected/request-changes permit, but only one
-- approved permit can cover any one permit year.
create unique index if not exists landlord_permit_renewals_one_approved_year
  on public.landlord_permit_renewals (landlord_id, permit_year)
  where status = 'approved';

create or replace function public.fn_apply_business_permit_expiry()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.permit_number := nullif(trim(new.permit_number), '');
  new.document_path := nullif(trim(new.document_path), '');
  if new.permit_number is null or new.document_path is null then
    raise exception 'Permit number and permit document are required.';
  end if;
  new.expires_at := public.fn_business_permit_expires_at(new.permit_year);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_apply_business_permit_expiry on public.landlord_permit_renewals;
create trigger trg_apply_business_permit_expiry
before insert or update of permit_number, permit_year, document_path, status
on public.landlord_permit_renewals
for each row execute function public.fn_apply_business_permit_expiry();

-- One row per landlord/year/action. This is the idempotency key for cron job
-- retries, and retains the actual notification-delivery result separately
-- from whether a landlord has read the notification.
create table if not exists public.permit_automation_events (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.app_users(id) on delete cascade,
  permit_year integer not null check (permit_year between 2000 and 2100),
  event_type text not null check (event_type in ('first_reminder', 'final_reminder', 'expired_unpublished', 'listings_restored')),
  notification_status text not null default 'pending'
    check (notification_status in ('pending', 'processing', 'notification_created', 'notification_failed')),
  landlord_notification_id uuid,
  admin_notification_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  last_error text,
  attempted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (landlord_id, permit_year, event_type)
);

create index if not exists permit_automation_events_monitoring_idx
  on public.permit_automation_events (permit_year, event_type, notification_status);

-- This table is deliberately separate from apartments. It records only a
-- permit-expiration unpublish and preserves the prior published state, making
-- safe restoration possible without overwriting manual/admin changes.
create table if not exists public.permit_expiration_unpublishes (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  landlord_id uuid not null references public.app_users(id) on delete cascade,
  permit_renewal_id uuid not null references public.landlord_permit_renewals(id) on delete restrict,
  previous_is_published boolean not null,
  reason text not null default 'Business Permit Expired',
  unpublished_at timestamptz not null default now(),
  restored_at timestamptz,
  restoration_attempted_at timestamptz,
  restoration_result text,
  restored_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (apartment_id, permit_renewal_id)
);

create index if not exists permit_expiration_unpublishes_restore_idx
  on public.permit_expiration_unpublishes (landlord_id, restored_at)
  where restored_at is null;

-- Security helpers use the existing app_users.id/auth_id bridge. They keep
-- tenant accounts away from private permit documents even when RLS is enabled.
create or replace function public.fn_current_user_has_role(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users as account
    where (account.id = auth.uid() or account.auth_id = auth.uid())
      -- app_users.role is an app_user_role enum in this project, while this
      -- reusable helper receives a text array.
      and account.role::text = any(p_roles)
  );
$$;

create or replace function public.fn_current_user_owns_landlord(p_landlord_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users as account
    where account.id = p_landlord_id
      and (account.id = auth.uid() or account.auth_id = auth.uid())
      and account.role = 'landlord'
  );
$$;

alter table public.landlord_permit_renewals enable row level security;
alter table public.permit_automation_events enable row level security;
alter table public.permit_expiration_unpublishes enable row level security;

drop policy if exists landlord_permit_renewals_select on public.landlord_permit_renewals;
create policy landlord_permit_renewals_select
on public.landlord_permit_renewals for select to authenticated
using (
  public.fn_current_user_owns_landlord(landlord_id)
  or public.fn_current_user_has_role(array['admin'])
);

drop policy if exists landlord_permit_renewals_submit on public.landlord_permit_renewals;
create policy landlord_permit_renewals_submit
on public.landlord_permit_renewals for insert to authenticated
with check (
  public.fn_current_user_owns_landlord(landlord_id)
  and status = 'pending_review'
);

drop policy if exists permit_automation_events_admin_read on public.permit_automation_events;
create policy permit_automation_events_admin_read
on public.permit_automation_events for select to authenticated
using (public.fn_current_user_has_role(array['admin']));

drop policy if exists permit_expiration_unpublishes_select on public.permit_expiration_unpublishes;
create policy permit_expiration_unpublishes_select
on public.permit_expiration_unpublishes for select to authenticated
using (
  public.fn_current_user_owns_landlord(landlord_id)
  or public.fn_current_user_has_role(array['admin'])
);

-- A UI can call this after uploading a permit to the existing private
-- verification-documents bucket. It cannot set an approved status.
create or replace function public.fn_submit_business_permit_renewal(
  p_permit_number text,
  p_permit_year integer,
  p_permit_issued_at date,
  p_document_path text,
  p_document_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_landlord_id uuid;
  v_renewal_id uuid;
  v_manila_year integer := extract(year from now() at time zone 'Asia/Manila')::integer;
begin
  select account.id into v_landlord_id
  from public.app_users as account
  where (account.id = auth.uid() or account.auth_id = auth.uid())
    and account.role = 'landlord';

  if v_landlord_id is null then
    raise exception 'Only the signed-in landlord may submit a business-permit renewal.';
  end if;
  if p_permit_year < v_manila_year then
    raise exception 'A renewal cannot be submitted for a past permit year.';
  end if;

  insert into public.landlord_permit_renewals (
    landlord_id, permit_number, permit_year, permit_issued_at,
    document_path, document_name, status
  ) values (
    v_landlord_id, p_permit_number, p_permit_year, p_permit_issued_at,
    p_document_path, p_document_name, 'pending_review'
  ) returning id into v_renewal_id;

  return v_renewal_id;
end;
$$;

-- Create/retry an event without creating duplicate notification records.
create or replace function public.fn_prepare_permit_automation_event(
  p_landlord_id uuid,
  p_permit_year integer,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.permit_automation_events%rowtype;
begin
  insert into public.permit_automation_events (
    landlord_id, permit_year, event_type, notification_status, payload, attempted_at
  ) values (
    p_landlord_id, p_permit_year, p_event_type, 'processing', coalesce(p_payload, '{}'::jsonb), now()
  ) on conflict (landlord_id, permit_year, event_type) do nothing
  returning * into v_event;

  if v_event.id is null then
    select * into v_event
    from public.permit_automation_events
    where landlord_id = p_landlord_id
      and permit_year = p_permit_year
      and event_type = p_event_type
    for update;

    if v_event.notification_status = 'notification_created' then
      return v_event.id;
    end if;

    update public.permit_automation_events
    set notification_status = 'processing',
        payload = coalesce(p_payload, payload),
        attempted_at = now(),
        last_error = null,
        updated_at = now()
    where id = v_event.id
    returning * into v_event;
  end if;

  return v_event.id;
end;
$$;

-- Delivers one landlord copy and one independent monitoring copy per admin.
-- If the job retries, payload.permit_event_id finds the existing copies first.
create or replace function public.fn_deliver_permit_automation_event(
  p_event_id uuid,
  p_landlord_title text,
  p_landlord_message text,
  p_admin_title text,
  p_admin_message text,
  p_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.permit_automation_events%rowtype;
  v_landlord_notification_id uuid;
  v_payload jsonb;
  v_admin_count integer := 0;
begin
  select * into v_event
  from public.permit_automation_events
  where id = p_event_id
  for update;
  if not found then
    raise exception 'Permit automation event % was not found.', p_event_id;
  end if;

  v_payload := coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
    'permit_event_id', p_event_id::text,
    'landlord_id', v_event.landlord_id,
    'permit_year', v_event.permit_year,
    'event_type', v_event.event_type,
    'notification_status', 'Notification Created'
  );

  select notification.id into v_landlord_notification_id
  from public.notifications as notification
  where notification.user_id = v_event.landlord_id
    and notification.payload @> jsonb_build_object('permit_event_id', p_event_id::text)
  order by notification.created_at
  limit 1;

  if v_landlord_notification_id is null then
    insert into public.notifications (
      user_id, type, title, message, payload, read,
      action_url, action_target_id, action_target_type
    ) values (
      v_event.landlord_id,
      'business_permit_' || v_event.event_type,
      p_landlord_title,
      p_landlord_message,
      v_payload,
      false,
      '/landlord/dashboard?section=notifications',
      v_event.landlord_id,
      'landlord'
    ) returning id into v_landlord_notification_id;
  end if;

  -- Admin notifications are only created after the landlord notification is
  -- successfully persisted. "Notification Created" never means "read".
  insert into public.notifications (
    user_id, type, title, message, payload, read,
    action_url, action_target_id, action_target_type
  )
  select
    administrator.id,
    'business_permit_' || v_event.event_type || '_admin',
    p_admin_title,
    p_admin_message,
    v_payload || jsonb_build_object('recipient_role', 'admin'),
    false,
    '/admin?section=landlords',
    v_event.landlord_id,
    'landlord'
  from public.app_users as administrator
  where administrator.role = 'admin'
    and not exists (
      select 1 from public.notifications as existing
      where existing.user_id = administrator.id
        and existing.payload @> jsonb_build_object('permit_event_id', p_event_id::text)
    );
  get diagnostics v_admin_count = row_count;

  update public.permit_automation_events
  set notification_status = 'notification_created',
      landlord_notification_id = v_landlord_notification_id,
      admin_notification_count = (
        select count(*) from public.notifications as notification
        join public.app_users as account on account.id = notification.user_id
        where account.role = 'admin'
          and notification.payload @> jsonb_build_object('permit_event_id', p_event_id::text)
      ),
      payload = v_payload,
      completed_at = now(),
      updated_at = now(),
      last_error = null
  where id = p_event_id;
  return true;
exception when others then
  update public.permit_automation_events
  set notification_status = 'notification_failed',
      last_error = sqlerrm,
      attempted_at = now(),
      updated_at = now()
  where id = p_event_id;
  return false;
end;
$$;

create or replace function public.fn_permit_renewal_status(p_landlord_id uuid, p_permit_year integer)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from public.landlord_permit_renewals where landlord_id = p_landlord_id and permit_year = p_permit_year and status = 'approved') then 'Approved'
    when exists (select 1 from public.landlord_permit_renewals where landlord_id = p_landlord_id and permit_year = p_permit_year and status = 'pending_review') then 'Pending Review'
    when exists (select 1 from public.landlord_permit_renewals where landlord_id = p_landlord_id and permit_year = p_permit_year and status = 'requires_changes') then 'Requires Changes'
    when exists (select 1 from public.landlord_permit_renewals where landlord_id = p_landlord_id and permit_year = p_permit_year and status = 'rejected') then 'Requires Changes'
    else 'Awaiting Renewal'
  end;
$$;

create or replace function public.fn_send_business_permit_reminders(p_event_type text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_year integer := extract(year from now() at time zone 'Asia/Manila')::integer;
  v_next_year integer := v_current_year + 1;
  v_permit record;
  v_event_id uuid;
  v_landlord_title text;
  v_landlord_message text;
  v_admin_title text;
  v_admin_message text;
  v_landlord_name text;
  v_apartment_names text;
  v_status text;
  v_sent integer := 0;
begin
  if p_event_type not in ('first_reminder', 'final_reminder') then
    raise exception 'Unsupported reminder event type: %', p_event_type;
  end if;

  for v_permit in
    select permit.*
    from public.landlord_permit_renewals as permit
    where permit.status = 'approved'
      and permit.permit_year = v_current_year
      and not exists (
        select 1 from public.landlord_permit_renewals as next_permit
        where next_permit.landlord_id = permit.landlord_id
          and next_permit.permit_year = v_next_year
          and next_permit.status = 'approved'
      )
  loop
    select coalesce(account.name, 'Landlord') into v_landlord_name
    from public.app_users as account where account.id = v_permit.landlord_id;
    select coalesce(string_agg(apartment.title, ', ' order by apartment.title), 'No apartments')
      into v_apartment_names
    from public.apartments as apartment
    where apartment.landlord_id = v_permit.landlord_id;
    v_status := public.fn_permit_renewal_status(v_permit.landlord_id, v_next_year);

    if p_event_type = 'first_reminder' then
      v_landlord_title := 'Business Permit Expiration Reminder';
      v_landlord_message := 'Your business permit will expire on December 31 at 11:59 PM. Please renew your business permit and upload the updated document before the expiration date to keep your apartment listings published.';
      v_admin_title := 'Business Permit Expiration — Landlord Notified';
      v_admin_message := format('The business permit of %s will expire on December 31, %s. An automatic renewal reminder has been sent to the landlord. Please monitor their renewal status.', v_landlord_name, v_current_year);
    else
      v_landlord_title := 'Final Business Permit Renewal Reminder';
      v_landlord_message := 'Your business permit will expire in approximately 3 days. Please upload your renewed business permit before December 31 at 11:59 PM to prevent your apartment listings from being automatically unpublished.';
      v_admin_title := 'Final Permit Reminder — Landlord Notified';
      v_admin_message := format('The business permit of %s will expire on December 31, %s. A final renewal reminder has been sent to the landlord. Please monitor their renewal status before automatic apartment unpublishing.', v_landlord_name, v_current_year);
    end if;

    v_event_id := public.fn_prepare_permit_automation_event(
      v_permit.landlord_id, v_current_year, p_event_type,
      jsonb_build_object(
        'landlord_name', v_landlord_name,
        'apartment_names', v_apartment_names,
        'expiration_at', public.fn_business_permit_expires_at(v_current_year),
        'reminder_sent_at', now(),
        'renewal_status', v_status
      )
    );
    if public.fn_deliver_permit_automation_event(v_event_id, v_landlord_title, v_landlord_message, v_admin_title, v_admin_message,
      jsonb_build_object('landlord_name', v_landlord_name, 'apartment_names', v_apartment_names, 'expiration_at', public.fn_business_permit_expires_at(v_current_year), 'renewal_status', v_status)) then
      v_sent := v_sent + 1;
    end if;
  end loop;
  return v_sent;
end;
$$;

create or replace function public.fn_expire_business_permits_and_unpublish()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_year integer := extract(year from now() at time zone 'Asia/Manila')::integer;
  v_permit record;
  v_event_id uuid;
  v_landlord_name text;
  v_apartment_names text;
  v_unpublished_count integer;
  v_processed integer := 0;
begin
  -- The daily reconciliation uses the Manila calendar year. It catches a
  -- missed January 1 execution while still leaving a current approved permit
  -- untouched.
  for v_permit in
    select distinct on (permit.landlord_id) permit.*
    from public.landlord_permit_renewals as permit
    where permit.status in ('approved', 'expired')
      and permit.permit_year < v_current_year
      and not exists (
        select 1 from public.landlord_permit_renewals as current_permit
        where current_permit.landlord_id = permit.landlord_id
          and current_permit.status = 'approved'
          and current_permit.permit_year >= v_current_year
      )
    order by permit.landlord_id, permit.permit_year desc, permit.reviewed_at desc nulls last
  loop
    update public.landlord_permit_renewals
    set status = 'expired', updated_at = now()
    where id = v_permit.id and status = 'approved';

    with recorded as (
      insert into public.permit_expiration_unpublishes (
        apartment_id, landlord_id, permit_renewal_id, previous_is_published
      )
      select apartment.id, apartment.landlord_id, v_permit.id, apartment.is_published
      from public.apartments as apartment
      where apartment.landlord_id = v_permit.landlord_id
        and apartment.is_published = true
        and coalesce(apartment.is_archived, false) = false
        and apartment.deleted_at is null
      on conflict (apartment_id, permit_renewal_id) do nothing
      returning apartment_id
    ), changed as (
      update public.apartments as apartment
      set is_published = false,
          published_at = null,
          published_by = null
      from recorded
      where apartment.id = recorded.apartment_id
      returning apartment.id, apartment.title
    ), logged as (
      insert into public.audit_logs (admin_id, action, target_type, target_id, details)
      select null, 'apartment_unpublished_business_permit_expired', 'apartment', changed.id,
        jsonb_build_object('landlord_id', v_permit.landlord_id, 'permit_renewal_id', v_permit.id, 'permit_year', v_permit.permit_year, 'reason', 'Business Permit Expired', 'automated_at', now())
      from changed
      returning id
    )
    select count(*), coalesce(string_agg(changed.title, ', ' order by changed.title), 'No apartments')
      into v_unpublished_count, v_apartment_names
    from changed;

    select coalesce(account.name, 'Landlord') into v_landlord_name
    from public.app_users as account where account.id = v_permit.landlord_id;
    v_event_id := public.fn_prepare_permit_automation_event(
      v_permit.landlord_id, v_permit.permit_year, 'expired_unpublished',
      jsonb_build_object('landlord_name', v_landlord_name, 'apartment_names', v_apartment_names, 'unpublished_count', v_unpublished_count, 'expiration_at', public.fn_business_permit_expires_at(v_permit.permit_year), 'renewal_status', 'Expired')
    );
    perform public.fn_deliver_permit_automation_event(
      v_event_id,
      'Apartment Listings Unpublished — Expired Business Permit',
      'Your business permit expired on December 31 at 11:59 PM. Your published apartment listings have been automatically unpublished. Please upload your renewed business permit for administrator verification to restore eligible listings.',
      'Apartments Automatically Unpublished — Permit Expired',
      format('The business permit of %s has expired. %s published apartment listing(s) were automatically unpublished because no approved renewal was available.', v_landlord_name, v_unpublished_count),
      jsonb_build_object('landlord_name', v_landlord_name, 'apartment_names', v_apartment_names, 'unpublished_count', v_unpublished_count, 'expiration_at', public.fn_business_permit_expires_at(v_permit.permit_year), 'renewal_status', 'Expired')
    );
    v_processed := v_processed + 1;
  end loop;
  return v_processed;
end;
$$;

-- Restore only listings that this automation un-published and that still meet
-- the existing published-listing conditions. It never republishes an archived,
-- deleted, rejected, non-available, or roomless listing.
create or replace function public.fn_restore_permit_expired_apartments(
  p_landlord_id uuid,
  p_approved_permit_year integer,
  p_actor_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restored integer := 0;
begin
  update public.permit_expiration_unpublishes as record
  set restoration_attempted_at = now(),
      restoration_result = 'not_restored_not_eligible'
  from public.apartments as apartment
  where record.apartment_id = apartment.id
    and record.landlord_id = p_landlord_id
    and record.restored_at is null
    and not (
      apartment.is_published = false
      and apartment.approval_status = 'approved'
      and apartment.status = 'available'
      and coalesce(apartment.is_archived, false) = false
      and apartment.deleted_at is null
      and exists (
        select 1 from public.apartment_rooms as room
        where room.apartment_id = apartment.id
          and coalesce(room.status, case when coalesce(room.is_occupied, false) then 'occupied' else 'available' end) = 'available'
          and coalesce(room.is_occupied, false) = false
      )
    );

  with eligible as (
    select record.id as record_id, record.apartment_id
    from public.permit_expiration_unpublishes as record
    join public.apartments as apartment on apartment.id = record.apartment_id
    where record.landlord_id = p_landlord_id
      and record.restored_at is null
      and apartment.is_published = false
      and apartment.approval_status = 'approved'
      and apartment.status = 'available'
      and coalesce(apartment.is_archived, false) = false
      and apartment.deleted_at is null
      and exists (
        select 1 from public.apartment_rooms as room
        where room.apartment_id = apartment.id
          and coalesce(room.status, case when coalesce(room.is_occupied, false) then 'occupied' else 'available' end) = 'available'
          and coalesce(room.is_occupied, false) = false
      )
  ), republished as (
    update public.apartments as apartment
    set is_published = true,
        published_at = now(),
        published_by = p_actor_id
    from eligible
    where apartment.id = eligible.apartment_id
    returning eligible.record_id, apartment.id
  )
  update public.permit_expiration_unpublishes as record
  set restored_at = now(),
      restored_by = p_actor_id,
      restoration_attempted_at = now(),
      restoration_result = 'restored_after_permit_approval'
  from republished
  where record.id = republished.record_id;

  get diagnostics v_restored = row_count;
  return v_restored;
end;
$$;

-- The admin UI must call this RPC for a review decision. A landlord cannot
-- approve a permit or change an already-approved permit year themselves.
create or replace function public.fn_review_business_permit_renewal(
  p_renewal_id uuid,
  p_decision text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_renewal public.landlord_permit_renewals%rowtype;
  v_restored integer := 0;
  v_landlord_name text;
begin
  select account.id into v_admin_id
  from public.app_users as account
  where (account.id = auth.uid() or account.auth_id = auth.uid())
    and account.role = 'admin';
  if v_admin_id is null then
    raise exception 'Only an administrator can review a business permit renewal.';
  end if;
  if p_decision not in ('approved', 'requires_changes', 'rejected') then
    raise exception 'Invalid renewal decision.';
  end if;

  select * into v_renewal from public.landlord_permit_renewals where id = p_renewal_id for update;
  if not found then raise exception 'Permit renewal was not found.'; end if;
  if v_renewal.status <> 'pending_review' then raise exception 'Only a pending permit renewal can be reviewed.'; end if;

  update public.landlord_permit_renewals
  set status = p_decision,
      admin_note = nullif(trim(p_admin_note), ''),
      reviewed_at = now(),
      reviewed_by = v_admin_id,
      updated_at = now()
  where id = p_renewal_id
  returning * into v_renewal;

  if p_decision = 'approved' then
    update public.landlord_profiles
    set permit_number = v_renewal.permit_number,
        business_permit_number = v_renewal.permit_number,
        permit_issued_at = v_renewal.permit_issued_at,
        -- Keep the legacy date column aligned with the date shown in the UI;
        -- expires_at itself is the authoritative Jan 1 midnight cutoff.
        permit_expiry = make_date(v_renewal.permit_year, 12, 31),
        verification_document_url = v_renewal.document_path,
        business_permit_year = v_renewal.permit_year,
        permit_expiration_at = v_renewal.expires_at,
        permit_renewal_status = 'approved'
    where user_id = v_renewal.landlord_id;
    v_restored := public.fn_restore_permit_expired_apartments(v_renewal.landlord_id, v_renewal.permit_year, v_admin_id);
  else
    update public.landlord_profiles
    set permit_renewal_status = p_decision
    where user_id = v_renewal.landlord_id;
  end if;

  select coalesce(name, 'Landlord') into v_landlord_name from public.app_users where id = v_renewal.landlord_id;
  insert into public.notifications (user_id, type, title, message, payload, read, action_url, action_target_id, action_target_type)
  values (
    v_renewal.landlord_id,
    'business_permit_renewal_' || p_decision,
    case p_decision when 'approved' then 'Business Permit Renewal Approved' when 'requires_changes' then 'Business Permit Renewal Requires Changes' else 'Business Permit Renewal Rejected' end,
    case p_decision when 'approved' then 'Your renewed business permit has been approved. Eligible apartment listings affected by permit expiration have been restored.' when 'requires_changes' then 'Your renewed business permit needs changes. Please review the administrator note and submit an updated document.' else 'Your renewed business permit was rejected. Please review the administrator note and submit a corrected document.' end,
    jsonb_build_object('renewal_id', v_renewal.id, 'permit_year', v_renewal.permit_year, 'status', p_decision, 'admin_note', v_renewal.admin_note, 'restored_apartment_count', v_restored),
    false, '/landlord/dashboard?section=notifications', v_renewal.id, 'permit_renewal'
  );
  insert into public.audit_logs (admin_id, action, target_type, target_id, details)
  values (v_admin_id, 'business_permit_renewal_' || p_decision, 'permit_renewal', v_renewal.id,
    jsonb_build_object('landlord_id', v_renewal.landlord_id, 'landlord_name', v_landlord_name, 'permit_year', v_renewal.permit_year, 'restored_apartment_count', v_restored));

  return jsonb_build_object('renewal_id', v_renewal.id, 'status', p_decision, 'permit_year', v_renewal.permit_year, 'expires_at', v_renewal.expires_at, 'restored_apartment_count', v_restored);
end;
$$;

-- Lock down automation functions: cron runs as the database owner; only the
-- two user-facing RPCs are callable from the browser.
revoke all on function public.fn_prepare_permit_automation_event(uuid, integer, text, jsonb) from public;
revoke all on function public.fn_deliver_permit_automation_event(uuid, text, text, text, text, jsonb) from public;
revoke all on function public.fn_send_business_permit_reminders(text) from public;
revoke all on function public.fn_expire_business_permits_and_unpublish() from public;
revoke all on function public.fn_restore_permit_expired_apartments(uuid, integer, uuid) from public;
grant execute on function public.fn_submit_business_permit_renewal(text, integer, date, text, text) to authenticated;
grant execute on function public.fn_review_business_permit_renewal(uuid, text, text) to authenticated;

commit;

-- --------------------------------------------------------------------------
-- EXISTING VERIFIED PERMITS: CHECK BEFORE ENABLING CRON
-- --------------------------------------------------------------------------
-- Do NOT guess a historical permit year from an arbitrary old expiry date.
-- Review this result, then insert each confirmed existing approved permit via
-- the helper below. This is required for existing landlords (such as Noel).
select
  account.id as landlord_id,
  account.name,
  account.email,
  profile.business_permit_number,
  profile.permit_number,
  profile.permit_issued_at,
  profile.permit_expiry,
  profile.verification_document_url,
  profile.is_verified,
  profile.business_permit_year
from public.app_users as account
join public.landlord_profiles as profile on profile.user_id = account.id
where account.role = 'landlord'
  and profile.is_verified = true
  and not exists (
    select 1 from public.landlord_permit_renewals as renewal
    where renewal.landlord_id = account.id and renewal.status = 'approved'
  )
order by account.name;

-- Example ONLY: replace every <...> value with the real verified document
-- data. Run one statement per landlord after an admin confirms the permit year.
-- insert into public.landlord_permit_renewals
--   (landlord_id, permit_number, permit_year, permit_issued_at, document_path, status, reviewed_at)
-- values
--   ('<landlord app_users.id>'::uuid, '<permit number>', 2026, '<issue date>'::date, '<storage path>', 'approved', now());

-- --------------------------------------------------------------------------
-- SCHEDULER: RUN ONLY AFTER THE ABOVE REVIEW IS COMPLETE
-- --------------------------------------------------------------------------
-- Enable the pg_cron extension first in Supabase Dashboard > Database >
-- Extensions if it is not already enabled. Jobs are written in UTC:
--   Nov 30 23:59 Asia/Manila = Nov 30 15:59 UTC
--   Dec 28 23:59 Asia/Manila = Dec 28 15:59 UTC
--   Jan  1 00:00 Asia/Manila = Dec 31 16:00 UTC
-- The daily reconciliation runs at 00:05 Asia/Manila (16:05 UTC).
--
-- create extension if not exists pg_cron;
-- select cron.unschedule(jobid) from cron.job
-- where jobname in (
--   'aptfindr-permit-first-reminder',
--   'aptfindr-permit-final-reminder',
--   'aptfindr-permit-expiry',
--   'aptfindr-permit-daily-reconciliation'
-- );
-- select cron.schedule('aptfindr-permit-first-reminder', '59 15 30 11 *', $$select public.fn_send_business_permit_reminders('first_reminder');$$);
-- select cron.schedule('aptfindr-permit-final-reminder', '59 15 28 12 *', $$select public.fn_send_business_permit_reminders('final_reminder');$$);
-- select cron.schedule('aptfindr-permit-expiry', '0 16 31 12 *', $$select public.fn_expire_business_permits_and_unpublish();$$);
-- select cron.schedule('aptfindr-permit-daily-reconciliation', '5 16 * * *', $$select public.fn_expire_business_permits_and_unpublish();$$);

-- Read-only monitoring queries for the Admin Notifications/verification UI:
-- select event.*, account.name as landlord_name, notification.read as landlord_notification_read
-- from public.permit_automation_events event
-- join public.app_users account on account.id = event.landlord_id
-- left join public.notifications notification on notification.id = event.landlord_notification_id
-- order by event.created_at desc;
