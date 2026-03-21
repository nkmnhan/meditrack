/**
 * Theme Derivation Engine
 *
 * Takes 5 brand colors and derives 100+ semantic CSS variables — core layout,
 * brand scales (primary/secondary/accent 50-950), harmonized semantic scales
 * (success/warning/error/info 50-900), and healing brand scale (50-600).
 *
 * All color scales use **perceptual mapping**: shade numbers have consistent
 * SEMANTIC meaning regardless of light/dark mode:
 *   - 50  = subtle background (light tint in light mode, dark muted in dark mode)
 *   - 200 = border / separator
 *   - 500 = solid / base
 *   - 700 = prominent text (dark in light mode, bright in dark mode)
 *
 * This eliminates the need for `dark:` prefix overrides in components.
 * `bg-success-50 text-success-700` just works in any theme.
 *
 * Usage:
 *   const theme = deriveTheme({ background: '#03045E', foreground: '#CAF0F8', ... });
 *   // Returns 100+ CSS variables as { '--background': '239 94% 19%', ... }
 */

// ── Types ────────────────────────────────────────────────────────

export interface PaletteInput {
  /** Page background (darkest in dark themes, lightest in light) */
  readonly background: string;
  /** Primary text (highest contrast against background) */
  readonly foreground: string;
  /** Main brand / CTA color */
  readonly primary: string;
  /** Supporting action color */
  readonly secondary: string;
  /** Highlight / badge / accent color */
  readonly accent: string;
  /** Optional overrides — auto-derived if omitted */
  readonly destructive?: string;
  readonly success?: string;
  readonly warning?: string;
  readonly error?: string;
  readonly info?: string;
}

export interface DerivedTheme {
  readonly [key: `--${string}`]: string;
}

// ── Color Math Helpers ───────────────────────────────────────────

const HEX_PATTERN = /^[0-9a-fA-F]{6}$/;

/** Parse hex (#RRGGBB) to [R, G, B] 0-255. Throws on invalid input. */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (!HEX_PATTERN.test(clean)) {
    throw new Error(`Invalid hex color: "${hex}". Expected 6-character hex (e.g., #FF00AA).`);
  }
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

/** RGB to HSL (returns [h 0-360, s 0-100, l 0-100]) */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === rNorm) hue = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) * 60;
    else if (max === gNorm) hue = ((bNorm - rNorm) / delta + 2) * 60;
    else hue = ((rNorm - gNorm) / delta + 4) * 60;
  }

  return [Math.round(hue * 10) / 10, Math.round(saturation * 1000) / 10, Math.round(lightness * 1000) / 10];
}

/** Convert hex to CSS HSL value string (e.g., "225 66% 14%") */
function hexToHslString(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return `${h} ${s}% ${l}%`;
}

/** Adjust HSL lightness by a delta (-100 to +100) */
function adjustLightness(hex: string, delta: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const newL = Math.max(0, Math.min(100, l + delta));
  return `${h} ${s}% ${newL}%`;
}

/** Adjust HSL saturation by a factor (0 = fully desaturated, 1 = unchanged) */
function adjustSaturation(hex: string, factor: number, lightnessDelta = 0): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const newS = Math.max(0, Math.min(100, s * factor));
  const newL = Math.max(0, Math.min(100, l + lightnessDelta));
  return `${h} ${newS}% ${newL}%`;
}

/** Determine if a color is "dark" (relative luminance below WCAG threshold ~46%) */
function isDark(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  // Use relative luminance (WCAG 2.1) instead of HSL lightness for accuracy
  const toLinear = (c: number) => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance < 0.179; // ~46% HSL lightness equivalent
}

/** Get a contrast foreground (white or dark) for a given background */
function contrastForeground(hex: string): string {
  return isDark(hex) ? '0 0% 100%' : '222 47% 11%';
}

// ── Derivation Helpers ────────────────────────────────────────────

/** Pre-computed HSL for a hex color — avoids redundant parsing */
interface ParsedColor {
  readonly hex: string;
  readonly hsl: string;        // CSS-ready "H S% L%"
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

function parseHex(hex: string): ParsedColor {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return { hex, hsl: `${h} ${s}% ${l}%`, h, s, l };
}

/** Dimmed foreground with WCAG AA clamp (~4.5:1 against card surface) */
function deriveDimmedForeground(fg: ParsedColor, isBackgroundDark: boolean): string {
  const newS = Math.max(0, Math.min(100, fg.s * 0.7));
  const newL = isBackgroundDark
    ? Math.max(58, fg.l - 34)   // never drop below 58% on dark backgrounds
    : Math.min(52, fg.l + 20);  // never rise above 52% on light backgrounds
  return `${fg.h} ${newS}% ${newL}%`;
}

// ── Color Scale Generation ──────────────────────────────────────

/**
 * Perceptual lightness curves.
 *
 * Shade numbers have consistent SEMANTIC meaning regardless of light/dark:
 *   50  = subtle background (lightest in light mode, darkest muted in dark mode)
 *   100 = elevated surface
 *   200 = border / separator
 *   300 = secondary text (readable in both modes)
 *   400 = placeholder / hover state
 *   500 = solid / base color
 *   600 = hovered solid
 *   700 = prominent text (darkest in light, brightest in dark)
 *   800 = deep accent
 *   900 = deepest surface
 *   950 = ink / maximum depth
 *
 * In dark mode, the lightness values "flip" so components like
 * `bg-success-50 text-success-700` work without `dark:` overrides.
 */
const LIGHTNESS: Record<'light' | 'dark', Record<number, number>> = {
  light: { 50: 97, 100: 94, 200: 87, 300: 76, 400: 62, 500: 50, 600: 43, 700: 35, 800: 27, 900: 20, 950: 12 },
  dark:  { 50: 13, 100: 17, 200: 24, 300: 65, 400: 58, 500: 55, 600: 48, 700: 70, 800: 30, 900: 11, 950: 7 },
};

/** Saturation curves — peaks at mid-tones, lower at extremes for natural feel */
const SAT_FACTOR: Record<'light' | 'dark', Record<number, number>> = {
  light: { 50: 0.25, 100: 0.30, 200: 0.40, 300: 0.55, 400: 0.75, 500: 0.90, 600: 0.95, 700: 1.00, 800: 0.90, 900: 0.80, 950: 0.65 },
  dark:  { 50: 0.30, 100: 0.35, 200: 0.40, 300: 0.65, 400: 0.80, 500: 0.95, 600: 0.90, 700: 0.85, 800: 0.70, 900: 0.50, 950: 0.35 },
};

/** Format a single HSL value for CSS */
function hslStr(h: number, s: number, l: number): string {
  return `${Math.round(h * 10) / 10} ${Math.round(Math.max(0, Math.min(100, s)) * 10) / 10}% ${l}%`;
}

/**
 * Generate a full color scale from a hue + saturation.
 *
 * @param prefix - CSS variable prefix (e.g., 'primary' produces '--primary-50')
 * @param hue - Base hue (0-360)
 * @param sat - Base saturation (0-100)
 * @param mode - 'light' or 'dark' — controls the perceptual lightness/saturation curves
 * @param steps - Which shade steps to generate (default: 50-950)
 */
function deriveColorScale(
  prefix: string,
  hue: number,
  sat: number,
  mode: 'light' | 'dark',
  steps: readonly number[],
): Record<string, string> {
  const lCurve = LIGHTNESS[mode];
  const sFactor = SAT_FACTOR[mode];
  const result: Record<string, string> = {};

  for (const step of steps) {
    const adjustedSat = sat * (sFactor[step] ?? 0.5);
    const adjustedLightness = lCurve[step] ?? 50;
    result[`--${prefix}-${step}`] = hslStr(hue, adjustedSat, adjustedLightness);
  }

  return result;
}

/**
 * Harmonize a hue toward a target to create visual cohesion.
 *
 * Shifts `baseHue` toward `targetHue` by the shortest angular path.
 * The result is recognizably the original color but with a subtle "family" feel.
 *
 * @param baseHue - Canonical semantic hue (e.g., 142 for green/success)
 * @param targetHue - Theme's primary hue to blend toward
 * @param amount - 0 = no shift, 1 = fully match target (typically 0.08–0.15)
 */
function harmonizeHue(baseHue: number, targetHue: number, amount: number): number {
  let diff = targetHue - baseHue;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return Math.round(((baseHue + diff * amount + 360) % 360) * 10) / 10;
}

/** Standard shade steps */
const STEPS_11 = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const STEPS_10 = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
const STEPS_HEALING = [50, 100, 200, 300, 400, 500, 600] as const;

/** Canonical hues for semantic colors (recognizable worldwide) */
const SEMANTIC_HUES = {
  success: { hue: 142, sat: 76, harmonize: 0.12 },
  warning: { hue: 38,  sat: 92, harmonize: 0.10 },
  error:   { hue: 0,   sat: 84, harmonize: 0.08 },
  info:    { hue: 199, sat: 89, harmonize: 0.15 },
} as const;

// ── Derivation Engine ────────────────────────────────────────────

/**
 * Derive a complete theme from 5 brand colors.
 *
 * Returns 100+ CSS variables:
 *   - 25 core semantic vars (background, card, primary, sidebar, chart, etc.)
 *   - 11 shades each for primary, secondary, accent (50-950)
 *   - 10 shades each for success, warning, error, info (50-900)
 *   - 7 shades for healing (50-600)
 *
 * Pre-computes HSL for each input color once, then references the cached
 * values throughout — eliminates redundant hex-RGB-HSL conversions.
 */
export function deriveTheme(input: PaletteInput): DerivedTheme {
  // Pre-compute all input colors once
  const bg = parseHex(input.background);
  const fg = parseHex(input.foreground);
  const pri = parseHex(input.primary);
  const sec = parseHex(input.secondary);
  const acc = parseHex(input.accent);

  const isBackgroundDark = isDark(input.background);
  const mode = isBackgroundDark ? 'dark' : 'light';
  const lift = isBackgroundDark ? 4 : -4;
  const dimmedFg = deriveDimmedForeground(fg, isBackgroundDark);

  // ── Brand color scales ──
  const primaryScale = deriveColorScale('primary', pri.h, pri.s, mode, STEPS_11);
  const secondaryScale = deriveColorScale('secondary', sec.h, sec.s, mode, STEPS_11);
  const accentScale = deriveColorScale('accent', acc.h, acc.s, mode, STEPS_11);

  // ── Semantic color scales (harmonized with primary hue) ──
  const semanticOverrides: Record<string, string | undefined> = {
    success: input.success,
    warning: input.warning,
    error: input.error,
    info: input.info,
  };

  const semanticScales: Record<string, string> = {};
  for (const [name, config] of Object.entries(SEMANTIC_HUES)) {
    const overrideHex = semanticOverrides[name];
    let hue: number;
    let sat: number;

    if (overrideHex) {
      const parsed = parseHex(overrideHex);
      hue = parsed.h;
      sat = parsed.s;
    } else {
      hue = harmonizeHue(config.hue, pri.h, config.harmonize);
      sat = config.sat;
    }

    const scale = deriveColorScale(name, hue, sat, mode, STEPS_10);
    Object.assign(semanticScales, scale);
  }

  // ── Healing brand scale (secondary biased toward teal 180deg) ──
  const healingHue = harmonizeHue(180, sec.h, 0.3);
  const healingScale = deriveColorScale('healing', healingHue, 72, mode, STEPS_HEALING);

  return {
    // ── Layout ──
    '--background': bg.hsl,
    '--foreground': fg.hsl,

    // ── Surfaces (derived from background) ──
    '--card': adjustLightness(input.background, lift),
    '--card-foreground': fg.hsl,
    '--popover': adjustLightness(input.background, lift * 1.5),
    '--popover-foreground': fg.hsl,
    '--muted': adjustSaturation(input.background, 0.6, lift * 2),
    '--muted-foreground': dimmedFg,

    // ── Brand colors (DEFAULT + foreground) ──
    '--primary': pri.hsl,
    '--primary-foreground': contrastForeground(input.primary),
    '--secondary': sec.hsl,
    '--secondary-foreground': contrastForeground(input.secondary),
    '--accent': acc.hsl,
    '--accent-foreground': contrastForeground(input.accent),

    // ── Utility (derived from background) ──
    '--destructive': input.destructive
      ? hexToHslString(input.destructive)
      : isBackgroundDark ? '0 72% 63%' : '0 84% 60%',
    '--destructive-foreground': '0 0% 100%',
    '--border': adjustLightness(input.background, lift * 3),
    '--input': adjustLightness(input.background, lift * 2.5),
    '--ring': pri.hsl,

    // ── Sidebar (darker than background) ──
    '--sidebar-background': adjustLightness(input.background, -lift),
    '--sidebar-foreground': adjustSaturation(input.foreground, 0.8, isBackgroundDark ? -18 : 10),
    '--sidebar-primary': pri.hsl,
    '--sidebar-primary-foreground': contrastForeground(input.primary),
    '--sidebar-accent': adjustLightness(input.background, lift),
    '--sidebar-accent-foreground': fg.hsl,
    '--sidebar-border': adjustLightness(input.background, lift * 1.5),
    '--sidebar-ring': pri.hsl,

    // ── Chart ──
    '--chart-surface': adjustLightness(input.background, lift),
    '--chart-grid': adjustLightness(input.background, lift * 3),
    '--chart-text': dimmedFg,
    '--chart-tooltip-border': adjustLightness(input.background, lift * 4),
    '--chart-tooltip-shadow': isBackgroundDark
      ? '228 80% 5% / 0.5'
      : '0 0% 0% / 0.1',

    // ── Geometry ──
    '--radius': '0.5rem',

    // ── Brand Color Scales (50-950) ──
    ...primaryScale,
    ...secondaryScale,
    ...accentScale,

    // ── Semantic Color Scales (50-900, harmonized) ──
    ...semanticScales,

    // ── Healing Brand Scale (50-600) ──
    ...healingScale,
  } as DerivedTheme;
}

// ── Coolors.co Integration ───────────────────────────────────────

/**
 * Parse a Coolors.co URL into hex color array.
 *
 * Supports:
 *   https://coolors.co/palette/03045e-0077b6-00b4d8-90e0ef-caf0f8
 *   https://coolors.co/03045e-0077b6-00b4d8-90e0ef-caf0f8
 */
export function parseCoolorsUrl(url: string): string[] {
  const match = url.match(/coolors\.co\/(?:palette\/)?([a-f0-9]{6}(?:-[a-f0-9]{6})*)/i);
  if (!match) throw new Error(`Invalid Coolors URL: ${url}`);
  return match[1].split('-').map(hex => `#${hex}`);
}

/**
 * Auto-assign palette roles by sorting colors by luminance.
 * Darkest -> background, lightest -> foreground, middle 3 by saturation.
 */
export function autoAssignRoles(hexColors: string[]): PaletteInput {
  const sorted = [...hexColors].sort((a, b) => {
    const [, , lA] = rgbToHsl(...hexToRgb(a));
    const [, , lB] = rgbToHsl(...hexToRgb(b));
    return lA - lB;
  });

  // For 5 colors: [darkest, ..., lightest]
  // Middle 3 sorted by saturation: most vivid = primary
  const middle = sorted.slice(1, -1).sort((a, b) => {
    const [, sA] = rgbToHsl(...hexToRgb(a));
    const [, sB] = rgbToHsl(...hexToRgb(b));
    return sB - sA;
  });

  return {
    background: sorted[0],
    foreground: sorted[sorted.length - 1],
    primary: middle[0],
    secondary: middle[1] ?? middle[0],
    accent: middle[2] ?? middle[0],
  };
}

/**
 * One-step: Coolors URL -> complete theme.
 *
 * @example
 * const theme = themeFromCoolorsUrl('https://coolors.co/palette/03045e-0077b6-00b4d8-90e0ef-caf0f8');
 */
export function themeFromCoolorsUrl(url: string): DerivedTheme {
  const colors = parseCoolorsUrl(url);
  if (colors.length < 3) throw new Error(`Need at least 3 colors, got ${colors.length}`);
  const roles = autoAssignRoles(colors);
  return deriveTheme(roles);
}
