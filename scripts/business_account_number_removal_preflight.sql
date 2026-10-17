-- Business Account Number removal preflight (read-only).
--
-- Run this in the target Supabase project's SQL editor before any schema
-- change. It does not alter tables, functions, policies, views, or data.
-- The repository has no migration that defines either candidate column, so a
-- target-project dependency audit is required before a specific DROP COLUMN
-- statement can be safely written or executed.

-- 1. Identify only candidate columns. `account_number` is included solely to
-- detect legacy Business Account Number schemas; do not remove it unless the
-- result confirms it belongs to that field.
select
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and column_name in ('business_account_number', 'account_number')
order by table_name, column_name;

-- 2. List constraints and indexes that mention either candidate column.
select
  n.nspname as schema_name,
  c.relname as table_name,
  con.conname as dependency_name,
  con.contype as dependency_type,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and pg_get_constraintdef(con.oid) ~* '\m(business_account_number|account_number)\M'
union all
select
  n.nspname,
  c.relname,
  i.relname,
  'index',
  pg_get_indexdef(i.oid)
from pg_index idx
join pg_class c on c.oid = idx.indrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_class i on i.oid = idx.indexrelid
where n.nspname = 'public'
  and pg_get_indexdef(i.oid) ~* '\m(business_account_number|account_number)\M'
order by table_name, dependency_name;

-- 3. List views, materialized views, functions, and trigger definitions that
-- reference either candidate. Review every returned dependency before removal.
select
  n.nspname as schema_name,
  c.relname as object_name,
  c.relkind as object_kind,
  pg_get_viewdef(c.oid, true) as definition
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('v', 'm')
  and pg_get_viewdef(c.oid, true) ~* '\m(business_account_number|account_number)\M'
union all
select
  n.nspname,
  p.proname,
  'function',
  pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and pg_get_functiondef(p.oid) ~* '\m(business_account_number|account_number)\M'
union all
select
  n.nspname,
  c.relname || '.' || t.tgname,
  'trigger',
  pg_get_triggerdef(t.oid, true)
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and n.nspname = 'public'
  and pg_get_triggerdef(t.oid, true) ~* '\m(business_account_number|account_number)\M'
order by object_kind, object_name;

-- 4. Inspect row-level-security policies that refer to the candidate names.
select
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and coalesce(qual, '') || ' ' || coalesce(with_check, '') ~* '\m(business_account_number|account_number)\M'
order by tablename, policyname;

-- Manual removal template -- deliberately commented out and NOT a deployed
-- Supabase migration. Replace the identifiers only after the audit above
-- returns no dependencies (or after those dependencies are explicitly
-- migrated and tested). Back up/export the column first if its historical
-- values must be retained.
--
-- begin;
-- alter table public.<confirmed_table>
--   drop column <confirmed_business_account_column>;
-- commit;
