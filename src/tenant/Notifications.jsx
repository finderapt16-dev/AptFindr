import { Bell, Check, MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { notificationKind, relativeTime, reportIdOf, resolveActionUrl } from "@/tenant/notificationPresentation";
export function Notifications({ state }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { notifications, unreadCount, loading, markRead, markUnread, markAllRead, remove } = state;
    const [filter, setFilter] = useState("all");
    const [menuId, setMenuId] = useState(null);
    const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const listRef = useRef(null);
    const visible = useMemo(() => filter === "unread" ? notifications.filter((item) => item.read !== true) : notifications, [filter, notifications]);
    useEffect(() => {
        const reportId = new URLSearchParams(location.search).get("reportId");
        if (!reportId || (selectedReport && reportIdOf(selectedReport) === reportId))
            return;
        const reportNotification = notifications.find((item) => notificationKind(item) === "report" && reportIdOf(item) === reportId);
        if (!reportNotification)
            return;
        setSelectedReport(reportNotification);
        if (reportNotification.id && reportNotification.read !== true)
            void markRead(reportNotification.id);
    }, [location.search, markRead, notifications, selectedReport]);
    useEffect(() => {
        if (!menuId)
            return;
        const closeMenu = () => setMenuId(null);
        const closeOnEscape = (event) => {
            if (event.key === "Escape")
                closeMenu();
        };
        const closeOnOutsideClick = (event) => {
            if (!listRef.current?.contains(event.target))
                closeMenu();
        };
        document.addEventListener("click", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("click", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [menuId]);
    const openNotification = async (item) => {
        if (item.id && item.read !== true && !await markRead(item.id))
            toast.error("Notification could not be marked as read.");
        if (notificationKind(item) === "report") {
            setSelectedReport(item);
            return;
        }
        const actionUrl = resolveActionUrl(item);
        if (actionUrl)
            navigate(actionUrl, { state: { returnTo: "/tenant/dashboard?section=notifications", backLabel: "Back to Notifications" } });
    };
    const handleMarkAllRead = async () => {
        if (isMarkingAllRead || unreadCount === 0)
            return;
        setIsMarkingAllRead(true);
        try {
            if (await markAllRead())
                toast.success("All notifications marked as read.");
            else
                toast.error("Notifications could not be marked as read.");
        }
        finally {
            setIsMarkingAllRead(false);
        }
    };
    return <div className="tenant-notifications-container">
    <section className="tenant-notifications-section">
      <div className="tenant-notifications-panel"><h1 className="tenant-notifications-notifications">Notifications</h1><p className="tenant-notifications-text">Stay updated on your reports and apartment activity.</p></div>
    </section>

    <section className="tenant-notifications-section-2">
      <div className="tenant-notifications-row">
        <div className="tenant-notifications-notification-filter" role="tablist" aria-label="Notification filter">
          {["all", "unread"].map((value) => <button key={value} role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`tenant-notifications-button ${filter === value ? "tenant-notifications-button-2" : "tenant-notifications-button-3"}`}>{value}{value === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}</button>)}
        </div>
        <Button variant="outline" disabled={unreadCount === 0 || isMarkingAllRead || loading} onClick={() => void handleMarkAllRead()} className="tenant-notifications-mark-all-as-read"><Check className="tenant-notifications-check-icon"/>{isMarkingAllRead ? "Marking..." : "Mark all as read"}</Button>
      </div>

      {loading ? <div className="tenant-notifications-panel-2">{[1, 2, 3].map((item) => <div key={item} className="tenant-notifications-panel-3"/>)}</div> : visible.length === 0 ? <div className="tenant-notifications-content"><span className="tenant-notifications-row-2"><Bell className="tenant-notifications-bell-icon-2"/></span><h2 className="tenant-notifications-you-re-all-caught-up">You're all caught up!</h2><p className="tenant-notifications-text-2">Updates about your reports and apartment activity will appear here.</p></div> : <div className="tenant-notifications-panel-4" ref={listRef}>{visible.map((item) => {
                return <article key={item.id} className={`tenant-notifications-article ${item.read !== true ? "tenant-notifications-article-2" : "tenant-notifications-article-3"}`}>
          <button onClick={() => void openNotification(item)} className="tenant-notifications-button-4"><span className="tenant-notifications-row-4"><strong className="tenant-notifications-strong">{item.title || "AptFindr update"}</strong>{item.read !== true && <span className="tenant-notifications-unread" aria-label="Unread"/>}</span><span className="tenant-notifications-span-4">{item.message || "You have a new update."}</span><time className="tenant-notifications-time" dateTime={item.created_at ?? undefined}>{relativeTime(item.created_at ?? item.createdAt)}</time></button>
          <div className="tenant-notifications-panel-5"><button aria-label="Notification options" aria-expanded={menuId === item.id} onClick={(event) => { event.stopPropagation(); setMenuId(menuId === item.id ? null : item.id ?? null); }} className="tenant-notifications-notification-options"><MoreVertical className="tenant-notifications-more-vertical-icon"/></button>{menuId === item.id && <div className="tenant-notifications-card"><button onClick={async (event) => { event.stopPropagation(); if (item.id)
                    await (item.read === true ? markUnread(item.id) : markRead(item.id)); setMenuId(null); }} className="tenant-notifications-mark-as"><Check className="tenant-notifications-check-icon-2"/>Mark as {item.read === true ? "unread" : "read"}</button><button onClick={async (event) => { event.stopPropagation(); if (item.id && await remove(item.id))
                    toast.success("Notification removed.");
                else
                    toast.error("Notification could not be removed."); setMenuId(null); }} className="tenant-notifications-remove"><Trash2 className="tenant-notifications-trash2-icon"/>Remove</button></div>}</div>
        </article>;
            })}</div>}
    </section>

    {selectedReport && <section className="tenant-notifications-section-3" aria-live="polite"><div className="tenant-notifications-row-5"><div><p className="tenant-notifications-my-report-status">My report status</p><h2 className="tenant-notifications-heading">{selectedReport.title || "Report update"}</h2><p className="tenant-notifications-text-3">{selectedReport.message}</p><p className="tenant-notifications-updated">Updated {relativeTime(selectedReport.created_at ?? selectedReport.createdAt)}</p></div><button onClick={() => setSelectedReport(null)} className="tenant-notifications-close">Close</button></div></section>}
  </div>;
}
