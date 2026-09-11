import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchQueue,
  moveNext,
  markQueueNoShow,
  updateQueueServicesThunk,
  notifyCustomer,
  verifyQueuePaymentThunk,
  approveQueueItemThunk,
  declineQueueItemThunk,
  addWalkIn
} from "../../features/queue/queueSlice";
import { fetchBarbers } from "../../features/barbers/barbersSlice";
import { fetchServices } from "../../features/services/servicesSlice";
import { openChatWindow } from "../../features/chat/chatSlice";
import { fetchCustomerDetails, clearSelectedCustomer } from "../../features/customers/customersSlice";
import { getSocket } from "../../services/socket";

import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import Button, { IconButton } from "../../components/ui/Button";
import BottomSheet, { ConfirmSheet } from "../../components/ui/BottomSheet";
import ServiceCard from "../../components/ui/ServiceCard";
import CustomerModal from "../../components/CustomerModal";
import { Pill, SectionHeader } from "../../components/ui/Primitives";
import { StatStrip, PersonRow } from "../../components/shop/ShopDayComponents";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/ui/States";
import { useI18n } from "../../i18n";
import { formatDuration, formatMoney, formatTime, formatWaitRange } from "../../utils/format";
import { shopWhatsappHref } from "../../config/support";

/*
 * The live walk-in queue, as the shop sees it.
 *
 * Ordered by what needs a decision, not by data shape: the things waiting on
 * the shop come first (join requests, payments to verify), then who is in the
 * chair, then the line itself.
 *
 * Two rules this screen has to get right, because both were previously wrong:
 *
 *   • Every action that changes someone's day is confirmed, named in words,
 *     and blocked while it is in flight. "Call next" completes the customer in
 *     the chair AND seats the next one in a single transaction, so a double
 *     tap used to complete the person who had just sat down.
 *   • Destructive actions look destructive. A no-show permanently increments
 *     that customer's no-show count; it must not share a button colour with
 *     "Approve".
 */

const STATUS = {
  WAITING: 1,
  IN_PROGRESS: 2,
  AWAITING_PAYMENT: 6,
  PENDING_APPROVAL: 7
};

export default function Queue() {
  const { t, locale } = useI18n();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { items, loading, error } = useAppSelector((state) => state.queue);
  /* The admin roster, not the customer-facing one: that filters out barbers
     who are unavailable, which is how the old Edit Services sheet could open
     with no services and a permanently disabled Save. */
  const barbers = useAppSelector((state) => state.barbers.items);
  const services = useAppSelector((state) => state.services.items);
  const user = useAppSelector((state) => state.auth.user);

  const isOwner = Boolean(user?.roles?.includes("ADMIN") || user?.roles?.includes("STAFF"));
  const tenantId = user?.tenantId;

  const [confirm, setConfirm] = useState(null);
  const [acting, setActing] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editServiceIds, setEditServiceIds] = useState([]);
  const [walkInOpen, setWalkInOpen] = useState(false);

  const load = useCallback(() => {
    dispatch(fetchQueue());
  }, [dispatch]);

  useEffect(() => {
    load();
    dispatch(fetchBarbers());
    dispatch(fetchServices());
  }, [load, dispatch]);

  /* The handler is passed to `off` so this only removes its own listener —
     the bare `socket.off("queue:update")` this screen used before dropped
     every listener for the event, app-wide. */
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !tenantId) return undefined;

    socket.emit("join-tenant", tenantId);
    const refresh = () => load();
    socket.on("queue:update", refresh);

    return () => {
      socket.off("queue:update", refresh);
    };
  }, [tenantId, load]);

  /* ---- grouping ---- */
  const { needsApproval, needsPayment, groups } = useMemo(() => {
    const approval = [];
    const payment = [];
    const byBarber = new Map();

    items.forEach((item) => {
      if (item.statusId === STATUS.PENDING_APPROVAL) {
        approval.push(item);
        return;
      }
      if (item.statusId === STATUS.AWAITING_PAYMENT) {
        payment.push(item);
        return;
      }

      if (!byBarber.has(item.barberId)) {
        byBarber.set(item.barberId, {
          barberId: item.barberId,
          barberName: item.barberName,
          inChair: null,
          waiting: []
        });
      }

      const group = byBarber.get(item.barberId);
      if (item.statusId === STATUS.IN_PROGRESS) group.inChair = item;
      else group.waiting.push(item);
    });

    /* The API orders by join time, so without this the customer in the chair
       can render below the people still waiting. */
    byBarber.forEach((group) => {
      group.waiting.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    });

    return {
      needsApproval: approval,
      needsPayment: payment,
      groups: Array.from(byBarber.values()).sort((a, b) =>
        String(a.barberName || "").localeCompare(String(b.barberName || ""))
      )
    };
  }, [items]);

  const stats = useMemo(() => {
    const waiting = groups.reduce((sum, g) => sum + g.waiting.length, 0);
    const minutes = groups.reduce(
      (sum, g) => sum + g.waiting.reduce((m, i) => m + Number(i.totalDuration || 0), 0),
      0
    );

    return [
      { label: t("waiting_now"), value: waiting },
      { label: t("current_customer"), value: groups.filter((g) => g.inChair).length },
      { label: t("queue_pending_title"), value: needsApproval.length },
      { label: t("payment_pending"), value: needsPayment.length },
      { label: t("estimated_wait"), value: formatWaitRange(minutes, t) }
    ];
  }, [groups, needsApproval.length, needsPayment.length, t]);

  /* ---- actions ---- */
  const run = useCallback(
    async (thunk, successMessage) => {
      setActing(true);
      try {
        await dispatch(thunk).unwrap();
        if (successMessage) toast.success(successMessage);
        load();
        setConfirm(null);
      } catch (err) {
        /* These thunks reject with a plain string, which
           getFriendlyErrorMessage cannot read — so the server's actual reason
           ("Barber is off-duty", "already in a queue") used to be replaced by
           a generic fallback. */
        toast.error(typeof err === "string" ? err : t("error_generic"));
      } finally {
        setActing(false);
      }
    },
    [dispatch, load, t]
  );

  const openCustomer = (customerId) => {
    dispatch(fetchCustomerDetails({ customerId }));
    setCustomerOpen(true);
  };

  const startEditServices = (item) => {
    setEditing(item);
    setEditServiceIds((item.services || []).map((s) => s.id));
  };

  const saveServices = async () => {
    if (!editing) return;
    setActing(true);
    try {
      await dispatch(
        updateQueueServicesThunk({ queueId: editing.id, serviceIds: editServiceIds })
      ).unwrap();
      setEditing(null);
      load();
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setActing(false);
    }
  };

  /* Services the queue item's barber can actually perform. */
  const editableServices = useMemo(() => {
    if (!editing) return [];
    const barber = barbers.find((b) => b.Id === editing.barberId);
    const allowed = barber?.ServiceIds || [];
    return services.filter(
      (s) => s.IsActive !== false && (!allowed.length || allowed.includes(s.Id))
    );
  }, [editing, barbers, services]);

  const editTotal = useMemo(
    () =>
      services
        .filter((s) => editServiceIds.includes(s.Id))
        .reduce((sum, s) => sum + Number(s.Price || 0), 0),
    [services, editServiceIds]
  );

  /* ---- row builders ---- */
  const rowActions = (item, { canNoShow = true } = {}) => (
    <>
      <IconButton
        icon="message"
        label={t("chat")}
        onClick={() => {
          dispatch(
            openChatWindow({
              barberId: item.barberId,
              customerId: item.customerId,
              peerName: item.customerName
            })
          );
          navigate("/company/conversations");
        }}
      />
      {shopWhatsappHref(item.customerPhone) ? (
        <IconButton
          icon="whatsapp"
          label={t("whatsapp_support")}
          onClick={() => window.open(shopWhatsappHref(item.customerPhone), "_blank")}
        />
      ) : null}
      <IconButton
        icon="bell"
        label={t("notify_customer")}
        onClick={() =>
          setConfirm({
            title: t("notify_customer"),
            message: t("notify_customer_message", { name: item.customerName }),
            confirmLabel: t("notify_customer"),
            destructive: false,
            thunk: notifyCustomer(item.id),
            success: t("customer_notified")
          })
        }
      />
      {canNoShow ? (
        <IconButton
          icon="x"
          label={t("mark_no_show")}
          onClick={() =>
            setConfirm({
              title: t("mark_no_show"),
              message: t("no_show_message", { name: item.customerName }),
              confirmLabel: t("mark_no_show"),
              destructive: true,
              thunk: markQueueNoShow(item.id),
              success: t("marked_no_show")
            })
          }
        />
      ) : null}
    </>
  );

  const rowMeta = (item) =>
    [
      item.joinedAt ? t("joined_at_time", { time: formatTime(item.joinedAt, locale) }) : null,
      item.totalDuration ? formatDuration(item.totalDuration, t) : null,
      isOwner ? item.barberName : null
    ]
      .filter(Boolean)
      .join(" · ");

  const serviceNames = (item) =>
    (item.services || []).map((s) => s.name).filter(Boolean).join(" + ");

  const isFirstLoad = loading && !items.length;

  return (
    <div className="pb-6">
      <TopBar
        title={t("live_queue")}
        subtitle={isOwner ? undefined : t("my_queue_subtitle")}
        actions={
          <>
            <IconButton icon="refresh" label={t("retry")} onClick={load} />
            <IconButton
              icon="plus"
              label={t("add_walk_in")}
              variant="solid"
              onClick={() => setWalkInOpen(true)}
            />
          </>
        }
      />

      {isFirstLoad ? (
        <div className="px-4">
          <ListSkeleton count={4} />
        </div>
      ) : error && !items.length ? (
        /* Error and empty used to render stacked on top of each other. */
        <div className="px-4">
          <ErrorState message={error} onRetry={load} />
        </div>
      ) : (
        <>
          <StatStrip stats={stats} />

          {/* ---- waiting on the shop ---- */}
          {needsApproval.length ? (
            <section className="px-4 mt-6">
              <SectionHeader
                title={t("queue_pending_title")}
                subtitle={t("queue_pending_sub")}
              />
              <div className="space-y-2.5">
                {needsApproval.map((item) => (
                  <PersonRow
                    key={item.id}
                    name={item.customerName}
                    photo={item.customerProfileImage}
                    primary={serviceNames(item)}
                    secondary={rowMeta(item)}
                    tone="warning"
                    toneLabel={t("status_pending")}
                    onOpen={() => openCustomer(item.customerId)}
                    highlight
                    actions={
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            setConfirm({
                              title: t("approve"),
                              message: t("approve_queue_message", { name: item.customerName }),
                              confirmLabel: t("approve"),
                              destructive: false,
                              thunk: approveQueueItemThunk(item.id),
                              success: t("request_approved")
                            })
                          }
                        >
                          {t("approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            setConfirm({
                              title: t("decline"),
                              message: t("decline_queue_message", { name: item.customerName }),
                              confirmLabel: t("decline"),
                              destructive: true,
                              thunk: declineQueueItemThunk(item.id),
                              success: t("request_declined")
                            })
                          }
                        >
                          {t("decline")}
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {needsPayment.length ? (
            <section className="px-4 mt-6">
              <SectionHeader title={t("payment_pending")} subtitle={t("queue_payment_sub")} />
              <div className="space-y-2.5">
                {needsPayment.map((item) => (
                  <PersonRow
                    key={item.id}
                    name={item.customerName}
                    photo={item.customerProfileImage}
                    primary={serviceNames(item)}
                    secondary={
                      item.paymentReference
                        ? t("payment_reference_is", { reference: item.paymentReference })
                        : t("unpaid")
                    }
                    tone="warning"
                    toneLabel={t("status_awaiting_payment")}
                    onOpen={() => openCustomer(item.customerId)}
                    actions={
                      <>
                        <Button
                          size="sm"
                          icon="wallet"
                          onClick={() =>
                            setConfirm({
                              title: t("verify_payment"),
                              message: t("verify_payment_message", { name: item.customerName }),
                              confirmLabel: t("verify_payment"),
                              destructive: false,
                              thunk: verifyQueuePaymentThunk(item.id),
                              success: t("payment_verified")
                            })
                          }
                        >
                          {t("verify_payment")}
                        </Button>
                        <IconButton
                          icon="x"
                          label={t("mark_no_show")}
                          onClick={() =>
                            setConfirm({
                              title: t("mark_no_show"),
                              message: t("no_show_message", { name: item.customerName }),
                              confirmLabel: t("mark_no_show"),
                              destructive: true,
                              thunk: markQueueNoShow(item.id),
                              success: t("marked_no_show")
                            })
                          }
                        />
                      </>
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* ---- the line, per barber ---- */}
          {groups.length ? (
            groups.map((group) => (
              <section key={group.barberId} className="px-4 mt-6">
                <SectionHeader
                  title={isOwner ? group.barberName : t("live_queue")}
                  subtitle={
                    group.waiting.length
                      ? t("n_waiting", { n: group.waiting.length })
                      : t("nobody_waiting")
                  }
                  action={group.waiting.length || group.inChair ? t("call_next") : null}
                  onAction={
                    group.waiting.length || group.inChair
                      ? () =>
                          setConfirm({
                            title: t("call_next"),
                            /* moveNext completes whoever is in the chair and
                               seats the next person in one transaction — say
                               exactly that rather than "are you sure?". */
                            message: group.inChair
                              ? t("call_next_message_serving", {
                                  current: group.inChair.customerName,
                                  next: group.waiting[0]?.customerName || ""
                                })
                              : t("call_next_message", {
                                  next: group.waiting[0]?.customerName || ""
                                }),
                            confirmLabel: t("call_next"),
                            destructive: false,
                            thunk: moveNext(group.barberId),
                            success: t("moved_to_next")
                          })
                      : undefined
                  }
                />

                <div className="space-y-2.5">
                  {group.inChair ? (
                    <PersonRow
                      leading={t("in_chair_short")}
                      name={group.inChair.customerName}
                      photo={group.inChair.customerProfileImage}
                      primary={serviceNames(group.inChair)}
                      secondary={rowMeta(group.inChair)}
                      tone="success"
                      toneLabel={t("busy_now")}
                      highlight
                      onOpen={() => openCustomer(group.inChair.customerId)}
                      actions={
                        <>
                          <IconButton
                            icon="edit"
                            label={t("edit")}
                            onClick={() => startEditServices(group.inChair)}
                          />
                          {rowActions(group.inChair)}
                        </>
                      }
                    />
                  ) : null}

                  {group.waiting.map((item) => (
                    <PersonRow
                      key={item.id}
                      /* The API's own 1-based position, not the array index —
                         which is why the first person used to read "#0". */
                      leading={`#${item.position ?? "-"}`}
                      name={item.customerName}
                      photo={item.customerProfileImage}
                      primary={serviceNames(item)}
                      secondary={rowMeta(item)}
                      onOpen={() => openCustomer(item.customerId)}
                      badges={
                        item.notificationSent ? (
                          <Pill tone="info" icon="bell">
                            {t("customer_called")}
                          </Pill>
                        ) : null
                      }
                      actions={
                        <>
                          <IconButton
                            icon="edit"
                            label={t("edit")}
                            onClick={() => startEditServices(item)}
                          />
                          {/* No longer gated on being first in line — the third
                              person in the queue can leave too. */}
                          {rowActions(item)}
                        </>
                      }
                    />
                  ))}

                  {!group.inChair && !group.waiting.length ? (
                    <p className="text-body-sm text-content-muted px-1">{t("nobody_waiting")}</p>
                  ) : null}
                </div>
              </section>
            ))
          ) : !needsApproval.length && !needsPayment.length ? (
            <EmptyState
              icon="users"
              title={t("nobody_waiting")}
              description={t("nobody_waiting_body")}
              actionLabel={t("add_walk_in")}
              onAction={() => setWalkInOpen(true)}
              className="mt-4"
            />
          ) : null}
        </>
      )}

      {/* ---- sheets ---- */}
      <ConfirmSheet
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && run(confirm.thunk, confirm.success)}
        loading={acting}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        destructive={confirm?.destructive}
      />

      <BottomSheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={t("edit_services")}
        subtitle={editing?.customerName}
        footer={
          <Button block loading={acting} disabled={!editServiceIds.length} onClick={saveServices}>
            {t("save")}
          </Button>
        }
      >
        {editableServices.length ? (
          <>
            <div className="space-y-2">
              {editableServices.map((service) => (
                <ServiceCard
                  key={service.Id}
                  service={service}
                  selectable
                  selected={editServiceIds.includes(service.Id)}
                  onSelect={() =>
                    setEditServiceIds((prev) =>
                      prev.includes(service.Id)
                        ? prev.filter((id) => id !== service.Id)
                        : [...prev, service.Id]
                    )
                  }
                />
              ))}
            </div>
            <p className="mt-3.5 text-body-sm text-content-secondary tnum">
              {t("total")}:{" "}
              <span className="font-bold text-content-primary">{formatMoney(editTotal)}</span>
            </p>
          </>
        ) : (
          <EmptyState
            icon="scissors"
            title={t("no_services_title")}
            description={t("barber_has_no_services")}
          />
        )}
      </BottomSheet>

      <WalkInSheet
        open={walkInOpen}
        onClose={() => setWalkInOpen(false)}
        barbers={barbers}
        services={services}
        onAdded={() => {
          setWalkInOpen(false);
          load();
        }}
      />

      <CustomerModal
        isOpen={customerOpen}
        onClose={() => {
          setCustomerOpen(false);
          dispatch(clearSelectedCustomer());
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Add walk-in — someone at the counter.

   Name is the only required field. Plenty of people won't give a number, and
   they still need to be in the line; when they do give one, the server matches
   them to their existing account so a regular keeps their history rather than
   collecting a new record per haircut.
   ------------------------------------------------------------------------- */
function WalkInSheet({ open, onClose, barbers, services, onAdded }) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();

  const [form, setForm] = useState({ fullName: "", phoneNumber: "" });
  const [barberId, setBarberId] = useState(null);
  const [serviceIds, setServiceIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const availableBarbers = useMemo(
    () => barbers.filter((b) => b.IsAvailable),
    [barbers]
  );

  const barberServices = useMemo(() => {
    const barber = barbers.find((b) => b.Id === barberId);
    const allowed = barber?.ServiceIds || [];
    return services.filter(
      (s) => s.IsActive !== false && (!allowed.length || allowed.includes(s.Id))
    );
  }, [barbers, barberId, services]);

  const submit = async () => {
    if (!form.fullName.trim() || !barberId || !serviceIds.length) return;

    setSaving(true);
    try {
      await dispatch(
        addWalkIn({
          fullName: form.fullName.trim(),
          phoneNumber: form.phoneNumber.trim() || undefined,
          barberId,
          serviceIds
        })
      ).unwrap();

      toast.success(t("walk_in_added"));
      setForm({ fullName: "", phoneNumber: "" });
      setBarberId(null);
      setServiceIds([]);
      onAdded();
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("add_walk_in")}
      subtitle={t("add_walk_in_sub")}
      footer={
        <Button
          block
          size="lg"
          loading={saving}
          disabled={!form.fullName.trim() || !barberId || !serviceIds.length}
          onClick={submit}
        >
          {t("add_to_queue")}
        </Button>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="block text-label uppercase text-content-muted mb-1.5">
            {t("full_name")}
          </span>
          <input
            value={form.fullName}
            onChange={(event) => setForm((f) => ({ ...f, fullName: event.target.value }))}
            autoComplete="off"
            className="w-full h-12 px-3.5 rounded-control bg-surface-raised border border-line-subtle
                       text-body text-content-primary focus:border-brand-gold focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="block text-label uppercase text-content-muted mb-1.5">
            {t("phone_number")}{" "}
            <span className="normal-case font-normal">({t("optional")})</span>
          </span>
          <input
            value={form.phoneNumber}
            onChange={(event) => setForm((f) => ({ ...f, phoneNumber: event.target.value }))}
            type="tel"
            inputMode="tel"
            dir="ltr"
            placeholder="03 123 456"
            className="w-full h-12 px-3.5 rounded-control bg-surface-raised border border-line-subtle
                       text-body text-content-primary tnum focus:border-brand-gold focus:outline-none"
          />
          <span className="block mt-1.5 text-caption text-content-muted">
            {t("walk_in_phone_hint")}
          </span>
        </label>

        <div>
          <h3 className="text-label uppercase text-content-muted mb-2">{t("step_barber")}</h3>
          {availableBarbers.length ? (
            <div className="space-y-2">
              {availableBarbers.map((barber) => (
                <button
                  key={barber.Id}
                  type="button"
                  onClick={() => {
                    setBarberId(barber.Id);
                    setServiceIds([]);
                  }}
                  aria-pressed={barberId === barber.Id}
                  className={`press w-full flex items-center gap-3 p-3 rounded-card border text-start transition-colors ${
                    barberId === barber.Id
                      ? "border-brand-gold bg-brand-gold-soft"
                      : "border-line-subtle bg-surface-raised"
                  }`}
                >
                  <span className="flex-1 text-body font-semibold text-content-primary truncate">
                    {barber.FullName}
                  </span>
                  {barberId === barber.Id ? (
                    <Icon name="check" size={18} className="text-brand-gold-text" />
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-content-muted">{t("no_barbers_body")}</p>
          )}
        </div>

        {barberId ? (
          <div>
            <h3 className="text-label uppercase text-content-muted mb-2">{t("step_service")}</h3>
            <div className="space-y-2">
              {barberServices.map((service) => (
                <ServiceCard
                  key={service.Id}
                  service={service}
                  selectable
                  selected={serviceIds.includes(service.Id)}
                  onSelect={() =>
                    setServiceIds((prev) =>
                      prev.includes(service.Id)
                        ? prev.filter((id) => id !== service.Id)
                        : [...prev, service.Id]
                    )
                  }
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </BottomSheet>
  );
}
