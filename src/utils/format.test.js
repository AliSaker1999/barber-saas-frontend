import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatMoney,
  formatPriceRange,
  formatDuration,
  formatWaitRange,
  formatRelativeDay,
  formatCountdown,
  toDate,
  initialsOf,
  normalizeCurrency
} from "./format";
import en from "../i18n/en";

/*
 * The real English catalogue, so these assert what a customer actually reads —
 * and so a typo'd translation key fails here rather than shipping the raw key
 * to the screen.
 */
const t = (key, params) => {
  const template = en[key];
  if (template === undefined) throw new Error(`Missing translation key: ${key}`);
  if (!params) return template;
  return Object.keys(params).reduce(
    (acc, name) => acc.split(`{${name}}`).join(String(params[name])),
    template
  );
};

afterEach(() => {
  vi.useRealTimers();
});

describe("formatMoney", () => {
  it("puts the dollar symbol before the amount", () => {
    expect(formatMoney(20, "USD")).toBe("$20");
  });

  it("puts the lira label after the amount and groups thousands", () => {
    expect(formatMoney(1800000, "LBP")).toBe("1,800,000 L.L.");
  });

  it("never converts between currencies — the same number, relabelled", () => {
    // 20 in a LBP shop means 20 lira, not $20 worth of lira. Any conversion
    // here would silently misprice every service in the app.
    expect(formatMoney(20, "LBP")).toBe("20 L.L.");
  });

  it("falls back to USD for an unknown currency rather than showing a code", () => {
    expect(normalizeCurrency("EUR")).toBe("USD");
    expect(formatMoney(15, "EUR")).toBe("$15");
  });

  it("renders a dash for a missing price instead of $NaN", () => {
    expect(formatMoney(undefined, "USD")).toBe("—");
    expect(formatMoney(null, "USD")).toBe("—");
    expect(formatMoney("abc", "USD")).toBe("—");
  });

  it("treats zero as a real price, not a missing one", () => {
    expect(formatMoney(0, "USD")).toBe("$0");
  });
});

describe("formatPriceRange", () => {
  it("shows a band when the prices differ", () => {
    expect(formatPriceRange(15, 30, "USD")).toBe("$15–$30");
  });

  it("collapses to one price when min and max match", () => {
    expect(formatPriceRange(20, 20, "USD")).toBe("$20");
  });

  it("returns null when a shop has no priced services", () => {
    expect(formatPriceRange(null, null, "USD")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("shows plain minutes under an hour", () => {
    expect(formatDuration(45, t)).toBe("45 min");
  });

  it("splits into hours and minutes past an hour", () => {
    expect(formatDuration(75, t)).toBe("1 h 15 min");
  });

  it("omits the minutes on a whole hour", () => {
    expect(formatDuration(120, t)).toBe("2 h");
  });

  it("handles a missing duration", () => {
    expect(formatDuration(0, t)).toBe("—");
    expect(formatDuration(null, t)).toBe("—");
  });
});

describe("formatWaitRange", () => {
  it("says there is no wait rather than showing zero minutes", () => {
    expect(formatWaitRange(0, t)).toBe("No wait");
  });

  it("collapses very short waits into a single upper bound", () => {
    expect(formatWaitRange(7, t)).toBe("Under 10 min");
  });

  it("gives a range instead of false precision", () => {
    // A queue ETA is an estimate; a range is truthful where a single "25 min"
    // invites a complaint at minute 26.
    const label = formatWaitRange(25, t);
    const [low, high] = label.match(/\d+/g).map(Number);
    expect(low).toBeLessThanOrEqual(25);
    expect(high).toBeGreaterThanOrEqual(25);
  });

  it("widens the bucket as the wait grows", () => {
    // 5-minute buckets up to half an hour, 10 to an hour, 15 beyond.
    const short = formatWaitRange(25, t);
    const long = formatWaitRange(90, t);
    const span = (label) => {
      const [low, high] = label.match(/\d+/g).map(Number);
      return high - low;
    };
    expect(span(short)).toBeLessThan(span(long));
  });

  it("never produces a negative or zero lower bound", () => {
    const [low] = formatWaitRange(12, t).match(/\d+/g).map(Number);
    expect(low).toBeGreaterThan(0);
  });
});

describe("toDate", () => {
  it("reads a zoneless server timestamp as local wall-clock time", () => {
    // The API sends "2026-03-08T18:30:00" with no zone. Letting Date guess UTC
    // shifts every appointment by the device's offset — a 6:30pm cut showing
    // as 8:30pm in Beirut.
    const date = toDate("2026-03-08T18:30:00");
    expect(date.getHours()).toBe(18);
    expect(date.getMinutes()).toBe(30);
    expect(date.getDate()).toBe(8);
  });

  it("respects an explicit zone when one is present", () => {
    const date = toDate("2026-03-08T18:30:00.000Z");
    expect(date.toISOString()).toBe("2026-03-08T18:30:00.000Z");
  });

  it("returns null for junk instead of an Invalid Date", () => {
    expect(toDate("")).toBeNull();
    expect(toDate(null)).toBeNull();
    expect(toDate("not a date")).toBeNull();
  });
});

describe("formatRelativeDay", () => {
  it("says Today and Tomorrow rather than a date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 8, 12, 0, 0));

    expect(formatRelativeDay("2026-03-08T18:30:00", t)).toBe("Today");
    expect(formatRelativeDay("2026-03-09T09:00:00", t)).toBe("Tomorrow");
    expect(formatRelativeDay("2026-03-07T09:00:00", t)).toBe("Yesterday");
  });

  it("falls back to a real date further out", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 8, 12, 0, 0));

    expect(formatRelativeDay("2026-03-20T09:00:00", t)).toMatch(/Mar/);
  });

  it("compares calendar days, not elapsed hours", () => {
    // 11pm now and 1am tomorrow is two hours away but a different day.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 8, 23, 0, 0));

    expect(formatRelativeDay("2026-03-09T01:00:00", t)).toBe("Tomorrow");
  });
});

describe("formatCountdown", () => {
  it("counts down in minutes, then hours, then days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 8, 12, 0, 0));

    expect(formatCountdown("2026-03-08T12:25:00", t)).toBe("in 25 min");
    expect(formatCountdown("2026-03-08T15:00:00", t)).toBe("in 3 h");
    expect(formatCountdown("2026-03-11T12:00:00", t)).toBe("in 3 days");
  });

  it("says Now once the time has passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 8, 12, 0, 0));

    expect(formatCountdown("2026-03-08T11:55:00", t)).toBe("Now");
  });
});

describe("initialsOf", () => {
  it("takes the first and last initial", () => {
    expect(initialsOf("Mohammad Al Khoury")).toBe("MK");
  });

  it("handles a single name", () => {
    expect(initialsOf("Rami")).toBe("R");
  });

  it("handles Arabic script without mangling it", () => {
    expect(initialsOf("محمد خوري")).toBe("مخ");
  });

  it("never renders an empty avatar", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf(null)).toBe("?");
    expect(initialsOf("   ")).toBe("?");
  });
});
