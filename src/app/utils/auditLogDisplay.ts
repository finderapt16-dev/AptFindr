/**
 * Display-only formatting for database-backed activity records.
 *
 * Audit rows intentionally keep their original payload in the database. This
 * module is the boundary that prevents those payloads (and their internal
 * identifiers) from being rendered in the application.
 */

type UnknownRecord = Record<string, unknown>;

export type AuditDisplayChange = {
  key: string;
  summary: string;
};

export type AuditDisplayLog = {
  title: string;
  detail: string;
  changes: AuditDisplayChange[];
};

const FIELD_LABELS: Record<string, string> = {
  title: "Apartment name",
  name: "Name",
  price: "Rent",
  rent: "Rent",
  status: "Status",
  room_status: "Room status",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  sqft: "Floor area",
  address: "Address",
  city: "City",
  state: "Province",
  zip: "Postal code",
  description: "Description",
  pet_friendly: "Pet-friendly setting",
  parking: "Parking",
  furnished: "Furnished setting",
  is_published: "Listing visibility",
};

const SUMMARY_FIELDS: Record<string, string> = {
  amenities: "Amenities updated",
  utilities: "Utilities updated",
  features: "Features updated",
  images: "Images updated",
  apartment_images: "Images updated",
  rooms: "Rooms updated",
  room: "Room details updated",
  apartment_rooms: "Rooms updated",
};

const ACTION_LABELS: Record<string, string> = {
  apartment_updated: "Apartment updated",
  apartment_publication_updated: "Listing visibility updated",
  apartment_status_updated: "Apartment status updated",
  apartment_room_created: "Room added",
  apartment_room_updated: "Room updated",
  apartment_room_status_updated: "Room status updated",
  apartment_room_deleted: "Room removed",
  admin_profile_updated: "Admin profile updated",
  admin_message_sent: "Landlord notification sent",
  create_violation: "Violation recorded",
  verification_approved: "Verification approved",
  verification_rejected: "Verification rejected",
  landlord_verified: "Landlord verified",
  landlord_verification_revoked: "Landlord verification revoked",
  notification_sent: "Notification sent",
};

const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  maintenance: "Under Maintenance",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  verified: "Verified",
  suspended: "Suspended",
};

const INTERNAL_KEY = /(^|_)(id|uuid|auth|token|secret|password|path|url|uri|metadata|created|updated|deleted|timestamp|lat|lng)(_|$)/i;
const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
const URL_LIKE = /(?:https?:\/\/|data:|blob:|\/storage\/|supabase\.co)/i;
const CODE_LIKE = /(?:<\/?[a-z][^>]*>|=>|\bfunction\b|\bSELECT\b.+\bFROM\b)/i;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizedKey = (value: string): string => value.trim().toLowerCase().replace(/[\s-]+/g, "_");

const readableAction = (action: unknown): string => {
  const key = normalizedKey(typeof action === "string" ? action : "");
  if (ACTION_LABELS[key]) return ACTION_LABELS[key];
  if (key.includes("verification")) return key.includes("reject") || key.includes("revoke")
    ? "Verification status updated"
    : "Verification reviewed";
  if (key.includes("notification") || key.includes("message")) return "Notification activity recorded";
  if (key.includes("apartment") || key.includes("listing") || key.includes("room")) return "Listing activity recorded";
  if (key.includes("profile") || key.includes("user")) return "Account activity recorded";
  return "Administrative activity recorded";
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);

const safeScalar = (field: string, value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") {
    if (field === "is_published") return value ? "Published" : "Hidden";
    return value ? "Yes" : "No";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return field === "price" || field === "rent" ? formatCurrency(value) : String(value);
  }
  if (typeof value !== "string") return null;

  const clean = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean || clean.length > 160 || UUID_LIKE.test(clean) || URL_LIKE.test(clean) || CODE_LIKE.test(clean)) return null;
  if ((clean.startsWith("{") && clean.endsWith("}")) || (clean.startsWith("[") && clean.endsWith("]"))) return null;
  if ((field === "price" || field === "rent") && /^\d+(?:\.\d+)?$/.test(clean)) return formatCurrency(Number(clean));
  return STATUS_LABELS[clean.toLowerCase()] ?? clean;
};

export function formatAuditChanges(details: unknown): AuditDisplayChange[] {
  const changes = isRecord(details) && isRecord(details.changes) ? details.changes : {};
  const summaries = new Set<string>();
  const result: AuditDisplayChange[] = [];

  Object.entries(changes).forEach(([rawField, rawChange]) => {
    const field = normalizedKey(rawField);
    if (INTERNAL_KEY.test(field)) return;

    const summaryOnly = SUMMARY_FIELDS[field];
    if (summaryOnly) {
      if (!summaries.has(summaryOnly)) result.push({ key: field, summary: summaryOnly });
      summaries.add(summaryOnly);
      return;
    }

    const label = FIELD_LABELS[field];
    if (!label || !isRecord(rawChange)) return;
    const oldValue = safeScalar(field, rawChange.old);
    const newValue = safeScalar(field, rawChange.new);
    if (oldValue === null || newValue === null) {
      const summary = `${label} updated`;
      if (!summaries.has(summary)) result.push({ key: field, summary });
      summaries.add(summary);
      return;
    }
    result.push({ key: field, summary: `${label} changed from "${oldValue}" to "${newValue}"` });
  });

  return result;
}

export function formatAuditLogForDisplay(log: {
  action?: unknown;
  target_type?: unknown;
  details?: unknown;
}): AuditDisplayLog {
  const title = readableAction(log.action);
  const changes = formatAuditChanges(log.details);
  const targetType = normalizedKey(typeof log.target_type === "string" ? log.target_type : "");
  const detail = changes[0]?.summary
    ?? (targetType === "apartment" ? "Apartment activity recorded"
      : targetType === "violation" ? "Violation activity recorded"
      : targetType === "user" ? "Account activity recorded"
      : title);

  return { title, detail, changes };
}

/** Plain-text boundary for notification titles/messages loaded from storage. */
export function safeNotificationText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const clean = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/(?:https?:\/\/|data:|blob:)[^\s]+/gi, "[link hidden]")
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "[reference hidden]")
    .replace(/\/?(?:storage|uploads?)\/[^\s]+/gi, "[path hidden]")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean || clean.length > 500 || ((clean.startsWith("{") && clean.endsWith("}")) || (clean.startsWith("[") && clean.endsWith("]")))) {
    return fallback;
  }
  return clean;
}

export function formatNotificationType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const key = normalizedKey(value);
  if (!key || key.length > 60 || INTERNAL_KEY.test(key) || URL_LIKE.test(key) || CODE_LIKE.test(key)) return null;
  const labels: Record<string, string> = {
    verification_approved: "Verification approved",
    verification_rejected: "Verification update",
    new_apartment: "New apartment",
    apartment_submitted: "Apartment submitted",
    report: "Report",
    violation: "Violation",
    appeal: "Appeal",
    system: "System",
    info: "Information",
  };
  return labels[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
