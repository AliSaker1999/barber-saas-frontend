import { useMemo } from "react";
import { toLocalDateString, relativeDayLabel } from "../../utils/format";
import { useI18n } from "../../i18n";

/*
 * A horizontal strip of days.
 *
 * Used by the in-app booking flow, the public guest flow and the shop's
 * Calendar tab — it existed independently in the first two before this, which
 * is how the customer and guest pickers were free to drift apart.
 *
 * `value` and `onChange` speak "YYYY-MM-DD" local dates, not `Date` objects,
 * because that is what both the slots API and the appointments date filter
 * take, and converting at the edges is where timezone bugs breed.
 *
 * `maxDays` is the shop's advance-booking window. It is capped at 14 here: a
 * scroll strip is the wrong control for picking a date three weeks out, and
 * screens that need that offer a range instead.
 */
export default function DayPicker({
  value,
  onChange,
  maxDays = 30,
  allowToday = true,
  className = ""
}) {
  const { t, locale } = useI18n();

  const days = useMemo(() => {
    const list = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    for (let offset = allowToday ? 0 : 1; offset < Math.min(maxDays || 30, 14); offset += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + offset);
      list.push(date);
    }
    return list;
  }, [maxDays, allowToday]);

  return (
    <div className={`flex gap-2 overflow-x-auto no-scrollbar snap-rail -mx-4 px-4 ${className}`}>
      {days.map((date) => {
        const key = toLocalDateString(date);
        const active = key === value;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={active}
            className={`press flex-shrink-0 w-[68px] py-2.5 rounded-card border text-center transition-colors ${
              active
                ? "bg-brand-gold border-brand-gold text-content-on-gold"
                : "bg-surface-raised border-line-subtle text-content-primary"
            }`}
          >
            <span className="block text-[10.5px] font-bold uppercase tracking-wide opacity-80">
              {date.toLocaleDateString(locale === "ar" ? "ar-LB" : "en-US", { weekday: "short" })}
            </span>
            <span className="block text-h3 tnum leading-tight mt-0.5">{date.getDate()}</span>
            {/* "Today"/"Tomorrow" replace the bare date for the two days that
                matter most; every other chip keeps a stable empty line so the
                row does not change height as it scrolls. */}
            <span className="block text-[9.5px] font-semibold opacity-75 truncate px-0.5 min-h-[12px]">
              {relativeDayLabel(date, t)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
