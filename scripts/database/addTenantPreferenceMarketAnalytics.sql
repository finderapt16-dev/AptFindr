-- Run once in the Supabase SQL Editor.
--
-- This returns only aggregate market-preference counts to landlords and
-- administrators. It does not expose tenant IDs, names, or raw profiles.
-- Re-running this script is safe: CREATE OR REPLACE updates the RPC used by
-- Market Trends without changing tables or RLS policies.

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
            -- Keep only the latest saved preference object per authenticated
            -- tenant in case an old duplicate profile exists.
            select distinct on (coalesce(app_user.auth_id::text, app_user.id::text)) case
                when jsonb_typeof(preferences) = 'object'
                    and jsonb_typeof(preferences -> 'tenant') = 'object'
                    then preferences -> 'tenant'
                else preferences
            end as preference
            from public.app_users as app_user
            where app_user.role = 'tenant'
              and app_user.preferences is not null
            order by
                coalesce(app_user.auth_id::text, app_user.id::text),
                app_user.id
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
                    select coalesce(preference ->> 'minBedrooms', 'any') as label, count(*)::integer as value
                    from saved_preferences
                    where coalesce(preference ->> 'minBedrooms', 'any') in ('any', '1', '2', '3', '4+')
                    group by coalesce(preference ->> 'minBedrooms', 'any')
                ) as item
            ), '[]'::jsonb),
            'roomCapacity', coalesce((
                select jsonb_agg(jsonb_build_object('label', item.label, 'value', item.value) order by item.value desc, item.label)
                from (
                    select coalesce(preference ->> 'roomCapacity', 'any') as label, count(*)::integer as value
                    from saved_preferences
                    where coalesce(preference ->> 'roomCapacity', 'any') in ('any', '1', '2', '3', '4+')
                    group by coalesce(preference ->> 'roomCapacity', 'any')
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
            ), '[]'::jsonb),
            'responseCounts', jsonb_build_object(
                -- Each saved preference object is counted once per authenticated
                -- tenant. No tenant IDs are returned.
                'preferredAreas', (
                    select count(*)::integer
                    from saved_preferences
                    where nullif(trim(preference ->> 'preferredArea'), '') is not null
                ),
                -- Amenities are multi-select. Their percentage denominator is
                -- all saved preference forms, not the sum of selected amenities.
                'amenities', (select count(*)::integer from saved_preferences),
                'bedrooms', (
                    select count(*)::integer
                    from saved_preferences
                    where coalesce(preference ->> 'minBedrooms', 'any') in ('any', '1', '2', '3', '4+')
                ),
                'roomCapacity', (
                    select count(*)::integer
                    from saved_preferences
                    where coalesce(preference ->> 'roomCapacity', 'any') in ('any', '1', '2', '3', '4+')
                ),
                'priceRanges', (
                    select count(*)::integer
                    from saved_preferences
                    where coalesce(preference ->> 'saveBudgetPreferences', 'false') = 'true'
                      and (
                          coalesce(nullif(preference ->> 'minBudget', '')::numeric, 0) > 0
                          or coalesce(nullif(preference ->> 'maxBudget', '')::numeric, 0) > 0
                      )
                )
            )
        )
    );
end;
$$;

grant execute on function public.fn_get_tenant_preference_analytics() to authenticated;

commit;
