import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(fileName) {
  try {
    const raw = readFileSync(resolve(process.cwd(), fileName), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // The script can run with shell-provided environment variables only.
  }
}

function requireEnv(name, fallbackName) {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : "");
  if (!value?.trim()) {
    throw new Error(`Missing ${name}${fallbackName ? ` or ${fallbackName}` : ""}.`);
  }
  return value.trim();
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeUsername(value, email) {
  const source = String(value || email.split("@")[0] || "super_admin")
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 30);
  return source.length >= 3 ? source : "super_admin";
}

function assertValidPassword(password) {
  if (!/^.{8,}$/.test(password)) {
    throw new Error("SUPER_ADMIN_PASSWORD must be at least 8 characters.");
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error("SUPER_ADMIN_PASSWORD must include uppercase, lowercase, number, and special character.");
  }
}

function roleConstraintMessage(error) {
  const message = `${error?.code ?? ""} ${error?.message ?? ""}`.trim();
  if (/check constraint|invalid input value|role/i.test(message)) {
    return `${message}\n\nThe database rejected role "super_admin". Update the app_users.role constraint/policy in Supabase to allow super_admin, then run this script again.`;
  }
  return message || "Unknown Supabase error.";
}

async function findAuthUserByEmail(client, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data?.users?.find((item) => normalizeEmail(item.email) === email);
    if (user) return user;
    if (!data?.users || data.users.length < 1000) return null;
  }
  return null;
}

async function createOrUpdateAuthUser(client, input) {
  const metadata = {
    name: input.name,
    username: input.username,
    role: "super_admin",
    termsAccepted: true,
  };
  const createResult = await client.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (!createResult.error && createResult.data?.user) {
    return createResult.data.user;
  }

  const existing = await findAuthUserByEmail(client, input.email);
  if (!existing) {
    throw createResult.error ?? new Error("Unable to create Supabase Auth user.");
  }

  const { data, error } = await client.auth.admin.updateUserById(existing.id, {
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      ...(existing.user_metadata ?? {}),
      ...metadata,
    },
  });
  if (error || !data?.user) {
    throw error ?? new Error("Unable to update existing Supabase Auth user.");
  }
  return data.user;
}

async function findProfile(client, authId, email) {
  const { data: byAuth, error: byAuthError } = await client
    .from("app_users")
    .select("id")
    .eq("auth_id", authId)
    .maybeSingle();
  if (byAuthError) throw byAuthError;
  if (byAuth?.id) return byAuth;

  const { data: byEmail, error: byEmailError } = await client
    .from("app_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (byEmailError) throw byEmailError;
  return byEmail;
}

async function upsertSuperAdminProfile(client, authUser, input) {
  const existing = await findProfile(client, authUser.id, input.email);
  const payload = {
    auth_id: authUser.id,
    email: input.email,
    username: input.username,
    name: input.name,
    role: "super_admin",
    status: "active",
    is_verified: true,
    department: input.department,
    admin_level: "super_admin",
  };

  if (existing?.id) {
    const { data, error } = await client
      .from("app_users")
      .update(payload)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) throw new Error(roleConstraintMessage(error));
    return data.id;
  }

  const { data, error } = await client
    .from("app_users")
    .insert({ id: authUser.id, ...payload })
    .select("id")
    .single();
  if (error) throw new Error(roleConstraintMessage(error));
  return data.id;
}

async function upsertAdminProfile(client, userId, input) {
  const { error } = await client.from("admin_profiles").upsert({
    user_id: userId,
    department: input.department,
    admin_level: "super_admin",
  }, { onConflict: "user_id" });
  if (error) throw error;
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const url = requireEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const email = normalizeEmail(requireEnv("SUPER_ADMIN_EMAIL"));
  const password = requireEnv("SUPER_ADMIN_PASSWORD");
  assertValidPassword(password);

  const input = {
    email,
    password,
    name: process.env.SUPER_ADMIN_NAME?.trim() || "Super Admin",
    username: normalizeUsername(process.env.SUPER_ADMIN_USERNAME, email),
    department: process.env.SUPER_ADMIN_DEPARTMENT?.trim() || "Executive Administration",
  };

  const client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const authUser = await createOrUpdateAuthUser(client, input);
  const profileId = await upsertSuperAdminProfile(client, authUser, input);
  await upsertAdminProfile(client, profileId, input);

  console.log(`Super admin account is ready: ${input.email}`);
  console.log(`Profile ID: ${profileId}`);
  console.log("Password was set from SUPER_ADMIN_PASSWORD and was not printed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
