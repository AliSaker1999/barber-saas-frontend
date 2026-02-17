const THEME_KEY = "barber-theme";

function applyThemeClass(theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.setAttribute("data-theme", theme);
}

export function getInitialTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function initTheme() {
  const theme = getInitialTheme();
  applyThemeClass(theme);
  return theme;
}

export function setTheme(theme) {
  applyThemeClass(theme);
  localStorage.setItem(THEME_KEY, theme);
}
