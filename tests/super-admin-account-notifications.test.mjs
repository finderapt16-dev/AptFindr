import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20261016020000_super_admin_account_notifications.sql', import.meta.url),
  'utf8',
);
const dashboard = readFileSync(
  new URL('../src/superadmin/SuperAdminDashboard.jsx', import.meta.url),
  'utf8',
);

test('new tenant and landlord profiles notify active Super Admins', () => {
  assert.match(migration, /after insert on public\.app_users/i);
  assert.match(migration, /v_account_role is null or v_account_role not in \('tenant', 'landlord'\)/i);
  assert.match(migration, /= 'super_admin'/i);
  assert.match(migration, /not in \('disabled', 'inactive', 'deactivated', 'deleted'\)/i);
  assert.match(migration, /'account_created'/i);
  assert.match(migration, /'category', 'accounts'/i);
  assert.match(migration, /'\/super-admin\?section=users'/i);
});

test('account creation notifications are persistent, deduplicated, and unrelated to login events', () => {
  assert.match(migration, /insert into public\.notifications/i);
  assert.match(migration, /existing\.payload ->> 'user_id' = new\.id::text/i);
  assert.doesNotMatch(migration, /on public\.logins/i);
});

test('the existing Super Admin notification center classifies and receives account notifications', () => {
  assert.match(dashboard, /value\.includes\("account"\)/i);
  assert.match(dashboard, /return "accounts"/i);
  assert.match(dashboard, /subscribeToLiveUpdates\(user\?\.id, "notifications", loadAdminNotifications\)/i);
});
