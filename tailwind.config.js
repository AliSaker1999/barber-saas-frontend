/** @type {import('tailwindcss').Config} */

/*
 * Every colour below resolves to a semantic token declared in
 * src/styles/tokens.css. New UI uses only these aliases — never bg-white,
 * text-gray-500, bg-blue-600 or any other raw palette literal, which the
 * deprecated legacy-compat shim still has to intercept.
 */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "var(--brand-ink)",
          gold: "var(--brand-gold)",
          "gold-text": "var(--brand-gold-text)",
          "gold-soft": "var(--brand-gold-soft)",
          "gold-softer": "var(--brand-gold-softer)"
        },
        surface: {
          base: "var(--surface-base)",
          raised: "var(--surface-raised)",
          elevated: "var(--surface-elevated)",
          sunken: "var(--surface-sunken)",
          inverse: "var(--surface-inverse)"
        },
        content: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
          "on-gold": "var(--text-on-gold)",
          "on-danger": "var(--text-on-danger)",
          "on-success": "var(--text-on-success)",
          "on-warning": "var(--text-on-warning)"
        },
        line: {
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)"
        },
        state: {
          success: "var(--success)",
          "success-soft": "var(--success-soft)",
          warning: "var(--warning)",
          "warning-soft": "var(--warning-soft)",
          danger: "var(--danger)",
          "danger-soft": "var(--danger-soft)",
          info: "var(--info)",
          "info-soft": "var(--info-soft)"
        },

        /* Legacy aliases — kept so un-migrated screens keep compiling. */
        background: "var(--surface-base)",
        primary: "var(--brand-gold)",
        accent: "var(--brand-gold)",
        muted: "var(--text-muted)"
      },
      fontFamily: {
        sans: ["Manrope", "Inter", "Segoe UI", "system-ui", "sans-serif"],
        arabic: ["Tajawal", "Segoe UI", "system-ui", "sans-serif"]
      },
      fontSize: {
        /* Type scale — display → caption (spec §21). */
        display: ["2rem", { lineHeight: "2.25rem", letterSpacing: "-0.03em", fontWeight: "800" }],
        h1: ["1.5rem", { lineHeight: "1.875rem", letterSpacing: "-0.025em", fontWeight: "700" }],
        h2: ["1.1875rem", { lineHeight: "1.5rem", letterSpacing: "-0.02em", fontWeight: "700" }],
        h3: ["1rem", { lineHeight: "1.375rem", letterSpacing: "-0.01em", fontWeight: "700" }],
        body: ["0.9375rem", { lineHeight: "1.4375rem" }],
        "body-sm": ["0.875rem", { lineHeight: "1.3125rem" }],
        caption: ["0.8125rem", { lineHeight: "1.125rem" }],
        label: ["0.6875rem", { lineHeight: "0.875rem", letterSpacing: "0.06em", fontWeight: "700" }]
      },
      borderRadius: {
        card: "18px",
        control: "14px",
        pill: "999px",
        sheet: "24px"
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        sheet: "var(--shadow-sheet)"
      },
      spacing: {
        /* Height of the customer bottom bar, so pages can reserve room. */
        navbar: "68px"
      },
      transitionTimingFunction: {
        out: "var(--ease-out)"
      },
      animation: {
        "sheet-in": "aj-sheet-in var(--dur-slow) var(--ease-out)",
        "fade-in": "aj-fade-in var(--dur-base) var(--ease-out)",
        rise: "aj-rise var(--dur-base) var(--ease-out)",
        check: "aj-check 420ms var(--ease-out)",
        "pulse-ring": "aj-pulse-ring 2s ease-out infinite"
      }
    }
  },
  plugins: []
};
