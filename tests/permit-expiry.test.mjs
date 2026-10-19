import test from 'node:test';
import assert from 'node:assert/strict';
import { hasExpiredPermit } from '../src/utils/permitExpiry.js';

test('permit expires at its expiration boundary in Manila', () => {
    const apartment = { features: { verification: { permitExpiry: '2026-10-19' } } };
    assert.equal(hasExpiredPermit(apartment, null, Date.parse('2026-10-18T15:59:59Z')), false);
    assert.equal(hasExpiredPermit(apartment, null, Date.parse('2026-10-18T16:00:00Z')), true);
});

test('apartment permit takes precedence over a landlord permit', () => {
    const apartment = { features: { verification: { permitExpiry: '2027-01-01' } } };
    const landlord = { permit_expiry: '2025-01-01' };
    assert.equal(hasExpiredPermit(apartment, landlord, Date.parse('2026-10-19')), false);
    assert.equal(hasExpiredPermit({}, landlord, Date.parse('2026-10-19')), true);
});

test('missing and invalid permit dates do not show expiration', () => {
    assert.equal(hasExpiredPermit({}, {}), false);
    assert.equal(hasExpiredPermit({ permitExpiry: 'invalid' }, null), false);
});
