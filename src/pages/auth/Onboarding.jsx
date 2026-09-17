import { useState } from "react";
import { useI18n } from "../../i18n";
import Button from "../../components/ui/Button";
import Icon from "../../components/ui/Icon";

/*
 * The first four screens anybody sees.
 *
 * Each slide used to lead with a large bouncing emoji on a hard-coded colour
 * gradient — purple-to-pink for the loyalty slide, blue-to-indigo for booking —
 * none of which is the brand, in the one place a first impression is made. The
 * spec bans emoji from shipping UI and this was the most prominent use of them
 * left in the app.
 *
 * The language toggle stays exactly where it was and gets a real label. It is
 * the most important control on this screen: an Arabic reader should not have
 * to finish an English onboarding to find out the app speaks Arabic.
 */

const SLIDES = [
  { icon: "scissors", titleKey: "onboarding_title_1", descKey: "onboarding_desc_1" },
  { icon: "calendar", titleKey: "onboarding_title_2", descKey: "onboarding_desc_2" },
  { icon: "clock", titleKey: "onboarding_title_3", descKey: "onboarding_desc_3" },
  { icon: "gift", titleKey: "onboarding_title_4", descKey: "onboarding_desc_4" }
];

export default function Onboarding({ onComplete }) {
  const { t, locale, toggleLanguage } = useI18n();
  const [step, setStep] = useState(0);

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-surface-base flex flex-col">
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <Button variant="ghost" size="sm" onClick={onComplete}>
          {t("skip")}
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleLanguage} icon="globe">
          {locale === "en" ? "العربية" : "English"}
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <span className="inline-flex w-24 h-24 rounded-pill bg-brand-gold-soft text-brand-gold-text items-center justify-center mb-7">
          <Icon name={slide.icon} size={44} />
        </span>

        <h1 className="text-h1 text-content-primary mb-3">{t(slide.titleKey)}</h1>
        <p className="text-body text-content-secondary max-w-[38ch]">{t(slide.descKey)}</p>
      </div>

      <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4">
        <div
          className="flex justify-center gap-2 mb-5"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={SLIDES.length}
          aria-label={t("onboarding_progress", { step: step + 1, total: SLIDES.length })}
        >
          {SLIDES.map((entry, index) => (
            <span
              key={entry.icon}
              className={`h-2 rounded-pill transition-[width,background-color] ${
                index === step ? "w-7 bg-brand-gold" : "w-2 bg-line-strong"
              }`}
            />
          ))}
        </div>

        <Button block size="lg" onClick={() => (isLast ? onComplete() : setStep(step + 1))}>
          {isLast ? t("get_started") : t("next")}
        </Button>
      </div>
    </div>
  );
}
