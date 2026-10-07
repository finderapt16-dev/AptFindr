/*
 * Presentation helpers for the tenant notifications screen.
 * Deliberately framework-free so they can be exercised by `npm test`
 * (node --test) without a DOM or a Supabase connection.
 */

const REPORT_PAYLOAD_KEYS = ["report_id", "related_report_id", "reportId"];
const APARTMENT_PAYLOAD_KEYS = ["apartment_id", "apartmentId"];

function textValue(value) {
    if (typeof value === "string")
        return value.trim();
    if (typeof value === "number" && Number.isFinite(value))
        return String(value);
    return "";
}

function payloadOf(item) {
    const payload = item?.payload;
    return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
}

function firstPayloadValue(payload, keys) {
    for (const key of keys) {
        const value = textValue(payload?.[key]);
        if (value)
            return value;
    }
    return "";
}

/**
 * Group a notification into the three visual buckets the tenant screen uses.
 * `action_target_type` wins when present; otherwise the notification `type`
 * string is inspected, because every notification written by this app stores
 * its target ids in `payload` instead of the action_target_* columns.
 */
export function notificationKind(item) {
    const type = textValue(item?.type).toLowerCase();
    const target = textValue(item?.action_target_type).toLowerCase();
    if (target === "report" || type.includes("report"))
        return "report";
    if (target === "apartment" || type.includes("apartment") || type.includes("availability"))
        return "apartment";
    return "system";
}

/** Report id behind a notification, whatever column/payload it was stored in. */
export function reportIdOf(item) {
    if (textValue(item?.action_target_type).toLowerCase() === "report") {
        const direct = textValue(item?.action_target_id);
        if (direct)
            return direct;
    }
    return firstPayloadValue(payloadOf(item), REPORT_PAYLOAD_KEYS);
}

/** Apartment id behind a notification, falling back to the payload. */
export function apartmentIdOf(item) {
    if (textValue(item?.action_target_type).toLowerCase() === "apartment") {
        const direct = textValue(item?.action_target_id);
        if (direct)
            return direct;
    }
    return firstPayloadValue(payloadOf(item), APARTMENT_PAYLOAD_KEYS);
}

/**
 * In-app route a notification should open, or "" when there is nowhere to go.
 * Absolute URLs (http/https) are ignored: the tenant shell only renders
 * internal routes, so returning one would produce a dead button.
 */
export function resolveActionUrl(item) {
    const raw = textValue(item?.action_url) || textValue(payloadOf(item).action_url);
    if (raw.startsWith("/"))
        return raw;
    if (notificationKind(item) === "apartment") {
        const apartmentId = apartmentIdOf(item);
        return apartmentId ? `/apartment/${encodeURIComponent(apartmentId)}` : "";
    }
    return "";
}

/** Label for the primary action button, or null when no action is available. */
export function resolveActionLabel(item) {
    const kind = notificationKind(item);
    if (kind === "report")
        return "View Report";
    if (!resolveActionUrl(item))
        return null;
    return kind === "apartment" ? "View Apartment" : "View Update";
}

/**
 * Human friendly age for a notification timestamp. Accepts an injectable
 * `now` so it stays deterministic in tests. Invalid or missing timestamps
 * resolve to "Recently" instead of throwing (Intl.format throws RangeError
 * on an invalid Date, which would blank out the whole screen).
 */
export function relativeTime(value, now = Date.now()) {
    if (!value)
        return "Recently";
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp))
        return "Recently";
    const elapsed = now - timestamp;
    const minutes = Math.max(0, Math.floor(elapsed / 60_000));
    if (minutes < 1)
        return "Just now";
    if (minutes < 60)
        return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7)
        return `${days} ${days === 1 ? "day" : "days"} ago`;
    return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
}
