---
paths:
  - "src/**/*.cs"
  - "src/**/*.csproj"
---

# Backend Rules

> Principles (SOLID, DRY, KISS, YAGNI, Fail Fast, Least Privilege) are in root CLAUDE.md — always loaded.

## Clean Architecture (eShop Pattern)

Dependencies point **inward**: API → Infrastructure → Domain

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Domain** | `<Service>.Domain/` (separate project, zero refs) | Aggregates, Value Objects, Domain Events, Repository Interfaces, SeedWork |
| **Infrastructure** | `<Service>.Infrastructure/` (refs Domain only) | DbContext, Entity Configs, Repository Implementations |
| **Application** | `<Service>.API/Application/` (folder inside API) | Commands/, Queries/, Behaviors/, Validations/, Models/, DomainEventHandlers/ |
| **API** | `<Service>.API/` (refs Domain + Infrastructure) | Thin endpoints → MediatR → response. Composition root |

**Simple services** (Appointment, Identity): single API project with folders (eShop Catalog pattern).
**Complex services** (MedicalRecords): 3 projects with full DDD (eShop Ordering pattern).

## Endpoint Rules
- Endpoints are **thin**: receive request → `_mediator.Send()` → return response
- Every endpoint: `[Authorize]` or `.RequireAuthorization()` with specific role/policy
- No business logic in controllers

```csharp
// GOOD — thin endpoint
[HttpPost]
public async Task<IActionResult> Create(CreatePatientCommand command)
{
    var result = await _mediator.Send(command);
    return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
}

// BAD — business logic in controller
[HttpPost]
public async Task<IActionResult> Create(CreatePatientRequest request)
{
    var patient = new Patient(request.Name, request.DateOfBirth);
    await _dbContext.Patients.AddAsync(patient);
    await _dbContext.SaveChangesAsync();
    return Ok(patient);
}
```

## Cross-Cutting
- `MediTrack.ServiceDefaults` on every service (health, tracing, resilience)
- `EventBus` interfaces only; `EventBusRabbitMQ` is the injected impl
- FluentValidation via `ValidatorBehavior` in MediatR pipeline
- AutoMapper for DTO ↔ Entity mapping
- Integration events use the outbox pattern (`IntegrationEventLogEF`)

## No Magic Strings
```csharp
// BAD: await _userManager.AddToRoleAsync(user, "Patient");
// GOOD: await _userManager.AddToRoleAsync(user, UserRoles.Patient);
```

## Multi-Step Mutations — Handle Partial Failures
```csharp
// BAD — if AddToRoleAsync fails, user exists without a role
var result = await _userManager.CreateAsync(user, password);
if (result.Succeeded)
    await _userManager.AddToRoleAsync(user, UserRoles.Patient);

// GOOD — roll back on partial failure
var result = await _userManager.CreateAsync(user, password);
if (result.Succeeded)
{
    var roleResult = await _userManager.AddToRoleAsync(user, UserRoles.Patient);
    if (!roleResult.Succeeded) await _userManager.DeleteAsync(user);
}
```

## Document Deliberate Trade-offs
When making a conscious product decision (e.g., skip email verification, auto sign-in), leave a comment explaining **why**. Future developers shouldn't guess if it was intentional.

## NuGet — Central Package Management
- **NEVER** put `Version` on `<PackageReference>` in any .csproj
- **ALWAYS** declare in `Directory.Packages.props` first, then reference version-free
- **NEVER** run `dotnet add package`
- Prefer `<FrameworkReference>` for ASP.NET Core shared framework packages

```xml
<!-- BAD — version inside csproj -->
<PackageReference Include="Newtonsoft.Json" Version="13.0.3" />

<!-- GOOD — version only in Directory.Packages.props -->
<PackageReference Include="Newtonsoft.Json" />
```

**Note**: Aspire.Nexus has CPM disabled intentionally — it's a standalone public tool with its own `Directory.Packages.props`.
