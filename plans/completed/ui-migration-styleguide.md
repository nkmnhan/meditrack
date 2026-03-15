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

**Status:** [x] Complete

### Notes
- Layout.tsx already uses shadcn `Sheet` for mobile "More" menu drawer.
- `NavLink` kept as internal component in Layout.tsx (no need for separate file — only used by Layout).
- Sidebar has NavLink active/inactive styles with `healing-100/500` tokens, admin section separator, user profile footer with OIDC sign-out.
- Clara FAB: gradient `accent-500 → accent-700`, animated pulse indicator, auto-hides on `/clara/*` routes.
- Clara Panel: slide-in right panel with "Start Clinical Session" CTA, suggestion chips, mock conversation.
- Mobile bottom nav: 4 main tabs + "More" sheet with Clara AI link and admin section.
- `FeatureGuideButton` integrated (non-blocking tour for first-time users).
- `CommandPalette` integrated (Cmd+K / Ctrl+K).

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

**Status:** [x] Complete

### Notes
- All 11 pages built with modern UI, RTK Query hooks, and full feature sets.
- Pages exceed original styleguide scope — 59 enhancement items from `ui-enhancement-audit.md` applied.
- DashboardPage: 5 customizable widgets, drag-reorder, sparklines, Clara suggestions, clickable stat cards with drill-down.
- PatientList: NLP search, risk badges, last visit, bulk selection, grid/list toggle, pagination.
- PatientDetail: 3 tabs (Details/Clinical/Timeline), Clara sidebar, documents section, copy summary.
- PatientForm: Allergy input, PCP assignment, language preferences, consent checkboxes, photo upload.
- AppointmentCalendarPage: ScheduleX calendar, drag-drop reschedule, color legend, today indicator, quick vitals on check-in.
- AppointmentDetailPage: Pre-visit patient summary, visit outcome, telehealth integration.
- MedicalRecordsIndexPage: Date range filter, full-text search, ICD-10 filter, bulk export.
- MedicalRecordDetail: Functional add note (SOAP template), file upload, drug interaction warnings, print/export, edit mode, lab trend charts.
- SessionStartScreen: Patient context preview, session templates, appointment quick-start, keyboard shortcuts.
- LiveSessionView: Suggestion accept/reject, patient summary sidebar, speaker correction, audio quality indicator, urgent keyword alerts, timer warnings.
- SessionSummary: ICD-10 autocomplete, medication autocomplete, AI confidence indicators, diff view, secondary diagnosis support.

---

## Phase 5 — Admin Pages (stubs)

**Goal:** Four admin routes render realistic UI; no backend APIs yet.

- `/admin/dashboard` → `AdminDashboardPage.tsx`
- `/admin/reports` → `AdminReportsPage.tsx`
- `/admin/users` → `AdminUsersPage.tsx`
- `/admin/system` → `AdminSystemPage.tsx`
- `/admin/audit` → `AdminAuditPage.tsx`
- `/admin/fhir-viewer` → `AdminFhirViewerPage.tsx`
- `/admin/import` → `AdminImportWizardPage.tsx`
- `/admin/integrations` → `AdminIntegrationsPage.tsx`

Add Admin nav section in Layout, visible to `Admin` role only (`RoleGuard`).

**Status:** [x] Complete

### Notes
- 8 admin pages (expanded from original 4) — all fully implemented with mock data.
- AdminDashboard: 4 KPI cards, system status banner, area/bar/pie charts, infrastructure metrics, clinical outcome metrics, FHIR sync rate, Clara AI accuracy, real-time activity feed.
- AdminReports: 4 tabs (Clara AI, Appointments, Patients, User Activity), interactive date range picker, acceptance funnel chart, enhanced provider leaderboard with sparklines, peak usage heatmap, department comparison, export/scheduling.
- AdminUsers: Search, role/status filters, table/card views, invite user modal, session count column, 2FA status, user detail/edit modal.
- AdminSystem: Real-time metrics, service cards, performance trends, alerts with acknowledgement, FHIR endpoint health, uptime SLA indicator.
- AdminAudit: Timeline list, action/severity filters, PHI access tracking, user session context, date range filter, export CSV.
- AdminFhirViewer: 6 resource types, raw JSON + tree view, live FHIR querying toggle, validation display, search within bundle.
- AdminImportWizard: 4-step flow with drag-drop upload, field mapping, validation error reporting, duplicate detection, template save/load.
- AdminIntegrations: 4 EHR cards with status badges, sync error details, manual sync trigger, sync history log.

---

## Phase 6 — Polish & Cleanup

- [x] Remove `lovable-tagger` references from any copied code
- [x] Audit all color classes: no `blue-500`, no hardcoded hex — project tokens only
- [x] Create `eslint.config.js` (ESLint 9 flat config format)
- [x] Run `npm run lint` and fix all errors (0 errors, 12 warnings — all in shadcn/ui library files)
- [x] `npm run build` passes cleanly
- [x] Design folder (`design/`) updated to match main app enhancements

**Status:** [x] Complete

### Notes
- Removed `LovableIcon` component from `BrandIcons.tsx`.
- Removed Lovable.dev link from `LandingFooter.tsx`, replaced with "UI Design System" link.
- Removed Lovable.dev badge from `TechStackSection.tsx`, replaced with "shadcn/ui".
- Color audit clean — only non-token colors are in shadcn/ui library internals (toast.tsx destructive classes).
- ESLint config: suppressed `no-empty-object-type` (shadcn/ui pattern), `no-require-imports` (tailwind plugins).
- Design folder pages synced with main app's 59+ UI enhancement items.

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
