import { useCallback, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "meditrack-theme";

/**
 * Resolves the effective theme (light | dark) from a preference.
 * "system" defers to the OS media query.
 */
function resolveTheme(preference: Theme): "light" | "dark" {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return preference;
}

/** Read stored preference (falls back to "system"). */
function getStoredPreference(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // SSR or localStorage unavailable — fall back silently
  }
  return "system";
}

/** Apply .dark class to <html> and persist preference. */
function applyTheme(preference: Theme) {
  const resolved = resolveTheme(preference);
  const root = document.documentElement;

  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Update meta theme-color for mobile browsers
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#0B1437" : "#f5f7fa");
  }

  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Quota exceeded or unavailable — non-critical
  }
}

// ── External store for cross-component sync ───────────────────────
let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot(): Theme {
  return getStoredPreference();
}

/**
 * Theme hook — manages light/dark/system preference.
 *
 * Uses `useSyncExternalStore` for cross-component reactivity without
 * a Context provider. All components calling `useTheme()` stay in sync.
 *
 * @example
 * const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "system" as Theme);
  const resolvedTheme = resolveTheme(theme);

  // Apply on mount + when preference changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for OS dark mode changes when preference is "system"
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    applyTheme(newTheme);
    emitChange();
  }, []);

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    applyTheme(next);
    emitChange();
  }, [resolvedTheme]);

  return { theme, resolvedTheme, setTheme, toggleTheme } as const;
}
