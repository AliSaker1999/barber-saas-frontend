import { useEffect, useMemo } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { findMyActiveQueue } from "../features/queue/queueSlice";
import BottomNavigation from "../components/ui/BottomNavigation";
import Icon from "../components/ui/Icon";
import { OfflineBanner } from "../components/ui/States";
import { useI18n } from "../i18n";
import support from "../config/support";

/*
 * Customer app shell.
 *
 * Five destinations, no more (spec §6). Messages, notifications, favourites and
 * stats used to sit in this bar; they are contextual now — notifications live
 * in the Home header, messages inside a booking, favourites inside Profile.
 *
 * Screens render their own TopBar, because a shop profile needs a transparent
 * bar over its hero photo while Bookings needs a solid one. The shell only
 * owns navigation, the offline banner, and reserving room for the bar.
 */
export default function CustomerLayout() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const isOnline = useAppSelector((state) => state.ui.isOnline);
  const lastSyncAt = useAppSelector((state) => state.ui.lastSyncAt);
  const activeQueue = useAppSelector((state) => state.queue.activeQueue);
  const unreadCount = useAppSelector(
    (state) => state.notifications.items?.filter((n) => !n.IsRead).length || 0
  );

  /* The Queue tab needs to know whether the customer is in a queue right now,
     from any screen — it is the one tab whose meaning changes with state. */
  useEffect(() => {
    dispatch(findMyActiveQueue());
  }, [dispatch]);

  const navItems = useMemo(
    () => [
      { to: "/customer", icon: "home", label: t("nav_shops"), end: true },
      { to: "/customer/explore", icon: "search", label: t("explore_title") },
      { to: "/customer/bookings", icon: "calendar", label: t("bookings_title") },
      {
        to: "/customer/queue",
        icon: "clock",
        label: t("nav_queue"),
        badge: activeQueue ? 1 : 0
      },
      { to: "/customer/profile", icon: "user", label: t("profile_title") }
    ],
    [t, activeQueue]
  );

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncAt) return null;
    return new Date(lastSyncAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [lastSyncAt]);

  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      {/* Desktop navigation. The phone is the primary target, so this is a
          single row of the same five destinations rather than a sidebar. */}
      <header className="hidden lg:block sticky top-0 z-40 bg-surface-base/95 backdrop-blur-lg border-b border-line-subtle">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-6">
          <Link to="/customer" className="flex items-center gap-2 flex-shrink-0">
            <span className="w-9 h-9 rounded-control bg-surface-inverse text-brand-gold flex items-center justify-center">
              <Icon name="scissors" size={19} />
            </span>
            <span className="text-h2 text-content-primary">{t("app_name")}</span>
          </Link>

          <nav aria-label="Main" className="flex items-center gap-1 flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    "inline-flex items-center gap-2 h-10 px-3.5 rounded-control text-body-sm font-semibold transition-colors",
                    isActive
                      ? "bg-brand-gold-soft text-brand-gold-text"
                      : "text-content-secondary hover:bg-surface-sunken"
                  ].join(" ")
                }
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <Link
            to="/customer/notifications"
            aria-label={t("notifications")}
            className="tap-target relative flex items-center justify-center rounded-control text-content-secondary hover:bg-surface-sunken"
          >
            <Icon name="bell" size={20} />
            {unreadCount > 0 ? (
              <span className="absolute top-2 end-2 min-w-[16px] h-4 px-1 rounded-pill bg-state-danger text-white text-[10px] font-bold leading-4 text-center tnum">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>
        </div>
      </header>

      {!isOnline ? (
        <div className="px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] lg:pt-3">
          <div className="max-w-6xl mx-auto">
            <OfflineBanner lastSyncLabel={lastSyncLabel} />
          </div>
        </div>
      ) : null}

      {/* pb clears the bottom bar plus the device's home indicator. */}
      <main className="flex-1 pb-[calc(theme(spacing.navbar)+env(safe-area-inset-bottom))] lg:pb-10">
        <div className="max-w-6xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      <footer className="hidden lg:block border-t border-line-subtle mt-10">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-caption text-content-muted">{t("copyright")}</p>
          <nav className="flex flex-wrap gap-5 text-caption font-semibold text-content-secondary">
            <Link to="/privacy" className="hover:text-brand-gold-text">
              {t("privacy_policy")}
            </Link>
            <Link to="/terms" className="hover:text-brand-gold-text">
              {t("terms_of_service")}
            </Link>
            {/* Rendered only when a real number is configured. */}
            {support.phoneHref ? (
              <a href={support.phoneHref} className="hover:text-brand-gold-text">
                {t("call_support")}
              </a>
            ) : null}
            {support.whatsappHref ? (
              <a
                href={support.whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="hover:text-brand-gold-text"
              >
                {t("whatsapp_support")}
              </a>
            ) : null}
          </nav>
        </div>
      </footer>

      <BottomNavigation items={navItems} />
    </div>
  );
}
