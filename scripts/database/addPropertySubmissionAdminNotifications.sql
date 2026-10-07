-- Run once in the Supabase SQL Editor.
--
-- Landlords submit a property from the browser, while notifications belong to
-- administrator accounts. This security-definer function validates ownership
-- server-side and creates one unread notification for each administrator.

begin;

create or replace function public.fn_notify_admins_of_property_submission(
    p_apartment_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_apartment public.apartments%rowtype;
    v_landlord public.app_users%rowtype;
    v_created_count integer := 0;
begin
    select apartment.*
    into v_apartment
    from public.apartments as apartment
    join public.app_users as landlord on landlord.id = apartment.landlord_id
    where apartment.id = p_apartment_id
      and (landlord.auth_id = auth.uid() or landlord.id = auth.uid());

    if not found then
        raise exception 'You can only notify administrators about your own property submission.';
    end if;

    select *
    into v_landlord
    from public.app_users
    where id = v_apartment.landlord_id;

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
        'property_submitted',
        'New property awaiting review',
        coalesce(v_landlord.name, 'A landlord') || ' submitted "' || coalesce(v_apartment.title, 'a property') || '" with verification details for review.',
        jsonb_build_object(
            'action', 'property_submitted',
            'category', 'landlord',
            'landlord_id', v_landlord.id,
            'landlord_name', coalesce(v_landlord.name, 'Landlord'),
            'property_id', v_apartment.id,
            'property_name', coalesce(v_apartment.title, 'Property'),
            'submitted_at', now()
        ),
        false,
        '/admin/apartment/' || v_apartment.id,
        v_apartment.id,
        'apartment'
    from public.app_users as administrator
    where administrator.role = 'admin'
      and not exists (
          select 1
          from public.notifications as existing
          where existing.user_id = administrator.id
            and existing.type = 'property_submitted'
            and existing.action_target_id = v_apartment.id
      );

    get diagnostics v_created_count = row_count;
    return v_created_count;
end;
$$;

grant execute on function public.fn_notify_admins_of_property_submission(uuid) to authenticated;

commit;

-- Optional one-time backfill for properties submitted before this function was
-- installed. It creates only missing notifications, so it is safe to run once
-- now and will not duplicate an existing property-submission notification.
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
    'property_submitted',
    'New property awaiting review',
    coalesce(landlord.name, 'A landlord') || ' submitted "' || coalesce(apartment.title, 'a property') || '" with verification details for review.',
    jsonb_build_object(
        'action', 'property_submitted',
        'category', 'landlord',
        'landlord_id', landlord.id,
        'landlord_name', coalesce(landlord.name, 'Landlord'),
        'property_id', apartment.id,
        'property_name', coalesce(apartment.title, 'Property'),
        'submitted_at', apartment.created_at
    ),
    false,
    '/admin/apartment/' || apartment.id,
    apartment.id,
    'apartment'
from public.apartments as apartment
join public.app_users as landlord on landlord.id = apartment.landlord_id
cross join public.app_users as administrator
where administrator.role = 'admin'
  and coalesce(apartment.is_published, false) = false
  and coalesce(apartment.is_archived, false) = false
  and not exists (
      select 1
      from public.notifications as existing
      where existing.user_id = administrator.id
        and existing.type = 'property_submitted'
        and existing.action_target_id = apartment.id
  );
