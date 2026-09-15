import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import {
  fetchCompanyProfile,
  updateCompanyProfile
} from "../../features/company/companySlice";
import Button from "../ui/Button";
import Field from "../ui/Field";
import Icon from "../ui/Icon";
import { Toggle } from "../ui/Primitives";
import { InlineError } from "../ui/States";

/*
 * What a customer can pay with, and when the shop asks for money up front.
 *
 * The deposit half is the part that used to mislead. core/payments/
 * deposit-policy.ts returns early on `if (!tenant || !amount)`, so a shop with
 * all three rules switched on and the amount left blank takes no deposit from
 * anyone — and the old form showed three cheerful "Enabled" ticks. Likewise a
 * rule whose threshold is null is skipped entirely. Both are now refused at
 * save time rather than accepted and quietly ignored.
 *
 * The amount is in the currency the shop prices in and nothing converts it, so
 * it is labelled with that currency rather than left as a bare number.
 */
export default function ShopPaymentsForm() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const profile = useAppSelector((state) => state.company.profile);
  const currency = profile?.Currency || "USD";

  const [draft, setDraft] = useState(null);
  const [hydratedFor, setHydratedFor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  if (profile && hydratedFor !== profile.Id) {
    setDraft({
      isWhishPaymentEnabled: profile.IsWhishPaymentEnabled ?? true,
      whishPhoneNumber: profile.WhishPhoneNumber || "",
      isCreditCardPaymentEnabled: profile.IsCreditCardPaymentEnabled ?? false,
      depositAmount: profile.DepositAmount ?? "",
      depositRequireAll: Boolean(profile.DepositRequireAll),
      depositRequireAfterNoShows: Boolean(profile.DepositRequireAfterNoShows),
      depositNoShowThreshold: profile.DepositNoShowThreshold ?? "",
      depositRequireForNewCustomers: Boolean(profile.DepositRequireForNewCustomers),
      depositNewCustomerVisitThreshold: profile.DepositNewCustomerVisitThreshold ?? ""
    });
    setHydratedFor(profile.Id);
  }

  if (!draft) return null;

  const set = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  const anyDepositRule =
    draft.depositRequireAll ||
    draft.depositRequireAfterNoShows ||
    draft.depositRequireForNewCustomers;

  const amountNumber = Number(draft.depositAmount);
  const hasAmount = String(draft.depositAmount).trim() !== "" && amountNumber > 0;

  async function save() {
    setError("");

    if (draft.isWhishPaymentEnabled && !draft.whishPhoneNumber.trim()) {
      setError(t("whish_needs_number"));
      return;
    }

    if (anyDepositRule && !hasAmount) {
      setError(t("deposit_needs_amount"));
      return;
    }
    if (String(draft.depositAmount).trim() !== "" && !Number.isFinite(amountNumber)) {
      setError(t("deposit_amount_invalid"));
      return;
    }

    const noShowThreshold = String(draft.depositNoShowThreshold).trim();
    if (draft.depositRequireAfterNoShows && !(Number(noShowThreshold) >= 1)) {
      setError(t("deposit_no_show_needs_threshold"));
      return;
    }

    const visitThreshold = String(draft.depositNewCustomerVisitThreshold).trim();
    if (draft.depositRequireForNewCustomers && !(Number(visitThreshold) >= 1)) {
      setError(t("deposit_new_needs_threshold"));
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        updateCompanyProfile({
          isWhishPaymentEnabled: draft.isWhishPaymentEnabled,
          whishPhoneNumber: draft.whishPhoneNumber.trim(),
          isCreditCardPaymentEnabled: draft.isCreditCardPaymentEnabled,
          depositAmount: hasAmount ? amountNumber : null,
          depositRequireAll: draft.depositRequireAll,
          depositRequireAfterNoShows: draft.depositRequireAfterNoShows,
          depositNoShowThreshold: draft.depositRequireAfterNoShows
            ? Number(noShowThreshold)
            : null,
          depositRequireForNewCustomers: draft.depositRequireForNewCustomers,
          depositNewCustomerVisitThreshold: draft.depositRequireForNewCustomers
            ? Number(visitThreshold)
            : null
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
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-label uppercase text-content-muted">{t("payment_methods")}</p>

        <div className="rounded-card bg-surface-raised border border-line-subtle px-3.5 py-2.5">
          <Toggle
            label={t("cash_always_on")}
            hint={t("cash_always_on_hint")}
            checked
            disabled
            onChange={() => {}}
          />
        </div>

        <div className="rounded-card bg-surface-raised border border-line-subtle px-3.5 py-2.5 space-y-2.5">
          <Toggle
            label={t("whish_payments")}
            hint={t("whish_payments_hint")}
            checked={draft.isWhishPaymentEnabled}
            onChange={(next) => set({ isWhishPaymentEnabled: next })}
          />
          {draft.isWhishPaymentEnabled ? (
            <Field
              label={t("whish_number")}
              value={draft.whishPhoneNumber}
              onChange={(event) => set({ whishPhoneNumber: event.target.value })}
              type="tel"
              inputMode="tel"
              dir="ltr"
              placeholder="03 123 456"
              inputClassName="tnum"
              hint={t("whish_number_hint")}
            />
          ) : null}
        </div>

        <div className="rounded-card bg-surface-raised border border-line-subtle px-3.5 py-2.5">
          <Toggle
            label={t("card_payments")}
            hint={t("card_payments_hint")}
            checked={draft.isCreditCardPaymentEnabled}
            onChange={(next) => set({ isCreditCardPaymentEnabled: next })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-label uppercase text-content-muted">{t("deposits")}</p>
        <p className="text-caption text-content-muted">{t("deposits_hint")}</p>

        <Field
          label={t("deposit_amount")}
          value={draft.depositAmount}
          onChange={(event) => set({ depositAmount: event.target.value })}
          type="number"
          inputMode="decimal"
          min="0"
          dir="ltr"
          inputClassName="tnum"
          suffix={currency}
          hint={t("deposit_amount_hint")}
        />

        {anyDepositRule && !hasAmount ? (
          <div className="flex items-start gap-2 rounded-card bg-surface-sunken border border-line-subtle px-3.5 py-2.5">
            <Icon name="alert" size={17} className="text-state-warning mt-0.5 flex-shrink-0" />
            <p className="text-body-sm text-content-secondary">{t("deposit_rules_inert")}</p>
          </div>
        ) : null}

        <div className="rounded-card bg-surface-raised border border-line-subtle px-3.5 py-2.5">
          <Toggle
            label={t("deposit_from_everyone")}
            hint={t("deposit_from_everyone_hint")}
            checked={draft.depositRequireAll}
            onChange={(next) => set({ depositRequireAll: next })}
          />
        </div>

        <div className="rounded-card bg-surface-raised border border-line-subtle px-3.5 py-2.5 space-y-2.5">
          <Toggle
            label={t("deposit_after_no_shows")}
            hint={t("deposit_after_no_shows_hint")}
            checked={draft.depositRequireAfterNoShows}
            onChange={(next) => set({ depositRequireAfterNoShows: next })}
            disabled={draft.depositRequireAll}
          />
          {draft.depositRequireAfterNoShows && !draft.depositRequireAll ? (
            <Field
              label={t("no_show_threshold")}
              value={draft.depositNoShowThreshold}
              onChange={(event) => set({ depositNoShowThreshold: event.target.value })}
              type="number"
              inputMode="numeric"
              min="1"
              dir="ltr"
              inputClassName="tnum"
              hint={t("no_show_threshold_hint")}
            />
          ) : null}
        </div>

        <div className="rounded-card bg-surface-raised border border-line-subtle px-3.5 py-2.5 space-y-2.5">
          <Toggle
            label={t("deposit_new_customers")}
            hint={t("deposit_new_customers_hint")}
            checked={draft.depositRequireForNewCustomers}
            onChange={(next) => set({ depositRequireForNewCustomers: next })}
            disabled={draft.depositRequireAll}
          />
          {draft.depositRequireForNewCustomers && !draft.depositRequireAll ? (
            <Field
              label={t("new_customer_visits")}
              value={draft.depositNewCustomerVisitThreshold}
              onChange={(event) =>
                set({ depositNewCustomerVisitThreshold: event.target.value })
              }
              type="number"
              inputMode="numeric"
              min="1"
              dir="ltr"
              inputClassName="tnum"
              hint={t("new_customer_visits_hint")}
            />
          ) : null}
        </div>

        {draft.depositRequireAll ? (
          <p className="text-caption text-content-muted">{t("deposit_all_overrides")}</p>
        ) : null}
      </div>

      {error ? <InlineError message={error} /> : null}

      <Button block onClick={save} loading={saving}>
        {saved ? t("saved") : t("save")}
      </Button>
    </div>
  );
}
