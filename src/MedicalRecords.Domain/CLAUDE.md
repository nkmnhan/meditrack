# Medical Records — Domain Context

## Overview
Complex service with full DDD (eShop Ordering pattern): Domain + Infrastructure + API projects.
CQRS via MediatR. The only service with domain events and aggregate root invariants.

## Domain Glossary
| Term | Meaning |
|------|---------|
| **MedicalRecord** | Aggregate root. A clinical encounter record tied to a patient |
| **DiagnosisCode** | ICD-10 code (e.g., `J06.9` for URI) |
| **ChiefComplaint** | Patient's stated reason for visit |
| **ClinicalNote** | Child entity: typed notes (Progress, SOAP, Assessment, Plan, Procedure, Consultation, Discharge) |
| **Prescription** | Child entity: medication orders with lifecycle (Active → Filled → Completed/Cancelled/Expired) |
| **VitalSigns** | Child entity: BP, HR, Temp, RR, O2Sat, Weight, Height. BMI is computed |
| **Attachment** | Child entity: uploaded files (lab results, images) |

## Severity & Status Enums
- **DiagnosisSeverity**: Mild | Moderate | Severe | Critical
- **RecordStatus**: Active | RequiresFollowUp | Resolved | Archived
- **PrescriptionStatus**: Active | Filled | Completed | Cancelled | Expired
- **ClinicalNoteType**: Progress | SOAP | Assessment | Plan | Procedure | Consultation | Discharge

## Domain Events
- `MedicalRecordCreatedDomainEvent` — fired when new record created
- `PrescriptionAddedDomainEvent` — fired when prescription added

## Key Files
| Layer | File | Purpose |
|-------|------|---------|
| Domain | `Aggregates/MedicalRecord.cs` | Aggregate root with factory + child entity management |
| Domain | `SeedWork/Entity.cs`, `IAggregateRoot.cs` | Base classes |
| Infra | `Data/MedicalRecordsDbContext.cs` | EF Core |
| Infra | `Repositories/MedicalRecordRepository.cs` | Repository impl |
| API | `Application/Commands/MedicalRecordCommands.cs` | CQRS command definitions |
| API | `Application/Commands/MedicalRecordCommandHandlers.cs` | Command handlers |
| API | `Application/Queries/` | Query handlers |
| API | `Apis/MedicalRecordsApi.cs` | Thin REST endpoints |

## Inter-Service Links
- `PatientId` → Patient.API
- `RecordedByDoctorId` → Identity.API (denormalized: `RecordedByDoctorName`)
- `AppointmentId` → Appointment.API (optional, links to originating appointment)

## Port: 5004 | API Prefix: `/api/medicalrecords`
