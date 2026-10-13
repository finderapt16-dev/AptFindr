import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/services/authService.js', import.meta.url), 'utf8');
const start = source.indexOf('const ADMIN_ROLES');
const end = source.indexOf('// The marker', start);
const body = source.slice(start, end).replace(/export function/g, 'function');
const { dashboardPathForRole, isAdminRole, isSuperAdminRole, isTenantRole } = new Function(`${body};return {dashboardPathForRole,isAdminRole,isSuperAdminRole,isTenantRole};`)();

test('super admin is treated as an internal admin role', () => {
  assert.equal(isAdminRole('super_admin'), true);
  assert.equal(isAdminRole(' Super_Admin '), true);
  assert.equal(isAdminRole('admin'), true);
  assert.equal(isAdminRole('landlord'), false);
});

test('super admin has its own dashboard path', () => {
  assert.equal(isSuperAdminRole('super_admin'), true);
  assert.equal(isSuperAdminRole('admin'), false);
  assert.equal(dashboardPathForRole('super_admin'), '/super-admin');
  assert.equal(dashboardPathForRole('admin'), '/admin');
  assert.equal(dashboardPathForRole('landlord'), '/landlord/dashboard');
});

test('tenant role normalization remains unchanged', () => {
  assert.equal(isTenantRole('student'), true);
  assert.equal(isTenantRole('employee'), true);
  assert.equal(isTenantRole('super_admin'), false);
});
