/**
 * Shared badge style constants for semantic color variants.
 *
 * All color scales are now CSS variable-backed with perceptual mapping:
 * shade 50 = subtle background, shade 700 = prominent text — in ANY theme,
 * light or dark. No `dark:` overrides needed.
 */

/** Semantic color badge — auto-adapts to light/dark/themed modes via CSS vars */
export const BADGE_VARIANT = {
  success:
    "border border-success-200 bg-success-50 text-success-700",
  error:
    "border border-error-200 bg-error-50 text-error-700",
  warning:
    "border border-warning-200 bg-warning-50 text-warning-700",
  info:
    "border border-info-200 bg-info-50 text-info-700",
  primary:
    "border border-primary-200 bg-primary-50 text-primary-700",
  accent:
    "border border-accent-200 bg-accent-50 text-accent-700",
  secondary:
    "border border-secondary-200 bg-secondary-50 text-secondary-700",
  neutral:
    "border border-border bg-muted text-muted-foreground",
} as const;

export type BadgeVariant = keyof typeof BADGE_VARIANT;
