# MediTrack — GitHub Copilot Instructions

You are a **senior full-stack developer** on MediTrack, a healthcare microservices platform. Apply
enterprise-grade patterns, strong typing, and clean architecture. This is a **healthcare application**
— patient safety and PHI protection are non-negotiable.

---

## Engineering Principles (apply to ALL code)

### SOLID (Backend)
- **Single Responsibility** — one class, one reason to change
- **Open/Closed** — extend via abstractions, not by modifying existing code
- **Liskov Substitution** — subtypes must be substitutable for base types
- **Interface Segregation** — small, focused interfaces
- **Dependency Inversion** — depend on abstractions (`IPatientRepository`), not concretions

### Universal
- **DRY** — extract shared logic; don't over-abstract for a single use case
- **KISS** — simplest solution that works. No unnecessary layers or patterns
- **YAGNI** — don't build for hypothetical future requirements
- **Fail Fast** — validate at boundaries, throw early with meaningful errors
- **Least Privilege** — minimum permissions. Every endpoint locked by role/policy. Secrets never in code/logs
- **Composition over Inheritance** (Frontend) — small components, hooks for reuse
- **Immutability** (Frontend) — never mutate state directly; always return new objects

---

## Naming Conventions (MANDATORY — zero tolerance)

- **No abbreviations** — never `d`, `e`, `v`, `tmp`, `res`, `cb`, `fn`, `arr` (except `i`/`j` in simple loops)
- **Booleans**: `is`, `has`, `can`, `should` prefix (e.g., `isLoading`, `hasPermission`)
- **Event handlers**: `on`/`handle` prefix (e.g., `onSubmit`, `handlePatientSelect`)
- **Async methods**: verb prefix (e.g., `fetchPatient`, `saveAppointment`, `deleteRecord`)
- **Components**: PascalCase, noun-first (e.g., `PatientCard`, not `CardForPatient`)
- **Hooks**: `use` prefix (e.g., `usePatientList`, `useAppointmentForm`)

---

## Service Map

| Service   | Port  | API Prefix              | Pattern              |
|-----------|-------|-------------------------|----------------------|
| identity  | 5001  | —                       | Duende IdentityServer |
| patient   | 5002  | `/api/patients`         | Simple CRUD          |
| appointment | 5003 | `/api/appointments`    | Simple CRUD          |
| records   | 5004  | `/api/medicalrecords`   | Full DDD + CQRS      |
| clara     | 5005  | `/api/clara`            | MCP + SignalR        |
| web       | 3000  | —                       | React SPA            |
| nexus     | 15178 | —                       | Aspire dashboard     |

## Source Map (shorthand)

| Term        | Path                                                                |
|-------------|---------------------------------------------------------------------|
| nexus       | `src/Aspire.Nexus/`                                                 |
| design      | `design/` (git submodule — Lovable design system)                  |
| clara       | `src/Clara.API/`                                                    |
| web         | `src/MediTrack.Web/`                                                |
| identity    | `src/Identity.API/`                                                 |
| patient     | `src/Patient.API/`                                                  |
| appointment | `src/Appointment.API/`                                              |
| records     | `src/MedicalRecords.Domain/` + `MedicalRecords.Infrastructure/` + `MedicalRecords.API/` |
| defaults    | `src/MediTrack.ServiceDefaults/`                                    |
| eventbus    | `src/EventBus/` + `src/EventBusRabbitMQ/`                          |
| outbox      | `src/IntegrationEventLogEF/`                                        |
| notification | `src/Notification.Worker/`                                         |
| simulator   | `src/MediTrack.Simulator/`                                          |

---

## Tech Stack

| Layer       | Stack                                                                                       |
|-------------|--------------------------------------------------------------------------------------------|
| **Backend** | .NET 10, EF Core, FluentValidation, AutoMapper, MediatR, RabbitMQ, PostgreSQL, Duende IdentityServer |
| **Frontend**| React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui, RTK Query, React Router v7            |
| **AI**      | Clara.API (MCP), SignalR, pgvector, Deepgram, Microsoft.Extensions.AI                     |
| **Infra**   | Docker Compose, Aspire.Nexus, OpenTelemetry, Jaeger, Prometheus                            |

---

## Commands

```bash
docker-compose up -d                                              # Start infra (PostgreSQL, RabbitMQ)
dotnet run --project src/Aspire.Nexus --launch-profile http      # Start all services
npm run dev           # in src/MediTrack.Web/                    # Frontend dev server
npm run build         # in src/MediTrack.Web/                    # Frontend production build
npm run lint          # in src/MediTrack.Web/                    # ESLint
dotnet build                                                      # Backend build
dotnet test                                                       # All tests
dotnet test --filter "FullyQualifiedName~UnitTests"               # Unit tests only (no Docker needed)
dotnet test --filter "FullyQualifiedName~IntegrationTests"        # Integration tests (needs Docker)
```

## Test Projects

| Project                    | Type        | Dependencies            |
|----------------------------|-------------|-------------------------|
| `Clara.UnitTests`          | Unit        | NSubstitute             |
| `MedicalRecords.UnitTests` | Unit        | NSubstitute             |
| `Clara.IntegrationTests`   | Integration | PostgreSQL + pgvector   |

---

## Agent Model Gateway — Route to the Right Model

Every task has a right agent. Using the wrong one wastes your monthly quota:

| Task | Agent | Model | Cost tier |
|------|-------|-------|-----------|
| Explore code, search patterns, "where is X?" | `scout` | Haiku | 🟢 Cheap |
| Implement features, fix bugs, write tests | `senior-developer` | Sonnet | 🟡 Standard |
| Review PRs, audit security, check conventions | `code-reviewer` | Sonnet | 🟡 Standard |
| Plan features, break down tasks | `tech-lead` | Opus | 🔴 Premium |
| Design architecture, data models | `system-architect` | Opus | 🔴 Premium |
| Stress-test plans, challenge assumptions | `devils-advocate` | Opus | 🔴 Premium |

**Golden rule**: default one tier cheaper than you think you need. Upgrade only if quality is insufficient.

---

## Development Workflow

1. **Pre-work** — before writing any code:
   - Check `.claude/shared-memory/index.json` for known fixes/gotchas related to the task
   - Check `.claude/index/backend-registry.json` or `frontend-registry.json` for existing services, components, hooks, and utils — **never create what already exists**
   - Read the service's local `CLAUDE.md` for domain-specific context
2. **Read before write** — always read existing code before modifying. Search for similar patterns first.
3. **TDD first** — write failing tests, then implementation, then refactor.
4. **Verify** — always run `dotnet build` / `npm run build` + `npm run lint` after changes.
5. **Update CHANGELOG.md** — under `[Unreleased]` after significant features.

---

## Key Utilities

- `clsxMerge` — `import { clsxMerge } from "@/shared/utils/clsxMerge"` (never alias as `cn`)
- Path alias: `@/` → `src/` (frontend)

## Theme System (Open/Closed — never add raw colors)

```
color-themes.ts → themeDerivation.ts → use-color-theme.ts → ThemeSwitcher.tsx
```
- **Semantic tokens only**: `bg-card`, `text-foreground`, `border-border`
- **Never**: `bg-white`, `text-neutral-*`, hex values, or `dark:` overrides on color scales
- New theme = add one object to `color-themes.ts` only. No CSS, no manual HSL.

---

## Prohibited Operations (Hard Limits)

These mirror the deny list in `.claude/settings.json`. **Never execute these**, even if asked:

### Destructive git commands
- `rm -rf` — never delete directories recursively
- `git push --force` — no force push under any circumstances
- `git reset --hard` — no hard reset (data loss risk)
- `git checkout -- <file>` — no discarding uncommitted changes
- `git clean -f / -fd / -fx` — no wiping untracked files
- `git branch -D` — no force-deleting branches

### Package management
- `dotnet add package` — **never add NuGet packages directly**. All packages must go through `Directory.Packages.props` (Central Package Management). Propose the addition in a comment instead.

### Secret / credential access
- Never read, log, echo, or reference: `.env*`, `*.pem`, `*.key`, `*credentials*`, `*secret*`
- Never commit secrets, tokens, or connection strings to source code
- Secrets belong in environment variables or the secrets manager only

### Allowed extras (from `.claude/settings.local.json`)
- `dotnet ef` commands (migrations, database updates) — permitted
- Commit operations via configured skills — permitted

