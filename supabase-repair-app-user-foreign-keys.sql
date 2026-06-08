-- Repair old foreign keys that still point at a legacy public.users table.
-- Run this once in Supabase SQL Editor after the main schema.
--
-- Why this exists:
-- CREATE TABLE IF NOT EXISTS does not change constraints on tables that already
-- exist. If apartments.landlord_id was originally created as REFERENCES users(id),
-- new listing inserts will fail even after app_users is created.

create or replace function pg_temp.ensure_public_fk(
  child_table text,
  child_column text,
  constraint_name text,
  parent_table text,
  parent_column text,
  on_delete_sql text,
  on_delete_code "char"
)
returns void
language plpgsql
as $$
declare
  fk record;
  has_expected_fk boolean := false;
begin
  for fk in
    select
      c.conname,
      pn.nspname as parent_schema,
      pt.relname as parent_table,
      pa.attname as parent_column,
      c.confdeltype as delete_code
    from pg_constraint c
    join pg_class ct on ct.oid = c.conrelid
    join pg_namespace cn on cn.oid = ct.relnamespace
    join unnest(c.conkey) with ordinality child_cols(attnum, ord) on true
    join pg_attribute ca on ca.attrelid = c.conrelid and ca.attnum = child_cols.attnum
    join pg_class pt on pt.oid = c.confrelid
    join pg_namespace pn on pn.oid = pt.relnamespace
    join unnest(c.confkey) with ordinality parent_cols(attnum, ord) on parent_cols.ord = child_cols.ord
    join pg_attribute pa on pa.attrelid = c.confrelid and pa.attnum = parent_cols.attnum
    where c.contype = 'f'
      and cn.nspname = 'public'
      and ct.relname = child_table
      and ca.attname = child_column
  loop
    if fk.parent_schema = 'public'
      and fk.parent_table = parent_table
      and fk.parent_column = parent_column
      and fk.delete_code = on_delete_code then
      has_expected_fk := true;
    else
      execute format('alter table public.%I drop constraint %I', child_table, fk.conname);
    end if;
  end loop;

  if not has_expected_fk then
    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.%I (%I) on delete %s not valid',
      child_table,
      constraint_name,
      child_column,
      parent_table,
      parent_column,
      on_delete_sql
    );
  end if;
end;
$$;

select pg_temp.ensure_public_fk('signups', 'user_id', 'signups_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('logins', 'user_id', 'logins_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('student_profiles', 'user_id', 'student_profiles_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('employee_profiles', 'user_id', 'employee_profiles_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('landlord_profiles', 'user_id', 'landlord_profiles_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('admin_profiles', 'user_id', 'admin_profiles_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');

select pg_temp.ensure_public_fk('apartments', 'landlord_id', 'apartments_landlord_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('apartment_images', 'apartment_id', 'apartment_images_apartment_id_apartments_fkey', 'apartments', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('apartment_rooms', 'apartment_id', 'apartment_rooms_apartment_id_apartments_fkey', 'apartments', 'id', 'cascade', 'c');

select pg_temp.ensure_public_fk('favorites', 'user_id', 'favorites_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('favorites', 'apartment_id', 'favorites_apartment_id_apartments_fkey', 'apartments', 'id', 'cascade', 'c');

select pg_temp.ensure_public_fk('reports', 'reporter_id', 'reports_reporter_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('reports', 'user_id', 'reports_user_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('reports', 'apartment_id', 'reports_apartment_id_apartments_fkey', 'apartments', 'id', 'set null', 'n');

select pg_temp.ensure_public_fk('violations', 'landlord_id', 'violations_landlord_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('violations', 'admin_id', 'violations_admin_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('violations', 'related_report_id', 'violations_related_report_id_reports_fkey', 'reports', 'id', 'set null', 'n');

select pg_temp.ensure_public_fk('notifications', 'user_id', 'notifications_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('audit_logs', 'admin_id', 'audit_logs_admin_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');

-- Optional diagnostics. These should return 0 rows for new listings to save.
select 'apartments missing app_users landlord' as check_name, a.id, a.landlord_id
from public.apartments a
left join public.app_users u on u.id = a.landlord_id
where u.id is null;

select 'favorites missing app_users user' as check_name, f.id, f.user_id
from public.favorites f
left join public.app_users u on u.id = f.user_id
where u.id is null;
