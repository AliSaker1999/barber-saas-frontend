import Icon from "./Icon";
import { formatDuration, formatMoney } from "../../utils/format";
import { useI18n } from "../../i18n";

/*
 * ServiceCard — name, duration, price. Nothing else.
 *
 * Duration and price are always both visible and always tabular, so a column
 * of services reads as a price list rather than a set of unrelated cards.
 * `selectable` turns it into a booking-step row with a checkbox.
 */
export default function ServiceCard({
  service,
  currency = "USD",
  selected = false,
  onSelect,
  selectable = false,
  disabled = false
}) {
  const { t } = useI18n();

  const name = service.Name || service.name;
  const duration = service.DurationMinutes ?? service.durationMinutes ?? service.duration;
  const price = service.Price ?? service.price;

  const body = (
    <>
      <span className="flex-1 min-w-0">
        <span className="block text-body font-semibold text-content-primary truncate">{name}</span>
        <span className="block text-caption text-content-muted tnum mt-0.5">
          {formatDuration(duration, t)}
        </span>
      </span>

      <span className="text-body font-bold text-content-primary tnum flex-shrink-0">
        {formatMoney(price, currency)}
      </span>

      {selectable ? (
        <span
          aria-hidden="true"
          className={`w-6 h-6 rounded-control border-2 flex items-center justify-center flex-shrink-0 ${
            selected ? "bg-brand-gold border-brand-gold text-content-on-gold" : "border-line-strong"
          }`}
        >
          {selected ? <Icon name="check" size={14} strokeWidth={2.75} /> : null}
        </span>
      ) : null}
    </>
  );

  const classes = [
    "w-full flex items-center gap-3 p-3.5 rounded-card border text-start transition-colors",
    selectable ? "press" : "",
    selected
      ? "border-brand-gold bg-brand-gold-soft"
      : "border-line-subtle bg-surface-raised",
    selectable && !selected ? "hover:bg-surface-sunken" : "",
    disabled ? "opacity-55 pointer-events-none" : ""
  ]
    .filter(Boolean)
    .join(" ");

  if (!selectable) {
    return <div className={classes}>{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      disabled={disabled}
      className={classes}
    >
      {body}
    </button>
  );
}
