import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAppDispatch } from "../../app/hooks";
import { createDepositCheckoutSession } from "../../features/publicBooking/publicBookingSlice";

import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import BookingSummary from "../../components/ui/BookingSummary";
import BottomSheet from "../../components/ui/BottomSheet";
import { Pill } from "../../components/ui/Primitives";
import { useI18n } from "../../i18n";
import { formatMoney, toDate } from "../../utils/format";
import { shopAddress, shopMapsHref } from "../../utils/shopLinks";
import { shopWhatsappHref, telHref } from "../../config/support";

/*
 * Guest booking confirmation.
 *
 * Deliberately the same shape as the in-app BookingConfirmed screen: one check
 * animation, the summary, then the three things a customer actually wants next
 * — the date in their calendar, directions, and a way to reach the shop.
 *
 * A shop that requires a deposit returns the appointment as AWAITING_PAYMENT.
 * That is not a confirmed booking, so the screen says so and leads with
 * payment instead of congratulating someone whose slot is still on hold.
 */

const AWAITING_PAYMENT = 7;

/* An .ics file the OS calendar imports directly — no calendar API, no account
   linking, and it works offline. */
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

export default function PublicBookingDone({ booking, currency = "USD", slug }) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();

  const [payOpen, setPayOpen] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const shop = useMemo(() => booking.shop || {}, [booking.shop]);
  const needsDeposit = booking.statusId === AWAITING_PAYMENT;

  const address = useMemo(() => shopAddress(shop), [shop]);
  const mapsHref = useMemo(() => shopMapsHref(shop), [shop]);

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
    /* Revoked on the next tick — doing it synchronously cancels the download
       on some Android WebViews. */
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const payByCard = async () => {
    setRedirecting(true);
    try {
      const result = await dispatch(createDepositCheckoutSession(booking.appointmentId)).unwrap();
      if (result?.url) window.open(result.url, "_self");
      else setRedirecting(false);
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
      setRedirecting(false);
    }
  };

  const whatsapp = shopWhatsappHref(shop.WhatsappNumber, `${t("booking_detail")} — ${shop.Name || ""}`);
  const phone = telHref(shop.Phone);

  return (
    <div className="min-h-[100dvh] bg-surface-base flex flex-col">
      <div className="flex-1 px-4 pt-[calc(env(safe-area-inset-top)+2.5rem)]">
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
              ? t("deposit_policy", { amount: formatMoney(booking.depositAmount, currency) })
              : t("booked_sub_guest")}
          </p>

          {needsDeposit ? (
            <div className="mt-3 flex justify-center">
              <Pill tone="warning" icon="clock">
                {t("status_awaiting_payment")}
              </Pill>
            </div>
          ) : null}
        </div>

        <div className="mt-7 animate-rise">
          <BookingSummary
            shopName={shop.Name}
            barberName={booking.barberName}
            services={booking.services}
            startTime={booking.startTime}
            currency={currency}
            totalPrice={booking.totalPrice}
            totalDuration={booking.totalDuration}
            depositAmount={needsDeposit ? booking.depositAmount : null}
            cancellationHours={shop.CancellationPolicyHours}
            address={address}
            paymentNote={needsDeposit ? null : t("pay_at_shop")}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button variant="secondary" icon="calendar" onClick={addToCalendar}>
            {t("add_to_calendar")}
          </Button>

          {mapsHref ? (
            <Button variant="secondary" icon="navigate" href={mapsHref} target="_blank" rel="noreferrer">
              {t("get_directions")}
            </Button>
          ) : null}

          {whatsapp ? (
            <Button variant="secondary" icon="whatsapp" href={whatsapp} target="_blank" rel="noreferrer">
              {t("contact_shop")}
            </Button>
          ) : phone ? (
            <Button variant="secondary" icon="phone" href={phone}>
              {t("contact_shop")}
            </Button>
          ) : null}
        </div>

        {/* A guest has no bookings list to return to, so the honest next step
            is the shop itself — and a nudge that the app remembers for them. */}
        <p className="mt-6 text-caption text-content-muted text-center max-w-[34ch] mx-auto">
          {t("guest_no_account_note")}
        </p>
      </div>

      <div className="px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2.5">
        {needsDeposit ? (
          <Button
            block
            size="lg"
            icon="wallet"
            loading={redirecting}
            onClick={() => (shop.IsCreditCardPaymentEnabled ? payByCard() : setPayOpen(true))}
          >
            {t("pay_now")}
          </Button>
        ) : null}

        <Button block size="lg" variant={needsDeposit ? "secondary" : "primary"} to={`/book/${slug}`}>
          {t("back_to_shop")}
        </Button>
      </div>

      {/* Manual Whish transfer — the Lebanese default where card isn't on. */}
      <BottomSheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title={t("payment_options")}
        subtitle={shop.Name}
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
          <p className="text-caption text-content-muted">{t("guest_whish_note")}</p>
        </div>
      </BottomSheet>
    </div>
  );
}
