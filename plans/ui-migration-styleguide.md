# UI Migration: Lovable Styleguide → MediTrack Web

**Branch:** `feat/medical-ai-secretary`
**Source:** `C:\nkmn\Projects\meditrack-styleguide`
**Target:** `src/MediTrack.Web/`

---

## What Changes vs. What Stays

| Concern | Keep (main app) | Replace/Add (styleguide) |
|---|---|---|
| Auth | OIDC + Duende IdentityServer | — |
| State | RTK Query + Redux | — |
| Real-time | SignalR + Web Audio API | — |
| Router | React Router v7 | — |
| React | React 19 | — |
| Calendar | Schedule-X | — |
| UI components | — | shadcn/ui (40+ components) |
| Charts | — | Recharts (sparklines on dashboard) |
| CSS tokens | — | HSL CSS variables + tailwindcss-animate |
| Pages | Functional shell | Visual overhaul + Admin + SessionSummary |

---

## Phase 1 — Foundation (deps + design system)

**Goal:** All new packages installed, design tokens unified, `cn()` available alongside `clsxMerge`.

### 1.1 Install production dependencies

```bash
cd src/MediTrack.Web

npm install \
  @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-aspect-ratio \
  @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible \
  @radix-ui/react-context-menu @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-hover-card @radix-ui/react-label @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress \
  @radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-select \
  @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-slot \
  @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast \
  @radix-ui/react-toggle @radix-ui/react-toggle-group @radix-ui/react-tooltip \
  class-variance-authority cmdk date-fns embla-carousel-react \
  input-otp react-day-picker react-resizable-panels recharts \
  tailwindcss-animate vaul

npm install -D @tailwindcss/typography
```

### 1.2 Update `tailwind.config.ts`

Merge the styleguide's `theme.extend` color tokens (HSL CSS variable references) and add the `tailwindcss-animate` plugin. Existing project tokens (`status-*`, `triage-*`) are preserved.

### 1.3 Update `src/index.css`

Replace the global styles block with HSL CSS variables (`:root` defining `--background`, `--foreground`, `--primary`, `--secondary`, `--accent`, semantic colors). Keep all existing Tailwind directives.

### 1.4 Add `cn()` utility

New file at `src/shared/utils/cn.ts`. Existing `clsxMerge` stays untouched — migrated shadcn/ui components use `cn`, existing app code uses `clsxMerge`.

### 1.5 Add `components.json`

shadcn/ui config file at `src/MediTrack.Web/components.json`, pointing aliases to `@/shared/components/ui` so future `npx shadcn add` commands land correctly.

**Status:** [x] Complete

### Notes
- Installed 142 new packages. Fixed 1 pre-existing `minimatch` vuln via `npm audit fix`.
- `tailwind.config.ts` — merged HSL CSS variable tokens, accordion keyframes, `tailwindcss-animate` + `@tailwindcss/typography` plugins.
- `src/index.css` — added Google Fonts (Inter), full HSL CSS variable `:root` block, and base resets.
- `src/shared/utils/cn.ts` — new `cn()` utility alongside existing `clsxMerge`.
- `components.json` — shadcn/ui config pointing to `@/shared/components/ui`.

---

## Phase 2 — shadcn/ui Component Library

**Goal:** All 40+ shadcn/ui wrapper components available under `src/shared/components/ui/`.

Copy from `meditrack-styleguide/src/components/ui/` → `src/MediTrack.Web/src/shared/components/ui/`.

Two edits per file:
- `import { cn } from "@/lib/utils"` → `import { cn } from "@/shared/utils/cn"`
- Nothing else — these files are self-contained Radix UI wrappers

### Batch order

| Batch | Components |
|---|---|
| Primitives | `button`, `badge`, `input`, `label`, `textarea`, `separator`, `avatar`, `skeleton` |
| Overlays | `dialog`, `alert-dialog`, `sheet`, `drawer`, `popover`, `tooltip`, `hover-card` |
| Forms | `form`, `checkbox`, `radio-group`, `switch`, `select`, `slider`, `input-otp` |
| Navigation | `breadcrumb`, `tabs`, `pagination`, `navigation-menu`, `menubar`, `dropdown-menu`, `context-menu` |
| Layout | `card`, `accordion`, `collapsible`, `scroll-area`, `aspect-ratio`, `resizable`, `carousel` |
| Feedback | `alert`, `progress`, `toast`, `toaster`, `sonner`, `use-toast` |
| Advanced | `command`, `table`, `chart`, `toggle`, `toggle-group` |

**Status:** [x] Complete

### Notes
- Copied 49 files from `meditrack-styleguide/src/components/ui/` to `src/shared/components/ui/`.
- Fixed all import paths: `@/lib/utils` → `@/shared/utils/cn`, `@/components/ui/` → `@/shared/components/ui/`, `@/hooks/` → `@/shared/hooks/`.
- Copied `use-mobile.tsx` and `use-toast.ts` to `src/shared/hooks/`.
- **Version API fixes (styleguide used older APIs):**
  - `calendar.tsx` — updated from `react-day-picker` v8 (`IconLeft`/`IconRight`) to v9 (`Chevron` component).
  - `resizable.tsx` — updated from `react-resizable-panels` v2 (`PanelGroup`/`PanelResizeHandle`) to v4 (`Group`/`Separator`).
  - `chart.tsx` — replaced recharts internal type references with explicit interfaces for v3 compatibility.
  - `sonner.tsx` — removed `next-themes` dep (dark mode deferred), hardcoded `theme="light"`.

---

## Phase 3 — Layout Overhaul

**Goal:** Polished sidebar + mobile drawer, improved nav, better Clara FAB/Panel.

### 3.1 Update `Layout.tsx`

Port `AppShell.tsx` improvements from the styleguide:
- Sidebar `NavLink` active/inactive styles
- Admin section separator in nav
- Mobile drawer using shadcn `Sheet` instead of raw div
- User profile footer in sidebar
- OIDC auth integration (`useAuth()`, sign-out) — unchanged

### 3.2 Extract `NavLink` component

`src/shared/components/NavLink.tsx` — icon + label + active style, used by Layout.

### 3.3 Update Clara FAB + Panel

Port improved `ClaraFab.tsx` and `ClaraPanel.tsx` UI (animations, suggestion chips, message layout). `ClaraPanelContext.tsx` logic unchanged.

**Status:** [ ] Complete

---

## Phase 4 — Page-by-Page UI Migration

**Pattern for each page:**
1. Copy styleguide JSX as the new UI shell
2. Fix import paths (`@/components/ui/` → `@/shared/components/ui/`)
3. Replace mock data with real RTK Query hooks (`isLoading`, error states)
4. React Router v6 `navigate()` calls are identical in v7 — no changes

| Page | File | RTK hook |
|---|---|---|
| Dashboard | Extract from `App.tsx` → `features/dashboard/` | `useGetAppointmentsQuery`, patient count |
| PatientList | `features/patients/components/PatientList.tsx` | `useGetPatientsQuery`, `useSearchPatientsQuery` |
| PatientDetail | `features/patients/components/PatientDetail.tsx` | `useGetPatientByIdQuery` |
| PatientNew/Edit | `features/patients/components/PatientForm.tsx` | `useCreatePatientMutation`, `useUpdatePatientMutation` |
| Appointments | `features/appointments/components/AppointmentCalendarPage.tsx` | `useGetAppointmentsQuery` |
| AppointmentDetail (new) | `features/appointments/components/AppointmentDetailPage.tsx` | `useGetAppointmentByIdQuery` |
| MedicalRecordsList | `features/medical-records/components/MedicalRecordsIndexPage.tsx` | `getMedicalRecordsByPatientId` |
| MedicalRecordDetail | `features/medical-records/components/MedicalRecordDetail.tsx` | `useGetMedicalRecordByIdQuery` |
| ClaraStart | `features/clara/components/SessionStartScreen.tsx` | `useGetSessionsQuery` |
| ClaraSession | `features/clara/components/LiveSessionView.tsx` | `useSession`, `useAudioRecording` unchanged |
| SessionSummary (new) | `features/clara/components/SessionSummary.tsx` | `useGetSessionQuery`, `useEndSessionMutation` |

**Status:** [ ] Complete

---

## Phase 5 — Admin Pages (stubs)

**Goal:** Four admin routes render realistic UI; no backend APIs yet.

- `/admin/reports` → `AdminReports.tsx`
- `/admin/users` → `AdminUsers.tsx`
- `/admin/system` → `AdminSystem.tsx`
- `/admin/audit` → `AdminAudit.tsx`

Add Admin nav section in Layout, visible to `Admin` role only (`RoleGuard`).

**Status:** [ ] Complete

---

## Phase 6 — Polish & Cleanup

- Remove `lovable-tagger` references from any copied code
- Audit all color classes: no `blue-500`, no hardcoded hex — project tokens only
- Run `npm run lint` and fix all errors
- Smoke test every route

**Status:** [ ] Complete

---

## File Changeset Summary

| Category | Action | Count |
|---|---|---|
| New npm deps (prod) | Install | ~25 packages |
| New npm deps (dev) | Install | 1 (`@tailwindcss/typography`) |
| New UI components | Copy + fix import path | ~40 files in `shared/components/ui/` |
| Modified config | `tailwind.config.ts`, `index.css`, `vite.config.ts` | 3 files |
| New utility | `shared/utils/cn.ts` | 1 file |
| New config | `components.json` | 1 file |
| Modified pages | Dashboard, PatientList, PatientDetail, PatientForm, MedicalRecordsList, MedicalRecordDetail, SessionStartScreen, LiveSessionView | 8 files |
| New pages | AppointmentDetail, SessionSummary, AdminReports, AdminUsers, AdminSystem, AdminAudit | 6 files |
| Modified layout | Layout.tsx, NavLink.tsx, ClaraFab.tsx, ClaraPanel.tsx | 4 files |
| Modified routes | App.tsx | 1 file |

---

## Risk Items

| Risk | Mitigation |
|---|---|
| React 18 vs 19 peer deps | Use `--legacy-peer-deps` if needed; Radix UI works fine with React 19 at runtime |
| `sonner` v1 (styleguide) vs v2 (main) | Keep main app's v2 — `<Toaster>` API is compatible |
| Recharts bundle size (~200KB gz) | Only import on Dashboard route |
| `date-fns` new dep | Only used by `react-day-picker`; no conflict |
