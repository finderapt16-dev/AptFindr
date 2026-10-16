-- Notify active Super Admins when a new tenant or landlord account is created.
-- This applies only to future app_users inserts; existing accounts are not backfilled.

begin;

do $$
begin
  if to_regclass('public.app_users') is null
     or to_regclass('public.notifications') is null then
    raise exception 'Required account notification tables are missing.';
  end if;
end;
$$;

create or replace function public.fn_notify_super_admins_of_new_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_role text := regexp_replace(lower(trim(new.role::text)), '[ -]+', '_', 'g');
  v_role_label text;
  v_account_name text;
begin
  if v_account_role is null or v_account_role not in ('tenant', 'landlord') then
    return new;
  end if;

  v_role_label := case v_account_role
    when 'landlord' then 'Landlord'
    else 'Tenant'
  end;
  v_account_name := coalesce(
    nullif(trim(new.name), ''),
    nullif(trim(new.email), ''),
    'New user'
  );

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    payload,
    read,
    action_url,
    action_target_id,
    action_target_type
  )
  select
    administrator.id,
    'account_created',
    format('New %s Account Created', v_role_label),
    format(
      '%s created a new %s account and is now available in User Management.',
      v_account_name,
      lower(v_role_label)
    ),
    jsonb_build_object(
      'event', 'account_created',
      'category', 'accounts',
      'user_id', new.id,
      'user_name', v_account_name,
      'user_email', new.email,
      'user_role', v_account_role,
      'account_status', new.status,
      'created_at', coalesce(new.created_at, now())
    ),
    false,
    '/super-admin?section=users',
    new.id,
    'user'
  from public.app_users administrator
  where regexp_replace(lower(trim(administrator.role::text)), '[ -]+', '_', 'g') = 'super_admin'
    and coalesce(lower(trim(administrator.status::text)), 'active')
      not in ('disabled', 'inactive', 'deactivated', 'deleted')
    and not exists (
      select 1
      from public.notifications existing
      where existing.user_id = administrator.id
        and existing.type = 'account_created'
        and existing.payload ->> 'user_id' = new.id::text
    );

  return new;
end;
$$;

drop trigger if exists trg_notify_super_admins_of_new_account on public.app_users;
create trigger trg_notify_super_admins_of_new_account
after insert on public.app_users
for each row execute function public.fn_notify_super_admins_of_new_account();

revoke all on function public.fn_notify_super_admins_of_new_account() from public;
revoke all on function public.fn_notify_super_admins_of_new_account() from anon, authenticated;

commit;
