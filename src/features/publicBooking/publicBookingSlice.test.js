import { describe, it, expect } from "vitest";
import { normalizeQueuePosition } from "./publicBookingSlice";

/*
 * The queue-position contract.
 *
 * `GET /queue/me/:tenantId/position` is the odd one out in this API: it
 * answers with a flat `{ inQueue: false }` rather than null, and without the
 * `{ success, data }` envelope everything else uses.
 *
 * That shape is truthy, so the guest tracker originally rendered a queue card
 * reading "#undefined in line" for a customer whose turn had already come —
 * caught by running the real flow against the backend, not by any unit test.
 * These pin the normalisation down.
 */
describe("normalizeQueuePosition", () => {
  it("collapses the not-in-queue sentinel to null", () => {
    expect(normalizeQueuePosition({ inQueue: false })).toBeNull();
  });

  it("returns the queue and drops the flag when in line", () => {
    const result = normalizeQueuePosition({
      inQueue: true,
      queueId: "q1",
      position: 3,
      waitTime: 25,
      barberName: "Sami",
      services: [{ name: "Fade" }]
    });

    expect(result).toEqual({
      queueId: "q1",
      position: 3,
      waitTime: 25,
      barberName: "Sami",
      services: [{ name: "Fade" }]
    });
    expect(result).not.toHaveProperty("inQueue");
  });

  it("accepts the wrapped envelope too, in case the endpoint is normalised later", () => {
    expect(normalizeQueuePosition({ data: { inQueue: true, position: 1 } })).toEqual({
      position: 1
    });
  });

  it("treats a missing or malformed body as no queue rather than throwing", () => {
    expect(normalizeQueuePosition(null)).toBeNull();
    expect(normalizeQueuePosition(undefined)).toBeNull();
    expect(normalizeQueuePosition({})).toBeNull();
    /* A truthy-but-wrong `inQueue` must not count — only an explicit true. */
    expect(normalizeQueuePosition({ inQueue: "yes", position: 2 })).toBeNull();
  });
});
