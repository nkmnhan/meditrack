# MediTrack.Simulator — Test Data Seeder

## Overview
Console app that populates a dev/test environment with realistic clinical data by calling live service HTTP APIs in dependency order. Run after `docker-compose up` + all services healthy.

## Seeder Execution Order
```
IdentitySeeder → PatientSeeder → AppointmentSeeder
                                → MedicalRecordSeeder
                                → SessionSeeder → AuditSeeder
```
Each seeder depends on the IDs created by previous seeders. `SimulatorOrchestrator.cs` coordinates the chain.

## Key Files
| File | Purpose |
|------|---------|
| `Program.cs` | Entry point — configures HTTP clients, runs `SimulatorOrchestrator` |
| `SimulatorOrchestrator.cs` | Runs seeders in order, passes results between stages |
| `Seeders/IdentitySeeder.cs` | Creates admin + doctor + nurse + receptionist + patient users via Identity.API |
| `Seeders/PatientSeeder.cs` | Creates patient demographics records via Patient.API — returns `PatientSeedResult` |
| `Seeders/AppointmentSeeder.cs` | Creates past + future appointments via Appointment.API |
| `Seeders/MedicalRecordSeeder.cs` | Creates clinical records via MedicalRecords.API |
| `Seeders/SessionSeeder.cs` | Creates Clara AI sessions + transcript lines via Clara.API |
| `Seeders/AuditSeeder.cs` | Generates audit log entries via Clara.API audit endpoint |
| `Configuration/` | Typed config for each service's base URL |

## Run Command
```bash
dotnet run --project src/MediTrack.Simulator
```
Requires all services running and healthy (start via `dotnet run --project src/Aspire.Nexus`).
