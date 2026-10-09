-- Makes tenant_preferences the relational store for saved apartment-search
-- preferences, then copies any values saved by the old app_users.preferences
-- JSON flow. Existing tenant_preferences rows are left unchanged.

-- One tenant has one active apartment-search preference record. This index
-- lets the application safely use `on conflict (user_id)` when saving.
create unique index if not exists tenant_preferences_user_id_key
  on public.tenant_preferences (user_id);

with legacy_preferences as (
  select
    account.id as user_id,
    case
      when jsonb_typeof(account.preferences -> 'tenant') = 'object'
        then account.preferences -> 'tenant'
      else account.preferences
    end as preference
  from public.app_users as account
  where account.role = 'tenant'
    and jsonb_typeof(account.preferences) = 'object'
), preference_rows as (
  select
    user_id,
    nullif(trim(preference ->> 'preferredArea'), '') as preferred_area,
    nullif(preference ->> 'preferredLat', '')::double precision as preferred_lat,
    nullif(preference ->> 'preferredLng', '')::double precision as preferred_lng,
    coalesce(nullif(preference ->> 'minBudget', '')::numeric, 0) as min_budget,
    coalesce(nullif(preference ->> 'maxBudget', '')::numeric, 0) as max_budget,
    coalesce(nullif(preference ->> 'minBedrooms', ''), 'any') as min_bedrooms,
    coalesce(nullif(preference ->> 'roomCapacity', ''), 'any') as room_capacity,
    coalesce(nullif(preference ->> 'petFriendly', '')::boolean, false) as pet_friendly,
    coalesce(nullif(preference ->> 'parking', '')::boolean, false) as parking,
    coalesce(nullif(preference ->> 'furnished', '')::boolean, false) as furnished,
    coalesce(nullif(preference ->> 'ownBathroom', '')::boolean, false) as own_bathroom,
    coalesce(nullif(preference ->> 'wifi', '')::boolean, false) as wifi,
    coalesce(nullif(preference ->> 'ac', '')::boolean, false) as ac,
    coalesce(nullif(preference ->> 'laundryArea', '')::boolean, false) as laundry_area
  from legacy_preferences
  where coalesce(preference ->> 'hasSavedPreferences', 'false') = 'true'
)
insert into public.tenant_preferences (
  user_id, preferred_area, preferred_lat, preferred_lng, min_budget, max_budget,
  min_bedrooms, room_capacity, pet_friendly, parking, furnished, own_bathroom,
  wifi, ac, laundry_area
)
select
  user_id, preferred_area, preferred_lat, preferred_lng, min_budget, max_budget,
  min_bedrooms, room_capacity, pet_friendly, parking, furnished, own_bathroom,
  wifi, ac, laundry_area
from preference_rows
on conflict (user_id) do nothing;

select
  account.name,
  account.email,
  preference.preferred_area,
  preference.min_budget,
  preference.max_budget,
  preference.updated_at
from public.tenant_preferences as preference
join public.app_users as account on account.id = preference.user_id
order by preference.updated_at desc nulls last;
