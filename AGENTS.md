# AGENTS.md — MediTrack

This file describes the MediTrack codebase to AI coding agents (GitHub Copilot, Cursor, OpenAI Codex, Google Jules, and others).

---

## Project Overview

MediTrack is a **healthcare microservices platform** for patient management, appointment scheduling,
medical records, and AI-assisted clinical workflows.

**Tech Stack**: .NET 10 backend · React 19 frontend · PostgreSQL · RabbitMQ · Aspire orchestration

---

## Repository Structure

```
src/
├── Identity.API/             # Duende IdentityServer — authentication (port 5001)
├── Patient.API/              # Patient CRUD service (port 5002)
├── Appointment.API/          # Appointment CRUD service (port 5003)
├── MedicalRecords.Domain/    # DDD domain layer (aggregates, value objects, events)
├── MedicalRecords.Infrastructure/ # EF Core, repositories
├── MedicalRecords.API/       # CQRS API — MediatR commands/queries (port 5004)
├── Clara.API/                # AI clinical companion — MCP + SignalR (port 5005)
├── MediTrack.Web/            # React 19 SPA (port 3000)
├── MediTrack.ServiceDefaults/ # Shared: health checks, OpenTelemetry, resilience
├── EventBus/                 # RabbitMQ event bus interfaces
├── EventBusRabbitMQ/         # RabbitMQ implementation
├── IntegrationEventLogEF/    # Outbox pattern for reliable event publishing
├── Notification.Worker/      # Background notification worker
├── MediTrack.Simulator/      # Test data seeder
└── Aspire.Nexus/             # Public orchestrator dashboard tool
design/                       # Git submodule — Lovable design system (React)
skills/core/                  # Clara clinical skill YAML files
tests/                        # Integration test projects
```

---

## Build & Test Commands

```bash
# Infrastructure
docker-compose up -d                                              # PostgreSQL + RabbitMQ

# Backend
dotnet build                                                      # build all
dotnet test                                                       # all tests
dotnet test --filter "FullyQualifiedName~UnitTests"               # unit only (no Docker)
dotnet test --filter "FullyQualifiedName~IntegrationTests"        # integration (needs Docker)

# Frontend (run from src/MediTrack.Web/)
npm run dev                                                       # dev server
npm run build                                                     # production build
npm run lint                                                      # ESLint
npm test                                                          # frontend tests
```

---

## Core Conventions

### Naming (mandatory — zero tolerance for violations)
- No abbreviations: never `d`, `e`, `v`, `tmp`, `res`, `cb`, `fn`, `arr`
- Booleans: `is`, `has`, `can`, `should` prefix
- Event handlers: `on`/`handle` prefix
- Async methods: verb prefix (`fetchPatient`, `saveAppointment`)
- React components: PascalCase, noun-first (`PatientCard`)
- React hooks: `use` prefix (`usePatientList`)

### Backend (.NET 10)
- Clean Architecture: API → Infrastructure → Domain (dependencies point inward)
- Thin controllers: `_mediator.Send(command)` → return response. No business logic.
- Every endpoint: `[Authorize]` with specific role/policy — never unauthenticated
- NuGet Central Package Management: `Version` only in `Directory.Packages.props`, never in `.csproj`
- FluentValidation via `ValidatorBehavior` in MediatR pipeline
- AutoMapper for DTO ↔ Domain (never manual mapping)
- Integration events via outbox pattern (`IntegrationEventLogEF`)

### Frontend (React 19 + TypeScript)
- RTK Query for server state — never `useEffect` + `useState` for API calls
- React Compiler handles memoization — no `useMemo`, `useCallback`, `React.memo`
- Semantic color tokens only: `bg-card`, `text-foreground`, `border-border`
- Never: `bg-white`, `text-neutral-*`, raw hex, or `dark:` on color scales
- `clsxMerge` only (never alias as `cn`)
- Strict TypeScript — no `any`
- Shared components must be synced between `src/MediTrack.Web/` and `design/`

### Security
- PHI audit: every Clara MCP tool touching patient data → `IPHIAuditService.AuditAsync()`
- Never log PHI, secrets, or tokens in application logs
- Parameterized queries only (EF Core LINQ) — never `FromSqlRaw` + string concat
- Resource ownership checked (IDOR prevention) on every patient data endpoint

---

## AI Agents

Specialized agents are defined in `.github/agents/`. Use the right agent for the task:

| Agent             | When to Use                                                             |
|-------------------|-------------------------------------------------------------------------|
| `tech-lead`       | Planning multi-step features, architectural trade-offs, task breakdown  |
| `system-architect`| Service boundary design, data modeling, scalability review              |
| `senior-developer`| Implementing features, TDD, refactoring, bug fixes                      |
| `code-reviewer`   | Post-change review, PR review, security audit                           |
| `devils-advocate` | Before committing to a plan, stress-testing designs, finding blind spots |

---

## Healthcare Context

This is a **healthcare application**. Patient safety and PHI protection are non-negotiable.

- PHI (Protected Health Information) is present in patient, appointment, and medical record data
- All access to patient data must be audit-logged
- Clinical accuracy matters — a silent failure can mean a clinician sees wrong or stale data
- Availability requirements: clinicians need access to critical patient info even during partial outages
