-- Run once in the Supabase SQL Editor.
--
-- This returns only aggregate market-preference counts to landlords and
-- administrators. It does not expose tenant IDs, names, or raw profiles.

begin;

create or replace function public.fn_get_tenant_preference_analytics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_requester_role public.app_user_role;
begin
    select role
    into v_requester_role
    from public.app_users
    where auth_id = auth.uid() or id = auth.uid()
    limit 1;

    if v_requester_role is null or v_requester_role not in ('landlord', 'admin') then
        raise exception 'Only landlords and administrators can access tenant preference analytics.';
    end if;

    return (
        with tenant_preferences as (
            select case
                when jsonb_typeof(preferences) = 'object'
                    and jsonb_typeof(preferences -> 'tenant') = 'object'
                    then preferences -> 'tenant'
                else preferences
            end as preference
            from public.app_users
            where role = 'tenant'
              and preferences is not null
        ),
        saved_preferences as (
            select preference
            from tenant_preferences
            where coalesce(preference ->> 'hasSavedPreferences', 'false') = 'true'
        )
        select jsonb_build_object(
            'preferredAreas', coalesce((
                select jsonb_agg(jsonb_build_object('label', item.label, 'value', item.value) order by item.value desc, item.label)
                from (
                    select nullif(trim(preference ->> 'preferredArea'), '') as label, count(*)::integer as value
                    from saved_preferences
                    where nullif(trim(preference ->> 'preferredArea'), '') is not null
                    group by nullif(trim(preference ->> 'preferredArea'), '')
                ) as item
            ), '[]'::jsonb),
            'amenities', coalesce((
                select jsonb_agg(jsonb_build_object('label', item.label, 'value', item.value) order by item.value desc, item.label)
                from (
                    select amenity.label, count(*)::integer as value
                    from saved_preferences
                    cross join lateral (
                        values
                            ('Pet Friendly', coalesce((preference ->> 'petFriendly')::boolean, false)),
                            ('Parking', coalesce((preference ->> 'parking')::boolean, false)),
                            ('Furnished', coalesce((preference ->> 'furnished')::boolean, false)),
                            ('Own Bathroom', coalesce((preference ->> 'ownBathroom')::boolean, false)),
                            ('Wi-Fi', coalesce((preference ->> 'wifi')::boolean, false)),
                            ('Air Conditioning', coalesce((preference ->> 'ac')::boolean, false)),
                            ('Laundry Area', coalesce((preference ->> 'laundryArea')::boolean, false))
                    ) as amenity(label, selected)
                    where amenity.selected
                    group by amenity.label
                ) as item
            ), '[]'::jsonb),
            'bedrooms', coalesce((
                select jsonb_agg(jsonb_build_object('label', item.label, 'value', item.value) order by item.value desc, item.label)
                from (
                    select preference ->> 'minBedrooms' as label, count(*)::integer as value
                    from saved_preferences
                    where preference ->> 'minBedrooms' in ('1', '2', '3', '4+')
                    group by preference ->> 'minBedrooms'
                ) as item
            ), '[]'::jsonb),
            'roomCapacity', coalesce((
                select jsonb_agg(jsonb_build_object('label', item.label, 'value', item.value) order by item.value desc, item.label)
                from (
                    select preference ->> 'roomCapacity' as label, count(*)::integer as value
                    from saved_preferences
                    where preference ->> 'roomCapacity' in ('1', '2', '3', '4+')
                    group by preference ->> 'roomCapacity'
                ) as item
            ), '[]'::jsonb),
            'priceRanges', coalesce((
                select jsonb_agg(jsonb_build_object('min', item.minimum, 'max', item.maximum, 'value', item.value) order by item.minimum, item.maximum nulls first)
                from (
                    select
                        coalesce(nullif(preference ->> 'minBudget', '')::numeric, 0) as minimum,
                        nullif(preference ->> 'maxBudget', '')::numeric as maximum,
                        count(*)::integer as value
                    from saved_preferences
                    where coalesce(preference ->> 'saveBudgetPreferences', 'false') = 'true'
                      and (
                          coalesce(nullif(preference ->> 'minBudget', '')::numeric, 0) > 0
                          or coalesce(nullif(preference ->> 'maxBudget', '')::numeric, 0) > 0
                      )
                    group by
                        coalesce(nullif(preference ->> 'minBudget', '')::numeric, 0),
                        nullif(preference ->> 'maxBudget', '')::numeric
                ) as item
            ), '[]'::jsonb)
        )
    );
end;
$$;

grant execute on function public.fn_get_tenant_preference_analytics() to authenticated;

commit;
