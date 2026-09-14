import { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { logout } from "../features/auth/authSlice";
import BottomNavigation from "../components/ui/BottomNavigation";
import BottomSheet, { ConfirmSheet } from "../components/ui/BottomSheet";
import Icon from "../components/ui/Icon";
import { IconButton } from "../components/ui/Button";
import { Avatar, Row, RowGroup } from "../components/ui/Primitives";
import { OfflineBanner } from "../components/ui/States";
import { useI18n } from "../i18n";
import { setTheme, getInitialTheme } from "../utils/theme";

/*
 * Shop shell.
 *
 * The owner and barber apps used to open into a desktop sidebar drawer on a
 * phone, with an 11-item menu and a seven-item tab bar that included a
 * hamburger and a theme toggle (spec §15: "Do NOT use a desktop-style sidebar
 * on mobile").
 *
 * Now both roles open onto Today and get a tab bar sized to their job:
 *   owner   Today · Calendar · Team · Customers · More
 *   barber  Today · Queue · Schedule · Profile
 *
 * Everything that used to be a tab and isn't one now lives in the "More"
 * sheet, which is a list, not a second navigation system. The sidebar is
 * desktop-only.
 */

const OWNER_MORE = [
  /* Permanent, not just while the shop is unfinished: after setup it reads as
     a health check ("is anything stopping customers booking?"), which is the
     same question. */
  { to: "/company/setup", labelKey: "setup_title", icon: "sparkle" },
  { to: "/company/services", labelKey: "manage_services", icon: "scissors" },
  { to: "/company/customers", labelKey: "nav_customers", icon: "users" },
  { to: "/company/share", labelKey: "share_booking_title", icon: "qr" },
  { to: "/company/promotions", labelKey: "promotions", icon: "tag" },
  { to: "/company/reports", labelKey: "nav_reports", icon: "chart" },
  { to: "/company/conversations", labelKey: "conversations", icon: "message" },
  { to: "/company/notifications", labelKey: "notifications", icon: "bell" },
  { to: "/company/profile", labelKey: "shop_info", icon: "pin" },
  { to: "/company/settings", labelKey: "nav_settings", icon: "settings" }
];

const BARBER_MORE = [
  { to: "/company/reports", labelKey: "nav_reports", icon: "chart" },
  { to: "/company/conversations", labelKey: "conversations", icon: "message" },
  { to: "/company/notifications", labelKey: "notifications", icon: "bell" }
];

export default function CompanyLayout() {
  const { t, locale, switchLanguage } = useI18n();
  const user = useAppSelector((state) => state.auth.user);
  const isOnline = useAppSelector((state) => state.ui.isOnline);
  const lastSyncAt = useAppSelector((state) => state.ui.lastSyncAt);
  const unread = useAppSelector(
    (state) => state.notifications.items?.filter((n) => !n.IsRead).length || 0
  );

  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const isOwner = Boolean(user?.roles?.includes("ADMIN"));
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [theme, setThemeState] = useState(() => getInitialTheme());

  const tabs = useMemo(() => {
    if (isOwner) {
      return [
        { to: "/company/today", icon: "home", label: t("nav_today") },
        { to: "/company/appointments", icon: "calendar", label: t("nav_calendar") },
        { to: "/company/queue", icon: "clock", label: t("live_queue") },
        { to: "/company/barbers", icon: "users", label: t("nav_team") },
        { to: "__more", icon: "more", label: t("nav_more") }
      ];
    }

    /* A barber's day is their chair: current customer, queue, schedule. */
    return [
      { to: "/company/today", icon: "home", label: t("nav_today") },
      { to: "/company/queue", icon: "clock", label: t("live_queue") },
      { to: "/company/appointments", icon: "calendar", label: t("nav_calendar") },
      { to: "/company/my-profile", icon: "user", label: t("my_profile") }
    ];
  }, [isOwner, t]);

  /* The "More" tab opens a sheet rather than navigating anywhere. */
  const navItems = tabs.map((tab) =>
    tab.to === "__more"
      ? { ...tab, to: "/company/today#more", onClick: () => setMoreOpen(true) }
      : tab
  );

  const lastSyncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const moreItems = isOwner ? OWNER_MORE : BARBER_MORE;

  const applyTheme = (next) => {
    setTheme(next);
    setThemeState(next);
  };

  return (
    <div className="min-h-screen bg-surface-base flex flex-col lg:flex-row">
      {/* ---- desktop sidebar ---- */}
      <aside className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 border-e border-line-subtle bg-surface-raised">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-line-subtle">
          <span className="w-9 h-9 rounded-control bg-surface-inverse text-brand-gold flex items-center justify-center">
            <Icon name="scissors" size={19} />
          </span>
          <div className="min-w-0">
            <p className="text-h3 text-content-primary leading-tight">{t("app_name")}</p>
            <p className="text-label uppercase text-content-muted">
              {isOwner ? t("dashboard") : t("my_profile")}
            </p>
          </div>
        </div>

        <nav aria-label="Main" className="flex-1 overflow-y-auto p-3 space-y-1">
          {tabs
            .filter((tab) => tab.to !== "__more")
            .concat(moreItems.map((item) => ({ ...item, label: t(item.labelKey) })))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 px-3 h-11 rounded-control text-body-sm font-semibold transition-colors",
                    isActive
                      ? "bg-brand-gold-soft text-brand-gold-text"
                      : "text-content-secondary hover:bg-surface-sunken"
                  ].join(" ")
                }
              >
                <Icon name={item.icon} size={18} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
        </nav>

        <div className="p-3 border-t border-line-subtle">
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="w-full flex items-center gap-3 px-3 h-11 rounded-control text-body-sm font-semibold text-state-danger hover:bg-state-danger-soft"
          >
            <Icon name="logout" size={18} />
            {t("logout")}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* ---- mobile top strip: identity + notifications only.
                Screens own their own titles. ---- */}
        <header className="lg:hidden sticky top-0 z-40 bg-surface-base/95 backdrop-blur-lg border-b border-line-subtle pt-[env(safe-area-inset-top)]">
          <div className="h-12 flex items-center gap-2 px-3">
            <span className="w-7 h-7 rounded-[9px] bg-surface-inverse text-brand-gold flex items-center justify-center flex-shrink-0">
              <Icon name="scissors" size={15} />
            </span>
            <span className="flex-1 text-body-sm font-bold text-content-primary truncate">
              {user?.fullName?.split(" ")[0] || t("app_name")}
            </span>
            <IconButton
              to="/company/notifications"
              icon="bell"
              label={t("notifications")}
              badge={unread > 0 ? unread : null}
            />
            <IconButton icon="more" label={t("nav_more")} onClick={() => setMoreOpen(true)} />
          </div>
        </header>

        {!isOnline ? (
          <div className="px-4 pt-3">
            <OfflineBanner lastSyncLabel={lastSyncLabel} />
          </div>
        ) : null}

        <main className="flex-1 pb-[calc(theme(spacing.navbar)+env(safe-area-inset-bottom))] lg:pb-10">
          <div className="max-w-4xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNavigation items={navItems} />

      {/* ---- More ---- */}
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t("nav_more")}>
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={user?.fullName} size={44} />
            <div className="min-w-0">
              <p className="text-body font-bold text-content-primary truncate">{user?.fullName}</p>
              <p className="text-caption text-content-muted">
                {isOwner ? t("dashboard") : t("nav_barbers")}
              </p>
            </div>
          </div>

          <RowGroup>
            {moreItems.map((item) => (
              <Row
                key={item.to}
                icon={item.icon}
                label={t(item.labelKey)}
                to={item.to}
                onClick={() => setMoreOpen(false)}
              />
            ))}
          </RowGroup>

          <RowGroup title={t("group_settings")}>
            <Row
              icon="globe"
              label={t("language_label")}
              value={locale === "ar" ? "العربية" : "English"}
              onClick={() => switchLanguage(locale === "ar" ? "en" : "ar")}
              chevron={false}
            />
            <Row
              icon={theme === "dark" ? "moon" : "sun"}
              label={t("appearance")}
              value={theme === "dark" ? t("theme_dark") : t("theme_light")}
              onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
              chevron={false}
            />
          </RowGroup>

          <RowGroup>
            <Row
              icon="logout"
              label={t("logout")}
              tone="danger"
              chevron={false}
              onClick={() => {
                setMoreOpen(false);
                setLogoutOpen(true);
              }}
            />
          </RowGroup>
        </div>
      </BottomSheet>

      <ConfirmSheet
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => {
          dispatch(logout());
          navigate("/login", { replace: true });
        }}
        destructive={false}
        title={t("logout_title")}
        message={t("logout_message")}
        confirmLabel={t("logout")}
        cancelLabel={t("cancel")}
      />
    </div>
  );
}
