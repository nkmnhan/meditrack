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

## clsxMerge (MANDATORY)

**Always** use `clsxMerge` for combining Tailwind classes. Never use raw `clsx` or string concatenation.

```tsx
import { clsxMerge } from "@/shared/utils/clsxMerge";

// clsxMerge = clsx + tailwind-merge (resolves conflicts: "px-4", "px-2" → "px-2")
className={clsxMerge(
  "flex items-center justify-center",     // Layout
  "w-full h-12 px-4 py-2",                // Sizing/Spacing
  "rounded-lg border border-border",      // Shape/Border
  "bg-card text-foreground",              // Colors (semantic tokens!)
  "transition-all duration-200",          // Animation
  "hover:bg-muted focus:ring-2",          // States
  props.className                         // Caller overrides — always last
)}
```

## shadcn/ui (MANDATORY)

- Import from `@/shared/components/ui/` — never install shadcn components elsewhere
- Config: `components.json` at project root
- Base color: `slate` with CSS variables enabled
- All shadcn primitives are from Radix UI

## Design Tokens (MANDATORY)

**Never** use `bg-white`, `text-neutral-*`, `border-neutral-*`, or raw Tailwind colors.
**Always** use semantic tokens (resolve to CSS variables, auto-adapt to any theme):

| Token | Usage | BANNED |
|-------|-------|--------|
| `bg-background` | Page background | ~~`bg-neutral-50`~~ |
| `bg-card` | Cards, modals, surfaces | ~~`bg-white`~~ |
| `bg-muted` | Subtle surfaces, alt rows | ~~`bg-neutral-100`~~ |
| `text-foreground` | Headings, body text | ~~`text-neutral-900/800/700`~~ |
| `text-muted-foreground` | Labels, secondary text | ~~`text-neutral-600/500/400`~~ |
| `border-border` | Borders, dividers | ~~`border-neutral-200`~~ |
| `primary-*` | Buttons, headers, links | Allowed |
| `secondary-*` | Secondary actions | Allowed |
| `accent-*` | Violet CTAs | Allowed |
| `success/warning/error/info-*` | Status feedback | Allowed (use `-600`+ for text) |
| `status-scheduled/completed/...` | Appointment workflow | Allowed |
| `triage-critical/urgent/routine` | Medical urgency | Allowed |

**Why semantic tokens:** See `docs/theming-guide.md`. New theme = 25 CSS variables, zero component changes.

## Icons (MANDATORY)

```tsx
import { Stethoscope } from "lucide-react";
<Stethoscope className="h-5 w-5 text-primary-700" />  // UI size
<Stethoscope className="h-4 w-4 text-muted-foreground" />  // Inline with text
```

Never use raw SVGs, Font Awesome, or other icon libraries.

## Mobile-First (MANDATORY)

- Design for 320px min, enhance with `sm:`, `md:`, `lg:`
- Touch targets: min `h-10 w-10` (40px)
- Stack on mobile: `flex-col md:flex-row`
- Hide secondary: `hidden md:block`


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
