-- Run this entire file in the SAME Supabase project used by .env.local.
-- Based on the live trigger and policy definitions supplied for this project.
-- Existing accounts and administrator policies are preserved; RLS stays enabled.
-- New Google users wait for the form; existing automatically-created profiles
-- are intentionally not deleted or reclassified.
begin;

alter policy "Users can read own app_users profile"
on public.app_users
using ((select auth.uid()) = auth_id);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    meta            jsonb;
    v_role          public.app_user_role;
    v_username      text;
    v_name          text;
    v_mobile        text;
    v_avatar        text;
    v_status        text;
    v_is_verified   boolean;
    v_profile_id    uuid;
    v_existing_id   uuid;
    v_existing_role public.app_user_role;
begin
    -- Auth keeps the pending signup so it can deliver the confirmation link.
    -- Application profiles must wait for a verified email, including Google.
    if new.email_confirmed_at is null then
        return new;
    end if;

    -- Google OAuth normally supplies email/name/avatar, but not AptFindr's
    -- custom role or username fields.
    meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

    if new.email is null then
        raise exception 'Email is required to create an AptFindr profile.';
    end if;

    ---------------------------------------------------------------------------
    -- 1. Find an existing AptFindr profile.
    --    Prefer an exact auth_id match, then fall back to the same email.
    ---------------------------------------------------------------------------
    select u.id, u.role
      into v_existing_id, v_existing_role
      from public.app_users u
     where u.auth_id = new.id
     limit 1;

    if v_existing_id is null then
        select u.id, u.role
          into v_existing_id, v_existing_role
          from public.app_users u
         where lower(u.email) = lower(new.email)
         limit 1;
    end if;

    -- A new Google identity must complete the AptFindr role/account form.
    -- Existing accounts continue through the original linking path below.
    if v_existing_id is null
       and (
         coalesce(new.raw_app_meta_data ->> 'provider', '') = 'google'
         or coalesce(new.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'google'
       ) then
        return new;
    end if;

    ---------------------------------------------------------------------------
    -- 2. Resolve role.
    --    Existing admin/super_admin/landlord/tenant roles are preserved.
    --    New Google identities were deferred above. Password signup uses its
    --    selected role. Public signup metadata cannot create admins.
    ---------------------------------------------------------------------------
    if v_existing_id is not null then
        v_role := v_existing_role;
    elsif lower(coalesce(meta ->> 'role', '')) = 'landlord' then
        v_role := 'landlord'::public.app_user_role;
    else
        v_role := 'tenant'::public.app_user_role;
    end if;

    ---------------------------------------------------------------------------
    -- 3. Resolve a valid username.
    --    app_users_username_format_check allows only 4-30 characters.
    --    Never use the entire UUID because "user_" + 32 UUID characters is 37.
    ---------------------------------------------------------------------------
    v_username := lower(nullif(btrim(meta ->> 'username'), ''));

    if v_username is null
       or v_username !~ '^[a-z0-9_]{4,30}$'
       or exists (
            select 1
              from public.app_users u
             where lower(u.username) = lower(v_username)
               and u.id is distinct from v_existing_id
       )
    then
        -- 5 + 24 = 29 characters, safely inside the 30-character limit.
        v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 24);
    end if;

    -- Extremely defensive collision fallback.
    if exists (
        select 1
          from public.app_users u
         where lower(u.username) = lower(v_username)
           and u.id is distinct from v_existing_id
    ) then
        -- 4 + 26 = 30 characters.
        v_username := 'usr_' || substr(md5(new.id::text), 1, 26);
    end if;

    ---------------------------------------------------------------------------
    -- 4. Resolve Google/profile metadata.
    --    app_users.name is NOT NULL, so always provide a fallback.
    ---------------------------------------------------------------------------
    v_name := coalesce(
        nullif(btrim(meta ->> 'name'), ''),
        nullif(btrim(meta ->> 'full_name'), ''),
        nullif(btrim(meta ->> 'display_name'), ''),
        nullif(split_part(new.email, '@', 1), ''),
        'AptFindr User'
    );

    v_mobile := nullif(btrim(coalesce(
        meta ->> 'mobile',
        meta ->> 'phone'
    )), '');

    v_avatar := nullif(btrim(coalesce(
        meta ->> 'avatar_url',
        meta ->> 'picture',
        meta ->> 'avatar'
    )), '');

    if v_role = 'landlord'::public.app_user_role then
        v_status := 'pending';
        v_is_verified := false;
    else
        v_status := 'active';
        v_is_verified := true;
    end if;

    ---------------------------------------------------------------------------
    -- 5. Link an existing app_users row or create a new one.
    ---------------------------------------------------------------------------
    if v_existing_id is not null then
        update public.app_users u
           set auth_id = new.id,
               username = case
                            when u.username is null
                                 or u.username !~ '^[A-Za-z0-9_]{4,30}$'
                            then v_username
                            else u.username
                          end,
               email = lower(new.email),
               name = case
                        when nullif(btrim(u.name), '') is null then v_name
                        else u.name
                      end,
               mobile = coalesce(u.mobile, v_mobile),
               avatar_url = coalesce(u.avatar_url, v_avatar),
               email_verified = new.email_confirmed_at is not null,
               verification_status = case
                   when new.email_confirmed_at is null then 'pending_email_verification'
                   else 'email_verified'
               end,
               signup_source = coalesce(u.signup_source, 'google'),
               updated_at = now()
         where u.id = v_existing_id
         returning u.id into v_profile_id;
    else
        insert into public.app_users (
            id,
            auth_id,
            username,
            email,
            name,
            role,
            status,
            mobile,
            avatar_url,
            is_verified,
            email_verified,
            verification_status,
            signup_source
        )
        values (
            new.id,
            new.id,
            v_username,
            lower(new.email),
            v_name,
            v_role,
            v_status,
            v_mobile,
            v_avatar,
            v_is_verified,
            new.email_confirmed_at is not null,
            case
                when new.email_confirmed_at is null then 'pending_email_verification'
                else 'email_verified'
            end,
            'google'
        )
        returning id into v_profile_id;
    end if;

    ---------------------------------------------------------------------------
    -- 6. Ensure the matching role profile exists.
    ---------------------------------------------------------------------------
    if v_role = 'tenant'::public.app_user_role then
        insert into public.tenant_profiles (user_id)
        values (v_profile_id)
        on conflict (user_id) do nothing;

    elsif v_role = 'landlord'::public.app_user_role then
        insert into public.landlord_profiles (
            user_id,
            permit_number,
            business_permit_number,
            is_verified
        )
        values (
            v_profile_id,
            nullif(meta ->> 'permitNumber', ''),
            nullif(meta ->> 'permitNumber', ''),
            false
        )
        on conflict (user_id) do update set
            permit_number = coalesce(
                landlord_profiles.permit_number,
                excluded.permit_number
            ),
            business_permit_number = coalesce(
                landlord_profiles.business_permit_number,
                excluded.business_permit_number
            );

    elsif v_role in (
        'admin'::public.app_user_role,
        'super_admin'::public.app_user_role
    ) then
        insert into public.admin_profiles (
            user_id,
            admin_level,
            department
        )
        values (
            v_profile_id,
            case
                when v_role = 'super_admin'::public.app_user_role
                    then 'Super Administrator'
                else 'Full Administrator'
            end,
            'Platform Administration'
        )
        on conflict (user_id) do nothing;
    end if;

    return new;
end;
$function$;

-- Email confirmation updates the pending Auth row rather than inserting it.
-- Keep the existing signup trigger, and also create the profile on confirmation.
drop trigger if exists aptfindr_profile_after_email_confirmation on auth.users;
create trigger aptfindr_profile_after_email_confirmation
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.handle_new_auth_user();

commit;

-- Verification: the read policy should reference auth_id, and the guard be true.
select policyname, qual
from pg_policies
where schemaname = 'public' and tablename = 'app_users'
  and policyname = 'Users can read own app_users profile';

select position('A new Google identity must complete' in
  pg_get_functiondef('public.handle_new_auth_user()'::regprocedure)) > 0
  as google_registration_form_required;
