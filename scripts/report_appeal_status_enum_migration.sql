-- Run this file FIRST and let it complete/commit before running
-- appeal_workflow_migration.sql. The current database uses enum report_status,
-- so the new state-machine values must exist before the application can write
-- pending_review or any appeal workflow status.

do $$
declare
  status_type regtype;
  status_kind "char";
  value text;
begin
  select a.atttypid::regtype, t.typtype
    into status_type, status_kind
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_type t on t.oid = a.atttypid
  where n.nspname = 'public' and c.relname = 'reports' and a.attname = 'status' and not a.attisdropped;

  if status_kind = 'e' then
    foreach value in array array[
      'pending_review', 'dismissed', 'awaiting_landlord_appeal', 'under_appeal',
      'appeal_period_expired', 'evidence_deadline_expired',
      'appeal_dismissed_pending_final_decision', 'resolved_appeal_approved', 'resolved'
    ] loop
      execute format('alter type %s add value if not exists %L', status_type, value);
    end loop;
  end if;

  select a.atttypid::regtype, t.typtype
    into status_type, status_kind
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_type t on t.oid = a.atttypid
  where n.nspname = 'public' and c.relname = 'appeals' and a.attname = 'status' and not a.attisdropped;

  if status_kind = 'e' then
    foreach value in array array[
      'pending_review', 'more_evidence_requested', 'additional_evidence_submitted',
      'evidence_deadline_expired', 'approved', 'dismissed', 'resolved'
    ] loop
      execute format('alter type %s add value if not exists %L', status_type, value);
    end loop;
  end if;
end;
$$;
