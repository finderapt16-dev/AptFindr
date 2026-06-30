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
  apartment_id?: string | null;
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
  read_at?: string | null;
  is_deleted?: boolean | null;
  deleted_at?: string | null;
}

export interface DashboardAuditLogRow extends DashboardRow {
  id?: string;
  admin_id?: string | null;
  action?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at?: string | null;
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

export interface DashboardApartmentViewRow extends DashboardRow {
  apartment_id?: string | null;
  viewer_id?: string | null;
  viewed_at?: string | null;
  apartmentId?: string | null;
  viewerId?: string | null;
  viewer_role?: string | null;
  view_count?: number | string | null;
  view_date?: string | null;
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
  preferences?: TenantPreferenceSettings | Record<string, unknown> | null;
}

export type TenantPreferenceSortOption = "recommended" | "price_low" | "price_high" | "newest" | "popular";

export interface TenantPreferenceSettings {
  preferredArea: string;
  maxBudget: number;
  minBedrooms: string;
  petFriendly: boolean;
  parking: boolean;
  furnished: boolean;
  sortBy: TenantPreferenceSortOption;
  recommendationLocation: boolean;
  saveBudgetPreferences: boolean;
  emailNotifications: boolean;
  inquiryAlerts: boolean;
  bookingAlerts: boolean;
  updatedAt?: string;
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

type TableName = "app_users" | "apartments" | "apartment_views" | "favorites" | "reports" | "violations" | "notifications" | "audit_logs";

const cacheKeyPrefix = "dashboard-supabase-cache";
const tenantPreferencesStoragePrefix = "userPreferences_";

export const defaultTenantPreferences: TenantPreferenceSettings = {
  preferredArea: "",
  maxBudget: 6000,
  minBedrooms: "any",
  petFriendly: false,
  parking: false,
  furnished: false,
  sortBy: "recommended",
  recommendationLocation: true,
  saveBudgetPreferences: true,
  emailNotifications: true,
  inquiryAlerts: true,
  bookingAlerts: true,
};

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
    apartment_id: getStringValue(row.apartment_id),
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
    read_at: getStringValue(row.read_at),
    is_deleted: typeof row.is_deleted === "boolean" ? row.is_deleted : null,
    deleted_at: getStringValue(row.deleted_at),
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

function toApartmentViewRow(row: DashboardRow): DashboardApartmentViewRow {
  return {
    ...row,
    apartment_id: getStringValue(row.apartment_id),
    viewer_id: getStringValue(row.viewer_id),
    viewed_at: getStringValue(row.viewed_at),
    apartmentId: getStringValue(row.apartmentId),
    viewerId: getStringValue(row.viewerId),
    viewer_role: getStringValue(row.viewer_role),
    view_count: row.view_count === undefined || row.view_count === null ? 1 : getNumberValue(row.view_count),
    view_date: getStringValue(row.view_date),
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
    preferences: typeof row.preferences === "object" && row.preferences !== null ? normalizeTenantPreferences(row.preferences) : null,
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
    apartment_id: violation.apartment_id ?? null,
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
  if (updates.apartment_id !== undefined) payload.apartment_id = updates.apartment_id;
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

export async function fetchNotifications(userId?: string, includeArchived = false): Promise<DashboardNotificationRow[]> {
  try {
    if (userId) {
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!includeArchived) {
        query = query.eq("is_deleted", false);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching notifications:", error);
        const cacheKey = includeArchived ? `notifications:${userId}:all` : `notifications:${userId}`;
        return safeJsonParse<DashboardNotificationRow[]>(readCachedValue(cacheKey), []);
      }

      const normalized = (data || []).map((row: DashboardRow) => toNotificationRow(row));
      const cacheKey = includeArchived ? `notifications:${userId}:all` : `notifications:${userId}`;
      writeCachedValue(cacheKey, JSON.stringify(normalized));
      return normalized;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching all notifications:", error);
      return safeJsonParse<DashboardNotificationRow[]>(readCachedValue("notifications"), []);
    }

    const normalized = (data || []).map((row: DashboardRow) => toNotificationRow(row));
    if (normalized.length > 0) {
      writeCachedValue("notifications", JSON.stringify(normalized));
    }
    return normalized;
  } catch (error) {
    console.error("Unexpected error in fetchNotifications:", error);
    return [];
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("read", false)
      .eq("is_deleted", false);

    if (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }

    return data?.length ?? 0;
  } catch (error) {
    console.error("Unexpected error in getUnreadNotificationCount:", error);
    return 0;
  }
}

export async function markNotificationRead(notificationId: string, userId?: string): Promise<DashboardNotificationRow | null> {
  try {
    let query = supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("is_deleted", false);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query
      .select("*")
      .single();

    if (error || !data) {
      console.error("Error marking notification as read:", error);
      return null;
    }

    // Invalidate all notification caches
    if (userId) {
      writeCachedValue(`notifications:${userId}`, "");
      writeCachedValue(`notifications:${userId}:all`, "");
    }
    writeCachedValue("notifications", "");

    return toNotificationRow(data as DashboardRow);
  } catch (error) {
    console.error("Unexpected error in markNotificationRead:", error);
    return null;
  }
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false)
      .eq("is_deleted", false)
      .select("id");

    if (error || !Array.isArray(data)) {
      console.error("Error marking all notifications as read:", error);
      return 0;
    }

    // Invalidate all notification caches for this user
    writeCachedValue(`notifications:${userId}`, "");
    writeCachedValue(`notifications:${userId}:all`, "");
    writeCachedValue("notifications", "");

    return data.length;
  } catch (error) {
    console.error("Unexpected error in markAllNotificationsRead:", error);
    return 0;
  }
}

export async function markNotificationUnread(notificationId: string, userId?: string): Promise<DashboardNotificationRow | null> {
  try {
    let query = supabase
      .from("notifications")
      .update({ read: false })
      .eq("id", notificationId)
      .eq("is_deleted", false);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query
      .select("*")
      .single();

    if (error || !data) {
      console.error("Error marking notification as unread:", error);
      return null;
    }

    // Invalidate all notification caches
    if (userId) {
      writeCachedValue(`notifications:${userId}`, "");
      writeCachedValue(`notifications:${userId}:all`, "");
    }
    writeCachedValue("notifications", "");

    return toNotificationRow(data as DashboardRow);
  } catch (error) {
    console.error("Unexpected error in markNotificationUnread:", error);
    return null;
  }
}

export async function deleteNotification(notificationId: string, userId?: string): Promise<boolean> {
  try {
    let query = supabase
      .from("notifications")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq("id", notificationId);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.select("id").maybeSingle();

    if (error || !data) {
      console.error("Error deleting notification:", error);
      return false;
    }

    // Clear all notification caches
    if (userId) {
      writeCachedValue(`notifications:${userId}`, "");
      writeCachedValue(`notifications:${userId}:all`, "");
    }
    writeCachedValue("notifications", "");

    return true;
  } catch (error) {
    console.error("Unexpected error in deleteNotification:", error);
    return false;
  }
}

function getOptionalBooleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function getPositiveNumberValue(value: unknown, fallback: number): number {
  const parsed = getNumberValue(value);
  return parsed > 0 ? parsed : fallback;
}

function isTenantPreferenceSortOption(value: unknown): value is TenantPreferenceSortOption {
  return value === "recommended" || value === "price_low" || value === "price_high" || value === "newest" || value === "popular";
}

function normalizeTenantPreferences(
  value: unknown,
  fallback: TenantPreferenceSettings = defaultTenantPreferences,
): TenantPreferenceSettings {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const minBedrooms = typeof source.minBedrooms === "string" && source.minBedrooms.length > 0 ? source.minBedrooms : fallback.minBedrooms;
  const sortBy = isTenantPreferenceSortOption(source.sortBy) ? source.sortBy : fallback.sortBy;

  return {
    preferredArea: typeof source.preferredArea === "string" ? source.preferredArea : fallback.preferredArea,
    maxBudget: getPositiveNumberValue(source.maxBudget, fallback.maxBudget),
    minBedrooms,
    petFriendly: getOptionalBooleanValue(source.petFriendly, fallback.petFriendly),
    parking: getOptionalBooleanValue(source.parking, fallback.parking),
    furnished: getOptionalBooleanValue(source.furnished, fallback.furnished),
    sortBy,
    recommendationLocation: getOptionalBooleanValue(source.recommendationLocation, fallback.recommendationLocation),
    saveBudgetPreferences: getOptionalBooleanValue(source.saveBudgetPreferences, fallback.saveBudgetPreferences),
    emailNotifications: getOptionalBooleanValue(source.emailNotifications, fallback.emailNotifications),
    inquiryAlerts: getOptionalBooleanValue(source.inquiryAlerts, fallback.inquiryAlerts),
    bookingAlerts: getOptionalBooleanValue(source.bookingAlerts, fallback.bookingAlerts),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : fallback.updatedAt,
  };
}

export function getTenantPreferencesStorageKey(userId: string): string {
  return `${tenantPreferencesStoragePrefix}${userId}`;
}

export function getCachedTenantPreferences(userId?: string | null): TenantPreferenceSettings | null {
  if (!userId || !hasWindow()) return null;
  const cached = window.localStorage.getItem(getTenantPreferencesStorageKey(userId));
  if (!cached) return null;
  return normalizeTenantPreferences(safeJsonParse<Record<string, unknown> | null>(cached, null));
}

function cacheTenantPreferences(userId: string, preferences: TenantPreferenceSettings): void {
  if (!hasWindow()) return;
  window.localStorage.setItem(getTenantPreferencesStorageKey(userId), JSON.stringify(preferences));
}

function isMissingTenantPreferencesColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "PGRST204" || (message.includes("preferences") && message.includes("schema cache"));
}

export async function permanentlyDeleteNotification(notificationId: string, userId?: string): Promise<boolean> {
  try {
    let query = supabase.from("notifications").delete().eq("id", notificationId);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.select("id").maybeSingle();
    if (error || !data) {
      console.error("Error permanently deleting notification:", error);
      return false;
    }

    if (userId) {
      writeCachedValue(`notifications:${userId}`, "");
      writeCachedValue(`notifications:${userId}:all`, "");
    }
    writeCachedValue("notifications", "");
    return true;
  } catch (error) {
    console.error("Unexpected error in permanentlyDeleteNotification:", error);
    return false;
  }
}

export async function deleteAllNotifications(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .select("id");

    if (error || !Array.isArray(data)) {
      console.error("Error deleting all notifications:", error);
      return 0;
    }

    // Clear all notification caches
    writeCachedValue(`notifications:${userId}`, "");
    writeCachedValue(`notifications:${userId}:all`, "");
    writeCachedValue("notifications", "");

    return data.length;
  } catch (error) {
    console.error("Unexpected error in deleteAllNotifications:", error);
    return 0;
  }
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

// ─────────────────────────────────────────────────────────────────────────
// APPEALS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────

export interface DashboardAppealRow extends DashboardRow {
  id?: string;
  landlord_id?: string;
  report_id?: string | null;
  violation_id?: string | null;
  reason?: string;
  description?: string;
  supporting_docs?: any[];
  status?: string;
  admin_response?: string | null;
  admin_id?: string | null;
  submitted_at?: string;
  reviewed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function createAppeal(appeal: {
  landlord_id: string;
  report_id?: string | null;
  violation_id?: string | null;
  reason: string;
  description?: string;
  supporting_docs?: any[];
}): Promise<DashboardAppealRow | null> {
  try {
    const { data, error } = await supabase
      .from("appeals")
      .insert({
        landlord_id: appeal.landlord_id,
        report_id: appeal.report_id ?? null,
        violation_id: appeal.violation_id ?? null,
        reason: appeal.reason,
        description: appeal.description ?? null,
        supporting_docs: appeal.supporting_docs ?? [],
        status: "pending",
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("Error creating appeal:", error);
      return null;
    }

    return data as DashboardAppealRow;
  } catch (error) {
    console.error("Unexpected error in createAppeal:", error);
    return null;
  }
}

export async function fetchAppealsByLandlord(landlordId: string): Promise<DashboardAppealRow[]> {
  try {
    const { data, error } = await supabase
      .from("appeals")
      .select("*")
      .eq("landlord_id", landlordId)
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Error fetching appeals:", error);
      return [];
    }

    return (data ?? []) as DashboardAppealRow[];
  } catch (error) {
    console.error("Unexpected error in fetchAppealsByLandlord:", error);
    return [];
  }
}

export async function fetchPendingAppeals(): Promise<DashboardAppealRow[]> {
  try {
    const { data, error } = await supabase
      .from("appeals")
      .select("*")
      .eq("status", "pending")
      .order("submitted_at", { ascending: true });

    if (error) {
      console.error("Error fetching pending appeals:", error);
      return [];
    }

    return (data ?? []) as DashboardAppealRow[];
  } catch (error) {
    console.error("Unexpected error in fetchPendingAppeals:", error);
    return [];
  }
}

export async function updateAppealStatus(
  appealId: string,
  status: "pending" | "under_review" | "approved" | "rejected",
  adminId?: string,
  adminResponse?: string
): Promise<DashboardAppealRow | null> {
  try {
    const { data, error } = await supabase
      .from("appeals")
      .update({
        status,
        admin_id: adminId ?? null,
        admin_response: adminResponse ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", appealId)
      .select("*")
      .single();

    if (error || !data) {
      console.error("Error updating appeal status:", error);
      return null;
    }

    return data as DashboardAppealRow;
  } catch (error) {
    console.error("Unexpected error in updateAppealStatus:", error);
    return null;
  }
}

export async function deleteAppeal(appealId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("appeals").delete().eq("id", appealId);

    if (error) {
      console.error("Error deleting appeal:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Unexpected error in deleteAppeal:", error);
    return false;
  }
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

export async function fetchApartmentChangeLogs(apartmentId: string): Promise<DashboardAuditLogRow[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("target_type", "apartment")
    .eq("target_id", apartmentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching apartment change logs:", error);
    return [];
  }

  return (data ?? []) as DashboardAuditLogRow[];
}

export async function fetchAdminActivityLogs(adminId: string): Promise<DashboardAuditLogRow[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("admin_id", adminId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching admin activity logs:", error);
    return [];
  }

  return (data ?? []) as DashboardAuditLogRow[];
}

export async function fetchRecentActivityLogs(limit = 50): Promise<DashboardAuditLogRow[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent activity logs:", error);
    return safeJsonParse<DashboardAuditLogRow[]>(readCachedValue("audit_logs:recent"), []);
  }

  const rows = (data ?? []) as DashboardAuditLogRow[];
  writeCachedValue("audit_logs:recent", JSON.stringify(rows));
  return rows;
}

export async function sendAdminMessageToLandlord(input: {
  adminId: string;
  landlordId: string;
  apartmentId: string;
  apartmentTitle: string;
  message: string;
}): Promise<boolean> {
  const notification = await createNotification({
    user_id: input.landlordId,
    type: "admin_message",
    title: `Message about ${input.apartmentTitle}`,
    message: input.message,
    payload: {
      action: "admin_message",
      admin_id: input.adminId,
      apartment_id: input.apartmentId,
      apartment_title: input.apartmentTitle,
      sent_at: new Date().toISOString(),
    },
  });

  if (!notification) return false;

  await createAuditLog({
    admin_id: input.adminId,
    action: "admin_message_sent",
    target_type: "apartment",
    target_id: input.apartmentId,
    details: {
      actor_id: input.adminId,
      landlord_id: input.landlordId,
      message: input.message,
      notification_id: notification.id ?? null,
    },
  });

  return true;
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

export async function fetchTenantPreferences(userId: string): Promise<TenantPreferenceSettings | null> {
  if (!userId) return null;

  const cached = getCachedTenantPreferences(userId);
  const { data, error } = await supabase.from("app_users").select("preferences").eq("id", userId).maybeSingle();

  if (isMissingTenantPreferencesColumn(error)) {
    return cached;
  }

  if (error || !data) {
    return cached;
  }

  const preferences = normalizeTenantPreferences((data as DashboardRow).preferences, cached ?? defaultTenantPreferences);
  cacheTenantPreferences(userId, preferences);
  return preferences;
}

export async function saveTenantPreferences(
  userId: string,
  preferences: Partial<TenantPreferenceSettings>,
): Promise<TenantPreferenceSettings | null> {
  if (!userId) return null;

  const merged = normalizeTenantPreferences(
    {
      ...(getCachedTenantPreferences(userId) ?? defaultTenantPreferences),
      ...preferences,
      updatedAt: new Date().toISOString(),
    },
    defaultTenantPreferences,
  );

  cacheTenantPreferences(userId, merged);

  const { data, error } = await supabase
    .from("app_users")
    .update({ preferences: merged })
    .eq("id", userId)
    .select("preferences")
    .maybeSingle();

  if (error) {
    if (isMissingTenantPreferencesColumn(error)) {
      console.warn("Tenant preferences were cached locally because app_users.preferences is missing from the Supabase schema cache.");
      return merged;
    }

    throw new Error(error.message || "Unable to save tenant preferences.");
  }

  const saved = normalizeTenantPreferences((data as DashboardRow | null)?.preferences, merged);
  cacheTenantPreferences(userId, saved);
  return saved;
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

export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please select a valid image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Profile photo must be 5MB or smaller.");
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `profiles/${userId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("apartment-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message || "Unable to upload profile photo.");
  return supabase.storage.from("apartment-images").getPublicUrl(path).data.publicUrl;
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
    assignIfProvided(profilePayload, "admin_level", payload.admin_level);
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

export async function fetchApartmentViews(): Promise<DashboardApartmentViewRow[]> {
  const { data, error } = await supabase.from("apartment_views").select("*");

  if (error || !Array.isArray(data)) {
    return safeJsonParse<DashboardApartmentViewRow[]>(readCachedValue("apartment_views"), []);
  }

  const normalized = data.map((row) => toApartmentViewRow(row as DashboardRow));
  writeCachedValue("apartment_views", JSON.stringify(normalized));
  return normalized;
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

/**
 * Notify landlord and reporter when a report is resolved
 * Creates notifications for both the landlord (apartment owner) and the reporting tenant
 */
export async function notifyReportResolved(
  reportId: string,
  landlordId: string,
  reporterId: string,
  apartmentTitle: string,
): Promise<void> {
  try {
    // Notify landlord
    await createNotification({
      user_id: landlordId,
      type: "report_resolved",
      title: "Report Resolved",
      message: `A report for "${apartmentTitle}" has been reviewed and resolved by admin.`,
      payload: {
        report_id: reportId,
        apartment_title: apartmentTitle,
        action_type: "resolved",
        resolved_at: new Date().toISOString(),
      },
    });

    // Notify reporting tenant
    await createNotification({
      user_id: reporterId,
      type: "report_status_updated",
      title: "Your Report Has Been Resolved",
      message: `Your report for "${apartmentTitle}" has been resolved and closed.`,
      payload: {
        report_id: reportId,
        apartment_title: apartmentTitle,
        status: "resolved",
        resolved_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Error notifying report resolution:", err);
  }
}

/**
 * Notify reporter when a report is dismissed
 * Creates notification for the reporting tenant with dismissal details
 */
export async function notifyReportDismissed(
  reportId: string,
  reporterId: string,
  apartmentTitle: string,
  dismissalReason?: string,
): Promise<void> {
  try {
    // Notify reporting tenant
    await createNotification({
      user_id: reporterId,
      type: "report_dismissed",
      title: "Your Report Was Dismissed",
      message: dismissalReason
        ? `Your report for "${apartmentTitle}" was dismissed. Reason: ${dismissalReason}`
        : `Your report for "${apartmentTitle}" was dismissed after admin review.`,
      payload: {
        report_id: reportId,
        apartment_title: apartmentTitle,
        status: "dismissed",
        reason: dismissalReason || null,
        dismissed_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Error notifying report dismissal:", err);
  }
}

/**
 * Fetch complete report details with all relationships
 * Returns report data along with reporter info, apartment info, and landlord info
 */
export async function fetchReportDetails(
  reportId: string,
): Promise<DashboardReportRow | null> {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (error || !data) {
      return null;
    }

    return toReportRow(data as DashboardRow);
  } catch (err) {
    console.error("Error fetching report details:", err);
    return null;
  }
}

/**
 * Fetch all necessary information for a report detail view
 * Includes reporter info, apartment details, and landlord info
 */
export async function fetchReportWithDetails(
  reportId: string,
): Promise<{
  report: DashboardReportRow | null;
  reporter: DashboardUserRow | null;
  apartment: any | null;
  landlord: DashboardUserRow | null;
} | null> {
  try {
    const report = await fetchReportDetails(reportId);
    if (!report) return null;

    const reporter = report.reporter_id
      ? await fetchUserById(report.reporter_id)
      : null;

    // Try to fetch apartment details
    const apartmentId = report.apartment_id || report.apartmentId;
    let apartment = null;
    if (apartmentId) {
      try {
        const { data: aptData } = await supabase
          .from("apartments")
          .select("*")
          .eq("id", apartmentId)
          .single();
        apartment = aptData;
      } catch {
        // Apartment might not exist
      }
    }

    // Get landlord if apartment exists
    let landlord = null;
    if (apartment?.user_id || apartment?.landlord_id) {
      landlord = await fetchUserById(
        apartment.user_id || apartment.landlord_id,
      );
    }

    return { report, reporter, apartment, landlord };
  } catch (err) {
    console.error("Error fetching report with details:", err);
    return null;
  }
}

export async function createReport(report: {
  reporter_id?: string | null;
  reporter_role?: string | null;
  apartment_id?: string | null;
  issue_type?: string | null;
  category?: string | null;
  tags?: string[] | null;
  details?: string | null;
  contact?: string | null;
  date_of_incident?: string | null;
  landlord_id?: string | null;
  has_evidence?: boolean | null;
  evidence_count?: number | null;
  severity?: string | null;
}): Promise<DashboardReportRow | null> {
  const reporterId = report.reporter_id ? await resolveAppUserId(report.reporter_id) : null;
  const landlordId = report.landlord_id ? await resolveAppUserId(report.landlord_id) : null;

  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: reporterId,
      reporter_role: report.reporter_role ?? null,
      apartment_id: report.apartment_id ?? null,
      issue_type: report.issue_type ?? null,
      category: report.category ?? null,
      tags: report.tags ?? [],
      details: report.details ?? null,
      contact: report.contact ?? null,
      date_of_incident: report.date_of_incident ?? null,
      landlord_id: landlordId,
      has_evidence: report.has_evidence ?? false,
      evidence_count: report.evidence_count ?? 0,
      severity: report.severity ?? "med",
      status: "pending",
      last_action_at: new Date().toISOString(),
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

// ─────────────────────────────────────────────────────────────────────────
// LANDLORD DETAILS & MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────

export interface DashboardLandlordProfileRow extends DashboardRow {
  user_id?: string;
  permit_number?: string | null;
  business_permit_number?: string | null;
  verified_at?: string | null;
  verification_document_url?: string | null;
  is_verified?: boolean | null;
  organization?: string | null;
  business_name?: string | null;
  tin_number?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  id_document_url?: string | null;
  permit_expiry?: string | null;
  business_type?: string | null;
  years_active?: number | null;
  total_units?: number | null;
  service_areas?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DashboardLandlordDetailsRow extends DashboardRow {
  user: DashboardUserRow | null;
  profile: DashboardLandlordProfileRow | null;
  properties: DashboardApartmentRow[];
  violations: DashboardViolationRow[];
  reports: DashboardReportRow[];
  propertyStats: {
    totalProperties: number;
    publishedProperties: number;
    totalViews: number;
    totalFavorites: number;
    averagePrice: number;
  };
}

/**
 * Fetch landlord profile information from landlord_profiles table
 */
export async function fetchLandlordProfile(
  landlordId: string,
): Promise<DashboardLandlordProfileRow | null> {
  try {
    const { data, error } = await supabase
      .from("landlord_profiles")
      .select("*")
      .eq("user_id", landlordId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as DashboardLandlordProfileRow;
  } catch (err) {
    console.error("Error fetching landlord profile:", err);
    return null;
  }
}

/**
 * Fetch complete landlord details with all relationships
 * Returns landlord info, profile, properties, violations, reports, and statistics
 */
export async function fetchLandlordWithDetails(
  landlordId: string,
): Promise<DashboardLandlordDetailsRow | null> {
  try {
    // Fetch user info
    const user = await fetchUserById(landlordId);
    if (!user) return null;

    // Fetch landlord profile
    const profile = await fetchLandlordProfile(landlordId);

    // Fetch properties
    const properties = await fetchRowsByColumn<DashboardApartmentRow>(
      "apartments",
      "landlord_id",
      landlordId,
    );
    const normalizedProperties = properties.map((row) => toApartmentRow(row));

    // Fetch violations for this landlord
    const allViolations = await fetchViolations();
    const violations = allViolations.filter(
      (v) => (v.landlord_id ?? v.landlordId) === landlordId,
    );

    // Fetch reports related to this landlord's apartments
    const allReports = await fetchAdminReports();
    const reports = allReports.filter((r) =>
      normalizedProperties.some((p) => p.id === (r.apartment_id ?? r.apartmentId)),
    );

    // Calculate property statistics
    const views = await fetchApartmentViews();
    const favorites = await fetchApartmentFavorites("");
    const totalViews = views
      .filter((v) => normalizedProperties.some((p) => p.id === (v.apartment_id ?? v.apartmentId)))
      .reduce((total, view) => total + (view.view_count === undefined || view.view_count === null ? 1 : getNumberValue(view.view_count)), 0);
    const totalFavorites = favorites.filter((f) =>
      normalizedProperties.some((p) => p.id === (f.apartment_id ?? f.apartmentId)),
    ).length;

    const averagePrice =
      normalizedProperties.length > 0
        ? normalizedProperties.reduce(
            (sum, p) => sum + getNumberValue(p.price),
            0,
          ) / normalizedProperties.length
        : 0;

    return {
      user,
      profile,
      properties: normalizedProperties,
      violations,
      reports,
      propertyStats: {
        totalProperties: normalizedProperties.length,
        publishedProperties: normalizedProperties.filter(
          (p) => (p.is_published ?? p.isPublished) === true,
        ).length,
        totalViews,
        totalFavorites,
        averagePrice: Number.isFinite(averagePrice) ? averagePrice : 0,
      },
    };
  } catch (err) {
    console.error("Error fetching landlord with details:", err);
    return null;
  }
}

/**
 * Notify landlord when verification status changes
 */
export async function notifyLandlordVerification(
  landlordId: string,
  verified: boolean,
  adminId?: string,
): Promise<void> {
  try {
    if (verified) {
      await createNotification({
        user_id: landlordId,
        type: "verification_approved",
        title: "✅ Account Verified",
        message:
          "Congratulations! Your landlord account has been verified by our admin team. You can now list properties with the verified badge.",
        payload: {
          action: "verification_approved",
          verified_at: new Date().toISOString(),
          admin_id: adminId || null,
        },
      });
    } else {
      await createNotification({
        user_id: landlordId,
        type: "verification_rejected",
        title: "⚠️ Verification Rejected",
        message:
          "Your verification has been rejected. Please review your documents and resubmit for verification.",
        payload: {
          action: "verification_rejected",
          rejected_at: new Date().toISOString(),
          admin_id: adminId || null,
        },
      });
    }
  } catch (err) {
    console.error("Error notifying landlord verification:", err);
  }
}

/**
 * Notify landlord when a violation is issued
 */
export async function notifyLandlordViolation(
  landlordId: string,
  violationType: string,
  violationMessage: string,
  apartmentTitle?: string,
): Promise<boolean> {
  try {
    const notification = await createNotification({
      user_id: landlordId,
      type: "violation_issued",
      title: "⚠️ Violation Issued",
      message: `A ${violationType} has been issued${apartmentTitle ? ` for "${apartmentTitle}"` : ""}. ${violationMessage}`,
      payload: {
        violation_type: violationType,
        apartment_title: apartmentTitle || null,
        message: violationMessage,
        issued_at: new Date().toISOString(),
      },
    });
    return Boolean(notification);
  } catch (err) {
    console.error("Error notifying landlord violation:", err);
    return false;
  }
}

/**
 * Notify landlord when a notice is sent
 */
export async function notifyLandlordNotice(
  landlordId: string,
  noticeType: string,
  noticeMessage: string,
): Promise<boolean> {
  try {
    const notification = await createNotification({
      user_id: landlordId,
      type: "notice_issued",
      title: "📋 Official Notice",
      message: `${noticeType}: ${noticeMessage}`,
      payload: {
        notice_type: noticeType,
        message: noticeMessage,
        issued_at: new Date().toISOString(),
      },
    });
    return Boolean(notification);
  } catch (err) {
    console.error("Error notifying landlord notice:", err);
    return false;
  }
}
