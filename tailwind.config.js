/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--app-bg)",
        surface: "var(--app-surface)",
        primary: "var(--app-primary)",
        "primary-hover": "var(--app-primary-hover)",
        secondary: "var(--app-muted)",
        accent: "var(--app-accent)", 
        border: "var(--app-border)",
        success: "var(--app-success)",
        warning: "var(--app-warning)",
        error: "var(--app-danger)",
        info: "var(--app-info)",
        muted: "var(--app-muted)",
      }
    }
  },
  plugins: []
};
