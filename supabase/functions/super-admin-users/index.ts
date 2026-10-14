import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MANAGED_ROLES = new Set(["admin", "landlord", "tenant"]);
const INACTIVE_STATUSES = new Set(["disabled", "inactive", "deactivated", "deleted"]);

type JsonRecord = Record<string, unknown>;

function json(body: JsonRecord, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function badRequest(message: string, status = 400) {
  return json({ error: message }, status);
}

function requireEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRole(value: unknown) {
  const role = asString(value).toLowerCase();
  if (!MANAGED_ROLES.has(role)) throw new Error("Choose Admin, Landlord, or Tenant.");
  return role;
}

function normalizeEmail(value: unknown) {
  const email = asString(value).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return email;
}

function normalizeName(value: unknown) {
  const name = asString(value).replace(/\s+/g, " ");
  if (name.length < 2) throw new Error("Enter the user's full name.");
  return name;
}

function isInactive(status: unknown) {
  return INACTIVE_STATUSES.has(asString(status).toLowerCase());
}

function publicUser(row: JsonRecord | null) {
  if (!row) return null;
  return {
    id: row.id,
    auth_id: row.auth_id,
    email: row.email,
    name: row.name,
    username: row.username,
    role: row.role,
    status: row.status,
    is_verified: row.is_verified,
    mobile: row.mobile,
    middle_initial: row.middle_initial,
    address: row.address,
    avatar_url: row.avatar_url,
    permit_number: row.permit_number,
    business_permit_number: row.business_permit_number,
    department: row.department,
    admin_level: row.admin_level,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function baseUsername(name: string, email: string) {
  const source = name || email.split("@")[0] || "user";
  const value = source.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 22);
  return value.length >= 3 ? value : "user";
}

async function uniqueUsername(service: any, name: string, email: string) {
  const base = baseUsername(name, email);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const suffix = attempt === 0 ? "" : `_${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`;
    const username = `${base}${suffix}`.slice(0, 30);
    const { data, error } = await service.from("app_users").select("id").eq("username", username).maybeSingle();
    if (error) throw new Error(error.message || "Unable to check username availability.");
    if (!data) return username;
  }
  return `user_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

async function audit(service: any, actorId: string, action: string, targetId: string | null, details: JsonRecord = {}) {
  await service.from("audit_logs").insert({
    admin_id: actorId,
    action,
    target_type: "user",
    target_id: targetId,
    details,
  });
}

async function getActor(service: any, callerAuthId: string) {
  const { data, error } = await service
    .from("app_users")
    .select("id, auth_id, role, status, email, name")
    .or(`auth_id.eq.${callerAuthId},id.eq.${callerAuthId}`)
    .maybeSingle();
  if (error) throw new Error(error.message || "Unable to verify administrator access.");
  if (!data || data.role !== "super_admin" || isInactive(data.status)) {
    const denied = new Error("Only active Super Admin accounts can use user management.");
    denied.name = "ForbiddenError";
    throw denied;
  }
  return data;
}

async function getTargetUser(service: any, userId: string) {
  const { data, error } = await service.from("app_users").select("*").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message || "Unable to load the selected account.");
  if (!data) throw new Error("The selected account no longer exists.");
  return data;
}

async function assertNotLastActiveSuperAdmin(service: any, target: JsonRecord) {
  if (target.role !== "super_admin" || isInactive(target.status)) return;
  const { count, error } = await service
    .from("app_users")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin")
    .not("status", "in", "(disabled,inactive,deactivated,deleted)");
  if (error) throw new Error(error.message || "Unable to verify Super Admin availability.");
  if ((count ?? 0) <= 1) throw new Error("This is the last active Super Admin account. It cannot be disabled or deleted.");
}

async function countWhere(service: any, table: string, column: string, userId: string) {
  const { count, error } = await service.from(table).select("id", { count: "exact", head: true }).eq(column, userId);
  if (error) return 0;
  return count ?? 0;
}

async function dependencyCounts(service: any, userId: string) {
  const [apartments, reportsByUser, reportsByReporter, reportsByLandlord, appeals, favorites] = await Promise.all([
    countWhere(service, "apartments", "landlord_id", userId),
    countWhere(service, "reports", "user_id", userId),
    countWhere(service, "reports", "reporter_id", userId),
    countWhere(service, "reports", "landlord_id", userId),
    countWhere(service, "appeals", "landlord_id", userId),
    countWhere(service, "favorites", "user_id", userId),
  ]);
  return {
    apartments,
    reports: reportsByUser + reportsByReporter + reportsByLandlord,
    appeals,
    favorites,
  };
}

async function syncRoleProfile(service: any, userId: string, role: string, input: JsonRecord) {
  if (role === "admin") {
    const { error } = await service.from("admin_profiles").upsert({
      user_id: userId,
      department: asString(input.department) || null,
      admin_level: asString(input.admin_level) || "Admin",
    }, { onConflict: "user_id" });
    if (error) throw new Error(error.message || "Unable to create the admin profile.");
  }
  if (role === "landlord") {
    const { error } = await service.from("landlord_profiles").upsert({
      user_id: userId,
      is_verified: false,
      permit_number: asString(input.permit_number) || null,
      business_permit_number: asString(input.business_permit_number) || null,
    }, { onConflict: "user_id" });
    if (error) throw new Error(error.message || "Unable to create the landlord profile.");
  }
  if (role === "tenant") {
    const { error } = await service.from("tenant_profiles").upsert({ user_id: userId }, { onConflict: "user_id" });
    if (error && !/does not exist/i.test(error.message ?? "")) {
      throw new Error(error.message || "Unable to create the tenant profile.");
    }
  }
}

async function listUsers(service: any) {
  const { data, error } = await service
    .from("app_users")
    .select("*")
    .in("role", ["admin", "super_admin", "landlord", "tenant"])
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message || "Unable to load user accounts.");
  return json({ users: (data ?? []).map(publicUser) });
}

async function getUserDetails(service: any, userId: string) {
  const user = await getTargetUser(service, userId);
  const role = asString(user.role).toLowerCase();
  const [adminProfile, landlordProfile, tenantProfile, counts] = await Promise.all([
    role === "admin" || role === "super_admin" ? service.from("admin_profiles").select("*").eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
    role === "landlord" ? service.from("landlord_profiles").select("*").eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
    role === "tenant" ? service.from("tenant_profiles").select("*").eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
    dependencyCounts(service, userId),
  ]);
  return json({
    details: {
      user: publicUser(user),
      adminProfile: adminProfile.data ?? null,
      landlordProfile: landlordProfile.data ?? null,
      tenantProfile: tenantProfile.data ?? null,
      dependencyCounts: counts,
    },
  });
}

async function createUser(service: any, actor: JsonRecord, input: JsonRecord) {
  const role = normalizeRole(input.role);
  const email = normalizeEmail(input.email);
  const name = normalizeName(input.name);
  const password = asString(input.password);
  if (password.length < 8) throw new Error("Temporary password must be at least 8 characters.");
  const username = await uniqueUsername(service, name, email);
  const authResult = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role, username },
  });
  if (authResult.error || !authResult.data?.user) {
    throw new Error(authResult.error?.message || "Unable to create the Auth account.");
  }
  const authUser = authResult.data.user;
  const appUserPayload = {
    id: authUser.id,
    auth_id: authUser.id,
    email,
    name,
    username,
    role,
    status: "active",
    is_verified: role !== "landlord",
    mobile: asString(input.mobile) || null,
    department: role === "admin" ? asString(input.department) || null : null,
    admin_level: role === "admin" ? "Admin" : null,
  };
  const { data, error } = await service.from("app_users").insert(appUserPayload).select("*").single();
  if (error || !data) {
    await service.auth.admin.deleteUser(authUser.id).catch(() => undefined);
    throw new Error(error?.message || "Unable to create the app user profile.");
  }
  await syncRoleProfile(service, authUser.id, role, input);
  await audit(service, String(actor.id), "super_admin_user_created", authUser.id, { role, email });
  return json({ user: publicUser(data) });
}

async function updateUser(service: any, actor: JsonRecord, userId: string, input: JsonRecord) {
  const target = await getTargetUser(service, userId);
  const updates: JsonRecord = {};
  if ("role" in input && normalizeRole(input.role) !== target.role) {
    throw new Error("Role changes require a separate approved migration workflow.");
  }
  if ("name" in input) updates.name = normalizeName(input.name);
  if ("email" in input) updates.email = normalizeEmail(input.email);
  if ("mobile" in input) updates.mobile = asString(input.mobile) || null;
  if ("status" in input) {
    const status = asString(input.status).toLowerCase() === "disabled" ? "disabled" : "active";
    if (status === "disabled") await assertNotLastActiveSuperAdmin(service, target);
    updates.status = status;
  }
  if (updates.email && target.auth_id) {
    const { error } = await service.auth.admin.updateUserById(String(target.auth_id), {
      email: String(updates.email),
      email_confirm: true,
    });
    if (error) throw new Error(error.message || "Unable to update the Auth email.");
  }
  if (Object.keys(updates).length === 0) return json({ user: publicUser(target) });
  const { data, error } = await service.from("app_users").update(updates).eq("id", userId).select("*").single();
  if (error || !data) throw new Error(error?.message || "Unable to update the user profile.");
  if (updates.status && target.auth_id) {
    await service.auth.admin.updateUserById(String(target.auth_id), {
      ban_duration: updates.status === "disabled" ? "876000h" : "none",
    }).catch(() => undefined);
  }
  await audit(service, String(actor.id), "super_admin_user_updated", userId, {
    fields: Object.keys(updates),
    previous_status: target.status ?? null,
    next_status: data.status ?? null,
  });
  return json({ user: publicUser(data) });
}

async function setUserStatus(service: any, actor: JsonRecord, userId: string, statusValue: unknown) {
  const target = await getTargetUser(service, userId);
  const status = asString(statusValue).toLowerCase() === "active" ? "active" : "disabled";
  if (status === "disabled") await assertNotLastActiveSuperAdmin(service, target);
  const { data, error } = await service.from("app_users").update({ status }).eq("id", userId).select("*").single();
  if (error || !data) throw new Error(error?.message || "Unable to update account status.");
  if (target.auth_id) {
    await service.auth.admin.updateUserById(String(target.auth_id), {
      ban_duration: status === "disabled" ? "876000h" : "none",
    }).catch(() => undefined);
  }
  await audit(service, String(actor.id), status === "active" ? "super_admin_user_reactivated" : "super_admin_user_deactivated", userId, {
    previous_status: target.status ?? null,
    next_status: status,
  });
  return json({ user: publicUser(data) });
}

async function softDeleteUser(service: any, actor: JsonRecord, userId: string) {
  if (String(actor.id) === userId) throw new Error("You cannot delete your own Super Admin account.");
  const target = await getTargetUser(service, userId);
  await assertNotLastActiveSuperAdmin(service, target);
  const counts = await dependencyCounts(service, userId);
  const preferences = typeof target.preferences === "object" && target.preferences !== null && !Array.isArray(target.preferences)
    ? target.preferences
    : {};
  const { data, error } = await service.from("app_users").update({
    status: "disabled",
    preferences: {
      ...preferences,
      super_admin_user_management: {
        deleted_at: new Date().toISOString(),
        deleted_by: actor.id,
        dependency_counts: counts,
      },
    },
  }).eq("id", userId).select("*").single();
  if (error || !data) throw new Error(error?.message || "Unable to safely delete the user account.");
  if (target.auth_id) {
    await service.auth.admin.updateUserById(String(target.auth_id), { ban_duration: "876000h" }).catch(() => undefined);
  }
  await audit(service, String(actor.id), "super_admin_user_soft_deleted", userId, {
    dependency_counts: counts,
    retained_records: true,
  });
  return json({ user: publicUser(data), dependencyCounts: counts });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return badRequest("Use POST.", 405);
  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.toLowerCase().startsWith("bearer ")) {
      return badRequest("Missing authenticated user session.", 401);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) return badRequest("Invalid authenticated session.", 401);
    const actor = await getActor(service, authData.user.id);
    const body = await req.json().catch(() => ({}));
    const action = asString(body.action);
    if (action === "list") return await listUsers(service);
    if (action === "get") return await getUserDetails(service, asString(body.userId));
    if (action === "create") return await createUser(service, actor, (body.user ?? {}) as JsonRecord);
    if (action === "update") return await updateUser(service, actor, asString(body.userId), (body.updates ?? {}) as JsonRecord);
    if (action === "set-status") return await setUserStatus(service, actor, asString(body.userId), body.status);
    if (action === "delete") return await softDeleteUser(service, actor, asString(body.userId));
    return badRequest("Unknown user management action.");
  }
  catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process user management request.";
    const status = error instanceof Error && error.name === "ForbiddenError" ? 403 : 400;
    return badRequest(message, status);
  }
});
