# Semantic Token Migration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all hardcoded Tailwind color classes (`bg-white`, `text-neutral-*`, `border-neutral-*`) to semantic tokens (`bg-card`, `text-foreground`, `border-border`) so that themes are defined purely by CSS variables — enabling any new color palette to be applied in 30 minutes with zero component changes.

**Architecture:** Components reference semantic Tailwind utilities (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`) which resolve to CSS custom properties. Theme switching swaps the variable block on `<html>`. The existing `.dark` utility override block in `index.css` (lines 138-254 in web, 104-210 in design) becomes unnecessary and is deleted after migration.

**Tech Stack:** React 19, Tailwind CSS, shadcn/ui, CSS custom properties (HSL → future OKLCH)

**Answering the question:** _"If a tenant comes with a new color palette, how much time do we need?"_
- **Before this migration:** Days of work touching 90+ files, 4,600+ class replacements
- **After this migration:** 30 minutes — paste ~25 CSS variables into one file, done

---

## File Structure

### Files to Create
| File | Purpose |
|------|---------|
| `src/MediTrack.Web/src/shared/utils/themeDerivation.ts` | Derive 25+ semantic tokens from 5 input colors |
| `docs/theming-guide.md` | Developer + AI guide for applying new palettes |

### Files to Modify (Bulk Migration — ~90 files)
| Category | Files | Change |
|----------|-------|--------|
| **CSS variables** | `src/MediTrack.Web/src/index.css`, `design/src/index.css` | Delete dark override block after migration |
| **Frontend rule** | `.claude/rules/frontend.md` | Update Color Tokens table to semantic-only |
| **Landing (web)** | 11 files in `src/MediTrack.Web/src/features/landing/components/` | `bg-white` → `bg-card`, `text-neutral-*` → semantic |
| **Landing (design)** | `design/src/pages/Landing.tsx` | Same replacements (monolithic file) |
| **Admin (web)** | 8 files in `src/MediTrack.Web/src/features/admin/components/` | Same |
| **Admin (design)** | 8 files in `design/src/pages/admin/` | Same |
| **Clara (web)** | 10 files in `src/MediTrack.Web/src/features/clara/components/` | Same |
| **Clara (design)** | 3 files: `ClaraStart.tsx`, `ClaraSession.tsx`, `SessionSummary.tsx` | Same |
| **Patients (web)** | 5 files in `src/MediTrack.Web/src/features/patients/components/` | Same |
| **Patients (design)** | 4 files: `PatientList.tsx`, `PatientDetail.tsx`, `PatientNew.tsx` | Same |
| **Appointments (web)** | 9 files in `src/MediTrack.Web/src/features/appointments/components/` | Same |
| **Appointments (design)** | 2 files: `Appointments.tsx`, `AppointmentDetail.tsx` | Same |
| **Medical Records (web)** | 4 files in `src/MediTrack.Web/src/features/medical-records/components/` | Same |
| **Medical Records (design)** | 2 files: `MedicalRecordsList.tsx`, `MedicalRecordDetail.tsx` | Same |
| **Shared (web)** | 6 files: Layout, NotificationCenter, ClaraPanel, etc. | Same |
| **Shared (design)** | 6 files: AppShell, DashboardCustomizer, ClaraPanel, etc. | Same |
| **Auth (web-only)** | 3 files: CallbackPage, ProtectedRoute, RoleGuard | Same |

### Semantic Replacement Map (The Single Source of Truth)

Every replacement in this plan follows this exact mapping:

| Old Class | → New Class | Semantic Meaning |
|-----------|-------------|-----------------|
| `bg-white` | `bg-card` | Card / elevated surface |
| `bg-white/95` | `bg-card/95` | Frosted card (backdrop-blur) |
| `bg-neutral-50` | `bg-background` | Page-level background |
| `bg-neutral-100` | `bg-muted` | Subtle surface / input bg |
| `text-neutral-900` | `text-foreground` | Primary text (headings) |
| `text-neutral-800` | `text-foreground` | Strong body text |
| `text-neutral-700` | `text-foreground/80` | Body text (slightly muted) |
| `text-neutral-600` | `text-muted-foreground` | Labels, captions |
| `text-neutral-500` | `text-muted-foreground` | Secondary text, placeholders |
| `text-neutral-400` | `text-muted-foreground/70` | Disabled / very muted text |
| `border-neutral-200` | `border-border` | Standard borders |
| `border-neutral-100` | `border-border` | Subtle borders |
| `divide-neutral-200` | `divide-border` | Dividers between list items |
| `ring-neutral-200` | `ring-border` | Focus ring fallback |
| `from-white` | `from-card` | Gradient start (on cards) |
| `to-white` | `to-card` | Gradient end (on cards) |
| `from-neutral-50` | `from-background` | Gradient start (on page) |
| `to-neutral-50` | `to-background` | Gradient end (on page) |
| `hover:bg-neutral-50` | `hover:bg-muted` | Hover state on list items |
| `hover:bg-neutral-100` | `hover:bg-muted` | Hover state on surfaces |

**Context-dependent replacements** (decide per-usage):
| Old Class | Context | → New Class |
|-----------|---------|-------------|
| `bg-neutral-50` | Page background | `bg-background` |
| `bg-neutral-50` | Alt row / subtle surface | `bg-muted` |
| `text-neutral-700` | Body text | `text-foreground/80` |
| `text-neutral-700` | Label next to form input | `text-muted-foreground` |

---

## Chunk 1: Infrastructure & Rules (Foundation)

### Task 1.1: Update Frontend Rule — Color Tokens

**Files:**
- Modify: `.claude/rules/frontend.md:102-113`

- [ ] **Step 1: Replace the Color Tokens table**

Replace the existing "Color Tokens" section (lines 102-113) with:

```markdown
### Color Tokens (Semantic Only — MANDATORY)

**NEVER** use `bg-white`, `text-neutral-*`, `border-neutral-*`, or any hardcoded Tailwind color in UI components.
**ALWAYS** use semantic tokens that resolve to CSS variables:

| Token | Usage | Old (BANNED) |
|-------|-------|-------------|
| `bg-background` | Page background | ~~`bg-neutral-50`~~ |
| `bg-card` | Card / elevated surface | ~~`bg-white`~~ |
| `bg-muted` | Subtle surface, alt rows | ~~`bg-neutral-100`~~ |
| `bg-popover` | Dropdowns, tooltips | ~~`bg-white`~~ |
| `text-foreground` | Primary text, headings | ~~`text-neutral-900/800/700`~~ |
| `text-muted-foreground` | Secondary text, labels | ~~`text-neutral-600/500/400`~~ |
| `text-card-foreground` | Text on cards | ~~`text-neutral-900`~~ |
| `border-border` | All borders, dividers | ~~`border-neutral-200/100`~~ |
| `border-input` | Form input borders | ~~`border-neutral-200`~~ |
| `ring-ring` | Focus rings | ~~`ring-neutral-200`~~ |
| `from-background` / `to-card` | Gradients | ~~`from-neutral-50 to-white`~~ |
| `primary-*` | Brand blue buttons/links | Allowed (semantic) |
| `secondary-*` | Teal actions | Allowed (semantic) |
| `accent-*` | Violet highlights | Allowed (semantic) |
| `success/warning/error/info-*` | Status feedback | Allowed (semantic) |
| `status-scheduled/completed` | Appointment states | Allowed (semantic) |
| `healing-*` | Brand teal accents | Allowed (design-only) |

**Why:** Semantic tokens resolve to CSS variables. Changing themes = swapping variables. Hardcoded colors bypass themes and break in dark mode.
```

- [ ] **Step 2: Verify rule file is valid**

Run: `cat .claude/rules/frontend.md | head -5`
Expected: YAML frontmatter intact

- [ ] **Step 3: Commit**

```bash
git add .claude/rules/frontend.md
git commit -m "docs: update frontend rule — semantic tokens only, ban hardcoded neutrals"
```

### Task 1.2: Create Theme Derivation Utility

**Files:**
- Create: `src/MediTrack.Web/src/shared/utils/themeDerivation.ts`

- [ ] **Step 1: Write the theme derivation utility**

```typescript
/**
 * Theme Derivation Engine
 *
 * Takes 5 brand colors and derives 25+ semantic CSS variables.
 * This is the bridge between "designer picks colors" and "developer ships theme."
 *
 * Usage:
 *   const theme = deriveTheme({ background: '#03045E', foreground: '#CAF0F8', ... });
 *   applyTheme(theme);  // Sets CSS variables on <html>
 *
 * Or from a Coolors URL:
 *   const theme = themeFromCoolorsUrl('https://coolors.co/palette/03045e-0077b6-00b4d8-90e0ef-caf0f8');
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
}

export interface DerivedTheme {
  readonly [key: `--${string}`]: string;
}

// ── Color Math Helpers ───────────────────────────────────────────

/** Parse hex (#RRGGBB) to [R, G, B] 0-255 */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
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

/** Determine if a color is "dark" (lightness < 50) */
function isDark(hex: string): boolean {
  const [, , l] = rgbToHsl(...hexToRgb(hex));
  return l < 50;
}

/** Get a contrast foreground (white or dark) for a given background */
function contrastForeground(hex: string): string {
  return isDark(hex) ? '0 0% 100%' : '222 47% 11%';
}

// ── Derivation Engine ────────────────────────────────────────────

/**
 * Derive a complete theme from 5 brand colors.
 *
 * The derivation rules:
 * - Card = background + slight lightness lift
 * - Popover = background + more lightness lift
 * - Muted = background + lift + desaturated
 * - Muted-foreground = foreground dimmed to ~60%
 * - Border = background + moderate lightness lift
 * - Sidebar = background + slight darkening
 * - Foreground pairs auto-calculated via contrast
 */
export function deriveTheme(input: PaletteInput): DerivedTheme {
  const isBackgroundDark = isDark(input.background);
  const lift = isBackgroundDark ? 4 : -4;

  return {
    // ── Layout ──
    '--background': hexToHslString(input.background),
    '--foreground': hexToHslString(input.foreground),

    // ── Surfaces (derived from background) ──
    '--card': adjustLightness(input.background, lift),
    '--card-foreground': hexToHslString(input.foreground),
    '--popover': adjustLightness(input.background, lift * 1.5),
    '--popover-foreground': hexToHslString(input.foreground),
    '--muted': adjustSaturation(input.background, 0.6, lift * 2),
    '--muted-foreground': adjustSaturation(input.foreground, 0.7, isBackgroundDark ? -34 : 20),

    // ── Brand colors ──
    '--primary': hexToHslString(input.primary),
    '--primary-foreground': contrastForeground(input.primary),
    '--secondary': hexToHslString(input.secondary),
    '--secondary-foreground': contrastForeground(input.secondary),
    '--accent': hexToHslString(input.accent),
    '--accent-foreground': contrastForeground(input.accent),

    // ── Utility (derived from background) ──
    '--destructive': input.destructive
      ? hexToHslString(input.destructive)
      : isBackgroundDark ? '0 72% 63%' : '0 84% 60%',
    '--destructive-foreground': '0 0% 100%',
    '--border': adjustLightness(input.background, lift * 3),
    '--input': adjustLightness(input.background, lift * 2.5),
    '--ring': hexToHslString(input.primary),

    // ── Sidebar (darker than background) ──
    '--sidebar-background': adjustLightness(input.background, -lift),
    '--sidebar-foreground': adjustSaturation(input.foreground, 0.8, isBackgroundDark ? -18 : 10),
    '--sidebar-primary': hexToHslString(input.primary),
    '--sidebar-primary-foreground': contrastForeground(input.primary),
    '--sidebar-accent': adjustLightness(input.background, lift),
    '--sidebar-accent-foreground': hexToHslString(input.foreground),
    '--sidebar-border': adjustLightness(input.background, lift * 1.5),
    '--sidebar-ring': hexToHslString(input.primary),

    // ── Chart ──
    '--chart-surface': adjustLightness(input.background, lift),
    '--chart-grid': adjustLightness(input.background, lift * 3),
    '--chart-text': adjustSaturation(input.foreground, 0.7, isBackgroundDark ? -34 : 20),
    '--chart-tooltip-border': adjustLightness(input.background, lift * 4),
    '--chart-tooltip-shadow': isBackgroundDark
      ? '228 80% 5% / 0.5'
      : '0 0% 0% / 0.1',
  };
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
  if (!match) return [];
  return match[1].split('-').map(hex => `#${hex}`);
}

/**
 * Auto-assign palette roles by sorting colors by luminance.
 * Darkest → background, lightest → foreground, middle 3 by saturation.
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
 * One-step: Coolors URL → complete theme.
 *
 * @example
 * const theme = themeFromCoolorsUrl('https://coolors.co/palette/03045e-0077b6-00b4d8-90e0ef-caf0f8');
 * applyTheme('ocean-breeze', theme);
 */
export function themeFromCoolorsUrl(url: string): DerivedTheme {
  const colors = parseCoolorsUrl(url);
  if (colors.length < 3) throw new Error(`Need at least 3 colors, got ${colors.length}`);
  const roles = autoAssignRoles(colors);
  return deriveTheme(roles);
}

// ── Theme Application ────────────────────────────────────────────

/**
 * Apply a derived theme as a CSS class on <html>.
 * Injects a <style> block with the variable definitions.
 */
export function applyTheme(themeName: string, theme: DerivedTheme): void {
  const className = `theme-${themeName}`;
  const cssVars = Object.entries(theme)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  const css = `.${className} {\n${cssVars}\n}`;

  // Remove previous injection if any
  const existingStyle = document.getElementById(`theme-${themeName}-vars`);
  if (existingStyle) existingStyle.remove();

  // Inject new style
  const style = document.createElement('style');
  style.id = `theme-${themeName}-vars`;
  style.textContent = css;
  document.head.appendChild(style);

  // Apply class to html
  const root = document.documentElement;
  // Remove other theme-* classes
  root.className = root.className.replace(/\btheme-[\w-]+\b/g, '').trim();
  root.classList.add(className);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd src/MediTrack.Web && npx tsc --noEmit src/shared/utils/themeDerivation.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/MediTrack.Web/src/shared/utils/themeDerivation.ts
git commit -m "feat: add theme derivation engine — 5 colors → 25+ semantic tokens"
```

---

## Chunk 2: Bulk Token Migration — Shared Components

> **Strategy:** Each task migrates one category of files. Use search-and-replace with the mapping table above. After each file, verify no hardcoded neutrals remain.
>
> **CRITICAL DUAL-UPDATE RULE:** Every change in web MUST be mirrored in design (and vice versa). Tasks below are paired.

### Task 2.1: Layout / AppShell (Shared Shell)

**Files:**
- Modify: `src/MediTrack.Web/src/shared/components/Layout.tsx`
- Modify: `design/src/components/AppShell.tsx`

- [ ] **Step 1: Migrate Layout.tsx** — Apply the replacement map:
  - `bg-white` → `bg-card`
  - `bg-white/95` → `bg-card/95`
  - `from-white to-healing-50` → `from-card to-healing-50`
  - `text-neutral-900` → `text-foreground`
  - `text-neutral-700` → `text-foreground/80`
  - `text-neutral-500` → `text-muted-foreground`
  - `border-neutral-200` → `border-border`
  - `hover:bg-neutral-50` → `hover:bg-muted`
  - `hover:bg-neutral-100` → `hover:bg-muted`

- [ ] **Step 2: Mirror changes to AppShell.tsx** — Same replacements, adjust imports if needed

- [ ] **Step 3: Verify no hardcoded neutrals remain**

Run: `grep -c "neutral-" src/MediTrack.Web/src/shared/components/Layout.tsx`
Expected: 0 (or only intentional uses like `neutral` in a data attribute)

- [ ] **Step 4: Commit**

```bash
git add src/MediTrack.Web/src/shared/components/Layout.tsx design/src/components/AppShell.tsx
git commit -m "refactor: Layout/AppShell — migrate to semantic tokens"
```

### Task 2.2: Shared Components (NotificationCenter, ClaraPanel, etc.)

**Files (web):**
- `src/MediTrack.Web/src/shared/components/NotificationCenter.tsx`
- `src/MediTrack.Web/src/shared/components/CommandPalette.tsx`
- `src/MediTrack.Web/src/shared/components/Breadcrumb.tsx`
- `src/MediTrack.Web/src/shared/components/PageSkeleton.tsx`
- `src/MediTrack.Web/src/shared/components/clara/ClaraPanel.tsx`
- `src/MediTrack.Web/src/shared/components/FeatureGuide/FeatureGuideButton.tsx`

**Files (design):**
- `design/src/components/NotificationCenter.tsx`
- `design/src/components/clara/ClaraPanel.tsx`
- `design/src/components/PageExplorer.tsx`
- `design/src/components/DashboardCustomizer.tsx`
- `design/src/components/PatientTimeline.tsx`
- `design/src/components/NaturalLanguageSearch.tsx`

- [ ] **Step 1: Migrate each web file** using the replacement map
- [ ] **Step 2: Mirror to design counterparts**
- [ ] **Step 3: Verify** — grep for `bg-white` and `neutral-` in modified files
- [ ] **Step 4: Commit**

```bash
git add src/MediTrack.Web/src/shared/components/ design/src/components/
git commit -m "refactor: shared components — migrate to semantic tokens"
```

---

## Chunk 3: Bulk Token Migration — Feature Pages

### Task 3.1: Landing Page (11 web components + 1 design monolith)

**Files (web):** All files in `src/MediTrack.Web/src/features/landing/components/`:
- HeroSection.tsx, FeaturesSection.tsx, ClaraMiniDemo.tsx, HowItWorksSection.tsx
- TechStackSection.tsx, TrustSection.tsx, ScreenshotShowcase.tsx
- FinalCtaSection.tsx, WaitlistCapture.tsx, StickyLandingCta.tsx
- LandingNav.tsx, LandingFooter.tsx, LandingPage.tsx

**Files (design):** `design/src/pages/Landing.tsx` (monolithic — all sections in one file)

- [ ] **Step 1: Migrate all 11+ web landing components** — Apply replacement map. Pay special attention to:
  - Gradients: `from-neutral-50 to-white` → `from-background to-card`
  - Hero bg: `bg-gradient-to-b from-neutral-50 to-white` → `bg-gradient-to-b from-background to-card`
  - Section bgs: `bg-neutral-50` → `bg-muted` or `bg-background`
  - CTA buttons retain `primary-*` / `accent-*` (already semantic)

- [ ] **Step 2: Mirror to Landing.tsx (design)** — Find corresponding sections

- [ ] **Step 3: Verify** — `grep -c "bg-white\|neutral-" src/MediTrack.Web/src/features/landing/components/*.tsx`

- [ ] **Step 4: Commit**

```bash
git add src/MediTrack.Web/src/features/landing/ design/src/pages/Landing.tsx
git commit -m "refactor: landing page — migrate to semantic tokens"
```

### Task 3.2: Clara Features (10 web + 3 design)

**Files (web):** All in `src/MediTrack.Web/src/features/clara/components/`
**Files (design):** `design/src/pages/ClaraStart.tsx`, `ClaraSession.tsx`, `SessionSummary.tsx`

- [ ] **Step 1: Migrate web Clara components**
- [ ] **Step 2: Mirror to design**
- [ ] **Step 3: Verify + Commit**

```bash
git commit -m "refactor: Clara features — migrate to semantic tokens"
```

### Task 3.3: Admin Pages (8 web + 8 design)

**Files (web):** `src/MediTrack.Web/src/features/admin/components/Admin*Page.tsx` + chart components
**Files (design):** `design/src/pages/admin/Admin*.tsx`

- [ ] **Step 1: Migrate web admin pages**
- [ ] **Step 2: Mirror to design**
- [ ] **Step 3: Verify + Commit**

```bash
git commit -m "refactor: admin pages — migrate to semantic tokens"
```

### Task 3.4: Appointments (9 web + 2 design)

**Files (web):** `src/MediTrack.Web/src/features/appointments/components/`
**Files (design):** `design/src/pages/Appointments.tsx`, `AppointmentDetail.tsx`

- [ ] **Step 1: Migrate** — Calendar-specific: appointment event cards use `bg-white` with colored left borders. Keep the colored borders, change `bg-white` → `bg-card`
- [ ] **Step 2: Mirror + Commit**

```bash
git commit -m "refactor: appointments — migrate to semantic tokens"
```

### Task 3.5: Patients (5 web + 4 design)

**Files (web):** `src/MediTrack.Web/src/features/patients/components/`
**Files (design):** `design/src/pages/PatientList.tsx`, `PatientDetail.tsx`, `PatientNew.tsx`

- [ ] **Step 1: Migrate + Mirror + Commit**

```bash
git commit -m "refactor: patients — migrate to semantic tokens"
```

### Task 3.6: Medical Records (4 web + 2 design)

**Files (web):** `src/MediTrack.Web/src/features/medical-records/components/`
**Files (design):** `design/src/pages/MedicalRecordsList.tsx`, `MedicalRecordDetail.tsx`

- [ ] **Step 1: Migrate + Mirror + Commit**

```bash
git commit -m "refactor: medical records — migrate to semantic tokens"
```

### Task 3.7: Dashboard (2 web + 1 design)

**Files (web):** `src/MediTrack.Web/src/features/dashboard/components/`
**Files (design):** `design/src/pages/Index.tsx`

- [ ] **Step 1: Migrate + Mirror + Commit**

```bash
git commit -m "refactor: dashboard — migrate to semantic tokens"
```

### Task 3.8: Auth Pages (web-only)

**Files:** `src/MediTrack.Web/src/shared/auth/CallbackPage.tsx`, `ProtectedRoute.tsx`, `RoleGuard.tsx`

- [ ] **Step 1: Migrate (no design counterpart)**
- [ ] **Step 2: Commit**

```bash
git commit -m "refactor: auth pages — migrate to semantic tokens"
```

### Task 3.9: Login Page

**Files (web):** — (OIDC redirect, no web component)
**Files (design):** `design/src/pages/Login.tsx`

- [ ] **Step 1: Migrate design Login.tsx**
- [ ] **Step 2: Commit**

```bash
git commit -m "refactor: login page — migrate to semantic tokens"
```

---

## Chunk 4: CSS Cleanup & Verification

### Task 4.1: Delete Dark Mode Override Blocks

**Files:**
- Modify: `src/MediTrack.Web/src/index.css` (delete lines 138-254)
- Modify: `design/src/index.css` (delete lines 104-210)

- [ ] **Step 1: Remove the entire `@layer utilities { .dark ...}` block from web index.css**

Keep ONLY:
- `:root` light variables (lines 6-51)
- `.dark` variables (lines 76-125)
- `@layer base` (border-border, body styles)
- Animations (@keyframes, .animate-page-in, prefers-reduced-motion)

Delete:
- The entire `@layer utilities` block with `.dark .bg-white`, `.dark .text-neutral-*`, etc.
- Dark form input overrides (these should now work via `bg-muted` token)
- Dark shadow overrides (keep if shadows still need theming)

**Note:** Keep the `.dark .shadow-*` overrides — shadows are not covered by semantic tokens. Also keep any `.dark .bg-healing-*` overrides if healing colors are still used.

- [ ] **Step 2: Same cleanup in design index.css**

- [ ] **Step 3: Build both projects to verify nothing breaks**

Run:
```bash
cd src/MediTrack.Web && npm run build
cd ../../design && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/MediTrack.Web/src/index.css design/src/index.css
git commit -m "refactor: delete dark mode override hacks — semantic tokens handle theming"
```

### Task 4.2: Lint Check

- [ ] **Step 1: Run ESLint**

```bash
cd src/MediTrack.Web && npm run lint
```
Expected: 0 errors

- [ ] **Step 2: Fix any lint issues, commit**

### Task 4.3: Final Grep Audit

- [ ] **Step 1: Verify no hardcoded neutrals remain in components**

```bash
grep -r "bg-white\|bg-neutral-\|text-neutral-\|border-neutral-" src/MediTrack.Web/src/ --include="*.tsx" -l
grep -r "bg-white\|bg-neutral-\|text-neutral-\|border-neutral-" design/src/ --include="*.tsx" -l
```

Expected: 0 files (or only intentional exceptions like data labels, chart axis text)

- [ ] **Step 2: Document any intentional exceptions**

---

## Chunk 5: Visual Testing with Playwright

### Task 5.1: Screenshot Testing — Design System (localhost:8080)

- [ ] **Step 1: Start design dev server**

```bash
cd design && npm run dev
```

- [ ] **Step 2: Set dark mode and take screenshots of all critical pages**

Use Playwright MCP to navigate to each page, enable dark mode via `document.documentElement.classList.add('dark')`, remove Page Explorer overlay, and take full-page screenshots:

Pages to test:
1. `http://localhost:8080/` — Landing page (hero, features, tech stack, CTA, footer)
2. `http://localhost:8080/login` — Login page
3. `http://localhost:8080/dashboard` — Dashboard
4. `http://localhost:8080/patients` — Patient list
5. `http://localhost:8080/patients/P001` — Patient detail
6. `http://localhost:8080/appointments` — Calendar
7. `http://localhost:8080/clara` — Clara start
8. `http://localhost:8080/clara/session/demo` — Live session
9. `http://localhost:8080/admin/dashboard` — Admin dashboard
10. `http://localhost:8080/admin/users` — User management

For each: verify text is readable, no white cards on dark bg, no invisible text.

- [ ] **Step 3: Toggle back to light mode and verify light theme still works**

- [ ] **Step 4: Document any remaining issues**

### Task 5.2: Theme Switching Test

- [ ] **Step 1: In browser console, test theme derivation**

```javascript
// Test Ocean Breeze palette from Coolors
import('/src/shared/utils/themeDerivation.ts').then(m => {
  const theme = m.themeFromCoolorsUrl('https://coolors.co/palette/03045e-0077b6-00b4d8-90e0ef-caf0f8');
  m.applyTheme('ocean-breeze', theme);
});
```

Verify: entire page updates to Ocean Breeze palette with no component changes.

---

## Chunk 6: Documentation

### Task 6.1: Write Theming Guide

**Files:**
- Create: `docs/theming-guide.md`

- [ ] **Step 1: Write the guide** (see next task — Task 6.1 content is the final deliverable in the plan)

- [ ] **Step 2: Update CHANGELOG.md**

Add under `[Unreleased]`:
```markdown
### Changed
- Semantic token migration: all components use `bg-card`, `text-foreground`, `border-border` instead of hardcoded colors (2026-03-17)
- Deleted dark mode CSS override hacks (~100 lines) — themes now work via CSS variables only
- Added theme derivation engine (`themeDerivation.ts`) — 5 colors → 25+ semantic tokens
- Added theming guide (`docs/theming-guide.md`) for developers and AI agents
```

- [ ] **Step 3: Final commit**

```bash
git add docs/ CHANGELOG.md
git commit -m "docs: add theming guide + update changelog for semantic token migration"
```
