import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import * as validation from '../src/auth/signupValidation.js';

// Load the real service with an isolated in-memory Supabase boundary.
async function setup({ existing, confirmed = true, expired = false } = {}) {
  let user = { id: 'google-id', email: 'verified@gmail.com', email_confirmed_at: confirmed ? '2026-01-01' : null, app_metadata: { provider: 'google' }, user_metadata: {} };
  const rows = existing ? [{ ...existing, auth_id: user.id, email: user.email }] : [];
  const writes = [];
  const client = {
    auth: {
      getUser: async () => expired ? { data: { user: null }, error: { status: 401 } } : ({ data: { user } }),
      refreshSession: async () => { expired = false; return { error: null }; },
      getSession: async () => ({ data: { session: { user } } }),
      signOut: async options => { writes.push({ signOut: options }); user = null; return {}; },
      signInWithOAuth: async options => { writes.push({ oauth: options }); return {}; },
      updateUser: async payload => {
        writes.push(payload);
        user = { ...user, user_metadata: { ...user.user_metadata, ...payload.data } };
        return { data: { user } };
      },
    },
    from(table) {
      let field, value, payload;
      const query = {
        select: () => query,
        eq: (f, v) => { field = f; value = v; return query; },
        maybeSingle: async () => ({ data: rows.find(row => row[field] === value) ?? null }),
        insert: data => { payload = data; return query; },
        single: async () => {
          // Reproduce the live INSERT and RETURNING ownership policies.
          if (payload.auth_id !== user.id || payload.id !== user.id) {
            return { data: null, error: { code: '42501', message: 'new row violates row-level security policy for table "app_users"' } };
          }
          const row = { ...payload };
          rows.push(row);
          return { data: row };
        },
        upsert: async data => { writes.push({ table, ...data }); return {}; },
      };
      return query;
    },
  };
  const key = `__authTest${Math.random().toString(36).slice(2)}`;
  globalThis[key] = { client, validation };
  let source = await readFile(new URL('../src/services/authService.js', import.meta.url), 'utf8');
  source = source.replace(/^import .*;\r?\n/gm, '');
  source = `const { client: supabaseClient, validation } = globalThis['${key}'];
    const { validateAccountDetails, validatePersonalInformation, validateSignupPassword } = validation;
    const seedLandlordSignupBusinessName = async () => {};
    const safeRandomId = () => 'random';\n` + source;
  const service = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  delete globalThis[key];
  return { service, rows, writes };
}
const input = {
  role: 'tenant', username: 'new_user', name: 'New User', email: 'untrusted@example.com',
  password: 'Strong123!', confirmPassword: 'Strong123!', termsAccepted: true,
  firstName: 'New', lastName: 'User', mobileNumber: '09171234567', landlordVerificationAccepted: true,
};
test('expired access token is refreshed before Google signup is completed', async () => {
  const { service } = await setup({ expired: true });
  const profile = await service.finalizeGoogleSignup(null, input);
  assert.equal(profile.email, 'verified@gmail.com');
  assert.equal(profile.role, 'tenant');
});
test('changing Google accounts while filling the form blocks submission', async () => {
  const { service, rows } = await setup();
  await assert.rejects(service.finalizeGoogleSignup({ id: 'different-id' }, input), /account changed/);
  assert.equal(rows.length, 0);
});
test('new Google session stays without a profile until the form is submitted', async () => {
  const { service, rows } = await setup();
  assert.equal(await service.getCurrentAuthenticatedUser(), null);
  assert.equal((await service.loginWithGoogle()).needsAccount, true);
  assert.equal(rows.length, 0);
});
test('legacy automatically generated Google tenant profile cannot enter the dashboard', async () => {
  const { service, writes } = await setup({ existing: {
    id: 'google-id', role: 'tenant', status: 'active', username: 'user_0123456789abcdef01234567',
  } });
  assert.equal(await service.getCurrentAuthenticatedUser(), null);
  assert.equal((await service.loginWithGoogle()).needsAccount, true);
  assert.equal(writes.length, 0);
});
for (const role of ['tenant', 'landlord']) {
  test(`Google registration saves the selected ${role} and verified email`, async () => {
    const { service, rows, writes } = await setup();
    const profile = await service.finalizeGoogleSignup(null, { ...input, role });
    assert.equal(profile.role, role);
    assert.equal(profile.id, "google-id");
    assert.equal(profile.authId, "google-id");
    assert.equal(profile.email, 'verified@gmail.com');
    assert.equal(profile.username, input.username);
    assert.equal(writes[0].password, input.password);
    assert.equal(rows.length, 1);
    assert.equal(profile.status, role === 'landlord' ? 'pending' : 'active');
    if (role === 'landlord') assert.ok(writes.some(write => write.table === 'landlord_profiles'));
  });
}
test('unverified Google email cannot create a profile', async () => {
  const { service, rows, writes } = await setup({ confirmed: false });
  await assert.rejects(service.finalizeGoogleSignup(null, input), /verify/i);
  assert.equal(rows.length, 0);
  assert.equal(writes.length, 0);
});
test('missing terms, invalid role and incomplete landlord form are rejected', async () => {
  const { service, rows } = await setup();
  for (const override of [{ termsAccepted: false }, { role: 'admin' }, { role: 'landlord', firstName: '' }, { username: '' }]) {
    await assert.rejects(service.finalizeGoogleSignup(null, { ...input, ...override }));
  }
  assert.equal(rows.length, 0);
});
test('an existing landlord keeps the stored role and does not create another account', async () => {
  const { service, rows, writes } = await setup({ existing: { id: 'existing', role: 'landlord', status: 'pending' } });
  const profile = await service.finalizeGoogleSignup(null, input);
  assert.equal(profile.role, 'landlord');
  assert.equal(rows.length, 1);
  assert.ok(!writes.some(write => write.password));
});
test('disabled existing accounts remain blocked', async () => {
  const { service } = await setup({ existing: { id: 'existing', role: 'tenant', status: 'disabled' } });
  await assert.rejects(service.getCurrentAuthenticatedUser(), /deactivated/);
  await assert.rejects(service.finalizeGoogleSignup(null, input), /deactivated/);
});

test('closing an unfinished Google flow clears only the local session', async () => {
  const { service, writes } = await setup();
  await service.resetUnfinishedGoogleSignIn();
  assert.deepEqual(writes, [{ signOut: { scope: 'local' } }]);
  assert.equal(await service.getCurrentAuthenticatedUser(), null);
});
test('closing a popup does not sign out a completed account', async () => {
  const { service, writes } = await setup({ existing: { id: 'existing', role: 'tenant', status: 'active' } });
  await service.resetUnfinishedGoogleSignIn();
  assert.equal(writes.length, 0);
});
test('immediate Google retry waits for closing reset and opens the account chooser', async () => {
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.window = { location: { origin: 'http://localhost:5173' }, localStorage: storage, sessionStorage: storage };
  try {
    const { service, writes } = await setup();
    const reset = service.resetUnfinishedGoogleSignIn();
    await service.loginWithGoogle();
    await reset;
    assert.equal(writes[0].signOut.scope, 'local');
    assert.equal(writes[1].oauth.options.queryParams.prompt, 'select_account');
  } finally { delete globalThis.window; }
});
