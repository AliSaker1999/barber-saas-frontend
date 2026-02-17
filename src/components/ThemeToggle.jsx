import { useEffect, useState } from "react";
import { getInitialTheme, setTheme } from "../utils/theme";

export default function ThemeToggle({ className = "" }) {
  const [theme, setThemeState] = useState("light");

  useEffect(() => {
    setThemeState(getInitialTheme());
  }, []);

  const isDark = theme === "dark";

  const handleToggle = () => {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    setThemeState(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`tap-target rounded-xl px-2.5 py-2 text-xs font-bold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:bg-black dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950 transition-colors ${className}`}
      aria-label="Toggle dark mode"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
