-- =============================================================================
-- NOTIFICATION SYSTEM ENHANCEMENTS
-- Add Appeals Table & Auto-Notification Triggers
-- =============================================================================

-- Add notification type enum (if not exists)
do $$ begin
  create type public.appeal_status as enum ('pending', 'under_review', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

-- =============================================================================
-- APPEALS TABLE
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

-- =============================================================================
-- AUTO-NOTIFICATION TRIGGERS
-- =============================================================================

-- Trigger: Create notification when a report is filed against landlord's listing
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
  -- Get landlord ID from the reported apartment
  select landlord_id, title into v_landlord_id, v_apartment_title
  from public.apartments
  where id = new.apartment_id;
  
  if v_landlord_id is not null then
    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      payload
    ) values (
      v_landlord_id,
      'property_reported',
      'Property Report Filed',
      'Your listing "' || coalesce(v_apartment_title, 'Property') || '" has been reported',
      jsonb_build_object(
        'report_id', new.id,
        'apartment_id', new.apartment_id,
        'apartment_title', v_apartment_title,
        'reason', new.reason,
        'severity', new.severity,
        'issue_type', new.issue_type
      )
    );
  end if;
  
  return new;
end;
$$;

drop trigger if exists trg_notify_landlord_on_report on public.reports;
create trigger trg_notify_landlord_on_report
  after insert on public.reports
  for each row execute function public.fn_notify_landlord_on_report();

-- Trigger: Create notification when violation is issued
create or replace function public.fn_notify_landlord_on_violation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    payload
  ) values (
    new.landlord_id,
    'violation_issued',
    'Account Notice: ' || coalesce(new.type, 'Violation'),
    new.message,
    jsonb_build_object(
      'violation_id', new.id,
      'mode', new.mode,
      'type', new.type,
      'expires_at', new.expires_at,
      'related_report_id', new.related_report_id
    )
  );
  
  return new;
end;
$$;

drop trigger if exists trg_notify_landlord_on_violation on public.violations;
create trigger trg_notify_landlord_on_violation
  after insert on public.violations
  for each row execute function public.fn_notify_landlord_on_violation();

-- Trigger: Create notification when appeal is submitted
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
  -- Get landlord name
  select name into v_landlord_name
  from public.app_users
  where id = new.landlord_id;
  
  -- Get all admin user IDs
  select array_agg(id) into v_admin_ids
  from public.app_users
  where role = 'admin';
  
  -- Create notification for all admins
  if v_admin_ids is not null and array_length(v_admin_ids, 1) > 0 then
    foreach v_admin_id in array v_admin_ids loop
      insert into public.notifications (
        user_id,
        type,
        title,
        message,
        payload
      ) values (
        v_admin_id,
        'appeal_submitted',
        'New Appeal Submitted',
        'Landlord ' || coalesce(v_landlord_name, 'Unknown') || ' submitted an appeal',
        jsonb_build_object(
          'appeal_id', new.id,
          'landlord_id', new.landlord_id,
          'landlord_name', v_landlord_name,
          'report_id', new.report_id,
          'violation_id', new.violation_id,
          'reason', new.reason
        )
      );
    end loop;
  end if;
  
  return new;
end;
$$;

drop trigger if exists trg_notify_admin_on_appeal on public.appeals;
create trigger trg_notify_admin_on_appeal
  after insert on public.appeals
  for each row execute function public.fn_notify_admin_on_appeal();

-- Trigger: Notify landlord when appeal status changes
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
      when 'under_review' then
        v_status_messages := 'Your appeal is now under review by our team.';
      when 'approved' then
        v_status_messages := 'Good news! Your appeal has been approved.';
      when 'rejected' then
        v_status_messages := 'Your appeal has been reviewed and rejected.';
      else
        v_status_messages := 'Your appeal status has been updated.';
    end case;
    
    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      payload
    ) values (
      new.landlord_id,
      'appeal_status_updated',
      'Appeal Status Updated',
      v_status_messages,
      jsonb_build_object(
        'appeal_id', new.id,
        'status', new.status,
        'admin_response', new.admin_response,
        'reviewed_at', new.reviewed_at
      )
    );
  end if;
  
  return new;
end;
$$;

drop trigger if exists trg_notify_landlord_on_appeal_status on public.appeals;
create trigger trg_notify_landlord_on_appeal_status
  before update on public.appeals
  for each row execute function public.fn_notify_landlord_on_appeal_status();

-- Trigger: Update appeals table timestamp
drop trigger if exists trg_appeals_updated_at on public.appeals;
create trigger trg_appeals_updated_at
  before update on public.appeals
  for each row execute function public.app_set_timestamp();

-- =============================================================================
-- ENABLE RLS AND SET POLICIES
-- =============================================================================

alter table public.appeals enable row level security;

drop policy if exists "dev_appeals_all" on public.appeals;
create policy "dev_appeals_all" on public.appeals for all to anon, authenticated using (true) with check (true);

-- Grant permissions
grant select, insert, update, delete on public.appeals to anon, authenticated, service_role;

-- =============================================================================
-- Add columns to notifications table for enhanced functionality
-- =============================================================================

alter table public.notifications add column if not exists action_url text;
alter table public.notifications add column if not exists action_target_id uuid;
alter table public.notifications add column if not exists action_target_type text;
alter table public.notifications add column if not exists read_at timestamptz;

-- Update trigger to set read_at when notification is marked as read
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

drop trigger if exists trg_notification_read_timestamp on public.notifications;
create trigger trg_notification_read_timestamp
  before update on public.notifications
  for each row execute function public.fn_notification_read_timestamp();

-- =============================================================================
-- Create helper function to mark notification as read
-- =============================================================================

create or replace function public.fn_mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_updated int;
begin
  update public.notifications
  set read = true
  where id = p_notification_id;
  
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- =============================================================================
-- Create helper function to mark all notifications as read for a user
-- =============================================================================

create or replace function public.fn_mark_all_notifications_read(p_user_id uuid)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_updated int;
begin
  update public.notifications
  set read = true
  where user_id = p_user_id and read = false;
  
  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

-- =============================================================================
-- Create helper function to get unread notification count
-- =============================================================================

create or replace function public.fn_get_unread_notification_count(p_user_id uuid)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.notifications
  where user_id = p_user_id and read = false;
  
  return v_count;
end;
$$;

-- Grant execute permissions on functions
grant execute on function public.fn_mark_notification_read(uuid) to anon, authenticated, service_role;
grant execute on function public.fn_mark_all_notifications_read(uuid) to anon, authenticated, service_role;
grant execute on function public.fn_get_unread_notification_count(uuid) to anon, authenticated, service_role;

-- =============================================================================
-- Done!
-- =============================================================================
