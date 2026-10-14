import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/services/superAdminUserService.js', import.meta.url), 'utf8');
const start = source.indexOf('export const MANAGED_USER_ROLES');
const end = source.indexOf('async function invokeSuperAdminUsers', start);
const body = source
  .slice(start, end)
  .replace(/export const/g, 'const')
  .replace(/export function/g, 'function');
const {
  getManagedUserInitials,
  getManagedUserRoleLabel,
  getManagedUserStatusLabel,
  isManageableAccountRole,
  isManagedUserInactive,
  normalizeManagedRole,
  summarizeManagedUsers,
} = new Function(`${body};return {getManagedUserInitials,getManagedUserRoleLabel,getManagedUserStatusLabel,isManageableAccountRole,isManagedUserInactive,normalizeManagedRole,summarizeManagedUsers};`)();

test('super admin users are grouped with admins for management totals', () => {
  const summary = summarizeManagedUsers([
    { role: 'super_admin' },
    { role: 'admin' },
    { role: 'landlord' },
    { role: 'tenant' },
  ]);
  assert.deepEqual(summary, { total: 4, admin: 2, landlord: 1, tenant: 1 });
  assert.equal(normalizeManagedRole('super_admin'), 'admin');
  assert.equal(getManagedUserRoleLabel({ role: 'super_admin' }), 'Admin');
});

test('inactive statuses map to the inactive badge', () => {
  for (const status of ['disabled', 'inactive', 'deactivated', 'deleted']) {
    assert.equal(isManagedUserInactive(status), true);
    assert.equal(getManagedUserStatusLabel({ status }), 'Inactive');
  }
  assert.equal(getManagedUserStatusLabel({ status: 'active' }), 'Active');
});

test('realtime management only accepts account roles visible to super admins', () => {
  for (const role of ['admin', 'super_admin', 'landlord', 'tenant']) {
    assert.equal(isManageableAccountRole(role), true);
  }
  for (const role of ['guest', 'owner', '', null]) {
    assert.equal(isManageableAccountRole(role), false);
  }
});

test('initials prefer names and fall back to email', () => {
  assert.equal(getManagedUserInitials({ name: 'Juan Dela Cruz', email: 'juan@example.com' }), 'JD');
  assert.equal(getManagedUserInitials({ email: 'tenant@example.com' }), 'TE');
});
