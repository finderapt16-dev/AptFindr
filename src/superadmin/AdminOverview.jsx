import "./AdminOverview.css";
import { useEffect, useState } from "react";
import { Building2, UserRound, FileText, Gavel } from "lucide-react";
import { fetchRecentActivityLogs } from "@/services/dashboardSupabaseService";
import { formatAuditLogForDisplay, safeNotificationText } from "@/utils/auditLogDisplay";

export function AdminOverview({ apartments, landlords, reports, appeals, onNavigate }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetchRecentActivityLogs(30).then((items) => { if (active) setLogs(items); }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const stats = [
    { label: "Total Apartments", count: apartments.length, note: "All apartment listings", icon: Building2, tone: "apartments", section: "apartments" },
    { label: "Total Landlords", count: landlords.length, note: "Registered accounts", icon: UserRound, tone: "landlords", section: "landlords" },
    { label: "Reports", count: reports.length, note: "Submitted by tenants", icon: FileText, tone: "reports", section: "reports" },
    { label: "Appeals", count: appeals.length, note: "Submitted by landlords", icon: Gavel, tone: "appeals", section: "appeals" },
  ];
  const events = logs.map((log) => {
    const target = String(log.target_id ?? "");
    const type = String(log.target_type ?? "").toLowerCase();
    const related = type.includes("apartment") || type.includes("property")
      ? apartments.find((item) => String(item.id) === target)?.title
      : landlords.find((item) => String(item.id) === target)?.name;
    return { id: `log-${log.id}`, date: log.created_at, type: type.includes("property") ? "Apartment" : type === "user" ? "Landlord" : type.replace(/_/g, " ") || "Administration", description: formatAuditLogForDisplay(log).title, related: related || "Administration", status: "Recorded" };
  });
  const addSubmission = (items, type, description, getRelated, getStatus) => items.forEach((item) => {
    const date = item.submittedAt ?? item.submitted_at ?? item.createdAt ?? item.created_at;
    if (date) events.push({ id: `${type}-${item.id}`, date, type, description, related: getRelated(item), status: getStatus(item) });
  });
  addSubmission(landlords, "Landlord", "New landlord registered", (item) => item.name, (item) => item.isVerified || item.is_verified ? "Verified" : "Pending Review");
  addSubmission(apartments, "Apartment", "New apartment submitted", (item) => item.title, (item) => item.isPublished || item.is_published ? "Published" : "Pending Review");
  addSubmission(reports, "Report", "Report submitted", (item) => item.apartment_title ?? item.apartment ?? apartments.find((apartment) => String(apartment.id) === String(item.apartmentId ?? item.apartment_id))?.title, (item) => item.status === "pending" ? "Pending Review" : item.status || "Pending Review");
  addSubmission(appeals, "Appeal", "Appeal submitted", (item) => landlords.find((landlord) => String(landlord.id) === String(item.landlord_id))?.name, (item) => item.status === "pending" ? "Pending Review" : item.status || "Pending Review");
  const recent = events.filter((event) => Number.isFinite(new Date(event.date).getTime())).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  return <div className="admin-overview-reference">
    <header><h1>Dashboard</h1><p>Overview of aptfindr administration.</p></header>
    <section className="admin-overview-stats" aria-label="Administration totals">{stats.map(({ label, count, note, icon: Icon, tone, section }) => <button key={label} type="button" onClick={() => onNavigate(section)}><span className={`admin-overview-stat-icon is-${tone}`}><Icon aria-hidden="true"/></span><span><strong>{count}<br/>{label}</strong><small>{note}</small></span></button>)}</section>
    <section className="admin-overview-activities"><h2>Recent Activities</h2><p>Recent Activities</p><div className="admin-overview-table-wrap"><table><thead><tr>{["Date", "Time", "Type", "Description", "Related To", "Status"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{recent.map((event) => <tr key={event.id}><td>{new Date(event.date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td><td>{new Date(event.date).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</td><td className="admin-overview-type">{event.type}</td><td>{event.description}</td><td>{safeNotificationText(event.related, "Not provided")}</td><td><span className={`admin-overview-status ${/verified|approved|resolved|published/i.test(event.status) ? "is-success" : /reject|dismiss/i.test(event.status) ? "is-closed" : /pending|review/i.test(event.status) ? "is-pending" : "is-recorded"}`}>{event.status.replace(/_/g, " ")}</span></td></tr>)}{recent.length === 0 && <tr><td colSpan={6} className="admin-overview-empty">{loading ? "Loading recent activities..." : "No activity recorded yet."}</td></tr>}</tbody></table></div></section>
  </div>;
}
