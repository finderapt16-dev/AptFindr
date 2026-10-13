import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/services/authService.js', import.meta.url), 'utf8');
const start = source.indexOf('function normalizeRoleValue(value)');
const end = source.indexOf('function normalizeEmailAddress', start);
const normalizeRoleValue = new Function(`${source.slice(start, end)};return normalizeRoleValue;`)();

test('role normalization accepts legacy super admin spellings', () => {
  for (const value of ['super_admin', 'super-admin', 'super admin', 'superadmin', ' SUPER-ADMIN ']) {
    assert.equal(normalizeRoleValue(value), 'super_admin');
  }
});

test('role normalization keeps legacy tenant roles usable', () => {
  assert.equal(normalizeRoleValue('student'), 'tenant');
  assert.equal(normalizeRoleValue('Employee'), 'tenant');
});
