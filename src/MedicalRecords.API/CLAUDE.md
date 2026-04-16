# MedicalRecords.API — HTTP Adapter for Medical Records

## Overview
Thin API layer over the DDD domain. No business logic lives here — commands and queries are dispatched via MediatR to handlers in the Application layer. Port 5004.

## Key Files
| File | Purpose |
|------|---------|
| `Apis/MedicalRecordsApi.cs` | Minimal API endpoint registrations — maps routes to MediatR dispatches |
| `Application/Commands/MedicalRecordCommands.cs` | Command records: `CreateMedicalRecord`, `UpdateMedicalRecord`, `ChangeStatus`, `AddAttachment`, `AddPrescription`, `AddVitalSigns` |
| `Application/Commands/MedicalRecordCommandHandlers.cs` | MediatR handlers — load aggregate → call domain method → persist |
| `Application/Queries/MedicalRecordQueries.cs` | Query records: `GetRecordById`, `GetRecordsByPatient`, `GetRecordsByAppointment` |
| `Application/Queries/MedicalRecordQueryHandlers.cs` | MediatR handlers — query repository → map to DTO |
| `Application/Models/` | Response DTOs (separate from domain entities) |
| `Application/Mapping/` | AutoMapper profiles: domain → DTOs |
| `Application/Validations/` | FluentValidation validators for each command |
| `Application/Services/` | Supporting services (e.g., IDOR checks, audit helpers) |

## Request Flow
```
HTTP → MedicalRecordsApi.cs → MediatR.Send(Command/Query)
  → CommandHandler / QueryHandler
    → IMedicalRecordRepository (via MedicalRecords.Infrastructure)
      → MedicalRecord aggregate (via MedicalRecords.Domain)
```

## Port: 5004 | API Prefix: `/api/medicalrecords`

## Inter-Service Links
- Reads patient context via Patient.API (`PatientId` only — no cross-service join)
- Optional `AppointmentId` FK to Appointment.API
- Publishes `MedicalRecordCreatedEvent` via `IEventBus` → Notification.Worker
- PHI access logged via `IPHIAuditService` → RabbitMQ → Notification.Worker
