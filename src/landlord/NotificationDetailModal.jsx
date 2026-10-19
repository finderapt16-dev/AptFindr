
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";
import { fetchReportDetails } from "@/services/dashboardSupabaseService";
import "./NotificationDetailModal.css";

// Convert a value to usable text.
const getText = (value) =>
  typeof value === "string" ? value.trim() : "";

// Format dates safely.
const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Exclude the generic tenant report placeholder.
const getActualReportReason = (...values) => {
  for (const value of values) {
    const text = getText(value);

    if (
      text &&
      text.toLowerCase() !== "tenant-submitted problem"
    ) {
      return text;
    }
  }

  return "";
};

export const NotificationDetailModal = ({
  selectedNotificationDetail,
  getAppealMetadata,
  myApartments = [],
  landlordAppeals = [],
  setSelectedNotificationDetail,
  openAppealForNotification,
}) => {
  const {
    notification,
    violation,
    appeal,
  } = selectedNotificationDetail;

  const payload = notification.payload ?? {};

  const appealSource = appeal
    ? getAppealMetadata(appeal, "source")
    : undefined;

  // ==========================================
  // REPORT AND VIOLATION IDENTIFIERS
  // ==========================================

  const reportId = String(
    payload.report_id ??
      payload.related_report_id ??
      violation?.related_report_id ??
      appeal?.report_id ??
      (notification.action_target_type === "report"
        ? notification.action_target_id
        : null) ??
      ""
  );

  const violationId = String(
    payload.violation_id ??
      violation?.id ??
      appeal?.violation_id ??
      ""
  );

  // ==========================================
  // NOTIFICATION TYPES
  // ==========================================

  const isAdministrative = [
    "admin_message",
    "property_reported",
    "report_approved_for_appeal",
    "appeal_evidence_requested",
    "violation_issued",
    "notice_issued",
    "appeal_status_updated",
  ].includes(notification.type);

  const isReportNotification = [
    "property_reported",
    "report_approved_for_appeal",
  ].includes(notification.type);
  const isEvidenceRequest = notification.type === "appeal_evidence_requested";

  // ==========================================
  // FETCH TENANT REPORT FROM SUPABASE
  // ==========================================

  const [reportState, setReportState] = useState({
    reportId: "",
    data: null,
    loading: false,
    error: false,
  });


  useEffect(() => {
    let active = true;

    if (!isReportNotification || !reportId) {
      return undefined;
    }

    const loadReport = async () => {
      setReportState({
        reportId,
        data: null,
        loading: true,
        error: false,
      });

      try {
        // Fetch the report by its unique report ID.
        const data = await fetchReportDetails(reportId);

        if (!active) return;

        setReportState({
          reportId,
          data: data ?? null,
          loading: false,
          error: !data,
        });
      } catch (error) {
        if (!active) return;

        console.error(
          "Failed to load tenant report:",
          error
        );

        setReportState({
          reportId,
          data: null,
          loading: false,
          error: true,
        });
      }
    };

    void loadReport();

    return () => {
      active = false;
    };
  }, [reportId, isReportNotification]);

  // Only use data for the currently selected report.
  const report =
    reportState.reportId === reportId
      ? reportState.data
      : null;

  const reportLoading =
    isReportNotification &&
    Boolean(reportId) &&
    (reportState.reportId !== reportId ||
      reportState.loading);

  const reportError =
    reportState.reportId === reportId &&
    reportState.error;

  // Notifications created by older workflows may only contain the report ID.
  // Once it is loaded, use the linked apartment so the detail card remains
  // complete even when apartment data was omitted from the notification.
  const apartmentId = String(
    payload.apartment_id ??
      violation?.apartment_id ??
      appealSource?.apartment_id ??
      report?.apartment_id ??
      report?.apartmentId ??
      ""
  );

  const apartment = myApartments.find(
    (item) => String(item.id) === apartmentId
  );

  const apartmentTitle = String(
    payload.apartment_title ??
      appealSource?.apartment_title ??
      report?.apartment_title ??
      apartment?.title ??
      "Apartment unavailable"
  );

  const apartmentImage =
    apartment?.image ||
    apartment?.image_url ||
    apartment?.images?.[0] ||
    null;

  const apartmentLocation =
    apartment?.address ||
    apartment?.location ||
    "Location unavailable";

  // ==========================================
  // GET TENANT'S ACTUAL WRITTEN DESCRIPTION
  // ==========================================

  // The tenant's "Describe the Problem"
  // input is saved in the reports.details
  // column through reportForm.details.
  //
  // Use report.details first.
  // Notification payload values are fallbacks.

  const reportedIssue = getActualReportReason(
    report?.details,
    report?.description,
    payload.report_details,
    payload.details,
    payload.report_reason,
    payload.reason,
    payload.issue_type
  );

  // ==========================================
  // REPORT DATE
  // ==========================================

  const reportedAt =
    report?.submitted_at ??
    report?.created_at ??
    payload.report_submitted_at ??
    payload.reported_at ??
    notification.created_at ??
    notification.createdAt;

  const reportDate = formatDate(reportedAt);

  // ==========================================
  // FIND EXISTING APPEAL
  // ==========================================

  const existingAppeal = landlordAppeals.find(
    (item) => {
      const source = getAppealMetadata(
        item,
        "source"
      );

      return (
        (reportId &&
          String(item.report_id ?? "") === reportId) ||
        (violationId &&
          String(item.violation_id ?? "") ===
            violationId) ||
        (!reportId &&
          !violationId &&
          source?.notification_id ===
            notification.id)
      );
    }
  );

  const appealForAction = appeal ?? existingAppeal;

  const needsInformation = appealForAction?.status === "more_evidence_requested";
  const deadline = isEvidenceRequest
    ? appealForAction?.evidence_deadline ?? payload.evidence_deadline
    : report?.appeal_deadline ?? payload.appeal_deadline;
  const deadlineExpired = Boolean(deadline && new Date(deadline).getTime() <= Date.now());
  const canAppeal = notification.type === "report_approved_for_appeal" && !deadlineExpired;

  const hasExistingAppeal = Boolean(
    appealForAction
  );

  // ==========================================
  // BUTTON ACTIONS
  // ==========================================

  const handleClose = () => {
    setSelectedNotificationDetail(null);
  };

  const handleAppeal = () => {
    openAppealForNotification({
      ...selectedNotificationDetail,
      appeal: appealForAction ?? null,
    });
  };

  // ==========================================
  // ADMIN MESSAGE
  // ==========================================

  const adminMessage = isReportNotification
    ? notification.message || (
      notification.type === "property_reported"
        ? `Your apartment "${apartmentTitle}" has been reported. Please review the details and file an appeal if needed.`
        : `An administrator approved a report involving "${apartmentTitle}".`
    )
    : String(
        appeal?.admin_response ??
          payload.admin_response ??
          notification.message ??
          "No message provided."
      );

  // ==========================================
  // RENDER MODAL
  // ==========================================

  return (
    <div
      className={`notification-detail-modal-overlay${isReportNotification ? " is-report" : ""}`}
      onClick={handleClose}
    >
      <div className="notification-detail-modal-overlay-2" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          isReportNotification
            ? notification.type === "report_approved_for_appeal" ? "Report Approved by Admin" : "Apartment Report Filed"
            : notification.title || "Notification"
        }
        className={`notification-detail-modal-card${isReportNotification ? " is-report" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* ==================================
            HEADER
        ================================== */}

        <div className="notification-detail-modal-row">
          <div>
            {!isReportNotification && (
              <p className="notification-detail-modal-administrative-notification">
                {isAdministrative
                  ? "Administrative notification"
                  : "Account notification"}
              </p>
            )}

            <h2 className="notification-detail-modal-heading">
              {isReportNotification
                ? notification.type === "report_approved_for_appeal" ? "Report Approved by Admin" : "Apartment Report Filed"
                : notification.title || "Notification"}
            </h2>
          </div>

          {!isReportNotification && (
            <button
              type="button"
              aria-label="Close notification"
              onClick={handleClose}
              className="notification-detail-modal-button"
            >
              <X className="notification-detail-modal-x-icon" />
            </button>
          )}
        </div>

        {/* ==================================
            MODAL CONTENT
        ================================== */}

        <div className="notification-detail-modal-panel">
          {isReportNotification ? (
            <>
              {/* APARTMENT CARD */}

              <div className="notification-detail-modal-apartment-card">
                {apartmentImage && (
                  <img
                    src={apartmentImage}
                    alt={apartmentTitle}
                  />
                )}

                <div>
                  <strong>{apartmentTitle}</strong>

                  <span>{apartmentLocation}</span>

                  <small>
                    Report · {reportDate}
                  </small>
                </div>
              </div>

              {/* REPORT DETAILS */}

              <section className="notification-detail-modal-report-details">
                <h3>Report Details</h3>

                <dl>
                  {/* TENANT REPORT DESCRIPTION */}

                  <div>
                    <dt>Reported Issue</dt>

                    <dd
                      style={{
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {reportLoading
                        ? "Loading report reason..."
                        : reportedIssue ||
                          (reportError
                            ? "Unable to load the tenant's report reason."
                            : reportId
                            ? "Report reason unavailable."
                            : "This notification is missing its report link.")}
                    </dd>
                  </div>

                  {/* DATE REPORTED */}

                  <div>
                    <dt>Date Reported</dt>

                    <dd>{reportDate}</dd>
                  </div>

                  {notification.type === "report_approved_for_appeal" && (
                    <div>
                      <dt>Appeal Deadline</dt>
                      <dd>{formatDate(deadline)}{deadlineExpired ? " (expired)" : " — you have 7 days to submit an appeal."}</dd>
                    </div>
                  )}
                </dl>
              </section>

            </>
          ) : (
            /* OTHER ADMINISTRATIVE NOTIFICATIONS */

            <div className="notification-detail-modal-grid">
              {isAdministrative && (
                <div className="notification-detail-modal-panel-2">
                  <p className="notification-detail-modal-apartment">
                    Apartment
                  </p>

                  <p className="notification-detail-modal-text">
                    {apartmentTitle}
                  </p>
                </div>
              )}

              <div className="notification-detail-modal-panel-2">
                <p className="notification-detail-modal-date-received">
                  Date received
                </p>

                <p className="notification-detail-modal-text">
                  {new Date(
                    notification.created_at ??
                      notification.createdAt ??
                      Date.now()
                  ).toLocaleString("en-PH")}
                </p>
              </div>

              {isAdministrative && (
                <div className="notification-detail-modal-panel-2">
                  <p className="notification-detail-modal-related-record">
                    Related record
                  </p>

                  <p className="notification-detail-modal-text-2">
                    {violationId
                      ? `${
                          violation?.mode === "notice"
                            ? "Notice"
                            : "Violation"
                        }: ${violationId}`
                      : reportId
                      ? `Report: ${reportId}`
                      : `Message: ${
                          notification.id ??
                          "Unavailable"
                        }`}
                  </p>
                </div>
              )}

              {isAdministrative && (
                <div className="notification-detail-modal-panel-2">
                  <p className="notification-detail-modal-status">
                    Status
                  </p>

                  <p className="notification-detail-modal-text-3">
                    {String(
                      appeal?.status ??
                        existingAppeal?.status ??
                        payload.status ??
                        "open"
                    ).replace(/_/g, " ")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ==================================
              ADMIN MESSAGE
          ================================== */}

          <div>
            <p className="notification-detail-modal-admin-message">
              {isAdministrative
                ? "Admin Message"
                : "Message"}
            </p>

            <p className="notification-detail-modal-text-4">
              {adminMessage}
            </p>
          </div>

          {isEvidenceRequest && (
            <div className="notification-detail-modal-card-2">
              <p className="notification-detail-modal-appeal-status">Additional Evidence Required</p>
              <p className="notification-detail-modal-text-5">{payload.admin_message || appealForAction?.evidence_request_message || notification.message}</p>
              <p className="notification-detail-modal-text-5">Submit before: {formatDate(deadline)}{deadlineExpired ? " (expired)" : ""}</p>
            </div>
          )}

          {/* ==================================
              EXISTING APPEAL STATUS
          ================================== */}

          {hasExistingAppeal && (
            <div className="notification-detail-modal-card-2">
              <p className="notification-detail-modal-appeal-status">
                Appeal status:{" "}
                {String(
                  appealForAction?.status ?? "pending"
                ).replace(/_/g, " ")}
              </p>

              {appealForAction?.admin_response && (
                <p className="notification-detail-modal-text-5">
                  {appealForAction.admin_response}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ==================================
            FOOTER BUTTONS
        ================================== */}

        <div className="notification-detail-modal-content">
          <Button
            variant="outline"
            onClick={handleClose}
            className="notification-detail-modal-close"
          >
            Close
          </Button>

          {(canAppeal || (needsInformation && !deadlineExpired)) && (
            <Button
              disabled={
                hasExistingAppeal &&
                !needsInformation
              }
              onClick={handleAppeal}
              className="notification-detail-modal-button-2"
            >
              <MessageSquare className="notification-detail-modal-message-square-icon" />

              {needsInformation
                ? "Submit Additional Evidence"
                : hasExistingAppeal
                ? "Appeal Submitted"
                : isReportNotification
                ? "File an Appeal"
                : "Submit Appeal"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
