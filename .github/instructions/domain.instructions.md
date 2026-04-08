---
applyTo: "src/**,design/**,docs/**"
---

# Business Domain — MediTrack

## Service Ownership

| Service     | Owns                                  | Referenced by others via...                  |
|-------------|---------------------------------------|----------------------------------------------|
| identity    | Users, roles                          | `UserId`, `ProviderId`                       |
| patient     | Patient records                       | `PatientId` (Guid)                           |
| appointment | Appointment lifecycle (8 states)      | `AppointmentId` (optional in MedicalRecords) |
| records     | Medical records (DDD aggregates)      | `PatientId` + optional `AppointmentId`       |
| clara       | Clinical AI context                   | `PatientId`                                  |

## Inter-Service Data Rules

- **Patient.API owns patient data** — all other services reference by `PatientId` (Guid)
- **Cross-service data is denormalized** — e.g., Appointment stores `PatientName`, `PatientEmail` directly to minimize runtime calls
- **Never call another service synchronously** during a write operation — use integration events via RabbitMQ
- **Integration events use the outbox pattern** (`IntegrationEventLogEF`) for guaranteed delivery

## Domain Invariants (NEVER violate)

- **Patient records are soft-deleted** — use `IsActive = false`, never `DELETE` from the database
- **MRN format**: `MRN-YYYYMMDD-XXXX` — auto-generated, never manually set
- **Appointment has an 8-state lifecycle** — see `src/Appointment.API/CLAUDE.md` for valid transitions
- **MedicalRecords is the ONLY service** with domain events and aggregate root invariants (DDD)
- **PHI (patient names, DOB, diagnoses) must never appear in log statements** — audit only via `IPHIAuditService`

## Architecture Patterns by Service

| Service     | Pattern                              | Notes                                                    |
|-------------|--------------------------------------|----------------------------------------------------------|
| identity    | Duende IdentityServer                | Auth only — no business logic                            |
| patient     | Simple CRUD (eShop Catalog style)    | Single project, folder-based layers                      |
| appointment | Simple CRUD (eShop Catalog style)    | Single project, 8-state workflow                         |
| records     | Full DDD + CQRS (eShop Ordering)     | 3 projects: Domain / Infrastructure / API                |
| clara       | MCP + SignalR + ReAct agent          | MCP-native, LLM-agnostic, PHI audit mandatory            |

## Per-Service Context Files

Each service has a `CLAUDE.md` with domain-specific glossary, entity shapes, and validation rules:
- `src/Clara.API/CLAUDE.md`
- `src/Patient.API/CLAUDE.md`
- `src/Appointment.API/CLAUDE.md`
- `src/MedicalRecords.API/CLAUDE.md`

Always read the service's `CLAUDE.md` before modifying that service.
