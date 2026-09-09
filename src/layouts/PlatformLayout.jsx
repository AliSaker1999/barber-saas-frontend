import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { logout } from "../features/auth/authSlice";
import Icon from "../components/ui/Icon";
import { IconButton } from "../components/ui/Button";
import { ConfirmSheet } from "../components/ui/BottomSheet";
import { OfflineBanner } from "../components/ui/States";
import { useI18n } from "../i18n";
import { getInitialTheme, setTheme } from "../utils/theme";

/*
 * Platform (internal) shell.
 *
 * A desktop-first internal tool, so unlike the customer and shop apps it keeps
 * a sidebar — but on the semantic tokens rather than raw white/gray/blue, and
 * with real icons instead of the emoji the nav labels used to carry (spec §23:
 * emoji render differently on every Android OEM and can't take a theme colour).
 */

const NAV = [
  { to: "tenants", labelKey: "nav_shops", icon: "pin" },
  { to: "customers", labelKey: "nav_customers", icon: "users" },
  { to: "reports", labelKey: "nav_reports", icon: "chart" },
  { to: "activity-log", labelKey: "activity_log", icon: "list" },
  { to: "env", labelKey: "environment", icon: "settings" }
];

export default function PlatformLayout() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isOnline = useAppSelector((state) => state.ui.isOnline);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [theme, setThemeState] = useState(() => getInitialTheme());

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  };

  const closeDrawer = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-surface-base lg:flex">
      {/* ---- sidebar ---- */}
      <aside
        className={`fixed inset-y-0 start-0 z-40 w-64 bg-surface-raised border-e border-line-subtle
                    transition-transform duration-[var(--dur-slow)] ease-out
                    lg:translate-x-0 lg:static lg:flex lg:flex-col ${
                      mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
                    }`}
      >
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-line-subtle pt-[env(safe-area-inset-top)]">
          <span className="w-9 h-9 rounded-control bg-surface-inverse text-brand-gold flex items-center justify-center flex-shrink-0">
            <Icon name="scissors" size={19} />
          </span>
          <div className="min-w-0">
            <p className="text-h3 text-content-primary leading-tight">{t("app_name")}</p>
            <p className="text-label uppercase text-content-muted">{t("platform_admin")}</p>
          </div>
        </div>

        <nav aria-label="Main" className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeDrawer}
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
              <span className="truncate">{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-line-subtle pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <button
            type="button"
            onClick={() => {
              closeDrawer();
              setLogoutOpen(true);
            }}
            className="w-full flex items-center gap-3 px-3 h-11 rounded-control text-body-sm font-semibold text-state-danger hover:bg-state-danger-soft"
          >
            <Icon name="logout" size={18} />
            {t("logout")}
          </button>
        </div>
      </aside>

      {/* ---- main ---- */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-surface-base/95 backdrop-blur-lg border-b border-line-subtle pt-[env(safe-area-inset-top)]">
          <div className="h-14 px-3 lg:px-6 flex items-center gap-2">
            <span className="lg:hidden">
              <IconButton
                icon={mobileOpen ? "x" : "list"}
                label={t("nav_more")}
                onClick={() => setMobileOpen((open) => !open)}
              />
            </span>

            <h1 className="flex-1 text-h3 text-content-primary truncate">
              {t("platform_dashboard")}
            </h1>

            <span
              className={`hidden sm:inline-flex items-center gap-1.5 text-caption font-semibold ${
                isOnline ? "text-state-success" : "text-state-danger"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-pill ${
                  isOnline ? "bg-state-success" : "bg-state-danger"
                }`}
              />
              {isOnline ? t("online") : t("offline_title")}
            </span>

            <IconButton
              icon={theme === "dark" ? "moon" : "sun"}
              label={t("appearance")}
              onClick={toggleTheme}
            />
          </div>
        </header>

        {!isOnline ? (
          <div className="px-4 pt-3">
            <OfflineBanner />
          </div>
        ) : null}

        <main className="flex-1 p-4 lg:p-6 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* ---- drawer scrim ---- */}
      {mobileOpen ? (
        <button
          type="button"
          aria-label={t("close")}
          onClick={closeDrawer}
          className="fixed inset-0 z-30 lg:hidden animate-fade-in"
          style={{ background: "var(--scrim)" }}
        />
      ) : null}

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
