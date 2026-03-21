import type { PaletteInput } from "@/shared/utils/themeDerivation";

/**
 * Color Theme Configuration — Single Source of Truth
 *
 * To add a new tenant theme:
 *   1. Add a new entry to COLOR_THEME_CONFIGS below
 *   2. Done. The derivation engine generates CSS variables at runtime.
 *
 * Each theme needs:
 *   - id: unique slug (kebab-case)
 *   - label: display name
 *   - description: one-line summary
 *   - mode: "light" | "dark" — controls .dark class on <html>
 *   - palette: 5 brand colors (PaletteInput) — the derivation engine does the rest
 *   - swatches: 5 hex colors for the UI preview card (usually same as palette values)
 *
 * Optional semantic overrides in palette:
 *   - success, warning, error, info — custom hue/saturation for the semantic scale
 *   - If omitted, the engine auto-harmonizes toward the primary hue
 *   - Override when you want a curated, hand-picked feel per theme
 *
 * Inspired by Windows 11 Microsoft Store themes:
 *   Northern Lights, Luminous Flow, Dreamscapes,
 *   Opaline, French Riviera, Ethereal Escapes
 */

export interface ColorThemeDefinition {
  /** Unique theme slug — used as CSS class name and localStorage key */
  readonly id: string;
  /** Display name shown in the theme picker */
  readonly label: string;
  /** One-line description for the picker */
  readonly description: string;
  /** Whether the theme is light or dark — controls .dark class on <html> */
  readonly mode: "light" | "dark";
  /** 5 brand colors fed to the derivation engine */
  readonly palette: PaletteInput;
  /** 5 hex colors for the swatch preview (visual only) */
  readonly swatches: readonly [string, string, string, string, string];
}

/**
 * All available color themes.
 *
 * "default" (light/dark MediTrack) is handled separately — it uses the
 * hand-tuned CSS variables in index.css. Only custom themes go here.
 *
 * Adding a new theme = add one object. The derivation engine handles the rest.
 */
export const COLOR_THEME_CONFIGS = [
  // ── Dark Themes ───────────────────────────────────────────────

  {
    id: "northern-lights",
    label: "Northern Lights",
    description: "Aurora borealis — deep polar navy with electric teal glow",
    mode: "dark",
    palette: {
      background: "#061826",
      foreground: "#D9FBFF",
      primary: "#0E6F7A",
      secondary: "#18D6C8",
      accent: "#0B2C3C",
      // Aurora green, polar sunrise amber, soft coral, glacial ice blue
      success: "#2DD4A8",
      warning: "#E8A838",
      error: "#E06B6B",
      info: "#5BC0EB",
    },
    swatches: ["#061826", "#0E6F7A", "#18D6C8", "#0B2C3C", "#D9FBFF"],
  },
  {
    id: "luminous-flow",
    label: "Luminous Flow",
    description: "Flowing indigo depths — violet shimmer with mint highlights",
    mode: "dark",
    palette: {
      background: "#0A0F2A",
      foreground: "#F2FFF8",
      primary: "#2AD2D2",
      secondary: "#232D63",
      accent: "#76F7A6",
      // Emerald glow, golden bioluminescence, soft coral, periwinkle
      success: "#4ADE80",
      warning: "#F0C040",
      error: "#F07070",
      info: "#64B5F6",
    },
    swatches: ["#0A0F2A", "#2AD2D2", "#76F7A6", "#232D63", "#F2FFF8"],
  },
  {
    id: "dreamscapes",
    label: "Dreamscapes",
    description: "Frosted violet dream — soft purple haze with cyan breeze",
    mode: "dark",
    palette: {
      background: "#0B1026",
      foreground: "#F5F3FF",
      primary: "#3BC6D9",
      secondary: "#2B2D55",
      accent: "#6CFFA8",
      // Forest green, dreamy amber, soft rose, lavender blue
      success: "#66BB6A",
      warning: "#FFB74D",
      error: "#E57373",
      info: "#7986CB",
    },
    swatches: ["#0B1026", "#3BC6D9", "#6CFFA8", "#2B2D55", "#F5F3FF"],
  },

  {
    id: "emerald-forest",
    label: "Emerald Forest",
    description: "Deep jungle canopy — vivid green, golden firefly, misty jade",
    mode: "dark",
    palette: {
      background: "#061A0E",
      foreground: "#D0F5DC",
      primary: "#00E676",
      secondary: "#0D3B20",
      accent: "#FFD740",
      // Sage green (softer than primary), amber-orange, terracotta, sky through canopy
      success: "#81C784",
      warning: "#FFA726",
      error: "#C75B39",
      info: "#4FC3F7",
    },
    swatches: ["#061A0E", "#00E676", "#FFD740", "#0D3B20", "#D0F5DC"],
  },
  {
    id: "velvet-night",
    label: "Velvet Night",
    description: "Royal purple depths — amethyst glow, soft lilac, warm rose",
    mode: "dark",
    palette: {
      background: "#110B1A",
      foreground: "#E8E0F0",
      primary: "#A855F7",
      secondary: "#1E1430",
      accent: "#E879A8",
      // Teal emerald jewel, topaz gold, crimson rose, lavender blue
      success: "#43A88C",
      warning: "#FFB300",
      error: "#E85577",
      info: "#7C8FF8",
    },
    swatches: ["#110B1A", "#A855F7", "#E879A8", "#1E1430", "#E8E0F0"],
  },

  // ── Light Themes (tinted, eye-friendly — not pure white) ────

  {
    id: "mimi-pink",
    label: "Mimi Pink",
    description: "Pastel bloom — bold rose, mauvelous blush, powder blue breeze",
    mode: "light",
    palette: {
      background: "#E2D4DB",
      foreground: "#3A1E2A",
      primary: "#E27396",
      secondary: "#B3DEE2",
      accent: "#EA9AB2",
      // Fresh mint teal, peach apricot, deep raspberry, powder periwinkle
      success: "#4DB6AC",
      warning: "#FF9E80",
      error: "#D32F5A",
      info: "#64B5F6",
    },
    swatches: ["#EFCFE3", "#E27396", "#EA9AB2", "#B3DEE2", "#EAF2D7"],
  },
  {
    id: "baby-blue-summer",
    label: "Baby Blue Summer",
    description: "Summery pop — baby blue, salmon, mindaro, golden sunshine",
    mode: "light",
    palette: {
      background: "#DDE8E0",
      foreground: "#1A2E30",
      primary: "#70D6FF",
      secondary: "#FF70A6",
      accent: "#FFD670",
      // Fresh lime, tangerine, watermelon, ocean blue
      success: "#66BB6A",
      warning: "#FF8A65",
      error: "#EF5350",
      info: "#4A90D9",
    },
    swatches: ["#E9FF70", "#70D6FF", "#FF70A6", "#FF9770", "#FFD670"],
  },
  {
    id: "health-summit",
    label: "Health Summit",
    description: "Medical teal gradient — sky blue to vibrant green, clean and bright",
    mode: "light",
    palette: {
      background: "#E0EEEC",
      foreground: "#0C3640",
      primary: "#1AB5A0",
      secondary: "#2E9EC8",
      accent: "#3AACCE",
      // Emerald (distinct from teal), warm amber, clinical red, indigo
      success: "#43A047",
      warning: "#F9A825",
      error: "#E53935",
      info: "#5C6BC0",
    },
    swatches: ["#E0EEEC", "#1AB5A0", "#2E9EC8", "#3AACCE", "#0C3640"],
  },
  {
    id: "french-riviera",
    label: "French Riviera",
    description: "Dusky lavender — muted violet sky over Mediterranean blue",
    mode: "light",
    palette: {
      background: "#E4DFF0",
      foreground: "#1E1840",
      primary: "#4A4990",
      secondary: "#8B6BB8",
      accent: "#B86BA8",
      // Sage olive, Riviera sunset gold, French burgundy, Mediterranean azure
      success: "#66997A",
      warning: "#D4A03C",
      error: "#C0392B",
      info: "#4A8FBF",
    },
    swatches: ["#E4DFF0", "#4A4990", "#8B6BB8", "#B86BA8", "#1E1840"],
  },
  {
    id: "ethereal-escapes",
    label: "Ethereal Escapes",
    description: "Restful sage — muted green with deep teal and slate",
    mode: "light",
    palette: {
      background: "#DEE8E2",
      foreground: "#152A30",
      primary: "#2B9E9A",
      secondary: "#1D5868",
      accent: "#7BBFAA",
      // Moss leaf green, honey amber, warm terracotta, serene sky
      success: "#558B2F",
      warning: "#D4A017",
      error: "#C0544E",
      info: "#5B90BF",
    },
    swatches: ["#DEE8E2", "#2B9E9A", "#1D5868", "#7BBFAA", "#152A30"],
  },
] as const satisfies readonly ColorThemeDefinition[];
