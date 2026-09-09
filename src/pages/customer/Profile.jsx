import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchMyProfile, updateMyProfile } from "../../features/auth/customerProfileSlice";
import { fetchFavorites } from "../../features/favorites/favoritesSlice";
import { fetchCustomerAppointments } from "../../features/appointments/appointmentsSlice";
import { logout } from "../../features/auth/authSlice";
import api from "../../services/api";

import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import BottomSheet, { ConfirmSheet } from "../../components/ui/BottomSheet";
import PhoneVerificationModal from "../../components/PhoneVerificationModal";
import { Avatar, Pill, Row, RowGroup } from "../../components/ui/Primitives";
import { Skeleton } from "../../components/ui/States";
import { useI18n } from "../../i18n";
import { getInitialTheme, setTheme } from "../../utils/theme";
import { isCompleted } from "../../utils/appointmentStatus";
import support from "../../config/support";

/*
 * Profile (spec §14) — grouped rows, nothing else.
 *
 * This screen is a directory, so it is built from one Row primitive rather
 * than a dozen bespoke cards. The groups are fixed: Account, Personal,
 * Settings, Support, Privacy & legal.
 *
 * Account deletion and data export sit in the last group and both really work
 * — Google Play will not accept an app that holds an account without an
 * in-app route to delete it.
 */

export default function Profile() {
  const { t, locale, switchLanguage } = useI18n();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const user = useAppSelector((state) => state.auth.user);
  const { profile, loading } = useAppSelector((state) => state.customerProfile);
  const favorites = useAppSelector((state) => state.favorites.items);
  const appointments = useAppSelector((state) => state.appointments.items);

  const [theme, setThemeState] = useState(() => getInitialTheme());
  const [editOpen, setEditOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(params.get("verify") === "1");
  const [form, setForm] = useState({ fullName: "", email: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchMyProfile());
    dispatch(fetchFavorites());
    dispatch(fetchCustomerAppointments());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      setForm({ fullName: profile.FullName || "", email: profile.Email || "" });
    }
  }, [profile]);

  /* The verify sheet can be deep-linked to from the walk-in flow; drop the
     flag once it has been honoured so a refresh doesn't reopen it. */
  useEffect(() => {
    if (params.get("verify") !== "1") return;
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("verify");
        return next;
      },
      { replace: true }
    );
  }, [params, setParams]);

  const visits = useMemo(() => appointments.filter(isCompleted).length, [appointments]);
  const favouriteCount = favorites.length;

  const applyTheme = (next) => {
    setTheme(next);
    setThemeState(next);
    setThemeOpen(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await dispatch(
        updateMyProfile({ fullName: form.fullName.trim(), email: form.email.trim() || undefined })
      ).unwrap();
      await dispatch(fetchMyProfile());
      setEditOpen(false);
      toast.success(t("profile_updated"));
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const res = await api.get("/customers/me/export", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "ajmal-my-data.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(err?.friendlyMessage || t("error_generic"));
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete("/customers/me");
      dispatch(logout());
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err?.friendlyMessage || t("error_generic"));
      setDeleting(false);
    }
  };

  const themeLabel =
    theme === "dark" ? t("theme_dark") : theme === "light" ? t("theme_light") : t("theme_system");

  return (
    <div className="pb-6">
      <TopBar title={t("profile_title")} />

      {/* ---- identity ---- */}
      <header className="px-4 pt-1">
        <div className="flex items-center gap-3.5">
          {loading && !profile ? (
            <Skeleton className="w-16 h-16" rounded="rounded-pill" />
          ) : (
            <Avatar src={profile?.ProfileImage} name={profile?.FullName || user?.fullName} size={64} />
          )}

          <div className="flex-1 min-w-0">
            <h2 className="text-h1 text-content-primary truncate">
              {profile?.FullName || user?.fullName || "—"}
            </h2>
            <p className="text-body-sm text-content-muted truncate tnum">
              {profile?.PhoneNumber || user?.phoneNumber || profile?.Email || ""}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              {user?.isPhoneVerified ? (
                <Pill tone="success" icon="verified">
                  {t("verified")}
                </Pill>
              ) : (
                <button type="button" onClick={() => setVerifyOpen(true)}>
                  <Pill tone="warning" icon="alert">
                    {t("verify_phone_title")}
                  </Pill>
                </button>
              )}
              {visits > 0 ? <Pill>{t("visits_count", { n: visits })}</Pill> : null}
            </div>
          </div>

          <Button variant="secondary" size="sm" icon="edit" onClick={() => setEditOpen(true)}>
            {t("edit")}
          </Button>
        </div>
      </header>

      <div className="px-4 mt-6 space-y-5">
        {/* ---- personal ---- */}
        <RowGroup title={t("group_personal")}>
          <Row
            icon="heart"
            label={t("favorites")}
            to="/customer/favorites"
            value={favouriteCount ? String(favouriteCount) : undefined}
          />
          <Row icon="gift" label={t("loyalty_program")} to="/customer/loyalty" />
          <Row icon="chart" label={t("nav_stats")} to="/customer/reports" />
          <Row icon="message" label={t("conversations")} to="/customer/conversations" />
          <Row icon="bell" label={t("notifications")} to="/customer/notifications" />
        </RowGroup>

        {/* ---- settings ---- */}
        <RowGroup title={t("group_settings")}>
          <Row
            icon="globe"
            label={t("language_label")}
            value={locale === "ar" ? "العربية" : "English"}
            onClick={() => setLangOpen(true)}
          />
          <Row
            icon={theme === "dark" ? "moon" : "sun"}
            label={t("appearance")}
            value={themeLabel}
            onClick={() => setThemeOpen(true)}
          />
          <Row
            icon="phone"
            label={t("phone_number")}
            value={user?.isPhoneVerified ? t("verified") : t("not_set")}
            onClick={() => setVerifyOpen(true)}
          />
        </RowGroup>

        {/* ---- support ---- */}
        <RowGroup title={t("group_support")}>
          {support.helpUrl ? (
            <Row icon="help" label={t("help_centre")} onClick={() => window.open(support.helpUrl, "_blank")} />
          ) : null}

          {support.isConfigured ? (
            <>
              {support.whatsappHref ? (
                <Row
                  icon="whatsapp"
                  label={t("whatsapp_support")}
                  onClick={() => window.open(support.whatsappHref, "_blank")}
                />
              ) : null}
              {support.phoneHref ? (
                <Row
                  icon="phone"
                  label={t("call_support")}
                  value={support.phone}
                  onClick={() => window.open(support.phoneHref, "_self")}
                />
              ) : null}
              {support.emailHref ? (
                <Row
                  icon="message"
                  label={t("contact_support")}
                  value={support.email}
                  onClick={() => window.open(support.emailHref, "_self")}
                />
              ) : null}
            </>
          ) : (
            /* No dead links: when nothing is configured the screen says so
               rather than offering a number that rings nowhere. */
            <div className="px-4 py-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-control bg-surface-sunken text-content-muted flex items-center justify-center flex-shrink-0">
                <Icon name="help" size={18} />
              </span>
              <p className="text-body-sm text-content-muted">{t("support_unavailable")}</p>
            </div>
          )}
        </RowGroup>

        {/* ---- privacy & legal ---- */}
        <RowGroup title={t("group_legal")}>
          <Row
            icon="lock"
            label={t("privacy_policy")}
            onClick={() =>
              support.privacyUrl ? window.open(support.privacyUrl, "_blank") : navigate("/privacy")
            }
          />
          <Row
            icon="info"
            label={t("terms_of_service")}
            onClick={() =>
              support.termsUrl ? window.open(support.termsUrl, "_blank") : navigate("/terms")
            }
          />
          <Row
            icon="share"
            label={exporting ? t("processing") : t("export_data")}
            onClick={exportData}
            chevron={false}
          />
          <Row
            icon="trash"
            label={t("delete_account")}
            tone="danger"
            onClick={() => setDeleteOpen(true)}
            chevron={false}
          />
        </RowGroup>

        <Button variant="secondary" block icon="logout" onClick={() => setLogoutOpen(true)}>
          {t("logout")}
        </Button>

        <p className="text-caption text-content-muted text-center">{t("copyright")}</p>
      </div>

      {/* ---- sheets ---- */}
      <BottomSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t("edit_profile")}
        footer={
          <Button block loading={saving} disabled={!form.fullName.trim()} onClick={saveProfile}>
            {t("save")}
          </Button>
        }
      >
        <div className="space-y-3.5">
          <label className="block">
            <span className="block text-label uppercase text-content-muted mb-1.5">
              {t("full_name")}
            </span>
            <input
              value={form.fullName}
              onChange={(event) => setForm((f) => ({ ...f, fullName: event.target.value }))}
              className="w-full h-12 px-3.5 rounded-control bg-surface-raised border border-line-subtle
                         text-body text-content-primary focus:border-brand-gold focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="block text-label uppercase text-content-muted mb-1.5">
              {t("email")} <span className="normal-case font-normal">({t("optional")})</span>
            </span>
            <input
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(event) => setForm((f) => ({ ...f, email: event.target.value }))}
              className="w-full h-12 px-3.5 rounded-control bg-surface-raised border border-line-subtle
                         text-body text-content-primary focus:border-brand-gold focus:outline-none"
            />
          </label>

          <p className="text-caption text-content-muted">
            {t("phone_number")}: <span className="tnum">{profile?.PhoneNumber || t("not_set")}</span>
          </p>
        </div>
      </BottomSheet>

      <BottomSheet open={langOpen} onClose={() => setLangOpen(false)} title={t("language_label")}>
        <ul className="divide-y divide-line-subtle -mx-1">
          {[
            { id: "en", label: "English", note: "Left to right" },
            { id: "ar", label: "العربية", note: "من اليمين إلى اليسار" }
          ].map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => {
                  switchLanguage(option.id);
                  setLangOpen(false);
                }}
                className="w-full min-h-[56px] flex items-center gap-3 px-1 text-start"
              >
                <span className="flex-1">
                  <span className="block text-body text-content-primary">{option.label}</span>
                  <span className="block text-caption text-content-muted">{option.note}</span>
                </span>
                {locale === option.id ? (
                  <Icon name="check" size={18} className="text-brand-gold-text" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>

      <BottomSheet open={themeOpen} onClose={() => setThemeOpen(false)} title={t("appearance")}>
        <ul className="divide-y divide-line-subtle -mx-1">
          {[
            { id: "light", label: t("theme_light"), icon: "sun" },
            { id: "dark", label: t("theme_dark"), icon: "moon" }
          ].map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => applyTheme(option.id)}
                className="w-full min-h-[56px] flex items-center gap-3 px-1 text-start"
              >
                <Icon name={option.icon} size={18} className="text-content-secondary" />
                <span className="flex-1 text-body text-content-primary">{option.label}</span>
                {theme === option.id ? (
                  <Icon name="check" size={18} className="text-brand-gold-text" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>

      <ConfirmSheet
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => {
          dispatch(logout());
          navigate("/login", { replace: true });
        }}
        title={t("logout_title")}
        message={t("logout_message")}
        confirmLabel={t("logout")}
        cancelLabel={t("cancel")}
        destructive={false}
      />

      <ConfirmSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteAccount}
        loading={deleting}
        title={t("delete_account")}
        message={t("cannot_undo")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        detail={t("export_data")}
      />

      <PhoneVerificationModal isOpen={verifyOpen} onClose={() => setVerifyOpen(false)} />
    </div>
  );
}
