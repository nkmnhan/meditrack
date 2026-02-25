# Plan: Replace SQL Server with PostgreSQL

## Status: Complete

## Motivation

- **SQL Server** requires a commercial license for production (Developer/Express editions have limitations)
- **PostgreSQL** is fully open-source (PostgreSQL License — permissive, free for all use)
- The upcoming **Emergen AI** feature needs **pgvector** (PostgreSQL extension) for vector similarity search — running PostgreSQL already eliminates the need for a separate vector database
- One database engine across the entire stack simplifies infrastructure and Docker Compose

## What Changed

### NuGet Packages

**In `Directory.Packages.props`:**
- Removed: `Microsoft.EntityFrameworkCore.SqlServer`
- Added: `Npgsql.EntityFrameworkCore.PostgreSQL` (stable)
- Added: `Pgvector` + `Pgvector.EntityFrameworkCore` (for future Emergen AI)

**In each `.csproj`:**
- `<PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" />` → `<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" />`

### DbContext Configuration

Every `Program.cs` changed from `UseSqlServer` to `UseNpgsql`:

```csharp
// Before
options.UseSqlServer(connectionString);

// After
options.UseNpgsql(connectionString);
```

### Database Creation — EF Core Handles Everything

Each service creates its own database and schema on startup automatically. No init scripts needed:

```csharp
// EF Core creates the database if it doesn't exist, then creates the schema
using (IServiceScope scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<MyDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
}
```

- 4 services use `EnsureCreatedAsync()` — creates DB + schema from the model snapshot
- Notification.Worker uses `MigrateAsync()` — creates DB + applies EF migrations

**No Docker entrypoint scripts or SQL init files required.** Starting from a fresh PostgreSQL container, each service handles its own database.

### Connection Strings

```json
// Before (SQL Server)
"Server=sqlserver;Database=MediTrack.Patients;User Id=sa;Password=...;TrustServerCertificate=true"

// After (PostgreSQL)
"Host=postgres;Database=meditrack_patients;Username=meditrack;Password=...;"
```

### Docker Compose

Replaced `sqlserver` service with `postgres`:

```yaml
postgres:
  image: pgvector/pgvector:pg17
  environment:
    POSTGRES_USER: ${POSTGRES_USER:-meditrack}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_DB: meditrack
  ports:
    - "5432:5432"
  volumes:
    - postgres-data:/var/lib/postgresql/data
```

Using `pgvector/pgvector:pg17` image (PostgreSQL 17 with pgvector pre-installed) so the extension is available when Emergen AI needs it.

### Environment Variables

```env
# Before
SA_PASSWORD=YourStrong@Password

# After
POSTGRES_USER=meditrack
POSTGRES_PASSWORD=YourStrong@Password
```

### Migrations

All existing SQL Server migrations were deleted and regenerated for PostgreSQL:

```bash
dotnet ef migrations add InitialPostgres --project src/<Service>
```

PostgreSQL-native types are used: `uuid`, `boolean`, `timestamp with time zone`, `text`, `character varying(N)`.

### Removed

- `sql/` folder — no SQL scripts needed; EF Core handles database creation
- `docker/postgres-init.sh` — no Docker entrypoint scripts needed
- SQL Server TDE (`setup-tde.sql`) — not applicable to PostgreSQL; use filesystem or cloud-managed encryption at rest instead

## Files Changed

| File | Change |
|------|--------|
| `Directory.Packages.props` | SqlServer → Npgsql + pgvector packages |
| `docker-compose.yml` | sqlserver → postgres service |
| `docker-compose.override.yml` | Updated connection strings |
| `.env.example` | `SA_PASSWORD` → `POSTGRES_USER` / `POSTGRES_PASSWORD` |
| `src/*/Program.cs` (all services) | `UseSqlServer` → `UseNpgsql`, removed `IsDevelopment()` guard on DB creation |
| `src/*/.csproj` (all services) | SqlServer → Npgsql package reference |
| `src/*/appsettings*.json` (all services) | PostgreSQL connection strings |
| `src/*/Migrations/` (all services) | Regenerated for PostgreSQL |

## Risks

- **Data loss**: This is a dev project with seeded data — no production data to migrate
- **EF Core provider differences**: Minor behavioral differences between SqlServer and Npgsql providers (e.g., default string lengths, case sensitivity). Test all queries after migration.
- **Identity tables**: `Microsoft.AspNetCore.Identity.EntityFrameworkCore` works with both providers, but schema generation differs slightly

## Benefits After Migration

- Fully open-source database stack (no licensing concerns)
- Native pgvector support for the Emergen AI feature
- Simpler Docker Compose (PostgreSQL image is smaller and faster to start)
- No init scripts — each service is self-contained and creates its own database
