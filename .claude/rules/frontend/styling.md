---
paths:
  - "src/MediTrack.Web/**"
  - "design/**"
  - "**/tailwind.config.ts"
  - "**/index.css"
---

# Frontend Styling (Tailwind CSS)

## General Rules

- **Mobile-first** — design for 320px min, enhance with `sm:`, `md:`, `lg:` breakpoints
- **Touch targets** — min `h-10 w-10` (40px) on mobile
- **Tailwind only** — no CSS modules/SCSS. Use `clsxMerge` for conditional classes
- **Icons** — Lucide React only (`h-5 w-5` UI, `h-4 w-4` inline). NEVER raw SVGs or Font Awesome
- **Class order** — Layout → Sizing → Shape → Colors → Animation → States → `props.className`

## Color Tokens (MANDATORY)

**NEVER** use raw Tailwind colors (`blue-500`, `gray-700`). ALWAYS use project tokens:

| Token | Usage | WCAG Note |
|-------|-------|-----------|
| `primary-700/800` | Buttons, headers, links | |
| `secondary-700` | Secondary actions | |
| `accent-500` | Violet CTAs (sparingly) | |
| `neutral-900` | Headings | |
| `neutral-700` | Body text | |
| `neutral-500` | Muted text | Only on large text or backgrounds |
| `neutral-200` | Borders, dividers | |
| `neutral-50` / `white` | Page bg / Card bg | |
| `success/warning/error/info-500` | Status feedback | Use `-600`+ for text on white |
| `status-scheduled/completed/...` | Appointment workflow states | |
| `triage-critical/urgent/routine` | Medical urgency levels | |

**Contrast rule**: `-500` and lighter fail WCAG AA on white. Use `-600`+ for text.

## Spacing

- Page: `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`
- Sections: `space-y-8` | Cards: `p-6` | Grid gap: `gap-6` | Form fields: `space-y-4`

## clsxMerge (MANDATORY)

**ALWAYS** use `clsxMerge` for combining Tailwind classes. NEVER raw `clsx` or string concatenation.

```tsx
import { clsxMerge } from "@/shared/utils/clsxMerge";

className={clsxMerge(
  "flex items-center justify-center",     // Layout
  "w-full h-12 px-4 py-2",                // Sizing
  "rounded-lg border border-neutral-200", // Shape
  "bg-white text-neutral-900",            // Colors
  "transition-all duration-200",          // Animation
  "hover:bg-neutral-50 focus:ring-2",     // States
  props.className                         // Caller overrides — always last
)}
```

## shadcn/ui

- Import from `@/shared/components/ui/` — NEVER install shadcn components elsewhere
- Base color: `slate` with CSS variables enabled
- All primitives are from Radix UI
