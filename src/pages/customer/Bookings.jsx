import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchCustomerAppointments,
  cancelAppointment
} from "../../features/appointments/appointmentsSlice";
import { fetchTenants } from "../../features/tenants/tenantsSlice";
import { selectTenant, startReschedule, setSelectedServices, selectBarber } from "../../features/booking/bookingSlice";
import { getSocket } from "../../services/socket";

import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import BottomSheet, { ConfirmSheet } from "../../components/ui/BottomSheet";
import BookingSummary from "../../components/ui/BookingSummary";
import RateBarberModal from "../../components/RateBarberModal";
import { Avatar, Pill } from "../../components/ui/Primitives";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/ui/States";
import { useI18n } from "../../i18n";
import {
  formatCountdown,
  formatMoney,
  formatRelativeDay,
  formatTime,
  toDate
} from "../../utils/format";
import {
  appointmentTotals,
  isActive,
  isCompleted,
  statusLabel,
  statusTone,
  statusOf
} from "../../utils/appointmentStatus";
import { shopWhatsappHref, telHref } from "../../config/support";

/*
 * Bookings (spec §13).
 *
 * Upcoming first and prominent, past behind a tab with one job: book again.
 * Rebooking is the behaviour the business runs on, so "Book again" carries the
 * previous barber and services straight into the flow rather than dropping the
 * customer at the shop page to reconstruct their own order.
 */

function CancellationBlocked({ hours }) {
  const { t } = useI18n();
  return (
    <p className="flex items-start gap-2 text-caption text-content-secondary">
      <Icon name="info" size={14} className="mt-0.5 flex-shrink-0 text-content-muted" />
      <span>{t("cancel_window_passed", { hours })}</span>
    </p>
  );
}

function BookingCard({ appointment, shop, onOpen, past = false }) {
  const { t, locale } = useI18n();
  const { names, price } = appointmentTotals(appointment);
  const currency = appointment.Currency || shop?.Currency || "USD";
  const date = toDate(appointment.StartTime);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="press w-full text-start bg-surface-raised border border-line-subtle rounded-card p-3.5"
    >
      <div className="flex items-start gap-3">
        {/* Date block — tabular so a column of cards lines up. */}
        <span className="w-12 flex-shrink-0 text-center py-1 rounded-control bg-surface-sunken">
          <span className="block text-[10px] font-bold uppercase text-content-muted">
            {date?.toLocaleDateString(locale === "ar" ? "ar-LB" : "en-US", { month: "short" })}
          </span>
          <span className="block text-h3 text-content-primary tnum leading-tight">
            {date?.getDate()}
          </span>
        </span>

        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="flex-1 text-body font-bold text-content-primary truncate">
              {names.join(" + ") || t("book_appointment")}
            </span>
            <Pill tone={statusTone(appointment)}>{statusLabel(appointment, t)}</Pill>
          </span>

          <span className="mt-1 block text-body-sm text-content-secondary tnum">
            {formatRelativeDay(appointment.StartTime, t, locale)} ·{" "}
            {formatTime(appointment.StartTime, locale)}
            {!past && isActive(appointment) ? (
              <span className="text-brand-gold-text font-semibold">
                {" "}
                · {formatCountdown(appointment.StartTime, t)}
              </span>
            ) : null}
          </span>

          <span className="mt-1.5 flex items-center gap-2 min-w-0">
            <Avatar
              src={appointment.BarberProfileImage}
              name={appointment.BarberName}
              size={22}
            />
            <span className="flex-1 text-caption text-content-muted truncate">
              {appointment.BarberName}
              {appointment.TenantName ? ` · ${appointment.TenantName}` : ""}
            </span>
            {price ? (
              <span className="text-caption font-semibold text-content-secondary tnum flex-shrink-0">
                {formatMoney(price, currency)}
              </span>
            ) : null}
          </span>
        </span>
      </div>
    </button>
  );
}

export default function Bookings() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const { items, loading, error } = useAppSelector((state) => state.appointments);
  const shops = useAppSelector((state) => state.tenants.tenants);

  const tab = params.get("tab") === "past" ? "past" : "upcoming";
  const openId = params.get("id");

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [rateFor, setRateFor] = useState(null);

  const load = useCallback(() => {
    dispatch(fetchCustomerAppointments());
  }, [dispatch]);

  useEffect(() => {
    load();
    if (!shops.length) dispatch(fetchTenants());
  }, [load, dispatch, shops.length]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on("appointments:update", load);
    return () => socket.off("appointments:update", load);
  }, [load]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up = [];
    const done = [];

    items.forEach((appointment) => {
      const date = toDate(appointment.StartTime);
      const future = date && date.getTime() > now;
      if (isActive(appointment) && future) up.push(appointment);
      else done.push(appointment);
    });

    up.sort((a, b) => toDate(a.StartTime) - toDate(b.StartTime));
    done.sort((a, b) => toDate(b.StartTime) - toDate(a.StartTime));
    return { upcoming: up, past: done };
  }, [items]);

  const opened = useMemo(
    () => items.find((appointment) => appointment.Id === openId) || null,
    [items, openId]
  );

  const openedShop = shops.find((s) => s.Id === opened?.TenantId) || null;

  const setTab = (next) => {
    setParams((current) => {
      const params2 = new URLSearchParams(current);
      if (next === "upcoming") params2.delete("tab");
      else params2.set("tab", next);
      params2.delete("id");
      return params2;
    });
  };

  const openDetail = (appointment) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("id", appointment.Id);
      return next;
    });
  };

  const closeDetail = () => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("id");
      return next;
    });
  };

  /* A shop's cancellation window is a promise the app has to keep on both
     sides: inside it, the customer is told to call rather than being handed a
     button that the server will reject. */
  const cancellationHours = (appointment) => {
    const shop = shops.find((s) => s.Id === appointment.TenantId);
    return shop?.CancellationPolicyHours ?? null;
  };

  const canCancel = (appointment) => {
    const hours = cancellationHours(appointment);
    if (!hours) return true;
    const date = toDate(appointment.StartTime);
    if (!date) return true;
    return date.getTime() - Date.now() > hours * 3600000;
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await dispatch(cancelAppointment(cancelTarget.Id)).unwrap();
      setCancelTarget(null);
      closeDetail();
      toast.success(t("booking_cancelled_toast"));
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setCancelling(false);
    }
  };

  const rebook = (appointment) => {
    dispatch(selectTenant(appointment.TenantId));
    dispatch(setSelectedServices((appointment.services || []).map((s) => s.id)));
    dispatch(selectBarber(appointment.BarberId));
    closeDetail();
    navigate(
      `/customer/book?shop=${appointment.TenantId}&barber=${appointment.BarberId}` +
        `&services=${(appointment.services || []).map((s) => s.id).join(",")}`
    );
  };

  const reschedule = (appointment) => {
    dispatch(
      startReschedule({
        appointmentId: appointment.Id,
        tenantId: appointment.TenantId,
        barberId: appointment.BarberId,
        startTime: appointment.StartTime
      })
    );
    dispatch(selectTenant(appointment.TenantId));
    dispatch(setSelectedServices((appointment.services || []).map((s) => s.id)));
    dispatch(selectBarber(appointment.BarberId));
    closeDetail();
    navigate(`/customer/book?shop=${appointment.TenantId}&step=2`);
  };

  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="pb-4">
      <TopBar title={t("bookings_title")} />

      {/* ---- tabs ---- */}
      <div className="px-4">
        <div
          role="tablist"
          className="flex gap-1 p-1 rounded-control bg-surface-sunken"
        >
          {[
            { id: "upcoming", label: t("tab_upcoming"), count: upcoming.length },
            { id: "past", label: t("tab_past"), count: past.length }
          ].map((entry) => (
            <button
              key={entry.id}
              role="tab"
              aria-selected={tab === entry.id}
              onClick={() => setTab(entry.id)}
              className={`flex-1 h-10 rounded-[10px] text-body-sm font-semibold transition-colors ${
                tab === entry.id
                  ? "bg-surface-raised text-content-primary shadow-sm"
                  : "text-content-secondary"
              }`}
            >
              {entry.label}
              {entry.count ? <span className="ms-1.5 tnum opacity-70">{entry.count}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {/* ---- list ---- */}
      <div className="px-4 pt-4">
        {loading && !items.length ? (
          <ListSkeleton count={3} height="h-[104px]" />
        ) : error && !items.length ? (
          <ErrorState message={error} onRetry={load} />
        ) : !list.length ? (
          <EmptyState
            icon="calendar"
            title={tab === "upcoming" ? t("no_upcoming_title") : t("no_past_title")}
            description={tab === "upcoming" ? t("no_upcoming_body") : t("no_past_body")}
            actionLabel={tab === "upcoming" ? t("find_a_barber") : null}
            actionTo="/customer/explore"
          />
        ) : (
          <div className="space-y-3">
            {list.map((appointment) => (
              <BookingCard
                key={appointment.Id}
                appointment={appointment}
                shop={shops.find((s) => s.Id === appointment.TenantId)}
                past={tab === "past"}
                onOpen={() => openDetail(appointment)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---- detail sheet ---- */}
      <BottomSheet
        open={Boolean(opened)}
        onClose={closeDetail}
        title={t("booking_detail")}
        subtitle={opened?.TenantName}
        footer={
          opened ? (
            <div className="space-y-2.5">
              {isActive(opened) ? (
                <>
                  <div className="flex gap-2.5">
                    <Button variant="secondary" block icon="calendar" onClick={() => reschedule(opened)}>
                      {t("reschedule")}
                    </Button>
                    <Button
                      variant="danger"
                      block
                      disabled={!canCancel(opened)}
                      onClick={() => setCancelTarget(opened)}
                    >
                      {t("cancel_appointment")}
                    </Button>
                  </div>
                  {!canCancel(opened) ? (
                    <CancellationBlocked hours={cancellationHours(opened)} />
                  ) : null}
                </>
              ) : (
                <div className="flex gap-2.5">
                  {isCompleted(opened) ? (
                    <Button
                      variant="secondary"
                      block
                      icon="star"
                      onClick={() =>
                        setRateFor({ barberId: opened.BarberId, appointmentId: opened.Id })
                      }
                    >
                      {t("rate_barber")}
                    </Button>
                  ) : null}
                  <Button block icon="refresh" onClick={() => rebook(opened)}>
                    {t("book_again")}
                  </Button>
                </div>
              )}
            </div>
          ) : null
        }
      >
        {opened ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Pill tone={statusTone(opened)}>{statusLabel(opened, t)}</Pill>
              {opened.PaymentStatus === "PAID" ? (
                <Pill tone="success" icon="check">
                  {t("paid_label")}
                </Pill>
              ) : null}
            </div>

            {statusOf(opened) === "DECLINED" && opened.DeclineReason ? (
              <div className="rounded-card bg-state-danger-soft p-3.5">
                <p className="text-caption text-content-muted">{t("reason_decline")}</p>
                <p className="text-body-sm text-content-primary">{opened.DeclineReason}</p>
              </div>
            ) : null}

            <BookingSummary
              shopName={opened.TenantName}
              barberName={opened.BarberName}
              services={opened.services}
              startTime={opened.StartTime}
              currency={opened.Currency || openedShop?.Currency || "USD"}
              totalPrice={appointmentTotals(opened).price}
              totalDuration={appointmentTotals(opened).duration}
              cancellationHours={cancellationHours(opened)}
              address={
                [opened.TenantStreet, opened.TenantArea, opened.TenantCity]
                  .filter(Boolean)
                  .join(", ") || null
              }
            />

            <div className="flex flex-wrap gap-2">
              {opened.TenantMapLink ||
              (opened.TenantLatitude != null && opened.TenantLongitude != null) ? (
                <Button
                  variant="secondary"
                  size="sm"
                  icon="navigate"
                  href={
                    opened.TenantMapLink ||
                    `https://www.google.com/maps/search/?api=1&query=${opened.TenantLatitude},${opened.TenantLongitude}`
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("get_directions")}
                </Button>
              ) : null}
              {telHref(opened.TenantPhone) ? (
                <Button variant="secondary" size="sm" icon="phone" href={telHref(opened.TenantPhone)}>
                  {t("call")}
                </Button>
              ) : null}
              {shopWhatsappHref(opened.TenantWhatsapp) ? (
                <Button
                  variant="secondary"
                  size="sm"
                  icon="whatsapp"
                  href={shopWhatsappHref(opened.TenantWhatsapp)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("contact_shop")}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </BottomSheet>

      <ConfirmSheet
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        loading={cancelling}
        title={t("cancel_booking_title")}
        message={t("cancel_booking_message")}
        confirmLabel={t("cancel_booking_confirm")}
        cancelLabel={t("keep_booking")}
      />

      <RateBarberModal
        isOpen={Boolean(rateFor)}
        barberId={rateFor?.barberId}
        appointmentId={rateFor?.appointmentId}
        onClose={() => setRateFor(null)}
        onSuccess={() => {
          toast.success(t("thank_you_rating"));
          load();
        }}
      />
    </div>
  );
}
