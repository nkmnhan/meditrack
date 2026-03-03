/**
 * Centralized chart color tokens for Recharts components.
 *
 * Recharts requires raw hex strings for fill/stroke/color props — it cannot
 * consume Tailwind utility classes. This module maps every chart color to
 * its design-token name so that palette changes only need to happen here
 * and in tailwind.config.ts.
 *
 * Naming convention: TOKEN_SHADE  (matches tailwind.config.ts exactly)
 */

// ── Primary (Medical Blue) ──────────────────────────────────────────
export const PRIMARY_500 = "#3b82f6";
export const PRIMARY_600 = "#2563eb";
export const PRIMARY_700 = "#1d4ed8";

// ── Secondary (Healthcare Teal) ─────────────────────────────────────
export const SECONDARY_500 = "#14b8a6";
export const SECONDARY_700 = "#0f766e";

// ── Accent (Violet) ─────────────────────────────────────────────────
export const ACCENT_500 = "#a855f7";
export const ACCENT_700 = "#7c3aed";

// ── Semantic ─────────────────────────────────────────────────────────
export const SUCCESS_500 = "#22c55e";
export const WARNING_500 = "#f59e0b";
export const ERROR_500 = "#ef4444";
export const INFO_500 = "#0ea5e9";

// ── Neutral (axes, grid, tooltip borders) ────────────────────────────
export const NEUTRAL_200 = "#e2e8f0";
export const NEUTRAL_400 = "#94a3b8";
export const NEUTRAL_500 = "#64748b";

// ── Additional chart palette colors ──────────────────────────────────
export const ORANGE_600 = "#ea580c";
export const ROSE_500 = "#f43f5e";
export const LIME_500 = "#84cc16";
export const YELLOW_500 = "#eab308";
export const INDIGO_500 = "#6366f1";
export const ORANGE_500 = "#f97316";

// ── Shared Recharts style objects ────────────────────────────────────

export const CHART_GRID_STROKE = NEUTRAL_200;

export const CHART_AXIS_TICK = { fontSize: 11, fill: NEUTRAL_500 };

export const CHART_AXIS_LINE = { stroke: NEUTRAL_200 };

export const CHART_TOOLTIP_STYLE = {
  border: `1px solid ${NEUTRAL_200}`,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
};

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
