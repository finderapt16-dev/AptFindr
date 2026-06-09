import { supabase } from '../../lib/supabaseclient';
import type {
  Apartment,
  ApartmentFormValues,
  ApartmentInsertRow,
  ApartmentRow,
  ApartmentRoom,
} from '../data/apartments';
import {
  apartmentFormValuesToInsertRow,
  apartmentRowToApartment,
} from '../data/apartments';

const CURRENT_USER_KEY = 'apartment_finder_current_user';
const APARTMENT_SELECT =
  '*, apartment_images(url, is_primary, sort_order), apartment_rooms(id, room_type, sqft, max_occupants, rent, has_private_bath, bathroom_type, shared_bath_location, has_ac, is_occupied, status)';

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

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'verified' || normalized === 'approved';
  }

  return false;
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
  const { data, error } = await supabase
    .from('apartments')
    .select(APARTMENT_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to load apartments.'));
  }

  return normalizeApartmentRows((data ?? []) as ApartmentRow[]);
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

  return apartmentRowToApartment(data as ApartmentRow);
};

export const deleteApartment = async (id: string): Promise<void> => {
  const { error } = await supabase.from('apartments').delete().eq('id', id);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to delete apartment.'));
  }
};

export const updateApartmentPublication = async (id: string, isPublished: boolean): Promise<void> => {
  const { error } = await supabase.from('apartments').update({ is_published: isPublished }).eq('id', id);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to update listing visibility.'));
  }
};

export const updateApartmentStatus = async (
  id: string,
  status: Apartment['status'] = 'available',
): Promise<void> => {
  const { error } = await supabase.from('apartments').update({ status }).eq('id', id);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to update apartment status.'));
  }
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

  const apartments = normalizeApartmentRows((data ?? []) as ApartmentRow[]);
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

const readVerificationValue = (row: AppUserRow): boolean => {
  const candidateValues: unknown[] = [
    row.is_verified,
    row.verified,
    row.is_landlord_verified,
    row.landlord_verified,
    row.verified_landlord,
    row.verification_status,
  ];

  return candidateValues.some((value) => toBoolean(value));
};

export const getLandlordVerification = async (landlordId?: string): Promise<boolean> => {
  if (!landlordId) {
    return false;
  }

  const { data, error } = await supabase.from('app_users').select('*').eq('id', landlordId).maybeSingle();

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to load landlord verification.'));
  }

  if (!data) {
    return false;
  }

  return readVerificationValue(data as AppUserRow);
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
      room_type: room.name?.trim() || 'Bedroom',
      sqft: Math.max(0, Number(room.sqft) || 0),
      max_occupants: Math.max(1, Number(room.maxOccupants) || 1),
      rent: Math.max(0, Number(room.price) || 0),
      has_private_bath: room.hasPrivateBath === true,
      bathroom_type: room.hasPrivateBath ? room.bathroomType?.trim() || null : null,
      shared_bath_location: room.hasPrivateBath ? null : room.sharedBathLocation?.trim() || null,
      has_ac: room.hasAC === true,
      status: room.status ?? (room.isOccupied ? 'occupied' : 'available'),
      is_occupied: (room.status ?? (room.isOccupied ? 'occupied' : 'available')) === 'occupied',
    }));

  if (payload.length === 0) {
    return;
  }

  const { error } = await supabase.from('apartment_rooms').insert(payload);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to save apartment rooms.'));
  }
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

export const replaceApartmentImages = async (apartmentId: string, images: string[]): Promise<void> => {
  const { error } = await supabase.from('apartment_images').delete().eq('apartment_id', apartmentId);

  if (error) {
    throw new Error(unwrapErrorMessage(error, 'Unable to update apartment images.'));
  }

  await insertApartmentImages(apartmentId, images);
};

export const recordApartmentView = async (
  apartmentId: string,
  viewer: SessionUser,
): Promise<void> => {
  const viewerId = await resolveAppUserId(viewer);
  const { error } = await supabase.from('apartment_views').insert({
    apartment_id: apartmentId,
    viewer_id: viewerId,
  });

  if (error && error.code !== '42P01') {
    throw new Error(unwrapErrorMessage(error, 'Unable to record apartment view.'));
  }
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
