import { useEffect, useSyncExternalStore } from "react";
import { deriveTheme } from "@/shared/utils/themeDerivation";
import { COLOR_THEME_CONFIGS, type ColorThemeDefinition } from "@/shared/config/color-themes";

// ── Public types ────────────────────────────────────────────────

/** Derive valid IDs from config so the type stays in sync automatically */
export type ColorThemeId = "default" | typeof COLOR_THEME_CONFIGS[number]["id"];

/** Re-export for consumers that need the config shape */
export type { ColorThemeDefinition };
export { COLOR_THEME_CONFIGS };

// ── CSS variable cache ──────────────────────────────────────────

/** Cache derived CSS strings so we don't re-derive on every theme switch */
const cssCache = new Map<string, string>();

function getCssForTheme(config: ColorThemeDefinition): string {
  const cached = cssCache.get(config.id);
  if (cached) return cached;

  const theme = deriveTheme(config.palette);
  const vars = Object.entries(theme)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");

  cssCache.set(config.id, vars);
  return vars;
}

// ── DOM application ─────────────────────────────────────────────

const STYLE_ID = "meditrack-color-theme-vars";
const STORAGE_KEY = "meditrack-color-theme";

/** Module-level cache — avoids reading localStorage on every React render check */
let currentThemeId: ColorThemeId = "default";

// Initialize from localStorage at module load time (not inside getSnapshot)
// so the snapshot function remains pure and side-effect-free.
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "default" || (stored && COLOR_THEME_CONFIGS.some((t) => t.id === stored))) {
    currentThemeId = stored as ColorThemeId;
  }
} catch { /* localStorage unavailable */ }

// Apply immediately at module load so the correct color palette is visible
// before any React component mounts (prevents theme flash on F5).
applyColorTheme(currentThemeId);

/**
 * Apply color theme by injecting a <style> block with derived CSS variables.
 * The injected <style> appears after the stylesheet in <head>, so it always
 * overrides the .dark block — no specificity war.
 */
function applyColorTheme(themeId: ColorThemeId) {
  if (typeof document === "undefined") return;

  currentThemeId = themeId;

  // Remove any previous injected style
  document.getElementById(STYLE_ID)?.remove();

  if (themeId === "default") {
    try { localStorage.setItem(STORAGE_KEY, themeId); } catch { /* non-critical */ }
    return;
  }

  const config = COLOR_THEME_CONFIGS.find((t) => t.id === themeId);
  if (!config) {
    // Theme was removed from config — reset to default
    console.warn(`Color theme "${themeId}" not found in config. Resetting to default.`);
    currentThemeId = "default";
    try { localStorage.setItem(STORAGE_KEY, "default"); } catch { /* non-critical */ }
    return;
  }

  const root = document.documentElement;

  // Set light/dark mode based on palette
  if (config.mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Inject <style> with derived variables — selector matches the mode
  const css = getCssForTheme(config);
  const selector = config.mode === "dark" ? "html.dark" : "html:not(.dark)";
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `${selector} { ${css} }`;
  document.head.appendChild(style);

  try { localStorage.setItem(STORAGE_KEY, themeId); } catch { /* non-critical */ }

  // Set cookie for cross-origin theme sharing (Identity.API reads this)
  try {
    document.cookie = `meditrack-color-theme=${themeId};path=/;SameSite=Lax;max-age=31536000`;
  } catch { /* non-critical */ }
}

// ── External store for cross-component sync ─────────────────────

let colorListeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  colorListeners = [...colorListeners, listener];
  return () => {
    colorListeners = colorListeners.filter((l) => l !== listener);
  };
}

function emitChange() {
  for (const listener of colorListeners) listener();
}

function getSnapshot(): ColorThemeId {
  return currentThemeId;
}

// ── Hook ────────────────────────────────────────────────────────

/**
 * Hook for named color theme selection.
 *
 * Works alongside useTheme (light/dark/system).
 * Adding a new theme = add an entry to COLOR_THEME_CONFIGS. That's it.
 */
export function useColorTheme() {
  const colorTheme = useSyncExternalStore(subscribe, getSnapshot, () => "default" as ColorThemeId);

  // Apply on mount (hydrate from localStorage)
  useEffect(() => {
    applyColorTheme(colorTheme);
  }, [colorTheme]);

  const setColorTheme = (newTheme: ColorThemeId) => {
    applyColorTheme(newTheme);
    emitChange();
  };

  return { colorTheme, setColorTheme, themes: COLOR_THEME_CONFIGS } as const;
}
