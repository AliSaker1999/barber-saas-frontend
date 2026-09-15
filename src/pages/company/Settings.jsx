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
import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import Button, { IconButton } from "../../components/ui/Button";
import { formatMoney } from "../../utils/format";
import { Pill, Row, SectionHeader } from "../../components/ui/Primitives";
import { InlineError } from "../../components/ui/States";
import ShopHoursEditor from "../../components/setup/ShopHoursEditor";

/*
 * What the shop pays, what it gets paid in, and when it is open.
 *
 * One currency distinction runs through this screen and is worth stating
 * plainly, because it is the only place in the app where a hardcoded currency
 * is correct. The plan prices below are what Ajmal charges the shop, and
 * SubscriptionPlans has no currency column — the platform bills in one
 * currency for everyone. The currency picker further down is a different
 * thing entirely: it is what the shop charges its own customers, and nothing
 * anywhere converts between the two.
 */
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
   * the sample below spells that out.
   */
  const currency = profile?.Currency || "USD";

  const handleCurrency = async (next) => {
    if (next === currency) return;
    setSavingCurrency(next);
    try {
      await dispatch(updateCompanyProfile({ currency: next })).unwrap();
      await dispatch(fetchCompanyProfile());
      toast.success(t("saved"));
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setSavingCurrency(null);
    }
  };

  const stripeReady = Boolean(connectStatus?.chargesEnabled);

  return (
    <div className="pb-8">
      <TopBar back title={t("shop_settings")} subtitle={t("settings_subtitle")} />

      <div className="px-4 pt-3 space-y-4">
        {checkoutStatus === "success" || checkoutStatus === "cancelled" ? (
          <div className="flex items-start gap-2.5 rounded-card bg-surface-raised border border-line-subtle px-3.5 py-3">
            <Icon
              name={checkoutStatus === "success" ? "check" : "info"}
              size={18}
              className={
                checkoutStatus === "success"
                  ? "text-state-success mt-0.5 flex-shrink-0"
                  : "text-content-muted mt-0.5 flex-shrink-0"
              }
            />
            <p className="flex-1 text-body-sm text-content-secondary">
              {checkoutStatus === "success" ? t("checkout_success") : t("checkout_cancelled")}
            </p>
            <IconButton
              icon="x"
              label={t("dismiss")}
              variant="ghost"
              size="sm"
              onClick={dismissCheckoutBanner}
            />
          </div>
        ) : null}

        {/* ---- billing ---- */}
        <section className="bg-surface-raised border border-line-subtle rounded-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-10 h-10 rounded-control bg-surface-sunken text-content-secondary flex items-center justify-center flex-shrink-0">
              <Icon name="card" size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-h2 text-content-primary">{t("billing")}</h2>
              <p className="text-caption text-content-muted">
                {profile?.PlanName
                  ? t("billing_current_plan", {
                      plan: profile.PlanName,
                      price: formatMoney(profile.PlanMonthlyPrice, "USD")
                    })
                  : t("billing_no_plan")}
              </p>
            </div>
          </div>

          {checkoutError ? <InlineError message={checkoutError} /> : null}

          {!availablePlans.length ? (
            <p className="text-body-sm text-content-muted">{t("billing_no_plans")}</p>
          ) : (
            <ul className="space-y-2">
              {availablePlans.map((plan) => {
                const isCurrent = profile?.PlanId === plan.Id;
                const range = plan.MaxBarbers
                  ? `${plan.MinBarbers}-${plan.MaxBarbers}`
                  : `${plan.MinBarbers}+`;

                return (
                  <li
                    key={plan.Id}
                    className={`flex items-center gap-3 p-3.5 rounded-card border ${
                      isCurrent
                        ? "border-brand-gold bg-brand-gold-soft"
                        : "border-line-subtle bg-surface-sunken"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-body font-bold text-content-primary truncate">
                          {plan.Name}
                        </p>
                        {isCurrent ? <Pill tone="success">{t("billing_current")}</Pill> : null}
                      </div>
                      <p className="text-caption text-content-muted tnum">
                        {t("billing_barbers_range", { range })}
                      </p>
                      {/* Always the platform's own currency, never the shop's. */}
                      <p className="text-body-sm font-semibold text-content-primary tnum">
                        {t("billing_per_month", {
                          price: formatMoney(plan.MonthlyPrice, "USD")
                        })}
                      </p>
                    </div>

                    {!isCurrent ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={checkoutLoading}
                        onClick={() => handleSubscribe(plan.Id)}
                      >
                        {t("billing_subscribe")}
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---- deposits via Stripe ---- */}
        <section className="bg-surface-raised border border-line-subtle rounded-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-10 h-10 rounded-control bg-surface-sunken text-content-secondary flex items-center justify-center flex-shrink-0">
              <Icon name="wallet" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-h2 text-content-primary">{t("deposit_payments")}</h2>
              <p className="text-caption text-content-muted">{t("deposit_payments_intro")}</p>
            </div>
          </div>

          {connectOnboardingError ? <InlineError message={connectOnboardingError} /> : null}

          <div className="flex items-center gap-3 p-3.5 rounded-card bg-surface-sunken">
            <div className="flex-1 min-w-0">
              {connectStatusLoading ? (
                <p className="text-body-sm text-content-muted">{t("stripe_checking")}</p>
              ) : stripeReady ? (
                <p className="text-body-sm font-semibold text-state-success flex items-center gap-1.5">
                  <Icon name="check" size={16} />
                  {t("stripe_connected")}
                </p>
              ) : connectStatus?.connected ? (
                <p className="text-body-sm font-semibold text-state-warning">
                  {t("stripe_started")}
                </p>
              ) : (
                <p className="text-body-sm text-content-muted">{t("stripe_not_connected")}</p>
              )}
            </div>

            <Button
              variant={stripeReady ? "secondary" : "primary"}
              size="sm"
              loading={connectOnboardingLoading}
              onClick={handleConnectStripe}
            >
              {stripeReady ? t("stripe_manage_action") : t("stripe_connect_action")}
            </Button>
          </div>

          <p className="text-caption text-content-muted mt-2.5">{t("deposit_rules_live_in")}</p>
        </section>

        {/* ---- pricing currency ---- */}
        <section className="bg-surface-raised border border-line-subtle rounded-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-10 h-10 rounded-control bg-surface-sunken text-content-secondary flex items-center justify-center flex-shrink-0">
              <Icon name="tag" size={20} />
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

        <Row
          icon="qr"
          label={t("share_booking_title")}
          value={t("ready_made_copy_sub")}
          to="/company/share"
        />

        <section>
          <SectionHeader title={t("operating_hours")} subtitle={t("operating_hours_sub")} />
          <ShopHoursEditor />
        </section>
      </div>
    </div>
  );
}
