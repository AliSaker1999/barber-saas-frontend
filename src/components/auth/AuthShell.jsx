import { useState } from "react";
import { useI18n } from "../../i18n";
import Icon from "../ui/Icon";
import PrivacyPolicyModal from "../PrivacyPolicyModal";
import TermsOfServiceModal from "../TermsOfServiceModal";

/*
 * The frame around signing in and signing up.
 *
 * Both screens had their own copy of this — the same card, the same header,
 * the same footer, and the same pair of 384px blurred blobs animating behind
 * it under `mix-blend-multiply`. Two continuously animating blur filters at
 * that size are not free on the mid-range Android this app targets, and they
 * were decoration on the one screen a person wants to get past quickly. They
 * are gone; the card carries its own weight.
 *
 * The policy modals live here because both screens need them and the consent
 * checkbox on signup depends on knowing they were opened.
 */
export default function AuthShell({ title, subtitle, children, footer, onReadPolicy }) {
  const { t } = useI18n();

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  function openTerms() {
    setTermsOpen(true);
    onReadPolicy?.("terms");
  }

  function openPrivacy() {
    setPrivacyOpen(true);
    onReadPolicy?.("privacy");
  }

  return (
    <div className="min-h-screen bg-surface-base flex flex-col justify-center px-4 py-8">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <span className="inline-flex w-14 h-14 rounded-pill bg-brand-gold-soft text-brand-gold-text items-center justify-center mb-3">
            <Icon name="scissors" size={26} />
          </span>
          <h1 className="text-h1 text-content-primary">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-body-sm text-content-secondary">{subtitle}</p>
          ) : null}
        </div>

        <div className="rounded-card bg-surface-raised border border-line-subtle p-5">
          {/* Signup needs to open these from inside its own consent sentence,
              so the openers are handed down rather than kept private here. */}
          {typeof children === "function" ? children({ openTerms, openPrivacy }) : children}
        </div>

        {footer ? <div className="mt-4">{footer}</div> : null}

        <div className="mt-6 text-center">
          <div className="flex justify-center gap-4 text-caption">
            <button
              type="button"
              onClick={openPrivacy}
              className="press text-content-muted underline min-h-[44px] px-2"
            >
              {t("privacy_policy")}
            </button>
            <button
              type="button"
              onClick={openTerms}
              className="press text-content-muted underline min-h-[44px] px-2"
            >
              {t("terms_of_service")}
            </button>
          </div>
          <p className="text-caption text-content-muted">{t("auth_copyright")}</p>
        </div>
      </div>

      <PrivacyPolicyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <TermsOfServiceModal isOpen={termsOpen} onClose={() => setTermsOpen(false)} />
    </div>
  );
}
