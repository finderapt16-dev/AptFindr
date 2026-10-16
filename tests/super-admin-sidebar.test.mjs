import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const sidebarSource = readFileSync(
  new URL('../src/superadmin/SuperAdminSidebar.jsx', import.meta.url),
  'utf8',
);
const dashboardSource = readFileSync(
  new URL('../src/superadmin/SuperAdminDashboard.jsx', import.meta.url),
  'utf8',
);

test('super admin sidebar maps every review queue to its badge', () => {
  for (const section of ['landlords', 'apartments', 'notifications', 'reports', 'appeals', 'support']) {
    assert.match(sidebarSource, new RegExp(`section === "${section}"`));
  }
  assert.match(sidebarSource, /count > 0/);
  assert.match(sidebarSource, /admin-figma-sidebar-count/);
});

test('landlord and apartment badges use pending review counts', () => {
  assert.match(dashboardSource, /pendingLandlordsCount = landlords\.filter/);
  assert.match(dashboardSource, /pendingApartmentsCount = allApartments\.filter/);
  assert.match(dashboardSource, /getAdminListingState\(apartment\) === "pending"/);
  assert.match(dashboardSource, /pendingLandlordsCount=\{pendingLandlordsCount\}/);
  assert.match(dashboardSource, /pendingApartmentsCount=\{pendingApartmentsCount\}/);
});

test('mobile navigation total includes all sidebar attention badges', () => {
  for (const count of [
    'pendingLandlordsCount',
    'pendingApartmentsCount',
    'pendingReports',
    'activeAppealsCount',
    'unreadNotifsCount',
    'unreadSupportCount',
  ]) {
    assert.match(dashboardSource, new RegExp(`\\+?\\s*${count}`));
  }
});
