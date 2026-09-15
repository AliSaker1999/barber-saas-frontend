import { useState } from "react";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import {
  fetchCompanyProfile,
  updateCompanyProfile
} from "../../features/company/companySlice";
import {
  createLoyaltyReward,
  updateLoyaltyReward,
  deleteLoyaltyReward
} from "../../features/loyalty/loyaltySlice";
import Button, { IconButton } from "../ui/Button";
import Field from "../ui/Field";
import Icon from "../ui/Icon";
import Select from "../ui/Select";
import { Pill, Toggle } from "../ui/Primitives";
import BottomSheet, { ConfirmSheet } from "../ui/BottomSheet";
import { EmptyState, InlineError, ListSkeleton } from "../ui/States";

/*
 * Points in, rewards out.
 *
 * Two things made the old version hard to trust. It drew the whole loyalty
 * card inside the shop-branding card and outside the form element, so the two
 * switches only ever saved because the header button called handleSubmit
 * directly. And Delete had no confirmation at all: one tap, a console.error if
 * the server refused, and a row that stayed exactly where it was.
 *
 * The other half is arithmetic the owner could not see. Points are earned per
 * service (Services.LoyaltyPointsEarned) and spent per reward, and a shop
 * whose services all earn 0 has a loyalty programme that can never pay out —
 * you could set "500 points for a haircut" with nothing anywhere granting a
 * single point. getTenantRewards has always returned LoyaltyPointsEarned
 * alongside each reward; it is now on screen.
 */
export default function LoyaltyRewardsEditor() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const profile = useAppSelector((state) => state.company.profile);
  const services = useAppSelector((state) => state.services.items);
  const { items: rewards, loading, error } = useAppSelector((state) => state.loyalty.rewards);

  /* The switches are settings, not a form: they save on the tap and roll back
     if the server says no, rather than waiting behind a Save button that would
     be the only one on a card whose other controls all act immediately. */
  const [pending, setPending] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ serviceId: "", points: "", isActive: true });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const enabled = Boolean(profile?.LoyaltyEnabled);
  const allowRedemption = Boolean(profile?.LoyaltyAllowRedemption);

  const earnsNothing = services.length > 0 && services.every((s) => !s.LoyaltyPointsEarned);

  const serviceOptions = services.map((service) => ({
    value: service.Id,
    label: service.Name,
    icon: "scissors"
  }));

  async function toggle(field, next) {
    setPending(field);
    try {
      await dispatch(updateCompanyProfile({ [field]: next })).unwrap();
      await dispatch(fetchCompanyProfile());
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setPending(null);
    }
  }

  function openAdd() {
    setEditing(null);
    setForm({ serviceId: "", points: "", isActive: true });
    setFormError("");
    setSheetOpen(true);
  }

  function openEdit(reward) {
    setEditing(reward);
    setForm({
      serviceId: reward.ServiceId,
      points: String(reward.PointsRequired ?? ""),
      isActive: Boolean(reward.IsActive)
    });
    setFormError("");
    setSheetOpen(true);
  }

  async function save() {
    setFormError("");

    if (!form.serviceId) {
      setFormError(t("reward_needs_service"));
      return;
    }
    const points = Number(form.points);
    if (!Number.isInteger(points) || points < 1) {
      setFormError(t("reward_needs_points"));
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await dispatch(
          updateLoyaltyReward({
            rewardId: editing.Id,
            serviceId: form.serviceId,
            pointsRequired: points,
            isActive: form.isActive
          })
        ).unwrap();
      } else {
        await dispatch(
          createLoyaltyReward({ serviceId: form.serviceId, pointsRequired: points })
        ).unwrap();
      }
      setSheetOpen(false);
    } catch (err) {
      setFormError(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setSaving(false);
    }
  }

  async function reallyDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await dispatch(deleteLoyaltyReward(confirmDelete.Id)).unwrap();
      setConfirmDelete(null);
    } catch (err) {
      /* The server refuses to delete a reward somebody has already redeemed,
         and says so in a sentence. Before this it reached a console.error. */
      toast.error(typeof err === "string" ? err : t("error_generic"));
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-card bg-surface-raised border border-line-subtle px-3.5 py-2.5">
        <Toggle
          label={t("loyalty_enabled")}
          hint={t("loyalty_enabled_hint")}
          checked={enabled}
          disabled={pending === "loyaltyEnabled"}
          onChange={(next) => toggle("loyaltyEnabled", next)}
        />
      </div>

      <div className="rounded-card bg-surface-raised border border-line-subtle px-3.5 py-2.5">
        <Toggle
          label={t("loyalty_redemption")}
          hint={t("loyalty_redemption_hint")}
          checked={allowRedemption}
          disabled={!enabled || pending === "loyaltyAllowRedemption"}
          onChange={(next) => toggle("loyaltyAllowRedemption", next)}
        />
      </div>

      {enabled && earnsNothing ? (
        <div className="flex items-start gap-2 rounded-card bg-surface-sunken border border-line-subtle px-3.5 py-2.5">
          <Icon name="alert" size={17} className="text-state-warning mt-0.5 flex-shrink-0" />
          <p className="text-body-sm text-content-secondary">{t("loyalty_no_earning")}</p>
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-1">
        <div className="min-w-0">
          <p className="text-body font-bold text-content-primary">{t("loyalty_rewards")}</p>
          <p className="text-caption text-content-muted">{t("loyalty_rewards_hint")}</p>
        </div>
        <IconButton icon="plus" label={t("reward_add")} onClick={openAdd} />
      </div>

      {error ? <InlineError message={error} /> : null}

      {loading && !rewards.length ? (
        <ListSkeleton count={2} />
      ) : !rewards.length ? (
        <EmptyState
          icon="gift"
          title={t("loyalty_rewards_empty")}
          description={t("loyalty_rewards_empty_sub")}
          actionLabel={t("reward_add")}
          onAction={openAdd}
        />
      ) : (
        <ul className="space-y-2">
          {rewards.map((reward) => (
            <li
              key={reward.Id}
              className={`p-3.5 rounded-card bg-surface-raised border border-line-subtle ${
                reward.IsActive ? "" : "opacity-60"
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-body font-bold text-content-primary truncate">
                    {reward.ServiceName}
                  </p>
                  <p className="text-caption text-content-muted tnum">
                    {t("reward_costs", { n: reward.PointsRequired })}
                  </p>
                  <p className="text-caption text-content-muted tnum">
                    {reward.LoyaltyPointsEarned
                      ? t("reward_earns", { n: reward.LoyaltyPointsEarned })
                      : t("reward_earns_none")}
                  </p>
                </div>
                <Pill tone={reward.IsActive ? "success" : "neutral"}>
                  {reward.IsActive ? t("active") : t("inactive")}
                </Pill>
              </div>

              <div className="flex gap-2 mt-2.5">
                <Button variant="secondary" size="sm" onClick={() => openEdit(reward)}>
                  {t("edit")}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmDelete(reward)}
                >
                  {t("delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? t("reward_edit") : t("reward_add")}
        footer={
          <Button block onClick={save} loading={saving}>
            {t("save")}
          </Button>
        }
      >
        <div className="space-y-3">
          <div>
            <p className="text-label uppercase text-content-muted mb-1.5">{t("service")}</p>
            <Select
              value={form.serviceId}
              onChange={(event) => setForm((c) => ({ ...c, serviceId: event.target.value }))}
              options={serviceOptions}
              placeholder={t("reward_pick_service")}
              aria-label={t("service")}
            />
          </div>

          <Field
            label={t("reward_points")}
            value={form.points}
            onChange={(event) => setForm((c) => ({ ...c, points: event.target.value }))}
            type="number"
            inputMode="numeric"
            min="1"
            dir="ltr"
            inputClassName="tnum"
            hint={t("reward_points_hint")}
          />

          {editing ? (
            <div className="rounded-card bg-surface-sunken px-3.5 py-2.5">
              <Toggle
                label={t("reward_active")}
                hint={t("reward_active_hint")}
                checked={form.isActive}
                onChange={(next) => setForm((c) => ({ ...c, isActive: next }))}
              />
            </div>
          ) : null}

          {formError ? <InlineError message={formError} /> : null}
        </div>
      </BottomSheet>

      <ConfirmSheet
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={reallyDelete}
        loading={deleting}
        title={t("reward_delete_title", { name: confirmDelete?.ServiceName || "" })}
        message={t("reward_delete_message")}
        detail={t("reward_delete_detail")}
        confirmLabel={t("delete")}
      />
    </div>
  );
}
