import { createContext, useContext, useState, useEffect, useCallback } from "react";
import en from "./en";
import ar from "./ar";

const translations = { en, ar };

const I18nContext = createContext();

const LANG_KEY = "ajmal_language";

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem(LANG_KEY) || "en";
  });

  /*
   * t("wait_range", { low: 20, high: 30 }) fills {low}/{high} placeholders.
   * The params argument is optional, so every existing single-argument call
   * keeps working unchanged.
   */
  const t = useCallback(
    (key, params) => {
      const template = translations[locale]?.[key] ?? translations.en[key] ?? key;
      if (!params) return template;

      return Object.keys(params).reduce(
        (acc, name) => acc.split(`{${name}}`).join(String(params[name])),
        template
      );
    },
    [locale]
  );

  const switchLanguage = useCallback((lang) => {
    if (translations[lang]) {
      setLocale(lang);
      localStorage.setItem(LANG_KEY, lang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    const next = locale === "en" ? "ar" : "en";
    switchLanguage(next);
  }, [locale, switchLanguage]);

  const isRTL = locale === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", locale);
    if (isRTL) {
      document.documentElement.classList.add("rtl");
    } else {
      document.documentElement.classList.remove("rtl");
    }
  }, [dir, locale, isRTL]);

  return (
    <I18nContext.Provider
      value={{ t, locale, isRTL, dir, switchLanguage, toggleLanguage }}
    >
      {children}
    </I18nContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export default I18nContext;
