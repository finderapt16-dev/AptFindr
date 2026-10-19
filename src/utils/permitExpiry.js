export function hasExpiredPermit(apartment, landlord, now = Date.now()) {
    const verification = apartment?.features?.verification;
    const landlordVerification = landlord?.features?.verification;
    const expiry = verification?.permitExpiry ?? verification?.expiresAt
        ?? apartment?.permit_expiry ?? apartment?.permitExpiry
        ?? landlord?.permit_expiry ?? landlord?.permitExpiry
        ?? landlord?.expires_at ?? landlord?.expiresAt
        ?? landlordVerification?.permitExpiry ?? landlordVerification?.expiresAt;
    if (!expiry) return false;
    // Date-only permit expirations use the application's Manila calendar.
    const value = /^\d{4}-\d{2}-\d{2}$/.test(expiry)
        ? `${expiry}T00:00:00+08:00` : expiry;
    const expiresAt = Date.parse(value);
    return Number.isFinite(expiresAt) && expiresAt <= Number(now);
}
