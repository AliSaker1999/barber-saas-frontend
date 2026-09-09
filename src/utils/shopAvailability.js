import { formatWaitRange } from "./format";

/*
 * The one availability line a shop card shows.
 *
 * Availability is the reason a customer opens Ajmal, so this is deliberately
 * ordered by usefulness rather than by data shape:
 *
 *   1. can I walk in right now, and for how long would I wait
 *   2. the shop is open but appointments only
 *   3. closed today
 *   4. closed now, opens at …
 *
 * Kept out of the component file so the shop card, the shop profile hero and
 * the map pins can never describe the same shop differently.
 */
export function shopAvailability(shop, t) {
  if (!shop) return null;

  if (shop.WalkInAvailable) {
    return {
      tone: "success",
      live: true,
      icon: "clock",
      label: formatWaitRange(shop.MinWaitMinutes ?? 0, t),
      detail:
        shop.BarbersOnDutyNow > 0 ? t("barbers_on_now", { n: shop.BarbersOnDutyNow }) : null
    };
  }

  if (shop.IsOpenNow) {
    return {
      tone: "info",
      live: false,
      icon: "calendar",
      label: shop.AppointmentsAvailableToday ? t("booking_only_now") : t("open_now"),
      detail: shop.ClosesAt ? t("until_time", { time: trimSeconds(shop.ClosesAt) }) : null
    };
  }

  if (shop.IsClosedToday) {
    return { tone: "neutral", live: false, icon: "clock", label: t("closed_today"), detail: null };
  }

  return {
    tone: "neutral",
    live: false,
    icon: "clock",
    label: shop.OpensAt ? t("opens_at", { time: trimSeconds(shop.OpensAt) }) : t("closed_now"),
    detail: null
  };
}

/* Opening hours arrive as "HH:MM:SS"; nobody says the seconds out loud. */
export function trimSeconds(time) {
  return typeof time === "string" ? time.slice(0, 5) : time;
}
