-- =============================================================================
-- REPORT EVIDENCE SYSTEM — Add to existing Apartment Finder PWA schema
-- =============================================================================
-- This script adds support for:
-- - Evidence/attachment uploads for reports (images, documents, etc.)
-- - Report audit logs for tracking actions and duplicate detection
-- - Report responses from landlords
-- - Submission tracking for duplicate prevention

-- =============================================================================
-- NEW TABLES
-- =============================================================================

-- Report Evidence: Stores uploaded files, images, documents for reports
create table if not exists public.report_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text not null, -- 'image', 'document', 'screenshot'
  mime_type text,          -- e.g., 'image/jpeg', 'application/pdf'
  file_size integer,       -- size in bytes
  uploaded_by uuid references public.app_users (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_report_evidence_report on public.report_evidence (report_id);
create index if not exists idx_report_evidence_uploaded_by on public.report_evidence (uploaded_by);

-- Report Audit Log: Track all actions on reports for investigation history
create table if not exists public.report_audit_log (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  admin_id uuid references public.app_users (id) on delete set null,
  action text not null, -- 'submitted', 'reviewed', 'escalated', 'resolved', 'dismissed', 'landlord_notified', 'response_received'
  description text,
  changes jsonb default '{}'::jsonb, -- stores what was changed
  created_at timestamptz not null default now()
);

create index if not exists idx_report_audit_log_report on public.report_audit_log (report_id);
create index if not exists idx_report_audit_log_admin on public.report_audit_log (admin_id);
create index if not exists idx_report_audit_log_created_at on public.report_audit_log (created_at);

-- Report Responses: Landlord responses or appeals to reports
create table if not exists public.report_responses (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  respondent_id uuid not null references public.app_users (id) on delete cascade,
  response_text text not null,
  response_type text not null default 'appeal', -- 'appeal', 'clarification'
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.app_users (id) on delete set null,
  reviewed_at timestamptz,
  status text not null default 'pending', -- 'pending', 'approved', 'rejected'
  created_at timestamptz not null default now()
);

create index if not exists idx_report_responses_report on public.report_responses (report_id);
create index if not exists idx_report_responses_respondent on public.report_responses (respondent_id);

-- Report Duplicate Check: Track reports to prevent spam
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

-- =============================================================================
-- COLUMNS TO ADD TO EXISTING TABLES
-- =============================================================================

-- Add to reports table
alter table public.reports add column if not exists category text; -- main category
alter table public.reports add column if not exists date_of_incident date; -- when the issue occurred
alter table public.reports add column if not exists landlord_id uuid references public.app_users (id) on delete set null;
alter table public.reports add column if not exists has_evidence boolean not null default false; -- quick check
alter table public.reports add column if not exists evidence_count integer default 0;
alter table public.reports add column if not exists last_action_at timestamptz default now(); -- for tracking recent activity
alter table public.reports add column if not exists reviewed_by uuid references public.app_users (id) on delete set null;
alter table public.reports add column if not exists reviewed_at timestamptz;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

create index if not exists idx_reports_category on public.reports (category);
create index if not exists idx_reports_landlord on public.reports (landlord_id);
create index if not exists idx_reports_has_evidence on public.reports (has_evidence);
create index if not exists idx_reports_last_action_at on public.reports (last_action_at);
create index if not exists idx_reports_reviewed_by on public.reports (reviewed_by);

-- =============================================================================
-- TRIGGER FUNCTIONS FOR AUDIT TRAIL
-- =============================================================================

-- Automatically create audit log entry when report is submitted
create or replace function public.create_report_audit_on_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.report_audit_log (report_id, action, description)
  values (
    new.id,
    'submitted',
    'Report submitted by ' || coalesce(new.reporter_role, 'user')
  );
  return new;
end;
$$;

drop trigger if exists trg_create_report_audit_on_insert on public.reports;
create trigger trg_create_report_audit_on_insert
  after insert on public.reports
  for each row execute function public.create_report_audit_on_insert();

-- Update report_duplicate_check when report is submitted
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

drop trigger if exists trg_update_duplicate_check_on_report on public.reports;
create trigger trg_update_duplicate_check_on_report
  after insert on public.reports
  for each row execute function public.update_duplicate_check_on_report();

-- =============================================================================
-- VIEWS FOR ADMIN DASHBOARD
-- =============================================================================

-- View for reports with evidence count and latest activity
drop view if exists public.reports_with_evidence cascade;
create view public.reports_with_evidence as
select
  r.id,
  r.reporter_id,
  r.apartment_id,
  r.landlord_id,
  r.category,
  r.issue_type,
  r.details,
  r.severity,
  r.status,
  r.submitted_at,
  r.last_action_at,
  r.reviewed_by,
  r.reviewed_at,
  coalesce(e.evidence_count, 0) as evidence_count,
  au.name as reporter_name,
  au.email as reporter_email,
  apt.title as apartment_title,
  apt.address as apartment_address,
  ll.name as landlord_name
from public.reports r
left join public.app_users au on r.reporter_id = au.id
left join public.apartments apt on r.apartment_id = apt.id
left join public.app_users ll on r.landlord_id = ll.id
left join (
  select report_id, count(*) as evidence_count
  from public.report_evidence
  group by report_id
) e on r.id = e.report_id;

-- =============================================================================
-- POLICIES (RLS - Row Level Security)
-- =============================================================================

-- Evidence can be viewed by:
-- 1. The reporter who uploaded it
-- 2. Admins
-- 3. The landlord (if reviewing the report about their apartment)

alter table public.report_evidence enable row level security;

drop policy if exists "report_evidence_reporter_view" on public.report_evidence;
create policy "report_evidence_reporter_view"
  on public.report_evidence for select
  using (
    auth.uid()::uuid = uploaded_by or
    (select role from public.app_users where id = auth.uid()::uuid limit 1) = 'admin' or
    (select landlord_id from public.reports where id = report_id) = auth.uid()::uuid
  );

drop policy if exists "report_evidence_reporter_insert" on public.report_evidence;
create policy "report_evidence_reporter_insert"
  on public.report_evidence for insert
  with check (
    auth.uid()::uuid = uploaded_by
  );

-- Audit logs are view-only for admins and involved parties
alter table public.report_audit_log enable row level security;

drop policy if exists "report_audit_log_view" on public.report_audit_log;
create policy "report_audit_log_view"
  on public.report_audit_log for select
  using (
    (select role from public.app_users where id = auth.uid()::uuid limit 1) = 'admin' or
    (select reporter_id from public.reports where id = report_id) = auth.uid()::uuid or
    (select landlord_id from public.reports where id = report_id) = auth.uid()::uuid
  );

-- Report responses policies
alter table public.report_responses enable row level security;

drop policy if exists "report_responses_view" on public.report_responses;
create policy "report_responses_view"
  on public.report_responses for select
  using (
    (select role from public.app_users where id = auth.uid()::uuid limit 1) = 'admin' or
    auth.uid()::uuid = respondent_id or
    (select reporter_id from public.reports where id = report_id) = auth.uid()::uuid
  );

drop policy if exists "report_responses_insert" on public.report_responses;
create policy "report_responses_insert"
  on public.report_responses for insert
  with check (
    auth.uid()::uuid = respondent_id and
    (select landlord_id from public.reports where id = report_id) = auth.uid()::uuid
  );

-- =============================================================================
-- STORAGE CONFIGURATION
-- =============================================================================
-- Note: Run these separately in Supabase Storage section:
-- 1. Create bucket: report-evidence (private)
-- 2. Add policy for upload:
--    - For authenticated users to upload their own files
-- 3. Add policy for download:
--    - For users to download evidence from their own reports or if they're admins
