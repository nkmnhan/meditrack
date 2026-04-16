---
paths:
  - "src/MediTrack.Web/src/shared/**"
  - "src/MediTrack.Web/src/features/*/components/**"
  - "src/MediTrack.Web/tailwind.config.ts"
  - "design/src/**"
  - "design/tailwind.config.ts"
---

<!-- maintainer: paths scoped to shared components and feature component directories.
     Dual-update mandate: Web ↔ Design submodule must stay in sync.
     Keep under 50 lines. -->

# Web ↔ Design Sync Rule (MANDATORY)

Two projects share components and MUST stay in sync:
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

| Web path | Design path |
|----------|-------------|
| `src/features/landing/components/*.tsx` | `src/pages/Landing.tsx` (monolithic) |
| `src/features/*/components/*Page.tsx` | `src/pages/*.tsx` |
| `src/features/admin/components/*Page.tsx` | `src/pages/admin/Admin*.tsx` |

**Note:** Design `Landing.tsx` is a single monolithic file. When updating any Web landing sub-component, find and update the corresponding section inside `design/src/pages/Landing.tsx`.

## What does NOT need syncing

- `shared/auth/` (Web-only: OIDC, Redux, roles)
- `shared/store/` (Web-only: RTK Query)
- `shared/demo/` (Web-only: demo mode)
- `lib/` (Design-only: React Query)
- PageExplorer page-tree navigator (Design-only)
