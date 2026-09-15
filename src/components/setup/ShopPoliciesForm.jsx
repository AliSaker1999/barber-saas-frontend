import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import {
  fetchCompanyProfile,
  updateCompanyProfile
} from "../../features/company/companySlice";
import Button from "../ui/Button";
import Field from "../ui/Field";
import { Toggle } from "../ui/Primitives";
import { InlineError } from "../ui/States";

/*
 * The three rules that decide what the booking flow will let a customer do.
 *
 * All three are enforced server-side already; this is the only place they can
 * be read, which is most of the reason it exists. The old form rendered "24"
 * beside the label "Cancellation Policy Hours" and left the owner to work out
 * what happens at hour 25.
 */
export default function ShopPoliciesForm() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const profile = useAppSelector((state) => state.company.profile);

  const [draft, setDraft] = useState(null);
  const [hydratedFor, setHydratedFor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  if (profile && hydratedFor !== profile.Id) {
    setDraft({
      maxAdvanceBookingDays: String(profile.MaxAdvanceBookingDays ?? 30),
      allowSameDayBooking: Boolean(profile.AllowSameDayBooking),
      cancellationPolicyHours: String(profile.CancellationPolicyHours ?? 24)
    });
    setHydratedFor(profile.Id);
  }

  if (!draft) return null;

  const set = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  async function save() {
    setError("");

    const days = Number(draft.maxAdvanceBookingDays);
    const hours = Number(draft.cancellationPolicyHours);

    /* Zero days would close the calendar completely, which is a thing an owner
       might mean but never by typing it into a box labelled "how far ahead". */
    if (!Number.isInteger(days) || days < 1) {
      setError(t("advance_days_invalid"));
      return;
    }
    if (!Number.isInteger(hours) || hours < 0) {
      setError(t("cancellation_hours_invalid"));
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        updateCompanyProfile({
          maxAdvanceBookingDays: days,
          allowSameDayBooking: draft.allowSameDayBooking,
          cancellationPolicyHours: hours
        })
      ).unwrap();
      await dispatch(fetchCompanyProfile());
      setSaved(true);
    } catch (err) {
      setError(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field
        label={t("advance_booking_days")}
        value={draft.maxAdvanceBookingDays}
        onChange={(event) => set({ maxAdvanceBookingDays: event.target.value })}
        type="number"
        inputMode="numeric"
        min="1"
        dir="ltr"
        inputClassName="tnum"
        hint={t("advance_booking_days_hint")}
      />

      <div className="rounded-card bg-surface-raised border border-line-subtle px-3.5 py-2.5">
        <Toggle
          label={t("same_day_booking")}
          hint={
            draft.allowSameDayBooking
              ? t("same_day_booking_on")
              : t("same_day_booking_off")
          }
          checked={draft.allowSameDayBooking}
          onChange={(next) => set({ allowSameDayBooking: next })}
        />
      </div>

      <Field
        label={t("cancellation_hours")}
        value={draft.cancellationPolicyHours}
        onChange={(event) => set({ cancellationPolicyHours: event.target.value })}
        type="number"
        inputMode="numeric"
        min="0"
        dir="ltr"
        inputClassName="tnum"
        hint={t("cancellation_hours_hint", { n: draft.cancellationPolicyHours || 0 })}
      />

      {error ? <InlineError message={error} /> : null}

      <Button block onClick={save} loading={saving}>
        {saved ? t("saved") : t("save")}
      </Button>
    </div>
  );
}
