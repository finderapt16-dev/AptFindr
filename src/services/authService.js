import { supabase as supabaseClient } from './supabaseClient';
import { safeRandomId } from '../utils/safeRandomId';
import { validateAccountDetails, validatePersonalInformation, validateSignupPassword } from '../auth/signupValidation.js';
import { seedLandlordSignupBusinessName } from './landlordSignupProfile.js';
export class SignupFlowError extends Error {
    stage;
    code;
    constructor(message, stage, code, options) {
        super(message);
        this.stage = stage;
        this.code = code;
        this.name = 'SignupFlowError';
        if (options && 'cause' in options)
            Object.defineProperty(this, 'cause', { value: options.cause, enumerable: false });
    }
}
const APP_USERS_TABLE = 'app_users';
const VALID_ROLES = new Set(['tenant', 'landlord', 'admin']);
const GOOGLE_OAUTH_FLOW_STORAGE_KEY = 'aptfindr.google-oauth-flow';
let latestAuthProfileRequestId = 0;
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function getStringValue(row, keys, fallback = '') {
    for (const key of keys) {
        const value = row[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value;
        }
    }
    return fallback;
}
function getBooleanValue(row, keys) {
    for (const key of keys) {
        const value = row[key];
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            if (value.toLowerCase() === 'true')
                return true;
            if (value.toLowerCase() === 'false')
                return false;
        }
    }
    return undefined;
}
function normalizeStatus(row) {
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
function normalizeRoleValue(value) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    // Keep legacy accounts usable while exposing only the current tenant role.
    return normalized === 'student' || normalized === 'employee' ? 'tenant' : normalized;
}
export function isTenantRole(role) {
    return normalizeRoleValue(role) === 'tenant';
}
// The marker has to survive the whole provider round trip. Mobile browsers and
// installed PWAs frequently hand Google's redirect back in a *new* tab, where
// sessionStorage is not shared, and the callback then mistakes a finished
// signup for a bare login and throws the visitor back at the account screens.
// localStorage is shared by every tab of the origin, and the short TTL keeps an
// abandoned redirect from being replayed as signup intent much later.
const GOOGLE_OAUTH_FLOW_TTL_MS = 10 * 60 * 1000;
const GOOGLE_OAUTH_FLOW_STATES = ['login', 'signup'];
function readGoogleOAuthFlowMarker() {
    if (typeof window === 'undefined')
        return null;
    try {
        const stored = window.localStorage.getItem(GOOGLE_OAUTH_FLOW_STORAGE_KEY)
            ?? window.sessionStorage.getItem(GOOGLE_OAUTH_FLOW_STORAGE_KEY);
        if (!stored)
            return null;
        // Builds before the marker moved to localStorage stored the bare name.
        let flow = stored;
        let startedAt = null;
        try {
            const parsed = JSON.parse(stored);
            if (isRecord(parsed)) {
                flow = parsed.flow;
                startedAt = typeof parsed.at === 'number' ? parsed.at : null;
            }
        }
        catch {
            flow = stored;
        }
        const valid = GOOGLE_OAUTH_FLOW_STATES.includes(flow);
        const expired = startedAt !== null && Date.now() - startedAt > GOOGLE_OAUTH_FLOW_TTL_MS;
        if (!valid || expired) {
            clearPendingGoogleOAuthFlow();
            return null;
        }
        return flow;
    }
    catch {
        return null;
    }
}
export function setPendingGoogleOAuthFlow(flow) {
    if (typeof window === 'undefined' || !GOOGLE_OAUTH_FLOW_STATES.includes(flow))
        return;
    try {
        window.localStorage.setItem(GOOGLE_OAUTH_FLOW_STORAGE_KEY, JSON.stringify({ flow, at: Date.now() }));
        // Keep the legacy key in step so an in-flight tab from an older build
        // never reads a stale value out of sessionStorage.
        window.sessionStorage.setItem(GOOGLE_OAUTH_FLOW_STORAGE_KEY, flow);
    }
    catch {
        // Storage can be unavailable in private mode; the flow still works, it
        // just falls back to the "finish creating your account" prompt.
    }
}
export function getPendingGoogleOAuthFlow() {
    return readGoogleOAuthFlowMarker();
}
export function clearPendingGoogleOAuthFlow() {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.removeItem(GOOGLE_OAUTH_FLOW_STORAGE_KEY);
        window.sessionStorage.removeItem(GOOGLE_OAUTH_FLOW_STORAGE_KEY);
    }
    catch {
        // Nothing to clear when storage is blocked.
    }
}
/** True when the Supabase Auth user came from the Google provider. */
export function isGoogleAuthUser(authUser) {
    if (!authUser)
        return false;
    return authUser.app_metadata?.provider === 'google'
        || authUser.app_metadata?.providers?.includes('google') === true
        || (Array.isArray(authUser.identities) && authUser.identities.some((identity) => identity?.provider === 'google'));
}
/**
 * The public identity Google handed back, used to tell the visitor which
 * account still needs an AptFindr profile.
 */
export function describeGoogleAuthUser(authUser) {
    const metadata = isRecord(authUser?.user_metadata) ? authUser.user_metadata : {};
    const email = typeof authUser?.email === 'string' ? authUser.email : '';
    return {
        email,
        // Only Google's own display name: falling back to the email prefix would
        // repeat the address the notice already shows next to it.
        name: nonEmptyString(metadata.full_name) ?? nonEmptyString(metadata.name) ?? '',
    };
}
function assertValidRole(role) {
    if (!VALID_ROLES.has(role)) {
        throw new Error('Your account role is missing or invalid. Please contact support.');
    }
}
function normalizeUser(row) {
    const record = isRecord(row) ? row : {};
    const role = normalizeRoleValue(record.role);
    return {
        id: getStringValue(record, ['id']),
        authId: getStringValue(record, ['auth_id']) || undefined,
        name: getStringValue(record, ['name', 'full_name']),
        email: getStringValue(record, ['email']),
        username: getStringValue(record, ['username']) || undefined,
        middleInitial: getStringValue(record, ['middle_initial']),
        address: getStringValue(record, ['address']),
        role: role,
        status: normalizeStatus(record),
        createdAt: getStringValue(record, ['created_at']),
        updatedAt: getStringValue(record, ['updated_at']),
        isVerified: getBooleanValue(record, ['is_verified']),
        mobileNumber: getStringValue(record, ['mobile']),
        mobile: getStringValue(record, ['mobile']),
        avatar: getStringValue(record, ['avatar_url']),
        bio: getStringValue(record, ['bio']),
        permitNumber: getStringValue(record, ['permit_number']),
        department: getStringValue(record, ['department']),
        adminLevel: getStringValue(record, ['admin_level']),
    };
}
function toUserPayload(input) {
    const payload = {};
    if (typeof input.name === 'string')
        payload.name = input.name;
    if (typeof input.email === 'string')
        payload.email = input.email;
    if (typeof input.middleInitial === 'string')
        payload.middle_initial = input.middleInitial;
    if (typeof input.address === 'string')
        payload.address = input.address;
    if (typeof input.role === 'string')
        payload.role = input.role;
    if (typeof input.status === 'string')
        payload.status = input.status;
    if (typeof input.isVerified === 'boolean') {
        payload.is_verified = input.isVerified;
        payload.verification_status = input.isVerified ? 'verified' : 'pending';
        payload.landlord_status = input.isVerified ? 'verified' : 'pending';
    }
    if (typeof input.mobile === 'string')
        payload.mobile = input.mobile;
    if (typeof input.mobileNumber === 'string')
        payload.mobile = input.mobileNumber;
    if (typeof input.permitNumber === 'string')
        payload.permit_number = input.permitNumber;
    if (typeof input.department === 'string')
        payload.department = input.department;
    if (typeof input.adminLevel === 'string')
        payload.admin_level = input.adminLevel;
    return payload;
}
function nonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
async function recordLogin(profile, authId, success = true, metadata = {}) {
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
async function ensureRoleProfile(userId, role, input) {
    let table = null;
    let payload = { user_id: userId };
    if (role === 'tenant') {
        table = 'tenant_profiles';
    }
    if (role === 'landlord') {
        table = 'landlord_profiles';
        if (typeof input.permitNumber === 'string') {
            payload.permit_number = nonEmptyString(input.permitNumber);
            payload.business_permit_number = nonEmptyString(input.permitNumber);
        }
        if (typeof input.isVerified === 'boolean')
            payload.is_verified = input.isVerified;
    }
    if (role === 'admin') {
        table = 'admin_profiles';
        if (typeof input.adminLevel === 'string')
            payload.admin_level = input.adminLevel;
        if (typeof input.department === 'string')
            payload.department = input.department;
    }
    if (!table)
        return;
    const { error } = await supabaseClient.from(table).upsert(payload, { onConflict: 'user_id' });
    if (error) {
        throw new Error(`Failed to sync ${table}: ${error.message}`);
    }
    if (role === 'landlord') {
        await seedLandlordSignupBusinessName(supabaseClient, userId, input.signupBusinessName);
    }
}
async function uploadLandlordSignupDocuments(userId, input) {
    if (input.role !== 'landlord')
        return;
    const files = [
        { file: input.permitDocument, column: 'verification_document_url', prefix: 'permit' },
        { file: input.idDocument, column: 'id_document_url', prefix: 'identity' },
    ].filter((item) => item.file instanceof File);
    if (files.length === 0)
        return;
    const updates = {};
    for (const item of files) {
        const extension = item.file.name.split('.').pop()?.toLowerCase() || 'bin';
        const path = `${userId}/${item.prefix}-${safeRandomId()}.${extension}`;
        const { error } = await supabaseClient.storage.from('verification-documents').upload(path, item.file, {
            contentType: item.file.type || undefined,
            upsert: false,
        });
        if (error)
            throw new Error(`Unable to upload ${item.prefix} document: ${error.message}`);
        updates[item.column] = path;
    }
    const { error } = await supabaseClient.from('landlord_profiles').update(updates).eq('user_id', userId);
    if (error)
        throw new Error(`Unable to link verification documents: ${error.message}`);
}
export function readCurrentUserFromStorage() {
    return null;
}
export function persistCurrentUser(_user) {
    // Compatibility no-op. Supabase Auth and the database profile are authoritative.
}
export async function fetchAppUsers() {
    const [{ data, error }, { data: publicLandlords, error: publicError }] = await Promise.all([
        supabaseClient.from(APP_USERS_TABLE).select('*'),
        supabaseClient.from('public_landlords').select('*'),
    ]);
    if (error && publicError) {
        throw new Error(error.message);
    }
    const users = new Map();
    [...(publicLandlords ?? []), ...(data ?? [])].forEach((row) => {
        const normalized = normalizeUser(row);
        if (normalized.id)
            users.set(normalized.id, normalized);
    });
    return [...users.values()];
}
export async function fetchUserById(userId) {
    const { data, error } = await supabaseClient.from(APP_USERS_TABLE).select('*').eq('id', userId).maybeSingle();
    if (error) {
        throw new Error(error.message);
    }
    return data ? normalizeUser(data) : null;
}
export async function fetchUserByAuthId(authId) {
    const { data, error } = await supabaseClient.from(APP_USERS_TABLE).select('*').eq('auth_id', authId).maybeSingle();
    if (error) {
        throw new Error(error.message);
    }
    return data ? normalizeUser(data) : null;
}
export async function fetchUserByEmail(email) {
    const { data, error } = await supabaseClient.from(APP_USERS_TABLE).select('*').eq('email', email).maybeSingle();
    if (error) {
        throw new Error(error.message);
    }
    return data ? normalizeUser(data) : null;
}
function isUnfinishedGoogleProfile(authUser, profile) {
    if (!profile || !isGoogleAuthUser(authUser) || authUser.user_metadata?.googleSignupCompleted === true) return false;
    if (authUser.user_metadata?.googleSignupCompleted === false) return true;
    // Older triggers assigned a generated username before the signup form.
    // Keep real legacy accounts; only treat these placeholder profiles as unfinished.
    return isTenantRole(profile.role)
        && authUser.user_metadata?.termsAccepted !== true
        && /^user_[a-f0-9]{24}$|^usr_[a-f0-9]{26}$/i.test(profile.username ?? '');
}
export async function getExistingProfileForAuthUser(authUser) {
    if (!authUser?.id)
        return null;
    const existingByAuthId = await fetchUserByAuthId(authUser.id);
    if (existingByAuthId)
        return isUnfinishedGoogleProfile(authUser, existingByAuthId) ? null : existingByAuthId;
    const existingByEmail = authUser.email ? await fetchUserByEmail(authUser.email) : null;
    return isUnfinishedGoogleProfile(authUser, existingByEmail) ? null : existingByEmail;
}
async function ensureProfileForAuthUser(authUser) {
    if (!authUser?.email_confirmed_at) return null;
    const existingByAuthId = await fetchUserByAuthId(authUser.id);
    if (isUnfinishedGoogleProfile(authUser, existingByAuthId)) return null;
    if (existingByAuthId) {
        assertValidRole(existingByAuthId.role);
        await ensureRoleProfile(existingByAuthId.id, existingByAuthId.role, {
            signupBusinessName: authUser.user_metadata?.businessName,
            permitNumber: existingByAuthId.permitNumber,
            adminLevel: existingByAuthId.adminLevel,
            department: existingByAuthId.department,
            isVerified: existingByAuthId.isVerified,
        });
        return existingByAuthId;
    }
    const email = authUser.email ?? '';
    const existingByEmail = email ? await fetchUserByEmail(email) : null;
    if (isUnfinishedGoogleProfile(authUser, existingByEmail)) return null;
    if (existingByEmail) {
        assertValidRole(existingByEmail.role);
        const { data, error } = await supabaseClient
            .from(APP_USERS_TABLE)
            .update({ auth_id: authUser.id })
            .eq('id', existingByEmail.id)
            .select('*')
            .single();
        if (error) {
            throw new Error(error.message);
        }
        const profile = normalizeUser(data);
        assertValidRole(profile.role);
        await ensureRoleProfile(profile.id, profile.role, {
            signupBusinessName: authUser.user_metadata?.businessName,
            adminLevel: profile.adminLevel,
            department: profile.department,
            permitNumber: profile.permitNumber,
            isVerified: profile.isVerified,
        });
        return profile;
    }
    if (isGoogleAuthUser(authUser) && authUser.user_metadata?.googleSignupCompleted !== true) return null;
    const role = normalizeRoleValue(authUser.user_metadata?.role);
    if (role !== 'tenant' && role !== 'landlord') {
        throw new Error('A public account profile cannot be created with this role.');
    }
    const name = typeof authUser.user_metadata?.name === 'string' ? authUser.user_metadata.name : email.split('@')[0] || 'User';
    const middleInitial = typeof authUser.user_metadata?.middleInitial === 'string' ? authUser.user_metadata.middleInitial : null;
    const address = typeof authUser.user_metadata?.address === 'string' ? authUser.user_metadata.address : null;
    const mobile = typeof authUser.user_metadata?.mobile === 'string' ? authUser.user_metadata.mobile : null;
    const status = role === 'landlord' ? 'pending' : 'active';
    const profilePayload = {
        // Match handle_new_auth_user: new profiles use the Auth UUID as both IDs.
        id: authUser.id,
        auth_id: authUser.id,
        email,
        name,
        username: nonEmptyString(authUser.user_metadata?.username),
        middle_initial: nonEmptyString(middleInitial),
        address: nonEmptyString(address),
        mobile: nonEmptyString(mobile),
        role,
        status,
        is_verified: role !== 'landlord',
    };
    const { data, error } = await supabaseClient
        .from(APP_USERS_TABLE)
        .insert(profilePayload)
        .select('*')
        .single();
    if (error) {
        // The auth-state listener and callback hydration can arrive together
        // after OAuth. A unique-key collision means the other request created
        // the same profile first, so load it instead of treating it as a
        // second account or a failed sign-in.
        if (error.code === '23505') {
            const concurrentProfile = await getExistingProfileForAuthUser(authUser);
            if (concurrentProfile)
                return concurrentProfile;
        }
        throw new Error(error.message);
    }
    const profile = normalizeUser(data);
    await ensureRoleProfile(profile.id, profile.role, {
        signupBusinessName: authUser.user_metadata?.businessName,
        permitNumber: typeof authUser.user_metadata?.permitNumber === 'string' ? authUser.user_metadata.permitNumber : undefined,
        isVerified: profile.isVerified,
    });
    return profile;
}
function requiresPendingEmailVerification(authUser) {
    return !authUser.email_confirmed_at;
}
function assertActiveAccount(user) {
    if (!user) return;
    if (String(user.status).toLowerCase() === 'disabled') {
        throw new Error('This account has been deactivated. Contact an administrator.');
    }
}
export async function getCurrentAuthenticatedUser() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
        throw new Error(error.message);
    }
    const authUser = data.session?.user;
    if (!authUser) {
        persistCurrentUser(null);
        return null;
    }
    if (requiresPendingEmailVerification(authUser)) {
        await supabaseClient.auth.signOut();
        persistCurrentUser(null);
        return null;
    }
    const profile = await ensureProfileForAuthUser(authUser);
    assertActiveAccount(profile);
    persistCurrentUser(profile);
    return profile;
}
export function onAuthStateChange(callback) {
    const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
        const requestId = ++latestAuthProfileRequestId;
        const authUser = session?.user;
        if (!authUser) {
            persistCurrentUser(null);
            callback(null);
            return;
        }
        if (requiresPendingEmailVerification(authUser)) {
            void supabaseClient.auth.signOut();
            persistCurrentUser(null);
            callback(null);
            return;
        }
        void ensureProfileForAuthUser(authUser)
            .then((profile) => {
            if (requestId !== latestAuthProfileRequestId)
                return;
            assertActiveAccount(profile);
            persistCurrentUser(profile);
            callback(profile);
        })
            .catch((error) => {
            if (requestId !== latestAuthProfileRequestId)
                return;
            console.error('Failed to load Supabase Auth profile:', error);
            persistCurrentUser(null);
            callback(null);
        });
    });
    return () => data.subscription.unsubscribe();
}
function signupLog(message, details) {
    if (!import.meta.env.DEV)
        return;
    if (details)
        console.info(message, details);
    else
        console.info(message);
}
function confirmationEmailErrorMessage(error) {
    const details = `${error.code ?? ''} ${error.message ?? ''}`;
    if (/email_address_not_authorized|email.*not.*authorized|not.*authorized.*email/i.test(details)) {
        return "We couldn't send the confirmation email because the email service does not allow delivery to this address. Contact support to configure the email sender.";
    }
    if (error.status === 429 || /over_email_send_rate_limit|rate.limit|too many|seconds/i.test(details)) {
        return "We couldn't send the confirmation email because too many requests were made. Wait before using Resend verification; creating another account will not bypass the limit.";
    }
    return "We couldn't send the confirmation email because the email service is unavailable. Contact support if this continues.";
}
function mapSignupError(error) {
    const message = error.message ?? '';
    const code = error.code ?? '';
    console.error('[AUTH] Signup request failed', { message, status: error.status, code: error.code });
    if (/already registered|already exists|user.*exists/i.test(message)) {
        return new SignupFlowError('An account may already exist for this email. Try signing in, resending verification, or resetting your password.', 'auth', 'email_exists', { cause: error });
    }
    if (/invalid.*email|email.*invalid/i.test(message))
        return new SignupFlowError('Enter a valid email address.', 'validation', 'invalid_email', { cause: error });
    if (/password|weak/i.test(message))
        return new SignupFlowError('Choose a stronger password that meets the password requirements.', 'validation', 'weak_password', { cause: error });
    if (/signup.*disabled|signups.*disabled/i.test(message))
        return new SignupFlowError('Account registration is temporarily unavailable.', 'auth', 'signup_disabled', { cause: error });
    if (error.status === 429 || /rate|too many|seconds/i.test(message) || /over_email_send_rate_limit/i.test(code)) {
        return new SignupFlowError(confirmationEmailErrorMessage(error), 'auth', 'confirmation_email_rate_limit', { cause: error });
    }
    if (/smtp|mailer|email.*send|send.*email|confirmation.*email|email.*not.*authorized|not.*authorized.*email/i.test(`${code} ${message}`)) {
        return new SignupFlowError(confirmationEmailErrorMessage(error), 'auth', 'confirmation_email_delivery', { cause: error });
    }
    if (/database|trigger|permission|row-level|rls/i.test(message))
        return new SignupFlowError('Account registration could not be completed because profile setup failed. No retry is needed until the database configuration is corrected.', 'profile', 'profile_database', { cause: error });
    if (/fetch|network|connection/i.test(message))
        return new SignupFlowError('We could not reach the account service. Check your connection and try again.', 'auth', 'network', { cause: error });
    return new SignupFlowError('We could not complete account registration. Please try again later.', 'auth', 'unexpected', { cause: error });
}
function pendingSignupUser(input, authId, role) {
    return {
        id: authId,
        authId,
        name: input.name,
        email: input.email.trim().toLowerCase(),
        username: input.username.trim().toLowerCase(),
        role,
        status: role === 'landlord' ? 'pending' : 'active',
        isVerified: role !== 'landlord',
        mobile: input.mobile ?? input.mobileNumber,
        mobileNumber: input.mobile ?? input.mobileNumber,
    };
}
export async function signupUser(input) {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();
    const role = isTenantRole(input.role) ? 'tenant' : input.role;
    if (role !== 'tenant' && role !== 'landlord')
        throw new SignupFlowError('Public registration supports tenant and landlord accounts only.', 'validation', 'invalid_public_role');
    if (input.termsAccepted !== true)
        throw new SignupFlowError('You must agree to the Terms of Use and Privacy Policy to continue.', 'validation', 'terms_required');
    if (role === 'landlord' && input.landlordVerificationAccepted !== true)
        throw new SignupFlowError('You must agree to the Terms of Use and Landlord Verification Policy to continue.', 'validation', 'landlord_policy_required');
    if (!/^[a-z0-9_]{4,30}$/.test(username))
        throw new SignupFlowError('Username must be 4–30 characters using only letters, numbers, or underscores.', 'validation', 'invalid_username');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new SignupFlowError('Enter a valid email address.', 'validation', 'invalid_email');
    const passwordError = validateSignupPassword(input.password);
    if (passwordError) throw new SignupFlowError(passwordError, 'validation', 'weak_password');
    signupLog('[AUTH] Signup started', { email, role });
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password: input.password,
        options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
                username,
                name: input.name,
                role,
                mobile: input.mobile ?? input.mobileNumber,
                middleInitial: input.middleInitial,
                address: input.address,
                permitNumber: role === 'landlord' ? input.permitNumber : undefined,
                termsAccepted: true,
                landlordVerificationAccepted: role === 'landlord' ? true : undefined,
                requires_email_verification: true,
            },
        },
    });
    if (authError)
        throw mapSignupError(authError);
    if (!authData.user) {
        console.error('[AUTH] Signup returned no user and no Supabase error');
        throw new SignupFlowError('We could not confirm that account registration completed. Try signing in, resending verification, or resetting your password before registering again.', 'auth', 'missing_auth_response');
    }
    // Supabase deliberately obscures duplicate-email signup when email
    // confirmation is enabled. An empty identities array means no new identity
    // was created, so never continue with profile creation or report success.
    const existingAccount = Array.isArray(authData.user.identities) && authData.user.identities.length === 0;
    if (existingAccount) {
        signupLog('[AUTH] Existing account response received', { email });
        return {
            user: pendingSignupUser(input, authData.user.id, role),
            accountCreated: false,
            profileCreated: false,
            requiresEmailVerification: true,
            existingAccount: true,
        };
    }
    const requiresEmailVerification = !authData.user.email_confirmed_at;
    signupLog('[AUTH] Auth account created', { authUserId: authData.user.id });
    signupLog(requiresEmailVerification ? '[AUTH] Verification pending' : '[AUTH] Email already confirmed');
    // Pending signups exist only in Auth. Application profiles are created on
    // confirmation; the client can finalize them only with a verified session.
    let profile = pendingSignupUser(input, authData.user.id, role);
    let profileSetupError;
    if (authData.session && !requiresEmailVerification) {
        try {
            signupLog('[PROFILE] Checking app_users profile');
            profile = await ensureProfileForAuthUser(authData.user);
            signupLog('[PROFILE] Profile exists', { profileId: profile.id });
            await uploadLandlordSignupDocuments(profile.id, input);
        }
        catch (error) {
            console.error('[PROFILE] Auth account exists but profile finalization failed', error);
            profileSetupError = 'Your account was created, but we could not finish setting up your profile. Verify your email, then try signing in or contact support.';
        }
    }
    signupLog('[AUTH] Signup flow complete', { requiresEmailVerification, profileSetupError: Boolean(profileSetupError) });
    return {
        user: profile,
        accountCreated: true,
        profileCreated: !requiresEmailVerification && !profileSetupError,
        requiresEmailVerification,
        existingAccount: false,
        profileSetupError,
    };
}
export async function finalizeGoogleSignup(_authUser, input = {}) {
    // Verify the provider identity instead of trusting the form's email.
    let { data: verified, error: verificationError } = await supabaseClient.auth.getUser();
    if (verificationError && [401, 403].includes(verificationError.status)) {
        const { error: refreshError } = await supabaseClient.auth.refreshSession();
        if (!refreshError) {
            const retry = await supabaseClient.auth.getUser();
            verified = retry.data;
            verificationError = retry.error;
        }
    }
    const authUser = verified?.user;
    if (verificationError && verificationError.status !== 401 && verificationError.status !== 403 && verificationError.name !== 'AuthSessionMissingError') {
        throw new Error('We could not reach Google account verification. Check your connection and try Create Account again. Your form is still here.');
    }
    if (verificationError || !isGoogleAuthUser(authUser) || !authUser.email_confirmed_at) {
        throw new Error('Your Google session has expired or is no longer available. Continue with Google again to verify your account.');
    }
    if (_authUser?.id && _authUser.id !== authUser.id) throw new Error('The signed-in Google account changed. Reload the signup form before continuing.');
    const existingProfile = await getExistingProfileForAuthUser(authUser);
    if (existingProfile) {
        assertActiveAccount(existingProfile);
        return ensureProfileForAuthUser(authUser);
    }
    if (!['tenant', 'landlord'].includes(input.role)) throw new Error('Choose Tenant or Landlord.');
    if (input.termsAccepted !== true || (input.role === 'landlord' && input.landlordVerificationAccepted !== true)) {
        throw new Error('Accept the account terms before continuing.');
    }
    const errors = {
        ...validateAccountDetails({ ...input, email: authUser.email }),
        ...(input.role === 'landlord' ? validatePersonalInformation(input) : {}),
    };
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    const placeholder = await fetchUserByAuthId(authUser.id);
    if (isUnfinishedGoogleProfile(authUser, placeholder)) {
        const { error: pendingError } = await supabaseClient.auth.updateUser({ data: { googleSignupCompleted: false } });
        if (pendingError) throw new Error(pendingError.message);
        const { error: profileError } = await supabaseClient.from(APP_USERS_TABLE).update({
            username: input.username.trim().toLowerCase(), name: input.name,
            role: input.role, mobile: input.mobileNumber || null,
            status: input.role === 'landlord' ? 'pending' : 'active',
            is_verified: input.role !== 'landlord',
        }).eq('id', placeholder.id);
        if (profileError) throw new Error(profileError.message);
    }
    const { data, error } = await supabaseClient.auth.updateUser({
        password: input.password,
        data: {
            name: input.name,
            username: input.username.trim().toLowerCase(),
            role: input.role,
            mobile: input.mobileNumber,
            middleInitial: input.middleInitial,
            termsAccepted: true,
            landlordVerificationAccepted: input.role === 'landlord',
            googleSignupCompleted: true,
        },
    });
    if (error || !data.user) throw new Error(error?.message || 'Unable to save your Google account details.');
    const profile = await ensureProfileForAuthUser(data.user);
    assertActiveAccount(profile);
    return profile;
}
export async function signupWithGoogle(options = {}) {
    return loginWithGoogle({ signupRole: options.role });
}
let pendingGoogleReset = null;
export function resetUnfinishedGoogleSignIn() {
    clearPendingGoogleOAuthFlow();
    if (pendingGoogleReset) return pendingGoogleReset;
    pendingGoogleReset = (async () => {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        const authUser = data.session?.user;
        if (!isGoogleAuthUser(authUser)) return;
        if (await getExistingProfileForAuthUser(authUser)) return;
        const { error: signOutError } = await supabaseClient.auth.signOut({ scope: 'local' });
        if (signOutError) throw signOutError;
    })().finally(() => { pendingGoogleReset = null; });
    return pendingGoogleReset;
}
export async function loginWithGoogle({ signupRole } = {}) {
    // Closing and immediately reopening the popup must finish the reset first.
    if (pendingGoogleReset) await pendingGoogleReset;
    // A Google session can already be live without an AptFindr account: that is
    // the state the sign-in notice exists for. Sending it back to the provider
    // would loop the visitor between Google and the same screen, so hand the
    // caller the identity and let it offer to finish the account instead.
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const currentAuthUser = sessionData.session?.user;
    if (isGoogleAuthUser(currentAuthUser)) {
        try {
            const existingProfile = await getExistingProfileForAuthUser(currentAuthUser);
            if (!existingProfile) {
                return { needsAccount: true, google: describeGoogleAuthUser(currentAuthUser) };
            }
        }
        catch (profileError) {
            // A profile lookup can only fail transiently. Fall through to the
            // normal provider round trip rather than blocking sign-in.
            console.warn('[AUTH] Google session profile lookup failed before sign-in', profileError);
        }
    }
    setPendingGoogleOAuthFlow('login');
    const signupRoleParam = signupRole === 'landlord' ? '?signup_role=landlord' : '';
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback${signupRoleParam}`,
            // Force Google to show the account chooser instead of silently
            // reusing whichever Google account is already signed in.
            queryParams: {
                prompt: 'select_account',
            },
        },
    });
    if (error) {
        throw new Error('We could not continue with Google. Please try again.');
    }
}
export async function loginUser(credentials) {
    const username = credentials.username?.trim().toLowerCase();
    const password = credentials.password;
    if (!username || !password) {
        throw new Error('Username and password are required.');
    }
    // Resolve only the internal Supabase Auth email. Password verification still
    // happens through Supabase Auth, and app_users remains protected by RLS.
    const { data: resolvedEmail, error: resolveError } = await supabaseClient.rpc('fn_resolve_username_login', {
        p_username: username,
    });
    if (resolveError) {
        console.error('[AUTH] Username resolution failed', {
            message: resolveError.message,
            code: resolveError.code,
            details: resolveError.details,
        });
        throw new Error('Username sign-in is temporarily unavailable. Please try again later.');
    }
    if (typeof resolvedEmail !== 'string' || !resolvedEmail.trim()) {
        throw new Error('Invalid username or password.');
    }
    const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: resolvedEmail.trim(),
        password,
    });
    if (signInError || !data.user) {
        const message = signInError?.message ?? '';
        console.error('[AUTH] Password sign-in failed', {
            message,
            status: signInError?.status,
            code: signInError?.code,
        });
        if (signInError?.status === 429 || /rate|too many/i.test(message)) {
            throw new Error('Too many sign-in attempts. Please wait before trying again.');
        }
        if (/email.*not.*confirm|confirm.*email|verify.*email/i.test(message)) {
            throw new Error('Please verify your account before signing in.');
        }
        throw new Error('Invalid username or password.');
    }
    if (requiresPendingEmailVerification(data.user)) {
        await supabaseClient.auth.signOut();
        throw new Error('Please verify your account before signing in.');
    }
    const profile = await ensureProfileForAuthUser(data.user);
    assertActiveAccount(profile);
    await recordLogin(profile, data.user.id, true, { username });
    persistCurrentUser(profile);
    return profile;
}
export async function resendSignupVerification(email) {
    const normalizedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail))
        throw new Error('Enter a valid email address.');
    const { error } = await supabaseClient.auth.resend({
        type: 'signup', email: normalizedEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (!error)
        return;
    console.error('[AUTH] Verification resend failed', { message: error.message, status: error.status, code: error.code });
    if (error.status === 429 || /rate|too many|seconds|smtp|mailer|email.*send|send.*email|email.*not.*authorized|not.*authorized.*email/i.test(`${error.code ?? ''} ${error.message}`)) {
        throw new Error(confirmationEmailErrorMessage(error));
    }
    if (/already.*confirm|already.*verif/i.test(error.message))
        throw new Error('This email is already verified. Try signing in or resetting your password.');
    if (/invalid.*email/i.test(error.message))
        throw new Error('Enter a valid email address.');
    throw new Error('The verification email could not be requested. Please try again later.');
}
// Password recovery and email verification keep their UI decisions in the auth pages.
export function requestPasswordResetEmail(email) {
    return supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    });
}
export function exchangeAuthCode(code) {
    return supabaseClient.auth.exchangeCodeForSession(code);
}
export function getAuthSession() {
    return supabaseClient.auth.getSession();
}
export function getAuthUser() {
    return supabaseClient.auth.getUser();
}
export function updateAuthPassword(password) {
    return supabaseClient.auth.updateUser({ password });
}
// Supabase signs out of every device by default. Pass { scope: 'local' } to end
// only this browser's session.
export function signOutAuthSession(options) {
    return supabaseClient.auth.signOut(options);
}
export async function updateUser(userId, updates) {
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
    const user = normalizeUser(data);
    await ensureRoleProfile(user.id, user.role, { ...updates, isVerified: user.isVerified });
    persistCurrentUser(user);
    return user;
}
export async function deleteUser(userId) {
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
export async function logoutUser() {
    latestAuthProfileRequestId += 1;
    persistCurrentUser(null);
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        throw new Error(error.message);
    }
    persistCurrentUser(null);
}
export async function verifyLandlord(userId, verified = true) {
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
export async function getPendingLandlordCount() {
    const { data, error } = await supabaseClient.from('public_landlords').select('is_verified');
    if (error) {
        throw new Error(error.message);
    }
    return (data ?? []).filter((row) => row.is_verified !== true).length;
}
