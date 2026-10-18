const normalize = (value) => String(value ?? "").trim().toLowerCase().replaceAll("-", "_");

export function isSupportNotification(notification) {
    const payload = notification?.payload ?? {};
    return ["support_request", "support_ticket", "contact_support"].includes(normalize(notification?.type))
        || Boolean(payload.ticket_id || payload.support_ticket_id)
        || ["support", "support_request", "support_ticket"].includes(normalize(notification?.action_target_type));
}

export function getSupportTicketId(notification) {
    if (!isSupportNotification(notification)) return "";
    return String(notification?.payload?.ticket_id || notification?.payload?.support_ticket_id || notification?.action_target_id || "");
}

export function filterStaffNotifications(notifications, role) {
    const rows = Array.isArray(notifications) ? notifications : [];
    return normalize(role) === "super_admin" ? rows : rows.filter((notification) => !isSupportNotification(notification));
}
