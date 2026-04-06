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
npm run build && npm run lint     # Frontend verify
dotnet build && dotnet test       # Backend verify
```

## Key Utilities

- `clsxMerge` — `import { clsxMerge } from "@/shared/utils/clsxMerge"`
- Path alias: `@/` → `src/`

## Detailed Rules

Backend, frontend, business, and workflow rules are in `.claude/rules/` (loaded automatically by path scope).
Per-service domain context is in each service's `CLAUDE.md`.
Code review standards are in `REVIEW.md`.

---

## CRITICAL — verify before every change

1. **NEVER** hardcode secrets, log PHI, or skip `[Authorize]` on endpoints
2. **NEVER** use manual `React.memo`/`useCallback`/`useMemo` — React Compiler handles it
3. **ALWAYS** read existing code before modifying — evidence over assumption
