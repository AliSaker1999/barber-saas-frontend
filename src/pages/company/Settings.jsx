import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import {
  fetchCompanyProfile,
  updateCompanyProfile,
  fetchAvailablePlans,
  startCheckout,
  fetchConnectStatus,
  startConnectOnboarding
} from "../../features/company/companySlice";
import { toast } from "react-hot-toast";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import { formatMoney } from "../../utils/format";
import { SectionHeader } from "../../components/ui/Primitives";
import ShopHoursEditor from "../../components/setup/ShopHoursEditor";

export default function Settings() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const { user } = useAppSelector((state) => state.auth);
  const {
    profile,
    availablePlans,
    checkoutLoading,
    checkoutError,
    connectStatus,
    connectStatusLoading,
    connectOnboardingLoading,
    connectOnboardingError
  } = useAppSelector((state) => state.company);
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");
  const connectReturnStatus = searchParams.get("connect");

  const [savingCurrency, setSavingCurrency] = useState(null);

  useEffect(() => {
    dispatch(fetchCompanyProfile());
    dispatch(fetchAvailablePlans());
    dispatch(fetchConnectStatus());
  }, [user?.tenantId, dispatch]);

  useEffect(() => {
    if (connectReturnStatus === "return") {
      dispatch(fetchConnectStatus());
    }
  }, [connectReturnStatus, dispatch]);

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

  const handleConnectStripe = async () => {
    const result = await dispatch(startConnectOnboarding());
    if (startConnectOnboarding.fulfilled.match(result) && result.payload.url) {
      window.open(result.payload.url, "_self");
    }
  };

  const dismissCheckoutBanner = () => {
    searchParams.delete("checkout");
    setSearchParams(searchParams, { replace: true });
  };

  /*
   * Pricing currency (spec 19).
   *
   * A Lebanese shop quotes in "fresh dollars" or in lira, and the two are not
   * interchangeable — so this sets which currency the shop's Services.Price
   * values are read as. Nothing anywhere converts between them; changing this
   * relabels the prices, it does not recalculate them, which is exactly why
   * the confirmation below spells that out.
   */
  const currency = profile?.Currency || "USD";

  const handleCurrency = async (next) => {
    if (next === currency) return;
    setSavingCurrency(next);
    try {
      await dispatch(updateCompanyProfile({ currency: next })).unwrap();
      await dispatch(fetchCompanyProfile());
      toast.success(t("save"));
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setSavingCurrency(null);
    }
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

      <div className="bg-app-surface p-8 rounded-[12px] shadow-sm border border-app-border mb-6">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-app-border">
          <div className="w-10 h-10 bg-app-surface-2 rounded-[12px] flex items-center justify-center text-app-text">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-app-text">Deposit Payments</h2>
        </div>

        <p className="text-app-muted text-sm mb-4 max-w-xl">
          Connect a Stripe account to collect booking deposits directly — deposits are paid straight to your account, not held by the platform. Configure when a deposit is required under Company Profile → Payment Methods.
        </p>

        {connectOnboardingError && (
          <div className="bg-app-surface-2 text-red-600 p-4 mb-4 rounded-[12px] text-sm font-semibold border border-red-200">
            {connectOnboardingError}
          </div>
        )}

        {connectReturnStatus === "return" && connectStatus?.chargesEnabled && (
          <div className="bg-app-surface-2 text-app-accent p-4 mb-4 rounded-[12px] text-sm font-bold border border-app-border">
            Stripe account connected — deposits are ready to collect.
          </div>
        )}

        <div className="flex items-center justify-between gap-4 p-4 bg-app-bg rounded-[12px]">
          <div>
            {connectStatusLoading ? (
              <p className="text-sm text-app-muted">Checking Stripe status...</p>
            ) : connectStatus?.chargesEnabled ? (
              <p className="text-sm font-bold text-app-accent flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Stripe connected
              </p>
            ) : connectStatus?.connected ? (
              <p className="text-sm font-bold text-amber-600">Stripe onboarding started — finish setup to enable deposits.</p>
            ) : (
              <p className="text-sm text-app-muted">Not connected yet.</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleConnectStripe}
            disabled={connectOnboardingLoading}
            className="bg-app-accent text-white px-6 py-2.5 rounded-[25px] font-bold text-sm hover:bg-app-accent-dark transition-all disabled:opacity-50 flex-shrink-0"
          >
            {connectOnboardingLoading
              ? "Redirecting..."
              : connectStatus?.chargesEnabled
                ? "Manage Stripe account"
                : "Connect with Stripe"}
          </button>
        </div>
      </div>

      {/* ---- pricing currency ---- */}
      <section className="bg-surface-raised border border-line-subtle rounded-card p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 rounded-control bg-surface-sunken text-content-secondary flex items-center justify-center flex-shrink-0">
            <Icon name="wallet" size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-h2 text-content-primary">{t("currency_label")}</h2>
            <p className="text-caption text-content-muted">{t("currency_help")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[
            { code: "USD", label: t("currency_usd"), sample: 20 },
            { code: "LBP", label: t("currency_lbp"), sample: 1800000 }
          ].map((option) => {
            const active = currency === option.code;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => handleCurrency(option.code)}
                disabled={Boolean(savingCurrency)}
                aria-pressed={active}
                className={`press flex items-center gap-3 p-3.5 rounded-card border text-start transition-colors ${
                  active
                    ? "border-brand-gold bg-brand-gold-soft"
                    : "border-line-subtle bg-surface-raised hover:bg-surface-sunken"
                } ${savingCurrency ? "opacity-60 pointer-events-none" : ""}`}
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-body font-semibold text-content-primary truncate">
                    {option.label}
                  </span>
                  {/* A worked example, so nobody has to guess how a price will
                      read to a customer after switching. */}
                  <span className="block text-caption text-content-muted tnum">
                    {formatMoney(option.sample, option.code)}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`w-6 h-6 rounded-pill border-2 flex items-center justify-center flex-shrink-0 ${
                    active
                      ? "bg-brand-gold border-brand-gold text-content-on-gold"
                      : "border-line-strong"
                  }`}
                >
                  {active ? <Icon name="check" size={14} strokeWidth={2.75} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---- share & QR ---- */}
      <section className="bg-surface-raised border border-line-subtle rounded-card p-5 mb-6">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-control bg-surface-sunken text-content-secondary flex items-center justify-center flex-shrink-0">
            <Icon name="qr" size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-h2 text-content-primary">{t("share_booking_title")}</h2>
            <p className="text-caption text-content-muted">{t("ready_made_copy_sub")}</p>
          </div>
          <Button variant="secondary" size="sm" to="/company/share" iconEnd="chevron-right">
            {t("view")}
          </Button>
        </div>
      </section>

      <section className="mb-6">
        <SectionHeader title={t("operating_hours")} subtitle={t("operating_hours_sub")} />
        <ShopHoursEditor />
      </section>
    </div>
  );
}
