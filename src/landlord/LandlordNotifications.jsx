import "./LandlordNotifications.css";
import { CheckCheck, Clock, MoreHorizontal } from "lucide-react";

const isRead = (notification) => (notification.read ?? notification.is_read) === true;

function relativeTime(value) {
  if (!value) return "Recently";
  const difference = Date.now() - new Date(value).getTime();
  if (Number.isNaN(difference)) return "Recently";
  const minutes = Math.max(0, Math.round(difference / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export const LandlordNotifications = ({
  notifications,
  notifCategory,
  isMarkingAllNotifs,
  markAllLandlordNotificationsRead,
  setNotifCategory,
  isLoadingNotifications,
  handleNotificationClick,
  setOpenNotifMenuId,
  openNotifMenuId,
  toggleNotifReadStatus,
  deletingNotifId,
  deleteNotif,
}) => {
  const unreadCount = notifications.filter((notification) => !isRead(notification)).length;
  const showingUnread = notifCategory === "unread";
  const visibleNotifications = [...notifications]
    .filter((notification) => !showingUnread || !isRead(notification))
    .sort((left, right) => new Date(right.created_at ?? right.createdAt ?? 0) - new Date(left.created_at ?? left.createdAt ?? 0));

  return (
    <div className="landlord-notifications">
      <header className="landlord-notifications__header">
        <h1>Notifications</h1>
        <p>Stay informed of new applications, reports, and account updates.</p>
      </header>

      <section className="landlord-notifications__panel" aria-label="Notifications">
        <div className="landlord-notifications__toolbar">
          <div className="landlord-notifications__tabs" role="tablist" aria-label="Notification filters">
            <button type="button" role="tab" aria-selected={!showingUnread} className={!showingUnread ? "is-active" : ""} onClick={() => setNotifCategory("all")}>All</button>
            <button type="button" role="tab" aria-selected={showingUnread} className={showingUnread ? "is-active" : ""} onClick={() => setNotifCategory("unread")}>Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}</button>
          </div>
          <button type="button" className="landlord-notifications__mark-read" disabled={!unreadCount || isMarkingAllNotifs} onClick={() => void markAllLandlordNotificationsRead()}>
            <CheckCheck aria-hidden="true" />
            {isMarkingAllNotifs ? "Marking..." : "Mark all as read"}
          </button>
        </div>

        <div className="landlord-notifications__list">
          {isLoadingNotifications ? (
            <div className="landlord-notifications__empty"><Clock aria-hidden="true" /> Loading notifications...</div>
          ) : visibleNotifications.length ? (
            visibleNotifications.map((notification, index) => {
              const unread = !isRead(notification);
              const notificationId = notification.id ?? `notification-${index}`;
              const menuIsOpen = notification.id && openNotifMenuId === notification.id;
              return (
                <article key={notificationId} className={`landlord-notification ${unread ? "is-unread" : ""} ${menuIsOpen ? "is-menu-open" : ""}`}>
                  <button
                    type="button"
                    className="landlord-notification__open"
                    aria-label={`Open notification: ${notification.title || notification.type || "Notification"}`}
                    onClick={() => void handleNotificationClick(notification)}
                  >
                    <span className="landlord-notification__body"><span>{notification.title || notification.type || "Notification"}</span><span>{notification.message || "You have a new account update."}</span></span>
                    <time dateTime={notification.created_at ?? notification.createdAt}>{relativeTime(notification.created_at ?? notification.createdAt)}</time>
                  </button>
                  {notification.id ? (
                    <div className="landlord-notification__actions">
                      <button
                        type="button"
                        className="landlord-notification__more"
                        aria-label="Notification actions"
                        aria-expanded={menuIsOpen}
                        onClick={() => setOpenNotifMenuId(menuIsOpen ? null : notification.id)}
                      >
                        <MoreHorizontal aria-hidden="true" />
                      </button>
                      {menuIsOpen && (
                        <div className="landlord-notification__menu" role="menu">
                          <button type="button" role="menuitem" onClick={() => void toggleNotifReadStatus(notification.id, unread ? false : true)}>{unread ? "Mark as read" : "Mark as unread"}</button>
                          <button type="button" role="menuitem" className="is-delete" disabled={deletingNotifId === notification.id} onClick={() => void deleteNotif(notification.id)}>{deletingNotifId === notification.id ? "Deleting..." : "Delete"}</button>
                        </div>
                      )}
                    </div>
                  ) : <span />}
                </article>
              );
            })
          ) : (
            <div className="landlord-notifications__empty"><strong>{showingUnread ? "No unread notifications" : "You're all caught up"}</strong><span>New updates about your properties will appear here.</span></div>
          )}
        </div>
      </section>
    </div>
  );
};
