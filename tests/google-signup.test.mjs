import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as validation from '../src/auth/signupValidation.js';

async function setup({ role = 'tenant', confirmed = true, method = 'oauth', rpcError, existing = false } = {}) {
  const user = { id: 'google-id', email: 'verified@gmail.com', email_confirmed_at: confirmed ? '2026-01-01' : null,
    app_metadata: { provider: 'email', providers: ['email', 'google'] }, user_metadata: { role: 'super_admin' },
    identities: [{ provider: 'google' }] };
  const stored = { id: 'legacy-profile-id', auth_id: user.id, role, email: user.email, name: 'Existing Tenant',
    username: 'user_0123456789abcdef01234567', status: 'active', preferences: { retained: true } };
  const calls = [];
  let profile = existing ? stored : null;
  const client = {
    auth: {
      getUser: async () => ({ data: { user } }),
      getSession: async () => ({ data: { session: { user,
        access_token: `header.${Buffer.from(JSON.stringify({ amr: [{ method }] })).toString('base64url')}.sig` } } }),
      signOut: async options => { calls.push({ signOut: options }); return {}; },
      signInWithOAuth: async options => { calls.push({ oauth: options }); return {}; },
      exchangeCodeForSession: async code => { calls.push({ exchange: code }); return { data: { session: {} } }; },
    },
    rpc: async (...args) => {
      calls.push({ rpc: args });
      if (rpcError) return { error: typeof rpcError === 'string' ? { message: rpcError } : rpcError };
      if (role !== 'tenant') return { error: { message: 'This Google account is already associated with another account role. Please use your designated sign-in method.' } };
      profile ??= { ...stored, id: user.id, name: 'Google Name' };
      return { data: { ...profile } };
    },
    from(table) {
      let updates;
      const query = { select: () => query, eq: () => query,
        update: data => { updates = data; calls.push({ update: data }); return query; },
        single: async () => { profile = { ...profile, ...updates }; return { data: profile }; },
        maybeSingle: async () => ({ data: profile }),
        upsert: async data => { calls.push({ table, data }); return {}; } };
      return query;
    },
  };
  const key = `__googleTest${Math.random().toString(36).slice(2)}`;
  globalThis[key] = { client, validation };
  let source = await readFile(new URL('../src/services/authService.js', import.meta.url), 'utf8');
  source = source.replace(/^import .*;\r?\n/gm, '');
  source = `const {client: supabaseClient, validation} = globalThis['${key}'];
    const {validateAccountDetails, validatePersonalInformation, validateSignupPassword} = validation;
    const seedLandlordSignupBusinessName = async () => {};
    const safeRandomId = () => 'random';\n` + source;
  try {
    const service = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    return { service, calls, stored };
  } finally { delete globalThis[key]; }
}

test('new Google user remains without an app profile until Create Account is submitted', async () => {
  const { service, calls } = await setup();
  assert.equal(await service.getCurrentAuthenticatedUser(), null);
  assert.equal(await service.getCurrentAuthenticatedUser(), null);
  assert.deepEqual(calls, []);
  const profile = await service.finalizeGoogleSignup({ id: 'google-id' }, {
    fullName: 'Google Name', termsAccepted: true, role: 'super_admin', email: 'spoofed@example.com',
  });
  assert.equal(profile.role, 'tenant');
  assert.equal(profile.email, 'verified@gmail.com');
  assert.deepEqual(calls, [{ rpc: ['complete_google_tenant_sign_in'] }]);
  assert.equal((await service.getCurrentAuthenticatedUser()).id, profile.id);
});
test('Google signup requires a name and agreement before any profile write', async () => {
  const { service, calls } = await setup();
  await assert.rejects(service.finalizeGoogleSignup(null, { termsAccepted: true }), /name is required/);
  await assert.rejects(service.finalizeGoogleSignup(null, { fullName: 'Name' }), /Terms of Service/);
  await assert.rejects(service.finalizeGoogleSignup({ id: 'other-account' }, { fullName: 'Name', termsAccepted: true }), /account changed/);
  assert.deepEqual(calls, []);
});
test('the name reviewed on Create Account is saved without changing role or email', async () => {
  const { service, calls } = await setup();
  const profile = await service.finalizeGoogleSignup({ id: 'google-id' }, { fullName: 'Reviewed Name', termsAccepted: true });
  assert.equal(profile.name, 'Reviewed Name');
  assert.equal(profile.role, 'tenant');
  assert.deepEqual(calls[1], { update: { name: 'Reviewed Name' } });
});

test('refresh and repeated callbacks recover the same existing tenant profile', async () => {
  const { service, calls, stored } = await setup({ existing: true });
  const [first, second] = await Promise.all([service.getCurrentAuthenticatedUser(), service.provisionGoogleTenant()]);
  assert.equal(first.id, stored.id);
  assert.deepEqual(second, first);
  assert.equal(stored.preferences.retained, true);
  assert.equal(calls.length, 1);
  await service.provisionGoogleTenant();
  assert.equal(calls.length, 2);
});

for (const role of ['landlord', 'admin', 'super_admin']) {
  test(`Google sign-in rejects existing ${role} without writing its profile`, async () => {
    const { service, calls, stored } = await setup({ role, existing: true });
    await assert.rejects(service.getCurrentAuthenticatedUser(), error => error.message === service.GOOGLE_ROLE_ERROR);
    assert.equal(stored.role, role);
    assert.equal(calls.length, 0);
  });
  test(`password session with linked Google identity preserves ${role} access`, async () => {
    const { service, calls } = await setup({ role, method: 'password', existing: true });
    assert.equal((await service.getCurrentAuthenticatedUser()).role, role);
    assert.ok(!calls.some(call => call.rpc));
  });
}

test('unverified Google identity cannot invoke provisioning', async () => {
  const { service, calls } = await setup({ confirmed: false });
  await assert.rejects(service.provisionGoogleTenant(), /verified/);
  assert.deepEqual(calls, []);
});

test('database provisioning failures propagate instead of returning a partial profile', async () => {
  const { service } = await setup({ rpcError: 'Database unavailable' });
  await assert.rejects(service.provisionGoogleTenant(), /Database unavailable/);
});

for (const origin of ['http://localhost:5173', 'https://aptfindr.vercel.app']) {
  test(`Google entry points use the current origin callback: ${origin}`, async () => {
    const storage = { getItem: () => null, setItem() {}, removeItem() {} };
    globalThis.window = { location: { origin }, localStorage: storage, sessionStorage: storage };
    try {
      const { service, calls } = await setup();
      await service.loginWithGoogle({ signupRole: 'landlord' });
      await service.signupWithGoogle({ role: 'super_admin' });
      for (const { oauth } of calls) {
        assert.equal(oauth.provider, 'google');
        assert.equal(oauth.options.redirectTo, `${origin}/auth/callback`);
        assert.equal(oauth.options.queryParams.prompt, 'select_account');
      }
    } finally { delete globalThis.window; }
  });
}


test('duplicate PKCE callbacks exchange the single-use code only once', async () => {
  const { service, calls } = await setup();
  const [first, second] = await Promise.all([service.exchangeAuthCode('single-use-code'), service.exchangeAuthCode('single-use-code')]);
  assert.deepEqual(first, second);
  assert.deepEqual(calls, [{ exchange: 'single-use-code' }]);
});

test('Supabase error code, details and hint survive provisioning errors', async () => {
  const diagnostic = { code: 'PGRST202', message: 'Missing database function', details: 'Function was not found', hint: 'Deploy the migration' };
  const { service } = await setup({ rpcError: diagnostic });
  await assert.rejects(service.provisionGoogleTenant(), error => {
    assert.equal(error.code, diagnostic.code);
    assert.equal(error.message, diagnostic.message);
    assert.equal(error.details, diagnostic.details);
    assert.equal(error.hint, diagnostic.hint);
    assert.equal(error.stage, 'provision_profile');
    return true;
  });
  // Rejections are not cached: retry performs a fresh request.
  await assert.rejects(service.provisionGoogleTenant(), error => error.code === 'PGRST202');
});
