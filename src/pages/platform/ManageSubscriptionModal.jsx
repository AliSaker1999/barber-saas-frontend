import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  updateTenantSubscription,
  clearPlatformTenantsError
} from "../../features/platformTenants/platformTenantsSlice";
import { formatMoney } from "../../utils/format";
import BottomSheet from "../../components/ui/BottomSheet";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Icon from "../../components/ui/Icon";
import Select from "../../components/ui/Select";
import { InlineError } from "../../components/ui/States";

/*
 * Platform staff tooling — deliberately English-only, see REDESIGN.md.
 *
 * This dialog already told the truth and then ignored it: it rendered "Saving
 * with no plan will also deactivate this shop — its staff won't be able to log
 * in" and then saved on one click, with no confirmation and no `.unwrap()`, so
 * a failure closed silently too.
 *
 * Clearing the plan now takes a second, deliberate step in the same sheet
 * rather than a nested dialog — the same shape as the password-reset flow on
 * the login screen.
 */
export default function ManageSubscriptionModal({ tenant, open, onClose }) {
  const dispatch = useAppDispatch();
  const plans = useAppSelector((s) => s.platformTenants.plans);

  const [planId, setPlanId] = useState("");
  const [renewsAt, setRenewsAt] = useState("");
  const [hydratedFor, setHydratedFor] = useState(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (tenant && tenant.Id !== hydratedFor) {
    setPlanId(tenant.PlanId ?? "");
    setRenewsAt(tenant.SubscriptionRenewsAt?.slice(0, 10) ?? "");
    setHydratedFor(tenant.Id);
    setConfirmingRemoval(false);
    setError("");
  }

  const removingPlan = planId === "";

  async function save() {
    setError("");
    setSaving(true);
    try {
      await dispatch(
        updateTenantSubscription({
          tenantId: tenant.Id,
          planId: removingPlan ? null : Number(planId),
          subscriptionRenewsAt: renewsAt || null
        })
      ).unwrap();
      onClose();
    } catch (err) {
      setError(typeof err === "string" ? err : "Could not change the plan.");
      /* This sheet shows it; the page banner should not repeat it. */
      dispatch(clearPlatformTenantsError());
      setConfirmingRemoval(false);
    } finally {
      setSaving(false);
    }
  }

  function primaryAction() {
    if (removingPlan && !confirmingRemoval) {
      setConfirmingRemoval(true);
      return;
    }
    save();
  }

  function close() {
    setConfirmingRemoval(false);
    setError("");
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={close}
      dismissible={!saving}
      title={confirmingRemoval ? "Take this shop offline?" : "Plan and renewal"}
      footer={
        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            block
            onClick={confirmingRemoval ? () => setConfirmingRemoval(false) : close}
            disabled={saving}
          >
            {confirmingRemoval ? "Back" : "Cancel"}
          </Button>
          <Button
            block
            variant={removingPlan ? "danger-solid" : "primary"}
            onClick={primaryAction}
            loading={saving}
          >
            {!removingPlan ? "Save" : confirmingRemoval ? "Remove the plan" : "Continue"}
          </Button>
        </div>
      }
    >
      {confirmingRemoval ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 rounded-card bg-surface-sunken px-3.5 py-3">
            <Icon name="alert" size={18} className="text-state-danger mt-0.5 flex-shrink-0" />
            <p className="text-body-sm text-content-secondary">
              Removing {tenant?.Name}&apos;s plan deactivates the shop. Everyone who works
              there stops being able to log in, and it disappears from Explore and from
              its booking link.
            </p>
          </div>
          <p className="text-caption text-content-muted">
            Existing bookings are not cancelled. Assigning a plan again brings the shop
            back.
          </p>
          {error ? <InlineError message={error} /> : null}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-body-sm text-content-secondary">
            {tenant?.Name} — bookkeeping only. Nothing is charged automatically.
          </p>

          <div>
            <p className="text-label uppercase text-content-muted mb-1.5">Plan</p>
            <Select
              value={planId}
              onChange={(event) => setPlanId(event.target.value)}
              placeholder="No plan"
              searchPlaceholder="Search plans"
              aria-label="Plan"
              options={[
                { value: "", label: "No plan", icon: "x" },
                ...plans.map((plan) => ({
                  value: plan.Id,
                  label: plan.Name,
                  icon: "card",
                  /* The platform's own billing currency, never the shop's. */
                  hint: `${formatMoney(plan.MonthlyPrice, "USD")}/mo · ${plan.MinBarbers}${
                    plan.MaxBarbers ? `-${plan.MaxBarbers}` : "+"
                  } barbers`
                }))
              ]}
            />
            {removingPlan ? (
              <p className="text-caption text-state-danger mt-1.5">
                Saving with no plan deactivates the shop.
              </p>
            ) : null}
          </div>

          <Field
            label="Next renewal date"
            value={renewsAt}
            onChange={(event) => setRenewsAt(event.target.value)}
            type="date"
            dir="ltr"
            hint="If this passes by more than a day without being moved forward, the shop is deactivated automatically."
          />

          {error ? <InlineError message={error} /> : null}
        </div>
      )}
    </BottomSheet>
  );
}
