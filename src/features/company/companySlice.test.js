import { describe, it, expect } from "vitest";
import reducer, {
  resetUpdateSuccess,
  resetHoursSaveSuccess,
  fetchCompanyProfile,
  updateCompanyProfile,
  fetchOperatingHours,
  saveOperatingHours,
  fetchAvailablePlans,
  startCheckout
} from "./companySlice";

const initialState = reducer(undefined, { type: "@@INIT" });

describe("companySlice", () => {
  it("has the expected initial state", () => {
    expect(initialState).toEqual({
      profile: null,
      loading: false,
      error: null,
      updateSuccess: false,
      operatingHours: [],
      hoursLoading: false,
      hoursError: null,
      hoursSaveSuccess: false,
      availablePlans: [],
      checkoutLoading: false,
      checkoutError: null,
      /* Stripe Connect onboarding state, added with the deposit feature. */
      connectStatus: null,
      connectStatusLoading: false,
      connectOnboardingLoading: false,
      connectOnboardingError: null
    });
  });

  describe("fetchCompanyProfile", () => {
    it("sets loading and clears any previous error on pending", () => {
      const state = reducer({ ...initialState, error: "old error" }, fetchCompanyProfile.pending());
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it("stores the profile on fulfilled", () => {
      const profile = { Id: "t1", Name: "Test Shop" };
      const state = reducer({ ...initialState, loading: true }, fetchCompanyProfile.fulfilled(profile));
      expect(state.loading).toBe(false);
      expect(state.profile).toEqual(profile);
    });

    it("stores the error message on rejected", () => {
      const state = reducer({ ...initialState, loading: true }, fetchCompanyProfile.rejected(null, "reqId", undefined, "Network error"));
      expect(state.loading).toBe(false);
      expect(state.error).toBe("Network error");
    });
  });

  describe("updateCompanyProfile", () => {
    it("resets updateSuccess on pending, in case a previous save left it true", () => {
      const state = reducer({ ...initialState, updateSuccess: true }, updateCompanyProfile.pending());
      expect(state.loading).toBe(true);
      expect(state.updateSuccess).toBe(false);
    });

    it("sets updateSuccess on fulfilled without touching the stored profile", () => {
      const priorProfile = { Id: "t1", Name: "Test Shop" };
      const state = reducer(
        { ...initialState, profile: priorProfile, loading: true },
        updateCompanyProfile.fulfilled({ success: true })
      );
      expect(state.loading).toBe(false);
      expect(state.updateSuccess).toBe(true);
      // updateCompanyProfile.fulfilled deliberately doesn't overwrite `profile` —
      // the caller re-fetches separately. Documented here so that stays deliberate.
      expect(state.profile).toEqual(priorProfile);
    });
  });

  describe("resetUpdateSuccess / resetHoursSaveSuccess", () => {
    it("resetUpdateSuccess clears updateSuccess only", () => {
      const state = reducer({ ...initialState, updateSuccess: true, hoursSaveSuccess: true }, resetUpdateSuccess());
      expect(state.updateSuccess).toBe(false);
      expect(state.hoursSaveSuccess).toBe(true);
    });

    it("resetHoursSaveSuccess clears hoursSaveSuccess only", () => {
      const state = reducer({ ...initialState, updateSuccess: true, hoursSaveSuccess: true }, resetHoursSaveSuccess());
      expect(state.hoursSaveSuccess).toBe(false);
      expect(state.updateSuccess).toBe(true);
    });
  });

  describe("operating hours", () => {
    const hours = [{ DayOfWeek: 1, OpenTime: "09:00", CloseTime: "19:00", IsClosed: false }];

    it("fetchOperatingHours stores the hours on fulfilled", () => {
      const state = reducer(initialState, fetchOperatingHours.fulfilled(hours));
      expect(state.hoursLoading).toBe(false);
      expect(state.operatingHours).toEqual(hours);
    });

    it("fetchOperatingHours stores the error on rejected", () => {
      const state = reducer(initialState, fetchOperatingHours.rejected(null, "reqId", undefined, "Forbidden"));
      expect(state.hoursError).toBe("Forbidden");
    });

    it("saveOperatingHours resets hoursSaveSuccess on pending, then sets it on fulfilled", () => {
      const pendingState = reducer({ ...initialState, hoursSaveSuccess: true }, saveOperatingHours.pending());
      expect(pendingState.hoursSaveSuccess).toBe(false);

      const fulfilledState = reducer(pendingState, saveOperatingHours.fulfilled(hours));
      expect(fulfilledState.hoursSaveSuccess).toBe(true);
      expect(fulfilledState.operatingHours).toEqual(hours);
    });

    it("saveOperatingHours stores the error and does not set hoursSaveSuccess on rejected", () => {
      const state = reducer(initialState, saveOperatingHours.rejected(null, "reqId", undefined, "Validation failed"));
      expect(state.hoursError).toBe("Validation failed");
      expect(state.hoursSaveSuccess).toBe(false);
    });
  });

  describe("billing", () => {
    const plans = [{ Id: 1, Name: "Solo", MonthlyPrice: 29 }];

    it("fetchAvailablePlans stores the plan list on fulfilled", () => {
      const state = reducer(initialState, fetchAvailablePlans.fulfilled(plans));
      expect(state.availablePlans).toEqual(plans);
    });

    it("startCheckout tracks loading through pending/fulfilled", () => {
      const pendingState = reducer(initialState, startCheckout.pending());
      expect(pendingState.checkoutLoading).toBe(true);
      expect(pendingState.checkoutError).toBeNull();

      const fulfilledState = reducer(pendingState, startCheckout.fulfilled({ url: "https://checkout.stripe.com/..." }));
      expect(fulfilledState.checkoutLoading).toBe(false);
    });

    it("startCheckout stores a graceful error (e.g. Stripe not configured) on rejected", () => {
      const state = reducer(
        { ...initialState, checkoutLoading: true },
        startCheckout.rejected(null, "reqId", 1, "Billing isn't set up yet — contact the platform owner.")
      );
      expect(state.checkoutLoading).toBe(false);
      expect(state.checkoutError).toBe("Billing isn't set up yet — contact the platform owner.");
    });
  });
});
