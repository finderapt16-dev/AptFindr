import { supabase as supabaseClient } from '../../lib/supabaseclient';

export type UserRole = 'student' | 'employee' | 'landlord' | 'admin' | string;
export type UserStatus = 'pending' | 'verified' | 'approved' | 'active' | 'disabled' | string;

export interface User {
  id: string;
  authId?: string;
  name: string;
  email: string;
  middleInitial?: string;
  address?: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
  isVerified?: boolean;
  mobileNumber?: string;
  mobile?: string;
  bio?: string;
  language?: string;
  timezone?: string;
  avatar?: string;
  department?: string;
  adminLevel?: string;
  permitNumber?: string;
  school?: string;
  yearLevel?: string;
  studentId?: string;
  course?: string;
  company?: string;
  position?: string;
  employeeId?: string;
}

type AppUserRow = {
  id?: string;
  auth_id?: string | null;
  name?: string;
  full_name?: string;
  email?: string;
  middle_initial?: string | null;
  address?: string | null;
  role?: string;
  status?: string;
  verification_status?: string;
  landlord_status?: string;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  mobile?: string;
  avatar_url?: string;
  bio?: string;
  language?: string;
  timezone?: string;
  permit_number?: string;
  department?: string;
  admin_level?: string;
};

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface CreateUserInput extends AuthCredentials {
  name: string;
  role: UserRole;
  status?: UserStatus;
  mobile?: string;
  mobileNumber?: string;
  middleInitial?: string;
  address?: string;
  school?: string;
  guardianName?: string;
  guardianAddress?: string;
  guardianContact?: string;
  company?: string;
  department?: string;
  workAddress?: string;
  permitNumber?: string;
  adminLevel?: string;
  permitDocument?: File;
  idDocument?: File;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
  isVerified?: boolean;
  mobile?: string;
  mobileNumber?: string;
  middleInitial?: string;
  address?: string;
  school?: string;
  guardianName?: string;
  guardianAddress?: string;
  guardianContact?: string;
  company?: string;
  department?: string;
  workAddress?: string;
  permitNumber?: string;
  adminLevel?: string;
}

const APP_USERS_TABLE = 'app_users';
const CURRENT_SESSION_KEY = 'apartment_finder_current_user';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringValue(row: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
}

function getBooleanValue(row: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
  }

  return undefined;
}

function normalizeStatus(row: Record<string, unknown>): string {
  const status = getStringValue(row, ['status', 'verification_status', 'landlord_status']);
  if (status) {
    return status;
  }

  const isVerified = getBooleanValue(row, ['is_verified']);
  if (typeof isVerified === 'boolean') {
    return isVerified ? 'verified' : 'pending';
  }

  return 'active';
}

function normalizeUser(row: AppUserRow): User {
  const record: Record<string, unknown> = isRecord(row) ? row : {};

  return {
    id: getStringValue(record, ['id']),
    authId: getStringValue(record, ['auth_id']) || undefined,
    name: getStringValue(record, ['name', 'full_name']),
    email: getStringValue(record, ['email']),
    middleInitial: getStringValue(record, ['middle_initial']),
    address: getStringValue(record, ['address']),
    role: getStringValue(record, ['role']),
    status: normalizeStatus(record),
    createdAt: getStringValue(record, ['created_at']),
    updatedAt: getStringValue(record, ['updated_at']),
    isVerified: getBooleanValue(record, ['is_verified']),
    mobileNumber: getStringValue(record, ['mobile']),
    mobile: getStringValue(record, ['mobile']),
    avatar: getStringValue(record, ['avatar_url']),
    bio: getStringValue(record, ['bio']),
    language: getStringValue(record, ['language']),
    timezone: getStringValue(record, ['timezone']),
    permitNumber: getStringValue(record, ['permit_number']),
    department: getStringValue(record, ['department']),
    adminLevel: getStringValue(record, ['admin_level']),
  };
}

function toUserPayload(input: UpdateUserInput): Record<string, string | boolean | undefined> {
  const payload: Record<string, string | boolean | undefined> = {};

  if (typeof input.name === 'string') payload.name = input.name;
  if (typeof input.email === 'string') payload.email = input.email;
  if (typeof input.middleInitial === 'string') payload.middle_initial = input.middleInitial;
  if (typeof input.address === 'string') payload.address = input.address;
  if (typeof input.role === 'string') payload.role = input.role;
  if (typeof input.status === 'string') payload.status = input.status;
  if (typeof input.isVerified === 'boolean') {
    payload.is_verified = input.isVerified;
    payload.verification_status = input.isVerified ? 'verified' : 'pending';
    payload.landlord_status = input.isVerified ? 'verified' : 'pending';
  }
  if (typeof input.mobile === 'string') payload.mobile = input.mobile;
  if (typeof input.mobileNumber === 'string') payload.mobile = input.mobileNumber;
  if (typeof input.permitNumber === 'string') payload.permit_number = input.permitNumber;
  if (typeof input.department === 'string') payload.department = input.department;
  if (typeof input.adminLevel === 'string') payload.admin_level = input.adminLevel;

  return payload;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

async function recordLogin(profile: User | null, authId: string, success = true, metadata: Record<string, unknown> = {}): Promise<void> {
  const { error } = await supabaseClient.from('logins').insert({
    user_id: profile?.id ?? null,
    auth_id: authId,
    event: 'sign_in',
    success,
    user_agent: typeof navigator === 'undefined' ? null : navigator.userAgent,
    metadata,
  });

  if (error) {
    console.warn('Failed to record login audit row:', error.message);
  }
}

async function ensureRoleProfile(userId: string, role: UserRole, input: Partial<CreateUserInput & UpdateUserInput>): Promise<void> {
  let table: 'student_profiles' | 'employee_profiles' | 'landlord_profiles' | 'admin_profiles' | null = null;
  let payload: Record<string, unknown> = { user_id: userId };

  if (role === 'student') {
    table = 'student_profiles';
    payload = {
      ...payload,
      school: nonEmptyString(input.school),
      guardian_name: nonEmptyString(input.guardianName),
      guardian_address: nonEmptyString(input.guardianAddress),
      guardian_contact: nonEmptyString(input.guardianContact),
    };
  }

  if (role === 'employee') {
    table = 'employee_profiles';
    payload = {
      ...payload,
      company: nonEmptyString(input.company),
      work_address: nonEmptyString(input.workAddress),
    };
  }

  if (role === 'landlord') {
    table = 'landlord_profiles';
    payload = {
      ...payload,
      permit_number: nonEmptyString(input.permitNumber),
      business_permit_number: nonEmptyString(input.permitNumber),
      is_verified: input.isVerified ?? false,
    };
  }

  if (role === 'admin') {
    table = 'admin_profiles';
    payload = {
      ...payload,
      admin_level: input.adminLevel ?? 'Full Administrator',
      department: input.department ?? 'Platform Administration',
    };
  }

  if (!table) return;

  const { error } = await supabaseClient.from(table).upsert(payload, { onConflict: 'user_id' });
  if (error) {
    throw new Error(`Failed to sync ${table}: ${error.message}`);
  }
}

async function uploadLandlordSignupDocuments(userId: string, input: CreateUserInput): Promise<void> {
  if (input.role !== 'landlord') return;
  const files = [
    { file: input.permitDocument, column: 'verification_document_url', prefix: 'permit' },
    { file: input.idDocument, column: 'id_document_url', prefix: 'identity' },
  ].filter((item): item is { file: File; column: string; prefix: string } => item.file instanceof File);
  if (files.length === 0) return;

  const updates: Record<string, string> = {};
  for (const item of files) {
    const extension = item.file.name.split('.').pop()?.toLowerCase() || 'bin';
    const path = `${userId}/${item.prefix}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabaseClient.storage.from('verification-documents').upload(path, item.file, {
      contentType: item.file.type || undefined,
      upsert: false,
    });
    if (error) throw new Error(`Unable to upload ${item.prefix} document: ${error.message}`);
    updates[item.column] = path;
  }

  const { error } = await supabaseClient.from('landlord_profiles').update(updates).eq('user_id', userId);
  if (error) throw new Error(`Unable to link verification documents: ${error.message}`);
}

export function readCurrentUserFromStorage(): User | null {
  const rawValue = localStorage.getItem(CURRENT_SESSION_KEY);
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!isRecord(parsed)) return null;

    return normalizeUser({
      id: typeof parsed.id === 'string' ? parsed.id : '',
      auth_id: typeof parsed.authId === 'string' ? parsed.authId : undefined,
      name: typeof parsed.name === 'string' ? parsed.name : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      middle_initial: typeof parsed.middleInitial === 'string' ? parsed.middleInitial : undefined,
      address: typeof parsed.address === 'string' ? parsed.address : undefined,
      role: typeof parsed.role === 'string' ? parsed.role : '',
      status: typeof parsed.status === 'string' ? parsed.status : '',
      created_at: typeof parsed.createdAt === 'string' ? parsed.createdAt : undefined,
      updated_at: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
      is_verified: typeof parsed.isVerified === 'boolean' ? parsed.isVerified : undefined,
    });
  } catch {
    return null;
  }
}

export function persistCurrentUser(user: User | null): void {
  if (user === null) {
    localStorage.removeItem(CURRENT_SESSION_KEY);
    return;
  }

  localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(user));
}

export async function fetchAppUsers(): Promise<User[]> {
  const [{ data, error }, { data: publicLandlords, error: publicError }] = await Promise.all([
    supabaseClient.from(APP_USERS_TABLE).select('*'),
    supabaseClient.from('public_landlords').select('*'),
  ]);

  if (error && publicError) {
    throw new Error(error.message);
  }

  const users = new Map<string, User>();
  [...(publicLandlords ?? []), ...(data ?? [])].forEach((row) => {
    const normalized = normalizeUser(row as AppUserRow);
    if (normalized.id) users.set(normalized.id, normalized);
  });
  return [...users.values()];
}

export async function fetchUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabaseClient.from(APP_USERS_TABLE).select('*').eq('id', userId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeUser(data as AppUserRow) : null;
}

export async function fetchUserByAuthId(authId: string): Promise<User | null> {
  const { data, error } = await supabaseClient.from(APP_USERS_TABLE).select('*').eq('auth_id', authId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeUser(data as AppUserRow) : null;
}

export async function fetchUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabaseClient.from(APP_USERS_TABLE).select('*').eq('email', email).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeUser(data as AppUserRow) : null;
}

async function ensureProfileForAuthUser(authUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<User> {
  const existingByAuthId = await fetchUserByAuthId(authUser.id);
  if (existingByAuthId) {
    return existingByAuthId;
  }

  const email = authUser.email ?? '';
  const existingByEmail = email ? await fetchUserByEmail(email) : null;
  if (existingByEmail) {
    const { data, error } = await supabaseClient
      .from(APP_USERS_TABLE)
      .update({ auth_id: authUser.id })
      .eq('id', existingByEmail.id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const profile = normalizeUser(data as AppUserRow);
    await ensureRoleProfile(profile.id, profile.role, {
      adminLevel: profile.adminLevel,
      department: profile.department,
      permitNumber: profile.permitNumber,
      isVerified: profile.isVerified,
    });
    return profile;
  }

  const role = typeof authUser.user_metadata?.role === 'string' ? authUser.user_metadata.role : 'student';
  const name = typeof authUser.user_metadata?.name === 'string' ? authUser.user_metadata.name : email.split('@')[0] || 'User';
  const middleInitial = typeof authUser.user_metadata?.middleInitial === 'string' ? authUser.user_metadata.middleInitial : null;
  const address = typeof authUser.user_metadata?.address === 'string' ? authUser.user_metadata.address : null;
  const status = role === 'landlord' ? 'pending' : 'active';

  const { data, error } = await supabaseClient
    .from(APP_USERS_TABLE)
    .insert({
      auth_id: authUser.id,
      email,
      name,
      middle_initial: nonEmptyString(middleInitial),
      address: nonEmptyString(address),
      role,
      status,
      is_verified: role !== 'landlord',
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const profile = normalizeUser(data as AppUserRow);
  await ensureRoleProfile(profile.id, profile.role, { isVerified: profile.isVerified });
  return profile;
}

export async function getCurrentAuthenticatedUser(): Promise<User | null> {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  const authUser = data.session?.user;
  if (!authUser) {
    persistCurrentUser(null);
    return null;
  }

  const profile = await ensureProfileForAuthUser(authUser);
  persistCurrentUser(profile);
  return profile;
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  const { data } = supabaseClient.auth.onAuthStateChange((_event: string, session) => {
    const authUser = session?.user;

    if (!authUser) {
      persistCurrentUser(null);
      callback(null);
      return;
    }

    void ensureProfileForAuthUser(authUser)
      .then((profile) => {
        persistCurrentUser(profile);
        callback(profile);
      })
      .catch((error) => {
        console.error('Failed to load Supabase Auth profile:', error);
        persistCurrentUser(null);
        callback(null);
      });
  });

  return () => data.subscription.unsubscribe();
}

export async function signupUser(input: CreateUserInput): Promise<User> {
  const email = input.email.trim();
  const status = input.status ?? (input.role === 'landlord' ? 'pending' : 'active');

  const { data: authData, error: authError } = await supabaseClient.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        name: input.name,
        role: input.role,
        mobile: input.mobile ?? input.mobileNumber,
        middleInitial: input.middleInitial,
        address: input.address,
        school: input.school,
        guardianName: input.guardianName,
        guardianAddress: input.guardianAddress,
        guardianContact: input.guardianContact,
        company: input.company,
        workAddress: input.workAddress,
        permitNumber: input.permitNumber,
      },
    },
  });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error('Unable to create Supabase Auth user.');
  }

  if (!authData.session) {
    return {
      id: authData.user.id,
      authId: authData.user.id,
      name: input.name,
      email,
      role: input.role,
      status,
      isVerified: input.role !== 'landlord',
      mobile: input.mobile ?? input.mobileNumber,
      mobileNumber: input.mobile ?? input.mobileNumber,
    };
  }

  const existing = await fetchUserByEmail(email);
  if (existing) {
    const { data, error } = await supabaseClient
      .from(APP_USERS_TABLE)
      .update({
        auth_id: authData.user.id,
        name: input.name,
        middle_initial: nonEmptyString(input.middleInitial),
        address: nonEmptyString(input.address),
        role: input.role,
        status,
        is_verified: input.role !== 'landlord',
        mobile: nonEmptyString(input.mobile) ?? nonEmptyString(input.mobileNumber),
        permit_number: input.role === 'landlord' ? nonEmptyString(input.permitNumber) : null,
        department: nonEmptyString(input.department),
        admin_level: nonEmptyString(input.adminLevel),
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const profile = normalizeUser(data as AppUserRow);
    await ensureRoleProfile(profile.id, input.role, { ...input, isVerified: input.role !== 'landlord' });
    await uploadLandlordSignupDocuments(profile.id, input);
    await supabaseClient.auth.signOut();
    return profile;
  }

  const { data, error } = await supabaseClient
    .from(APP_USERS_TABLE)
    .insert({
      auth_id: authData.user.id,
      name: input.name,
      email,
      middle_initial: nonEmptyString(input.middleInitial),
      address: nonEmptyString(input.address),
      role: input.role,
      status,
      is_verified: input.role !== 'landlord',
      mobile: nonEmptyString(input.mobile) ?? nonEmptyString(input.mobileNumber),
      permit_number: input.role === 'landlord' ? nonEmptyString(input.permitNumber) : null,
      department: nonEmptyString(input.department),
      admin_level: nonEmptyString(input.adminLevel),
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const profile = normalizeUser(data as AppUserRow);
  await ensureRoleProfile(profile.id, input.role, { ...input, isVerified: input.role !== 'landlord' });
  await uploadLandlordSignupDocuments(profile.id, input);
  await supabaseClient.auth.signOut();
  return profile;
}

export async function loginUser(credentials: AuthCredentials): Promise<User> {
  const email = credentials.email?.trim();
  const password = credentials.password;

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('Invalid email or password.');
  }

  const profile = await ensureProfileForAuthUser(data.user);
  await recordLogin(profile, data.user.id, true, { email });
  persistCurrentUser(profile);
  return profile;
}

export async function updateUser(userId: string, updates: UpdateUserInput): Promise<User> {
  if (typeof updates.password === 'string' && updates.password.length > 0) {
    const { error } = await supabaseClient.auth.updateUser({ password: updates.password });
    if (error) {
      throw new Error(error.message);
    }
  }

  const payload = toUserPayload(updates);

  const existing = await fetchUserById(userId);
  if (!existing) {
    throw new Error('User profile not found.');
  }

  if (Object.keys(payload).length === 0) {
    await ensureRoleProfile(userId, existing.role, updates);
    return existing;
  }

  const { data, error } = await supabaseClient.from(APP_USERS_TABLE).update(payload).eq('id', userId).select('*').single();

  if (error) {
    throw new Error(error.message);
  }

  const user = normalizeUser(data as AppUserRow);
  await ensureRoleProfile(user.id, user.role, { ...updates, isVerified: user.isVerified });
  persistCurrentUser(user);
  return user;
}

export async function deleteUser(userId: string): Promise<void> {
  const current = await getCurrentAuthenticatedUser();
  if (!current || current.id !== userId) {
    throw new Error('You can only delete your own account from this screen.');
  }

  const { error } = await supabaseClient.rpc('fn_delete_my_account');

  if (error) {
    throw new Error(error.message);
  }

  await supabaseClient.auth.signOut();
  persistCurrentUser(null);
}

export async function logoutUser(): Promise<void> {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
  persistCurrentUser(null);
}

export async function verifyLandlord(userId: string, verified = true): Promise<User> {
  const { error } = await supabaseClient.rpc('fn_set_landlord_verification', {
    p_landlord_id: userId,
    p_verified: verified,
  });
  if (error) {
    throw new Error(error.message);
  }

  const user = await fetchUserById(userId);
  if (!user) {
    throw new Error('Landlord account not found after verification update.');
  }
  return user;
}

export async function getPendingLandlordCount(): Promise<number> {
  const { data, error } = await supabaseClient.from('public_landlords').select('is_verified');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).filter((row: AppUserRow) => row.is_verified !== true).length;
}
