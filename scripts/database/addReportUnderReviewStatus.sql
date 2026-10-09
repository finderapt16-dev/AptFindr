-- Enable the Under Review report workflow without removing existing status rules.
-- Run in the Supabase SQL editor for the project's database.
do $$
declare
  v_status_attnum smallint;
  v_type_schema text;
  v_type_name text;
  v_type_kind "char";
  v_constraint record;
begin
  select a.attnum, n.nspname, t.typname, t.typtype
    into v_status_attnum, v_type_schema, v_type_name, v_type_kind
  from pg_attribute a
  join pg_type t on t.oid = a.atttypid
  join pg_namespace n on n.oid = t.typnamespace
  where a.attrelid = 'public.reports'::regclass and a.attname = 'status' and not a.attisdropped;
  if v_status_attnum is null then
    raise exception 'public.reports.status was not found.';
  end if;

  if v_type_kind = 'E' then
    execute format('alter type %I.%I add value if not exists %L', v_type_schema, v_type_name, 'under_review');
  end if;

  -- Only widen checks on the status column alone. Other report checks stay intact.
  for v_constraint in
    select conname, pg_get_expr(conbin, conrelid) as expression
    from pg_constraint
    where conrelid = 'public.reports'::regclass and contype = 'c'
      and conkey = array[v_status_attnum]::smallint[]
  loop
    if position('under_review' in v_constraint.expression) = 0 then
      execute format('alter table public.reports drop constraint %I', v_constraint.conname);
      execute format('alter table public.reports add constraint %I check ((%s) or status::text = %L)',
        v_constraint.conname, v_constraint.expression, 'under_review');
    end if;
  end loop;
end;
$$;
