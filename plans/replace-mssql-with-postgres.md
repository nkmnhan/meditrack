# Plan: Replace SQL Server with PostgreSQL

## Motivation

- **SQL Server** requires a commercial license for production (Developer/Express editions have limitations)
- **PostgreSQL** is fully open-source (PostgreSQL License — permissive, free for all use)
- The upcoming **Emergen AI** feature needs **pgvector** (PostgreSQL extension) for vector similarity search — running PostgreSQL already eliminates the need for a separate vector database
- One database engine across the entire stack simplifies infrastructure and Docker Compose

## Current State

| Service | Database | ORM Provider |
|---------|----------|-------------|
| Identity.API | SQL Server (`MediTrack.Identity`) | EF Core + `Microsoft.EntityFrameworkCore.SqlServer` |
| Patient.API | SQL Server (`MediTrack.Patients`) | EF Core + `Microsoft.EntityFrameworkCore.SqlServer` |
| Appointment.API | SQL Server (`MediTrack.Appointments`) | EF Core + `Microsoft.EntityFrameworkCore.SqlServer` |
| MedicalRecords.API | SQL Server (`MediTrack.Records`) | EF Core + `Microsoft.EntityFrameworkCore.SqlServer` |
| Notification.Worker | SQL Server (`MediTrack.Audit`) | EF Core + `Microsoft.EntityFrameworkCore.SqlServer` |
| IntegrationEventLogEF | SQL Server (`MediTrack.Events`) | EF Core + `Microsoft.EntityFrameworkCore.SqlServer` |

## Target State

All services use **PostgreSQL** via `Npgsql.EntityFrameworkCore.PostgreSQL` (free, open-source, BSD-2-Clause license).

AI Agent Service additionally uses **pgvector** via `pgvector-dotnet` (free, MIT license).

## Migration Steps

### 1. Update NuGet Packages

**In `Directory.Packages.props`:**
- Remove: `Microsoft.EntityFrameworkCore.SqlServer`
- Add: `Npgsql.EntityFrameworkCore.PostgreSQL` (latest stable)
- Add: `Npgsql.EntityFrameworkCore.PostgreSQL.Design` (if needed for tooling)

**In each `.csproj`:**
- Replace `<PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" />` with `<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" />`

### 2. Update DbContext Configuration

In every `Program.cs` or DI extension, change:

```csharp
// Before
options.UseSqlServer(connectionString);

// After
options.UseNpgsql(connectionString);
```

### 3. Update Connection Strings

**In `appsettings.json` / `appsettings.Development.json`:**

```json
// Before
"ConnectionStrings": {
  "DefaultConnection": "Server=sqlserver;Database=MediTrack.Patients;User Id=sa;Password=...;TrustServerCertificate=true"
}

// After
"ConnectionStrings": {
  "DefaultConnection": "Host=postgres;Database=meditrack_patients;Username=meditrack;Password=...;"
}
```

### 4. Update Docker Compose

Replace the `sqlserver` service with `postgres`:

```yaml
# Before
sqlserver:
  image: mcr.microsoft.com/mssql/server:2022-latest
  environment:
    ACCEPT_EULA: "Y"
    SA_PASSWORD: "${SA_PASSWORD}"
  ports:
    - "1433:1433"

# After
postgres:
  image: postgres:17
  environment:
    POSTGRES_USER: meditrack
    POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"
    POSTGRES_DB: meditrack
  ports:
    - "5432:5432"
  volumes:
    - postgres-data:/var/lib/postgresql/data
    - ./sql/init-databases.sql:/docker-entrypoint-initdb.d/init.sql
```

Update all service `depends_on` from `sqlserver` to `postgres`.

### 5. Create Database Initialization Script

Create `sql/init-databases.sql` to create per-service databases:

```sql
CREATE DATABASE meditrack_identity;
CREATE DATABASE meditrack_patients;
CREATE DATABASE meditrack_appointments;
CREATE DATABASE meditrack_records;
CREATE DATABASE meditrack_audit;
CREATE DATABASE meditrack_events;
```

### 6. Handle SQL Server-Specific Code

Search for and replace:
- `NVARCHAR` → `VARCHAR` or `TEXT` (PostgreSQL uses `TEXT` natively)
- `GETDATE()` / `GETUTCDATE()` → `NOW()` / `CURRENT_TIMESTAMP`
- `IDENTITY` columns → PostgreSQL uses `SERIAL` / `GENERATED ALWAYS AS IDENTITY`
- `[dbo].` schema prefixes → remove or use `public.`
- String comparison collation differences
- `NEWSEQUENTIALID()` → `gen_random_uuid()`
- `BIT` type → `BOOLEAN`

Note: EF Core handles most of these automatically when switching providers. Manual SQL in migration files or raw queries needs manual review.

### 7. Recreate All Migrations

```bash
# Delete all existing migration files
# Then regenerate for each service:
dotnet ef migrations add InitialPostgres --project src/Patient.API
dotnet ef migrations add InitialPostgres --project src/Appointment.API
dotnet ef migrations add InitialPostgres --project src/MedicalRecords.Infrastructure
dotnet ef migrations add InitialPostgres --project src/Identity.API
dotnet ef migrations add InitialPostgres --project src/Notification.Worker
```

### 8. Update TDE Documentation

SQL Server TDE (`sql/setup-tde.sql`) is no longer applicable. PostgreSQL equivalent:
- Use `pgcrypto` extension for column-level encryption
- Use filesystem encryption or cloud-managed encryption for at-rest encryption
- Update `docs/tde-configuration.md` accordingly

### 9. Update `.env.example`

```env
# Before
SA_PASSWORD=YourStrong@Password

# After
POSTGRES_PASSWORD=YourStrong@Password
POSTGRES_USER=meditrack
```

### 10. Update Health Checks

In `MediTrack.ServiceDefaults`, update health check registration if it references SQL Server-specific health check packages.

## Files Affected

| File | Change |
|------|--------|
| `Directory.Packages.props` | Swap SqlServer → Npgsql packages |
| `docker-compose.yml` | Replace sqlserver service with postgres |
| `docker-compose.override.yml` | Update connection strings |
| `.env.example` | Update env vars |
| `src/*/Program.cs` (all services) | `UseSqlServer` → `UseNpgsql` |
| `src/*/appsettings*.json` (all services) | Update connection strings |
| `src/*/Migrations/` (all services) | Delete and regenerate |
| `sql/setup-tde.sql` | Remove or replace |
| `sql/setup-audit-user.sql` | Rewrite for PostgreSQL |
| `docs/tde-configuration.md` | Update for PostgreSQL |

## Risks

- **Data loss**: This is a dev project with seeded data — no production data to migrate
- **EF Core provider differences**: Minor behavioral differences between SqlServer and Npgsql providers (e.g., default string lengths, case sensitivity). Test all queries after migration.
- **Identity tables**: `Microsoft.AspNetCore.Identity.EntityFrameworkCore` works with both providers, but schema generation differs slightly

## Benefits After Migration

- Fully open-source database stack (no licensing concerns)
- Native pgvector support for the AI Secretary feature
- Simpler Docker Compose (PostgreSQL image is smaller and faster to start)
- Better alignment with the Medical AI architecture design
