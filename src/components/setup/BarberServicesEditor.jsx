import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import { fetchServices } from "../../features/services/servicesSlice";
import { fetchBarbers, setBarberServices } from "../../features/barbers/barbersSlice";
import { formatMoney } from "../../utils/format";
import Icon from "../ui/Icon";
import Button from "../ui/Button";
import { EmptyState, InlineError } from "../ui/States";

/*
 * Which services a barber performs.
 *
 * A local draft saved once, rather than a request per checkbox. The old screen
 * dispatched a toggle on every tap against an endpoint that flips rather than
 * assigns, so a double tap undid itself and a retry removed the service — and
 * a barber with no services is invisible to booking even though the shop reads
 * "open".
 *
 * The list comes from the admin services list, not the booking one: that filters
 * to what is currently bookable, so for an inactive service the old screen
 * showed nothing and the owner had no way to tell why.
 */
export default function BarberServicesEditor({ barberId, onProgress }) {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const services = useAppSelector((state) => state.services.items);
  const barber = useAppSelector((state) => state.barbers.items.find((b) => b.Id === barberId));
  const currency = useAppSelector((state) => state.auth.user?.currency) || "USD";

  const assigned = barber?.ServiceIds;

  const [draft, setDraft] = useState([]);
  const [hydratedFor, setHydratedFor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    dispatch(fetchServices());
    /* Its own fetch, not a parent's. Reading state.barbers without filling it
       meant a deep link straight to this editor hydrated an empty draft and
       then saved it over whatever the barber actually performed. */
    dispatch(fetchBarbers());
  }, [dispatch]);

  /* Derived per barber, so switching rows never shows the previous one's set. */
  if (assigned && hydratedFor !== barberId) {
    setDraft(assigned);
    setHydratedFor(barberId);
    setSaved(false);
  }

  const toggle = (serviceId) => {
    setSaved(false);
    setDraft((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
  };

  async function save() {
    setError("");
    setSaving(true);
    try {
      await dispatch(setBarberServices({ barberId, serviceIds: draft })).unwrap();
      setSaved(true);
      onProgress?.();
    } catch (err) {
      setError(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setSaving(false);
    }
  }

  if (!services.length) {
    return (
      <EmptyState
        icon="scissors"
        title={t("no_services")}
        description={t("assign_needs_services")}
      />
    );
  }

  return (
    <div className="space-y-3">
      <ul className="rounded-card border border-line-subtle bg-surface-raised divide-y divide-line-subtle">
        {services.map((service) => {
          const on = draft.includes(service.Id);

          return (
            <li key={service.Id}>
              <button
                type="button"
                onClick={() => toggle(service.Id)}
                aria-pressed={on}
                disabled={saving}
                className="w-full flex items-center gap-3 p-3.5 text-start min-h-[44px]"
              >
                <span
                  aria-hidden="true"
                  className={`w-6 h-6 rounded-[7px] border flex items-center justify-center flex-shrink-0 ${
                    on ? "bg-brand-gold border-brand-gold text-content-on-gold" : "border-line-strong"
                  }`}
                >
                  {on ? <Icon name="check" size={14} strokeWidth={3} /> : null}
                </span>

                <span className="flex-1 min-w-0">
                  <span className="block text-body text-content-primary truncate">
                    {service.Name}
                  </span>
                  <span className="block text-caption text-content-muted tnum">
                    {formatMoney(service.Price, currency)} ·{" "}
                    {t("duration_value", { n: service.DurationMinutes })}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!draft.length ? (
        <p className="text-body-sm text-content-secondary">{t("assign_none_warning")}</p>
      ) : null}

      {error ? <InlineError message={error} /> : null}

      <Button block onClick={save} loading={saving}>
        {saved ? t("saved") : t("save_services")}
      </Button>
    </div>
  );
}
