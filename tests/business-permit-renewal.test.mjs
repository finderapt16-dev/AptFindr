import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

async function loadService() {
  let source = readFileSync(new URL('../src/services/businessPermitRenewalService.js', import.meta.url), 'utf8');
  source = source.replace(/^import .*;\r?\n/gm, '');
  source = `const supabase = {}; const safeRandomId = () => "renewal-id";\n${source}`;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

test('renewal year uses the next permit cycle before annual expiration', async () => {
  const { getRenewalPermitYear } = await loadService();
  const permit = { permitExpiry: '2027-01-01T00:00:00+08:00' };
  const now = new Date('2026-10-12T12:00:00+08:00');
  assert.equal(getRenewalPermitYear(permit, now), 2027);
});

test('renewal year uses the current cycle after the old permit has expired', async () => {
  const { getRenewalPermitYear } = await loadService();
  const permit = { permitExpiry: '2027-01-01T00:00:00+08:00' };
  const now = new Date('2027-01-02T12:00:00+08:00');
  assert.equal(getRenewalPermitYear(permit, now), 2027);
});

test('replacing a pending renewal keeps its submitted cycle when the profile already has next-year expiry', async () => {
  const { getRenewalPermitYear } = await loadService();
  const permit = {
    permitExpiry: '2028-01-01T00:00:00+08:00',
    permitAccount: { renewals: [{ permit_year: 2027, status: 'pending_review' }] },
  };
  assert.equal(getRenewalPermitYear(permit, new Date('2027-01-20T12:00:00+08:00')), 2027);
});
