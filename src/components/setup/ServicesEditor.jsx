import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import {
  fetchServices,
  addService,
  updateService,
  deleteService
} from "../../features/services/servicesSlice";
import { fetchBarbers } from "../../features/barbers/barbersSlice";
import { formatMoney } from "../../utils/format";
import Icon from "../ui/Icon";
import Button from "../ui/Button";
import Field from "../ui/Field";
import { Card, SectionHeader, Pill, Toggle } from "../ui/Primitives";
import BottomSheet, { ConfirmSheet } from "../ui/BottomSheet";
import { EmptyState, ErrorState, ListSkeleton } from "../ui/States";

/*
 * The shop's price list.
 *
 * Shared by /company/services and the setup wizard's services step. `mode`
 * is the only difference:
 *
 *   manage  full CRUD — edit, deactivate, delete behind a confirmation.
 *   setup   add, and nothing destructive. An owner who has just typed three
 *           services has nothing worth deleting, and a delete confirmation
 *           inside a wizard is a trap rather than a feature.
 *
 * `onProgress` fires after any successful write so the wizard can recheck
 * readiness without this component knowing a wizard exists.
 */

/* One tap each, so the common shop is set up in seconds rather than four
   fields at a time. Prices are a starting point, not a recommendation. */
const STARTERS = [
  { nameKey: "starter_haircut", durationMinutes: 30, price: 10 },
  { nameKey: "starter_beard", durationMinutes: 20, price: 7 },
  { nameKey: "starter_haircut_beard", durationMinutes: 45, price: 15 },
  { nameKey: "starter_shave", durationMinutes: 30, price: 10 },
  { nameKey: "starter_kids", durationMinutes: 20, price: 7 }
];

const emptyForm = { name: "", price: "", duration: "", loyaltyPoints: "" };

export default function ServicesEditor({ mode = "manage", onProgress }) {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const { items, loading, error } = useAppSelector((state) => state.services);
  const barbers = useAppSelector((state) => state.barbers.items);
  const currency = useAppSelector((state) => state.auth.user?.currency) || "USD";

  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    dispatch(fetchServices());
    /* Only to count who performs a service before offering to delete it. */
    if (mode === "manage") dispatch(fetchBarbers());
  }, [dispatch, mode]);

  const reload = () => dispatch(fetchServices());

  /* Thunks here reject with a bare string, which getFriendlyErrorMessage does
     not see — it only inspects error.response. */
  const messageOf = (err) => (typeof err === "string" ? err : t("error_generic"));

  async function submit(event) {
    event?.preventDefault();
    setFormError("");

    if (!form.name.trim() || !form.price || !form.duration) {
      setFormError(t("fill_all_fields"));
      return;
    }

    setBusy(true);
    try {
      await dispatch(
        addService({
          name: form.name.trim(),
          price: Number(form.price),
          durationMinutes: Number(form.duration),
          loyaltyPointsEarned: Number(form.loyaltyPoints || 0)
        })
      ).unwrap();

      /* Cleared only once the write succeeded. It used to be cleared
         unconditionally, outside the promise, so a failed add silently threw
         away everything the owner had typed. */
      setForm(emptyForm);
      await reload();
      onProgress?.();
    } catch (err) {
      setFormError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function addStarter(starter) {
    setBusy(true);
    setFormError("");
    try {
      await dispatch(
        addService({
          name: t(starter.nameKey),
          price: starter.price,
          durationMinutes: starter.durationMinutes,
          loyaltyPointsEarned: 0
        })
      ).unwrap();
      await reload();
      onProgress?.();
    } catch (err) {
      setFormError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editing.name.trim() || !editing.price || !editing.duration) {
      setFormError(t("fill_all_fields"));
      return;
    }

    setBusy(true);
    try {
      await dispatch(
        updateService({
          serviceId: editing.id,
          updates: {
            name: editing.name.trim(),
            price: Number(editing.price),
            durationMinutes: Number(editing.duration),
            loyaltyPointsEarned: Number(editing.loyaltyPoints || 0),
            isActive: editing.isActive
          }
        })
      ).unwrap();
      setEditing(null);
      onProgress?.();
    } catch (err) {
      setFormError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function reallyDelete() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await dispatch(deleteService(confirmDelete.Id)).unwrap();
      setConfirmDelete(null);
      onProgress?.();
    } catch (err) {
      setFormError(messageOf(err));
      setConfirmDelete(null);
    } finally {
      setBusy(false);
    }
  }

  /* Deleting a service cascades through BarberServices, so the confirmation
     can say how many barbers stop offering it. */
  const barbersOffering = (serviceId) =>
    barbers.filter((barber) => (barber.ServiceIds || []).includes(serviceId)).length;

  const showStarters = mode === "setup" && !loading && items.length === 0;

  return (
    <div className="space-y-5">
      {showStarters ? (
        <section>
          <SectionHeader title={t("starters_title")} subtitle={t("starters_sub")} />
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((starter) => (
              <Button
                key={starter.nameKey}
                variant="secondary"
                size="sm"
                icon="plus"
                disabled={busy}
                onClick={() => addStarter(starter)}
              >
                {t(starter.nameKey)}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      <Card as="form" onSubmit={submit}>
        <h3 className="text-h3 text-content-primary mb-3">{t("add_service")}</h3>

        <div className="space-y-3">
          <Field
            label={t("service_name")}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t("service_name_placeholder")}
          />
          <div className="flex gap-3">
            <Field
              className="flex-1"
              label={t("price")}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              type="number"
              inputMode="decimal"
              dir="ltr"
              suffix={currency}
              inputClassName="tnum"
            />
            <Field
              className="flex-1"
              label={t("duration_minutes")}
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              type="number"
              inputMode="numeric"
              dir="ltr"
              suffix={t("minutes_short")}
              inputClassName="tnum"
            />
          </div>

          {mode === "manage" ? (
            <Field
              label={t("loyalty_points")}
              value={form.loyaltyPoints}
              onChange={(e) => setForm((f) => ({ ...f, loyaltyPoints: e.target.value }))}
              type="number"
              inputMode="numeric"
              dir="ltr"
              hint={t("loyalty_points_hint")}
              inputClassName="tnum"
            />
          ) : null}

          {formError ? (
            <p role="alert" className="text-body-sm text-state-danger">
              {formError}
            </p>
          ) : null}

          <Button type="submit" block loading={busy} icon="plus">
            {t("add_service")}
          </Button>
        </div>
      </Card>

      <section>
        <SectionHeader title={t("your_services")} />

        {loading && !items.length ? (
          <ListSkeleton count={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !items.length ? (
          <EmptyState icon="scissors" title={t("no_services")} description={t("no_services_sub")} />
        ) : (
          <ul className="space-y-2">
            {items.map((service) => (
              <li
                key={service.Id}
                className="flex items-center gap-3 p-3.5 rounded-card bg-surface-raised border border-line-subtle"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-body font-bold text-content-primary truncate">
                      {service.Name}
                    </p>
                    {!service.IsActive ? <Pill tone="neutral">{t("inactive")}</Pill> : null}
                  </div>
                  <p className="text-body-sm text-content-secondary tnum">
                    {formatMoney(service.Price, currency)} ·{" "}
                    {t("duration_value", { n: service.DurationMinutes })}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEditing({
                      id: service.Id,
                      name: service.Name || "",
                      price: String(service.Price ?? ""),
                      duration: String(service.DurationMinutes ?? ""),
                      loyaltyPoints: String(service.LoyaltyPointsEarned ?? ""),
                      isActive: service.IsActive
                    })
                  }
                >
                  {t("edit")}
                </Button>

                {mode === "manage" ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(service)}
                    aria-label={`${t("delete")} — ${service.Name}`}
                    className="w-11 h-11 flex items-center justify-center rounded-control text-state-danger"
                  >
                    <Icon name="trash" size={18} />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <BottomSheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={t("edit_service")}
        footer={
          <div className="flex gap-2.5">
            <Button variant="secondary" block onClick={() => setEditing(null)} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button block onClick={saveEdit} loading={busy}>
              {t("save")}
            </Button>
          </div>
        }
      >
        {editing ? (
          <div className="space-y-3">
            <Field
              label={t("service_name")}
              value={editing.name}
              onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))}
            />
            <div className="flex gap-3">
              <Field
                className="flex-1"
                label={t("price")}
                value={editing.price}
                onChange={(e) => setEditing((s) => ({ ...s, price: e.target.value }))}
                type="number"
                inputMode="decimal"
                dir="ltr"
                suffix={currency}
                inputClassName="tnum"
              />
              <Field
                className="flex-1"
                label={t("duration_minutes")}
                value={editing.duration}
                onChange={(e) => setEditing((s) => ({ ...s, duration: e.target.value }))}
                type="number"
                inputMode="numeric"
                dir="ltr"
                suffix={t("minutes_short")}
                inputClassName="tnum"
              />
            </div>

            {mode === "manage" ? (
              <>
                <Field
                  label={t("loyalty_points")}
                  value={editing.loyaltyPoints}
                  onChange={(e) => setEditing((s) => ({ ...s, loyaltyPoints: e.target.value }))}
                  type="number"
                  inputMode="numeric"
                  dir="ltr"
                  inputClassName="tnum"
                />
                <Toggle
                  checked={editing.isActive}
                  onChange={(next) => setEditing((s) => ({ ...s, isActive: next }))}
                  label={t("service_bookable")}
                  hint={t("service_bookable_hint")}
                />
              </>
            ) : null}
          </div>
        ) : null}
      </BottomSheet>

      <ConfirmSheet
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={reallyDelete}
        loading={busy}
        destructive
        title={t("delete_service_title", { name: confirmDelete?.Name || "" })}
        message={
          confirmDelete && barbersOffering(confirmDelete.Id)
            ? t("delete_service_barbers", { n: barbersOffering(confirmDelete.Id) })
            : t("delete_service_message")
        }
        detail={t("delete_service_detail")}
        confirmLabel={t("delete")}
      />
    </div>
  );
}
