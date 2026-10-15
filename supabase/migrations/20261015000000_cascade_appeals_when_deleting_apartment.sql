-- A landlord can delete a listing even when it has related appeal records.
-- Keep appeals tied to their listing's lifecycle instead of blocking removal.
do $$
declare
  appeal_fk record;
begin
  for appeal_fk in
    select constraint_name
    from information_schema.key_column_usage
    where table_schema = 'public'
      and table_name = 'appeals'
      and column_name = 'apartment_id'
      and position_in_unique_constraint is not null
  loop
    execute format(
      'alter table public.appeals drop constraint %I',
      appeal_fk.constraint_name
    );
  end loop;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appeals'
      and column_name = 'apartment_id'
  ) then
    alter table public.appeals
      add constraint appeals_apartment_id_fkey
      foreign key (apartment_id)
      references public.apartments(id)
      on delete cascade;
  end if;
end $$;
