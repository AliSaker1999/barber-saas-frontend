import { useState } from "react";
import { useI18n } from "../../i18n";

export default function Onboarding({ onComplete }) {
  const { t, locale, toggleLanguage } = useI18n();
  const [step, setStep] = useState(0);

  const slides = [
    {
      icon: "✂️",
      bg: "from-amber-500 to-yellow-400",
      title: t("onboarding_title_1"),
      desc: t("onboarding_desc_1"),
    },
    {
      icon: "📅",
      bg: "from-blue-500 to-indigo-500",
      title: t("onboarding_title_2"),
      desc: t("onboarding_desc_2"),
    },
    {
      icon: "⏱️",
      bg: "from-green-500 to-emerald-500",
      title: t("onboarding_title_3"),
      desc: t("onboarding_desc_3"),
    },
    {
      icon: "🎁",
      bg: "from-purple-500 to-pink-500",
      title: t("onboarding_title_4"),
      desc: t("onboarding_desc_4"),
    },
  ];

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const slide = slides[step];

  return (
    <div className="fixed inset-0 z-[100] bg-app-bg flex flex-col">
      {/* Language toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={toggleLanguage}
          className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-sm font-bold text-white border border-white/30"
        >
          {locale === "en" ? "العربية" : "English"}
        </button>
      </div>

      {/* Skip button */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={onComplete}
          className="px-4 py-2 text-sm font-bold text-white/70 hover:text-white"
        >
          {t("skip")}
        </button>
      </div>

      {/* Slide content */}
      <div className={`flex-1 flex flex-col items-center justify-center px-8 bg-gradient-to-br ${slide.bg} transition-all duration-500`}>
        <div className="text-8xl mb-8 animate-bounce">{slide.icon}</div>
        <h1 className="text-3xl sm:text-4xl font-black text-white text-center mb-4 leading-tight">
          {slide.title}
        </h1>
        <p className="text-lg text-white/80 text-center max-w-md leading-relaxed">
          {slide.desc}
        </p>
      </div>

      {/* Navigation */}
      <div className="bg-app-surface px-8 py-8 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-app-primary" : "w-2 bg-app-border"
              }`}
            />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-2xl bg-app-primary text-white font-bold text-lg shadow-lg shadow-app-primary/30 hover:opacity-90 transition-all active:scale-[0.98]"
          style={{ color: "#232323" }}
        >
          {step === slides.length - 1 ? t("get_started") : t("next")}
        </button>
      </div>
    </div>
  );
}
