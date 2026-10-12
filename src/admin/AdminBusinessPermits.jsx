import { Button } from "@/components/ui/button";
import { fetchBusinessPermitMonitoring, reviewBusinessPermitRenewal } from "@/services/businessPermitRenewalService";
import { AlertTriangle, Building2, CheckCircle2, Clock3, Eye, FileText, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import "./AdminBusinessPermits.css";

const STATUS_FILTERS = ["all", "Valid", "Expiring Soon", "Pending Renewal", "Expired", "Renewed"];

const numberValue = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

const formatDate = (value, withTime = false) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "Asia/Manila",
  }).format(date);
};

const statusClass = (status) => String(status || "unknown").toLowerCase().replace(/\s+/g, "-");

export function AdminBusinessPermits({ onViewLandlord, onViewApartment }) {
  const [data, setData] = useState({ summary: {}, landlordPermits: [], affectedApartments: [], pendingRenewals: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notes, setNotes] = useState({});
  const [reviewingId, setReviewingId] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setData(await fetchBusinessPermitMonitoring());
    } catch (reason) {
      setError(reason.message || "Unable to load business permit monitoring.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredLandlords = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.landlordPermits.filter((row) => {
      const matchesStatus = statusFilter === "all" || row.permit_status === statusFilter;
      const values = [row.landlord_name, row.email, row.business_permit_number, row.permit_status, row.listing_status];
      const matchesQuery = !needle || values.some((value) => String(value ?? "").toLowerCase().includes(needle));
      return matchesStatus && matchesQuery;
    });
  }, [data.landlordPermits, query, statusFilter]);

  const review = async (renewal, decision) => {
    setReviewingId(renewal.renewal_id);
    try {
      await reviewBusinessPermitRenewal({
        renewalId: renewal.renewal_id,
        decision,
        adminNote: notes[renewal.renewal_id] || "",
      });
      toast.success(decision === "approved" ? "Business permit renewal approved" : "Renewal review saved");
      setNotes((current) => ({ ...current, [renewal.renewal_id]: "" }));
      await load(true);
    } catch (reason) {
      toast.error(reason.message || "Unable to review the renewal.");
    } finally {
      setReviewingId("");
    }
  };

  const summary = data.summary || {};
  const summaryCards = [
    { label: "Total Landlords", value: summary.totalLandlords, icon: Building2, tone: "total" },
    { label: "Valid Permits", value: summary.validPermits, icon: CheckCircle2, tone: "valid" },
    { label: "Expiring Soon", value: summary.expiringSoon, icon: Clock3, tone: "soon" },
    { label: "Expired Permits", value: summary.expiredPermits, icon: ShieldAlert, tone: "expired" },
    { label: "Pending Renewals", value: summary.pendingRenewals, icon: AlertTriangle, tone: "pending" },
  ];

  if (loading) {
    return <div className="admin-permits-page"><div className="admin-permits-loading"><RefreshCw aria-hidden="true" />Loading business permit monitoring...</div></div>;
  }

  return (
    <div className="admin-permits-page">
      <header className="admin-permits-header">
        <div>
          <h1>Business Permit Monitoring</h1>
          <p>Monitor annual permit status, renewal submissions, and apartments affected by permit expiration.</p>
        </div>
        <Button variant="outline" onClick={() => void load(true)} disabled={refreshing} className="admin-permits-refresh">
          <RefreshCw aria-hidden="true" className={refreshing ? "is-spinning" : ""} />
          Refresh
        </Button>
      </header>

      {error && <p role="alert" className="admin-permits-error">{error}</p>}

      <section className="admin-permits-summary" aria-label="Business permit summary">
        {summaryCards.map(({ label, value, icon: Icon, tone }) => (
          <button key={label} type="button" className={`admin-permits-stat ${tone}`} onClick={() => setStatusFilter(label === "Total Landlords" ? "all" : label.replace(" Permits", "").replace("Renewals", "Renewal"))}>
            <span><Icon aria-hidden="true" /></span>
            <strong>{numberValue(value)}</strong>
            <small>{label}</small>
          </button>
        ))}
      </section>

      <section className="admin-permits-panel">
        <div className="admin-permits-toolbar">
          <label className="admin-permits-search">
            <Search aria-hidden="true" />
            <input type="search" placeholder="Search landlord, email, permit, or status" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Permit status filter">
            {STATUS_FILTERS.map((status) => <option key={status} value={status}>{status === "all" ? "All statuses" : status}</option>)}
          </select>
        </div>

        <div className="admin-permits-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Landlord</th>
                <th>Permit Number</th>
                <th>Issued</th>
                <th>Expiration</th>
                <th>Status</th>
                <th>Apartments</th>
                <th>Listings</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLandlords.map((row) => (
                <tr key={row.landlord_id}>
                  <td><strong>{row.landlord_name || "Unnamed landlord"}</strong><small>{row.email || "No email"}</small></td>
                  <td>{row.business_permit_number || "-"}</td>
                  <td>{formatDate(row.permit_issued_at)}</td>
                  <td>{formatDate(row.expiration_at, true)}</td>
                  <td><span className={`admin-permits-badge ${statusClass(row.permit_status)}`}>{row.permit_status || "Unknown"}</span></td>
                  <td>{numberValue(row.apartment_count)}</td>
                  <td>{row.listing_status || "-"}</td>
                  <td><Button size="sm" variant="outline" onClick={() => onViewLandlord(row.landlord_id)}><Eye aria-hidden="true" />View</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLandlords.length === 0 && <p className="admin-permits-empty">No landlords match the current filters.</p>}
        </div>
      </section>

      <section className="admin-permits-panel">
        <div className="admin-permits-section-heading">
          <h2>Pending Renewal Review</h2>
          <p>Review submitted business permits before they can satisfy the annual renewal requirement.</p>
        </div>
        {data.pendingRenewals.length === 0 ? <p className="admin-permits-empty">No pending business permit renewals.</p> : (
          <div className="admin-permits-renewal-list">
            {data.pendingRenewals.map((renewal) => (
              <article key={renewal.renewal_id} className="admin-permits-renewal">
                <div>
                  <h3>{renewal.landlord_name || "Unnamed landlord"}</h3>
                  <p>{renewal.email || "No email"} - Permit year {renewal.permit_year}</p>
                </div>
                <dl>
                  <div><dt>Permit</dt><dd>{renewal.permit_number || "-"}</dd></div>
                  <div><dt>Issued</dt><dd>{formatDate(renewal.permit_issued_at)}</dd></div>
                  <div><dt>Submitted</dt><dd>{formatDate(renewal.submitted_at, true)}</dd></div>
                  <div><dt>Expires</dt><dd>{formatDate(renewal.expires_at, true)}</dd></div>
                </dl>
                <div className="admin-permits-renewal-actions">
                  {renewal.documentUrl ? <a href={renewal.documentUrl} target="_blank" rel="noreferrer"><FileText aria-hidden="true" />View document</a> : <span>No document link</span>}
                  <textarea value={notes[renewal.renewal_id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [renewal.renewal_id]: event.target.value }))} placeholder="Admin note for request changes or rejection" />
                  <div>
                    <Button size="sm" onClick={() => void review(renewal, "approved")} disabled={reviewingId === renewal.renewal_id}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => void review(renewal, "requires_changes")} disabled={reviewingId === renewal.renewal_id}>Request Changes</Button>
                    <Button size="sm" variant="destructive" onClick={() => void review(renewal, "rejected")} disabled={reviewingId === renewal.renewal_id}>Reject</Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="admin-permits-panel">
        <div className="admin-permits-section-heading">
          <h2>Apartments Requiring Permit Renewal</h2>
          <p>Listings automatically unpublished because the landlord had no approved permit for the current cycle.</p>
        </div>
        <div className="admin-permits-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Apartment</th>
                <th>Landlord</th>
                <th>Permit Status</th>
                <th>Listing Status</th>
                <th>Reason</th>
                <th>Unpublished</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.affectedApartments.map((row) => (
                <tr key={row.unpublish_id}>
                  <td>{row.apartment_name || "Unnamed apartment"}</td>
                  <td>{row.landlord_name || "Unnamed landlord"}</td>
                  <td><span className="admin-permits-badge expired">{row.permit_status || "Expired"}</span></td>
                  <td>{row.listing_status || "Unpublished"}</td>
                  <td>{row.reason || "Business Permit Expired"}</td>
                  <td>{formatDate(row.unpublished_at, true)}</td>
                  <td><Button size="sm" variant="outline" onClick={() => onViewApartment(row.apartment_id)}><Eye aria-hidden="true" />View</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.affectedApartments.length === 0 && <p className="admin-permits-empty">No apartments are currently restricted by business permit expiration.</p>}
        </div>
      </section>
    </div>
  );
}
