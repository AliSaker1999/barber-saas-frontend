import { useI18n } from "../i18n";

export default function LanguageSwitcher({ compact = false }) {
  const { locale, toggleLanguage } = useI18n();

  if (compact) {
    return (
      <button
        onClick={toggleLanguage}
        className="p-1.5 sm:p-2 rounded-lg bg-app-surface-2 hover:bg-app-surface dark:bg-gray-800 dark:hover:bg-gray-700 transition-all text-sm font-bold text-app-muted"
        title={locale === "en" ? "التبديل إلى العربية" : "Switch to English"}
      >
        {locale === "en" ? "ع" : "EN"}
      </button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-app-surface-2 hover:bg-app-surface dark:bg-gray-800 dark:hover:bg-gray-700 border border-app-border transition-all"
    >
      <span className="text-lg">{locale === "en" ? "🇱🇧" : "🇬🇧"}</span>
      <span className="text-sm font-bold text-app-muted">
        {locale === "en" ? "العربية" : "English"}
      </span>
    </button>
  );
}
