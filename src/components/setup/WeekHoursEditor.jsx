import { useI18n } from "../../i18n";
import { Toggle } from "../ui/Primitives";
import Button from "../ui/Button";
import { DAY_KEYS, emptyWeek, invalidDays } from "./weekHours";

/*
 * A seven-day opening pattern.
 *
 * Deliberately pure — no fetching, no dispatch, no knowledge of whether it is
 * editing a shop's hours or a barber's rota. Both wrappers hand it an
 * already-normalised week and take back a new one, which means only those two
 * components have to do the server-data-into-local-draft dance that
 * `react-hooks/set-state-in-effect` makes fiddly, instead of every screen that
 * wants to show a week.
 *
 * `value` is always exactly seven entries, index 0 = Sunday, matching
 * DayOfWeek in the database so neither side has to remap.
 */

export default function WeekHoursEditor({ value, onChange, disabled = false }) {
  const { t } = useI18n();
  const week = value || emptyWeek();
  const bad = invalidDays(week);

  const updateDay = (index, patch) => {
    onChange(week.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  };

  /* The common shape by a mile: the same hours every day the shop opens. */
  const copyToOpenDays = (index) => {
    const source = week[index];
    onChange(week.map((day) => (day.active ? { ...day, start: source.start, end: source.end } : day)));
  };

  return (
    <div className="rounded-card border border-line-subtle bg-surface-raised divide-y divide-line-subtle">
      {week.map((day, index) => {
        const isInvalid = bad.includes(index);

        return (
          <div key={DAY_KEYS[index]} className="p-3.5">
            <Toggle
              checked={day.active}
              disabled={disabled}
              onChange={(next) => updateDay(index, { active: next })}
              label={t(DAY_KEYS[index])}
              hint={day.active ? undefined : t("hours_day_off")}
            />

            {day.active ? (
              <div className="mt-2.5 flex items-center gap-2">
                {/* dir="ltr" on both: a time reads HH:MM in every language, and
                    Android's native picker will mirror it otherwise. */}
                <input
                  type="time"
                  dir="ltr"
                  disabled={disabled}
                  value={day.start}
                  onChange={(event) => updateDay(index, { start: event.target.value })}
                  aria-label={`${t(DAY_KEYS[index])} — ${t("hours_opens")}`}
                  className={`flex-1 min-w-0 h-11 px-3 rounded-control bg-surface-sunken border
                              text-body text-content-primary tnum outline-none
                              focus:border-brand-gold ${
                                isInvalid ? "border-state-danger" : "border-line-subtle"
                              }`}
                />
                <span className="text-caption text-content-muted flex-shrink-0">
                  {t("hours_to")}
                </span>
                <input
                  type="time"
                  dir="ltr"
                  disabled={disabled}
                  value={day.end}
                  onChange={(event) => updateDay(index, { end: event.target.value })}
                  aria-label={`${t(DAY_KEYS[index])} — ${t("hours_closes")}`}
                  className={`flex-1 min-w-0 h-11 px-3 rounded-control bg-surface-sunken border
                              text-body text-content-primary tnum outline-none
                              focus:border-brand-gold ${
                                isInvalid ? "border-state-danger" : "border-line-subtle"
                              }`}
                />
              </div>
            ) : null}

            {isInvalid ? (
              <p role="alert" className="mt-1.5 text-caption text-state-danger">
                {t("hours_invalid_day")}
              </p>
            ) : null}

            {day.active && !disabled ? (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1.5"
                onClick={() => copyToOpenDays(index)}
              >
                {t("hours_copy_to_all")}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
