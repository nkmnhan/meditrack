---
paths:
  - "src/**"
  - "design/**"
  - "docs/**"
---

<!-- maintainer: paths: ["src/**"] — loads when editing any src/ file.
     Service map, inter-service links, domain rules. Single source of truth for domain facts.
     Keep under 50 lines. -->

# Business Domain

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

## Inter-Service Links

- Patient.API owns patient data — all services reference by `PatientId` (Guid)
- Identity.API owns users/roles — referenced by `UserId`, `ProviderId`
- Appointment → Patient (denormalized: `PatientName`, `PatientEmail`)
- MedicalRecords → Patient + Appointment (optional `AppointmentId`)
- Clara → Patient (clinical context via `PatientId`)
- Cross-service data is **denormalized** to minimize runtime calls

## Domain Rules

- Patient records are **soft-deleted** (`IsActive` flag), NEVER hard-deleted
- MRN format: `MRN-YYYYMMDD-XXXX` (auto-generated)
- Appointment has 8-state lifecycle (see `src/Appointment.API/CLAUDE.md`)
- MedicalRecords is the ONLY service with domain events and aggregate root invariants
- Per-service domain glossaries are in each service's `CLAUDE.md`
