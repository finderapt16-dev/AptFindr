-- Run the entire file in Supabase SQL Editor.
-- Live RPC error: 0A000, DELETE is not allowed in a non-volatile function.
-- Preserve the resolver's implementation (including any rate limiting),
-- security mode, owner, grants, and all table policies.
begin;

alter function public.fn_resolve_username_login(text) volatile;

-- Exercise the resolver as a signed-out caller. This must succeed before
-- committing; if a nested function also needs correction, the error rolls
-- back this transaction rather than reporting a successful repair.
set local role anon;
select public.fn_resolve_username_login('diagnostic_nonexistent_user') is null
  as unknown_username_rejected;
reset role;

notify pgrst, 'reload schema';
commit;

select p.provolatile = 'v' as username_lookup_allows_writes
from pg_proc p
where p.oid = 'public.fn_resolve_username_login(text)'::regprocedure;
