import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const serviceSource = readFileSync(new URL('../src/services/maintenanceService.js', import.meta.url), 'utf8');
const start = serviceSource.indexOf('export const MAINTENANCE_PORTALS');
const end = serviceSource.indexOf('export async function fetchMaintenanceSettings', start);
const body = serviceSource
  .slice(start, end)
  .replace(/export const/g, 'const')
  .replace(/export function/g, 'function');
const { isMaintenanceActive, normalizeMaintenanceSetting } = new Function(
  `${body};return {isMaintenanceActive,normalizeMaintenanceSetting};`,
)();

test('maintenance is active only inside an enabled schedule', () => {
  const now = new Date('2026-10-15T04:00:00Z');
  assert.equal(isMaintenanceActive({ enabled: false }, now), false);
  assert.equal(isMaintenanceActive({ enabled: true }, now), true);
  assert.equal(isMaintenanceActive({ enabled: true, starts_at: '2026-10-15T05:00:00Z' }, now), false);
  assert.equal(isMaintenanceActive({ enabled: true, ends_at: '2026-10-15T03:00:00Z' }, now), false);
  assert.equal(isMaintenanceActive({
    enabled: true,
    starts_at: '2026-10-15T03:00:00Z',
    ends_at: '2026-10-15T05:00:00Z',
  }, now), true);
});

test('missing maintenance rows default to an available portal', () => {
  assert.deepEqual(normalizeMaintenanceSetting(null, 'tenant'), {
    portal: 'tenant',
    enabled: false,
    title: '',
    message: '',
    starts_at: null,
    ends_at: null,
  });
});

test('the app gate applies only to tenant and landlord roles', () => {
  const rootSource = readFileSync(new URL('../src/components/Root.jsx', import.meta.url), 'utf8');
  assert.match(rootSource, /\["tenant", "landlord"\]\.includes\(user\.role\)/);
  assert.match(rootSource, /subscribeToMaintenanceSettings/);
});

test('back to home waits for the auth session to sign out', () => {
  const rootSource = readFileSync(new URL('../src/components/Root.jsx', import.meta.url), 'utf8');
  const authContextSource = readFileSync(new URL('../src/contexts/AuthContext.jsx', import.meta.url), 'utf8');
  assert.match(rootSource, /await logout\(\);\s*window\.location\.assign\("\/"\)/);
  assert.match(authContextSource, /return logoutUser\(\)\.catch/);
});

test('maintenance has a dedicated super admin sidebar destination', () => {
  const sidebarSource = readFileSync(new URL('../src/superadmin/AdminSidebar.jsx', import.meta.url), 'utf8');
  const helperSource = readFileSync(new URL('../src/superadmin/adminDashboardHelpers.jsx', import.meta.url), 'utf8');
  assert.match(sidebarSource, /label: "Maintenance", section: "maintenance"/);
  assert.match(helperSource, /"maintenance"/);
});

test('tenant and landlord support requests have a dedicated super admin inbox', () => {
  const sidebarSource = readFileSync(new URL('../src/superadmin/AdminSidebar.jsx', import.meta.url), 'utf8');
  const dashboardSource = readFileSync(new URL('../src/superadmin/AdminDashboard.jsx', import.meta.url), 'utf8');
  assert.match(sidebarSource, /label: "Contact Support", section: "support"/);
  assert.match(dashboardSource, /fetchSupportTicketById/);
  assert.match(dashboardSource, /activeSection === "support" \? category === "support" : category !== "support"/);
});

test('super admin notifications expose operational event filters', () => {
  const dashboardSource = readFileSync(new URL('../src/superadmin/AdminDashboard.jsx', import.meta.url), 'utf8');
  for (const filter of ['Accounts', 'Properties', 'Approvals', 'Archived']) {
    assert.match(dashboardSource, new RegExp(`label: "${filter}"`));
  }
  assert.doesNotMatch(dashboardSource, /label: "System"/);
  assert.match(dashboardSource, /return "approvals"/);
  assert.match(dashboardSource, /return "properties"/);
  assert.match(dashboardSource, /return "accounts"/);
});
