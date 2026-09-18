import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import {
  markAsRead,
  markAllAsRead,
  fetchNotifications
} from "../../features/notifications/notificationsSlice";
import { getNotificationPath } from "../../utils/notificationNavigation";
import { formatRelativeDay } from "../../utils/format";
import TopBar from "../../components/ui/TopBar";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/ui/States";

/*
 * Every alert the app has sent this person.
 *
 * Rendered by both shells — /customer/notifications and
 * /company/notifications — which is why the old version was doubly wrong: it
 * drew MobileHeader, customer chrome, inside CompanyLayout, and then drew its
 * own <h1> underneath saying the same word twice.
 *
 * The rows were clickable <div>s, so the entire history was unreachable by
 * keyboard and invisible to a screen reader as anything actionable. They are
 * buttons now. Dates went through a hardcoded en-US formatter pinned to UTC
 * even in Arabic; formatRelativeDay is the one the rest of the app uses, and
 * it says "Today" where a person would.
 */
export default function NotificationHistory() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t, locale } = useI18n();

  const { items, loading, error, hasMore, page, unreadCount } = useAppSelector((state) => state.notifications);
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    dispatch(fetchNotifications({ page: 1 }));
  }, [dispatch]);

  function open(item) {
    if (!item.IsRead) dispatch(markAsRead(item.Id));
    navigate(getNotificationPath(item, user?.roles || []));
  }

  return (
    <div className="pb-8">
      <TopBar
        back
        title={t("notifications")}
        subtitle={t("notifications_sub")}
        actions={
          unreadCount ? (
            <Button variant="ghost" size="sm" onClick={() => dispatch(markAllAsRead())}>
              {t("mark_all_read")}
            </Button>
          ) : null
        }
      />

      <div className="px-4 pt-3">
        {loading && !items.length ? (
          <ListSkeleton count={4} />
        ) : error && !items.length ? (
          <ErrorState message={error} onRetry={() => dispatch(fetchNotifications())} />
        ) : !items.length ? (
          <EmptyState
            icon="bell"
            title={t("notifications_empty_title")}
            description={t("notifications_empty_sub")}
          />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.Id}>
                <button
                  type="button"
                  onClick={() => open(item)}
                  className={`press w-full text-start flex gap-3 p-3.5 rounded-card border ${
                    item.IsRead
                      ? "bg-surface-raised border-line-subtle"
                      : "bg-brand-gold-soft border-brand-gold"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2 w-2 rounded-pill flex-shrink-0 ${
                      item.IsRead ? "bg-transparent" : "bg-brand-gold"
                    }`}
                  />

                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={`text-body truncate ${
                          item.IsRead
                            ? "text-content-secondary"
                            : "font-bold text-content-primary"
                        }`}
                      >
                        {item.Title}
                      </span>
                      <span className="text-caption text-content-muted flex-shrink-0 tnum">
                        {formatRelativeDay(item.CreatedAt, t, locale)}
                      </span>
                    </span>

                    <span className="block mt-0.5 text-body-sm text-content-secondary whitespace-pre-wrap">
                      {item.Message}
                    </span>

                    {/* Screen readers get the state the gold dot conveys. */}
                    {!item.IsRead ? <span className="sr-only">{t("unread")}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {items.length && hasMore ? (
          <div className="pt-3 flex justify-center">
            <Button
              variant="secondary"
              size="sm"
              loading={loading}
              onClick={() => dispatch(fetchNotifications({ page: page + 1 }))}
            >
              {t("load_more")}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
