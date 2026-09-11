import { describe, it, expect } from "vitest";
import reducer, {
  acceptAppointment,
  declineAppointment,
  cancelAppointment,
  markNoShow,
  completeAppointment,
  arriveForAppointment
} from "./appointmentsSlice";

const initialState = reducer(undefined, { type: "@@INIT" });

/*
 * The shop's appointment list.
 *
 * Two of these guard bugs that shipped: a rejected accept/decline used to set
 * `loading = true`, which froze the Calendar screen in its skeleton until the
 * owner navigated away (both the filter tiles and the list are gated on
 * `!loading`); and a declined appointment had its `Status` updated but not its
 * `StatusId`, so anything reading the id still saw PENDING.
 */
describe("appointmentsSlice", () => {
  describe("a failed action must never leave the screen loading", () => {
    const failing = [
      ["accept", acceptAppointment],
      ["decline", declineAppointment],
      ["cancel", cancelAppointment],
      ["no-show", markNoShow],
      ["complete", completeAppointment],
      ["arrive", arriveForAppointment]
    ];

    it.each(failing)("clears loading when %s is rejected", (_name, thunk) => {
      const state = reducer(
        { ...initialState, loading: true },
        thunk.rejected(null, "reqId", "appt-1", "Server exploded")
      );

      expect(state.loading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  it("marks a declined appointment with both the status name and its id", () => {
    const withItem = {
      ...initialState,
      items: [{ Id: "appt-1", Status: "PENDING", StatusId: 5 }]
    };

    const state = reducer(withItem, declineAppointment.fulfilled("appt-1"));

    expect(state.items[0].Status).toBe("DECLINED");
    // Screens that key off the id used to keep seeing this as PENDING.
    expect(state.items[0].StatusId).toBe(6);
  });

  it("leaves check-in to the server rather than guessing a status", () => {
    // Checking a customer in converts the appointment into a queue entry; it
    // does not complete it. An earlier reducer marked it COMPLETED, which
    // removed the customer from today's list before their cut had started.
    const withItem = {
      ...initialState,
      loading: true,
      items: [{ Id: "appt-1", Status: "SCHEDULED", StatusId: 1 }]
    };

    const state = reducer(withItem, arriveForAppointment.fulfilled("appt-1"));

    expect(state.loading).toBe(false);
    expect(state.items[0].Status).toBe("SCHEDULED");
  });
});
