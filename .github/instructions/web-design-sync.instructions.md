---
applyTo: "src/MediTrack.Web/src/shared/**,src/MediTrack.Web/src/features/*/components/**,src/MediTrack.Web/tailwind.config.ts,design/src/**,design/tailwind.config.ts"
---

Follow all rules in `.claude/rules/frontend/design-sync.md`.

# Web ↔ Design Sync Rule (MANDATORY)

Two projects share components and **must stay in sync**:
- `src/MediTrack.Web/` — production React 19 app (RTK Query, React Router v7)
- `design/` — Lovable design system git submodule (React Query, React Router v6)

## When editing shared code, ALWAYS update BOTH projects

| Web path                                      | Design path                            |
|-----------------------------------------------|----------------------------------------|
| `src/shared/components/*.tsx`                 | `src/components/*.tsx`                 |
| `src/shared/components/ui/*.tsx`              | `src/components/ui/*.tsx`              |
| `src/shared/hooks/*.ts`                       | `src/hooks/*.ts`                       |
| `src/shared/utils/clsxMerge.ts`               | `src/shared/utils/clsxMerge.ts`        |
| `src/features/clara/components/*`             | `src/components/clara/*`               |
| `tailwind.config.ts` (Web)                    | `tailwind.config.ts` (Design)          |

## Import Adjustments When Syncing

| Concept      | Web import                         | Design import                   |
|--------------|------------------------------------|---------------------------------|
| Components   | `@/shared/components/...`          | `@/components/...`              |
| UI primitives| `@/shared/components/ui/...`       | `@/components/ui/...`           |
| Utilities    | `@/shared/utils/clsxMerge`         | `@/shared/utils/clsxMerge`      |
| Hooks        | `@/shared/hooks/...`               | `@/hooks/...`                   |

## Page-Level Sync

| Web path                                              | Design path                              |
|-------------------------------------------------------|------------------------------------------|
| `src/features/landing/components/*.tsx`               | `src/pages/Landing.tsx` (monolithic — all 11 sub-components inline) |
| `src/features/*/components/*Page.tsx`                 | `src/pages/*.tsx`                        |
| `src/features/admin/components/*Page.tsx`             | `src/pages/admin/Admin*.tsx`             |

> Design `Landing.tsx` is a **single monolithic file** containing all sections that Web splits into
> separate sub-components (HeroSection, FeaturesSection, etc.). When updating any Web landing
> sub-component, find and update the corresponding section inside `design/src/pages/Landing.tsx`.

## FeatureGuide ↔ PageExplorer Sync

| Web path                                                         | Design path                                              |
|------------------------------------------------------------------|----------------------------------------------------------|
| `src/shared/components/FeatureGuide/FeatureGuideButton.tsx`      | `src/components/PageExplorer.tsx` (trigger + panel)      |
| `src/shared/components/FeatureGuide/FeatureGuidePanel.tsx`       | `src/components/FeatureGuide/FeatureGuidePanel.tsx`       |
| `src/shared/components/FeatureGuide/FeatureGuideData.ts`         | `src/components/FeatureGuide/FeatureGuideData.ts`         |

Only the trigger button, bookmark tab shape, and Quick Tour section need syncing.
PageExplorer's page-tree navigator is Design-only.

## What Does NOT Need Syncing

- `shared/auth/` (Web-only: OIDC, Redux, roles)
- `shared/store/` (Web-only: RTK Query)
- `shared/demo/` (Web-only: demo mode)
- `lib/` (Design-only: React Query)
- `lovable-tagger` (Design-only)
