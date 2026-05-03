---
applyTo: "**/*.cs,**/*.csproj"
---

Follow all rules in `.claude/rules/backend/architecture.md` and `.claude/rules/backend/data.md`.

# Backend Rules — .NET 10

## Clean Architecture (eShop Pattern)

Dependencies point **inward**: API → Infrastructure → Domain

| Layer              | Location                        | Responsibility                                              |
|--------------------|---------------------------------|-------------------------------------------------------------|
| **Domain**         | `<Service>.Domain/`             | Aggregates, Value Objects, Domain Events, Repository Interfaces, SeedWork |
| **Infrastructure** | `<Service>.Infrastructure/`    | DbContext, Entity Configs, Repository Implementations      |
| **Application**    | `<Service>.API/Application/`   | Commands, Queries, Behaviors, Validations, Models, DomainEventHandlers |
| **API**            | `<Service>.API/`                | Thin endpoints → MediatR → response. Composition root       |

- **Simple services** (Appointment, Patient): single project with folders (eShop Catalog pattern)
- **Complex services** (MedicalRecords): 3 projects with full DDD+CQRS (eShop Ordering pattern)

## Endpoint Rules

Every endpoint must be **thin** — receive request → `_mediator.Send()` → return response. **No business logic in controllers.**

```csharp
// GOOD — thin endpoint
[HttpPost]
[Authorize(Policy = Policies.CanManagePatients)]
public async Task<IActionResult> Create(CreatePatientCommand command)
{
    var result = await _mediator.Send(command);
    return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
}

// BAD — business logic in controller
[HttpPost]
public async Task<IActionResult> Create(CreatePatientRequest request)
{
    var patient = new Patient(request.Name, request.DateOfBirth); // ❌
    await _dbContext.Patients.AddAsync(patient);                  // ❌
    await _dbContext.SaveChangesAsync();
    return Ok(patient);
}
```

## No Magic Strings

```csharp
// BAD
await _userManager.AddToRoleAsync(user, "Patient");

// GOOD
await _userManager.AddToRoleAsync(user, UserRoles.Patient);
```

## Multi-Step Mutations — Handle Partial Failures

```csharp
// BAD — if role assignment fails, user exists without a role
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

## Cross-Cutting

- `MediTrack.ServiceDefaults` on every service (health checks, tracing, resilience)
- `EventBus` interfaces only; `EventBusRabbitMQ` is the injected implementation
- FluentValidation via `ValidatorBehavior` in MediatR pipeline (validates all commands/queries)
- AutoMapper for DTO ↔ Entity mapping — never manual mapping
- Integration events use the outbox pattern (`IntegrationEventLogEF`)

## Document Deliberate Trade-offs

When making a conscious product decision (e.g., skip email verification, auto sign-in),
leave a comment explaining **why**. Future developers should not have to guess.

## NuGet — Central Package Management (MANDATORY)

- **NEVER** put `Version` attribute in any `.csproj` `<PackageReference>`
- **ALWAYS** declare versions in `Directory.Packages.props` first, then reference without version
- **NEVER** run `dotnet add package`
- Prefer `<FrameworkReference>` for ASP.NET Core shared framework packages

```xml
<!-- BAD — version inside csproj -->
<PackageReference Include="Newtonsoft.Json" Version="13.0.3" />

<!-- GOOD — version only in Directory.Packages.props -->
<PackageReference Include="Newtonsoft.Json" />
```

> Note: `src/Aspire.Nexus/` has CPM disabled intentionally — it's a standalone public tool.

## EF Core

- Always use async methods (`ToListAsync`, `FirstOrDefaultAsync`, `SaveChangesAsync`)
- Include navigation properties explicitly; avoid N+1 queries
- Never use `FromSqlRaw` with string concatenation (SQL injection risk)
- Use parameterized queries only
