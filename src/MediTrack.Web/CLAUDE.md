# MediTrack Web — Frontend Application

> Styling, patterns, and design-sync rules are in `.claude/rules/frontend/`. This file covers Web-specific structure only.

## Feature Structure

| Feature | Components | Hooks | Store | Key Files |
|---------|-----------|-------|-------|-----------|
| `admin` | 8 pages + 8 charts | — | `adminApi.ts` | `AutoRefreshIndicator`, chart components |
| `appointments` | 11 | `useAppointmentCalendar`, `useAppointmentActions` | `appointmentApi.ts` | ScheduleX calendar, status workflow dialogs |
| `clara` | 6 | `useSession`, `useAudioRecording` | `claraApi.ts` | SignalR, Web Audio, DevPanel |
| `dashboard` | 2 | `useDashboard`, `useDashboardLayout` | — | Customizable widget layout |
| `landing` | 11 | `useScrollReveal` | — | ClaraMiniDemo, HeroSection |
| `medical-records` | 6 | `useMedicalRecordsSearch` | `medicalRecordsApi.ts` | Tabs: notes, prescriptions, vitals, attachments |
| `patients` | 5 | — | `patientApi.ts` | NaturalLanguageSearch, PatientTimeline |

## Path Aliases

| Alias | Resolves to |
|-------|-------------|
| `@/` | `src/` |
| `@/shared/components` | shadcn + custom shared components |
| `@/shared/components/ui` | shadcn/ui primitives |
| `@/shared/utils` | Utilities (`clsxMerge`, `cn`, `chartColors`, `avatarUtils`) |
| `@/shared/hooks` | Custom hooks (`use-mobile`, `use-toast`) |
| `@/shared/auth` | OIDC auth (`AuthProvider`, `ProtectedRoute`, `RoleGuard`, `roles.ts`) |
| `@/shared/store` | Redux Toolkit store |

## Key Shared Files

| File | Purpose |
|------|---------|
| `shared/utils/clsxMerge.ts` | Class merging utility |
| `shared/utils/cn.ts` | shadcn/ui utility (alias for clsxMerge) |
| `shared/utils/chartColors.ts` | Recharts color constants |
| `shared/utils/avatarUtils.ts` | Avatar generation helpers |
| `shared/hooks/use-mobile.tsx` | Mobile breakpoint detection |
| `shared/hooks/use-toast.ts` | Sonner toast wrapper |
| `shared/components/Layout.tsx` | App shell (sidebar + header + content) |
| `shared/components/CommandPalette.tsx` | Ctrl+K command search |
| `shared/auth/roles.ts` | Role constants (must match backend `UserRoles.cs`) |

## Build & Dev

```bash
npm run dev       # Vite dev server (port 3000)
npm run build     # tsc -b && vite build
npm run lint      # ESLint
```
