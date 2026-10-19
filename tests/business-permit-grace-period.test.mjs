import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPermitAccount, formatPermitDate, getBusinessPermitStatus, getPermitExpiry, getPermitNotificationDetails, isBusinessPermitNotification } from '../src/utils/businessPermitStatus.js';
import { isTenantVisibleApartment } from '../src/utils/listingVisibility.js';

const oldExpiry = '2027-01-01T00:00:00+08:00';
const newExpiry = '2028-01-01T00:00:00+08:00';
const property = (published = true) => ({
  id: 'apartment-a', landlordId: 'landlord-a', title: 'Apartment A', isPublished: published,
  approvalStatus: 'approved', status: 'available', availableDate: '2020-01-01',
  features: { verification: { businessPermit: 'BP-2026', permitExpiry: oldExpiry } },
  rooms: [{ status: 'available', isOccupied: false, price: 3500 }],
});
const account = ({ renewal, published = true, profileExpiry = oldExpiry } = {}) => ({
  user_id: 'landlord-a', permit_expiry: profileExpiry, status: 'active', is_verified: true,
  currentPermits: [property().features.verification], renewals: renewal ? [renewal] : [], apartments: [property(published)],
});
const pending = { id: 'renewal-2027', landlord_id: 'landlord-a', permit_year: 2027, status: 'pending_review', expires_at: newExpiry, submitted_at: '2027-01-20T09:00:00+08:00' };
const approved = { ...pending, status: 'approved' };

const scenarios = [
  ['December 31: current permit remains valid', '2026-12-31T23:59:59+08:00', {}, 'valid', false, true],
  ['January 1: expired permit enters grace period', '2027-01-01T00:00:00+08:00', {}, 'grace_period', true, true],
  ['January 15: no renewal, published apartments stay visible', '2027-01-15T12:00:00+08:00', {}, 'grace_period', true, true],
  ['January 20: pending renewal retains grace period', '2027-01-20T12:00:00+08:00', { renewal: pending, profileExpiry: newExpiry }, 'pending_renewal', true, true],
  ['January 25: approved current-year renewal removes the warning', '2027-01-25T12:00:00+08:00', { renewal: approved, profileExpiry: newExpiry }, 'renewed', false, true],
  ['January 31: final minute remains within grace period', '2027-01-31T23:59:59+08:00', {}, 'grace_period', true, true],
  ['February 1: backend-unpublished apartment is hidden', '2027-02-01T00:00:00+08:00', { published: false }, 'expired', false, false],
  ['February 1: approved renewal and published apartment remain visible', '2027-02-01T00:00:00+08:00', { renewal: approved, profileExpiry: newExpiry }, 'renewed', false, true],
  ['February 2: late approval never republishes the apartment', '2027-02-02T12:00:00+08:00', { renewal: approved, profileExpiry: newExpiry, published: false }, 'renewed', false, false],
];

for (const [name, date, options, expected, grace, visible] of scenarios) {
  test(name, () => {
    const permit = account(options);
    const before = structuredClone(permit);
    const status = getBusinessPermitStatus(permit, new Date(date));
    assert.equal(status.status, expected);
    assert.equal(status.inGracePeriod, grace);
    assert.equal(isTenantVisibleApartment(permit.apartments[0]), visible);
    assert.deepEqual(permit, before, 'Display calculations must not change backend statuses or publication');
    if (grace) {
      assert.equal(status.graceDeadline, Date.parse('2027-01-31T23:59:00+08:00'));
      assert.equal(status.unpublishAt, Date.parse('2027-02-01T00:00:00+08:00'));
      assert.equal(status.expirationDate, Date.parse(oldExpiry) - 1);
    }
    if (options.renewal) assert.equal(status.renewalStatus, options.renewal.status);
    if (expected === 'renewed') assert.equal(status.approvedRenewal, true);
    if (expected === 'expired' && options.published === false) assert.equal(status.label, 'Expired / Listings Unpublished');
  });
}

test('Philippine midnight boundaries are independent of UTC calendar dates', () => {
  assert.equal(getBusinessPermitStatus(account(), new Date('2026-12-31T15:59:59.999Z')).inGracePeriod, false);
  assert.equal(getBusinessPermitStatus(account(), new Date('2026-12-31T16:00:00Z')).inGracePeriod, true);
  assert.equal(getBusinessPermitStatus(account(), new Date('2027-01-31T15:59:59.999Z')).inGracePeriod, true);
  assert.equal(getBusinessPermitStatus(account(), new Date('2027-01-31T16:00:00Z')).inGracePeriod, false);
});

test('date-only and zone-free annual expiry values use Philippine time', () => {
  assert.equal(getPermitExpiry({ permit_expiry: '2026-12-31' }), Date.parse(oldExpiry));
  assert.equal(getPermitExpiry({ expires_at: '2027-01-01' }), Date.parse(oldExpiry));
  assert.equal(getPermitExpiry({ expires_at: '2027-01-01T00:00:00' }), Date.parse(oldExpiry));
  assert.equal(getPermitExpiry({ permit_year: 2026 }), Date.parse(oldExpiry));
});

test('previous-year approval is not approval of the new renewal cycle', () => {
  const permit = account({ renewal: { ...approved, permit_year: 2026, expires_at: oldExpiry } });
  const status = getBusinessPermitStatus(permit, new Date('2027-01-15T12:00:00+08:00'));
  assert.equal(status.inGracePeriod, true);
  assert.equal(status.approvedRenewal, false);
  assert.equal(status.renewalLabel, 'No renewal submitted');
});

test('pending review is kept separate from a verified landlord account', () => {
  const status = getBusinessPermitStatus(account({ renewal: pending, profileExpiry: newExpiry }), new Date('2027-01-20T12:00:00+08:00'));
  assert.equal(status.status, 'pending_renewal');
  assert.equal(status.renewalLabel, 'Pending approval');
  assert.equal(status.approvedRenewal, false);
  assert.equal(status.graceLabel, 'Grace Period — Until January 31');
});

test('expired pending renewals keep their submission status after the grace deadline', () => {
  const status = getBusinessPermitStatus(account({ renewal: pending, profileExpiry: newExpiry, published: false }), new Date('2027-02-01T00:00:00+08:00'));
  assert.equal(status.label, 'Expired / Listings Unpublished');
  assert.equal(status.renewalLabel, 'Pending approval');
  assert.equal(status.graceDeadline, Date.parse('2027-01-31T23:59:00+08:00'));
});

test('a backend-published apartment is never hidden based only on the client clock', () => {
  const permit = account();
  const status = getBusinessPermitStatus(permit, new Date('2027-02-01T00:00:00+08:00'));
  assert.equal(status.label, 'Expired');
  assert.equal(status.listingsUnpublished, false);
  assert.equal(isTenantVisibleApartment(permit.apartments[0]), true);
});

test('old permits do not get a fresh grace period every January', () => {
  const status = getBusinessPermitStatus(account(), new Date('2028-01-15T12:00:00+08:00'));
  assert.equal(status.status, 'expired');
  assert.equal(status.inGracePeriod, false);
});

test('superseded history retains the previous expiration while a new renewal awaits approval', () => {
  const permit = account({ renewal: pending, profileExpiry: newExpiry });
  permit.currentPermits = [];
  permit.renewals.push({ permit_year: 2026, status: 'superseded', expires_at: oldExpiry });
  const status = getBusinessPermitStatus(permit, new Date('2027-01-20T12:00:00+08:00'));
  assert.equal(status.inGracePeriod, true);
  assert.equal(status.expirationDate, Date.parse(oldExpiry) - 1);
});

test('missing permit metadata never invents an approval or expiration date', () => {
  const status = getBusinessPermitStatus({ is_verified: true, status: 'active' }, new Date('2027-01-15T12:00:00+08:00'));
  assert.equal(status.status, 'unknown');
  assert.equal(status.expirationDate, null);
  assert.equal(status.graceDeadline, null);
});

test('a metadata permission failure does not present stale permit dates as confirmed status', () => {
  const permit = { ...account(), statusError: 'Permission denied' };
  const status = getBusinessPermitStatus(permit, new Date('2027-01-15T12:00:00+08:00'));
  assert.equal(status.status, 'unknown');
  assert.equal(status.inGracePeriod, false);
});

test('landlord account grouping isolates profiles, renewal records, and apartment ownership', () => {
  const records = {
    profiles: [{ user_id: 'landlord-a', permit_expiry: oldExpiry }, { user_id: 'landlord-b', permit_expiry: newExpiry }],
    renewals: [pending, { ...approved, landlord_id: 'landlord-b' }],
  };
  const result = buildPermitAccount('landlord-a', records, [property(), { ...property(), landlordId: 'landlord-b' }]);
  assert.equal(result.renewals.length, 1);
  assert.equal(result.renewals[0].status, 'pending_review');
  assert.equal(result.apartments.length, 1);
  assert.equal(result.permit_expiry, oldExpiry);
});

test('all permit notification stages preserve Supabase text and display the policy deadline', () => {
  for (const type of ['business_permit_renewal_reminder', 'business_permit_urgent_reminder', 'business_permit_final_notice', 'business_permit_expired', 'business_permit_grace_period', 'business_permit_listings_unpublished']) {
    const notification = { type, title: 'Server title', message: 'Server message', payload: { permit_year: 2026, expiration_at: oldExpiry, apartment_names: ['Apartment A', 'Apartment B'] } };
    const before = structuredClone(notification);
    const details = getPermitNotificationDetails(notification);
    assert.equal(details.graceDeadline, Date.parse('2027-01-31T23:59:00+08:00'));
    assert.equal(details.apartmentNames, 'Apartment A, Apartment B');
    assert.deepEqual(notification, before);
  }
  assert.equal(getPermitNotificationDetails({ type: 'report_submitted' }), null);
  assert.equal(isBusinessPermitNotification({ payload: { permit_event_id: 'permit-event' } }), true);
});

test('pending renewal notifications retain the current cycle approval deadline', () => {
  const details = getPermitNotificationDetails({ type: 'business_permit_updated', payload: { permit_year: 2027, expiration_at: newExpiry, renewal_status: 'pending_review' } });
  assert.equal(details.graceDeadline, Date.parse('2027-01-31T23:59:00+08:00'));
  assert.match(formatPermitDate(details.graceDeadline, true), /January 31, 2027/);
});

test('notification deadlines follow the actual expiry and resolve only associated apartment names', () => {
  const notification = { type: 'business_permit_listings_unpublished', payload: { permit_year: 2027, expiration_at: oldExpiry, landlord_id: 'landlord-a', apartment_ids: ['apartment-a'] } };
  const details = getPermitNotificationDetails(notification, [property(), { ...property(), id: 'other-apartment', landlordId: 'landlord-b', title: 'Other landlord' }]);
  assert.equal(details.graceDeadline, Date.parse('2027-01-31T23:59:00+08:00'));
  assert.equal(details.apartmentNames, 'Apartment A');
});

test('permit record fetches are scoped to the authenticated landlord and surface permission failures', async () => {
  const code = readFileSync(new URL('../src/services/businessPermitRenewalService.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  const calls = [];
  const client = { from: (table) => ({
    select() { calls.push([table, 'select']); return this; }, order() { return this; },
    eq(column, value) { calls.push([table, column, value]); return this; },
    then(resolve) { return Promise.resolve({ data: [], error: table === 'landlord_permit_renewals' ? { message: 'Permission denied' } : null }).then(resolve); },
  }) };
  const fetch = new Function('supabase', 'safeRandomId', `${code}; return fetchBusinessPermitRecords;`)(client, () => 'id');
  await assert.rejects(() => fetch('landlord-a'), /Permission denied/);
  assert.ok(calls.some(([table, column, value]) => table === 'landlord_permit_renewals' && column === 'landlord_id' && value === 'landlord-a'));
  assert.ok(calls.some(([table, column, value]) => table === 'landlord_profiles' && column === 'user_id' && value === 'landlord-a'));
});

test('existing permit documents remain available if renewal metadata cannot be read', async () => {
  const code = readFileSync(new URL('../src/services/verificationDocumentsService.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  const signedPaths = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'auth-a' } }, error: null }) },
    from: (table) => ({
      select() { return this; }, eq() { return this; }, order() { return this; },
      async maybeSingle() { return { data: { id: 'landlord-a', role: 'landlord' }, error: null }; },
      then(resolve) {
        const data = table === 'apartments' ? [
          { id: 'apartment-a', landlord_id: 'landlord-a', title: 'Apartment A', is_published: true, features: property().features },
          { id: 'foreign-apartment', landlord_id: 'landlord-b', features: property().features },
        ] : [
          { id: 'document-a', apartment_id: 'apartment-a', landlord_id: 'landlord-a', storage_path: 'own/permit.pdf', file_name: 'permit.pdf' },
          { id: 'foreign-document', apartment_id: 'foreign-apartment', landlord_id: 'landlord-b', storage_path: 'foreign/permit.pdf' },
        ];
        return Promise.resolve({ data, error: null }).then(resolve);
      },
    }),
    storage: { from: () => ({ async createSignedUrl(path) { signedPaths.push(path); return { data: { signedUrl: 'https://example.invalid/' + path }, error: null }; } }) },
  };
  const fetch = new Function('supabase', 'fetchBusinessPermitRecords', 'buildPermitAccount', `${code}; return fetchLandlordBusinessPermits;`)(
    client, async () => { throw new Error('Renewal permission denied'); }, buildPermitAccount,
  );
  const permits = await fetch();
  assert.equal(permits.length, 1);
  assert.equal(permits[0].documentUrl, 'https://example.invalid/own/permit.pdf');
  assert.match(permits[0].permitAccount.statusError, /Renewal permission denied/);
  assert.deepEqual(signedPaths, ['own/permit.pdf']);
  assert.equal(getBusinessPermitStatus(permits[0].permitAccount, new Date('2027-01-15T12:00:00+08:00')).status, 'unknown');
});
