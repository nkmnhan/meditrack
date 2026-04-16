---
paths:
  - "**/*.csproj"
  - "**/package.json"
  - "Directory.Packages.props"
  - "src/**/Infrastructure/**"
  - "src/**/Data/**"
---

<!-- maintainer: paths: ["**/*.csproj", "**/package.json", "Directory.Packages.props"]
     Loads when editing package/dependency files. NuGet CPM, npm audit, license rules.
     Keep under 50 lines. -->

# Data & Dependencies

## NuGet — Central Package Management (MANDATORY)

- **NEVER** put `Version` on `<PackageReference>` in any .csproj
- **ALWAYS** declare in `Directory.Packages.props` first, then reference version-free
- **NEVER** run `dotnet add package` (denied in settings.json)
- Prefer `<FrameworkReference>` for ASP.NET Core shared framework packages

```xml
<!-- BAD — version inside csproj -->
<PackageReference Include="Newtonsoft.Json" Version="13.0.3" />

<!-- GOOD — version only in Directory.Packages.props -->
<PackageReference Include="Newtonsoft.Json" />
```

**Note**: Aspire.Nexus has CPM disabled intentionally — standalone public tool.

## Dependency Selection

1. **Check license first** — prefer MIT, Apache 2.0, BSD, ISC, MPL 2.0
2. **If paid is the only option** — stop and discuss with user before adding
3. **NEVER silently add commercially-licensed packages**
4. **Stable versions only** — NEVER preview, alpha, beta, RC, nightly

## Evaluation

- Actively maintained? (last commit < 6 months)
- Does it duplicate something already in the project?
- Is it the simplest tool for the job? (KISS/YAGNI)

## Approved Paid Dependencies

| Package | License | Status |
|---------|---------|--------|
| Duende IdentityServer | Commercial (free < $1M) | In use |

## Database

- PostgreSQL 17 with pgvector extension (for Clara RAG)
- EF Core for ORM — NEVER use `FromSqlRaw` with string concatenation
- Migrations managed per-service DbContext
- **Npgsql JSONB** requires `EnableDynamicJson()` on `NpgsqlDataSourceBuilder` — without it, `Dictionary<string,string>` columns throw at runtime
- **Pgvector type mapping** must be registered at BOTH levels: `NpgsqlDataSourceBuilder` (Npgsql) AND `UseVector()` (EF Core)
- **Extension method conflict**: `Pgvector` and `Pgvector.EntityFrameworkCore` both define `UseVector()` — isolate `NpgsqlDataSourceBuilder` calls in files that only import `using Pgvector;`

## Docker

- **Every service** needs `IdentityUrl` in docker-compose — even Identity.API itself (it validates its own JWT tokens via OIDC discovery)
- Default dev password: see `docker-compose.override.yml` `POSTGRES_PASSWORD` default
