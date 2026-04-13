---
applyTo: "**/*.csproj,**/package.json,Directory.Packages.props"
---

# Dependency Rules

## Selection Criteria

1. **Check license first** — prefer MIT, Apache 2.0, BSD, ISC, MPL 2.0
2. **If paid is the only option** — stop and discuss with the user before adding
3. **Never silently add commercially-licensed packages**
4. **Stable versions only** — never preview, alpha, beta, RC, or nightly builds

## Evaluation Checklist

Before adding any dependency:
- Is it actively maintained? (last commit < 6 months ago)
- Does it duplicate something already in the project?
- Is it the simplest tool for the job? (KISS/YAGNI)

## Approved Paid Dependencies

| Package               | License                     | Status |
|-----------------------|-----------------------------|--------|
| Duende IdentityServer | Commercial (free < $1M ARR) | In use |

## NuGet — Central Package Management

- **NEVER** put `Version` attribute on `<PackageReference>` in any `.csproj`
- **ALWAYS** declare the version in `Directory.Packages.props` only
- **NEVER** run `dotnet add package` — add manually to `Directory.Packages.props` first

```xml
<!-- Directory.Packages.props — declare version here -->
<PackageVersion Include="Newtonsoft.Json" Version="13.0.3" />

<!-- any .csproj — reference without version -->
<PackageReference Include="Newtonsoft.Json" />
```

> Exception: `src/Aspire.Nexus/` has CPM disabled — it's a standalone public tool with its own `Directory.Packages.props`.

## npm

- Pin exact versions in `package.json` for production dependencies when security is critical
- Run `npm audit` regularly; flag high/critical vulnerabilities before merging

## Database Runtime Gotchas

- **Npgsql JSONB** requires `EnableDynamicJson()` on `NpgsqlDataSourceBuilder` — without it, `Dictionary<string,string>` columns throw at runtime
- **pgvector type mapping** must be registered at BOTH levels: `NpgsqlDataSourceBuilder` (Npgsql) AND `UseVector()` (EF Core)
- **Extension method conflict**: `Pgvector` and `Pgvector.EntityFrameworkCore` both define `UseVector()` — isolate `NpgsqlDataSourceBuilder` calls in files that only import `using Pgvector;`
- **Docker**: every service needs `IdentityUrl` in `docker-compose` — even Identity.API itself (it validates its own JWT tokens via OIDC discovery)
