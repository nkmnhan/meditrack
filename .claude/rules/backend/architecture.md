---
paths:
  - "src/**/*.cs"
  - "src/**/*.csproj"
---

# Backend Architecture

## SOLID Principles (MANDATORY)

- **Single Responsibility** — one class, one reason to change
- **Open/Closed** — extend via abstractions, not by modifying existing code
- **Liskov Substitution** — subtypes MUST be substitutable for base types
- **Interface Segregation** — small, focused interfaces
- **Dependency Inversion** — depend on abstractions (`IPatientRepository`), not concretions

## Clean Architecture (eShop Pattern)

Dependencies point **inward**: API → Infrastructure → Domain

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Domain** | `<Service>.Domain/` (zero refs) | Aggregates, Value Objects, Domain Events, Repository Interfaces, SeedWork |
| **Infrastructure** | `<Service>.Infrastructure/` (refs Domain only) | DbContext, Entity Configs, Repository Implementations |
| **Application** | `<Service>.API/Application/` (folder inside API) | Commands/, Queries/, Behaviors/, Validations/, Models/, DomainEventHandlers/ |
| **API** | `<Service>.API/` (refs Domain + Infra) | Thin endpoints → MediatR → response. Composition root |

**Simple services** (Appointment, Identity): single API project with folders.
**Complex services** (MedicalRecords): 3 projects with full DDD.

## Endpoint Rules

- Endpoints are **thin**: receive request → `_mediator.Send()` → return response
- Every endpoint: `[Authorize]` or `.RequireAuthorization()` with specific role/policy
- NEVER put business logic in controllers

```csharp
// GOOD — thin endpoint
[HttpPost]
public async Task<IActionResult> Create(CreatePatientCommand command)
{
    var result = await _mediator.Send(command);
    return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
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
// GOOD — roll back on partial failure
var result = await _userManager.CreateAsync(user, password);
if (result.Succeeded)
{
    var roleResult = await _userManager.AddToRoleAsync(user, UserRoles.Patient);
    if (!roleResult.Succeeded) await _userManager.DeleteAsync(user);
}
```

## Document Deliberate Trade-offs

When making a conscious product decision (e.g., skip email verification), leave a comment explaining **why**.
