/**
 * Centralized chart color tokens for Recharts components.
 *
 * Recharts requires raw hex strings for fill/stroke/color props — it cannot
 * consume Tailwind utility classes. This module maps every chart color to
 * its design-token name so that palette changes only need to happen here
 * and in tailwind.config.ts.
 *
 * Dark mode: use `isDark` helpers or the `DARK_*` variants. Charts that
 * need CSS-variable-based colors should use the `CHART_*` style objects
 * which read from `--chart-*` CSS variables.
 *
 * Naming convention: TOKEN_SHADE  (matches tailwind.config.ts exactly)
 */

// ── Primary (Medical Blue) ──────────────────────────────────────────
export const PRIMARY_400 = "#60a5fa";
export const PRIMARY_500 = "#3b82f6";
export const PRIMARY_600 = "#2563eb";
export const PRIMARY_700 = "#1d4ed8";

// ── Secondary (Healthcare Teal) ─────────────────────────────────────
export const SECONDARY_400 = "#2dd4bf";
export const SECONDARY_500 = "#14b8a6";
export const SECONDARY_700 = "#0f766e";

// ── Accent (Violet) ─────────────────────────────────────────────────
export const ACCENT_400 = "#c084fc";
export const ACCENT_500 = "#a855f7";
export const ACCENT_700 = "#7c3aed";

// ── Semantic ─────────────────────────────────────────────────────────
export const SUCCESS_400 = "#4ade80";
export const SUCCESS_500 = "#22c55e";
export const WARNING_400 = "#fbbf24";
export const WARNING_500 = "#f59e0b";
export const ERROR_400 = "#f87171";
export const ERROR_500 = "#ef4444";
export const INFO_400 = "#38bdf8";
export const INFO_500 = "#0ea5e9";

// ── Neutral (axes, grid, tooltip borders) ────────────────────────────
export const NEUTRAL_200 = "#e2e8f0";
export const NEUTRAL_400 = "#94a3b8";
export const NEUTRAL_500 = "#64748b";
export const NEUTRAL_700 = "#334155";

// ── Dark mode neutral equivalents (deep navy) ───────────────────────
export const DARK_NEUTRAL_GRID = "#2A3F6E";
export const DARK_NEUTRAL_TEXT = "#8294B8";
export const DARK_NEUTRAL_BORDER = "#334D80";

// ── Additional chart palette colors ──────────────────────────────────
export const ORANGE_500 = "#f97316";
export const ORANGE_600 = "#ea580c";
export const ROSE_500 = "#f43f5e";
export const LIME_500 = "#84cc16";
export const YELLOW_500 = "#eab308";
export const INDIGO_500 = "#6366f1";

// ── Theme-aware helpers ──────────────────────────────────────────────

/** Check if dark mode is active (reads .dark class from <html>). */
export function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark");
}

/** Return the appropriate color for the current theme. */
export function themed(light: string, dark: string): string {
  return isDarkMode() ? dark : light;
}

// ── Shared Recharts style objects (theme-aware via CSS variables) ─────

export const CHART_GRID_STROKE = NEUTRAL_200;

export const CHART_AXIS_TICK = { fontSize: 11, fill: NEUTRAL_500 };

export const CHART_AXIS_LINE = { stroke: NEUTRAL_200 };

export const CHART_TOOLTIP_STYLE = {
  border: `1px solid ${NEUTRAL_200}`,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
};

/** Theme-aware versions — call these in render to get current-theme colors. */
export function getChartGridStroke(): string {
  return themed(NEUTRAL_200, DARK_NEUTRAL_GRID);
}

export function getChartAxisTick() {
  return { fontSize: 11, fill: themed(NEUTRAL_500, DARK_NEUTRAL_TEXT) };
}

export function getChartAxisLine() {
  return { stroke: themed(NEUTRAL_200, DARK_NEUTRAL_GRID) };
}

export function getChartTooltipStyle() {
  return {
    backgroundColor: themed("#ffffff", "#172550"),
    border: `1px solid ${themed(NEUTRAL_200, DARK_NEUTRAL_BORDER)}`,
    boxShadow: themed(
      "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      "0 4px 12px -1px hsl(228 80% 5% / 0.5)"
    ),
    color: themed("#0f172a", "#e2e8f0"),
    borderRadius: 8,
    fontSize: 12,
  };
}

/** Surface color for active dots, pie stroke, etc. */
export function getChartSurface(): string {
  return themed("#ffffff", "#172550");
}

// ── Pre-built palettes for common chart types ────────────────────────

/** Appointment status breakdown (ordered: scheduled → confirmed → completed → cancelled → noShow) */
export const STATUS_PALETTE = [
  PRIMARY_500,
  SECONDARY_500,
  SUCCESS_500,
  ERROR_500,
  WARNING_500,
] as const;

/** Extended status palette (8 colors) for suggestion types, etc. */
export const EXTENDED_STATUS_PALETTE = [
  PRIMARY_500,
  SECONDARY_500,
  SUCCESS_500,
  ERROR_500,
  WARNING_500,
  NEUTRAL_400,
  ACCENT_500,
  ORANGE_500,
] as const;

/** Appointment type distribution (10 colors) */
export const TYPE_PALETTE = [
  PRIMARY_700,
  SECONDARY_700,
  ACCENT_700,
  ORANGE_600,
  INFO_500,
  LIME_500,
  ROSE_500,
  YELLOW_500,
  INDIGO_500,
  SECONDARY_500,
] as const;

/** Gender breakdown (4 colors) */
export const GENDER_PALETTE = [
  PRIMARY_500,
  ROSE_500,
  ACCENT_500,
  NEUTRAL_400,
] as const;

/** User role breakdown (5 colors) */
export const ROLE_PALETTE = [
  PRIMARY_700,
  ACCENT_500,
  SECONDARY_700,
  WARNING_500,
  INFO_500,
] as const;

/**
 * Dark-mode-optimized palettes — brighter colors for dark backgrounds.
 * Use `isDarkMode() ? DARK_STATUS_PALETTE : STATUS_PALETTE` in charts.
 */
export const DARK_STATUS_PALETTE = [
  PRIMARY_400,
  SECONDARY_400,
  SUCCESS_400,
  ERROR_400,
  WARNING_400,
] as const;

export const DARK_TYPE_PALETTE = [
  PRIMARY_500,
  SECONDARY_500,
  ACCENT_500,
  ORANGE_500,
  INFO_400,
  LIME_500,
  ROSE_500,
  YELLOW_500,
  INDIGO_500,
  SECONDARY_400,
] as const;
