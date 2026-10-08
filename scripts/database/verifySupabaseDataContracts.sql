-- AptFindr read-only Supabase contract verification.
-- Run in the SQL Editor of the same Supabase project as the app. This script
-- does not modify data, schema, RLS policies, storage, or authentication.

-- 1) Verify the exact table names used by audit and report-response features.
select
  candidate.table_name,
  case when tables.table_name is null then 'MISSING' else 'EXISTS' end as status
from (values
  ('audit_log'),
  ('audit_logs'),
  ('report_response'),
  ('report_responses'),
  ('support_tickets'),
  ('platform_status'),
  ('maintenance_history')
) as candidate(table_name)
left join information_schema.tables as tables
  on tables.table_schema = 'public'
 and tables.table_name = candidate.table_name
order by candidate.table_name;

-- 2) List installed versions/signatures of every RPC used by the current app.
select
  procedures.proname as function_name,
  pg_get_function_identity_arguments(procedures.oid) as arguments,
  pg_get_function_result(procedures.oid) as returns,
  has_function_privilege('authenticated', procedures.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc as procedures
join pg_namespace as namespaces on namespaces.oid = procedures.pronamespace
where namespaces.nspname = 'public'
  and procedures.proname in (
    'fn_set_apartment_publication',
    'get_apartment_detail_access_state',
    'fn_merge_user_preference_section',
    'fn_get_tenant_preference_analytics',
    'fn_notify_admins_of_property_submission',
    'fn_submit_appeal_followup',
    'fn_delete_my_account',
    'fn_generate_backup_codes',
    'fn_consume_backup_code',
    'fn_resolve_username_login'
  )
order by procedures.proname, arguments;

-- 3) Identify expected RPCs that are missing altogether.
with expected(function_name) as (
  values
    ('fn_set_apartment_publication'),
    ('get_apartment_detail_access_state'),
    ('fn_merge_user_preference_section'),
    ('fn_get_tenant_preference_analytics'),
    ('fn_notify_admins_of_property_submission'),
    ('fn_submit_appeal_followup'),
    ('fn_delete_my_account'),
    ('fn_generate_backup_codes'),
    ('fn_consume_backup_code'),
    ('fn_resolve_username_login')
)
select expected.function_name,
       case when exists (
         select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = expected.function_name
       ) then 'EXISTS' else 'MISSING' end as status
from expected
order by expected.function_name;

-- 4) Inspect RLS and policies for the unresolved database contracts.
select class.relname as table_name,
       class.relrowsecurity as rls_enabled,
       class.relforcerowsecurity as rls_forced
from pg_class as class
join pg_namespace as namespace on namespace.oid = class.relnamespace
where namespace.nspname = 'public'
  and class.relname in ('audit_log', 'audit_logs', 'report_response', 'report_responses', 'support_tickets', 'platform_status');

select tablename, policyname, cmd, roles, qual as using_expression, with_check as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename in ('audit_log', 'audit_logs', 'report_response', 'report_responses', 'support_tickets', 'platform_status')
order by tablename, policyname;

-- 5) Verify the storage buckets and policies required by upload flows.
select id as bucket_id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('apartment-images', 'verification-documents', 'report-evidence', 'user-avatars')
order by id;

select policyname, cmd, roles, qual as using_expression, with_check as with_check_expression
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

-- 6) Verify Realtime coverage for tables that the frontend subscribes to.
select pubname as publication_name, schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename in (
    'apartments', 'apartment_rooms', 'apartment_images', 'apartment_views',
    'favorites', 'apartment_ratings', 'notifications', 'reports', 'violations',
    'appeals', 'app_users', 'platform_status'
  )
order by tablename;
