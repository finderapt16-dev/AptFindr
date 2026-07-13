import { supabase } from '../../../lib/supabaseclient';
import type {
  Apartment,
  ApartmentFormValues,
  ApartmentInsertRow,
  ApartmentRoom,
  ApartmentRow,
} from '../data/apartments';
import {
  apartmentFormValuesToInsertRow,
  apartmentRowToApartment,
} from '../data/apartments';

const CURRENT_USER_KEY = 'apartment_finder_current_user';
const APARTMENT_SELECT =
  '*, apartment_images(url, is_primary, sort_order), apartment_rooms(id, name, room_type, sqft, max_occupants, rent, has_private_bath, bathroom_type, shared_bath_location, has_ac, is_occupied, status, description, images, created_at)';
const APARTMENT_INSPECTION_SELECT = '*, apartment_images(*), apartment_rooms(*)';

export interface ApartmentInspectionDetails {
  apartment: Apartment;
  rawApartment: ApartmentRow & Record<string, unknown>;
  images: Array<Record<string, unknown>>;
  rooms: Array<Record<string, unknown>>;
}

export interface SessionUser {
  id: string;
  authId?: string;
  email?: string;
  name?: string;
  role?: string;
}

export interface ApartmentReportInput {
  apartmentId: string;
  reason: string;
  details?: string;
}

type AppUserRow = Record<string, unknown>;
type SupabaseLikeError = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

type AuditChange = { old: unknown; new: unknown };

const comparableValue = (value: unknown): unknown => value === undefined ? null : value;

const valuesDiffer = (left: unknown, right: unknown): boolean =>
  JSON.stringify(comparableValue(left)) !== JSON.stringify(comparableValue(right));

const buildAuditChanges = (
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  fields: string[],
): Record<string, AuditChange> => Object.fromEntries(
  fields
    .filter((field) => valuesDiffer(before?.[field], after?.[field]))
    .map((field) => [field, { old: comparableValue(before?.[field]), new: comparableValue(after?.[field]) }]),
);

const writeApartmentAudit = async (
  apartmentId: string,
  actorUserId: string | undefined,
  action: string,
  changes: Record<string, AuditChange>,
  metadata: Record<string, unknown> = {},
): Promise<void> => {
  if (Object.keys(changes).length === 0) return;

  const { error } = await supabase.from('audit_logs').insert({
    admin_id: actorUserId || null,
    action,
    target_type: 'apartment',
    target_id: apartmentId,
    details: { actor_id: actorUserId || null, changes, ...metadata },
  });

  if (error) {
    console.warn('Unable to record apartment change log:', error.message);
  }
};

const unwrapErrorMessage = (error: SupabaseLikeError | null | undefined, fallback: string): string => {
  if (!error) {
    return fallback;
  }

  if (error.code === '23503') {
    const detail = [error.message, error.details, error.hint]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' ');

    return detail
      ? `Database relationship error: ${detail}`
      : 'Database relationship error: a linked record was not found.';
  }

  if (error.code === '23505') {
    return 'This profile data already exists. Please refresh and try again.';
  }

  return error.message ?? fallback;
};

const toStringOrUndefined = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return undefined;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string | undefined): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value.trim());

type UserIdentityInput = string | SessionUser | undefined;

type AppUserLookupRow = {
  id?: string | null;
  auth_id?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

const identityFromInput = (input?: UserIdentityInput): SessionUser | null => {
  if (typeof input === 'string') {
    const id = input.trim();
    return id ? { id } : null;
  }

  if (!input || typeof input !== 'object') {
    return null;
  }

  const id = input.id?.trim();
  if (!id) {
    return null;
  }

  return {
    id,
    authId: toStringOrUndefined(input.authId),
    email: toStringOrUndefined(input.email),
    name: toStringOrUndefined(input.name),
    role: toStringOrUndefined(input.role),
  };
};

const getStoredValue = (): SessionUser | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(CURRENT_USER_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (isRecord(parsed) && typeof parsed.id === 'string') {
      return {
        id: parsed.id,
        authId: toStringOrUndefined(parsed.authId) ?? toStringOrUndefined(parsed.auth_id),
        email: toStringOrUndefined(parsed.email),
        name: toStringOrUndefined(parsed.name),
        role: toStringOrUndefined(parsed.role),
      };
    }

    if (typeof parsed === 'string' && parsed.length > 0) {
      return { id: parsed };
    }
  } catch {
    if (rawValue.length > 0) {
      return { id: rawValue };
    }
  }

  return null;
};

export const getCurrentSessionUser = (): SessionUser | null => getStoredValue();

export const getCurrentUserId = (): string | null => getStoredValue()?.id ?? null;

const normalizeApartmentRows = (rows: ApartmentRow[]): Apartment[] => rows.map((row) => apartmentRowToApartment(row));

type PublicLandlordVerificationRow = {
  id?: string | null;
  is_verified?: boolean | null;
  status?: string | null;
  verification_status?: string | null;
  landlord_status?: string | null;
};

const attachLandlordVerification = (
  apartments: Apartment[],
  landlordRows: PublicLandlordVerificationRow[] | null | undefined,
): Apartment[] => {
  const verificationById = new Map(
    (landlordRows ?? [])
      .filter((row): row is PublicLandlordVerificationRow & { id: string } => typeof row.id === 'string')
      .map((row) => [row.id, row.is_verified === true]),
  );

  return apartments.map((apartment) => ({
    ...apartment,
    landlordVerified: apartment.landlordId && verificationById.has(apartment.landlordId)
      ? verificationById.get(apartment.landlordId)
      : undefined,
  }));
};

const attachLandlordVerificationFromDatabase = async (apartments: Apartment[]): Promise<Apartment[]> => {
  const landlordIds = [...new Set(apartments.map((apartment) => apartment.landlordId).filter((id): id is string => Boolean(id)))];
  if (landlordIds.length === 0) return apartments;

  const { data, error } = await supabase
    .from('public_landlords')
    .select('id, is_verified')
    .in('id', landlordIds);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to verify apartment landlords.'));
  }

  return attachLandlordVerification(apartments, data as PublicLandlordVerificationRow[] | null);
};

const ensureUserIdentity = (userId?: string): UserIdentityInput => {
  const explicitUserId = userId?.trim();
  if (explicitUserId) {
    return explicitUserId;
  }

  const storedUser = getStoredValue();
  if (!storedUser?.id) {
    throw new Error('You must be signed in to continue.');
  }

  return storedUser;
};

const getAppUserByColumn = async (
  column: 'id' | 'auth_id' | 'email',
  value: string | undefined,
): Promise<AppUserLookupRow | null> => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if ((column === 'id' || column === 'auth_id') && !isUuid(trimmed)) {
    return null;
  }

  const { data, error } = await supabase
    .from('app_users')
    .select('id, auth_id, email, name, role')
    .eq(column, trimmed)
    .maybeSingle();

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to verify your landlord profile.'));
  }

  return (data ?? null) as AppUserLookupRow | null;
};

const syncProfileAuthId = async (profile: AppUserLookupRow, authId: string | undefined): Promise<string> => {
  const profileId = profile.id?.trim();
  if (!profileId) {
    throw new Error('Landlord profile is missing an ID.');
  }

  if (isUuid(authId) && !profile.auth_id) {
    const { error } = await supabase.from('app_users').update({ auth_id: authId }).eq('id', profileId);
    if (error) {
      if (error.code === '23505') {
        const existing = await getAppUserByColumn('auth_id', authId);
        if (existing?.id) {
          return existing.id;
        }
      }

      throw new Error(unwrapErrorMessage(error, 'Unable to sync your landlord profile.'));
    }
  }

  return profileId;
};

const createMissingAppUserFromAuth = async (
  identity: SessionUser | null,
  authUser: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  },
): Promise<string> => {
  const metadata = authUser.user_metadata ?? {};
  const email = authUser.email?.trim() || identity?.email?.trim() || '';
  const role = identity?.role?.trim() || toStringOrUndefined(metadata.role) || 'landlord';
  const name = identity?.name?.trim() || toStringOrUndefined(metadata.name) || email.split('@')[0] || 'Landlord';

  const { data, error } = await supabase
    .from('app_users')
    .insert({
      auth_id: authUser.id,
      email,
      name,
      role,
      status: role === 'landlord' ? 'pending' : 'active',
      is_verified: role !== 'landlord',
    })
    .select('id')
    .single();

  if (error) {
    const existingByAuthId = await getAppUserByColumn('auth_id', authUser.id);
    if (existingByAuthId?.id) {
      return existingByAuthId.id;
    }

    const existingByEmail = await getAppUserByColumn('email', email);
    if (existingByEmail?.id) {
      return syncProfileAuthId(existingByEmail, authUser.id);
    }

    throw new Error(unwrapErrorMessage(error, 'Unable to create your landlord profile.'));
  }

  const createdId = isRecord(data) && typeof data.id === 'string' ? data.id : '';
  if (!createdId) {
    throw new Error('Unable to create your landlord profile.');
  }

  return createdId;
};

export const resolveAppUserId = async (input?: UserIdentityInput): Promise<string> => {
  const identity = identityFromInput(input) ?? getStoredValue();

  if (!identity?.id) {
    throw new Error('You must be signed in to continue.');
  }

  const byId = await getAppUserByColumn('id', identity.id);
  if (byId) {
    return byId.id as string;
  }

  const byKnownAuthId = await getAppUserByColumn('auth_id', identity.authId ?? identity.id);
  if (byKnownAuthId) {
    return byKnownAuthId.id as string;
  }

  const byKnownEmail = await getAppUserByColumn('email', identity.email);
  if (byKnownEmail) {
    return syncProfileAuthId(byKnownEmail, identity.authId);
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    throw new Error(unwrapErrorMessage(authError, 'Unable to verify your signed-in account.'));
  }

  const authUser = authData.user;
  if (!authUser) {
    throw new Error('You must be signed in to continue.');
  }

  const bySessionAuthId = await getAppUserByColumn('auth_id', authUser.id);
  if (bySessionAuthId) {
    return bySessionAuthId.id as string;
  }

  const bySessionEmail = await getAppUserByColumn('email', authUser.email ?? identity.email);
  if (bySessionEmail) {
    return syncProfileAuthId(bySessionEmail, authUser.id);
  }

  return createMissingAppUserFromAuth(identity, {
    id: authUser.id,
    email: authUser.email,
    user_metadata: authUser.user_metadata,
  });
};

export const fetchApartments = async (): Promise<Apartment[]> => {
  const [{ data, error }, { data: landlordRows, error: landlordError }] = await Promise.all([
    supabase.from('apartments').select(APARTMENT_SELECT).order('created_at', { ascending: false }),
    supabase.from('public_landlords').select('id, is_verified'),
  ]);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to load apartments.'));
  }

  if (landlordError) {
    throw new Error(unwrapErrorMessage(landlordError, 'Unable to verify apartment landlords.'));
  }

  return attachLandlordVerification(
    normalizeApartmentRows((data ?? []) as ApartmentRow[]),
    landlordRows as PublicLandlordVerificationRow[] | null,
  );
};

export const getApartmentById = async (id: string): Promise<Apartment | null> => {
  const { data, error } = await supabase
    .from('apartments')
    .select(APARTMENT_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to load apartment.'));
  }

  if (!data) {
    return null;
  }

  return apartmentRowToApartment(data as ApartmentRow);
};

export const createApartment = async (
  apartment: ApartmentFormValues,
  landlord?: UserIdentityInput,
): Promise<Apartment> => {
  const resolvedLandlordId = await resolveAppUserId(landlord);
  const payload: ApartmentInsertRow = apartmentFormValuesToInsertRow(apartment, resolvedLandlordId);

  const { data, error } = await supabase.from('apartments').insert(payload).select('*').single();

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to create apartment.'));
  }

  return apartmentRowToApartment(data as ApartmentRow);
};

export const updateApartment = async (
  id: string,
  apartment: ApartmentFormValues,
  landlord?: UserIdentityInput,
): Promise<Apartment> => {
  const resolvedLandlordId = await resolveAppUserId(landlord);
  const payload: ApartmentInsertRow = apartmentFormValuesToInsertRow(apartment, resolvedLandlordId);
  const { data: beforeData } = await supabase
    .from('apartments')
    .select(APARTMENT_SELECT)
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('apartments').update(payload).eq('id', id);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to update apartment.'));
  }

  const { error: roomDeleteError } = await supabase.from('apartment_rooms').delete().eq('apartment_id', id);

  if (roomDeleteError) {
    throw new Error(unwrapErrorMessage(roomDeleteError, 'Unable to update apartment rooms.'));
  }

  if (apartment.rooms && apartment.rooms.length > 0) {
    await insertApartmentRooms(id, apartment.rooms);
  }

  const { data, error: reloadError } = await supabase
    .from('apartments')
    .select(APARTMENT_SELECT)
    .eq('id', id)
    .single();

  if (reloadError) {
    throw new Error(unwrapErrorMessage(reloadError, 'Unable to reload updated apartment.'));
  }

  const propertyFields = [
    'title', 'price', 'bedrooms', 'bathrooms', 'sqft', 'address', 'city', 'state', 'zip',
    'description', 'amenities', 'pet_friendly', 'parking', 'furnished', 'utilities', 'lat', 'lng',
    'landlord_id', 'status', 'features',
  ];
  const changes = buildAuditChanges(beforeData as Record<string, unknown> | null, data as Record<string, unknown>, propertyFields);
  if (valuesDiffer((beforeData as Record<string, unknown> | null)?.apartment_rooms, (data as Record<string, unknown>).apartment_rooms)) {
    changes.rooms = {
      old: comparableValue((beforeData as Record<string, unknown> | null)?.apartment_rooms),
      new: comparableValue((data as Record<string, unknown>).apartment_rooms),
    };
  }
  await writeApartmentAudit(id, resolvedLandlordId, 'apartment_updated', changes);

  return apartmentRowToApartment(data as ApartmentRow);
};

export const deleteApartment = async (id: string): Promise<void> => {
  const { error } = await supabase.from('apartments').delete().eq('id', id);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to delete apartment.'));
  }
};

export const updateApartmentPublication = async (id: string, isPublished: boolean, actorUserId?: string): Promise<void> => {
  const { data: before } = await supabase
    .from('apartments')
    .select('landlord_id, is_published, approval_status, is_archived, deleted_at')
    .eq('id', id)
    .maybeSingle();

  if (!before) {
    throw new Error('Apartment not found.');
  }

  const landlordId = isRecord(before) && typeof before.landlord_id === 'string' ? before.landlord_id : '';
  if (isPublished) {
    const { data: landlord, error: landlordError } = await supabase
      .from('public_landlords')
      .select('id, is_verified, status, verification_status, landlord_status')
      .eq('id', landlordId)
      .maybeSingle();

    if (landlordError) {
      throw new Error(unwrapErrorMessage(landlordError, 'Unable to verify the landlord before publishing.'));
    }

    const landlordRecord = isRecord(landlord) ? landlord : null;
    const normalizedStatuses = [
      landlordRecord?.status,
      landlordRecord?.verification_status,
      landlordRecord?.landlord_status,
    ]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const blockedStatus = normalizedStatuses.some((status) => ['pending', 'unverified', 'rejected', 'suspended', 'disabled'].includes(status));

    if (!landlordRecord || landlordRecord.is_verified !== true || blockedStatus) {
      throw new Error('This apartment cannot be published because the landlord has not been verified.');
    }
  }

  const { error } = await supabase.rpc('fn_set_apartment_publication', {
    p_apartment_id: id,
    p_published: isPublished,
  });

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to update listing visibility.'));
  }
  const { data: after } = await supabase
    .from('apartments')
    .select('is_published, approval_status, is_archived, deleted_at')
    .eq('id', id)
    .maybeSingle();
  await writeApartmentAudit(
    id,
    actorUserId,
    'apartment_publication_updated',
    buildAuditChanges(
      before as Record<string, unknown> | null,
      after as Record<string, unknown> | null,
      ['is_published', 'approval_status', 'is_archived', 'deleted_at'],
    ),
  );
};

export const updateApartmentStatus = async (
  id: string,
  status: Apartment['status'] = 'available',
  actorUserId?: string,
): Promise<void> => {
  const { data: before } = await supabase.from('apartments').select('status').eq('id', id).maybeSingle();
  const { error } = await supabase.from('apartments').update({ status }).eq('id', id);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to update apartment status.'));
  }
  await writeApartmentAudit(
    id,
    actorUserId,
    'apartment_status_updated',
    buildAuditChanges(before as Record<string, unknown> | null, { status: status ?? 'available' }, ['status']),
  );
};

export const getFavoriteApartmentIds = async (userId: string): Promise<string[]> => {
  const resolvedUserId = await resolveAppUserId(userId);
  const { data, error } = await supabase.from('favorites').select('apartment_id').eq('user_id', resolvedUserId);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to load favorites.'));
  }

  const ids = (data ?? [])
    .map((row: unknown) => (isRecord(row) ? row.apartment_id : null))
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  return Array.from(new Set(ids));
};

export const isApartmentFavorite = async (userId: string, apartmentId: string): Promise<boolean> => {
  const resolvedUserId = await resolveAppUserId(userId);
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', resolvedUserId)
    .eq('apartment_id', apartmentId)
    .maybeSingle();

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to check favorite status.'));
  }

  return Boolean(data);
};

export const toggleFavorite = async (apartmentId: string, userId?: string): Promise<boolean> => {
  const resolvedUserId = await resolveAppUserId(ensureUserIdentity(userId));
  const { data: existing, error: existingError } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', resolvedUserId)
    .eq('apartment_id', apartmentId)
    .maybeSingle();

  if (existingError) {
    throw new Error(unwrapErrorMessage(existingError, 'Unable to update favorites.'));
  }

  if (existing) {
    const { error: deleteError } = await supabase.from('favorites').delete().eq('user_id', resolvedUserId).eq('apartment_id', apartmentId);

    if (deleteError) {
      throw new Error(unwrapErrorMessage(deleteError, 'Unable to remove favorite.'));
    }

    return false;
  }

  const { data: apartmentRow, error: apartmentError } = await supabase
    .from('apartments')
    .select('landlord_id')
    .eq('id', apartmentId)
    .maybeSingle();

  if (apartmentError) {
    throw new Error(unwrapErrorMessage(apartmentError, 'Unable to verify listing ownership.'));
  }

  if (isRecord(apartmentRow) && apartmentRow.landlord_id === resolvedUserId) {
    throw new Error('You cannot favorite your own listing.');
  }

  const { error: insertError } = await supabase.from('favorites').insert({
    user_id: resolvedUserId,
    apartment_id: apartmentId,
  });

  if (insertError) {
    throw new Error(unwrapErrorMessage(insertError, 'Unable to add favorite.'));
  }

  return true;
};

export const listFavoriteApartments = async (userId?: string): Promise<Apartment[]> => {
  const resolvedUserId = await resolveAppUserId(ensureUserIdentity(userId));
  const favoriteIds = await getFavoriteApartmentIds(resolvedUserId);

  if (favoriteIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('apartments')
    .select(APARTMENT_SELECT)
    .in('id', favoriteIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to load favorite apartments.'));
  }

  const apartments = await attachLandlordVerificationFromDatabase(
    normalizeApartmentRows((data ?? []) as ApartmentRow[]),
  );
  return apartments.filter((apartment) => favoriteIds.includes(apartment.id));
};

export const reportApartment = async (report: ApartmentReportInput, userId?: string): Promise<void> => {
  const resolvedUserId = await resolveAppUserId(ensureUserIdentity(userId));

  const { error } = await supabase.from('reports').insert({
    user_id: resolvedUserId,
    apartment_id: report.apartmentId,
    reason: report.reason,
    details: report.details?.trim() || null,
  });

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to submit report.'));
  }
};

export const getLandlordVerification = async (landlordId?: string): Promise<boolean> => {
  if (!landlordId) {
    return false;
  }

  const { data, error } = await supabase.from('public_landlords').select('is_verified').eq('id', landlordId).maybeSingle();

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to load landlord verification.'));
  }

  if (!data) {
    return false;
  }

  return (data as AppUserRow).is_verified === true;
};

export const fetchApartmentsForLandlord = async (landlordId: string): Promise<Apartment[]> => {
  const resolvedLandlordId = await resolveAppUserId(landlordId);
  const { data, error } = await supabase
    .from('apartments')
    .select(APARTMENT_SELECT)
    .eq('landlord_id', resolvedLandlordId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to load landlord apartments.'));
  }

  return normalizeApartmentRows((data ?? []) as ApartmentRow[]);
};

export const insertApartmentImages = async (apartmentId: string, images: string[]): Promise<void> => {
  const urls = images.filter((url) => typeof url === 'string' && url.trim().length > 0);

  if (urls.length === 0) {
    return;
  }

  const payload = urls.map((url, index) => ({
    apartment_id: apartmentId,
    url: url.trim(),
    is_primary: index === 0,
    sort_order: index,
  }));

  const { error } = await supabase.from('apartment_images').insert(payload);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to save apartment images.'));
  }
};

export const insertApartmentRooms = async (apartmentId: string, rooms: ApartmentRoom[]): Promise<void> => {
  const payload = rooms
    .filter((room) => room && typeof room === 'object')
    .map((room) => ({
      apartment_id: apartmentId,
      name: room.name?.trim() || room.type?.trim() || 'Room',
      room_type: room.type?.trim() || 'Bedroom',
      sqft: Math.max(0, Number(room.sqft) || 0),
      max_occupants: Math.max(1, Number(room.maxOccupants) || 1),
      rent: Math.max(0, Number(room.price) || 0),
      has_private_bath: room.hasPrivateBath === true,
      bathroom_type: room.hasPrivateBath ? room.bathroomType?.trim() || null : null,
      shared_bath_location: room.hasPrivateBath ? null : room.sharedBathLocation?.trim() || null,
      has_ac: room.hasAC === true,
      status: room.status ?? (room.isOccupied ? 'occupied' : 'available'),
      is_occupied: (room.status ?? (room.isOccupied ? 'occupied' : 'available')) === 'occupied',
      description: room.description?.trim() || null,
      images: room.images ?? [],
    }));

  if (payload.length === 0) {
    return;
  }

  const { error } = await supabase.from('apartment_rooms').insert(payload);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to save apartment rooms.'));
  }
};

const apartmentRoomToPayload = (apartmentId: string, room: ApartmentRoom) => {
  const status = room.status ?? (room.isOccupied ? 'occupied' : 'available');

  return {
    apartment_id: apartmentId,
    name: room.name?.trim() || room.type?.trim() || 'Room',
    room_type: room.type?.trim() || 'Bedroom',
    sqft: Math.max(0, Number(room.sqft) || 0),
    max_occupants: Math.max(1, Number(room.maxOccupants) || 1),
    rent: Math.max(0, Number(room.price) || 0),
    has_private_bath: room.hasPrivateBath === true,
    bathroom_type: room.hasPrivateBath ? room.bathroomType?.trim() || null : null,
    shared_bath_location: room.hasPrivateBath ? null : room.sharedBathLocation?.trim() || null,
    has_ac: room.hasAC === true,
    status,
    is_occupied: status === 'occupied',
    description: room.description?.trim() || null,
    images: room.images ?? [],
  };
};

const apartmentRoomRowToRoom = (row: Record<string, unknown>): ApartmentRoom => {
  const statusValue = typeof row.status === 'string' ? row.status : row.is_occupied ? 'occupied' : 'available';
  const status = statusValue === 'occupied' || statusValue === 'reserved' || statusValue === 'maintenance'
    ? statusValue
    : 'available';

  const images = Array.isArray(row.images)
    ? row.images.filter((image): image is string => typeof image === 'string' && image.trim().length > 0)
    : typeof row.images === 'string'
      ? row.images.split(',').map((image) => image.trim()).filter(Boolean)
      : [];

  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    name: typeof row.name === 'string' && row.name.trim().length > 0
      ? row.name
      : typeof row.room_type === 'string'
        ? row.room_type
        : 'Room',
    type: typeof row.room_type === 'string' ? row.room_type : 'Bedroom',
    price: Number(row.rent) || 0,
    sqft: Number(row.sqft) || 0,
    maxOccupants: Number(row.max_occupants) || 1,
    hasPrivateBath: row.has_private_bath === true,
    bathroomType: typeof row.bathroom_type === 'string' ? row.bathroom_type : '',
    sharedBathLocation: typeof row.shared_bath_location === 'string' ? row.shared_bath_location : '',
    hasAC: row.has_ac === true,
    status,
    isOccupied: status === 'occupied',
    description: typeof row.description === 'string' ? row.description : '',
    images,
    createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
  };
};

const syncApartmentRoomSummary = async (apartmentId: string): Promise<void> => {
  const { data, error } = await supabase
    .from('apartment_rooms')
    .select('rent, has_private_bath, status, is_occupied')
    .eq('apartment_id', apartmentId);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to refresh room summary.'));
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const rents = rows
    .map((row) => Number(row.rent))
    .filter((rent) => Number.isFinite(rent) && rent > 0);

  const updatePayload: Record<string, unknown> = {
    bedrooms: rows.length,
    bathrooms: rows.filter((row) => row.has_private_bath === true).length,
  };

  if (rents.length > 0) {
    updatePayload.price = Math.min(...rents);
  }

  const { error: updateError } = await supabase
    .from('apartments')
    .update(updatePayload)
    .eq('id', apartmentId);

  if (updateError) {
    throw new Error(unwrapErrorMessage(updateError, 'Unable to update property room summary.'));
  }
};

export const fetchApartmentRooms = async (apartmentId: string): Promise<ApartmentRoom[]> => {
  const { data, error } = await supabase
    .from('apartment_rooms')
    .select('id, name, room_type, sqft, max_occupants, rent, has_private_bath, bathroom_type, shared_bath_location, has_ac, is_occupied, status, description, images, created_at')
    .eq('apartment_id', apartmentId);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to load rooms.'));
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map(apartmentRoomRowToRoom);
};

export const createApartmentRoom = async (apartmentId: string, room: ApartmentRoom, actorUserId?: string): Promise<ApartmentRoom> => {
  const { data, error } = await supabase
    .from('apartment_rooms')
    .insert(apartmentRoomToPayload(apartmentId, room))
    .select('id, name, room_type, sqft, max_occupants, rent, has_private_bath, bathroom_type, shared_bath_location, has_ac, is_occupied, status, description, images, created_at')
    .single();

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to add room.'));
  }

  await syncApartmentRoomSummary(apartmentId);
  await writeApartmentAudit(apartmentId, actorUserId, 'apartment_room_created', {
    room: { old: null, new: data as Record<string, unknown> },
  }, {
    room_id: (data as Record<string, unknown>).id ?? null,
    status: (data as Record<string, unknown>).status ?? 'available',
    image_count: Array.isArray((data as Record<string, unknown>).images) ? ((data as Record<string, unknown>).images as unknown[]).length : 0,
  });
  return apartmentRoomRowToRoom(data as Record<string, unknown>);
};

export const updateApartmentRoom = async (
  apartmentId: string,
  roomId: string,
  room: ApartmentRoom,
  actorUserId?: string,
): Promise<ApartmentRoom> => {
  const { data: before } = await supabase.from('apartment_rooms').select('*').eq('id', roomId).maybeSingle();
  const { data, error } = await supabase
    .from('apartment_rooms')
    .update(apartmentRoomToPayload(apartmentId, room))
    .eq('id', roomId)
    .select('id, name, room_type, sqft, max_occupants, rent, has_private_bath, bathroom_type, shared_bath_location, has_ac, is_occupied, status, description, images, created_at')
    .single();

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to update room.'));
  }

  await syncApartmentRoomSummary(apartmentId);
  const trackedRoomFields = [
    'name', 'room_type', 'sqft', 'max_occupants', 'rent', 'has_private_bath',
    'bathroom_type', 'shared_bath_location', 'has_ac', 'status', 'description', 'images',
  ];
  const changedFields = trackedRoomFields.filter((field) => valuesDiffer(
    (before as Record<string, unknown> | null)?.[field],
    (data as Record<string, unknown>)[field],
  ));
  if (changedFields.length > 0) {
    await writeApartmentAudit(apartmentId, actorUserId, 'apartment_room_updated', {
      room: { old: before ?? null, new: data as Record<string, unknown> },
    }, {
      room_id: roomId,
      changed_fields: changedFields,
      status: (data as Record<string, unknown>).status ?? 'available',
      image_count: Array.isArray((data as Record<string, unknown>).images) ? ((data as Record<string, unknown>).images as unknown[]).length : 0,
    });
  }
  return apartmentRoomRowToRoom(data as Record<string, unknown>);
};

export const updateApartmentRoomStatus = async (
  apartmentId: string,
  roomId: string,
  status: ApartmentRoom['status'],
  actorUserId?: string,
): Promise<void> => {
  const nextStatus = status ?? 'available';
  const { data: before } = await supabase.from('apartment_rooms').select('status').eq('id', roomId).maybeSingle();
  const { error } = await supabase
    .from('apartment_rooms')
    .update({
      status: nextStatus,
      is_occupied: nextStatus === 'occupied',
    })
    .eq('id', roomId);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to update room status.'));
  }

  await syncApartmentRoomSummary(apartmentId);
  const statusChanges = buildAuditChanges(
    { room_status: before?.status ?? null },
    { room_status: nextStatus },
    ['room_status'],
  );
  await writeApartmentAudit(apartmentId, actorUserId, 'apartment_room_status_updated', statusChanges, { room_id: roomId, status: nextStatus, changed_fields: ['status'] });
};

export const deleteApartmentRoom = async (apartmentId: string, roomId: string, actorUserId?: string): Promise<void> => {
  const { data: before } = await supabase.from('apartment_rooms').select('*').eq('id', roomId).maybeSingle();
  const { error } = await supabase.from('apartment_rooms').delete().eq('id', roomId);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to delete room.'));
  }

  await syncApartmentRoomSummary(apartmentId);
  await writeApartmentAudit(apartmentId, actorUserId, 'apartment_room_deleted', {
    room: { old: before ?? null, new: null },
  }, { room_id: roomId, status: before?.status ?? null });
};

export const uploadApartmentImage = async (
  apartmentId: string,
  file: File | Blob,
  fileName = 'apartment-image.jpg',
): Promise<string> => {
  const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const path = `${apartmentId}/${safeName}`;

  const { error } = await supabase.storage
    .from('apartment-images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    });

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to upload apartment image.'));
  }

  const { data } = supabase.storage.from('apartment-images').getPublicUrl(path);
  return data.publicUrl;
};

export const uploadApartmentRoomImage = async (
  apartmentId: string,
  roomUploadId: string,
  file: File | Blob,
  fileName = 'room-image.jpg',
): Promise<string> => {
  const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const path = `${apartmentId}/rooms/${roomUploadId}/${safeName}`;
  const { error } = await supabase.storage.from('apartment-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  });
  if (error) throw new Error(unwrapErrorMessage(error, 'Unable to upload room image.'));
  return supabase.storage.from('apartment-images').getPublicUrl(path).data.publicUrl;
};

export const replaceApartmentImages = async (apartmentId: string, images: string[], actorUserId?: string): Promise<void> => {
  const { data: before } = await supabase
    .from('apartment_images')
    .select('url, is_primary, sort_order')
    .eq('apartment_id', apartmentId)
    .order('sort_order');
  const { error } = await supabase.from('apartment_images').delete().eq('apartment_id', apartmentId);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to update apartment images.'));
  }

  await insertApartmentImages(apartmentId, images);
  await writeApartmentAudit(apartmentId, actorUserId, 'apartment_images_updated', {
    images: { old: before ?? [], new: images },
  }, { image_count: images.length, changed_fields: ['images'] });
};

export const recordApartmentView = async (
  apartmentId: string,
  viewer: SessionUser,
): Promise<boolean> => {
  if (viewer.role !== 'student' && viewer.role !== 'employee') return false;
  const viewerId = await resolveAppUserId(viewer);
  const now = new Date().toISOString();
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => dateParts.find((item) => item.type === type)?.value ?? '';
  const viewDate = `${part('year')}-${part('month')}-${part('day')}`;

  const incrementExistingView = async () => {
    const { data: existingViews, error: lookupError } = await supabase
      .from('apartment_views')
      .select('id, view_count, viewed_at')
      .eq('apartment_id', apartmentId)
      .eq('viewer_id', viewerId)
      .order('viewed_at', { ascending: false })
      .limit(1);

    if (lookupError) {
      throw new Error(unwrapErrorMessage(lookupError, 'Unable to load apartment view record.'));
    }

    const existingView = Array.isArray(existingViews) ? existingViews[0] : null;
    if (existingView?.id) {
      const { error: updateError } = await supabase.from('apartment_views').update({
        view_count: Math.max(1, Number(existingView.view_count) || 1) + 1,
        viewed_at: now,
      }).eq('id', existingView.id);
      if (updateError) throw new Error(unwrapErrorMessage(updateError, 'Unable to update apartment view.'));
      return true;
    }

    const { error: legacyInsertError } = await supabase.from('apartment_views').insert({
      apartment_id: apartmentId,
      viewer_id: viewerId,
      viewed_at: now,
      view_count: 1,
    });
    if (legacyInsertError) throw new Error(unwrapErrorMessage(legacyInsertError, 'Unable to record apartment view.'));
    return true;
  };

  const { error } = await supabase.from('apartment_views').insert({
    apartment_id: apartmentId,
    viewer_id: viewerId,
    viewer_role: viewer.role,
    view_date: viewDate,
    viewed_at: now,
    view_count: 1,
  });

  if (error?.code === '42703' || error?.code === 'PGRST204' || error?.code === '23505') {
    return incrementExistingView();
  }
  if (error && error.code !== '42P01') {
    throw new Error(unwrapErrorMessage(error, 'Unable to record apartment view.'));
  }
  return !error;
};

export const fetchApartmentWithImages = async (id: string): Promise<Apartment | null> => {
  const { data, error } = await supabase
    .from('apartments')
    .select(APARTMENT_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to load apartment.'));
  }

  if (!data) {
    return null;
  }

  return apartmentRowToApartment(data as ApartmentRow);
};

export const fetchApartmentInspectionDetails = async (id: string): Promise<ApartmentInspectionDetails | null> => {
  const { data, error } = await supabase
    .from('apartments')
    .select(APARTMENT_INSPECTION_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to load apartment inspection details.'));
  }

  if (!data) {
    return null;
  }

  const rawApartment = data as ApartmentRow & Record<string, unknown>;
  const images = Array.isArray(rawApartment.apartment_images)
    ? (rawApartment.apartment_images as unknown[]).filter(isRecord)
    : [];
  const rooms = Array.isArray(rawApartment.apartment_rooms)
    ? (rawApartment.apartment_rooms as unknown[]).filter(isRecord)
    : [];

  return {
    apartment: apartmentRowToApartment(rawApartment),
    rawApartment,
    images,
    rooms,
  };
};
