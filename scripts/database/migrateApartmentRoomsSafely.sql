-- AptFindr apartment_rooms: safe, non-destructive alignment migration.
-- Review diagnoseApartmentRooms.sql output before running this script.
--
-- This script intentionally does NOT:
-- - delete room records;
-- - drop the legacy price column;
-- - alter RLS policies; or
-- - change any UI or application code.
--
-- The current frontend uses rent as the canonical monthly-room-rent column.

begin;

-- 1) Preserve legacy values only when the application column is empty.
-- This is safe for the screenshot schema where both price and rent exist.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'apartment_rooms'
      and column_name = 'price'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'apartment_rooms'
      and column_name = 'rent'
  ) then
    execute $sql$
      update public.apartment_rooms
      set rent = price
      where rent is null
        and price is not null
    $sql$;
  end if;
end
$$;

-- 2) The UI fetches rooms by apartment_id frequently. This index is safe to
-- create repeatedly and improves Manage Rooms, property details, and admin use.
create index if not exists apartment_rooms_apartment_id_idx
  on public.apartment_rooms (apartment_id);

-- 3) Enable database-change events used by ManageRooms.jsx without adding the
-- table twice to the Supabase realtime publication.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'apartment_rooms'
     ) then
    alter publication supabase_realtime add table public.apartment_rooms;
  end if;
end
$$;

commit;

-- OPTIONAL, DO NOT RUN UNTIL THE DIAGNOSTIC HAS RETURNED ZERO DIFFERENCES
-- AND YOU HAVE CHECKED DATABASE VIEWS, FUNCTIONS, TRIGGERS, AND POLICIES:
--
-- alter table public.apartment_rooms drop column price;
--
-- Keep is_occupied. Although it overlaps with status, the current AptFindr
-- frontend selects and writes both values, so removing it would break room
-- availability, landlord dashboard counts, and nested apartment queries.
--
-- RLS is intentionally not changed here. If loading or saving still fails,
-- run diagnoseApartmentRooms.sql and use the returned policies plus the exact
-- Supabase error message to prepare a policy-specific migration.
