import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import { fetchCompanyProfile } from "../../features/company/companySlice";
import { fetchServices } from "../../features/services/servicesSlice";
import { fetchLoyaltyRewards } from "../../features/loyalty/loyaltySlice";
import { formatMoney } from "../../utils/format";
import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import { Row } from "../../components/ui/Primitives";
import { ErrorState, ListSkeleton } from "../../components/ui/States";
import ShopIdentityForm from "../../components/setup/ShopIdentityForm";
import ShopContactForm from "../../components/setup/ShopContactForm";
import ShopLocationForm from "../../components/setup/ShopLocationForm";
import ShopPaymentsForm from "../../components/setup/ShopPaymentsForm";
import ShopPoliciesForm from "../../components/setup/ShopPoliciesForm";
import LoyaltyRewardsEditor from "../../components/setup/LoyaltyRewardsEditor";

/*
 * Everything about the shop that is not a service, a barber or an opening hour.
 *
 * What this replaces was one 997-line screen with a page-wide edit mode: you
 * pressed Edit Profile at the top, all forty-odd fields turned into inputs at
 * once, and one Save wrote the lot. On a 360px phone that is a very long
 * scroll between the field you came to change and the button that saves it,
 * and a failure anywhere failed all of it.
 *
 * Now each group is a section that owns its own draft, its own validation and
 * its own Save, and the page is a list of them. Collapsed, the summaries read
 * as a status board — what is set, what is missing, what is switched on —
 * which is the question an owner actually opens this screen with.
 *
 * The sections are the same components the setup wizard uses. The booking link
 * and the currency are not here: /company/share and /company/settings already
 * own them properly, and a second copy is a second thing to keep true.
 */

const SECTIONS = [
  { key: "identity", icon: "info", titleKey: "profile_identity" },
  { key: "look", icon: "image", titleKey: "profile_look" },
  { key: "contact", icon: "phone", titleKey: "profile_contact" },
  { key: "location", icon: "pin", titleKey: "profile_location" },
  { key: "payments", icon: "wallet", titleKey: "profile_payments" },
  { key: "policies", icon: "calendar", titleKey: "profile_policies" },
  { key: "loyalty", icon: "gift", titleKey: "profile_loyalty" }
];

export default function CompanyProfile() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const { profile, loading, error } = useAppSelector((state) => state.company);
  const rewards = useAppSelector((state) => state.loyalty.rewards.items);

  /* One open at a time: seven expanded sections is the long scroll this screen
     was rebuilt to stop being. */
  const [open, setOpen] = useState(null);

  useEffect(() => {
    dispatch(fetchCompanyProfile());
    /* Both are read by the sections below — the loyalty editor needs the
       service list to know what earns points and what can be redeemed. */
    dispatch(fetchServices());
    dispatch(fetchLoyaltyRewards());
  }, [dispatch]);

  if (loading && !profile) {
    return (
      <div className="pb-8">
        <TopBar title={t("shop_info")} subtitle={t("profile_subtitle")} />
        <div className="px-4 pt-3">
          <ListSkeleton count={6} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pb-8">
        <TopBar title={t("shop_info")} subtitle={t("profile_subtitle")} />
        <div className="px-4 pt-3">
          <ErrorState
            message={error || t("error_generic")}
            onRetry={() => dispatch(fetchCompanyProfile())}
          />
        </div>
      </div>
    );
  }

  const currency = profile.Currency || "USD";

  /* Each summary answers "is this done?" without opening the section. */
  const summary = (key) => {
    switch (key) {
      case "identity":
        return [profile.Name, profile.City].filter(Boolean).join(" · ") || t("not_set");
      case "look":
        if (profile.LogoUrl && profile.CoverImageUrl) return t("profile_look_both");
        if (profile.LogoUrl) return t("profile_look_logo_only");
        if (profile.CoverImageUrl) return t("profile_look_cover_only");
        return t("profile_look_none");
      case "contact":
        return profile.Email || profile.WebsiteUrl || t("not_set");
      case "location": {
        const address = [profile.Street, profile.Building].filter(Boolean).join(" ");
        if (address) return address;
        return profile.Latitude != null && profile.Longitude != null
          ? t("profile_location_pinned")
          : t("profile_location_none");
      }
      case "payments": {
        const methods = [t("pay_cash")];
        if (profile.IsWhishPaymentEnabled) methods.push(t("pay_whish"));
        if (profile.IsCreditCardPaymentEnabled) methods.push(t("pay_card"));
        const line = methods.join(" · ");
        return Number(profile.DepositAmount) > 0
          ? `${line} · ${t("profile_deposit_of", {
              amount: formatMoney(profile.DepositAmount, currency)
            })}`
          : line;
      }
      case "policies":
        return t("profile_policies_summary", {
          days: profile.MaxAdvanceBookingDays ?? 30,
          hours: profile.CancellationPolicyHours ?? 24
        });
      case "loyalty":
        if (!profile.LoyaltyEnabled) return t("profile_loyalty_off");
        return rewards.length
          ? t("profile_loyalty_rewards", { n: rewards.length })
          : t("profile_loyalty_no_rewards");
      default:
        return "";
    }
  };

  const body = (key) => {
    switch (key) {
      case "identity":
        return <ShopIdentityForm section="identity" />;
      case "look":
        return <ShopIdentityForm section="look" />;
      case "contact":
        return <ShopContactForm />;
      case "location":
        return <ShopLocationForm />;
      case "payments":
        return <ShopPaymentsForm />;
      case "policies":
        return <ShopPoliciesForm />;
      case "loyalty":
        return <LoyaltyRewardsEditor />;
      default:
        return null;
    }
  };

  return (
    <div className="pb-8">
      <TopBar back title={t("shop_info")} subtitle={t("profile_subtitle")} />

      <div className="px-4 pt-3 space-y-2">
        {SECTIONS.map((section) => {
          const isOpen = open === section.key;

          return (
            <div
              key={section.key}
              className="rounded-card bg-surface-raised border border-line-subtle overflow-hidden"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : section.key)}
                className="press w-full flex items-center gap-3 min-h-[60px] px-3.5 py-2.5 text-start"
              >
                <span className="flex-shrink-0 w-9 h-9 rounded-control bg-surface-sunken flex items-center justify-center">
                  <Icon name={section.icon} size={18} className="text-content-secondary" />
                </span>

                <span className="flex-1 min-w-0">
                  <span className="block text-body font-semibold text-content-primary">
                    {t(section.titleKey)}
                  </span>
                  <span className="block text-caption text-content-muted truncate">
                    {summary(section.key)}
                  </span>
                </span>

                <Icon
                  name={isOpen ? "minus" : "plus"}
                  size={18}
                  className="flex-shrink-0 text-content-muted"
                />
              </button>

              {isOpen ? (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-line-subtle">
                  {body(section.key)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="px-4 pt-4 space-y-2">
        <Row
          icon="qr"
          label={t("share_booking_title")}
          value={profile.Slug ? `/${profile.Slug}` : t("not_set")}
          to="/company/share"
        />
        <Row
          icon="settings"
          label={t("nav_settings")}
          value={t("profile_settings_value", { currency })}
          to="/company/settings"
        />
      </div>
    </div>
  );
}
