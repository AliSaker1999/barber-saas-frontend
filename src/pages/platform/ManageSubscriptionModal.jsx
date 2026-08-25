import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { updateTenantSubscription } from "../../features/platformTenants/platformTenantsSlice";
import Modal from "../../components/Modal";

export default function ManageSubscriptionModal({ tenant, open, onClose }) {
  const dispatch = useAppDispatch();
  const plans = useAppSelector(s => s.platformTenants.plans);

  const [planId, setPlanId] = useState("");
  const [renewsAt, setRenewsAt] = useState("");
  const [hydratedTenantId, setHydratedTenantId] = useState(null);

  if (tenant && tenant.Id !== hydratedTenantId) {
    setPlanId(tenant.PlanId ?? "");
    setRenewsAt(tenant.SubscriptionRenewsAt?.slice(0, 10) ?? "");
    setHydratedTenantId(tenant.Id);
  }

  const submit = async (e) => {
    e.preventDefault();
    await dispatch(
      updateTenantSubscription({
        tenantId: tenant.Id,
        planId: planId === "" ? null : Number(planId),
        subscriptionRenewsAt: renewsAt || null
      })
    );
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6 w-96">
        <h3 className="text-xl font-semibold mb-2 text-app-text">
          Manage Subscription
        </h3>
        <p className="text-sm text-app-muted mb-4">
          {tenant?.Name} — set this shop's plan and when their next payment is due. This is manual bookkeeping only; nothing is charged automatically.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Plan</label>
            <select
              className="w-full px-3 py-2 bg-app-surface border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none text-app-text"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
            >
              <option value="">No plan assigned</option>
              {plans.map((p) => (
                <option key={p.Id} value={p.Id}>
                  {p.Name} — ${Number(p.MonthlyPrice).toFixed(0)}/mo ({p.MinBarbers}{p.MaxBarbers ? `–${p.MaxBarbers}` : "+"} barbers)
                </option>
              ))}
            </select>
            {planId === "" && (
              <p className="text-xs text-red-600 mt-1">
                Saving with no plan will also deactivate this shop — its staff won't be able to log in.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Next renewal date</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-app-surface border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none text-app-text"
              value={renewsAt}
              onChange={(e) => setRenewsAt(e.target.value)}
            />
            <p className="text-xs text-app-muted mt-1">
              If this date passes by more than a day without being pushed forward, the shop is deactivated automatically.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[12px] text-app-muted bg-app-surface border-app-border"
            >
              Cancel
            </button>
            <button className="px-4 py-2 bg-app-accent text-white rounded-[12px] hover:bg-app-accent-dark">
              Save
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
