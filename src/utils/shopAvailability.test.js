import { describe, it, expect } from "vitest";
import { shopAvailability, trimSeconds } from "./shopAvailability";
import en from "../i18n/en";

const t = (key, params) => {
  const template = en[key];
  if (template === undefined) throw new Error(`Missing translation key: ${key}`);
  if (!params) return template;
  return Object.keys(params).reduce(
    (acc, name) => acc.split(`{${name}}`).join(String(params[name])),
    template
  );
};

/* A shop with nothing going on, so each test only states what it changes. */
const shop = (overrides = {}) => ({
  IsOpenNow: false,
  IsClosedToday: false,
  WalkInAvailable: false,
  AppointmentsAvailableToday: false,
  MinWaitMinutes: null,
  BarbersOnDutyNow: 0,
  OpensAt: null,
  ClosesAt: null,
  ...overrides
});

describe("shopAvailability", () => {
  it("leads with the walk-in wait when someone can be seen now", () => {
    // This is the whole product promise on a shop card: not "open", but
    // "you can sit down in about twenty minutes".
    const result = shopAvailability(
      shop({ IsOpenNow: true, WalkInAvailable: true, MinWaitMinutes: 22, BarbersOnDutyNow: 3 }),
      t
    );

    expect(result.tone).toBe("success");
    expect(result.live).toBe(true);
    expect(result.label).toMatch(/\d+–\d+ min/);
    expect(result.detail).toBe("3 barbers in");
  });

  it("says there is no wait rather than showing zero", () => {
    const result = shopAvailability(
      shop({ IsOpenNow: true, WalkInAvailable: true, MinWaitMinutes: 0, BarbersOnDutyNow: 1 }),
      t
    );

    expect(result.label).toBe("No wait");
  });

  it("distinguishes 'open but appointments only' from 'walk in now'", () => {
    const result = shopAvailability(
      shop({ IsOpenNow: true, AppointmentsAvailableToday: true, ClosesAt: "20:00:00" }),
      t
    );

    expect(result.tone).toBe("info");
    expect(result.live).toBe(false);
    expect(result.label).toBe("Booking only");
    expect(result.detail).toBe("until 20:00");
  });

  it("says closed today when the shop isn't opening at all", () => {
    const result = shopAvailability(shop({ IsClosedToday: true }), t);
    expect(result.label).toBe("Closed today");
    expect(result.tone).toBe("neutral");
  });

  it("tells a customer when a closed shop opens", () => {
    const result = shopAvailability(shop({ OpensAt: "09:30:00" }), t);
    expect(result.label).toBe("Opens 09:30");
  });

  it("falls back to plain 'Closed' when no opening time is known", () => {
    const result = shopAvailability(shop(), t);
    expect(result.label).toBe("Closed");
  });

  it("never claims a walk-in at a closed shop", () => {
    // WalkInAvailable is computed server-side as "open AND a barber is free",
    // so a closed shop can only reach the closed branches — but a card must
    // never show a live wait for a shop that isn't open.
    const result = shopAvailability(shop({ IsClosedToday: true, MinWaitMinutes: 5 }), t);
    expect(result.live).not.toBe(true);
    expect(result.label).toBe("Closed today");
  });

  it("still offers a walk-in when the shop never set its opening hours", () => {
    // Most shops during onboarding have barbers rostered but no shop-level
    // TenantOperatingHours rows. The server derives open/closed from the
    // barbers in that case, so a card must show the wait rather than dimming a
    // shop that is demonstrably serving customers.
    const result = shopAvailability(
      shop({
        HoursConfigured: false,
        IsOpenNow: true,
        WalkInAvailable: true,
        MinWaitMinutes: 15,
        BarbersOnDutyNow: 2,
        OpensAt: null,
        ClosesAt: null
      }),
      t
    );

    expect(result.tone).toBe("success");
    expect(result.label).toMatch(/\d+–\d+ min/);
  });

  it("omits a closing time it doesn't have", () => {
    const result = shopAvailability(
      shop({ HoursConfigured: false, IsOpenNow: true, AppointmentsAvailableToday: true }),
      t
    );

    expect(result.label).toBe("Booking only");
    expect(result.detail).toBeNull();
  });

  it("returns nothing for a missing shop rather than throwing", () => {
    expect(shopAvailability(null, t)).toBeNull();
    expect(shopAvailability(undefined, t)).toBeNull();
  });

  it("omits the barber count when nobody is recorded on duty", () => {
    const result = shopAvailability(
      shop({ IsOpenNow: true, WalkInAvailable: true, MinWaitMinutes: 10, BarbersOnDutyNow: 0 }),
      t
    );
    expect(result.detail).toBeNull();
  });
});

describe("trimSeconds", () => {
  it("drops the seconds nobody says out loud", () => {
    expect(trimSeconds("09:30:00")).toBe("09:30");
  });

  it("passes through anything that isn't a time string", () => {
    expect(trimSeconds(null)).toBeNull();
    expect(trimSeconds(undefined)).toBeUndefined();
  });
});
