import { supabase } from "../../lib/supabaseclient";
import { resolveAppUserId } from "./apartmentsService";

export type DashboardRow = Record<string, unknown>;

export interface DashboardStats {
  apartmentCount: number;
  publishedApartmentCount: number;
  favoriteCount: number;
  reportCount: number;
  violationCount: number;
  unreadNotificationCount: number;
}

export interface DashboardPropertyStats {
  apartmentCount: number;
  publishedApartmentCount: number;
  averagePrice: number;
  favoriteCount: number;
}

export interface DashboardReportRow extends DashboardRow {
  id?: string;
  reporter_id?: string | null;
  reporter_role?: string | null;
  apartment_id?: string | null;
  issue_type?: string | null;
  tags?: string[] | null;
  details?: string | null;
  contact?: string | null;
  severity?: string | null;
  submitted_at?: string | null;
  status?: string | null;
  resolved_at?: string | null;
  apartment_title?: string | null;
  reporter_name?: string | null;
  apartment?: string | null;
  reporter?: string | null;
  role?: string | null;
  issueType?: string | null;
  submittedAt?: string | null;
  apartmentId?: string | null;
}

export interface DashboardViolationRow extends DashboardRow {
  id?: string;
  landlord_id?: string | null;
  admin_id?: string | null;
  mode?: string | null;
  type?: string | null;
  message?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  related_report_id?: string | null;
  active?: boolean | null;
  landlordId?: string | null;
  landlordName?: string | null;
  apartmentTitle?: string | null;
  reportId?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  report_id?: string | null;
}

export interface DashboardNotificationRow extends DashboardRow {
  id?: string;
  user_id?: string | null;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  payload?: Record<string, unknown> | null;
  read?: boolean | null;
  created_at?: string | null;
  createdAt?: string | null;
  userId?: string | null;
  is_read?: boolean | null;
}

export interface DashboardApartmentRow extends DashboardRow {
  id?: string;
  landlord_id?: string | null;
  landlordId?: string | null;
  is_published?: boolean | null;
  isPublished?: boolean | null;
  price?: number | string | null;
}

export interface DashboardFavoriteRow extends DashboardRow {
  apartment_id?: string | null;
  user_id?: string | null;
  created_at?: string | null;
  apartmentId?: string | null;
  userId?: string | null;
  name?: string | null;
  role?: string | null;
}

export interface DashboardUserRow extends DashboardRow {
  id?: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  is_verified?: boolean | null;
  isVerified?: boolean | null;
  mobile?: string | null;
  mobileNumber?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  language?: string | null;
  timezone?: string | null;
  permit_number?: string | null;
  permitNumber?: string | null;
  department?: string | null;
  admin_level?: string | null;
  adminLevel?: string | null;
}

export interface DashboardProfilePayload {
  id: string;
  email: string;
  name: string;
  role?: string | null;
  mobile?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  language?: string | null;
  timezone?: string | null;
  middle_initial?: string | null;
  address?: string | null;
  is_verified?: boolean | null;
  permit_number?: string | null;
  department?: string | null;
  admin_level?: string | null;
  school?: string | null;
  guardian_name?: string | null;
  guardian_address?: string | null;
  guardian_contact?: string | null;
  company?: string | null;
  work_address?: string | null;
  business_name?: string | null;
  business_permit_number?: string | null;
  tin_number?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  permit_expiry?: string | null;
  business_type?: string | null;
  years_active?: string | number | null;
  total_units?: string | number | null;
  service_areas?: string | null;
  deposit_months?: string | number | null;
  advance_months?: string | number | null;
  min_lease_months?: string | number | null;
  pet_policy?: string | null;
  smoking_policy?: string | null;
  maintenance_response_hours?: string | number | null;
  listing_visibility?: string | null;
}

type TableName = "app_users" | "apartments" | "favorites" | "reports" | "violations" | "notifications" | "audit_logs";

const cacheKeyPrefix = "dashboard-supabase-cache";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function readCache(): Record<string, string> {
  if (!hasWindow()) {
    return {};
  }

  return safeJsonParse<Record<string, string>>(window.localStorage.getItem(cacheKeyPrefix), {});
}

function writeCache(cache: Record<string, string>): void {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(cacheKeyPrefix, JSON.stringify(cache));
}

function readCachedValue(key: string): string | null {
  return readCache()[key] ?? null;
}

function writeCachedValue(key: string, value: string): void {
  const cache = readCache();
  cache[key] = value;
  writeCache(cache);
}

function normalizeRecord<T extends DashboardRow>(record: DashboardRow): T {
  return record as T;
}

function getStringValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  return undefined;
}

function getBooleanValue(value: unknown): boolean {
  return value === true;
}

function getNumberValue(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function assignIfProvided(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function toNullableInteger(value: string | number | null | undefined): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

async function fetchRows<T extends DashboardRow>(table: TableName): Promise<T[]> {
  const { data, error } = await supabase.from(table).select("*");

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data.map((row) => normalizeRecord<T>(row as DashboardRow));
}

async function fetchRowsByColumn<T extends DashboardRow>(
  table: TableName,
  column: string,
  value: string,
): Promise<T[]> {
  const { data, error } = await supabase.from(table).select("*").eq(column, value);

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data.map((row) => normalizeRecord<T>(row as DashboardRow));
}

async function fetchSingleRowByColumn<T extends DashboardRow>(
  table: TableName,
  column: string,
  value: string,
): Promise<T | null> {
  const { data, error } = await supabase.from(table).select("*").eq(column, value).maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeRecord<T>(data as DashboardRow);
}

function toReportRow(row: DashboardRow): DashboardReportRow {
  return {
    ...row,
    id: getStringValue(row.id),
    reporter_id: getStringValue(row.reporter_id),
    reporter_role: getStringValue(row.reporter_role),
    apartment_id: getStringValue(row.apartment_id),
    issue_type: getStringValue(row.issue_type),
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : null,
    details: getStringValue(row.details),
    contact: getStringValue(row.contact),
    severity: getStringValue(row.severity),
    submitted_at: getStringValue(row.submitted_at),
    status: getStringValue(row.status),
    resolved_at: getStringValue(row.resolved_at),
    apartment_title: getStringValue(row.apartment_title),
    reporter_name: getStringValue(row.reporter_name),
    apartment: getStringValue(row.apartment),
    reporter: getStringValue(row.reporter),
    role: getStringValue(row.role),
    issueType: getStringValue(row.issueType),
    submittedAt: getStringValue(row.submittedAt),
    apartmentId: getStringValue(row.apartmentId),
  };
}

function toViolationRow(row: DashboardRow): DashboardViolationRow {
  return {
    ...row,
    id: getStringValue(row.id),
    landlord_id: getStringValue(row.landlord_id),
    admin_id: getStringValue(row.admin_id),
    mode: getStringValue(row.mode),
    type: getStringValue(row.type),
    message: getStringValue(row.message),
    issued_at: getStringValue(row.issued_at),
    expires_at: getStringValue(row.expires_at),
    related_report_id: getStringValue(row.related_report_id),
    active: typeof row.active === "boolean" ? row.active : null,
    landlordId: getStringValue(row.landlordId),
    landlordName: getStringValue(row.landlordName),
    apartmentTitle: getStringValue(row.apartmentTitle),
    reportId: getStringValue(row.reportId),
    issuedAt: getStringValue(row.issuedAt),
    expiresAt: getStringValue(row.expiresAt),
    report_id: getStringValue(row.report_id),
  };
}

function toNotificationRow(row: DashboardRow): DashboardNotificationRow {
  return {
    ...row,
    id: getStringValue(row.id),
    user_id: getStringValue(row.user_id),
    type: getStringValue(row.type),
    title: getStringValue(row.title),
    message: getStringValue(row.message),
    payload: typeof row.payload === "object" && row.payload !== null ? (row.payload as Record<string, unknown>) : null,
    read: typeof row.read === "boolean" ? row.read : null,
    created_at: getStringValue(row.created_at),
    createdAt: getStringValue(row.createdAt),
    userId: getStringValue(row.userId),
    is_read: typeof row.is_read === "boolean" ? row.is_read : null,
  };
}

function toApartmentRow(row: DashboardRow): DashboardApartmentRow {
  return {
    ...row,
    id: getStringValue(row.id),
    landlord_id: getStringValue(row.landlord_id),
    landlordId: getStringValue(row.landlordId),
    is_published: typeof row.is_published === "boolean" ? row.is_published : null,
    isPublished: typeof row.isPublished === "boolean" ? row.isPublished : null,
    price:
      typeof row.price === "string" || typeof row.price === "number" ? row.price : null,
  };
}

function toFavoriteRow(row: DashboardRow): DashboardFavoriteRow {
  return {
    ...row,
    apartment_id: getStringValue(row.apartment_id),
    user_id: getStringValue(row.user_id),
    created_at: getStringValue(row.created_at),
    apartmentId: getStringValue(row.apartmentId),
    userId: getStringValue(row.userId),
    name: getStringValue(row.name),
    role: getStringValue(row.role),
  };
}

function toUserRow(row: DashboardRow): DashboardUserRow {
  return {
    ...row,
    id: getStringValue(row.id),
    email: getStringValue(row.email),
    name: getStringValue(row.name),
    role: getStringValue(row.role),
    is_verified: typeof row.is_verified === "boolean" ? row.is_verified : null,
    isVerified: typeof row.isVerified === "boolean" ? row.isVerified : null,
    mobile: getStringValue(row.mobile),
    mobileNumber: getStringValue(row.mobileNumber),
    avatar_url: getStringValue(row.avatar_url),
    bio: getStringValue(row.bio),
    language: getStringValue(row.language),
    timezone: getStringValue(row.timezone),
    permit_number: getStringValue(row.permit_number),
    permitNumber: getStringValue(row.permitNumber),
    department: getStringValue(row.department),
    admin_level: getStringValue(row.admin_level),
    adminLevel: getStringValue(row.adminLevel),
  };
}

export async function fetchAdminReports(): Promise<DashboardReportRow[]> {
  const reports = await fetchRows<DashboardReportRow>("reports");
  const normalized = reports.map((row) => toReportRow(row));
  if (normalized.length > 0) {
    writeCachedValue("reports", JSON.stringify(normalized));
    return normalized;
  }

  return safeJsonParse<DashboardReportRow[]>(readCachedValue("reports"), []);
}

export async function fetchViolations(): Promise<DashboardViolationRow[]> {
  const violations = await fetchRows<DashboardViolationRow>("violations");
  const normalized = violations.map((row) => toViolationRow(row));
  if (normalized.length > 0) {
    writeCachedValue("violations", JSON.stringify(normalized));
    return normalized;
  }

  return safeJsonParse<DashboardViolationRow[]>(readCachedValue("violations"), []);
}

export async function createViolation(
  violation: Omit<DashboardViolationRow, "id" | "created_at" | "updated_at">,
): Promise<DashboardViolationRow | null> {
  const payload = {
    landlord_id: violation.landlord_id ?? violation.landlordId ?? null,
    admin_id: violation.admin_id ?? null,
    mode: violation.mode ?? "violation",
    type: violation.type ?? null,
    message: violation.message ?? null,
    issued_at: violation.issued_at ?? violation.issuedAt ?? new Date().toISOString(),
    expires_at: violation.expires_at ?? violation.expiresAt ?? null,
    related_report_id: violation.related_report_id ?? violation.reportId ?? violation.report_id ?? null,
    active: violation.active ?? true,
  };

  const { data, error } = await supabase.from("violations").insert(payload).select("*").single();
  if (error || !data) {
    return null;
  }

  const normalized = toViolationRow(data as DashboardRow);
  if (normalized.admin_id) {
    await createAuditLog({
      admin_id: normalized.admin_id,
      action: "create_violation",
      target_type: "violation",
      target_id: normalized.id ?? null,
      details: payload,
    });
  }
  const cached = await fetchViolations();
  cached.unshift(normalized);
  writeCachedValue("violations", JSON.stringify(cached));
  return normalized;
}

export async function updateViolation(
  violationId: string,
  updates: Partial<DashboardViolationRow>,
): Promise<DashboardViolationRow | null> {
  const payload: Partial<Record<string, unknown>> = {};
  if (updates.mode !== undefined) payload.mode = updates.mode;
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.message !== undefined) payload.message = updates.message;
  if (updates.active !== undefined) payload.active = updates.active;
  if (updates.expires_at !== undefined) payload.expires_at = updates.expires_at;
  if (updates.expiresAt !== undefined) payload.expires_at = updates.expiresAt;
  if (updates.related_report_id !== undefined) payload.related_report_id = updates.related_report_id;
  if (updates.reportId !== undefined) payload.related_report_id = updates.reportId;
  if (updates.issued_at !== undefined) payload.issued_at = updates.issued_at;
  if (updates.issuedAt !== undefined) payload.issued_at = updates.issuedAt;

  const { data, error } = await supabase
    .from("violations")
    .update(payload)
    .eq("id", violationId)
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  const normalized = toViolationRow(data as DashboardRow);
  const cached = await fetchViolations();
  const next = cached.map((item) => (item.id === violationId ? normalized : item));
  writeCachedValue("violations", JSON.stringify(next));
  return normalized;
}

export async function updateViolationStatus(
  violationId: string,
  active: boolean,
): Promise<DashboardViolationRow | null> {
  return updateViolation(violationId, { active });
}

export async function deleteViolation(violationId: string): Promise<boolean> {
  const { error } = await supabase.from("violations").delete().eq("id", violationId);
  if (error) {
    return false;
  }

  const cached = await fetchViolations();
  const next = cached.filter((violation) => violation.id !== violationId);
  writeCachedValue("violations", JSON.stringify(next));
  return true;
}

export async function fetchNotifications(userId?: string): Promise<DashboardNotificationRow[]> {
  if (userId) {
    const rows = await fetchRowsByColumn<DashboardNotificationRow>("notifications", "user_id", userId);
    const normalized = rows.map((row) => toNotificationRow(row));
    if (normalized.length > 0) {
      writeCachedValue(`notifications:${userId}`, JSON.stringify(normalized));
      return normalized;
    }

    return safeJsonParse<DashboardNotificationRow[]>(readCachedValue(`notifications:${userId}`), []);
  }

  const notifications = await fetchRows<DashboardNotificationRow>("notifications");
  const normalized = notifications.map((row) => toNotificationRow(row));
  if (normalized.length > 0) {
    writeCachedValue("notifications", JSON.stringify(normalized));
    return normalized;
  }

  return safeJsonParse<DashboardNotificationRow[]>(readCachedValue("notifications"), []);
}

export async function markNotificationRead(notificationId: string): Promise<DashboardNotificationRow | null> {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  return toNotificationRow(data as DashboardRow);
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .select("id");

  if (error || !Array.isArray(data)) {
    return 0;
  }

  return data.length;
}

export async function createNotification(notification: {
  user_id: string;
  type?: string;
  title?: string;
  message?: string;
  payload?: Record<string, unknown>;
}): Promise<DashboardNotificationRow | null> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: notification.user_id,
      type: notification.type ?? "info",
      title: notification.title ?? null,
      message: notification.message ?? null,
      payload: notification.payload ?? {},
      read: false,
    })
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  return toNotificationRow(data as DashboardRow);
}

export async function createAuditLog(auditLog: {
  admin_id?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  details?: Record<string, unknown>;
}): Promise<DashboardRow | null> {
  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      admin_id: auditLog.admin_id ?? null,
      action: auditLog.action,
      target_type: auditLog.target_type ?? null,
      target_id: auditLog.target_id ?? null,
      details: auditLog.details ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  return data as DashboardRow;
}

export async function fetchUsers(): Promise<DashboardUserRow[]> {
  const users = await fetchRows<DashboardUserRow>("app_users");
  const normalized = users.map((row) => toUserRow(row));
  if (normalized.length > 0) {
    writeCachedValue("users", JSON.stringify(normalized));
    return normalized;
  }

  return safeJsonParse<DashboardUserRow[]>(readCachedValue("users"), []);
}

export async function fetchUserById(userId: string): Promise<DashboardUserRow | null> {
  const user = await fetchSingleRowByColumn<DashboardUserRow>("app_users", "id", userId);
  return user ? toUserRow(user) : null;
}

export async function updateUserProfile(payload: DashboardProfilePayload): Promise<DashboardUserRow | null> {
  const updatePayload: Record<string, unknown> = {
    email: payload.email,
    name: payload.name,
  };

  assignIfProvided(updatePayload, "mobile", payload.mobile);
  assignIfProvided(updatePayload, "avatar_url", payload.avatar_url);
  assignIfProvided(updatePayload, "bio", payload.bio);
  assignIfProvided(updatePayload, "language", payload.language);
  assignIfProvided(updatePayload, "timezone", payload.timezone);
  assignIfProvided(updatePayload, "middle_initial", payload.middle_initial);
  assignIfProvided(updatePayload, "address", payload.address);
  assignIfProvided(updatePayload, "is_verified", payload.is_verified);
  assignIfProvided(updatePayload, "permit_number", payload.permit_number);
  assignIfProvided(updatePayload, "department", payload.department);
  assignIfProvided(updatePayload, "admin_level", payload.admin_level);

  const { data, error } = await supabase.from("app_users").update(updatePayload).eq("id", payload.id).select("*").single();
  if (error || !data) {
    return null;
  }

  const normalized = toUserRow(data as DashboardRow);
  const role = payload.role ?? normalized.role;
  await syncRoleProfile(normalized.id ?? payload.id, role ?? null, payload);
  const cached = await fetchUsers();
  const next = cached.map((user) => (user.id === payload.id ? normalized : user));
  writeCachedValue("users", JSON.stringify(next));
  return normalized;
}

async function syncRoleProfile(userId: string, role: string | null, payload: DashboardProfilePayload): Promise<void> {
  if (role === "student") {
    const profilePayload: Record<string, unknown> = { user_id: userId };
    assignIfProvided(profilePayload, "school", payload.school);
    assignIfProvided(profilePayload, "guardian_name", payload.guardian_name);
    assignIfProvided(profilePayload, "guardian_address", payload.guardian_address);
    assignIfProvided(profilePayload, "guardian_contact", payload.guardian_contact);
    await supabase.from("student_profiles").upsert(profilePayload, { onConflict: "user_id" });
  }

  if (role === "employee") {
    const profilePayload: Record<string, unknown> = { user_id: userId };
    assignIfProvided(profilePayload, "company", payload.company);
    assignIfProvided(profilePayload, "work_address", payload.work_address);
    await supabase.from("employee_profiles").upsert(profilePayload, { onConflict: "user_id" });
  }

  if (role === "landlord") {
    const profilePayload: Record<string, unknown> = { user_id: userId };
    assignIfProvided(profilePayload, "permit_number", payload.permit_number);
    assignIfProvided(profilePayload, "business_permit_number", payload.business_permit_number ?? payload.permit_number);
    assignIfProvided(profilePayload, "is_verified", payload.is_verified);
    assignIfProvided(profilePayload, "business_name", payload.business_name);
    assignIfProvided(profilePayload, "tin_number", payload.tin_number);
    assignIfProvided(profilePayload, "id_type", payload.id_type);
    assignIfProvided(profilePayload, "id_number", payload.id_number);
    assignIfProvided(profilePayload, "permit_expiry", payload.permit_expiry);
    assignIfProvided(profilePayload, "business_type", payload.business_type);
    assignIfProvided(profilePayload, "years_active", toNullableInteger(payload.years_active));
    assignIfProvided(profilePayload, "total_units", toNullableInteger(payload.total_units));
    assignIfProvided(profilePayload, "service_areas", payload.service_areas);
    assignIfProvided(profilePayload, "deposit_months", toNullableInteger(payload.deposit_months));
    assignIfProvided(profilePayload, "advance_months", toNullableInteger(payload.advance_months));
    assignIfProvided(profilePayload, "min_lease_months", toNullableInteger(payload.min_lease_months));
    assignIfProvided(profilePayload, "pet_policy", payload.pet_policy);
    assignIfProvided(profilePayload, "smoking_policy", payload.smoking_policy);
    assignIfProvided(profilePayload, "maintenance_response_hours", toNullableInteger(payload.maintenance_response_hours));
    assignIfProvided(profilePayload, "listing_visibility", payload.listing_visibility);
    await supabase.from("landlord_profiles").upsert(profilePayload, { onConflict: "user_id" });
  }

  if (role === "admin") {
    const profilePayload: Record<string, unknown> = { user_id: userId };
    assignIfProvided(profilePayload, "department", payload.department);
    assignIfProvided(profilePayload, "admin_level", payload.admin_level ?? "Full Administrator");
    await supabase.from("admin_profiles").upsert(profilePayload, { onConflict: "user_id" });
  }
}

export async function fetchApartments(): Promise<DashboardApartmentRow[]> {
  const apartments = await fetchRows<DashboardApartmentRow>("apartments");
  const normalized = apartments.map((row) => toApartmentRow(row));
  if (normalized.length > 0) {
    writeCachedValue("apartments", JSON.stringify(normalized));
    return normalized;
  }

  return safeJsonParse<DashboardApartmentRow[]>(readCachedValue("apartments"), []);
}

export async function fetchFavorites(): Promise<DashboardFavoriteRow[]> {
  const favorites = await fetchRows<DashboardFavoriteRow>("favorites");
  const normalized = favorites.map((row) => toFavoriteRow(row));
  if (normalized.length > 0) {
    writeCachedValue("favorites", JSON.stringify(normalized));
    return normalized;
  }

  return safeJsonParse<DashboardFavoriteRow[]>(readCachedValue("favorites"), []);
}

export async function fetchApartmentFavorites(apartmentId: string): Promise<DashboardFavoriteRow[]> {
  const { data, error } = await supabase.from("favorites").select("*").eq("apartment_id", apartmentId);
  if (error || !Array.isArray(data)) {
    return [];
  }

  return data.map((row) => toFavoriteRow(row as DashboardRow));
}

export async function getLandlordPropertyStats(landlordId: string): Promise<DashboardPropertyStats> {
  const apartments = await fetchRowsByColumn<DashboardApartmentRow>("apartments", "landlord_id", landlordId);
  const normalizedApartments = apartments.map((row) => toApartmentRow(row));
  const publishedApartmentCount = normalizedApartments.filter((apartment) => {
    const value = apartment.isPublished ?? apartment.is_published;
    return value === true;
  }).length;

  const favoriteRows = await fetchFavorites();
  const favoriteCount = favoriteRows.filter((favorite) => {
    const favoriteApartmentId = favorite.apartment_id ?? favorite.apartmentId;
    return typeof favoriteApartmentId === "string"
      ? normalizedApartments.some((apartment) => apartment.id === favoriteApartmentId)
      : false;
  }).length;

  const averagePrice = normalizedApartments.length
    ? normalizedApartments.reduce((sum, apartment) => sum + getNumberValue(apartment.price), 0) / normalizedApartments.length
    : 0;

  return {
    apartmentCount: normalizedApartments.length,
    publishedApartmentCount,
    averagePrice: Number.isFinite(averagePrice) ? averagePrice : 0,
    favoriteCount,
  };
}

export async function getLandlordApartmentCounts(landlordId: string): Promise<{ apartmentCount: number; publishedApartmentCount: number }> {
  const apartments = await fetchRowsByColumn<DashboardApartmentRow>("apartments", "landlord_id", landlordId);
  const normalized = apartments.map((row) => toApartmentRow(row));
  return {
    apartmentCount: normalized.length,
    publishedApartmentCount: normalized.filter((apartment) => {
      const value = apartment.isPublished ?? apartment.is_published;
      return value === true;
    }).length,
  };
}

export async function getDashboardSummary(userId?: string, landlordId?: string): Promise<DashboardStats> {
  const apartments = await fetchApartments();
  const favorites = await fetchFavorites();
  const reports = await fetchAdminReports();
  const violations = await fetchViolations();
  const notifications = await fetchNotifications(userId);

  const filteredApartments = landlordId
    ? apartments.filter((apartment) => {
        const apartmentLandlordId = apartment.landlord_id ?? apartment.landlordId;
        return apartmentLandlordId === landlordId;
      })
    : apartments;

  return {
    apartmentCount: filteredApartments.length,
    publishedApartmentCount: filteredApartments.filter((apartment) => {
      const value = apartment.isPublished ?? apartment.is_published;
      return value === true;
    }).length,
    favoriteCount: favorites.length,
    reportCount: reports.length,
    violationCount: violations.length,
    unreadNotificationCount: notifications.filter((notification) => {
      const isRead = notification.read ?? notification.is_read;
      return isRead !== true;
    }).length,
  };
}

export async function updateReportStatus(
  reportId: string,
  status: "pending" | "resolved" | "dismissed",
): Promise<DashboardReportRow | null> {
  const { data, error } = await supabase
    .from("reports")
    .update({
      status,
      resolved_at: status === "pending" ? null : new Date().toISOString(),
    })
    .eq("id", reportId)
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  const normalized = toReportRow(data as DashboardRow);
  const cached = await fetchAdminReports();
  const next = cached.map((report) => (report.id === reportId ? normalized : report));
  writeCachedValue("reports", JSON.stringify(next));
  return normalized;
}

export async function createReport(report: {
  reporter_id?: string | null;
  reporter_role?: string | null;
  apartment_id?: string | null;
  issue_type?: string | null;
  tags?: string[] | null;
  details?: string | null;
  contact?: string | null;
  severity?: string | null;
}): Promise<DashboardReportRow | null> {
  const reporterId = report.reporter_id ? await resolveAppUserId(report.reporter_id) : null;

  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: reporterId,
      reporter_role: report.reporter_role ?? null,
      apartment_id: report.apartment_id ?? null,
      issue_type: report.issue_type ?? null,
      tags: report.tags ?? [],
      details: report.details ?? null,
      contact: report.contact ?? null,
      severity: report.severity ?? "med",
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  const normalized = toReportRow(data as DashboardRow);
  const cached = await fetchAdminReports();
  cached.unshift(normalized);
  writeCachedValue("reports", JSON.stringify(cached));
  return normalized;
}

export async function syncDashboardCache(): Promise<void> {
  await Promise.all([
    fetchAdminReports(),
    fetchViolations(),
    fetchNotifications(),
    fetchUsers(),
    fetchApartments(),
    fetchFavorites(),
  ]);
}
