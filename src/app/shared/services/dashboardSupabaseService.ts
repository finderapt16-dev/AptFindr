import { supabase } from "../../../lib/supabaseclient";
import { apartmentRowToApartment, type ApartmentRow } from "../data/apartments";
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
  user_id?: string | null;
  apartment_id?: string | null;
  issue_type?: string | null;
  tags?: string[] | null;
  details?: string | null;
  contact?: string | null;
  severity?: string | null;
  submitted_at?: string | null;
  status?: string | null;
  resolved_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  landlord_id?: string | null;
  is_archived?: boolean | null;
  archived_at?: string | null;
  archived_by?: string | null;
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
  action_url?: string | null;
  action_target_id?: string | null;
  action_target_type?: string | null;
}

export interface DashboardSupportTicketRow extends DashboardRow {
  id?: string;
  user_id?: string;
  topic?: string;
  message?: string;
  contact?: string | null;
  status?: string;
  assigned_admin_id?: string | null;
  resolved_at?: string | null;
  created_at?: string;
  updated_at?: string;
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
  status?: string | null;
  verification_status?: string | null;
  landlord_status?: string | null;
  is_verified?: boolean | null;
  isVerified?: boolean | null;
  mobile?: string | null;
  mobileNumber?: string | null;
  middle_initial?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
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

export interface DashboardUserProfileDetails {
  user: DashboardUserRow;
  studentProfile?: {
    school?: string | null;
    guardian_name?: string | null;
    guardian_address?: string | null;
    guardian_contact?: string | null;
  } | null;
  employeeProfile?: {
    company?: string | null;
    work_address?: string | null;
  } | null;
  landlordProfile?: DashboardRow | null;
  adminProfile?: DashboardRow | null;
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

function readCachedValue(key: string): string | null {
  void key;
  return null;
}

function writeCachedValue(key: string, value: string): void {
  void key;
  void value;
  if (hasWindow()) window.localStorage.removeItem(cacheKeyPrefix);
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
    user_id: getStringValue(row.user_id),
    apartment_id: getStringValue(row.apartment_id),
    issue_type: getStringValue(row.issue_type),
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : null,
    details: getStringValue(row.details),
    contact: getStringValue(row.contact),
    severity: getStringValue(row.severity),
    submitted_at: getStringValue(row.submitted_at),
    status: getStringValue(row.status),
    resolved_at: getStringValue(row.resolved_at),
    reviewed_by: getStringValue(row.reviewed_by),
    reviewed_at: getStringValue(row.reviewed_at),
    landlord_id: getStringValue(row.landlord_id),
    is_archived: typeof row.is_archived === "boolean" ? row.is_archived : null,
    archived_at: getStringValue(row.archived_at),
    archived_by: getStringValue(row.archived_by),
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
    action_url: getStringValue(row.action_url),
    action_target_id: getStringValue(row.action_target_id),
    action_target_type: getStringValue(row.action_target_type),
  };
}

function toApartmentRow(row: DashboardRow): DashboardApartmentRow {
  const apartment = apartmentRowToApartment(row as unknown as ApartmentRow);
  return {
    ...row,
    ...apartment,
    id: getStringValue(row.id),
    landlord_id: getStringValue(row.landlord_id),
    landlordId: apartment.landlordId ?? getStringValue(row.landlordId),
    is_published: typeof row.is_published === "boolean" ? row.is_published : null,
    isPublished: apartment.isPublished ?? (typeof row.isPublished === "boolean" ? row.isPublished : null),
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
    status: getStringValue(row.status),
    verification_status: getStringValue(row.verification_status),
    landlord_status: getStringValue(row.landlord_status),
    is_verified: typeof row.is_verified === "boolean" ? row.is_verified : null,
    isVerified: typeof row.isVerified === "boolean" ? row.isVerified : null,
    mobile: getStringValue(row.mobile),
    mobileNumber: getStringValue(row.mobileNumber),
    middle_initial: getStringValue(row.middle_initial),
    address: getStringValue(row.address),
    avatar_url: getStringValue(row.avatar_url),
    bio: getStringValue(row.bio),
    permit_number: getStringValue(row.permit_number),
    permitNumber: getStringValue(row.permitNumber),
    department: getStringValue(row.department),
    admin_level: getStringValue(row.admin_level),
    adminLevel: getStringValue(row.adminLevel),
    preferences: typeof row.preferences === "object" && row.preferences !== null ? normalizeTenantPreferences(row.preferences) : null,
  };
}

export async function fetchAdminReports(): Promise<DashboardReportRow[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("is_archived", false)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Error fetching active reports:", error);
    return safeJsonParse<DashboardReportRow[]>(readCachedValue("reports"), []).filter((report) => report.is_archived !== true);
  }

  const reports = (data ?? []) as DashboardReportRow[];
  const normalized = reports.map((row) => toReportRow(row));
  const active = normalized.filter((report) => report.is_archived !== true);
  writeCachedValue("reports", JSON.stringify(active));
  return active;
}

export async function fetchArchivedReports(): Promise<DashboardReportRow[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("is_archived", true)
    .order("archived_at", { ascending: false });

  if (error) {
    console.error("Error fetching archived reports:", error);
    return [];
  }

  return ((data ?? []) as DashboardReportRow[]).map((row) => toReportRow(row));
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

export async function unarchiveNotification(notificationId: string, userId?: string): Promise<boolean> {
  try {
    let query = supabase
      .from("notifications")
      .update({ is_deleted: false, deleted_at: null })
      .eq("id", notificationId)
      .eq("is_deleted", true);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.select("id").maybeSingle();

    if (error || !data) {
      console.error("Error unarchiving notification:", error);
      return false;
    }

    if (userId) {
      writeCachedValue(`notifications:${userId}`, "");
      writeCachedValue(`notifications:${userId}:all`, "");
    }
    writeCachedValue("notifications", "");

    return true;
  } catch (error) {
    console.error("Unexpected error unarchiving notification:", error);
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
  action_url?: string;
  action_target_id?: string;
  action_target_type?: string;
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
      action_url: notification.action_url ?? null,
      action_target_id: notification.action_target_id ?? null,
      action_target_type: notification.action_target_type ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  return toNotificationRow(data as DashboardRow);
}

export async function createSupportTicket(input: {
  userId: string;
  topic: string;
  message: string;
  contact?: string;
}): Promise<DashboardSupportTicketRow | null> {
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: input.userId,
      topic: input.topic.trim(),
      message: input.message.trim(),
      contact: input.contact?.trim() || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Unable to save the support request.");
  }

  return data as DashboardSupportTicketRow;
}

export async function fetchSupportTicketById(ticketId: string): Promise<DashboardSupportTicketRow | null> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching support request:", error);
    return null;
  }

  return data ? data as DashboardSupportTicketRow : null;
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
  is_archived?: boolean | null;
  archived_at?: string | null;
  archived_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AppealEvidenceInput {
  file: File | Blob;
  fileName: string;
  mimeType: string;
}

async function hydrateAppealDocuments(appeal: DashboardAppealRow): Promise<DashboardAppealRow> {
  const documents = Array.isArray(appeal.supporting_docs) ? appeal.supporting_docs : [];
  const supporting_docs = await Promise.all(documents.map(async (entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
    const document = entry as Record<string, unknown>;
    const path = typeof document.path === "string" ? document.path : "";
    const bucket = typeof document.bucket === "string" ? document.bucket : "verification-documents";
    if (!path || document.kind !== "evidence") return entry;
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
    return { ...document, file_url: data?.signedUrl || "" };
  }));
  return { ...appeal, supporting_docs };
}

export async function createAppeal(appeal: {
  id?: string;
  landlord_id: string;
  report_id?: string | null;
  violation_id?: string | null;
  reason: string;
  description?: string;
  supporting_docs?: any[];
}): Promise<DashboardAppealRow> {
  try {
    const { data, error } = await supabase
      .from("appeals")
      .insert({
        ...(appeal.id ? { id: appeal.id } : {}),
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
      throw new Error(error?.message || "Unable to save the appeal.");
    }

    return hydrateAppealDocuments(data as DashboardAppealRow);
  } catch (error) {
    console.error("Unexpected error in createAppeal:", error);
    throw error;
  }
}

export async function createAppealWithEvidence(
  appeal: Parameters<typeof createAppeal>[0],
  evidenceFiles: AppealEvidenceInput[],
): Promise<DashboardAppealRow> {
  const appealId = appeal.id || crypto.randomUUID();
  const uploadedPaths: string[] = [];
  const evidenceDocuments: Record<string, unknown>[] = [];

  try {
    for (const evidence of evidenceFiles) {
      const extension = evidence.fileName.split(".").pop()?.toLowerCase() || "bin";
      const safeBaseName = evidence.fileName.replace(/[^a-z0-9._-]+/gi, "-").slice(-100);
      const path = `${appeal.landlord_id}/appeals/${appealId}/${crypto.randomUUID()}-${safeBaseName || `evidence.${extension}`}`;
      const { error } = await supabase.storage.from("verification-documents").upload(path, evidence.file, {
        contentType: evidence.mimeType || undefined,
        upsert: false,
      });
      if (error) throw new Error(error.message || `Unable to upload ${evidence.fileName}.`);
      uploadedPaths.push(path);
      evidenceDocuments.push({
        kind: "evidence",
        bucket: "verification-documents",
        path,
        file_name: evidence.fileName,
        mime_type: evidence.mimeType,
        file_size: evidence.file.size,
      });
    }

    const created = await createAppeal({
      ...appeal,
      id: appealId,
      supporting_docs: [...(appeal.supporting_docs ?? []), ...evidenceDocuments],
    });
    return created;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from("verification-documents").remove(uploadedPaths);
    }
    throw error;
  }
}

export async function submitAppealFollowupWithEvidence(
  appealId: string,
  landlordId: string,
  description: string,
  contact: string,
  evidenceFiles: AppealEvidenceInput[],
): Promise<DashboardAppealRow> {
  const uploadedPaths: string[] = [];
  const documents: Record<string, unknown>[] = [{ kind: "contact", value: contact }];
  try {
    for (const evidence of evidenceFiles) {
      const safeName = evidence.fileName.replace(/[^a-z0-9._-]+/gi, "-").slice(-100) || "evidence.bin";
      const path = `${landlordId}/appeals/${appealId}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from("verification-documents").upload(path, evidence.file, {
        contentType: evidence.mimeType || undefined,
        upsert: false,
      });
      if (error) throw new Error(error.message || `Unable to upload ${evidence.fileName}.`);
      uploadedPaths.push(path);
      documents.push({ kind: "evidence", bucket: "verification-documents", path, file_name: evidence.fileName, mime_type: evidence.mimeType, file_size: evidence.file.size });
    }

    const { data, error } = await supabase.rpc("fn_submit_appeal_followup", {
      p_appeal_id: appealId,
      p_description: description,
      p_supporting_docs: documents,
    });
    if (error || !data) throw new Error(error?.message || "Unable to submit additional appeal information.");
    return hydrateAppealDocuments(data as DashboardAppealRow);
  } catch (error) {
    if (uploadedPaths.length > 0) await supabase.storage.from("verification-documents").remove(uploadedPaths);
    throw error;
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

    return Promise.all(((data ?? []) as DashboardAppealRow[]).map(hydrateAppealDocuments));
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
      .eq("is_archived", false)
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending appeals:", error);
      return [];
    }

    return Promise.all(((data ?? []) as DashboardAppealRow[]).map(hydrateAppealDocuments));
  } catch (error) {
    console.error("Unexpected error in fetchPendingAppeals:", error);
    return [];
  }
}

export async function fetchArchivedAppeals(): Promise<DashboardAppealRow[]> {
  try {
    const { data, error } = await supabase
      .from("appeals")
      .select("*")
      .eq("is_archived", true)
      .order("archived_at", { ascending: false });

    if (error) {
      console.error("Error fetching archived appeals:", error);
      return [];
    }

    return Promise.all(((data ?? []) as DashboardAppealRow[]).map(hydrateAppealDocuments));
  } catch (error) {
    console.error("Unexpected error in fetchArchivedAppeals:", error);
    return [];
  }
}

export async function updateAppealStatus(
  appealId: string,
  status: "pending" | "under_review" | "needs_information" | "approved" | "rejected" | "dismissed",
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

    return hydrateAppealDocuments(data as DashboardAppealRow);
  } catch (error) {
    console.error("Unexpected error in updateAppealStatus:", error);
    return null;
  }
}

const PROCESSED_REPORT_STATUSES = new Set(["resolved", "closed", "approved", "rejected", "completed", "violation_issued", "notice_issued", "dismissed"]);
const PROCESSED_APPEAL_STATUSES = new Set(["resolved", "closed", "approved", "rejected", "completed", "violation_issued", "notice_issued", "dismissed"]);

export const canArchiveReportStatus = (status: string | null | undefined): boolean =>
  PROCESSED_REPORT_STATUSES.has(String(status ?? "").trim().toLowerCase());

export const canArchiveAppealStatus = (status: string | null | undefined): boolean =>
  PROCESSED_APPEAL_STATUSES.has(String(status ?? "").trim().toLowerCase());

export async function archiveReport(reportId: string, adminId: string): Promise<DashboardReportRow> {
  const { data: current, error: currentError } = await supabase.from("reports").select("*").eq("id", reportId).maybeSingle();
  if (currentError || !current) throw new Error(currentError?.message || "Report not found.");
  const currentReport = toReportRow(current as DashboardRow);
  if (!canArchiveReportStatus(currentReport.status)) {
    throw new Error("Only processed reports can be moved to History.");
  }

  const archivedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("reports")
    .update({ is_archived: true, archived_at: archivedAt, archived_by: adminId, last_action_at: archivedAt })
    .eq("id", reportId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Unable to archive report.");

  const archived = toReportRow(data as DashboardRow);
  await createAuditLog({
    admin_id: adminId,
    action: "archived_report",
    target_type: "report",
    target_id: reportId,
    details: {
      report_id: reportId,
      apartment_id: archived.apartment_id ?? archived.apartmentId ?? null,
      landlord_id: archived.landlord_id ?? null,
      tenant_id: archived.reporter_id ?? archived.user_id ?? null,
      status: archived.status ?? null,
      archived_at: archived.archived_at ?? archivedAt,
    },
  });
  writeCachedValue("reports", JSON.stringify((await fetchAdminReports())));
  return archived;
}

export async function restoreReport(reportId: string, adminId: string): Promise<DashboardReportRow> {
  const { data, error } = await supabase
    .from("reports")
    .update({ is_archived: false, archived_at: null, archived_by: null, last_action_at: new Date().toISOString() })
    .eq("id", reportId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Unable to restore report.");

  const restored = toReportRow(data as DashboardRow);
  await createAuditLog({
    admin_id: adminId,
    action: "restored_report",
    target_type: "report",
    target_id: reportId,
    details: {
      report_id: reportId,
      apartment_id: restored.apartment_id ?? restored.apartmentId ?? null,
      landlord_id: restored.landlord_id ?? null,
      tenant_id: restored.reporter_id ?? restored.user_id ?? null,
      status: restored.status ?? null,
    },
  });
  return restored;
}

export async function permanentlyDeleteReport(reportId: string, adminId: string): Promise<boolean> {
  const { data: current, error: currentError } = await supabase.from("reports").select("*").eq("id", reportId).maybeSingle();
  if (currentError || !current) throw new Error(currentError?.message || "Report not found.");
  const report = toReportRow(current as DashboardRow);
  if (report.is_archived !== true) throw new Error("Only archived reports can be permanently deleted.");

  const { error } = await supabase.from("reports").delete().eq("id", reportId).eq("is_archived", true);
  if (error) throw new Error(error.message || "Unable to permanently delete report.");

  await createAuditLog({
    admin_id: adminId,
    action: "permanently_deleted_report",
    target_type: "report",
    target_id: reportId,
    details: {
      report_id: reportId,
      apartment_id: report.apartment_id ?? report.apartmentId ?? null,
      landlord_id: report.landlord_id ?? null,
      tenant_id: report.reporter_id ?? report.user_id ?? null,
      status: report.status ?? null,
    },
  });
  return true;
}

export async function archiveAppeal(appealId: string, adminId: string): Promise<DashboardAppealRow> {
  const { data: current, error: currentError } = await supabase.from("appeals").select("*").eq("id", appealId).maybeSingle();
  if (currentError || !current) throw new Error(currentError?.message || "Appeal not found.");
  const currentAppeal = await hydrateAppealDocuments(current as DashboardAppealRow);
  if (!canArchiveAppealStatus(currentAppeal.status)) {
    throw new Error("Only processed appeals can be moved to History.");
  }

  const archivedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("appeals")
    .update({ is_archived: true, archived_at: archivedAt, archived_by: adminId })
    .eq("id", appealId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Unable to archive appeal.");

  const archived = await hydrateAppealDocuments(data as DashboardAppealRow);
  await createAuditLog({
    admin_id: adminId,
    action: "archived_appeal",
    target_type: "appeal",
    target_id: appealId,
    details: {
      appeal_id: appealId,
      report_id: archived.report_id ?? null,
      landlord_id: archived.landlord_id ?? null,
      status: archived.status ?? null,
      archived_at: archived.archived_at ?? archivedAt,
    },
  });
  return archived;
}

export async function restoreAppeal(appealId: string, adminId: string): Promise<DashboardAppealRow> {
  const { data, error } = await supabase
    .from("appeals")
    .update({ is_archived: false, archived_at: null, archived_by: null })
    .eq("id", appealId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Unable to restore appeal.");

  const restored = await hydrateAppealDocuments(data as DashboardAppealRow);
  await createAuditLog({
    admin_id: adminId,
    action: "restored_appeal",
    target_type: "appeal",
    target_id: appealId,
    details: {
      appeal_id: appealId,
      report_id: restored.report_id ?? null,
      landlord_id: restored.landlord_id ?? null,
      status: restored.status ?? null,
    },
  });
  return restored;
}

export async function permanentlyDeleteAppeal(appealId: string, adminId: string): Promise<boolean> {
  const { data: current, error: currentError } = await supabase.from("appeals").select("*").eq("id", appealId).maybeSingle();
  if (currentError || !current) throw new Error(currentError?.message || "Appeal not found.");
  const appeal = current as DashboardAppealRow;
  if (appeal.is_archived !== true) throw new Error("Only archived appeals can be permanently deleted.");

  const { error } = await supabase.from("appeals").delete().eq("id", appealId).eq("is_archived", true);
  if (error) throw new Error(error.message || "Unable to permanently delete appeal.");

  await createAuditLog({
    admin_id: adminId,
    action: "permanently_deleted_appeal",
    target_type: "appeal",
    target_id: appealId,
    details: {
      appeal_id: appealId,
      report_id: appeal.report_id ?? null,
      landlord_id: appeal.landlord_id ?? null,
      status: appeal.status ?? null,
    },
  });
  return true;
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
  reportId?: string | null;
  violationId?: string | null;
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
      report_id: input.reportId ?? null,
      violation_id: input.violationId ?? null,
      related_type: input.reportId ? "report" : input.violationId ? "violation" : "apartment_issue",
      status: "open",
      category: "reports",
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
      report_id: input.reportId ?? null,
      violation_id: input.violationId ?? null,
      notification_id: notification.id ?? null,
    },
  });

  return true;
}

export async function fetchUsers(): Promise<DashboardUserRow[]> {
  const [{ data: userRows }, { data: publicLandlordRows }] = await Promise.all([
    supabase.from("app_users").select("*"),
    supabase.from("public_landlords").select("*"),
  ]);
  const usersById = new Map<string, DashboardUserRow>();
  [...(publicLandlordRows ?? []), ...(userRows ?? [])].forEach((row) => {
    const normalizedUser = toUserRow(row as DashboardRow);
    if (normalizedUser.id) usersById.set(normalizedUser.id, normalizedUser);
  });
  const normalized = [...usersById.values()];
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

export async function fetchUserProfileDetails(userId: string): Promise<DashboardUserProfileDetails | null> {
  if (!userId) return null;

  const { data: userData, error: userError } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (userError) throw new Error(userError.message || "Unable to load profile.");
  if (!userData) return null;

  const user = toUserRow(userData as DashboardRow);
  const role = user.role;
  const details: DashboardUserProfileDetails = { user };

  if (role === "student") {
    const { data, error } = await supabase.from("student_profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message || "Unable to load student profile.");
    details.studentProfile = data as DashboardUserProfileDetails["studentProfile"];
  }

  if (role === "employee") {
    const { data, error } = await supabase.from("employee_profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message || "Unable to load employee profile.");
    details.employeeProfile = data as DashboardUserProfileDetails["employeeProfile"];
  }

  if (role === "landlord") {
    const { data, error } = await supabase.from("landlord_profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message || "Unable to load landlord profile.");
    details.landlordProfile = data as DashboardRow | null;
  }

  if (role === "admin") {
    const { data, error } = await supabase.from("admin_profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message || "Unable to load admin profile.");
    details.adminProfile = data as DashboardRow | null;
  }

  return details;
}

export async function fetchPublicLandlordById(userId: string): Promise<DashboardUserRow | null> {
  const { data, error } = await supabase.from("public_landlords").select("*").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return toUserRow(data as DashboardRow);
}

export async function fetchTenantPreferences(userId: string): Promise<TenantPreferenceSettings | null> {
  if (!userId) return null;

  const cached = getCachedTenantPreferences(userId);
  const { data, error } = await supabase.from("app_users").select("preferences").eq("id", userId).maybeSingle();

  if (isMissingTenantPreferencesColumn(error)) {
    return cached;
  }

  if (error) {
    throw new Error(error.message || "Unable to load tenant preferences.");
  }

  if (!data) {
    return defaultTenantPreferences;
  }

  const stored = (data as DashboardRow).preferences;
  const source = typeof stored === "object" && stored !== null && !Array.isArray(stored) && "tenant" in stored
    ? (stored as Record<string, unknown>).tenant
    : stored;
  const preferences = normalizeTenantPreferences(source, cached ?? defaultTenantPreferences);
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

  const { data, error } = await supabase.rpc("fn_merge_user_preference_section", {
    p_user_id: userId,
    p_section: "tenant",
    p_value: merged,
  });

  if (error) {
    if (isMissingTenantPreferencesColumn(error)) {
      console.warn("Tenant preferences were cached locally because app_users.preferences is missing from the Supabase schema cache.");
      return merged;
    }

    throw new Error(error.message || "Unable to save tenant preferences.");
  }

  const savedRoot = typeof data === "object" && data !== null && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const saved = normalizeTenantPreferences(savedRoot.tenant, merged);
  cacheTenantPreferences(userId, saved);
  return saved;
}

export async function fetchUserPreferenceSections(userId: string): Promise<Record<string, unknown>> {
  if (!userId) return {};
  const { data, error } = await supabase.from("app_users").select("preferences").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message || "Unable to load account preferences.");
  const value = (data as DashboardRow | null)?.preferences;
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function saveUserPreferenceSection(
  userId: string,
  section: string,
  value: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc("fn_merge_user_preference_section", {
    p_user_id: userId,
    p_section: section,
    p_value: value,
  });
  if (error) throw new Error(error.message || "Unable to save account preferences.");
  return typeof data === "object" && data !== null && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
}

export async function updateUserProfile(payload: DashboardProfilePayload): Promise<DashboardUserRow | null> {
  const updatePayload: Record<string, unknown> = {
    email: payload.email,
    name: payload.name,
  };

  assignIfProvided(updatePayload, "mobile", payload.mobile);
  assignIfProvided(updatePayload, "avatar_url", payload.avatar_url);
  assignIfProvided(updatePayload, "bio", payload.bio);
  assignIfProvided(updatePayload, "middle_initial", payload.middle_initial);
  assignIfProvided(updatePayload, "address", payload.address);
  assignIfProvided(updatePayload, "is_verified", payload.is_verified);
  assignIfProvided(updatePayload, "permit_number", payload.permit_number);
  assignIfProvided(updatePayload, "department", payload.department);
  assignIfProvided(updatePayload, "admin_level", payload.admin_level);

  const { data, error } = await supabase.from("app_users").update(updatePayload).eq("id", payload.id).select("*").single();
  if (error || !data) {
    throw new Error(error?.message || "Unable to update the user profile.");
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
  const path = `${userId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("user-avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message || "Unable to upload profile photo.");
  return supabase.storage.from("user-avatars").getPublicUrl(path).data.publicUrl;
}

async function syncRoleProfile(userId: string, role: string | null, payload: DashboardProfilePayload): Promise<void> {
  if (role === "student") {
    const profilePayload: Record<string, unknown> = { user_id: userId };
    assignIfProvided(profilePayload, "school", payload.school);
    assignIfProvided(profilePayload, "guardian_name", payload.guardian_name);
    assignIfProvided(profilePayload, "guardian_address", payload.guardian_address);
    assignIfProvided(profilePayload, "guardian_contact", payload.guardian_contact);
    const { error } = await supabase.from("student_profiles").upsert(profilePayload, { onConflict: "user_id" });
    if (error) throw new Error(error.message || "Unable to update student profile.");
  }

  if (role === "employee") {
    const profilePayload: Record<string, unknown> = { user_id: userId };
    assignIfProvided(profilePayload, "company", payload.company);
    assignIfProvided(profilePayload, "work_address", payload.work_address);
    const { error } = await supabase.from("employee_profiles").upsert(profilePayload, { onConflict: "user_id" });
    if (error) throw new Error(error.message || "Unable to update employee profile.");
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
    const { error } = await supabase.from("admin_profiles").upsert(profilePayload, { onConflict: "user_id" });
    if (error) throw new Error(error.message || "Unable to save the administrator profile.");
  }
}

export async function fetchApartments(): Promise<DashboardApartmentRow[]> {
  const { data, error } = await supabase
    .from("apartments")
    .select("*, apartment_images(url, is_primary, sort_order), apartment_rooms(id, name, room_type, sqft, max_occupants, rent, has_private_bath, bathroom_type, shared_bath_location, has_ac, is_occupied, status, description, images, created_at)")
    .order("created_at", { ascending: false });

  if (error || !Array.isArray(data)) {
    console.error("Error fetching dashboard apartments:", error);
    return safeJsonParse<DashboardApartmentRow[]>(readCachedValue("apartments"), []);
  }

  const normalized = data.map((row) => toApartmentRow(row as DashboardRow));
  if (normalized.length > 0) {
    writeCachedValue("apartments", JSON.stringify(normalized));
    return normalized;
  }

  writeCachedValue("apartments", "[]");
  return [];
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
  const { data: countData, error: countError } = await supabase.rpc("get_apartment_view_counts");

  if (!countError && Array.isArray(countData)) {
    const normalized = countData.map((row) => toApartmentViewRow(row as DashboardRow));
    writeCachedValue("apartment_views", JSON.stringify(normalized));
    return normalized;
  }

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

  if (!reporterId) {
    throw new Error("Please sign in to submit a report.");
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: reporterId,
      user_id: reporterId,
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

  if (error) {
    throw new Error(error.message || "Unable to save report.");
  }

  if (!data) {
    throw new Error("Unable to save report.");
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

    const profile = data as DashboardLandlordProfileRow;
    const signDocument = async (value: unknown): Promise<string | null> => {
      if (typeof value !== "string" || !value) return null;
      if (value.startsWith("https://") || value.startsWith("http://")) return value;
      const { data: signed } = await supabase.storage.from("verification-documents").createSignedUrl(value, 15 * 60);
      return signed?.signedUrl ?? null;
    };
    const [verificationUrl, idUrl] = await Promise.all([
      signDocument(profile.verification_document_url),
      signDocument(profile.id_document_url),
    ]);
    return { ...profile, verification_document_url: verificationUrl, id_document_url: idUrl };
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

    // Older accounts may have the permit on app_users but no matching
    // landlord_profiles row yet. Keep verification details visible before the
    // administrator approves the account instead of relying on verification to
    // create/repair the profile first.
    const [storedProfile, properties, allViolations, allReports, views, favorites] = await Promise.all([
      fetchLandlordProfile(landlordId),
      fetchRowsByColumn<DashboardApartmentRow>("apartments", "landlord_id", landlordId),
      fetchViolations(),
      fetchAdminReports(),
      fetchApartmentViews(),
      fetchApartmentFavorites(""),
    ]);
    const userPermit = getStringValue(user.permit_number ?? user.permitNumber);
    const profile: DashboardLandlordProfileRow = {
      ...(storedProfile ?? {}),
      user_id: storedProfile?.user_id ?? landlordId,
      permit_number: storedProfile?.permit_number || userPermit || null,
      business_permit_number:
        storedProfile?.business_permit_number || storedProfile?.permit_number || userPermit || null,
      is_verified: storedProfile?.is_verified ?? user.is_verified ?? user.isVerified ?? false,
    };

    const normalizedProperties = properties.map((row) => toApartmentRow(row));

    const violations = allViolations.filter(
      (v) => (v.landlord_id ?? v.landlordId) === landlordId,
    );

    const reports = allReports.filter((r) =>
      normalizedProperties.some((p) => p.id === (r.apartment_id ?? r.apartmentId)),
    );

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
        message: "Your landlord account has been verified by the Admin. You can now publish and manage apartment listings.",
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
