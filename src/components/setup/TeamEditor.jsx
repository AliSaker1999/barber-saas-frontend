import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import { fetchBarbers, createBarber, toggleAvailability } from "../../features/barbers/barbersSlice";
import Button from "../ui/Button";
import Field from "../ui/Field";
import { Card, SectionHeader, Pill, Avatar, Toggle } from "../ui/Primitives";
import { ConfirmSheet } from "../ui/BottomSheet";
import { EmptyState, ErrorState, ListSkeleton } from "../ui/States";

/*
 * The shop's barbers.
 *
 * `mode` follows the same contract as the other editors: `setup` adds people
 * and gets out of the way, `manage` also exposes the per-barber switches.
 *
 * Adding yourself is the first option rather than an error you trip over. The
 * single-chair shop is the common Lebanese case, and the old screen only
 * revealed self-assign by posting, failing, and string-matching the 409 that
 * came back — so the owner saw "Email already exists" before being offered the
 * thing they actually wanted.
 */
const emptyForm = { fullName: "", email: "", password: "" };

export default function TeamEditor({ mode = "manage", onSelect, onProgress }) {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const { items, loading, error } = useAppSelector((state) => state.barbers);
  const user = useAppSelector((state) => state.auth.user);

  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSelf, setConfirmSelf] = useState(false);

  useEffect(() => {
    dispatch(fetchBarbers());
  }, [dispatch]);

  const reload = () => dispatch(fetchBarbers());
  const messageOf = (err) => (typeof err === "string" ? err : t("error_generic"));

  /* Computed from what is typed, so the confirmation can appear before the
     request rather than after it fails. */
  const isSelfAssign =
    Boolean(user?.email) &&
    form.email.trim().toLowerCase() === String(user.email).toLowerCase();

  const alreadyABarber = items.some(
    (barber) => String(barber.Email || "").toLowerCase() === String(user?.email || "").toLowerCase()
  );

  async function create(payload) {
    setBusy(true);
    setFormError("");
    try {
      await dispatch(createBarber(payload)).unwrap();
      setForm(emptyForm);
      await reload();
      onProgress?.();
    } catch (err) {
      setFormError(messageOf(err));
    } finally {
      setBusy(false);
      setConfirmSelf(false);
    }
  }

  function submit(event) {
    event?.preventDefault();
    setFormError("");

    if (!form.fullName.trim() || !form.email.trim()) {
      setFormError(t("fill_all_fields"));
      return;
    }
    if (!isSelfAssign && !form.password.trim()) {
      setFormError(t("fill_all_fields"));
      return;
    }

    if (isSelfAssign) {
      setConfirmSelf(true);
      return;
    }

    create({ fullName: form.fullName.trim(), email: form.email.trim(), password: form.password });
  }

  function addMyself() {
    setFormError("");
    setForm({ fullName: user?.fullName || "", email: user?.email || "", password: "" });
    setConfirmSelf(true);
  }

  async function setFlag(barber, patch) {
    try {
      await dispatch(toggleAvailability({ barberId: barber.Id, ...patch })).unwrap();
      onProgress?.();
    } catch (err) {
      setFormError(messageOf(err));
    }
  }

  return (
    <div className="space-y-5">
      {!alreadyABarber && user?.email ? (
        <Card>
          <p className="text-body font-bold text-content-primary">{t("team_self_title")}</p>
          <p className="mt-1 text-body-sm text-content-secondary">{t("team_self_sub")}</p>
          <Button className="mt-3" icon="plus" onClick={addMyself} disabled={busy}>
            {t("team_add_myself")}
          </Button>
        </Card>
      ) : null}

      <Card as="form" onSubmit={submit}>
        <h3 className="text-h3 text-content-primary mb-3">{t("add_barber")}</h3>

        <div className="space-y-3">
          <Field
            label={t("full_name")}
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            autoComplete="off"
          />
          <Field
            label={t("email")}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            type="email"
            dir="ltr"
            autoComplete="off"
          />
          {!isSelfAssign ? (
            <Field
              label={t("password")}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              type="password"
              dir="ltr"
              autoComplete="new-password"
              /* Honest about what this is: there is no invite email yet, so the
                 owner sets it and passes it on. */
              hint={t("barber_password_hint")}
            />
          ) : null}

          {formError ? (
            <p role="alert" className="text-body-sm text-state-danger">
              {formError}
            </p>
          ) : null}

          <Button type="submit" block loading={busy} icon="plus">
            {t("add_barber")}
          </Button>
        </div>
      </Card>

      <section>
        <SectionHeader title={t("your_team")} />

        {loading && !items.length ? (
          <ListSkeleton count={2} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !items.length ? (
          <EmptyState icon="users" title={t("no_barbers")} description={t("no_barbers_sub")} />
        ) : (
          <ul className="space-y-2">
            {items.map((barber) => {
              const services = barber.ServiceIds?.length || 0;

              return (
                <li
                  key={barber.Id}
                  className="rounded-card bg-surface-raised border border-line-subtle"
                >
                  <button
                    type="button"
                    onClick={() => onSelect?.(barber.Id)}
                    disabled={!onSelect}
                    className="w-full flex items-center gap-3 p-3.5 text-start min-h-[44px]"
                  >
                    <Avatar src={barber.ProfileImage} name={barber.FullName} size={42} />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-body font-bold text-content-primary truncate">
                          {barber.DisplayName || barber.FullName}
                        </span>
                        {barber.IsAvailable ? null : (
                          <Pill tone="neutral">{t("barber_off_duty")}</Pill>
                        )}
                      </span>
                      {/* The gap that makes a shop unbookable, said plainly on
                          the row rather than discovered three taps in. */}
                      <span
                        className={`block text-caption ${
                          services ? "text-content-muted" : "text-state-danger"
                        }`}
                      >
                        {services
                          ? t("barber_services_count", { n: services })
                          : t("barber_no_services")}
                      </span>
                    </span>
                    {onSelect ? (
                      <span className="text-caption text-brand-gold-text flex-shrink-0">
                        {t("edit")}
                      </span>
                    ) : null}
                  </button>

                  {mode === "manage" ? (
                    <div className="px-3.5 pb-2 border-t border-line-subtle">
                      <Toggle
                        checked={Boolean(barber.IsAvailable)}
                        onChange={(next) => setFlag(barber, { isAvailable: next })}
                        label={t("barber_takes_walkins")}
                      />
                      <Toggle
                        checked={Boolean(barber.IsAcceptingAppointments)}
                        onChange={(next) => setFlag(barber, { isAcceptingAppointments: next })}
                        label={t("barber_takes_appointments")}
                      />
                      <Toggle
                        checked={Boolean(barber.AutoAcceptAppointments)}
                        onChange={(next) => setFlag(barber, { autoAcceptAppointments: next })}
                        label={t("barber_auto_accept")}
                        hint={t("barber_auto_accept_hint")}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmSheet
        open={confirmSelf}
        onClose={() => setConfirmSelf(false)}
        onConfirm={() =>
          create({
            fullName: (form.fullName || user?.fullName || "").trim(),
            email: (form.email || user?.email || "").trim(),
            /* The server adds the BARBER role to the existing account, so there
               is no password to set. */
            selfAssign: true
          })
        }
        loading={busy}
        destructive={false}
        title={t("team_self_confirm_title")}
        message={t("team_self_confirm_message")}
        confirmLabel={t("team_add_myself")}
      />
    </div>
  );
}
