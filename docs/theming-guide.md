# MediTrack Theming Guide

> **The answer:** A new tenant color palette takes **30 minutes** to apply. No component changes needed. Just CSS variables.

---

## For Developers: Adding a New Theme

### Step 1: Get 5 Brand Colors (5 min)

A theme needs exactly **5 colors**. Get them from:
- **Coolors.co** — paste URL like `https://coolors.co/palette/03045e-0077b6-00b4d8-90e0ef-caf0f8`
- **Realtime Colors** (realtimecolors.com) — preview on real UI, export as shadcn CSS
- **tweakcn.com** — generates exact shadcn/ui OKLCH variables
- A tenant/designer provides brand guidelines

Map the 5 colors to roles:

| Role | What it is | Pick the... |
|------|-----------|-------------|
| `background` | Page canvas | Darkest color (dark theme) or lightest (light theme) |
| `foreground` | Primary text | Highest contrast against background |
| `primary` | Brand / CTA | Most vivid / saturated color |
| `secondary` | Supporting action | Second most vivid |
| `accent` | Highlights / badges | Third color |

### Step 2: Generate Theme Variables (10 min)

**Option A: Use the derivation engine (recommended)**

```typescript
import { themeFromCoolorsUrl, applyTheme } from '@/shared/utils/themeDerivation';

// From a Coolors URL — auto-assigns roles by luminance
const theme = themeFromCoolorsUrl('https://coolors.co/palette/03045e-0077b6-00b4d8-90e0ef-caf0f8');

// Or with explicit role assignment
import { deriveTheme } from '@/shared/utils/themeDerivation';
const theme = deriveTheme({
  background: '#03045E',
  foreground: '#CAF0F8',
  primary:    '#0077B6',
  secondary:  '#00B4D8',
  accent:     '#90E0EF',
});
```

This generates all 25+ CSS variables automatically (card, muted, border, sidebar, chart, etc.).

**Option B: Manual — copy the template**

Add a new CSS class in `src/MediTrack.Web/src/index.css`:

```css
.theme-ocean-breeze {
  --background: 228 93% 19%;     /* #03045E */
  --foreground: 195 89% 89%;     /* #CAF0F8 */
  --card: 228 85% 23%;           /* background + 4% lightness */
  --card-foreground: 195 89% 89%;
  --popover: 228 78% 27%;
  --popover-foreground: 195 89% 89%;
  --primary: 202 98% 36%;        /* #0077B6 */
  --primary-foreground: 0 0% 100%;
  --secondary: 192 100% 42%;     /* #00B4D8 */
  --secondary-foreground: 0 0% 100%;
  --accent: 195 76% 75%;         /* #90E0EF */
  --accent-foreground: 228 93% 19%;
  --muted: 228 50% 27%;
  --muted-foreground: 195 40% 55%;
  --destructive: 0 72% 63%;
  --destructive-foreground: 0 0% 100%;
  --border: 228 70% 31%;
  --input: 228 65% 29%;
  --ring: 202 98% 36%;
  --sidebar-background: 228 93% 15%;
  --sidebar-foreground: 195 60% 71%;
  --sidebar-primary: 202 98% 36%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 228 85% 23%;
  --sidebar-accent-foreground: 195 89% 89%;
  --sidebar-border: 228 78% 25%;
  --sidebar-ring: 202 98% 36%;
  --chart-surface: 228 85% 23%;
  --chart-grid: 228 70% 31%;
  --chart-text: 195 40% 55%;
  --chart-tooltip-border: 228 60% 35%;
  --chart-tooltip-shadow: 228 80% 5% / 0.5;
}
```

### Step 3: Register the Theme (5 min)

Add the theme to `useTheme` hook's type:

```typescript
// src/MediTrack.Web/src/shared/hooks/use-theme.ts
type Theme = 'light' | 'dark' | 'ocean-breeze' | 'system';
```

Add to the ThemeToggle options if needed.

### Step 4: Mirror to Design System (5 min)

Copy the same CSS variable block to `design/src/index.css`.

### Step 5: Verify (5 min)

Toggle the theme and check:
- [ ] All text is readable (foreground on background)
- [ ] Cards float above background (visible contrast)
- [ ] Sidebar is distinct from content area
- [ ] Buttons have sufficient contrast
- [ ] Charts are readable

**Total: ~30 minutes.**

---

## For Claude AI: Theme Migration Rules

When asked to apply a new color palette to MediTrack, follow these rules:

### DO
- **Define theme as CSS variables** in `index.css` under a new class (`.theme-name` or `.dark`)
- **Use the derivation engine** (`themeDerivation.ts`) to auto-generate tokens from 5 colors
- **Copy to both** `src/MediTrack.Web/src/index.css` AND `design/src/index.css`
- **Test with Playwright** — navigate key pages, toggle theme, verify readability

### DO NOT
- **NEVER** add `.dark .bg-white` or `.dark .text-neutral-*` overrides — those are hacks
- **NEVER** modify component files to add theme-specific colors — themes are CSS-only
- **NEVER** use hardcoded Tailwind colors in components (`bg-white`, `text-neutral-900`, etc.)
- **NEVER** use inline hex colors in components (`bg-[#0B1437]`, `text-[#E2E8F0]`)

### Semantic Token Reference

All components use these tokens. They resolve to CSS variables that change per theme:

| Token | Purpose | Variable |
|-------|---------|----------|
| `bg-background` | Page background | `--background` |
| `bg-card` | Cards, modals, elevated surfaces | `--card` |
| `bg-popover` | Dropdowns, tooltips | `--popover` |
| `bg-muted` | Subtle surfaces, alt rows, input bg | `--muted` |
| `text-foreground` | Primary text, headings | `--foreground` |
| `text-card-foreground` | Text on cards | `--card-foreground` |
| `text-muted-foreground` | Labels, secondary text, placeholders | `--muted-foreground` |
| `border-border` | All borders and dividers | `--border` |
| `border-input` | Form input borders | `--input` |
| `ring-ring` | Focus rings | `--ring` |
| `bg-primary` / `text-primary` | Brand blue, CTAs | `--primary` |
| `bg-secondary` | Teal actions | `--secondary` |
| `bg-accent` | Violet highlights | `--accent` |
| `bg-destructive` | Danger/delete actions | `--destructive` |

### Adding a Theme (Claude AI Checklist)

1. Parse the palette (Coolors URL, hex list, or brand guidelines)
2. Map 5 colors to roles: background, foreground, primary, secondary, accent
3. Use `deriveTheme()` or manually calculate the 25 variables
4. Add CSS class block to both `index.css` files
5. Add theme name to `useTheme` type union
6. Optionally add to ThemeToggle options
7. Test: `npm run build` in both projects
8. Verify with Playwright screenshots in dark mode

---

## Architecture: Why This Works

```
┌──────────────────────────────┐
│  Component Layer             │  Uses: bg-card, text-foreground, border-border
│  (90+ .tsx files)            │  NEVER changes for theming
└──────────┬───────────────────┘
           │ resolves via Tailwind to
┌──────────▼───────────────────┐
│  CSS Variables Layer         │  --card, --foreground, --border
│  (index.css)                 │  THIS is what changes per theme
└──────────┬───────────────────┘
           │ values defined by
┌──────────▼───────────────────┐
│  Theme Definitions           │  :root { } .dark { } .theme-ocean { }
│  (25 variables each)         │  30 minutes to add a new one
└──────────────────────────────┘
```

**The separation:** Components are theme-agnostic. Themes are component-agnostic. They connect through CSS variables. This is why a new palette never requires touching component files.

---

## Color Palette Resources

| Tool | URL | Best For |
|------|-----|----------|
| Coolors | coolors.co | Quick palette generation + Tailwind export |
| Realtime Colors | realtimecolors.com | Preview on real UI + shadcn export |
| tweakcn | tweakcn.com | Direct shadcn/ui OKLCH token generation |
| Atmos | atmos.style | OKLCH shade scales with accessibility checking |
| Leonardo | leonardocolor.io | Contrast-ratio-first generation (Adobe OSS) |
| Happy Hues | happyhues.co | See palettes applied to real UI |
| Khroma | khroma.co | AI personalized palettes + WCAG ratings |

## Healthcare Color Guidelines

- **Primary:** Blues (trust, calm) — 85% of healthcare logos use blue
- **Secondary:** Teal/green (healing, growth)
- **Avoid:** Pure black, neon colors, bright red as primary
- **Accessibility:** WCAG AA minimum (4.5:1 text, 3:1 UI)
- **Cool colors preferred** by 49% of patients in healthcare contexts
