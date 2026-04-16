# MedicalRecords.Infrastructure — EF Core Persistence

## Overview
EF Core persistence layer for the medical records domain. Implements the repository interfaces defined in `MedicalRecords.Domain`. Domain logic never touches this project directly.

## Key Files
| File | Purpose |
|------|---------|
| `MedicalRecordsDbContext.cs` | EF Core DbContext — `MedicalRecords` table, `SaveEntitiesAsync` |
| `MedicalRecordsDbContextFactory.cs` | Design-time factory for EF migrations |
| `Repositories/MedicalRecordRepository.cs` | `IMedicalRecordRepository` implementation — CRUD + filtering queries |
| `EntityConfigurations/` | `IEntityTypeConfiguration<T>` per entity/value object (JSON columns for collections) |
| `Migrations/` | EF Core migration history — single `InitialCreate` migration |

## Known Gap
`MedicalRecordsDbContext.SaveEntitiesAsync` (line 31) has a known TODO: domain events raised by aggregate roots are **not dispatched yet**. Events are raised but never published to the event bus. This is a documented limitation — see `MedicalRecords.Domain` aggregate roots.

## Value Object Storage
Collections (VitalSigns, Prescriptions, Attachments, DiagnosisCodes) are stored as **JSON columns** via `EntityConfigurations`. They are not separate tables.
