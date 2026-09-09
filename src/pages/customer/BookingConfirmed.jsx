import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAppDispatch } from "../../app/hooks";
import {
  createDepositCheckoutSessionThunk,
  reportAppointmentPaymentThunk,
  fetchCustomerAppointments
} from "../../features/appointments/appointmentsSlice";

import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import BookingSummary from "../../components/ui/BookingSummary";
import BottomSheet from "../../components/ui/BottomSheet";
import { Pill } from "../../components/ui/Primitives";
import { useI18n } from "../../i18n";
import { formatMoney, toDate } from "../../utils/format";
import { shopWhatsappHref, telHref } from "../../config/support";

/*
 * Booking confirmation (spec §11).
 *
 * The one moment in the flow that earns a bit of celebration — a single check
 * animation, then straight to what the customer does next: save it to their
 * calendar, get directions, or reach the shop.
 *
 * When a shop requires a deposit the appointment comes back as
 * AWAITING_PAYMENT (status 7). That is not a booked appointment yet, so the
 * screen says so plainly and puts payment first instead of congratulating
 * someone whose slot is still on hold.
 */

const AWAITING_PAYMENT = 7;

/* Builds a .ics file the OS calendar can import — no external calendar API,
   works offline, and does not need an account link. */
function buildIcs({ title, description, location, start, end }) {
  const stamp = (date) =>
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(
      date.getUTCDate()
    ).padStart(2, "0")}T${String(date.getUTCHours()).padStart(2, "0")}${String(
      date.getUTCMinutes()
    ).padStart(2, "0")}00Z`;

  const escape = (value) =>
    String(value || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ajmal//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@ajmal`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(title)}`,
    `DESCRIPTION:${escape(description)}`,
    `LOCATION:${escape(location)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

export default function BookingConfirmed({ booking, currency = "USD" }) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();

  const [payOpen, setPayOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [reporting, setReporting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  /* Memoised because `booking.shop || {}` would otherwise be a fresh object on
     every render and re-run every memo below it. */
  const shop = useMemo(() => booking.shop || {}, [booking.shop]);
  const needsDeposit = booking.statusId === AWAITING_PAYMENT;

  const address = useMemo(
    () => [shop.Street, shop.Building, shop.Area, shop.City].filter(Boolean).join(", "),
    [shop]
  );

  const mapsHref = useMemo(() => {
    if (shop.GoogleMapLink) return shop.GoogleMapLink;
    if (shop.Latitude != null && shop.Longitude != null) {
      return `https://www.google.com/maps/search/?api=1&query=${shop.Latitude},${shop.Longitude}`;
    }
    if (address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${shop.Name || ""} ${address}`
      )}`;
    }
    return null;
  }, [shop, address]);

  const addToCalendar = () => {
    const start = toDate(booking.startTime);
    if (!start) return;

    const end = booking.endTime
      ? toDate(booking.endTime)
      : new Date(start.getTime() + (booking.totalDuration || 30) * 60000);

    const ics = buildIcs({
      title: `${booking.services.map((s) => s.name).join(" + ")} · ${shop.Name || "Ajmal"}`,
      description: booking.barberName ? `${t("barber")}: ${booking.barberName}` : "",
      location: address || shop.Name || "",
      start,
      end
    });

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ajmal-booking.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    /* Revoke on the next tick — revoking synchronously can cancel the download
       on some Android WebViews. */
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const payByCard = async () => {
    setRedirecting(true);
    try {
      const result = await dispatch(
        createDepositCheckoutSessionThunk(booking.appointmentId)
      ).unwrap();
      if (result?.url) window.open(result.url, "_self");
      else setRedirecting(false);
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
      setRedirecting(false);
    }
  };

  const reportWhish = async () => {
    if (!reference.trim()) return;
    setReporting(true);
    try {
      await dispatch(
        reportAppointmentPaymentThunk({ id: booking.appointmentId, reference: reference.trim() })
      ).unwrap();
      dispatch(fetchCustomerAppointments());
      setPayOpen(false);
      toast.success(t("payment_reported"));
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="flex-1 px-4 pt-[calc(env(safe-area-inset-top)+2.5rem)]">
        {/* ---- headline ---- */}
        <div className="text-center">
          <span
            className={`inline-flex w-20 h-20 rounded-pill items-center justify-center animate-check ${
              needsDeposit
                ? "bg-state-warning-soft text-state-warning"
                : "bg-state-success-soft text-state-success"
            }`}
          >
            <Icon name={needsDeposit ? "wallet" : "check"} size={38} strokeWidth={2.5} />
          </span>

          <h1 className="mt-5 text-display text-content-primary">
            {needsDeposit ? t("queue_payment_title") : t("booked_title")}
          </h1>
          <p className="mt-1.5 text-body text-content-secondary max-w-[32ch] mx-auto">
            {needsDeposit
              ? t("deposit_policy", {
                  amount: formatMoney(booking.depositAmount, currency)
                })
              : t("booked_sub")}
          </p>

          {needsDeposit ? (
            <div className="mt-3 flex justify-center">
              <Pill tone="warning" icon="clock">
                {t("status_awaiting_payment")}
              </Pill>
            </div>
          ) : null}
        </div>

        {/* ---- summary ---- */}
        <div className="mt-7 animate-rise">
          <BookingSummary
            shopName={shop.Name}
            barberName={booking.barberName}
            services={booking.services}
            startTime={booking.startTime}
            currency={currency}
            totalPrice={booking.totalPrice}
            totalDuration={booking.totalDuration}
            discount={booking.discount}
            depositAmount={needsDeposit ? booking.depositAmount : null}
            cancellationHours={shop.CancellationPolicyHours}
            address={address || null}
            paymentNote={needsDeposit ? null : t("pay_at_shop")}
          />
        </div>

        {/* ---- next actions ---- */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button variant="secondary" icon="calendar" onClick={addToCalendar}>
            {t("add_to_calendar")}
          </Button>

          {mapsHref ? (
            <Button
              variant="secondary"
              icon="navigate"
              href={mapsHref}
              target="_blank"
              rel="noreferrer"
            >
              {t("get_directions")}
            </Button>
          ) : null}

          {shopWhatsappHref(shop.WhatsappNumber, `${t("booking_detail")} — ${shop.Name || ""}`) ? (
            <Button
              variant="secondary"
              icon="whatsapp"
              href={shopWhatsappHref(
                shop.WhatsappNumber,
                `${t("booking_detail")} — ${shop.Name || ""}`
              )}
              target="_blank"
              rel="noreferrer"
            >
              {t("contact_shop")}
            </Button>
          ) : telHref(shop.Phone) ? (
            <Button variant="secondary" icon="phone" href={telHref(shop.Phone)}>
              {t("contact_shop")}
            </Button>
          ) : null}
        </div>
      </div>

      {/* ---- footer ---- */}
      <div className="px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2.5">
        {needsDeposit ? (
          <Button
            block
            size="lg"
            icon="wallet"
            loading={redirecting}
            onClick={() =>
              shop.IsCreditCardPaymentEnabled ? payByCard() : setPayOpen(true)
            }
          >
            {t("pay_now")}
          </Button>
        ) : null}

        <Button block size="lg" variant={needsDeposit ? "secondary" : "primary"} to="/customer/bookings">
          {t("view_booking")}
        </Button>
        <Button block variant="ghost" to="/customer">
          {t("back_to_home")}
        </Button>
      </div>

      {/* ---- Whish manual transfer ---- */}
      <BottomSheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title={t("payment_options")}
        subtitle={shop.Name}
        footer={
          <Button block loading={reporting} disabled={!reference.trim()} onClick={reportWhish}>
            {t("confirm_transfer")}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="rounded-card bg-surface-sunken p-3.5">
            <p className="text-caption text-content-muted">{t("send_payment_to")}</p>
            <p className="text-h2 text-content-primary tnum">
              {booking.whishPhoneNumber || shop.WhishPhoneNumber || t("not_set")}
            </p>
            <p className="mt-2 text-caption text-content-muted">{t("amount_due")}</p>
            <p className="text-h3 text-content-primary tnum">
              {formatMoney(booking.depositAmount, currency)}
            </p>
          </div>

          <p className="text-body-sm text-content-secondary">{t("whish_instructions")}</p>

          <label className="block">
            <span className="block text-label uppercase text-content-muted mb-1.5">
              {t("transaction_id_label")}
            </span>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder={t("enter_transaction_id")}
              className="w-full h-12 px-3.5 rounded-control bg-surface-raised border border-line-subtle
                         text-body text-content-primary focus:border-brand-gold focus:outline-none"
            />
          </label>

          {shop.IsCreditCardPaymentEnabled ? (
            <Button variant="ghost" block icon="card" onClick={payByCard} loading={redirecting}>
              {t("credit_card")}
            </Button>
          ) : null}
        </div>
      </BottomSheet>
    </div>
  );
}
