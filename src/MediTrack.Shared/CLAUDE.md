# MediTrack.Shared — Cross-Service Constants and PHI Audit Service

## Overview
Shared library referenced by all backend services. Contains HIPAA audit infrastructure, role constants, integration event definitions, and pagination helpers. Nothing in this project is service-specific.

## Domain Glossary
| Term | Meaning |
|------|---------|
| **IPHIAuditService** | HIPAA audit publisher — **the only valid way** to log PHI access across services |
| **AuditActions** | Constants: `Create`, `Read`, `Update`, `Delete`, `Deactivate`, `Search`, `Export`, `AIContextAccess`, … |
| **AuditResourceTypes** | Constants: `Patient`, `MedicalRecord`, `Appointment`, `ClinicalSession`, … |
| **AuditSeverity** | `Low`, `Medium`, `High`, `Critical` |
| **UserRoles** | `Admin`, `Doctor`, `Nurse`, `Patient`, `Receptionist` |
| **JwtClaims** | Claim type constants: `UserId`, `Role`, `ProviderId` |
| **PagedResult\<T\>** | Shared pagination DTO: `Items`, `TotalCount`, `Page`, `PageSize` |

## Key Files
| File | Purpose |
|------|---------|
| `Common/AuditConstants.cs` | All audit action/resource/severity/breach/claim constants |
| `Common/UserRoles.cs` | Role names + JWT claim type names |
| `Common/PagedResult.cs` | Shared pagination DTO |
| `Common/PatientAuditFields.cs` | Field names for PHI audit payloads |
| `Services/PHIAuditService.cs` | `IPHIAuditService` + implementation — publishes `PHIAuditEvent` via `IEventBus` |
| `Events/PHIAuditIntegrationEvents.cs` | `PHIAuditEvent` record |
| `Events/PatientIntegrationEvents.cs` | `PatientRegisteredEvent`, `PatientDeactivatedEvent` |
| `Events/AppointmentIntegrationEvents.cs` | `AppointmentCreatedEvent`, `AppointmentStatusChangedEvent` |
| `Events/MedicalRecordIntegrationEvents.cs` | `MedicalRecordCreatedEvent` |
| `Extensions/ServiceCollectionExtensions.cs` | `AddPHIAuditService()` DI registration |

## PHI Audit Rule
**NEVER** log PHI directly. Always go through `IPHIAuditService.LogAccessAsync(...)`. Every endpoint that reads patient data MUST call it.
