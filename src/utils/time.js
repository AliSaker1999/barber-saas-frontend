// mssql serializes SQL `time` columns as full ISO datetimes (e.g.
// "1970-01-01T09:00:00.000Z"), not plain "HH:MM:SS" strings. Reading one
// directly (or with a naive .slice(0, 5)) produces garbage like "1970-" —
// this pulls just the HH:MM out regardless of which shape actually arrives.
//
// This exact bug shipped independently in four different components this
// session before being caught by manual testing — consolidated here with
// real test coverage so it can't happen a fifth time.
export function toHHMM(value, fallback = null) {
  const match = typeof value === "string" && value.match(/(\d{2}:\d{2})(?::\d{2})?/);
  return match ? match[1] : fallback;
}

// SQL `date` columns serialize as "YYYY-MM-DDT00:00:00.000Z" — feeding that straight
// into `new Date(...).toLocaleDateString()` re-interprets the UTC midnight in the
// browser's local timezone, which silently shifts the displayed day backward for
// anyone west of UTC. This reads the calendar date directly out of the string instead.
export function formatDateOnly(value, fallback = "") {
  const match = typeof value === "string" && value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return fallback;
  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}
