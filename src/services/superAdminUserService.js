import { supabase } from "./supabaseClient";

export const MANAGED_USER_ROLES = ["admin", "landlord", "tenant"];
const MANAGED_ACCOUNT_ROLES = new Set(["admin", "super_admin", "landlord", "tenant"]);
const INACTIVE_STATUSES = new Set(["disabled", "inactive", "deactivated", "deleted"]);

export function normalizeManagedRole(role) {
    const normalized = String(role ?? "").trim().toLowerCase();
    if (normalized === "super_admin")
        return "admin";
    return MANAGED_USER_ROLES.includes(normalized) ? normalized : "tenant";
}

export function isManageableAccountRole(role) {
    return MANAGED_ACCOUNT_ROLES.has(String(role ?? "").trim().toLowerCase());
}

export function isManagedUserInactive(status) {
    return INACTIVE_STATUSES.has(String(status ?? "").trim().toLowerCase());
}

export function getManagedUserStatusLabel(user) {
    return isManagedUserInactive(user?.status) ? "Inactive" : "Active";
}

export function getManagedUserRoleLabel(user) {
    const role = String(user?.role ?? "").trim().toLowerCase();
    if (role === "admin" || role === "super_admin")
        return "Admin";
    if (role === "landlord")
        return "Landlord";
    return "Tenant";
}

export function getManagedUserInitials(user) {
    const name = String(user?.name ?? "").trim();
    const email = String(user?.email ?? "").trim();
    const source = name || email.split("@")[0] || "User";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
}

export function summarizeManagedUsers(users) {
    return users.reduce((summary, user) => {
        const role = normalizeManagedRole(user?.role);
        summary[role] += 1;
        summary.total += 1;
        return summary;
    }, { total: 0, admin: 0, landlord: 0, tenant: 0 });
}

export function subscribeToManagedUserRealtime({ onAccountChange, onSubscriptionStatus } = {}) {
    const channel = supabase
        .channel(`super-admin-user-management-${Date.now()}-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "app_users" }, (payload) => {
            const changedUser = payload?.new ?? payload?.old ?? {};
            if (!isManageableAccountRole(changedUser.role))
                return;
            onAccountChange?.(payload);
        })
        .subscribe((status) => onSubscriptionStatus?.(status));
    return () => {
        void supabase.removeChannel(channel);
    };
}

async function invokeSuperAdminUsers(action, payload = {}) {
    const { data, error } = await supabase.functions.invoke("super-admin-users", {
        body: { action, ...payload },
    });
    if (error) {
        let message = error.message || "The secure user management service is unavailable.";
        try {
            const body = await error.context?.json?.();
            if (typeof body?.error === "string")
                message = body.error;
        }
        catch {
            // Keep the original Supabase Functions error when the response body is not JSON.
        }
        throw new Error(message);
    }
    if (data?.error) {
        throw new Error(data.error);
    }
    return data;
}

export async function fetchSuperAdminManagedUsers() {
    const result = await invokeSuperAdminUsers("list");
    return Array.isArray(result?.users) ? result.users : [];
}

export async function fetchSuperAdminManagedUserDetails(userId) {
    const result = await invokeSuperAdminUsers("get", { userId });
    return result?.details ?? null;
}

export async function createSuperAdminManagedUser(input) {
    const result = await invokeSuperAdminUsers("create", { user: input });
    return result?.user ?? null;
}

export async function updateSuperAdminManagedUser(userId, input) {
    const result = await invokeSuperAdminUsers("update", { userId, updates: input });
    return result?.user ?? null;
}

export async function setSuperAdminManagedUserStatus(userId, status) {
    const result = await invokeSuperAdminUsers("set-status", { userId, status });
    return result?.user ?? null;
}

export async function deleteSuperAdminManagedUser(userId) {
    const result = await invokeSuperAdminUsers("delete", { userId });
    return result?.user ?? null;
}
