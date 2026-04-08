# MediTrack — Claude Code Guidelines

## Role

Act as a **senior full-stack developer** and collaborator. Apply enterprise-grade patterns, strong typing, and clean architecture.

## Engineering Principles (MANDATORY)

- **DRY** — extract shared logic, but don't over-abstract for a single use case
- **KISS** — simplest solution that works. No unnecessary layers or patterns
- **YAGNI** — don't build for hypothetical future requirements
- **Fail Fast** — validate at boundaries, throw early with meaningful errors
- **Least Privilege** — minimum permissions. Endpoints locked by role/policy by default. Secrets NEVER in code/logs

## Collaboration Protocol

- **Read CHANGELOG.md** at the start of a session to understand recent work and decisions
- **Update CHANGELOG.md** after completing significant features or changes (under `[Unreleased]`)
- **Read before write** — ALWAYS read existing code before modifying. Search for 3+ similar patterns before creating new ones
- **Evidence over assumption** — when claiming something exists/doesn't exist, show the grep/glob proof
- **Verify after change** — after modifying code, verify it compiles/lints — NEVER assume correctness

## Naming Conventions (MANDATORY)

- **Meaningful names only** — NEVER `d`, `e`, `v`, `tmp`, `res`, `cb`, `fn`, `arr` (except `i`/`j` in simple loops)
- Booleans: `is`, `has`, `can`, `should` prefix
- Event handlers: `on`/`handle` prefix
- Async: verb prefix (`fetchPatient`, `saveAppointment`)
- Components: PascalCase, noun-first (`PatientCard`)
- Hooks: `use` prefix (`usePatientList`)

## Shorthand Aliases

When the user says these terms, go directly to the right location — no searching needed:

| Term | Means | Path |
|------|-------|------|
| **nexus** | Aspire.Nexus (public orchestrator tool) | `src/Aspire.Nexus/` |
| **design** | Lovable design system (git submodule) | `design/` |
| **clara** | Clara AI clinical companion service | `src/Clara.API/` |
| **web** | React frontend application | `src/MediTrack.Web/` |
| **identity** | Duende IdentityServer service | `src/Identity.API/` |
| **patient** | Patient management service | `src/Patient.API/` |
| **appointment** | Appointment scheduling service | `src/Appointment.API/` |
| **records** | Medical records DDD service | `src/MedicalRecords.Domain/` + `MedicalRecords.Infrastructure/` + `MedicalRecords.API/` |
| **defaults** | Shared service infrastructure | `src/MediTrack.ServiceDefaults/` |
| **eventbus** | RabbitMQ event bus abstraction | `src/EventBus/` + `src/EventBusRabbitMQ/` |
| **outbox** | Integration event log (outbox pattern) | `src/IntegrationEventLogEF/` |
| **notification** | Background notification worker | `src/Notification.Worker/` |
| **simulator** | Test data seeder | `src/MediTrack.Simulator/` |
| **theme** | Theme system (switcher, derivation, config) | See Theme File Map below |
| **theme config** | Centralized color palette definitions | `design/src/shared/config/color-themes.ts` |
| **theme engine** | Derivation: 5 hex → 25+ CSS vars | `src/MediTrack.Web/src/shared/utils/themeDerivation.ts` |
| **theme switcher** | UI: palette picker popover | `design/src/components/ThemeSwitcher.tsx` |
| **theme hook** | Runtime: `<style>` injection + localStorage | `design/src/hooks/use-color-theme.ts` |
| **tokens** | CSS variables (:root / .dark) | `src/MediTrack.Web/src/index.css` + `design/src/index.css` |

## Service Map

| Service | Port | API Prefix | Pattern |
|---------|------|------------|---------|
| identity | 5001 | — | Duende IdentityServer |
| patient | 5002 | `/api/patients` | Simple CRUD |
| appointment | 5003 | `/api/appointments` | Simple CRUD |
| records | 5004 | `/api/medicalrecords` | Full DDD + CQRS |
| clara | 5005 | `/api/clara` | MCP + SignalR |
| web | 3000 | — | React SPA |
| nexus | 15178 | — | Aspire dashboard |


## Tech Stack

| Layer | Stack |
|-------|-------|
| **Backend** | .NET 10, EF Core, FluentValidation, AutoMapper, MediatR, RabbitMQ, PostgreSQL, Duende IdentityServer |
| **Frontend** | React 19 + Compiler, Vite, TypeScript, Tailwind CSS, shadcn/ui, RTK Query, React Router v7 |
| **AI** | Clara.API (MCP), SignalR, pgvector, Deepgram, Microsoft.Extensions.AI |
| **Infra** | Docker Compose, Aspire.Nexus, OpenTelemetry, Jaeger, Prometheus |

## Commands

```bash
docker-compose up -d              # Start infra (PostgreSQL, RabbitMQ)
dotnet run --project src/Aspire.Nexus --launch-profile http  # Start all via nexus
npm run dev                       # Frontend dev (src/MediTrack.Web/)
npm run build                     # Frontend build
npm run lint                      # ESLint
dotnet build                      # Backend build
dotnet test                       # Run all tests
dotnet test --filter "FullyQualifiedName~UnitTests"  # Unit tests only (no infra needed)
```

## Key Utilities

- `clsxMerge` — `import { clsxMerge } from "@/shared/utils/clsxMerge"`
- Path alias: `@/` → `src/`

## Theme Workflow (SOLID — Open/Closed)

**New tenant palette = add one object to `color-themes.ts`. No CSS, no manual HSL, no other files.**

### Architecture
```
color-themes.ts (config: palette + 5 brand colors + optional semantic overrides)
  → themeDerivation.ts (5 hex → 100+ CSS vars: core + scales + harmonized semantics)
    → use-color-theme.ts (<style> injection at runtime, cached)
      → ThemeSwitcher.tsx (sidebar popover) / ThemeSwitcherPopover (Radix, standalone pages)
```

### Theme File Map

| File | Project | Purpose |
|------|---------|---------|
| `shared/config/color-themes.ts` | Both | Single source of truth — palette definitions + semantic overrides |
| `shared/utils/themeDerivation.ts` | Both | Derivation engine (5 colors → 100+ HSL vars, perceptual scales) |
| `shared/utils/badgeStyles.ts` | Web | Centralized badge variant classes (theme-aware, no `dark:` needed) |
| `hooks/use-color-theme.ts` | Both | Runtime `<style>` injection + localStorage |
| `hooks/use-theme.ts` | Both | Light/dark/system mode toggle |
| `components/ThemeSwitcher.tsx` | Both | Sidebar popover + `ThemeSwitcherPopover` (Radix, Landing/Login) |
| `components/AppShell.tsx` | Design | `SidebarThemeButton` + mobile "Theme" tab |
| `index.css` | Both | `:root` + `.dark` defaults + color scale CSS vars + global thin scrollbar |
| `tailwind.config.ts` | Both | CSS var → Tailwind bridge via `cssScale()` helper |
| `docs/theming-guide.md` | — | Developer reference |

### Perceptual Color Scales
The derivation engine generates **100+ CSS variables** per theme:
- **Brand scales**: primary/secondary/accent (50-950, 11 shades each)
- **Semantic scales**: success/warning/error/info (50-900, 10 shades each, harmonized with primary hue)
- **Healing scale**: 50-600 (7 shades, derived from secondary biased toward teal)

Shade numbers have **consistent semantic meaning** regardless of light/dark:
- `50` = subtle background, `200` = border, `500` = solid/base, `700` = prominent text
- **No `dark:` overrides needed** for scale classes — `bg-success-50 text-success-700` just works

### Rules
- **Semantic tokens only** in components — see `.claude/rules/frontend.md` Color Tokens
- **No `dark:` overrides on color scales** — perceptual mapping handles light/dark automatically
- **Dual-update**: `index.css` + `tailwind.config.ts` + `themeDerivation.ts` + `color-themes.ts` must sync Web ↔ Design
- **No background tints** for row states — use `border-l-2 border-l-{color}` indicators instead
- **Inputs** must have explicit `bg-input text-foreground` (avoid inheriting transparent bg)
- Selection is **mutually exclusive**: Light/Dark/System OR a color palette, never both

---

## Development Workflow

For non-trivial work, follow this sequence:

1. **Design** — explore requirements and constraints before coding
2. **Plan** — create step-by-step implementation plan (save to `docs/superpowers/plans/`)
3. **Isolate** — use a feature branch or git worktree (`.worktrees/`)
4. **Execute** — implement in small, verifiable steps
5. **Verify** — run `npm run lint` + `npm run build` (frontend), `dotnet build` (backend when SDK available)
6. **Finish** — merge or create PR

**If the `superpowers` plugin is installed**, use its skills to automate these steps:
`/superpowers:brainstorming` → `/superpowers:writing-plans` → `/superpowers:using-git-worktrees` → `/superpowers:executing-plans` → `/superpowers:verification-before-completion` → `/superpowers:finishing-a-development-branch`

**TDD is mandatory for all new code** — use `/superpowers:test-driven-development` when available.

**Test commands:**
```bash
dotnet test                                              # All tests
dotnet test --filter "FullyQualifiedName~UnitTests"      # Unit tests only (no DB needed)
dotnet test --filter "FullyQualifiedName~IntegrationTests" # Integration tests (needs Docker)
npm test                                                  # Frontend tests (src/MediTrack.Web/)
```

**Test project map:**
| Project | Type | Dependencies | When to use |
|---------|------|-------------|-------------|
| `Clara.UnitTests` | Unit | NSubstitute | Services, handlers, domain logic |
| `MedicalRecords.UnitTests` | Unit | NSubstitute | Domain entities, value objects, CQRS handlers |
| `Clara.IntegrationTests` | Integration | PostgreSQL + pgvector | API endpoints, SignalR, DB queries |



## Detailed Rules

Backend, frontend, business, and workflow rules are in `.claude/rules/` (loaded automatically by path scope).
Per-service domain context is in each service's `CLAUDE.md`.
Code review standards are in `REVIEW.md`.

---

## CRITICAL — verify before every change

1. **NEVER** hardcode secrets, log PHI, or skip `[Authorize]` on endpoints
2. **NEVER** use manual `React.memo`/`useCallback`/`useMemo` — React Compiler handles it
3. **ALWAYS** read existing code before modifying — evidence over assumption
