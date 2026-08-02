export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "ats-theme";

export function applyTheme(theme: Theme) {
  const isDark =
    theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

// Runs as a blocking inline script in <head> (see layout.tsx) so the
// correct theme class is set before first paint — avoids a flash of the
// wrong theme. Keep this in sync with applyTheme() above.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("${THEME_STORAGE_KEY}") || "system";
    var isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;
