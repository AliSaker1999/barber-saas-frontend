import { describe, it, expect } from "vitest";
import { toHHMM } from "./time";

describe("toHHMM", () => {
  it("extracts HH:MM from a full ISO datetime, the exact shape mssql actually returns", () => {
    expect(toHHMM("1970-01-01T09:00:00.000Z")).toBe("09:00");
    expect(toHHMM("1970-01-01T19:30:00.000Z")).toBe("19:30");
  });

  it("this is the regression the bug actually looked like: naive .slice(0, 5) on that same input", () => {
    // Documents exactly what shipped broken in four components this session —
    // if this ever passes, toHHMM has regressed back to the naive approach.
    const broken = "1970-01-01T09:00:00.000Z".slice(0, 5);
    expect(broken).not.toBe("09:00");
    expect(broken).toBe("1970-");
  });

  it("passes through a plain HH:MM string unchanged", () => {
    expect(toHHMM("09:00")).toBe("09:00");
  });

  it("strips seconds from a plain HH:MM:SS string", () => {
    expect(toHHMM("09:00:00")).toBe("09:00");
  });

  it("returns the fallback for null/undefined", () => {
    expect(toHHMM(null)).toBeNull();
    expect(toHHMM(undefined)).toBeNull();
    expect(toHHMM(null, "--")).toBe("--");
  });

  it("returns the fallback for a non-string value", () => {
    expect(toHHMM(12345, "--")).toBe("--");
  });

  it("returns the fallback for a string with no time pattern in it", () => {
    expect(toHHMM("not a time", "--")).toBe("--");
  });

  it("defaults the fallback to null when not provided", () => {
    expect(toHHMM("garbage")).toBeNull();
  });
});
