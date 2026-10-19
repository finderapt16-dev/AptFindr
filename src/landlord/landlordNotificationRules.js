const normalize = (value) => String(value ?? "").trim().toLowerCase().replace(/[ -]+/g, "_");

/** Tenant reports remain in the admin queue until an admin approves them. */
export function isPendingTenantReportNotification(notification) {
  const type = normalize(notification?.type);
  if (type === "report_approved_for_appeal") return false;
  if (["property_reported", "tenant_report_received", "tenant_report_submitted", "new_tenant_report_received"].includes(type)) return true;

  const text = `${notification?.title ?? ""} ${notification?.message ?? ""}`.toLowerCase();
  return /new tenant report received|tenant submitted a report|property report filed/.test(text);
}

export function visibleLandlordNotifications(notifications) {
  const visible = (Array.isArray(notifications) ? notifications : [])
    .filter((notification) => !isPendingTenantReportNotification(notification))
    .sort((a, b) => new Date(b.created_at ?? b.createdAt ?? 0) - new Date(a.created_at ?? a.createdAt ?? 0));
  const kept = [];

  for (const notification of visible) {
    const text = `${notification?.type ?? ""} ${notification?.title ?? ""} ${notification?.message ?? ""}`.toLowerCase();
    const isAppealApproval = /appeal/.test(text) && /approv/.test(text);
    if (!isAppealApproval) {
      kept.push(notification);
      continue;
    }

    const payload = notification.payload ?? {};
    const eventId = String(payload.appeal_id ?? payload.appealId ?? payload.report_id ?? payload.related_report_id ?? notification.action_target_id ?? "");
    const timestamp = new Date(notification.created_at ?? notification.createdAt ?? 0).getTime();
    const duplicateIndex = kept.findIndex((item) => {
      const otherText = `${item?.type ?? ""} ${item?.title ?? ""} ${item?.message ?? ""}`.toLowerCase();
      if (!(/appeal/.test(otherText) && /approv/.test(otherText))) return false;
      const otherPayload = item.payload ?? {};
      const otherId = String(otherPayload.appeal_id ?? otherPayload.appealId ?? otherPayload.report_id ?? otherPayload.related_report_id ?? item.action_target_id ?? "");
      if (eventId && otherId) return eventId === otherId;
      if (eventId !== otherId) return false;

      // Older notifications lack a shared appeal ID. Collapse only the paired
      // generic status + specific approval messages created together.
      const generic = (value) => /appeal_status_updated|appeal status updated/.test(value);
      if (generic(text) === generic(otherText)) return false;
      const otherTimestamp = new Date(item.created_at ?? item.createdAt ?? 0).getTime();
      return Number.isFinite(timestamp) && Number.isFinite(otherTimestamp) && Math.abs(timestamp - otherTimestamp) <= 120_000;
    });

    if (duplicateIndex === -1) kept.push(notification);
  }

  return kept;
}
