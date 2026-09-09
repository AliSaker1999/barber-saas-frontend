import Icon from "./Icon";
import { formatDuration, formatMoney, formatLongDate, formatTime } from "../../utils/format";
import { useI18n } from "../../i18n";

/*
 * BookingSummary — the single review block shown before "Confirm booking", and
 * again on the confirmation screen and the booking detail sheet.
 *
 * One component for all three so the customer sees the same numbers, in the
 * same order, at every step. Deposit and cancellation policy render *inside*
 * this block, because a policy discovered after payment is a complaint
 * waiting to happen (spec §9, §30).
 */

function Line({ icon, label, value, sub, emphasis = false }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="w-8 h-8 rounded-control bg-surface-sunken text-content-secondary flex items-center justify-center flex-shrink-0">
        <Icon name={icon} size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-caption text-content-muted">{label}</p>
        <p
          className={`text-body text-content-primary truncate ${
            emphasis ? "font-bold" : "font-medium"
          }`}
        >
          {value}
        </p>
        {sub ? <p className="text-caption text-content-muted tnum">{sub}</p> : null}
      </div>
    </div>
  );
}

export default function BookingSummary({
  shopName,
  barberName,
  services = [],
  startTime,
  currency = "USD",
  totalPrice,
  totalDuration,
  discount = 0,
  depositAmount = null,
  cancellationHours = null,
  address = null,
  paymentNote = null,
  className = ""
}) {
  const { t, locale } = useI18n();

  const serviceLabel = services.map((s) => s.name || s.Name).filter(Boolean).join(" + ");
  const price = Number(totalPrice) || 0;
  const finalPrice = Math.max(0, price - (Number(discount) || 0));

  return (
    <div className={`bg-surface-raised border border-line-subtle rounded-card ${className}`}>
      <div className="px-4 divide-y divide-line-subtle">
        {serviceLabel ? (
          <Line
            icon="scissors"
            label={t("service")}
            value={serviceLabel}
            sub={totalDuration ? formatDuration(totalDuration, t) : null}
            emphasis
          />
        ) : null}

        {barberName ? <Line icon="user" label={t("barber")} value={barberName} /> : null}

        {startTime ? (
          <Line
            icon="calendar"
            label={t("when")}
            value={formatLongDate(startTime, locale)}
            sub={formatTime(startTime, locale)}
            emphasis
          />
        ) : null}

        {shopName ? <Line icon="pin" label={t("shop")} value={shopName} sub={address} /> : null}
      </div>

      <div className="border-t border-line-subtle px-4 py-3 space-y-1.5">
        {discount > 0 ? (
          <>
            <div className="flex items-center justify-between text-body-sm text-content-secondary">
              <span>{t("subtotal")}</span>
              <span className="tnum">{formatMoney(price, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-body-sm text-state-success">
              <span>{t("discount")}</span>
              <span className="tnum">−{formatMoney(discount, currency)}</span>
            </div>
          </>
        ) : null}

        <div className="flex items-center justify-between">
          <span className="text-body font-bold text-content-primary">{t("total")}</span>
          <span className="text-h2 text-content-primary tnum">
            {formatMoney(finalPrice, currency)}
          </span>
        </div>

        {paymentNote ? (
          <p className="text-caption text-content-muted pt-0.5">{paymentNote}</p>
        ) : null}
      </div>

      {/* Policies, visible before the customer commits. */}
      {depositAmount || cancellationHours ? (
        <div className="border-t border-line-subtle px-4 py-3 space-y-2">
          {depositAmount ? (
            <p className="flex items-start gap-2 text-caption text-content-secondary">
              <Icon name="wallet" size={14} className="mt-0.5 flex-shrink-0 text-content-muted" />
              <span>
                {t("deposit_policy").replace("{amount}", formatMoney(depositAmount, currency))}
              </span>
            </p>
          ) : null}

          {cancellationHours ? (
            <p className="flex items-start gap-2 text-caption text-content-secondary">
              <Icon name="info" size={14} className="mt-0.5 flex-shrink-0 text-content-muted" />
              <span>{t("cancellation_policy").replace("{hours}", cancellationHours)}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
