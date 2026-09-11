/*
 * Display formatting for money, time and waits.
 *
 * Money rule (spec §19): a shop's prices are quoted in that shop's own
 * currency and are NEVER converted. `formatMoney` renders whatever currency
 * the shop set; there is deliberately no exchange-rate code anywhere in the
 * client.
 */

export const SUPPORTED_CURRENCIES = ["USD", "LBP"];

const CURRENCY_CONFIG = {
  USD: { symbol: "$", position: "before", decimals: 0, step: 1 },
  /* LBP is quoted in whole pounds and grouped — 1500000 reads as "1,500,000 L.L." */
  LBP: { symbol: "L.L.", position: "after", decimals: 0, step: 1000 }
};

export function normalizeCurrency(currency) {
  const code = String(currency || "USD").toUpperCase();
  return CURRENCY_CONFIG[code] ? code : "USD";
}

export function formatMoney(amount, currency = "USD") {
  const code = normalizeCurrency(currency);
  const config = CURRENCY_CONFIG[code];

  /*
   * null/undefined/"" are "no price set", not zero. Number(null) is 0, so
   * without this guard a service whose price the shop hasn't filled in
   * advertises itself as free.
   */
  if (amount === null || amount === undefined || amount === "") return "—";

  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";

  // Latin digits in both locales: Lebanese price lists are written in Latin
  // numerals even in Arabic copy, and mixing digit systems reads as a bug.
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: config.decimals
  }).format(value);

  return config.position === "before"
    ? `${config.symbol}${formatted}`
    : `${formatted} ${config.symbol}`;
}

/* A price band for a shop card: "$15–$30", or a single price when they match. */
export function formatPriceRange(min, max, currency = "USD") {
  if (min == null && max == null) return null;
  if (min == null || max == null || Number(min) === Number(max)) {
    return formatMoney(min ?? max, currency);
  }
  return `${formatMoney(min, currency)}–${formatMoney(max, currency)}`;
}

/* "45 min" / "1h 15m" — never "45.0 minutes". */
export function formatDuration(minutes, t) {
  const total = Math.round(Number(minutes) || 0);
  if (total <= 0) return t ? t("duration_none") : "—";
  if (total < 60) return t ? t("minutes_short", { n: total }) : `${total} min`;

  const hours = Math.floor(total / 60);
  const mins = total % 60;
  const hourPart = t ? t("hours_short", { n: hours }) : `${hours}h`;
  if (!mins) return hourPart;
  const minPart = t ? t("minutes_short", { n: mins }) : `${mins}m`;
  return `${hourPart} ${minPart}`;
}

/*
 * Queue ETAs are an estimate, so they are shown as an honest range rather than
 * a false-precision single number: 25 minutes becomes "about 20–30 min".
 * Bucket width grows with the wait, because a 90-minute estimate is not
 * accurate to five minutes.
 */
export function formatWaitRange(minutes, t) {
  const value = Math.max(0, Math.round(Number(minutes) || 0));

  if (value === 0) return t ? t("wait_none") : "No wait";
  if (value <= 10) return t ? t("wait_under", { n: 10 }) : "Under 10 min";

  const bucket = value <= 30 ? 5 : value <= 60 ? 10 : 15;
  const low = Math.max(bucket, Math.floor((value - bucket / 2) / bucket) * bucket);
  const high = low + bucket * 2;

  return t ? t("wait_range", { low, high }) : `About ${low}–${high} min`;
}

/* Local wall-clock time, e.g. "6:30 PM" / "18:30" depending on locale. */
export function formatTime(value, locale = "en") {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleTimeString(locale === "ar" ? "ar-LB" : "en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatDay(value, locale = "en") {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString(locale === "ar" ? "ar-LB" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export function formatLongDate(value, locale = "en") {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString(locale === "ar" ? "ar-LB" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

/* "Today" / "Tomorrow" / "Sat, Mar 8" — the label a person would actually say. */
export function formatRelativeDay(value, t, locale = "en") {
  const date = toDate(value);
  if (!date) return "";

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);

  if (days === 0) return t ? t("today") : "Today";
  if (days === 1) return t ? t("tomorrow") : "Tomorrow";
  if (days === -1) return t ? t("yesterday") : "Yesterday";
  return formatDay(date, locale);
}

/*
 * The backend hands back appointment times as local wall-clock strings without
 * a zone ("2026-03-08T18:30:00", via SQL CONVERT style 126). Appending a "Z"
 * or letting some engines guess UTC shifts every appointment by the device
 * offset, so parse the parts explicitly when there is no zone marker.
 */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === "string") {
    const naive = value.match(
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/
    );
    if (naive) {
      const [, y, mo, d, h, mi, s] = naive;
      return new Date(+y, +mo - 1, +d, +h, +mi, +(s || 0));
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/* "in 25 min" / "in 3 h" / "now" — for countdowns to an upcoming appointment. */
export function formatCountdown(value, t) {
  const date = toDate(value);
  if (!date) return "";

  const diffMin = Math.round((date.getTime() - Date.now()) / 60000);
  if (diffMin <= 0) return t ? t("now") : "Now";
  if (diffMin < 60) return t ? t("in_minutes", { n: diffMin }) : `in ${diffMin} min`;

  const hours = Math.round(diffMin / 60);
  if (hours < 24) return t ? t("in_hours", { n: hours }) : `in ${hours} h`;

  const days = Math.round(hours / 24);
  return t ? t("in_days", { n: days }) : `in ${days} d`;
}

/* Initials for an avatar fallback — handles single names and Arabic script. */
export function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ---------------------------------------------------------------------------
   Local calendar dates
   ---------------------------------------------------------------------------
   Everything that talks to the slots API or the appointments date filter uses
   a plain "YYYY-MM-DD" local date. Building that with toISOString() silently
   shifts the day for anyone west of UTC, which is why it is computed from the
   local parts here and nowhere else.
   ------------------------------------------------------------------------- */

const pad2 = (n) => String(n).padStart(2, "0");

export function toLocalDateString(value = new Date()) {
  const date = value instanceof Date ? value : toDate(value) || new Date();
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/* "Today" / "Tomorrow", or "" for every other day — the day strip keeps an
   empty line rather than changing height as it scrolls. */
export function relativeDayLabel(date, t) {
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);

  if (days === 0) return t ? t("today") : "Today";
  if (days === 1) return t ? t("tomorrow") : "Tomorrow";
  return "";
}

/* Which third of the day a "HH:MM" slot falls in, for grouping times. */
export function periodOfDay(time) {
  const hour = Number(String(time).split(":")[0]);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/*
 * The date range behind each of the shop calendar's modes.
 *
 * One place, because "today" meaning two different things on two screens is
 * exactly the class of bug utils/time.js exists to document.
 *
 * `all` deliberately returns an empty range: the API treats missing bounds as
 * unbounded, and the caller is responsible for warning that it is about to ask
 * for the shop's entire history.
 */
export function dateRangeFor(mode, custom = {}) {
  const today = toLocalDateString();

  switch (mode) {
    case "today":
      return { startDate: today, endDate: today };

    case "upcoming": {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { startDate: toLocalDateString(tomorrow) };
    }

    case "custom": {
      const { startDate, endDate } = custom;
      if (!startDate || !endDate) return null;
      /* Tolerate a range entered backwards rather than returning nothing. */
      return startDate <= endDate
        ? { startDate, endDate }
        : { startDate: endDate, endDate: startDate };
    }

    case "all":
    default:
      return {};
  }
}
