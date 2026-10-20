import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const packageDirectory = process.env.APTFINDR_PGLITE_DIR;
test('tenant provisioning SQL against embedded PostgreSQL', { skip: !packageDirectory }, async t => {
  const { PGlite } = await import(pathToFileURL(path.join(packageDirectory, 'dist/index.js')).href);
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.jwt() returns jsonb language sql stable as $$
        select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
      $$;
      create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid; $$;
      grant usage on schema auth, public to authenticated, anon;
      grant execute on all functions in schema auth to authenticated, anon;
      create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz,
        raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}');
      create table auth.identities (user_id uuid references auth.users(id), provider text, identity_data jsonb,
        unique(user_id,provider));
      create type public.app_user_role as enum ('tenant','landlord','admin','super_admin');
      create table public.app_users (
        id uuid primary key, auth_id uuid unique references auth.users(id), email text not null unique,
        name text not null, username text not null unique check (username ~ '^[A-Za-z0-9_]{4,30}$'),
        role public.app_user_role not null, status text not null default 'active', is_verified boolean not null default false,
        email_verified boolean not null default false, verification_status text, signup_source text,
        preferences jsonb not null default '{}', mobile text, avatar_url text, updated_at timestamptz default now()
      );
      create table public.tenant_profiles (user_id uuid primary key references public.app_users(id));
      create table public.landlord_profiles (user_id uuid primary key, permit_number text,
        business_permit_number text, is_verified boolean);
      create table public.admin_profiles (user_id uuid primary key, admin_level text, department text);
      alter table public.app_users enable row level security;
      grant select,insert,update on public.app_users to authenticated;
      create policy own_select on public.app_users for select to authenticated using(auth_id=auth.uid());
      create policy own_insert on public.app_users for insert to authenticated with check(auth_id=auth.uid());
      create policy own_update on public.app_users for update to authenticated using(auth_id=auth.uid()) with check(auth_id=auth.uid());
      create function public.handle_new_auth_user() returns trigger language plpgsql security definer as $$ begin return new; end; $$;
      create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();
    `);
    const migration = await readFile(new URL('../supabase/google-tenant-auth.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(migration); // Deployment itself is repeatable.
    const uid = number => `00000000-0000-4000-8000-${String(number).padStart(12,'0')}`;
    async function createGoogle(number, { email = `google${number}@example.test`, verified = true } = {}) {
      const id = uid(number);
      await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
        values($1,$2,now(),'{"provider":"google","providers":["google"]}','{"role":"super_admin"}')`, [id,email]);
      await db.query(`insert into auth.identities values($1,'google',$2::jsonb)`, [id,JSON.stringify({ email, email_verified: verified, name: 'Verified Google Name' })]);
      return id;
    }
    async function asUser(id, operation, { method = 'oauth', google = true } = {}) {
      await db.query(`select set_config('request.jwt.claims',$1,false)`, [JSON.stringify({ sub:id, role:'authenticated',
        amr:[{ method }], app_metadata:{ provider:google?'google':'email', providers:google?['google']:['email'] } })]);
      await db.exec('set role authenticated');
      try { return await operation(); } finally { await db.exec('reset role'); }
    }
    const complete = id => asUser(id, () => db.query('select public.complete_google_tenant_sign_in() as profile'));
    await t.test('new Google account gets a server-assigned tenant, verified name/email and internal username', async () => {
      const id = await createGoogle(1);
      const { rows } = await complete(id);
      assert.equal(rows[0].profile.role, 'tenant');
      assert.equal(rows[0].profile.name, 'Verified Google Name');
      assert.equal(rows[0].profile.email, 'google1@example.test');
      assert.match(rows[0].profile.username, /^[a-z0-9_]{4,30}$/);
      assert.equal(rows[0].profile.auth_id, id);
      assert.equal((await db.query('select count(*)::int n from public.tenant_profiles')).rows[0].n,1);
    });
    await t.test('repeated sign-ins preserve tenant ID and preferences with one profile', async () => {
      await db.query(`update public.app_users set preferences='{"retained":true}' where auth_id=$1`,[uid(1)]);
      for (let attempt=0;attempt<5;attempt++) {
        assert.equal((await complete(uid(1))).rows[0].profile.id,uid(1));
      }
      const { rows }=await db.query('select count(*)::int n from public.app_users where auth_id=$1',[uid(1)]);
      assert.equal(rows[0].n,1);
      assert.equal((await complete(uid(1))).rows[0].profile.preferences.retained,true);
    });
    await t.test('existing tenant with legacy ID is linked without changing its data', async () => {
      await db.query(`insert into public.app_users(id,email,name,username,role,preferences) values($1,$2,'Legacy Name','legacy_user','tenant','{"retained":true}')`,[uid(200),'google2@example.test']);
      await createGoogle(2);
      const { profile }=(await complete(uid(2))).rows[0];
      assert.equal(profile.id,uid(200)); assert.equal(profile.name,'Legacy Name'); assert.equal(profile.preferences.retained,true);
    });
    for(const [number,role] of [[3,'landlord'],[4,'admin'],[5,'super_admin']]) {
      await t.test(`existing ${role} is untouched by auth trigger and tenant provisioning`,async()=>{
        await db.query(`insert into public.app_users(id,email,name,username,role) values($1,$2,'Existing',$3,$4)`,[uid(number+200),`google${number}@example.test`,`existing_${number}`,role]);
        await createGoogle(number);
        await assert.rejects(complete(uid(number)),/already associated with another account role/);
        const {rows}=await db.query('select role,auth_id from public.app_users where id=$1',[uid(number+200)]);
        assert.equal(rows[0].role,role); assert.equal(rows[0].auth_id,null);
      });
    }
    await t.test('browser-controlled OAuth inserts and role/identity updates are denied',async()=>{
      await assert.rejects(asUser(uid(1),()=>db.query(`insert into public.app_users(id,auth_id,email,name,username,role) values($1,$1,'extra@example.test','Attacker','extra_user','landlord')`,[uid(1)])),error=>error.code==='42501');
      await assert.rejects(asUser(uid(1),()=>db.query(`update public.app_users set role='landlord' where auth_id=$1`,[uid(1)])),error=>error.code==='42501');
      await assert.rejects(asUser(uid(1),()=>db.query(`update public.app_users set auth_id=null where auth_id=$1`,[uid(1)])),error=>error.code==='42501');
    });
    await t.test('unverified Google identity and anonymous RPC execution are denied',async()=>{
      await createGoogle(6,{verified:false});
      await assert.rejects(complete(uid(6)),error=>error.code==='42501');
      await db.exec('set role anon');
      try { await assert.rejects(db.query('select public.complete_google_tenant_sign_in()'),error=>error.code==='42501'); }
      finally { await db.exec('reset role'); }
    });
    await t.test('email/password signup retains the original landlord role and profile creation',async()=>{
      await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
        values($1,'password@example.test',now(),'{"provider":"email"}','{"role":"landlord","username":"password_user","name":"Password User"}')`,[uid(7)]);
      const {rows}=await db.query('select role,status from public.app_users where auth_id=$1',[uid(7)]);
      assert.equal(rows[0].role,'landlord'); assert.equal(rows[0].status,'pending');
    });
    await t.test('normalized email uniqueness rejects case-variant duplicates',async()=>{
      await assert.rejects(db.query(`insert into public.app_users(id,email,name,username,role) values($1,'GOOGLE1@example.test','Duplicate','duplicate_user','tenant')`,[uid(99)]),error=>error.code==='23505');
    });
  } finally { await db.close(); }
});
