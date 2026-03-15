---
paths:
  - "src/MediTrack.Web/src/shared/**"
  - "src/MediTrack.Web/src/features/*/components/**"
  - "src/MediTrack.Web/tailwind.config.ts"
  - "design/src/**"
  - "design/tailwind.config.ts"
---

# Web ↔ Design Sync Rule (MANDATORY)

These two projects share components and must stay in sync:
- `src/MediTrack.Web/` — production React 19 app (RTK Query, React Router v7)
- `design/` — Lovable design system (React Query, React Router v6)

## When editing shared code, ALWAYS update BOTH projects

| Web path | Design path |
|----------|-------------|
| `src/shared/components/*.tsx` | `src/components/*.tsx` |
| `src/shared/components/ui/*.tsx` | `src/components/ui/*.tsx` |
| `src/shared/hooks/*.ts` | `src/hooks/*.ts` |
| `src/shared/utils/clsxMerge.ts` | `src/shared/utils/clsxMerge.ts` |
| `src/features/clara/components/*` | `src/components/clara/*` |
| `tailwind.config.ts` (Web) | `tailwind.config.ts` (Design) |

## Import adjustments when syncing

| Concept | Web import | Design import |
|---------|-----------|---------------|
| Components | `@/shared/components/...` | `@/components/...` |
| UI primitives | `@/shared/components/ui/...` | `@/components/ui/...` |
| Utilities | `@/shared/utils/clsxMerge` | `@/shared/utils/clsxMerge` |
| Hooks | `@/shared/hooks/...` | `@/hooks/...` |

## Page-level sync

Web feature pages map to design page files. When editing page UI (layout, copy, spacing, CTAs), update both:

| Web path | Design path |
|----------|-------------|
| `src/features/landing/components/*.tsx` | `src/pages/Landing.tsx` (monolithic — all 11 sub-components inline) |
| `src/features/*/components/*Page.tsx` | `src/pages/*.tsx` |
| `src/features/admin/components/*Page.tsx` | `src/pages/admin/Admin*.tsx` |

**Note:** Design `Landing.tsx` is a single monolithic file containing all sections that Web splits into separate sub-components (HeroSection, FeaturesSection, etc.). When updating any Web landing sub-component, find and update the corresponding section inside `design/src/pages/Landing.tsx`.

## FeatureGuide ↔ PageExplorer sync

The Web `FeatureGuide/` and Design `PageExplorer.tsx` are counterparts — same bookmark-tab trigger, same panel UI. When editing either:

| Web path | Design path |
|----------|-------------|
| `src/shared/components/FeatureGuide/FeatureGuideButton.tsx` | `src/components/PageExplorer.tsx` (trigger + panel combined) |
| `src/shared/components/FeatureGuide/FeatureGuidePanel.tsx` | `src/components/FeatureGuide/FeatureGuidePanel.tsx` |
| `src/shared/components/FeatureGuide/FeatureGuideData.ts` | `src/components/FeatureGuide/FeatureGuideData.ts` |

**Design differences:** PageExplorer also includes a page-tree navigator (design-only). Only the trigger button, bookmark tab shape, and Quick Tour section need syncing.

## What does NOT need syncing

- `shared/auth/` (Web-only: OIDC, Redux, roles)
- `shared/store/` (Web-only: RTK Query)
- `shared/demo/` (Web-only: demo mode)
- `lib/` (Design-only: React Query)
- `lovable-tagger` (Design-only)
- PageExplorer page-tree navigator (Design-only — the page category tree inside the panel)
