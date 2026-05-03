---
applyTo: "src/MediTrack.Web/src/**/*.{ts,tsx},design/src/**/*.{ts,tsx},src/MediTrack.Web/src/shared/config/color-themes.ts,src/MediTrack.Web/tailwind.config.ts,design/tailwind.config.ts"
---

Follow all rules in `.claude/rules/frontend/styling.md`.

# Apple Liquid Glass — Design System for MediTrack

## Philosophy

Apple Liquid Glass (iOS 26 / visionOS) treats UI surfaces as **physics-inspired digital material** — not
flat chrome. Interfaces feel spatial, content-first, and alive. For MediTrack, this means:

- **Navigation floats above content** — sidebars, toolbars, and tab bars live in a translucent glass layer
- **Content breathes** — glass elements let underlying colours and imagery bleed through
- **Interaction feels physical** — controls morph, ripple, and respond like real materials
- **Hierarchy is spatial, not just typographic** — depth and blur communicate importance

> Healthcare context: glass effects must never compromise legibility for clinical data (vitals, medications,
> triage statuses). Use Liquid Glass for **navigation and shell** — not for dense data tables.

---

## Core Visual Properties

| Property | Value | Tailwind |
|---|---|---|
| Background translucency | 15–30% white/dark opacity | `bg-white/20` or `bg-black/10` |
| Backdrop blur | 12–32px | `backdrop-blur-md` → `backdrop-blur-2xl` |
| Border | 1px, 30–50% white | `border border-white/30` |
| Specular highlight | Top edge, 1px | `shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]` |
| Drop shadow | Soft, multi-layer | `shadow-xl shadow-black/10` |
| Border radius | Concentric (matches hardware) | `rounded-2xl` → `rounded-3xl` |
| Saturation boost | Vivid bg colours | `saturate-150` |

---

## Tailwind CSS Liquid Glass Utilities

Add these to the project's `tailwind.config.ts` as custom utilities:

```ts
// tailwind.config.ts — extend theme.extend.utilities or use a plugin
// In MediTrack, add inside the existing plugin array
plugin(({ addUtilities }) => {
  addUtilities({
    // ─── Base glass ───────────────────────────────────────────────────────────
    '.glass': {
      'background': 'rgba(255, 255, 255, 0.18)',
      'backdrop-filter': 'blur(16px) saturate(1.5)',
      '-webkit-backdrop-filter': 'blur(16px) saturate(1.5)',
      'border': '1px solid rgba(255, 255, 255, 0.28)',
      'box-shadow': '0 8px 32px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.25)',
    },
    '.dark .glass': {
      'background': 'rgba(255, 255, 255, 0.08)',
      'border-color': 'rgba(255, 255, 255, 0.12)',
      'box-shadow': '0 8px 32px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)',
    },

    // ─── Navigation glass (sidebar, tab bar, toolbar) ─────────────────────────
    '.glass-nav': {
      'background': 'rgba(255, 255, 255, 0.65)',
      'backdrop-filter': 'blur(24px) saturate(1.8)',
      '-webkit-backdrop-filter': 'blur(24px) saturate(1.8)',
      'border-right': '1px solid rgba(255, 255, 255, 0.40)',
      'box-shadow': '4px 0 24px rgba(0,0,0,0.06), inset -1px 0 0 rgba(255,255,255,0.60)',
    },
    '.dark .glass-nav': {
      'background': 'rgba(20, 20, 30, 0.75)',
      'border-right-color': 'rgba(255, 255, 255, 0.08)',
      'box-shadow': '4px 0 24px rgba(0,0,0,0.40), inset -1px 0 0 rgba(255,255,255,0.06)',
    },

    // ─── Card / sheet glass ───────────────────────────────────────────────────
    '.glass-card': {
      'background': 'rgba(255, 255, 255, 0.22)',
      'backdrop-filter': 'blur(20px) saturate(1.6)',
      '-webkit-backdrop-filter': 'blur(20px) saturate(1.6)',
      'border': '1px solid rgba(255, 255, 255, 0.32)',
      'box-shadow': '0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.30)',
    },
    '.dark .glass-card': {
      'background': 'rgba(30, 30, 45, 0.55)',
      'border-color': 'rgba(255, 255, 255, 0.10)',
      'box-shadow': '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
    },

    // ─── Button glass ─────────────────────────────────────────────────────────
    '.glass-btn': {
      'background': 'rgba(255, 255, 255, 0.20)',
      'backdrop-filter': 'blur(12px)',
      '-webkit-backdrop-filter': 'blur(12px)',
      'border': '1px solid rgba(255, 255, 255, 0.35)',
      'box-shadow': '0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.40)',
      'transition': 'all 0.2s ease',
    },
    '.glass-btn:hover': {
      'background': 'rgba(255, 255, 255, 0.32)',
      'box-shadow': '0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.50)',
    },
    '.dark .glass-btn': {
      'background': 'rgba(255, 255, 255, 0.10)',
      'border-color': 'rgba(255, 255, 255, 0.18)',
    },

    // ─── Prominent glass (primary actions) ────────────────────────────────────
    '.glass-prominent': {
      'background': 'rgba(var(--primary), 0.85)',
      'backdrop-filter': 'blur(16px) saturate(2)',
      '-webkit-backdrop-filter': 'blur(16px) saturate(2)',
      'border': '1px solid rgba(255, 255, 255, 0.25)',
      'box-shadow': '0 4px 20px rgba(var(--primary), 0.30), inset 0 1px 0 rgba(255,255,255,0.35)',
    },

    // ─── Popover / tooltip glass ──────────────────────────────────────────────
    '.glass-popover': {
      'background': 'rgba(255, 255, 255, 0.78)',
      'backdrop-filter': 'blur(28px) saturate(1.9)',
      '-webkit-backdrop-filter': 'blur(28px) saturate(1.9)',
      'border': '1px solid rgba(255, 255, 255, 0.50)',
      'box-shadow': '0 8px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.70)',
    },
    '.dark .glass-popover': {
      'background': 'rgba(25, 25, 40, 0.82)',
      'border-color': 'rgba(255, 255, 255, 0.12)',
    },

    // ─── Scroll edge effect (content scrolls under glass nav) ─────────────────
    '.glass-scroll-edge': {
      'mask-image': 'linear-gradient(to bottom, transparent 0%, black 40px)',
      '-webkit-mask-image': 'linear-gradient(to bottom, transparent 0%, black 40px)',
    },
  });
})
```

---

## Component Patterns

### Glass Sidebar (Navigation Layer)

```tsx
// ✅ CORRECT — navigation floats above content in glass layer
<aside className="glass-nav sticky top-0 h-screen w-64 z-40 rounded-r-2xl">
  {/* nav items */}
</aside>

// ❌ WRONG — opaque sidebar blocks content
<aside className="bg-card border-r border-border w-64">
```

### Glass Card

```tsx
// Patient card, stat card, modal sheet
<div className="glass-card rounded-2xl p-6">
  <h3 className="text-foreground font-semibold">Patient Summary</h3>
  <p className="text-muted-foreground text-sm">...</p>
</div>
```

### Glass Button (non-primary)

```tsx
<button className="glass-btn px-4 py-2 rounded-xl text-foreground font-medium">
  View Details
</button>

// Prominent (primary action)
<button className="glass-prominent px-6 py-2.5 rounded-xl text-white font-semibold">
  Add Patient
</button>
```

### Floating Toolbar

```tsx
<div className="glass rounded-2xl px-3 py-2 flex items-center gap-2 shadow-lg">
  <ToolbarButton icon={PlusIcon} label="Add" />
  <Separator orientation="vertical" className="h-5 opacity-30" />
  <ToolbarButton icon={FilterIcon} label="Filter" />
</div>
```

### Background Canvas (required for glass to work)

Glass requires **richness behind it** to read correctly. Add a gradient canvas to page backgrounds:

```tsx
// In AppShell or page layout
<div className="relative min-h-screen bg-background overflow-hidden">
  {/* Ambient gradient blobs — adapt to current theme's primary/secondary */}
  <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
    <div className="absolute -top-40 -right-40 w-[600px] h-[600px]
                    bg-primary-200/30 rounded-full blur-3xl" />
    <div className="absolute top-1/2 -left-32 w-[500px] h-[500px]
                    bg-secondary-200/25 rounded-full blur-3xl" />
    <div className="absolute -bottom-40 right-1/3 w-[400px] h-[400px]
                    bg-accent-200/20 rounded-full blur-3xl" />
  </div>
  {children}
</div>
```

---

## Apple HIG Rules for Web (MediTrack-specific)

### DO ✅

| Rule | Why |
|---|---|
| Apply glass to **navigation layer only** (sidebar, top bar, floating toolbar, modals) | HIG: glass creates distinct functional layer above content |
| Use **concentric radius** — inner radius = outer radius minus padding | HIG: nested elements visually harmonize |
| **Extend content behind** sidebars (background extension effect) | HIG: full-bleed hero images should peek under nav |
| Allow glass to **adapt to content** — no hardcoded tints | Real glass picks up ambient colour from behind it |
| Add `motion-reduce:backdrop-filter-none` for `prefers-reduced-motion` | HIG: accessibility settings must remove translucency |
| Test at **multiple wallpaper/background types** (light, dark, vivid, plain) | Glass must be legible in all contexts |

### DON'T ❌

| Anti-pattern | Reason |
|---|---|
| Apply glass to **dense data tables or grids** | Legibility degrades; clinical data must be crisp |
| Stack **multiple glass layers** on top of each other | Creates muddy, unreadable overlap |
| Use glass for **form inputs** | Inputs need clear contrast — use `bg-input` |
| Use **hardcoded white/black** glass values that ignore dark mode | Use CSS custom properties or Tailwind opacity modifiers |
| Apply glass to **alert/error banners** | Critical information needs solid, high-contrast backgrounds |
| Blur content **inside** the glass pane | Only the content **behind** should blur |

---

## Accessibility Requirements

```tsx
// 1. Respect prefers-reduced-motion AND prefers-reduced-transparency
<aside className="glass-nav motion-reduce:backdrop-filter-none
                  motion-reduce:bg-card supports-[backdrop-filter]:backdrop-blur-2xl">

// 2. WCAG AA contrast on glass — text must be ≥4.5:1 against the blurred background
// Use text-foreground (not text-muted-foreground) for primary labels on glass surfaces

// 3. Focus rings must be visible against glass
<button className="glass-btn focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
```

---

## MediTrack Layer Architecture

```
z-50  │ Modals, dialogs            → glass-popover  + rounded-2xl
z-40  │ Sidebar, top nav           → glass-nav      (sticky/fixed)
z-30  │ Floating toolbars, FABs    → glass          + rounded-2xl
z-20  │ Cards, panels              → glass-card     + rounded-2xl
z-10  │ Content (tables, forms)    → bg-card        (opaque — legibility)
z-0   │ Page canvas (gradient bg)  → bg-background  + ambient blobs
z-[-10] │ Decorative gradient blobs  → pointer-events-none, fixed
```

---

## Lensing / Refraction Effect (Advanced CSS)

Apple Liquid Glass subtly warps the content behind it (optical refraction). Approximate with:

```css
/* Approximated lensing via SVG filter — apply to glass element wrapper */
.glass-refraction {
  filter: url(#glass-distort);
}

/* In SVG defs (add once to HTML root) */
/* <svg class="hidden" aria-hidden="true">
     <defs>
       <filter id="glass-distort">
         <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise"/>
         <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G"/>
       </filter>
     </defs>
   </svg> */
```

> Use sparingly — only for decorative hero elements. Never on clinical data surfaces.

---

## References

- Apple Developer: [Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)
- Apple Developer: [Applying Liquid Glass to custom views (SwiftUI)](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)
- Apple HIG: [Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- Apple HIG: [Color](https://developer.apple.com/design/human-interface-guidelines/color)
- Apple HIG: [Tab Bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
