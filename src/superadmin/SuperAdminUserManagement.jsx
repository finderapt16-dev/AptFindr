import { Button } from "@/components/ui/button";
import { fetchUsers as fetchDashboardUsers } from "@/services/dashboardSupabaseService";
import {
    createSuperAdminManagedUser,
    deleteSuperAdminManagedUser,
    fetchSuperAdminManagedUserDetails,
    fetchSuperAdminManagedUsers,
    getManagedUserInitials,
    getManagedUserRoleLabel,
    getManagedUserStatusLabel,
    isManageableAccountRole,
    isManagedUserInactive,
    normalizeManagedRole,
    subscribeToManagedUserRealtime,
    setSuperAdminManagedUserStatus,
    summarizeManagedUsers,
    updateSuperAdminManagedUser,
} from "@/services/superAdminUserService";
import {
    Building2,
    ChevronLeft,
    ChevronRight,
    Eye,
    Loader2,
    Pencil,
    Plus,
    Power,
    RefreshCw,
    Search,
    Shield,
    Trash2,
    User,
    Users,
    X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import "./SuperAdminUserManagement.css";

const PAGE_SIZE = 8;
const ROLE_FILTERS = [
    { label: "All", value: "all" },
    { label: "Admin", value: "admin" },
    { label: "Landlord", value: "landlord" },
    { label: "Tenant", value: "tenant" },
];

const EMPTY_FORM = {
    name: "",
    email: "",
    mobile: "",
    role: "tenant",
    status: "active",
    password: "",
};

const roleTone = (role) => `is-${normalizeManagedRole(role)}`;
const statusTone = (user) => isManagedUserInactive(user?.status) ? "is-inactive" : "is-active";

function normalizeFormValue(value) {
    return String(value ?? "").trim();
}

function UserFormModal({ mode, form, setForm, saving, onClose, onSubmit }) {
    const isCreate = mode === "create";
    const title = isCreate ? "Add User" : "Edit User";
    return (
        <div className="super-admin-users-modal-backdrop" role="presentation">
            <section className="super-admin-users-modal" role="dialog" aria-modal="true" aria-labelledby="super-admin-user-form-title">
                <button type="button" className="super-admin-users-modal-close" onClick={onClose} disabled={saving} aria-label="Close user form">
                    <X aria-hidden="true" />
                </button>
                <header>
                    <h2 id="super-admin-user-form-title">{title}</h2>
                    <p>{isCreate ? "Create an internal AptFindr account without exposing backend secrets." : "Update permitted profile and account fields."}</p>
                </header>
                <form onSubmit={onSubmit} className="super-admin-users-form">
                    <label>
                        <span>Full Name</span>
                        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required placeholder="Juan Dela Cruz" />
                    </label>
                    <label>
                        <span>Email Address</span>
                        <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required placeholder="user@example.com" />
                    </label>
                    <label>
                        <span>Role</span>
                        <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} disabled={!isCreate}>
                            <option value="admin">Admin</option>
                            <option value="landlord">Landlord</option>
                            <option value="tenant">Tenant</option>
                        </select>
                    </label>
                    <label>
                        <span>Contact Number</span>
                        <input value={form.mobile} onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))} placeholder="Optional" />
                    </label>
                    {!isCreate && (
                        <label>
                            <span>Account Status</span>
                            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                                <option value="active">Active</option>
                                <option value="disabled">Inactive</option>
                            </select>
                        </label>
                    )}
                    {isCreate && (
                        <label className="super-admin-users-form-wide">
                            <span>Temporary Password</span>
                            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required minLength={8} placeholder="Minimum 8 characters" />
                        </label>
                    )}
                    <p className="super-admin-users-form-note">Passwords are sent only to Supabase Auth for account creation and are never stored in AptFindr tables.</p>
                    <footer>
                        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? <Loader2 className="super-admin-users-spin" aria-hidden="true" /> : null}
                            {saving ? "Saving..." : isCreate ? "Create User" : "Save Changes"}
                        </Button>
                    </footer>
                </form>
            </section>
        </div>
    );
}

function DetailModal({ details, loading, onClose }) {
    const user = details?.user;
    const dependencies = details?.dependencyCounts ?? {};
    const profile = details?.adminProfile ?? details?.landlordProfile ?? details?.tenantProfile ?? null;
    return (
        <div className="super-admin-users-modal-backdrop" role="presentation">
            <section className="super-admin-users-modal super-admin-users-details" role="dialog" aria-modal="true" aria-labelledby="super-admin-user-details-title">
                <button type="button" className="super-admin-users-modal-close" onClick={onClose} aria-label="Close user details">
                    <X aria-hidden="true" />
                </button>
                <header>
                    <h2 id="super-admin-user-details-title">Account Details</h2>
                    <p>Read-only view of the selected account and related records.</p>
                </header>
                {loading ? (
                    <div className="super-admin-users-loading-inline"><Loader2 className="super-admin-users-spin" />Loading account details...</div>
                ) : user ? (
                    <div className="super-admin-users-detail-grid">
                        <div><span>Name</span><strong>{user.name || "Not provided"}</strong></div>
                        <div><span>Email</span><strong>{user.email || "Not provided"}</strong></div>
                        <div><span>Role</span><strong>{getManagedUserRoleLabel(user)}</strong></div>
                        <div><span>Status</span><strong>{getManagedUserStatusLabel(user)}</strong></div>
                        <div><span>Contact</span><strong>{user.mobile || user.mobileNumber || "Not provided"}</strong></div>
                        <div><span>Created</span><strong>{user.created_at ? new Date(user.created_at).toLocaleString("en-PH") : "Not available"}</strong></div>
                        {profile && <div className="super-admin-users-detail-wide"><span>Profile Row</span><code>{JSON.stringify(profile, null, 2)}</code></div>}
                        <div className="super-admin-users-detail-wide">
                            <span>Related Records</span>
                            <ul>
                                <li>Apartment listings: {dependencies.apartments ?? 0}</li>
                                <li>Reports: {dependencies.reports ?? 0}</li>
                                <li>Appeals: {dependencies.appeals ?? 0}</li>
                                <li>Favorites: {dependencies.favorites ?? 0}</li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <p className="super-admin-users-empty">The account could not be loaded.</p>
                )}
            </section>
        </div>
    );
}

function ConfirmModal({ action, saving, onCancel, onConfirm }) {
    if (!action)
        return null;
    const isDelete = action.type === "delete";
    const isDeactivate = action.type === "deactivate";
    const title = isDelete ? "Soft delete this account?" : isDeactivate ? "Deactivate this account?" : "Reactivate this account?";
    const message = isDelete
        ? "This keeps historical apartments, reports, appeals, and audit records, but marks the account inactive and blocks access."
        : isDeactivate
            ? "The user will lose authorized access. Existing records are preserved."
            : "The user will regain access if their credentials are valid.";
    return (
        <div className="super-admin-users-modal-backdrop" role="presentation">
            <section className="super-admin-users-modal super-admin-users-confirm" role="dialog" aria-modal="true" aria-labelledby="super-admin-confirm-title">
                <header>
                    <h2 id="super-admin-confirm-title">{title}</h2>
                    <p>{message}</p>
                </header>
                <div className="super-admin-users-confirm-subject">
                    <span className={`super-admin-users-avatar ${roleTone(action.user.role)}`}>{getManagedUserInitials(action.user)}</span>
                    <span><strong>{action.user.name || "Unnamed account"}</strong><small>{action.user.email}</small></span>
                </div>
                <footer>
                    <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
                    <Button type="button" onClick={onConfirm} disabled={saving} className={isDelete ? "super-admin-users-danger-button" : ""}>
                        {saving ? <Loader2 className="super-admin-users-spin" aria-hidden="true" /> : null}
                        {saving ? "Working..." : isDelete ? "Delete Safely" : isDeactivate ? "Deactivate" : "Reactivate"}
                    </Button>
                </footer>
            </section>
        </div>
    );
}

export function SuperAdminUserManagement({ currentUser, onUsersChanged }) {
    const realtimeRefreshRef = useRef({ timer: null, latestPayload: null });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [readOnlyFallback, setReadOnlyFallback] = useState(false);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [formMode, setFormMode] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [details, setDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    const loadUsers = useCallback(async ({ silent = false } = {}) => {
        if (!silent)
            setLoading(true);
        setError("");
        setReadOnlyFallback(false);
        try {
            const loadedUsers = await fetchSuperAdminManagedUsers();
            setUsers(loadedUsers);
        }
        catch (loadError) {
            console.error("Unable to load super admin user management:", loadError);
            try {
                const fallbackUsers = await fetchDashboardUsers();
                setUsers(fallbackUsers.filter((account) => ["admin", "super_admin", "landlord", "tenant"].includes(String(account.role ?? "").trim().toLowerCase())));
                setReadOnlyFallback(true);
                setError("Secure user-management service is not deployed yet. Showing existing accounts in view-only mode.");
            }
            catch (fallbackError) {
                console.error("Unable to load fallback user list:", fallbackError);
                setError(loadError instanceof Error ? loadError.message : "Unable to load user accounts.");
            }
        }
        finally {
            if (!silent)
                setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    const handleRealtimeAccountChange = useCallback((payload) => {
        realtimeRefreshRef.current.latestPayload = payload;
        if (realtimeRefreshRef.current.timer)
            window.clearTimeout(realtimeRefreshRef.current.timer);
        realtimeRefreshRef.current.timer = window.setTimeout(() => {
            const latestPayload = realtimeRefreshRef.current.latestPayload;
            realtimeRefreshRef.current.timer = null;
            realtimeRefreshRef.current.latestPayload = null;
            void loadUsers({ silent: true }).then(() => onUsersChanged?.());
            const changedUser = latestPayload?.new ?? latestPayload?.old ?? {};
            if (latestPayload?.eventType === "INSERT" && isManageableAccountRole(changedUser.role)) {
                const roleLabel = getManagedUserRoleLabel(changedUser);
                const accountLabel = changedUser.name || changedUser.email || "New account";
                toast.info(`${roleLabel} account added: ${accountLabel}`);
            }
        }, 500);
    }, [loadUsers, onUsersChanged]);

    useEffect(() => {
        const unsubscribe = subscribeToManagedUserRealtime({
            onAccountChange: handleRealtimeAccountChange,
            onSubscriptionStatus: (status) => {
                if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
                    console.warn("Super admin user realtime subscription issue:", status);
            },
        });
        const refreshOnFocus = () => { void loadUsers({ silent: true }); };
        const refreshOnVisibility = () => {
            if (document.visibilityState === "visible")
                void loadUsers({ silent: true });
        };
        window.addEventListener("focus", refreshOnFocus);
        window.addEventListener("online", refreshOnFocus);
        document.addEventListener("visibilitychange", refreshOnVisibility);
        return () => {
            if (realtimeRefreshRef.current.timer)
                window.clearTimeout(realtimeRefreshRef.current.timer);
            window.removeEventListener("focus", refreshOnFocus);
            window.removeEventListener("online", refreshOnFocus);
            document.removeEventListener("visibilitychange", refreshOnVisibility);
            unsubscribe();
        };
    }, [handleRealtimeAccountChange, loadUsers]);

    useEffect(() => {
        setPage(1);
    }, [search, roleFilter]);

    const summary = useMemo(() => summarizeManagedUsers(users), [users]);
    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();
        return users.filter((managedUser) => {
            const roleGroup = normalizeManagedRole(managedUser.role);
            const matchesRole = roleFilter === "all" || roleGroup === roleFilter;
            const searchable = `${managedUser.name ?? ""} ${managedUser.email ?? ""}`.toLowerCase();
            return matchesRole && (!query || searchable.includes(query));
        });
    }, [users, search, roleFilter]);
    const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const visibleUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const showingFrom = filteredUsers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const showingTo = Math.min(currentPage * PAGE_SIZE, filteredUsers.length);

    const replaceUser = (updatedUser) => {
        if (!updatedUser)
            return;
        setUsers((current) => current.map((managedUser) => managedUser.id === updatedUser.id ? updatedUser : managedUser));
    };

    const closeForm = () => {
        if (saving)
            return;
        setFormMode(null);
        setForm(EMPTY_FORM);
    };

    const openCreate = () => {
        if (readOnlyFallback) {
            toast.error("Deploy the secure user-management Edge Function before creating accounts.");
            return;
        }
        setForm(EMPTY_FORM);
        setFormMode("create");
    };

    const openEdit = (managedUser) => {
        if (readOnlyFallback) {
            toast.error("Deploy the secure user-management Edge Function before editing accounts.");
            return;
        }
        setForm({
            name: managedUser.name ?? "",
            email: managedUser.email ?? "",
            mobile: managedUser.mobile ?? managedUser.mobileNumber ?? "",
            role: normalizeManagedRole(managedUser.role),
            status: isManagedUserInactive(managedUser.status) ? "disabled" : "active",
            password: "",
        });
        setFormMode({ type: "edit", user: managedUser });
    };

    const submitForm = async (event) => {
        event.preventDefault();
        const payload = {
            name: normalizeFormValue(form.name),
            email: normalizeFormValue(form.email),
            mobile: normalizeFormValue(form.mobile),
            status: form.status === "disabled" ? "disabled" : "active",
        };
        setSaving(true);
        try {
            if (formMode === "create") {
                const created = await createSuperAdminManagedUser({ ...payload, role: normalizeManagedRole(form.role), password: form.password });
                if (created)
                    setUsers((current) => [created, ...current]);
                toast.success("User account created.");
            }
            else if (formMode?.type === "edit") {
                const updated = await updateSuperAdminManagedUser(formMode.user.id, payload);
                replaceUser(updated);
                toast.success("User account updated.");
            }
            await onUsersChanged?.();
            setFormMode(null);
            setForm(EMPTY_FORM);
        }
        catch (saveError) {
            toast.error(saveError instanceof Error ? saveError.message : "Unable to save the account.");
        }
        finally {
            setSaving(false);
        }
    };

    const viewDetails = async (managedUser) => {
        setDetails({ user: managedUser });
        if (readOnlyFallback) {
            setDetailsLoading(false);
            return;
        }
        setDetailsLoading(true);
        try {
            const loadedDetails = await fetchSuperAdminManagedUserDetails(managedUser.id);
            setDetails(loadedDetails ?? { user: managedUser });
        }
        catch (detailError) {
            toast.error(detailError instanceof Error ? detailError.message : "Unable to load account details.");
            setDetails({ user: managedUser });
        }
        finally {
            setDetailsLoading(false);
        }
    };

    const requestStatusAction = (managedUser) => {
        if (readOnlyFallback) {
            toast.error("Deploy the secure user-management Edge Function before changing account status.");
            return;
        }
        if (managedUser.id === currentUser?.id) {
            toast.error("You cannot change your own access from this screen.");
            return;
        }
        setConfirmAction({ type: isManagedUserInactive(managedUser.status) ? "reactivate" : "deactivate", user: managedUser });
    };

    const requestDelete = (managedUser) => {
        if (readOnlyFallback) {
            toast.error("Deploy the secure user-management Edge Function before deleting accounts.");
            return;
        }
        if (managedUser.id === currentUser?.id) {
            toast.error("You cannot delete your own account.");
            return;
        }
        setConfirmAction({ type: "delete", user: managedUser });
    };

    const runConfirmedAction = async () => {
        if (!confirmAction)
            return;
        setSaving(true);
        try {
            const updated = confirmAction.type === "delete"
                ? await deleteSuperAdminManagedUser(confirmAction.user.id)
                : await setSuperAdminManagedUserStatus(confirmAction.user.id, confirmAction.type === "reactivate" ? "active" : "disabled");
            replaceUser(updated);
            await onUsersChanged?.();
            toast.success(confirmAction.type === "delete" ? "Account safely deleted." : "Account status updated.");
            setConfirmAction(null);
        }
        catch (actionError) {
            toast.error(actionError instanceof Error ? actionError.message : "Unable to update the account.");
        }
        finally {
            setSaving(false);
        }
    };

    const statCards = [
        { label: "Admins", value: summary.admin, note: "System administrators", icon: User, tone: "admin" },
        { label: "Landlords", value: summary.landlord, note: "Property owners", icon: Building2, tone: "landlord" },
        { label: "Tenants", value: summary.tenant, note: "Registered tenants", icon: Users, tone: "tenant" },
    ];

    return (
        <main className="super-admin-users">
            <header className="super-admin-users-header">
                <div>
                    <h1>User Management</h1>
                    <p>Manage Admin, Landlord, and Tenant accounts.</p>
                </div>
                <Button type="button" onClick={() => void loadUsers()} variant="outline" disabled={loading} className="super-admin-users-refresh">
                    <RefreshCw className={loading ? "super-admin-users-spin" : ""} aria-hidden="true" />
                    Refresh
                </Button>
            </header>

            <section className="super-admin-users-stats" aria-label="User totals">
                {statCards.map(({ label, value, note, icon: Icon, tone }) => (
                    <article key={label} className="super-admin-users-stat">
                        <span className={`super-admin-users-stat-icon is-${tone}`}><Icon aria-hidden="true" /></span>
                        <span><strong>{value}</strong><small>{label}</small><em>{note}</em></span>
                    </article>
                ))}
            </section>

            <section className="super-admin-users-toolbar" aria-label="User search and filters">
                <label className="super-admin-users-search">
                    <Search aria-hidden="true" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email..." aria-label="Search name or email" />
                </label>
                <div className="super-admin-users-filters" role="group" aria-label="Role filters">
                    {ROLE_FILTERS.map((filter) => (
                        <button key={filter.value} type="button" aria-pressed={roleFilter === filter.value} onClick={() => setRoleFilter(filter.value)}>
                            {filter.label}
                        </button>
                    ))}
                </div>
                <Button type="button" onClick={openCreate} disabled={readOnlyFallback} title={readOnlyFallback ? "Deploy the secure user-management Edge Function to enable account creation." : "Add user"} className="super-admin-users-add"><Plus aria-hidden="true" />Add User</Button>
            </section>

            <section className="super-admin-users-table-card">
                {error && <div className={readOnlyFallback ? "super-admin-users-warning" : "super-admin-users-error"} role="alert">{error}</div>}
                {loading ? (
                    <div className="super-admin-users-loading"><Loader2 className="super-admin-users-spin" />Loading user accounts...</div>
                ) : (
                    <div className="super-admin-users-table-wrap">
                        <table className="super-admin-users-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleUsers.map((managedUser) => (
                                    <tr key={managedUser.id ?? managedUser.email}>
                                        <td>
                                            <span className={`super-admin-users-avatar ${roleTone(managedUser.role)}`}>{getManagedUserInitials(managedUser)}</span>
                                            <strong>{managedUser.name || "Unnamed account"}</strong>
                                        </td>
                                        <td>{managedUser.email || "No email"}</td>
                                        <td><span className={`super-admin-users-role ${roleTone(managedUser.role)}`}>{getManagedUserRoleLabel(managedUser)}</span></td>
                                        <td><span className={`super-admin-users-status ${statusTone(managedUser)}`}>{getManagedUserStatusLabel(managedUser)}</span></td>
                                        <td>
                                            <div className="super-admin-users-actions">
                                                <button type="button" title="View details" aria-label={`View details for ${managedUser.name || managedUser.email}`} onClick={() => void viewDetails(managedUser)}><Eye aria-hidden="true" /></button>
                                                <button type="button" title={readOnlyFallback ? "Secure function required" : "Edit user"} aria-label={`Edit ${managedUser.name || managedUser.email}`} onClick={() => openEdit(managedUser)} disabled={readOnlyFallback}><Pencil aria-hidden="true" /></button>
                                                <button type="button" title={readOnlyFallback ? "Secure function required" : isManagedUserInactive(managedUser.status) ? "Reactivate user" : "Deactivate user"} aria-label={isManagedUserInactive(managedUser.status) ? `Reactivate ${managedUser.name || managedUser.email}` : `Deactivate ${managedUser.name || managedUser.email}`} onClick={() => requestStatusAction(managedUser)} disabled={readOnlyFallback || managedUser.id === currentUser?.id}><Power aria-hidden="true" /></button>
                                                <button type="button" title={readOnlyFallback ? "Secure function required" : "Delete user safely"} aria-label={`Delete ${managedUser.name || managedUser.email}`} onClick={() => requestDelete(managedUser)} disabled={readOnlyFallback || managedUser.id === currentUser?.id} className="is-danger"><Trash2 aria-hidden="true" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {visibleUsers.length === 0 && (
                                    <tr><td colSpan="5" className="super-admin-users-empty">No user accounts match your filters.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                <footer className="super-admin-users-pagination">
                    <span>Showing {showingFrom}-{showingTo} of {filteredUsers.length} users</span>
                    <nav aria-label="User pages">
                        <button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft aria-hidden="true" /></button>
                        {Array.from({ length: pageCount }, (_, index) => index + 1).filter((number) => number === 1 || number === pageCount || Math.abs(number - currentPage) <= 1).map((number, index, pages) => (
                            <span key={number}>
                                {index > 0 && number - pages[index - 1] > 1 && <small>...</small>}
                                <button type="button" aria-label={`Page ${number}`} aria-current={number === currentPage ? "page" : undefined} onClick={() => setPage(number)}>{number}</button>
                            </span>
                        ))}
                        <button type="button" aria-label="Next page" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight aria-hidden="true" /></button>
                    </nav>
                </footer>
            </section>

            {formMode && <UserFormModal mode={formMode === "create" ? "create" : "edit"} form={form} setForm={setForm} saving={saving} onClose={closeForm} onSubmit={submitForm} />}
            {details && <DetailModal details={details} loading={detailsLoading} onClose={() => setDetails(null)} />}
            <ConfirmModal action={confirmAction} saving={saving} onCancel={() => !saving && setConfirmAction(null)} onConfirm={() => void runConfirmedAction()} />
        </main>
    );
}
