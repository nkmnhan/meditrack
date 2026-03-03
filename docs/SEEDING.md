# MediTrack Test Data Generation

## Overview

MediTrack uses a **standalone Simulator service** (`MediTrack.Simulator`) to generate realistic test data across all 6 databases. The simulator references entity models and DbContexts from the original services, seeds data via **direct DB access**, and exits cleanly when done.

**Key advantages over the previous per-service HTTP approach:**
- Single process seeds all databases — no cross-service HTTP coupling
- Not compiled into production services
- Can run independently without all services being healthy
- Configurable via `appsettings.json` or environment variables

### What Gets Seeded

| Data Type | Default Count | Description |
|-----------|---------------|-------------|
| **Identity** | 2 users + roles | Admin + Doctor test users with login activity |
| **Patients** | 50 | Realistic demographics, addresses, insurance, emergency contacts |
| **Appointments** | 3 per patient (150) | Past + future appointments with status transitions |
| **Medical Records** | 3 per patient (150) | Diagnoses, notes, prescriptions, vital signs |
| **Audit Logs** | 15,000 | PHI access logs (hot + archived) + breach incidents |
| **Clara Sessions** | 2,500 | AI sessions with clinical suggestions |

All data uses **Bogus** library with a **deterministic seed (42)** for reproducible output. No "test" or "dummy" prefixes — data looks production-realistic.

---

## Quick Start

### 1. Aspire (automatic)

When running via Aspire AppHost, the simulator starts automatically after all services have finished their EF migrations:

```bash
dotnet run --project src/MediTrack.AppHost
# Simulator appears in Aspire dashboard → seeds data → shows "Finished" state
```

### 2. Direct (local dev)

Run the simulator directly when services are already running and databases exist:

```bash
dotnet run --project src/MediTrack.Simulator
```

### 3. Docker

Use the `seed` profile to run the simulator in Docker:

```bash
docker compose --profile seed up simulator
```

The simulator is in the `seed` profile so it does **not** auto-start with `docker compose up`.

---

## Configuration

All options are in `SimulatorOptions` and can be set via `appsettings.json` or environment variables:

```json
{
  "Simulator": {
    "ClearExisting": false,
    "PatientCount": 50,
    "AppointmentsPerPatient": 3,
    "MedicalRecordsPerPatient": 3,
    "AuditLogCount": 15000,
    "ClaraSessionCount": 2500
  }
}
```

**Environment variable overrides** (for Docker):
```bash
Simulator__ClearExisting=true
Simulator__PatientCount=100
Simulator__AuditLogCount=5000
```

---

## Execution Phases

The simulator runs seeders in dependency order:

| Phase | Seeder | Depends On |
|-------|--------|------------|
| **1** | Identity (users + roles + login activity) | None |
| **2** | Patients → returns seed results | Phase 1 |
| **3** (parallel) | Appointments, MedicalRecords, AuditLogs, ClaraSessions | Phase 2 (patient IDs) |

Phase 3 seeders run concurrently — they write to different databases.

---

## Generated Data Examples

### Patient Names
- **Male:** James Anderson, Michael Thompson, Robert Martinez
- **Female:** Mary Johnson, Jennifer Williams, Linda Garcia

### Addresses
```
123 Oak Street, Apt 4B
Springfield, IL 62701
```

### Medical Data
- **Blood Types:** A+, A-, B+, B-, AB+, AB-, O+, O-
- **Allergies:** Penicillin, Sulfa drugs, Latex, Peanuts, Shellfish
- **Insurance Providers:** Blue Cross Blue Shield, United Healthcare, Aetna, Cigna, Kaiser Permanente

### Age Distribution
| Range | Weight |
|-------|--------|
| 0-4 | 5% |
| 5-17 | 15% |
| 18-29 | 20% |
| 30-49 | 30% |
| 50-69 | 20% |
| 70-84 | 8% |
| 85+ | 2% |

---

## Business Rules Compliance

The seeder respects all business rules defined in `docs/business-logic.md`:

| Rule | Enforcement |
|------|-------------|
| **BR-P001** | Email uniqueness (deterministic seed + dedup check) |
| **BR-P002** | Date of birth in past |
| **BR-P003** | Valid phone format (###-###-####) |
| **BR-P004** | Minimum 1 day old |
| **BR-P006** | MRN auto-generation (handled by Patient entity) |
| **BR-P010** | Name character validation (Bogus generates valid names) |

---

## Production Safety

The simulator is a **separate project** (`MediTrack.Simulator`) that is not compiled into any production service.

- In **Docker**: only starts with `--profile seed` — never runs in production
- In **Aspire**: runs as a separate process visible in dashboard
- **No dev endpoints** remain in any production service

**Caution:** `ClearExisting=true` will delete data — use only in dev/test environments.

---

## Idempotent Behavior

- **Patients**: Skipped if email already exists (returns existing patient for downstream seeders)
- **Identity users**: Skipped if email already exists
- **Appointments, Records, Audit, Sessions**: Added on each run (use `ClearExisting=true` to reset)

---

## Troubleshooting

### Simulator fails to connect to database
- Ensure databases exist (services must have run their EF migrations first)
- In Aspire, the `.WaitFor()` calls handle this automatically
- For direct runs, start services first: `dotnet run --project src/MediTrack.AppHost`

### "Email already exists" for patients
- Expected on re-runs with deterministic seed — patients are skipped, downstream seeders still get their IDs
- Use `Simulator__ClearExisting=true` to start fresh

### Performance with large datasets
- Audit logs (15K) and Clara sessions (2.5K) use batch inserts for performance
- Full seeding takes ~30-60 seconds depending on hardware

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-03-03 | Migrated to standalone Simulator service (consolidated from 6 per-service seeders) |
| 1.0 | 2026-02-24 | Initial per-service seeder implementation with Bogus |
