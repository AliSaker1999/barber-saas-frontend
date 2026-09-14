import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { useI18n } from "../i18n";
import {
  updateCustomerTenantDetails,
  updateCustomerBlock,
  clearSelectedCustomer
} from "../features/customers/customersSlice";
import { formatDateOnly } from "../utils/time";
import Icon from "./ui/Icon";
import Button from "./ui/Button";
import Field from "./ui/Field";
import BottomSheet, { ConfirmSheet } from "./ui/BottomSheet";
import { Avatar, Pill } from "./ui/Primitives";

/*
 * One customer, as a shop sees them.
 *
 * Same {isOpen, onClose} contract as before the rewrite — Queue.jsx and
 * Appointments.jsx both open this from a "view customer" tap and populate it
 * via fetchCustomerDetails beforehand, and neither needed to change.
 *
 * Save (notes/loyalty points) and Block are two separate actions rather than
 * one form: blocking is an access-control decision with a real consequence
 * for the customer, so it gets its own confirmation naming that consequence,
 * and must never fire as a side effect of an accidental Save tap.
 */
export default function CustomerModal({ isOpen, onClose }) {
  const dispatch = useAppDispatch();
  const { t, locale } = useI18n();
  const { selectedCustomer, loading, updateSuccess } = useAppSelector((state) => state.customers);
  const canBlock = useAppSelector((state) => state.auth.user?.roles?.includes("ADMIN"));

  const [notes, setNotes] = useState("");
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [prevId, setPrevId] = useState(null);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blockError, setBlockError] = useState("");

  /* Derived per customer, in render — not in an effect — so the form never
     fights a refetch and never shows the previous customer's draft. */
  if (selectedCustomer && selectedCustomer.Id !== prevId) {
    setNotes(selectedCustomer.Notes || "");
    setLoyaltyPoints(selectedCustomer.LoyaltyPoints || 0);
    setPrevId(selectedCustomer.Id);
  }

  useEffect(() => {
    if (updateSuccess) {
      onClose();
      dispatch(clearSelectedCustomer());
    }
  }, [updateSuccess, onClose, dispatch]);

  const handleClose = () => {
    onClose();
    dispatch(clearSelectedCustomer());
  };

  const handleSave = () => {
    dispatch(updateCustomerTenantDetails({
      customerId: selectedCustomer.Id,
      notes,
      loyaltyPoints: parseInt(loyaltyPoints, 10) || 0
    }));
  };

  async function confirmBlock() {
    setBlocking(true);
    setBlockError("");
    try {
      await dispatch(
        updateCustomerBlock({ customerId: selectedCustomer.Id, blocked: !selectedCustomer.IsBlocked })
      ).unwrap();
      setConfirmBlockOpen(false);
    } catch (err) {
      setBlockError(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setBlocking(false);
    }
  }

  if (!selectedCustomer) return null;

  const isBlocked = Boolean(selectedCustomer.IsBlocked);

  return (
    <>
      <BottomSheet
        open={isOpen}
        onClose={handleClose}
        title={selectedCustomer.FullName}
        subtitle={t("customer_member_since", {
          date: selectedCustomer.CreatedAt
            ? new Date(selectedCustomer.CreatedAt).toLocaleDateString(locale === "ar" ? "ar-LB" : undefined)
            : t("customer_recently")
        })}
        footer={
          <div className="flex gap-2.5">
            <Button variant="secondary" block onClick={handleClose} disabled={loading}>
              {t("cancel")}
            </Button>
            <Button block onClick={handleSave} loading={loading}>
              {t("save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar src={selectedCustomer.ProfileImage} name={selectedCustomer.FullName} size={56} />
            {isBlocked ? (
              <Pill tone="danger" icon="lock">
                {t("customer_blocked_pill")}
              </Pill>
            ) : null}
          </div>

          {/* Read-only facts */}
          <section className="grid grid-cols-3 gap-3">
            <Fact label={t("customer_gender")} value={selectedCustomer.Gender || t("customer_not_set")} />
            <Fact
              label={t("customer_birthdate")}
              value={selectedCustomer.Birthdate ? formatDateOnly(selectedCustomer.Birthdate) : t("customer_not_set")}
            />
            <Fact
              label={t("customer_last_visit")}
              value={
                selectedCustomer.LastAppointmentDate
                  ? formatDateOnly(selectedCustomer.LastAppointmentDate)
                  : t("customer_first_time")
              }
            />
          </section>

          {/* Contact channels the customer has allowed */}
          <section className="flex flex-wrap gap-2">
            <ChannelPill allowed={selectedCustomer.AllowSMS} icon="phone" label={t("channel_sms")} />
            <ChannelPill allowed={selectedCustomer.AllowWhatsApp} icon="whatsapp" label={t("channel_whatsapp")} />
            <ChannelPill allowed={selectedCustomer.AllowEmail} label={t("channel_email")} />
          </section>

          <div className="space-y-4 pt-4 border-t border-line-subtle">
            <div className="flex gap-3">
              <Field
                className="flex-1"
                label={t("customer_loyalty_points")}
                value={loyaltyPoints}
                onChange={(e) => setLoyaltyPoints(e.target.value)}
                type="number"
                inputMode="numeric"
                dir="ltr"
                inputClassName="tnum"
              />
              <div className="flex-1">
                <p className="text-label uppercase text-content-muted mb-1.5">
                  {t("customer_no_show_count")}
                </p>
                <div className="h-12 px-3.5 rounded-control bg-state-danger-soft border border-transparent flex items-center justify-between">
                  <span className="text-body font-bold text-state-danger tnum">
                    {selectedCustomer.NoShowCount || 0}
                  </span>
                  <Icon name="alert" size={18} className="text-state-danger" />
                </div>
              </div>
            </div>

            <Field
              label={t("customer_staff_notes")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              as="textarea"
              rows={4}
              placeholder={t("customer_notes_placeholder")}
            />
          </div>

          {canBlock ? (
            <div className="pt-4 border-t border-line-subtle">
              {blockError ? (
                <p role="alert" className="mb-2 text-body-sm text-state-danger">
                  {blockError}
                </p>
              ) : null}
              <Button
                variant={isBlocked ? "secondary" : "danger"}
                block
                icon="lock"
                onClick={() => setConfirmBlockOpen(true)}
              >
                {isBlocked ? t("customer_unblock_action") : t("customer_block_action")}
              </Button>
            </div>
          ) : null}
        </div>
      </BottomSheet>

      <ConfirmSheet
        open={confirmBlockOpen}
        onClose={() => setConfirmBlockOpen(false)}
        onConfirm={confirmBlock}
        loading={blocking}
        destructive={!isBlocked}
        title={isBlocked ? t("customer_unblock_action") : t("customer_block_action")}
        message={t("customer_block_confirm_message", { name: selectedCustomer.FullName })}
        confirmLabel={isBlocked ? t("customer_unblock_action") : t("customer_block_action")}
      />
    </>
  );
}

/* Pill has no "disallowed" tone of its own — this renders that state
   directly: dimmed and struck through, same signal the old markup used, just
   in tokens instead of raw gray. */
function ChannelPill({ allowed, icon, label }) {
  if (allowed) {
    return (
      <Pill tone="neutral" icon={icon}>
        {label}
      </Pill>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-caption font-semibold whitespace-nowrap bg-surface-sunken text-content-muted line-through opacity-70">
      {icon ? <Icon name={icon} size={13} /> : null}
      {label}
    </span>
  );
}

function Fact({ label, value }) {
  return (
    <div className="p-3 rounded-card bg-surface-sunken border border-line-subtle">
      <p className="text-label uppercase text-content-muted mb-1">{label}</p>
      <p className="text-body-sm font-bold text-content-primary truncate">{value}</p>
    </div>
  );
}
