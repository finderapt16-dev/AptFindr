import { formatPermitDate } from "@/utils/businessPermitStatus";
import "@/styles/businessPermitStatus.css";

export function BusinessPermitStatus({ status, compact = false }) {
    return <div className={`business-permit-status ${compact ? "business-permit-status--compact" : ""}`}>
        <span className={`business-permit-status__badge business-permit-status__badge--${status.tone}`}>{status.label}</span>
        {status.inGracePeriod && <strong className="business-permit-status__grace">{status.graceLabel}</strong>}
        <dl className="business-permit-status__details">
            <div><dt>Permit expiration</dt><dd>{formatPermitDate(status.expirationDate, true)}</dd></div>
            <div><dt>Renewal</dt><dd>{status.renewalLabel}</dd></div>
            {status.graceDeadline !== null && !status.approvedRenewal && <div><dt>Renewal approval deadline</dt><dd>{formatPermitDate(status.graceDeadline, true)} (Philippine time)</dd></div>}
            {status.expired && status.listingsUnpublished && <div><dt>Listings</dt><dd>Unpublished</dd></div>}
        </dl>
    </div>;
}

export function PermitGraceNotice({ status }) {
    if (status.approvedRenewal) return status.listingsUnpublished
        ? <p className="business-permit-status__notice">Your renewed permit is approved. Listings remain unpublished until the existing review and publishing process is completed.</p> : null;
    if (!status.inGracePeriod) return null;
    return <aside className="business-permit-status__notice" aria-label="Business Permit Grace Period">
        <strong>Business Permit Grace Period</strong>
        <p>Your business permit expired on December 31. You have until January 31 at 11:59 PM to renew your business permit. Your apartment listings will remain published during the grace period. If your renewal is not approved, your listings will automatically be unpublished on February 1.</p>
        {status.renewalStatus && <p>Renewal: {status.renewalLabel}. The January 31 approval deadline still applies.</p>}
        {status.listingsUnpublished && <p>Listings already unpublished will remain unpublished until the existing review and publishing process is completed.</p>}
    </aside>;
}
