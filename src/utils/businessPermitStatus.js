export const PERMIT_TIME_ZONE = "Asia/Manila";
const pendingStatuses = new Set(["pending", "pending_review", "under_review", "submitted"]);
const statusOf = (record) => String(record?.renewal_status ?? record?.renewalStatus ?? record?.status ?? "").trim().toLowerCase();
const annualCutoff = (year) => new Date(`${year + 1}-01-01T00:00:00+08:00`).getTime();
const graceCutoff = (year) => new Date(`${year + 1}-02-01T00:00:00+08:00`).getTime();

export function getManilaYear(date = new Date()) {
    return Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: PERMIT_TIME_ZONE }).format(date));
}

export function getPermitExpiry(record = {}) {
    const value = record.permitExpiry || record.permit_expiry || record.expires_at || record.expiresAt || record.expiration_at;
    if (value) {
        // Date-only Dec 31 values include that whole Philippine calendar day.
        // Jan 1 is the existing database's exclusive annual cutoff.
        const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(value));
        const localTimestamp = /^\d{4}-\d{2}-\d{2}T/.test(String(value)) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(String(value));
        const date = new Date(dateOnly ? `${value}T00:00:00+08:00` : localTimestamp ? `${value}+08:00` : value);
        const timestamp = date.getTime();
        if (Number.isFinite(timestamp)) return dateOnly && !String(value).endsWith("-01-01") ? timestamp + 86400000 : timestamp;
    }
    const year = Number(record.permit_year ?? record.permitYear);
    return Number.isInteger(year) && year >= 2000 && year < 9998 ? annualCutoff(year) : null;
}

const yearOf = (record) => {
    const year = Number(record?.permit_year ?? record?.permitYear);
    if (Number.isInteger(year) && year >= 2000 && year < 9998) return year;
    const expiry = getPermitExpiry(record);
    return expiry === null ? null : getManilaYear(new Date(expiry - 1));
};
const newestFirst = (left, right) => (yearOf(right) ?? 0) - (yearOf(left) ?? 0)
    || (Date.parse(right.submitted_at || right.created_at || "") || 0) - (Date.parse(left.submitted_at || left.created_at || "") || 0);

export function formatPermitDate(value, includeTime = false) {
    if (value === null || value === undefined || value === "") return "Not provided";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Not provided";
    return new Intl.DateTimeFormat("en-PH", {
        month: "long", day: "numeric", year: "numeric", timeZone: PERMIT_TIME_ZONE,
        ...(includeTime ? { hour: "numeric", minute: "2-digit", hour12: true } : {}),
    }).format(date);
}

export function getRenewalStatusLabel(status) {
    const value = String(status || "").toLowerCase();
    if (pendingStatuses.has(value)) return "Pending approval";
    return ({ approved: "Approved", requires_changes: "Changes requested", request_changes: "Changes requested", rejected: "Rejected", superseded: "Replaced" })[value]
        || (value ? value.replaceAll("_", " ") : "No renewal submitted");
}

// All statuses here are presentation only. Publication and approvals are never written.
export function getBusinessPermitStatus(permit = {}, now = new Date()) {
    const timestamp = new Date(now).getTime();
    const currentYear = getManilaYear(new Date(timestamp));
    const history = [...(permit.renewals ?? [])].sort(newestFirst);
    const renewals = history.filter((row) => statusOf(row) !== "superseded");
    const latest = renewals.find((row) => yearOf(row) >= currentYear) ?? (permit.renewal_status || permit.renewalStatus ? permit : null);
    const renewalStatus = statusOf(latest);
    const pending = pendingStatuses.has(renewalStatus);
    const approved = renewals.find((row) => statusOf(row) === "approved" && yearOf(row) <= currentYear && getPermitExpiry(row) > timestamp);
    const sources = [...(permit.currentPermits ?? []), permit, ...history.filter((row) => yearOf(row) < currentYear)];
    const candidates = sources.filter((row) => getPermitExpiry(row) !== null
        && !(latest && statusOf(latest) !== "approved" && yearOf(row) >= yearOf(latest)));
    const base = permit.statusError ? null : approved ?? candidates.sort(newestFirst)[0]
        ?? renewals.find((row) => statusOf(row) === "approved") ?? null;
    const expiresAt = base ? getPermitExpiry(base) : null;
    const permitYear = base ? yearOf(base) : null;
    const expired = expiresAt !== null && timestamp >= expiresAt;
    const cutoff = permitYear === null ? null : graceCutoff(permitYear);
    const inGracePeriod = expired && timestamp >= annualCutoff(permitYear) && timestamp < cutoff;
    const approvedRenewal = Boolean(approved);
    const apartments = permit.apartments ?? [];
    const listingsUnpublished = apartments.length > 0 && apartments.every((row) => (row.isPublished ?? row.is_published) === false);
    const complianceStatus = inGracePeriod ? "grace_period" : expired ? "expired" : expiresAt === null ? "unknown" : "valid";
    const status = expired && !inGracePeriod ? "expired" : pending ? "pending_renewal" : approvedRenewal ? "renewed" : complianceStatus;
    const label = ({
        valid: "Valid", grace_period: "Grace Period", pending_renewal: "Pending Renewal",
        expired: listingsUnpublished ? "Expired / Listings Unpublished" : "Expired",
        renewed: "Renewed", unknown: "Permit status unavailable",
    })[status];
    return {
        status, label, complianceStatus, inGracePeriod, expired, approvedRenewal, listingsUnpublished,
        renewalStatus, renewalLabel: getRenewalStatusLabel(renewalStatus), permitYear, expiresAt,
        expirationDate: expiresAt === null ? null : expiresAt - 1,
        graceDeadline: cutoff === null ? null : cutoff - 60000,
        unpublishAt: cutoff,
        tone: inGracePeriod ? "warning" : expired ? "danger" : status === "pending_renewal" ? "info" : status === "unknown" ? "neutral" : "success",
        graceLabel: inGracePeriod ? "Grace Period — Until January 31" : "",
    };
}

export function buildPermitAccount(landlordId, records = {}, apartments = []) {
    const id = String(landlordId);
    const owned = apartments.filter((row) => String(row.landlordId ?? row.landlord_id) === id);
    return {
        ...(records.profiles ?? []).find((row) => String(row.user_id) === id),
        renewals: (records.renewals ?? []).filter((row) => String(row.landlord_id) === id),
        currentPermits: owned.map((row) => row.features?.verification ?? {}),
        apartments: owned,
    };
}

export const isBusinessPermitNotification = (notification) => String(notification?.type ?? "").toLowerCase().startsWith("business_permit_")
    || Boolean(notification?.payload?.permit_event_id);

export function getPermitNotificationDetails(notification, apartments = []) {
    if (!isBusinessPermitNotification(notification)) return null;
    const payload = notification.payload ?? {};
    const expiry = getPermitExpiry(payload);
    const year = pendingStatuses.has(String(payload.renewal_status ?? "").toLowerCase())
        ? Number(payload.permit_year) - 1 : expiry === null ? yearOf(payload) : getManilaYear(new Date(expiry - 1));
    const cutoff = Number.isInteger(year) && year >= 2000 && year < 9998 ? graceCutoff(year) : null;
    const names = payload.apartment_names;
    const ids = Array.isArray(payload.apartment_ids) ? payload.apartment_ids.map(String) : payload.apartment_id ? [String(payload.apartment_id)] : [];
    const affectedApartments = apartments.filter((apartment) => (!ids.length || ids.includes(String(apartment.id)))
        && (!payload.landlord_id || String(apartment.landlordId ?? apartment.landlord_id) === String(payload.landlord_id)));
    return {
        expirationDate: expiry === null ? null : expiry - 1,
        graceDeadline: cutoff === null ? null : cutoff - 60000,
        renewalLabel: getRenewalStatusLabel(payload.renewal_status),
        apartmentNames: (Array.isArray(names) ? names.join(", ") : String(names ?? "")) || affectedApartments.map((apartment) => apartment.title).filter(Boolean).join(", "),
    };
}
