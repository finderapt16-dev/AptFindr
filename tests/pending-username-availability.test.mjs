import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const engine=process.env.APTFINDR_PGLITE_DIR;
test('pending usernames are provisional and completed usernames stay protected',{skip:!engine},async t=>{
  const {PGlite}=await import(pathToFileURL(path.join(engine,'dist/index.js')).href);
  const db=new PGlite();
  try {
    await db.exec(`create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table auth.users(id uuid primary key,raw_user_meta_data jsonb,email_confirmed_at timestamptz);
      create table public.app_users(username text,auth_id uuid);
      create role anon; grant usage on schema public to anon;
      insert into auth.users values
        ('00000000-0000-4000-8000-000000000001','{"username":"pending_name"}',null),
        ('00000000-0000-4000-8000-000000000002','{"username":"confirmed_name"}',now());
      insert into public.app_users values('existing_name','00000000-0000-4000-8000-000000000003'),('legacy_name',null);`);
    const sql=await readFile(new URL('../supabase/pending-username-availability.sql',import.meta.url),'utf8');
    await db.exec(sql);await db.exec(sql);
    const available=async name=>(await db.query('select public.is_username_available($1) available',[name])).rows[0].available;
    await t.test('unconfirmed signup does not reserve its username',async()=>{
      assert.equal(await available('pending_name'),true);
      assert.equal(await available(' PENDING_NAME '),true);
    });
    await t.test('confirmed Auth identities and all existing profiles remain reserved',async()=>{
      assert.equal(await available('confirmed_name'),false);
      assert.equal(await available('EXISTING_NAME'),false);
      assert.equal(await available('legacy_name'),false);
    });
    await t.test('confirmation reserves the username without deleting the pending account',async()=>{
      await db.query(`update auth.users set email_confirmed_at=now() where raw_user_meta_data->>'username'='pending_name'`);
      assert.equal(await available('pending_name'),false);
      assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,2);
    });
    await t.test('availability remains accessible as a boolean without granting Auth table access',async()=>{
      await db.exec('set role anon');
      try {assert.equal(await available('existing_name'),false);assert.equal(await available('new_name'),true);}
      finally{await db.exec('reset role');}
    });
    await t.test('signed-in users can retain their own username but not claim another user',async()=>{
      await db.query(`select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false)`);
      assert.equal(await available('existing_name'),true);
      assert.equal(await available('confirmed_name'),false);
      assert.equal(await available('legacy_name'),false);
    });
  }finally{await db.close();}
});
