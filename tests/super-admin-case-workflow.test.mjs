import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';

const dashboardSource = readFileSync(
  new URL('../src/superadmin/SuperAdminDashboard.jsx', import.meta.url),
  'utf8',
);
const workflowSqlPath = new URL('../scripts/appeal_workflow_migration.sql', import.meta.url);
const authorizationMigrationPath = new URL('../supabase/migrations/20261016000000_super_admin_case_workflow.sql', import.meta.url);
const localMigrationsAvailable = existsSync(workflowSqlPath) && existsSync(authorizationMigrationPath);

test('super admin shares the current admin report and appeal workflows', () => {
  assert.match(dashboardSource, /AdminReports.*from ['"]@\/admin\/AdminReports['"]/);
  assert.match(dashboardSource, /AdminAppeals.*from ['"]@\/admin\/AdminAppeals['"]/);
});

test('super admin refreshes reports and appeals after a workflow action', () => {
  assert.match(dashboardSource, /onWorkflowChanged=\{async \(\) =>/);
  assert.match(dashboardSource, /Promise\.all\(\[fetchAdminReports\(\), fetchPendingAppeals\(\)\]\)/);
  assert.match(dashboardSource, /setReports\(nextReports\)/);
  assert.match(dashboardSource, /setAppeals\(nextAppeals\)/);
});

test('shared case components retain super admin navigation paths', () => {
  assert.match(dashboardSource, /portalBasePath = "\/super-admin"/);
  assert.match(dashboardSource, /apartmentDetailBasePath = "\/super-admin\/apartment"/);
  assert.match(dashboardSource, /portalBasePath=\{portalBasePath\}/);
  assert.match(dashboardSource, /apartmentDetailBasePath=\{apartmentDetailBasePath\}/);
});

test('report and appeal RPCs authorize both admin roles', {
  skip: localMigrationsAvailable ? false : 'SQL migrations are maintained locally and excluded from Git.',
}, () => {
  const workflowSql = readFileSync(workflowSqlPath, 'utf8');
  const authorizationMigration = readFileSync(authorizationMigrationPath, 'utf8');
  const staffRoleCheck = /in \('admin', 'super_admin'\)/;
  assert.match(workflowSql, staffRoleCheck);
  assert.doesNotMatch(workflowSql, /lower\(role::text\)='admin'/);
  assert.match(authorizationMigration, /create or replace function public\.fn_workflow_is_admin\(\)/);
  assert.match(authorizationMigration, staffRoleCheck);
});
