"use client";

import { useEffect, useSyncExternalStore } from "react";
import { applyTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

const OPTIONS: { value: Theme; label: string; Icon: () => React.JSX.Element }[] = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "system", label: "System", Icon: SystemIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
];

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): Theme {
  return (window.localStorage.getItem(THEME_STORAGE_KEY) as Theme) ?? "system";
}

// Server (and the client's hydration pass, which must match server output
// exactly) has no localStorage — `null` here means "unknown yet". React
// automatically re-renders with the real getSnapshot() value right after
// hydration completes, with no hydration-mismatch warning and no manual
// setState-in-effect needed.
function getServerSnapshot(): Theme | null {
  return null;
}

function setStoredTheme(next: Theme) {
  window.localStorage.setItem(THEME_STORAGE_KEY, next);
  listeners.forEach((listener) => listener());
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function selectTheme(next: Theme) {
    setStoredTheme(next);
    applyTheme(next);
  }

  // Keep the applied class in sync if the OS theme changes while "system" is selected.
  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return (
    <div className="glass inline-flex min-h-[34px] items-center rounded-full border border-card-border p-0.5 shadow-tinted">
      {theme !== null &&
        OPTIONS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => selectTheme(value)}
            aria-label={`${label} theme`}
            aria-pressed={theme === value}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm transition-colors ${
              theme === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Icon />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
    </div>
  );
}
