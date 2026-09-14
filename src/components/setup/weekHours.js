/*
 * Week-of-hours shapes and helpers.
 *
 * A plain module rather than exports beside WeekHoursEditor, because
 * `react-refresh/only-export-components` forbids a component file exporting
 * anything else — and because these are worth unit-testing on their own.
 *
 * Index 0 is Sunday, matching DayOfWeek in the database, so neither side of
 * the wire has to remap.
 */

import { toHHMM } from "../../utils/time";

export const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
];

export const DEFAULT_DAY = { start: "09:00", end: "18:00", active: true };

export function emptyWeek(active = false) {
  return DAY_KEYS.map(() => ({ ...DEFAULT_DAY, active }));
}

/*
 * A day whose end is not after its start cannot be saved: the server rejects
 * it and BarberWorkingHours has a CHECK constraint besides. Reported per day
 * so the owner knows which row to fix rather than which form.
 */
export function invalidDays(week) {
  return (week || []).reduce((bad, day, index) => {
    if (day?.active && day.start && day.end && day.start >= day.end) bad.push(index);
    return bad;
  }, []);
}

/*
 * TenantOperatingHours rows -> a week.
 *
 * `IsClosed` is the shop's vocabulary and `active` is the editor's, so they are
 * inverted here rather than in the markup. Times come back from mssql as full
 * ISO datetimes, hence toHHMM.
 */
export function weekFromShopHours(rows) {
  const week = emptyWeek(false);
  (rows || []).forEach((row) => {
    const day = week[row.DayOfWeek];
    if (!day) return;
    day.start = toHHMM(row.OpenTime, DEFAULT_DAY.start);
    day.end = toHHMM(row.CloseTime, DEFAULT_DAY.end);
    day.active = !row.IsClosed;
  });
  return week;
}

export function shopHoursFromWeek(week) {
  return week.map((day, dayOfWeek) => ({
    dayOfWeek,
    openTime: day.start,
    closeTime: day.end,
    isClosed: !day.active
  }));
}

/*
 * Barber availability rows -> a week.
 *
 * GET /barbers/:id/availability returns only the days a barber actually works
 * (it filters IsActive = 1), so every day it omits is a day off.
 */
export function weekFromBarberHours(rows) {
  const week = emptyWeek(false);
  (rows || []).forEach((row) => {
    const day = week[row.DayOfWeek];
    if (!day) return;
    day.start = toHHMM(row.StartTime, DEFAULT_DAY.start);
    day.end = toHHMM(row.EndTime, DEFAULT_DAY.end);
    day.active = true;
  });
  return week;
}

/* The PUT takes only the days that are worked; anything absent becomes a day
   off, which is exactly what `active: false` means here. */
export function barberDaysFromWeek(week) {
  return week
    .map((day, dayOfWeek) => ({ dayOfWeek, startTime: day.start, endTime: day.end, isActive: true }))
    .filter((_, dayOfWeek) => week[dayOfWeek].active);
}
