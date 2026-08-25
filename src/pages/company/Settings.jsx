import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import {
  fetchOperatingHours,
  saveOperatingHours,
  resetHoursSaveSuccess,
  fetchCompanyProfile,
  fetchAvailablePlans,
  startCheckout
} from "../../features/company/companySlice";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

const DEFAULT_DAY = { openTime: "09:00", closeTime: "18:00", isClosed: false };

// mssql serializes `time` columns as full ISO datetimes (e.g. "1970-01-01T09:00:00.000Z"),
// not plain "HH:MM:SS" strings — pull just the HH:MM out regardless of which shape arrives.
function toHHMM(value, fallback) {
  const match = typeof value === "string" && value.match(/(\d{2}:\d{2})(?::\d{2})?/);
  return match ? match[1] : fallback;
}

function buildDraft(operatingHours) {
  const draft = DAYS.map(() => ({ ...DEFAULT_DAY }));
  operatingHours.forEach((h) => {
    draft[h.DayOfWeek] = {
      openTime: toHHMM(h.OpenTime, DEFAULT_DAY.openTime),
      closeTime: toHHMM(h.CloseTime, DEFAULT_DAY.closeTime),
      isClosed: Boolean(h.IsClosed)
    };
  });
  return draft;
}

export default function Settings() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const { user } = useAppSelector((state) => state.auth);
  const {
    operatingHours,
    hoursLoading,
    hoursError,
    hoursSaveSuccess,
    profile,
    availablePlans,
    checkoutLoading,
    checkoutError
  } = useAppSelector((state) => state.company);
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");

  const [draft, setDraft] = useState(() => buildDraft([]));
  const [hydrated, setHydrated] = useState(false);

  if (!hydrated && !hoursLoading && operatingHours.length) {
    setDraft(buildDraft(operatingHours));
    setHydrated(true);
  }

  useEffect(() => {
    if (user?.tenantId) {
      dispatch(fetchOperatingHours(user.tenantId));
    }
    dispatch(fetchCompanyProfile());
    dispatch(fetchAvailablePlans());
  }, [user?.tenantId, dispatch]);

  useEffect(() => {
    if (!hoursSaveSuccess) return;
    const timer = setTimeout(() => dispatch(resetHoursSaveSuccess()), 4000);
    return () => clearTimeout(timer);
  }, [hoursSaveSuccess, dispatch]);

  useEffect(() => {
    if (checkoutStatus === "success") {
      dispatch(fetchCompanyProfile());
    }
  }, [checkoutStatus, dispatch]);

  const handleSubscribe = async (planId) => {
    const result = await dispatch(startCheckout(planId));
    if (startCheckout.fulfilled.match(result) && result.payload.url) {
      window.open(result.payload.url, "_self");
    }
  };

  const dismissCheckoutBanner = () => {
    searchParams.delete("checkout");
    setSearchParams(searchParams, { replace: true });
  };

  const updateDay = (dayIndex, patch) => {
    setDraft((prev) =>
      prev.map((day, i) => (i === dayIndex ? { ...day, ...patch } : day))
    );
  };

  const handleSave = () => {
    dispatch(
      saveOperatingHours(
        draft.map((day, dayOfWeek) => ({
          dayOfWeek,
          openTime: day.openTime,
          closeTime: day.closeTime,
          isClosed: day.isClosed
        }))
      )
    );
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-app-text tracking-tight">
          {t("shop_settings")}
        </h1>
        <p className="text-app-muted font-medium">
          Configure when customers can book and walk in to your shop
        </p>
      </div>

      {hoursError && (
        <div className="bg-app-surface-2 text-red-600 p-4 mb-6 rounded-[12px] flex items-center shadow-sm border border-red-200">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-semibold">{hoursError}</span>
        </div>
      )}

      {hoursSaveSuccess && (
        <div className="bg-app-surface-2 text-app-accent p-4 mb-6 rounded-[12px] flex items-center shadow-sm border border-app-border">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <span className="font-bold uppercase tracking-tight text-sm">Operating hours saved</span>
        </div>
      )}

      {checkoutStatus === "success" && (
        <div className="bg-app-surface-2 text-app-accent p-4 mb-6 rounded-[12px] flex items-center justify-between shadow-sm border border-app-border">
          <span className="font-bold text-sm">Payment received — your plan will update shortly.</span>
          <button onClick={dismissCheckoutBanner} className="text-app-accent hover:text-app-accent-dark">✕</button>
        </div>
      )}

      {checkoutStatus === "cancelled" && (
        <div className="bg-app-surface-2 text-app-muted p-4 mb-6 rounded-[12px] flex items-center justify-between shadow-sm border border-app-border">
          <span className="font-bold text-sm">Checkout cancelled — no changes were made.</span>
          <button onClick={dismissCheckoutBanner} className="text-app-muted hover:text-app-text">✕</button>
        </div>
      )}

      {checkoutError && (
        <div className="bg-app-surface-2 text-red-600 p-4 mb-6 rounded-[12px] flex items-center shadow-sm border border-red-200">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-semibold">{checkoutError}</span>
        </div>
      )}

      <div className="bg-app-surface p-8 rounded-[12px] shadow-sm border border-app-border mb-6">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-app-border">
          <div className="w-10 h-10 bg-app-surface-2 rounded-[12px] flex items-center justify-center text-app-text">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-app-text">Billing</h2>
        </div>

        <div className="mb-6">
          {profile?.PlanName ? (
            <p className="text-app-text">
              Current plan: <span className="font-bold">{profile.PlanName}</span> — ${Number(profile.PlanMonthlyPrice).toFixed(0)}/mo
            </p>
          ) : (
            <p className="text-app-muted">No active subscription yet — pick a plan below.</p>
          )}
        </div>

        {availablePlans.length === 0 ? (
          <p className="text-sm text-app-muted italic">No plans available yet — check back later.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {availablePlans.map((plan) => {
              const isCurrent = profile?.PlanId === plan.Id;
              return (
                <div key={plan.Id} className="border-2 border-app-border rounded-[12px] p-5 flex flex-col">
                  <p className="font-black text-app-text text-lg">{plan.Name}</p>
                  <p className="text-app-muted text-sm mb-1">
                    {plan.MinBarbers}{plan.MaxBarbers ? `–${plan.MaxBarbers}` : "+"} barbers
                  </p>
                  <p className="text-2xl font-black text-app-text mb-4">${Number(plan.MonthlyPrice).toFixed(0)}<span className="text-sm text-app-muted font-normal">/mo</span></p>
                  <button
                    type="button"
                    disabled={isCurrent || checkoutLoading}
                    onClick={() => handleSubscribe(plan.Id)}
                    className="mt-auto bg-app-accent text-white px-4 py-2 rounded-[25px] font-bold text-sm hover:bg-app-accent-dark transition-all disabled:opacity-50"
                  >
                    {isCurrent ? "Current plan" : checkoutLoading ? "Redirecting..." : "Subscribe"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-app-surface p-8 rounded-[12px] shadow-sm border border-app-border">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-app-border">
          <div className="w-10 h-10 bg-app-surface-2 rounded-[12px] flex items-center justify-center text-app-text">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-app-text">Operating Hours</h2>
        </div>

        <div className="divide-y divide-app-border">
          {DAYS.map((dayName, dayIndex) => {
            const day = draft[dayIndex];
            return (
              <div
                key={dayIndex}
                className="flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-4 items-start sm:items-center py-4"
              >
                <div className="sm:col-span-2 font-bold text-app-text text-sm">{dayName}</div>

                <div className="sm:col-span-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={!day.isClosed}
                      onChange={(e) => updateDay(dayIndex, { isClosed: !e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-app-bg peer-focus:ring-4 peer-focus:ring-app-accent rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:border-app-border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-app-accent"></div>
                    <span className="ms-3 text-xs font-bold text-app-muted">
                      {day.isClosed ? "Closed" : "Open"}
                    </span>
                  </label>
                </div>

                <div className="sm:col-span-6 flex items-center gap-2 w-full">
                  {day.isClosed ? (
                    <span className="text-sm text-app-muted italic">Not open this day</span>
                  ) : (
                    <>
                      <input
                        type="time"
                        value={day.openTime}
                        onChange={(e) => updateDay(dayIndex, { openTime: e.target.value })}
                        className="flex-1 border-2 border-app-border rounded-[12px] px-3 py-2 text-sm focus:border-app-accent focus:outline-none transition-all text-app-text bg-app-surface"
                      />
                      <span className="text-app-muted font-bold">to</span>
                      <input
                        type="time"
                        value={day.closeTime}
                        onChange={(e) => updateDay(dayIndex, { closeTime: e.target.value })}
                        className="flex-1 border-2 border-app-border rounded-[12px] px-3 py-2 text-sm focus:border-app-accent focus:outline-none transition-all text-app-text bg-app-surface"
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={hoursLoading}
            className="bg-app-accent text-white px-8 py-2.5 rounded-[25px] font-bold hover:bg-app-accent-dark transition-all active:scale-95 shadow-lg disabled:opacity-50"
          >
            {hoursLoading ? "Saving..." : "Save Hours"}
          </button>
        </div>
      </div>
    </div>
  );
}
