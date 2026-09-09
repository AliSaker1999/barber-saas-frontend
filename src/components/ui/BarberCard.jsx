import Icon from "./Icon";
import { Avatar, Pill, Rating } from "./Primitives";
import { formatWaitRange } from "../../utils/format";
import { useI18n } from "../../i18n";

/*
 * BarberCard.
 *
 * Two shapes for two jobs:
 *   "tile"      the shop-profile team rail — photo, name, specialty, rating,
 *               next availability
 *   "selectable" the booking flow's barber step — a full-width row that can be
 *               picked, including the "first available" option
 *
 * A barber who is not taking work today still appears, greyed with the reason,
 * because "my barber isn't in today" is information the customer needs.
 */

function availabilityLine(barber, t) {
  if (barber.isFirstAvailable) {
    return { tone: "gold", label: t("soonest_time") };
  }

  if (barber.waitMinutes != null && barber.isAcceptingWalkIns) {
    return { tone: "success", label: formatWaitRange(barber.waitMinutes, t) };
  }

  if (barber.nextSlotLabel) {
    return { tone: "info", label: t("next_at").replace("{time}", barber.nextSlotLabel) };
  }

  if (barber.isAvailable === false) {
    return { tone: "neutral", label: t("not_available_today") };
  }

  return null;
}

export default function BarberCard({
  barber,
  variant = "tile",
  selected = false,
  onSelect,
  disabled = false
}) {
  const { t } = useI18n();
  const name = barber.fullName || barber.FullName || barber.barberName || "";
  const photo = barber.profileImage || barber.ProfileImage || null;
  const rating = barber.averageRating ?? barber.AverageRating ?? null;
  const reviews = barber.reviewsCount ?? barber.ReviewsCount ?? 0;
  const specialty = barber.specialty || barber.Specialty || barber.Bio || null;
  const availability = availabilityLine(barber, t);

  if (variant === "selectable") {
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-pressed={selected}
        className={[
          "press w-full flex items-center gap-3 p-3 rounded-card border text-start transition-colors",
          selected
            ? "border-brand-gold bg-brand-gold-soft"
            : "border-line-subtle bg-surface-raised hover:bg-surface-sunken",
          disabled ? "opacity-55 pointer-events-none" : ""
        ].join(" ")}
      >
        {barber.isFirstAvailable ? (
          <span className="w-12 h-12 rounded-pill bg-brand-gold-soft text-brand-gold-text flex items-center justify-center flex-shrink-0">
            <Icon name="sparkle" size={22} />
          </span>
        ) : (
          <Avatar src={photo} name={name} size={48} />
        )}

        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-body font-bold text-content-primary truncate">
              {barber.isFirstAvailable ? t("first_available") : name}
            </span>
            {rating ? <Rating value={rating} compact size={12} /> : null}
          </span>

          {availability ? (
            <span
              className={`block text-body-sm font-semibold tnum mt-0.5 ${
                availability.tone === "success"
                  ? "text-state-success"
                  : availability.tone === "gold"
                  ? "text-brand-gold-text"
                  : availability.tone === "info"
                  ? "text-state-info"
                  : "text-content-muted"
              }`}
            >
              {availability.label}
            </span>
          ) : specialty ? (
            <span className="block text-caption text-content-muted truncate mt-0.5">{specialty}</span>
          ) : null}
        </span>

        <span
          aria-hidden="true"
          className={`w-6 h-6 rounded-pill border-2 flex items-center justify-center flex-shrink-0 ${
            selected ? "bg-brand-gold border-brand-gold text-content-on-gold" : "border-line-strong"
          }`}
        >
          {selected ? <Icon name="check" size={14} strokeWidth={2.75} /> : null}
        </span>
      </button>
    );
  }

  /* tile */
  return (
    <button
      type="button"
      onClick={onSelect}
      className="press w-[132px] flex-shrink-0 text-center p-3 rounded-card bg-surface-raised border border-line-subtle"
    >
      <Avatar src={photo} name={name} size={64} className="mx-auto" />
      <p className="mt-2.5 text-body-sm font-bold text-content-primary truncate">{name}</p>
      {specialty ? (
        <p className="text-caption text-content-muted truncate">{specialty}</p>
      ) : null}
      <div className="mt-1.5 flex justify-center">
        {rating ? (
          <Rating value={rating} count={reviews} compact size={12} />
        ) : (
          <span className="text-caption text-content-muted">{t("new_barber")}</span>
        )}
      </div>
      {availability ? (
        <div className="mt-2 flex justify-center">
          <Pill tone={availability.tone === "neutral" ? "neutral" : availability.tone}>
            {availability.label}
          </Pill>
        </div>
      ) : null}
    </button>
  );
}
