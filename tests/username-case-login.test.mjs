import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/services/authService.js', import.meta.url), 'utf8');
const start = source.indexOf('export async function loginUser(credentials)');
const end = source.indexOf('export async function resendSignupVerification', start);
const createLogin = new Function('supabaseClient', 'ensureProfileForAuthUser', 'assertActiveAccount', 'recordLogin', 'persistCurrentUser', source.slice(start, end).replace('export async function', 'async function') + ';return loginUser;');

test('username login preserves case and rejects a different capitalization', async () => {
  const submitted = [];
  const client = {
    functions: { invoke: async (name, { body }) => {
      submitted.push(body);
      return body.username === 'Fritz'
        ? { data: { session: { access_token: 'test', refresh_token: 'test' } } }
        : { data: { error: 'Invalid username or password.' } };
    } },
    auth: { setSession: async () => ({ data: { user: { id: 'user-id' } } }) },
  };
  const login = createLogin(client, async () => ({ id: 'profile-id' }), () => {}, async () => {}, () => {});
  assert.equal((await login({ username: 'Fritz', password: 'Secret123' })).id, 'profile-id');
  for (const username of ['fritz', 'FRITZ']) {
    await assert.rejects(login({ username, password: 'Secret123' }), /Invalid username or password/);
  }
  assert.deepEqual(submitted.map(value => value.username), ['Fritz', 'fritz', 'FRITZ']);
});
