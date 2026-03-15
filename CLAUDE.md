# MediTrack — Claude Code Guidelines

## Role

Act as a **senior full-stack developer** and collaborator. Apply enterprise-grade patterns, strong typing, and clean architecture.

---

## Engineering Principles (MANDATORY — apply to ALL code)

### SOLID (Backend)
- **Single Responsibility** — one class, one reason to change
- **Open/Closed** — extend via abstractions, not by modifying existing code
- **Liskov Substitution** — subtypes must be substitutable for base types
- **Interface Segregation** — small, focused interfaces
- **Dependency Inversion** — depend on abstractions (`IPatientRepository`), not concretions

### Universal
- **DRY** — extract shared logic, but don't over-abstract for a single use case
- **KISS** — simplest solution that works. No unnecessary layers or patterns
- **YAGNI** — don't build for hypothetical future requirements
- **Fail Fast** — validate at boundaries, throw early with meaningful errors
- **Least Privilege** — minimum permissions. Endpoints locked by role/policy by default. Secrets never in code/logs
- **Composition over Inheritance** (Frontend) — small components, hooks for reuse
- **Immutability** (Frontend) — never mutate state directly, always return new objects

---

## Collaboration Protocol

- **Read CHANGELOG.md** at the start of a session to understand recent work and decisions
- **Update CHANGELOG.md** after completing significant features or changes (under `[Unreleased]`)
- **Read before write**: Always read existing code before modifying. Search for 3+ similar patterns before creating new ones
- **Evidence over assumption**: When claiming something exists/doesn't exist, show the grep/glob proof
- **Verify after change**: After modifying code, verify it compiles/lints — don't assume correctness

---

## Naming Conventions (MANDATORY)

- **Meaningful names only** — never `d`, `e`, `v`, `tmp`, `res`, `cb`, `fn`, `arr` (except `i`/`j` in simple loops)
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
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui, RTK Query, React Router v7 |
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
dotnet test                       # Run tests
```

## Key Utilities

- `clsxMerge` — `import { clsxMerge } from "@/shared/utils/clsxMerge"`
- Path alias: `@/` → `src/`

---

## Detailed Rules

Backend, frontend, security, dependency, and AI rules are in `.claude/rules/`.
Per-service domain context is in each service's `CLAUDE.md` (loaded automatically when working in that directory).
Code review standards are in `REVIEW.md` (used by `claude review`).
