import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchAppointments,
  acceptAppointment,
  declineAppointment,
  arriveForAppointment,
  completeAppointment,
  markNoShow,
  cancelAppointment,
  notifyCustomer,
  verifyPayment,
  clearAppointmentsError
} from "../../features/appointments/appointmentsSlice";
import { openChatWindow } from "../../features/chat/chatSlice";
import { fetchCustomerDetails, clearSelectedCustomer } from "../../features/customers/customersSlice";
import { getSocket } from "../../services/socket";

import TopBar from "../../components/ui/TopBar";
import Button, { IconButton } from "../../components/ui/Button";
import DayPicker from "../../components/ui/DayPicker";
import BottomSheet, { ConfirmSheet } from "../../components/ui/BottomSheet";
import CustomerModal from "../../components/CustomerModal";
import { FilterChip, Pill, SectionHeader } from "../../components/ui/Primitives";
import { PersonRow } from "../../components/shop/ShopDayComponents";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/ui/States";
import { useI18n } from "../../i18n";
import {
  dateRangeFor,
  formatMoney,
  formatTime,
  periodOfDay,
  toLocalDateString,
  toDate
} from "../../utils/format";
import {
  appointmentTotals,
  statusLabel,
  statusOf,
  statusTone
} from "../../utils/appointmentStatus";
import { shopWhatsappHref } from "../../config/support";

/*
 * The shop's bookings, day first.
 *
 * It is the "Calendar" tab, but a per-barber timeline grid cannot survive the
 * 360px Android screens this app targets, so the calendar metaphor is a day
 * strip: pick a day, see that day in time order. Ranges and the full history
 * are still reachable, behind a sheet, because they are the rare case.
 *
 * Status is read exclusively through utils/appointmentStatus so this screen
 * cannot disagree with Today or the customer's Bookings about what a booking
 * is — it previously compared status names inline and silently fell back to
 * "scheduled" for anything it didn't recognise.
 */

const PERIODS = ["morning", "afternoon", "evening"];

/* Status filters, in the order a shop cares about them. `payment` is not a
   status — it cuts across them — so it is kept visually separate. */
const FILTERS = [
  { id: "ALL", labelKey: "all_statuses" },
  { id: "PAYMENT", labelKey: "payment_pending", tone: "warning" },
  { id: "PENDING", labelKey: "status_pending" },
  { id: "SCHEDULED", labelKey: "status_scheduled" },
  { id: "AWAITING_PAYMENT", labelKey: "status_awaiting_payment" },
  { id: "COMPLETED", labelKey: "status_completed" },
  { id: "NO_SHOW", labelKey: "status_no_show" },
  { id: "CANCELLED", labelKey: "status_cancelled" },
  { id: "DECLINED", labelKey: "status_declined" }
];

function matchesFilter(appointment, filter) {
  if (filter === "ALL") return true;
  if (filter === "PAYMENT") return appointment.PaymentStatus === "PENDING";
  return statusOf(appointment) === filter;
}

export default function Appointments() {
  const { t, locale } = useI18n();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const { items, loading, error } = useAppSelector((state) => state.appointments);
  const user = useAppSelector((state) => state.auth.user);

  const isOwner = Boolean(user?.roles?.includes("ADMIN") || user?.roles?.includes("STAFF"));
  const tenantId = user?.tenantId;

  const [day, setDay] = useState(() => toLocalDateString());
  const [mode, setMode] = useState("day"); // day | upcoming | custom | all
  const [custom, setCustom] = useState({ startDate: "", endDate: "" });
  const [rangeOpen, setRangeOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [confirm, setConfirm] = useState(null);
  const [acting, setActing] = useState(false);
  const [declining, setDeclining] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);

  /* A push notification deep-links here naming one booking. The screen used to
     ignore it and default to today + scheduled, so tapping "new booking
     request" landed on a list that could not contain it. */
  const focusId = params.get("appointmentId");

  const range = useMemo(() => {
    if (mode === "day") return { startDate: day, endDate: day };
    return dateRangeFor(mode, custom);
  }, [mode, day, custom]);

  const load = useCallback(() => {
    /* A half-filled custom range would otherwise silently fetch nothing. */
    if (!range) return;
    dispatch(fetchAppointments(range));
  }, [dispatch, range]);

  useEffect(() => {
    load();
  }, [load]);

  /* When a notification names a booking, widen to upcoming so it is reachable
     whatever day it falls on. */
  useEffect(() => {
    if (focusId) setMode("upcoming");
  }, [focusId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !tenantId) return undefined;

    socket.emit("join-tenant", tenantId);
    const refresh = () => load();
    socket.on("appointments:update", refresh);

    /* Passing the handler — the bare `off("appointments:update")` this screen
       used removed every listener for the event, app-wide. */
    return () => {
      socket.off("appointments:update", refresh);
    };
  }, [tenantId, load]);

  /* One pass for every count, instead of eleven filter() sweeps per render. */
  const counts = useMemo(() => {
    const tally = { ALL: items.length, PAYMENT: 0 };
    items.forEach((appointment) => {
      if (appointment.PaymentStatus === "PENDING") tally.PAYMENT += 1;
      const status = statusOf(appointment);
      if (status) tally[status] = (tally[status] || 0) + 1;
    });
    return tally;
  }, [items]);

  const visible = useMemo(
    () =>
      [...items]
        .filter((appointment) => matchesFilter(appointment, filter))
        .sort((a, b) => toDate(a.StartTime) - toDate(b.StartTime)),
    [items, filter]
  );

  /* Grouped by time of day when looking at a single day; otherwise a flat list
     in time order, since the date is on every row. */
  const grouped = useMemo(() => {
    if (mode !== "day") return null;

    const groups = { morning: [], afternoon: [], evening: [] };
    visible.forEach((appointment) => {
      const date = toDate(appointment.StartTime);
      if (!date) return;
      const key = periodOfDay(`${String(date.getHours()).padStart(2, "0")}:00`);
      groups[key].push(appointment);
    });
    return groups;
  }, [visible, mode]);

  const revenue = useMemo(
    () =>
      visible
        .filter((a) => statusOf(a) === "COMPLETED")
        .reduce((sum, a) => sum + appointmentTotals(a).price, 0),
    [visible]
  );

  /* ---- actions ---- */
  const run = useCallback(
    async (thunk, successMessage) => {
      setActing(true);
      try {
        await dispatch(thunk).unwrap();
        if (successMessage) toast.success(successMessage);
        /* The socket is the only refresh path today, so an action's effect
           could be invisible whenever it is down. */
        load();
        setConfirm(null);
      } catch (err) {
        toast.error(typeof err === "string" ? err : t("error_generic"));
      } finally {
        setActing(false);
      }
    },
    [dispatch, load, t]
  );

  const submitDecline = async () => {
    if (!declining || !declineReason.trim()) return;
    setActing(true);
    try {
      await dispatch(
        declineAppointment({ id: declining.Id, reason: declineReason.trim() })
      ).unwrap();
      toast.success(t("request_declined"));
      setDeclining(null);
      setDeclineReason("");
      load();
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setActing(false);
    }
  };

  const openCustomer = (customerId) => {
    dispatch(fetchCustomerDetails({ customerId }));
    setCustomerOpen(true);
  };

  /* ---- a row ---- */
  const renderRow = (appointment) => {
    const status = statusOf(appointment);
    const { names, price } = appointmentTotals(appointment);
    const currency = appointment.Currency || "USD";
    const date = toDate(appointment.StartTime);
    const isFocused = focusId === appointment.Id;

    const meta = [
      mode !== "day" && date
        ? date.toLocaleDateString(locale === "ar" ? "ar-LB" : "en-US", {
            weekday: "short",
            month: "short",
            day: "numeric"
          })
        : null,
      /* The barber was hidden below `lg` before, so an owner on a phone could
         not tell whose booking they were looking at. */
      isOwner ? appointment.BarberName : null,
      price ? formatMoney(price, currency) : null
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <PersonRow
        key={appointment.Id}
        leading={formatTime(appointment.StartTime, locale)}
        name={appointment.CustomerName}
        photo={appointment.CustomerProfileImage}
        primary={names.join(" + ")}
        secondary={meta}
        tone={statusTone(appointment)}
        toneLabel={statusLabel(appointment, t)}
        highlight={isFocused}
        onOpen={() => openCustomer(appointment.CustomerId)}
        badges={
          <>
            {appointment.PaymentStatus === "PENDING" ? (
              <Pill tone="warning" icon="wallet">
                {t("verifying_label")}
              </Pill>
            ) : appointment.PaymentStatus === "PAID" ? (
              <Pill tone="success" icon="check">
                {t("paid_label")}
              </Pill>
            ) : appointment.PaymentStatus === "DEPOSIT_PAID" ? (
              /* Was collapsed into "Paid", so a deposit-only booking read as
                 fully settled. */
              <Pill tone="info" icon="wallet">
                {t("deposit_paid_label")}
              </Pill>
            ) : null}
            {appointment.NotificationSent ? (
              <Pill tone="info" icon="bell">
                {t("customer_called")}
              </Pill>
            ) : null}
          </>
        }
        actions={
          <>
            <IconButton
              icon="message"
              label={t("chat")}
              onClick={() => {
                dispatch(
                  openChatWindow({
                    barberId: appointment.BarberId,
                    customerId: appointment.CustomerId,
                    peerName: appointment.CustomerName
                  })
                );
                navigate("/company/conversations");
              }}
            />
            {shopWhatsappHref(appointment.CustomerPhone) ? (
              <IconButton
                icon="whatsapp"
                label={t("whatsapp_support")}
                onClick={() =>
                  window.open(shopWhatsappHref(appointment.CustomerPhone), "_blank")
                }
              />
            ) : null}

            {appointment.PaymentStatus === "PENDING" ? (
              <Button
                size="sm"
                icon="wallet"
                onClick={() =>
                  setConfirm({
                    title: t("verify_payment"),
                    message: t("verify_payment_message", { name: appointment.CustomerName }),
                    confirmLabel: t("verify_payment"),
                    destructive: false,
                    thunk: verifyPayment(appointment.Id),
                    success: t("payment_verified")
                  })
                }
              >
                {t("verify_payment")}
              </Button>
            ) : null}

            {status === "PENDING" ? (
              <>
                <Button
                  size="sm"
                  onClick={() =>
                    setConfirm({
                      title: t("accept"),
                      message: t("accept_booking_message", { name: appointment.CustomerName }),
                      confirmLabel: t("accept"),
                      destructive: false,
                      thunk: acceptAppointment(appointment.Id),
                      success: t("booking_accepted")
                    })
                  }
                >
                  {t("accept")}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setDeclining(appointment);
                    setDeclineReason("");
                  }}
                >
                  {t("decline")}
                </Button>
              </>
            ) : null}

            {status === "SCHEDULED" ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setConfirm({
                      title: t("check_in"),
                      /* Check-in converts the booking into a queue entry. The
                         old copy claimed it completed the appointment. */
                      message: t("check_in_message", { name: appointment.CustomerName }),
                      confirmLabel: t("check_in"),
                      destructive: false,
                      thunk: arriveForAppointment(appointment.Id),
                      success: t("checked_in")
                    })
                  }
                >
                  {t("check_in")}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setConfirm({
                      title: t("complete_service"),
                      message: t("complete_message", { name: appointment.CustomerName }),
                      confirmLabel: t("complete_service"),
                      destructive: false,
                      thunk: completeAppointment(appointment.Id),
                      success: t("marked_complete")
                    })
                  }
                >
                  {t("complete_service")}
                </Button>
                <IconButton
                  icon="bell"
                  label={t("notify_customer")}
                  onClick={() =>
                    setConfirm({
                      title: t("notify_customer"),
                      message: t("notify_booking_message", { name: appointment.CustomerName }),
                      confirmLabel: t("notify_customer"),
                      destructive: false,
                      thunk: notifyCustomer(appointment.Id),
                      success: t("customer_notified")
                    })
                  }
                />
                <IconButton
                  icon="alert"
                  label={t("mark_no_show")}
                  onClick={() =>
                    setConfirm({
                      title: t("mark_no_show"),
                      message: t("no_show_message", { name: appointment.CustomerName }),
                      confirmLabel: t("mark_no_show"),
                      destructive: true,
                      thunk: markNoShow(appointment.Id),
                      success: t("marked_no_show")
                    })
                  }
                />
                <IconButton
                  icon="x"
                  label={t("cancel_appointment")}
                  onClick={() =>
                    setConfirm({
                      title: t("cancel_appointment"),
                      message: t("cancel_booking_shop_message", {
                        name: appointment.CustomerName
                      }),
                      confirmLabel: t("cancel_appointment"),
                      destructive: true,
                      thunk: cancelAppointment(appointment.Id),
                      success: t("booking_cancelled_toast")
                    })
                  }
                />
              </>
            ) : null}
          </>
        }
      />
    );
  };

  const isFirstLoad = loading && !items.length;
  const modeLabel =
    mode === "day"
      ? t("today")
      : mode === "upcoming"
      ? t("filter_upcoming")
      : mode === "all"
      ? t("all_time")
      : t("custom_range");

  return (
    <div className="pb-6">
      <TopBar
        title={t("nav_calendar")}
        subtitle={isOwner ? undefined : t("my_bookings_subtitle")}
        actions={
          <>
            <IconButton icon="refresh" label={t("retry")} onClick={load} />
            <IconButton icon="calendar" label={t("custom_range")} onClick={() => setRangeOpen(true)} />
          </>
        }
      />

      {/* ---- day ---- */}
      {mode === "day" ? (
        <div className="px-4">
          <DayPicker value={day} onChange={setDay} maxDays={30} />
        </div>
      ) : (
        <div className="px-4 flex items-center gap-2">
          <Pill tone="gold">{modeLabel}</Pill>
          <button
            type="button"
            onClick={() => setMode("day")}
            className="text-caption font-semibold text-brand-gold-text py-1"
          >
            {t("back_to_day")}
          </button>
        </div>
      )}

      {/* ---- status filters ---- */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pt-3">
        {FILTERS.map((entry) => (
          <FilterChip
            key={entry.id}
            active={filter === entry.id}
            onClick={() => setFilter(entry.id)}
            count={counts[entry.id] || 0}
          >
            {t(entry.labelKey)}
          </FilterChip>
        ))}
      </div>

      {/* ---- list ---- */}
      <div className="px-4 pt-4">
        {isFirstLoad ? (
          <ListSkeleton count={4} height="h-[92px]" />
        ) : error && !items.length ? (
          <ErrorState
            message={error}
            onRetry={() => {
              dispatch(clearAppointmentsError());
              load();
            }}
          />
        ) : !visible.length ? (
          <EmptyState
            icon="calendar"
            title={t("no_appointments_today")}
            description={t("no_appointments_today_body")}
          />
        ) : grouped ? (
          <div className="space-y-6">
            {isOwner && revenue > 0 ? (
              <p className="text-body-sm text-content-secondary tnum">
                {t("revenue_today")}:{" "}
                <span className="font-bold text-content-primary">{formatMoney(revenue)}</span>
              </p>
            ) : null}

            {PERIODS.map((period) =>
              grouped[period].length ? (
                <section key={period}>
                  <SectionHeader title={t(period)} />
                  <div className="space-y-2.5">{grouped[period].map(renderRow)}</div>
                </section>
              ) : null
            )}
          </div>
        ) : (
          <div className="space-y-2.5">{visible.map(renderRow)}</div>
        )}
      </div>

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
        open={Boolean(declining)}
        onClose={() => setDeclining(null)}
        title={t("decline")}
        subtitle={declining?.CustomerName}
        footer={
          <Button
            block
            variant="danger-solid"
            loading={acting}
            disabled={!declineReason.trim()}
            onClick={submitDecline}
          >
            {t("decline")}
          </Button>
        }
      >
        <p className="text-body text-content-secondary">
          {t("decline_booking_message", { name: declining?.CustomerName || "" })}
        </p>
        <label className="block mt-4">
          <span className="block text-label uppercase text-content-muted mb-1.5">
            {t("reason_decline")}
          </span>
          <textarea
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            rows={3}
            className="w-full p-3.5 rounded-control bg-surface-raised border border-line-subtle
                       text-body text-content-primary focus:border-brand-gold focus:outline-none"
          />
          <span className="block mt-1.5 text-caption text-content-muted">
            {t("decline_reason_hint")}
          </span>
        </label>
      </BottomSheet>

      <BottomSheet
        open={rangeOpen}
        onClose={() => setRangeOpen(false)}
        title={t("custom_range")}
        footer={
          <Button
            block
            disabled={mode === "custom" && (!custom.startDate || !custom.endDate)}
            onClick={() => setRangeOpen(false)}
          >
            {t("done")}
          </Button>
        }
      >
        <div className="space-y-2">
          {[
            { id: "day", label: t("today") },
            { id: "upcoming", label: t("filter_upcoming") },
            { id: "custom", label: t("custom_range") },
            { id: "all", label: t("all_time") }
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setMode(option.id);
                if (option.id === "day") setDay(toLocalDateString());
              }}
              className={`press w-full flex items-center gap-3 p-3 rounded-card border text-start ${
                mode === option.id
                  ? "border-brand-gold bg-brand-gold-soft"
                  : "border-line-subtle bg-surface-raised"
              }`}
            >
              <span className="flex-1 text-body text-content-primary">{option.label}</span>
            </button>
          ))}
        </div>

        {mode === "custom" ? (
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {["startDate", "endDate"].map((field) => (
              <label key={field} className="block">
                <span className="block text-label uppercase text-content-muted mb-1.5">
                  {t(field === "startDate" ? "from_date" : "to_date")}
                </span>
                <input
                  type="date"
                  value={custom[field]}
                  onChange={(event) =>
                    setCustom((prev) => ({ ...prev, [field]: event.target.value }))
                  }
                  className="w-full h-12 px-3 rounded-control bg-surface-raised border border-line-subtle
                             text-body text-content-primary tnum focus:border-brand-gold focus:outline-none"
                />
              </label>
            ))}
          </div>
        ) : null}

        {mode === "all" ? (
          /* This asks for the shop's entire history in one unpaginated
             response — worth warning about rather than silently doing. */
          <p className="mt-4 text-caption text-content-muted">{t("all_time_warning")}</p>
        ) : null}
      </BottomSheet>

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
