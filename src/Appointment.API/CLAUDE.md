# Appointment Service — Domain Context

## Overview
Simple CRUD service (eShop Catalog pattern) — single project, no separate Domain layer.

## Domain Glossary
| Term | Meaning |
|------|---------|
| **Appointment** | A scheduled encounter between a Provider (doctor) and a Patient |
| **Provider** | The doctor/clinician. Identified by `ProviderId` (Guid from Identity.API) |
| **Patient** | The person receiving care. Identified by `PatientId` (Guid from Patient.API) |
| **ScheduledDateTime** | When the appointment occurs |
| **DurationMinutes** | Length of appointment (default varies by type) |
| **Reason** | Chief complaint — why the patient is visiting |
| **TelehealthLink** | Video call URL for virtual appointments |
| **Rescheduled** | When an appointment is moved to a new time, a new appointment is created with `RescheduledFromId` linking to the original |

## Status Lifecycle (8 states)
```
Scheduled → Confirmed → CheckedIn → InProgress → Completed
     ↓          ↓           ↓            ↓
  Cancelled  Cancelled   Cancelled    Cancelled
     ↓
  NoShow
     ↓
Rescheduled (creates new appointment with RescheduledFromId)
```
Status tokens in UI: `status-scheduled`, `status-confirmed`, `status-completed`, etc.

## Appointment Types (10)
`Consultation` | `FollowUp` | `AnnualPhysical` | `UrgentCare` | `Specialist` | `LabWork` | `Imaging` | `Vaccination` | `Telehealth` | `Procedure`

## Key Files
| File | Purpose |
|------|---------|
| `Models/Appointment.cs` | Aggregate root with state machine methods (`Confirm()`, `CheckIn()`, `Start()`, `Complete()`, `Cancel()`, `Reschedule()`) |
| `Apis/AppointmentsApi.cs` | REST endpoints (thin → service) |
| `Apis/AdminAnalyticsApi.cs` | Dashboard analytics endpoints |
| `Services/AppointmentService.cs` | Business logic |
| `Services/AppointmentAnalyticsService.cs` | Reporting queries |
| `Validators/AppointmentValidators.cs` | FluentValidation rules |
| `Infrastructure/AppointmentDbContext.cs` | EF Core + PostgreSQL |
| `Mapping/AppointmentMappingProfile.cs` | AutoMapper DTOs ↔ Entity |

## Inter-Service Links
- `PatientId` → Patient.API (denormalized: `PatientName`, `PatientEmail` stored locally)
- `ProviderId` → Identity.API (denormalized: `ProviderName` stored locally)
- `AppointmentId` ← MedicalRecords.API (a record can reference which appointment it came from)

## Port: 5005 → 5003 (mapped in docker-compose)

## API Prefix: `/api/appointments`
