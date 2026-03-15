# Patient Service — Domain Context

## Overview
Patient management service. Currently simple CRUD pattern (single project). Houses patient demographics, contact info, medical basics, emergency contacts, and insurance.

## Domain Glossary
| Term | Meaning |
|------|---------|
| **Patient** | A person receiving medical care. Links to `ApplicationUser` via `UserId` |
| **MRN** | Medical Record Number — auto-generated: `MRN-YYYYMMDD-XXXX` |
| **Address** | Value object: Street, Street2, City, State, ZipCode, Country |
| **EmergencyContact** | Value object: Name, Relationship, PhoneNumber, Email |
| **Insurance** | Value object: Provider, PolicyNumber, GroupNumber, PlanName, EffectiveDate, ExpirationDate |
| **BloodType** | Patient's blood type (string, nullable) |
| **IsActive** | Soft delete flag — patients are deactivated, never hard-deleted |

## Key Files
| File | Purpose |
|------|---------|
| `Models/Patient.cs` | Aggregate root with value objects (Address, EmergencyContact, Insurance) |
| `Apis/PatientsApi.cs` | REST endpoints |
| `Apis/AdminAnalyticsApi.cs` | Dashboard analytics |
| `Infrastructure/PatientDbContext.cs` | EF Core + PostgreSQL |
| `Mapping/PatientMappingProfile.cs` | AutoMapper |

## Inter-Service Links
- `UserId` → Identity.API (`ApplicationUser`)
- `PatientId` ← Appointment.API, MedicalRecords.API, Clara.API (all reference patients by Guid)
- Patient data is **denormalized** into other services (`PatientName`, `PatientEmail`) to minimize cross-service calls

## Port: 5002 | API Prefix: `/api/patients`
