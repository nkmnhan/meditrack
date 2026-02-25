# MediTrack — Claude Code Guidelines

## Role

Act as a **senior full-stack developer** on this project. Apply enterprise-grade patterns, strong typing, and clean architecture principles at all times.

---

## Backend Principles (MANDATORY)

### SOLID

- **Single Responsibility** — One class, one reason to change. A `PatientService` handles patient logic, not email sending.
- **Open/Closed** — Extend behavior via abstractions (interfaces, base classes), not by modifying existing code.
- **Liskov Substitution** — Subtypes must be substitutable for their base types without breaking correctness.
- **Interface Segregation** — Prefer small, focused interfaces. Don't force classes to implement methods they don't use.
- **Dependency Inversion** — Depend on abstractions (`IPatientRepository`), not concretions (`SqlPatientRepository`). Inject via constructor DI.

### DRY — Don't Repeat Yourself

- Extract shared logic into services or base classes. But don't over-abstract for a single use case.

### KISS — Keep It Simple

- Choose the simplest solution that works. Don't add layers, patterns, or abstractions until complexity demands it.

### YAGNI — You Aren't Gonna Need It

- Don't build features, configurations, or extensibility points for hypothetical future requirements. Build for what's needed now.

### Fail Fast

- Validate inputs at the boundary (controllers, event handlers). Throw early with meaningful exceptions rather than letting bad data propagate through layers.
- Use FluentValidation for all request DTOs. Return structured error responses immediately.

### Principle of Least Privilege

- Services and users get only the minimum permissions they need.
- API endpoints are locked down by role/scope by default — explicitly opt in to access, never opt out.
- Database connections use least-privilege accounts. No `sa` in application code.
- Secrets never appear in code or logs.

---

## Frontend Principles (MANDATORY)

### Composition over Inheritance

- Build UIs by composing small components, not extending base classes.
- Use `children`, render props, and hooks for reuse.

### Single Responsibility (Components)

- Each component does one thing. A `PatientCard` renders a patient. A `PatientList` manages the list. A `usePatients` hook fetches the data.

### DRY

- Reuse via custom hooks (shared logic) and shared components (shared UI).
- Don't over-abstract too early — three similar lines are better than a premature abstraction.

### Separation of Concerns

| Layer | Responsibility |
|-------|----------------|
| **UI Components** | Rendering and styling only |
| **Hooks** | State and side effects |
| **Services** | API calls and data transformation |
| **Types** | Shared contracts and interfaces |

### Unidirectional Data Flow

- Data flows **down** via props, events flow **up** via callbacks.
- Never mutate props or reach up the component tree.

### Colocation

- Keep related code together. Styles, tests, types, and sub-components live next to the component that uses them, not in distant folders.

### Least Privilege (State)

- Keep state as local as possible. Only lift state when a sibling or parent genuinely needs it.
- Don't default to global state.

### KISS / YAGNI

- Don't add Redux slices, context providers, or complex patterns until the simpler approach breaks down.
- RTK Query handles server state — don't duplicate it with `useEffect` + `useState`.

### Immutability

- Never mutate state directly. Always return new objects/arrays.
- This is how React detects changes and re-renders correctly.

### Declarative over Imperative

- Describe **what** the UI should look like for a given state, not **how** to manipulate the DOM step by step.

---

## Naming Conventions (MANDATORY)

- **Variables, functions, and parameters must have meaningful, intention-revealing names**
- **NEVER** use abbreviations like `d`, `e`, `v`, `tmp`, `res`, `obj`, `val`, `cb`, `fn`, `arr`, `i` (except `i`/`j` in simple for-loops)
- Name should describe **what it is or what it does**, not how it's implemented

```ts
// BAD
const d = await fetch(url);
const e = new Error("...");
users.map(u => u.name);
const cb = () => {};

// GOOD
const patientResponse = await fetch(url);
const notFoundError = new Error("...");
users.map(user => user.name);
const onSubmit = () => {};
```

- Boolean variables/props: prefix with `is`, `has`, `can`, `should` — e.g. `isLoading`, `hasPermission`, `canEdit`
- Event handlers: prefix with `on` or `handle` — e.g. `onSubmit`, `handlePatientSelect`
- Async functions: prefix with a verb describing the action — e.g. `fetchPatient`, `saveAppointment`, `deleteRecord`
- React components: PascalCase, noun-first — e.g. `PatientCard`, `AppointmentForm`
- Custom hooks: `use` prefix, describe what they manage — e.g. `usePatientList`, `useAuthToken`

---

## Styling Guidelines

### Tailwind CSS First (MANDATORY)

- **ALWAYS** use Tailwind CSS utility classes
- **AVOID** creating custom CSS files or classes
- **AVOID** CSS Modules and SCSS unless absolutely necessary
- Use `clsxMerge` for all conditional or composed class strings

### When Custom CSS is Acceptable

- Complex animations not achievable with Tailwind
- Third-party library overrides
- Critical global resets (minimal)

### CSS Class Organization

Always group classes in this order inside `clsxMerge`:

```tsx
className={clsxMerge(
  "flex items-center justify-center",     // Layout
  "w-full h-12 px-4 py-2",                // Sizing/Spacing
  "rounded-lg border border-neutral-200", // Shape/Border
  "bg-white text-neutral-900",            // Colors
  "transition-all duration-200",          // Animation
  "hover:bg-neutral-50 focus:ring-2",     // States
  props.className                         // Caller overrides — always last
)}
```

### Color Palette (MANDATORY)

Use project design tokens — **never** hardcode hex values or use Tailwind's default colors (e.g., `blue-500`).

| Category | Token | Usage |
|----------|-------|-------|
| **Primary** | `primary-700` | Buttons, headers, links |
| **Secondary** | `secondary-700` | Secondary actions, accents |
| **Accent** | `accent-500` | Violet CTAs only (sparingly!) |
| **Text** | `neutral-900` | Headings |
| **Text** | `neutral-700` | Body text |
| **Text** | `neutral-500` | Secondary/muted text |
| **Background** | `neutral-50` | Page background |
| **Background** | `white` | Cards, modals |
| **Border** | `neutral-200` | Dividers, card borders |
| **Success** | `success-500` | Confirmations |
| **Warning** | `warning-500` | Alerts |
| **Error** | `error-500` | Errors, destructive |
| **Info** | `info-500` | Informational messages (sky blue, distinct from primary) |
| **Status** | `status-scheduled` / `completed` / etc. | Appointment workflow states |
| **Triage** | `triage-critical` / `urgent` / `routine` | Medical urgency levels |

**Contrast rule:** `-500` and lighter shades fail WCAG AA on white backgrounds (~3:1). Use `-600` or darker for text. Only use `-500` and lighter for backgrounds, borders, or large text (24px+).

```tsx
// GOOD — uses project tokens
<button className="bg-primary-700 hover:bg-primary-800 text-white">Save</button>
<p className="text-neutral-700">Patient details</p>
<div className="bg-error-50 text-error-700 border border-error-200">Error message</div>

// BAD — uses default Tailwind colors
<button className="bg-blue-600 text-white">Save</button>
<p className="text-gray-700">Patient details</p>
```

> Full color documentation: see `README.md` → **🎨 UX/UI Design System**

### Icons (MANDATORY)

Use **Lucide React** (`lucide-react`) for all icons — the same library used by shadcn/ui.

- **NEVER** use raw SVGs, Font Awesome, or other icon libraries
- Standard size: `h-5 w-5` for UI, `h-4 w-4` for inline with text
- Color via `text-*` utility classes

```tsx
import { Stethoscope, CalendarDays } from "lucide-react";

<Stethoscope className="h-5 w-5 text-primary-700" />
```

### Spacing & Layout

- **Page container:** `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`
- **Section spacing:** `space-y-8`
- **Card padding:** `p-6`
- **Card grid gap:** `gap-6`
- **Form field gap:** `space-y-4`
- **Inline icon + text gap:** `gap-2`

> Full spacing and component pattern docs: see `README.md` → **🎨 UX/UI Design System**

### `clsxMerge` Utility

Located at `src/MediTrack.Web/src/shared/utils/clsxMerge.ts`.

```ts
import { clsxMerge } from "@/shared/utils/clsxMerge";
```

---

## Frontend Code Patterns

- **Feature-based** folder structure under `src/features/<name>/`
- `Component` — presentational JSX only (no logic)
- `Custom Hook` — all state/logic (ViewModel pattern)
- `Service` — API calls only
- `Store` — RTK Query + Redux Toolkit state shape
- Barrel exports via `index.ts` per feature

## Performance

- `React.memo` — prevent unnecessary re-renders on pure components
- `useCallback` — stable function references passed as props
- `useMemo` — cache expensive derived values
- RTK Query — built-in caching; do not duplicate API calls with `useEffect`

---

## NuGet Package Management (MANDATORY)

This project uses **Central Package Management (CPM)** via two MSBuild props files at the repo root:

| File | Purpose |
|---|---|
| `Directory.Build.props` | Shared MSBuild properties for every project (TFM, Nullable, etc.) |
| `Directory.Packages.props` | Single source of truth for **all** NuGet package versions |

### Rules

- **NEVER** put a `Version` attribute on a `<PackageReference>` inside any `.csproj` file
- **ALWAYS** declare new packages in `Directory.Packages.props` first, then reference them version-free in the `.csproj`
- **NEVER** run `dotnet add package` — it writes a version directly into the csproj, violating CPM

```xml
<!-- BAD — version inside csproj -->
<PackageReference Include="Newtonsoft.Json" Version="13.0.3" />

<!-- GOOD — version lives only in Directory.Packages.props -->
<PackageReference Include="Newtonsoft.Json" />
```

### Adding a New Package — Required Steps

1. Add a `<PackageVersion>` entry to `Directory.Packages.props`:
   ```xml
   <PackageVersion Include="Some.Package" Version="x.y.z" />
   ```
2. Add the version-free `<PackageReference>` to the relevant `.csproj`:
   ```xml
   <PackageReference Include="Some.Package" />
   ```
3. Never add the same package to `Directory.Packages.props` twice.

### Framework Packages

For packages that are part of the ASP.NET Core shared framework (`Microsoft.AspNetCore.App`), prefer a `<FrameworkReference>` over a `<PackageReference>` — this avoids the NU1510 warning:

```xml
<!-- In a class library that needs ASP.NET Core types -->
<FrameworkReference Include="Microsoft.AspNetCore.App" />
```

---

## Clean Architecture (MANDATORY)

> Reference: [dotnet/eShop](https://github.com/dotnet/eShop) — Microsoft's official microservices reference app.

### The Dependency Rule

Dependencies point **inward**. Outer layers depend on inner layers, never the reverse.

```
API (outermost) → Domain (innermost)
                → Infrastructure
```

- **Domain** knows nothing about Infrastructure or API — **zero project references**
- **Infrastructure** implements interfaces defined in Domain
- **API** is the composition root — wires everything via DI, contains the Application layer as a folder

### Layer Responsibilities

#### Domain Layer (`<Service>.Domain` — separate project)

- Aggregate Roots and Entities
- Value Objects
- Domain Events
- Repository Interfaces (contracts only — no implementations)
- Domain Exceptions
- SeedWork (base classes: `Entity`, `ValueObject`, `Enumeration`)
- **NO dependencies** on any other project

#### Application Layer (`<Service>.API/Application/` — folder inside API)

Following eShop's pattern, the Application layer lives **inside the API project** as a folder (not a separate project). This keeps the solution lean while maintaining logical separation.

- `Commands/` — write operations (CQRS command side)
- `Queries/` — read operations (CQRS query side)
- `Behaviors/` — MediatR pipeline behaviors (validation, logging, transaction)
- `Validations/` — FluentValidation validators for commands
- `Models/` — DTOs and view models
- `DomainEventHandlers/` — handlers for domain events
- `IntegrationEvents/` — integration event definitions and handlers

#### Infrastructure Layer (`<Service>.Infrastructure` — separate project)

- EF Core DbContext and entity configurations
- Repository implementations
- External service clients (email, blob storage, etc.)
- References: **Domain only**

#### API Layer (`<Service>.API` — separate project)

- `Apis/` or `Controllers/` — thin endpoint definitions
- `Application/` — application logic (see above)
- `Extensions/` — DI registration helpers
- `Program.cs` — composition root
- References: **Domain, Infrastructure**

### Project Structure — Complex Service (eShop Ordering pattern)

For services with rich domain logic (MedicalRecords, Patient):

```
src/<Service>.Domain/                        ← separate project, zero references
├── AggregatesModel/
│   └── <Aggregate>/
│       ├── <AggregateRoot>.cs
│       ├── I<Aggregate>Repository.cs
│       └── <ValueObject>.cs
├── Events/
├── Exceptions/
├── SeedWork/
│   ├── Entity.cs
│   ├── ValueObject.cs
│   ├── IAggregateRoot.cs
│   └── IUnitOfWork.cs
└── <Service>.Domain.csproj

src/<Service>.Infrastructure/                ← references Domain only
├── Data/
│   ├── <Service>DbContext.cs
│   └── EntityConfigurations/
├── Repositories/
│   └── <Aggregate>Repository.cs
└── <Service>.Infrastructure.csproj

src/<Service>.API/                           ← references Domain + Infrastructure
├── Apis/ or Controllers/
│   └── <Aggregate>Api.cs
├── Application/
│   ├── Commands/
│   │   └── Create<Entity>/
│   │       ├── Create<Entity>Command.cs
│   │       └── Create<Entity>CommandHandler.cs
│   ├── Queries/
│   │   └── Get<Entity>ById/
│   │       ├── Get<Entity>ByIdQuery.cs
│   │       └── Get<Entity>ByIdQueryHandler.cs
│   ├── Behaviors/
│   │   ├── LoggingBehavior.cs
│   │   ├── ValidatorBehavior.cs
│   │   └── TransactionBehavior.cs
│   ├── Validations/
│   ├── Models/
│   ├── DomainEventHandlers/
│   └── IntegrationEvents/
│       ├── Events/
│       └── EventHandlers/
├── Extensions/
├── Infrastructure/                          ← API-level infra (middleware, filters)
├── Program.cs
└── <Service>.API.csproj
```

### Project Structure — Simple Service (eShop Catalog pattern)

For services with little domain logic (Appointment, Identity):

```
src/<Service>.API/                           ← single project, all-in-one
├── Apis/ or Controllers/
├── Model/                                   ← entities directly in API
├── Services/                                ← business logic
├── Infrastructure/                          ← DbContext, data access
├── IntegrationEvents/
├── Extensions/
├── Program.cs
└── <Service>.API.csproj
```

### When to Use Full vs. Simplified Layering

| Complexity | Layering | MediTrack Example | eShop Example |
|---|---|---|---|
| Rich domain logic, aggregates, domain events | 3 projects: Domain + Infrastructure + API (with Application folder) | MedicalRecords, Patient | Ordering |
| Simple CRUD, thin business rules | 1 project: API with folders | Appointment, Identity | Catalog, Basket |

Apply YAGNI: start simple (single project). Extract Domain + Infrastructure only when you have real aggregates, domain events, or invariants that justify the separation.

### Controller / API Endpoint Rules

Endpoints are **thin**. They only:
1. Receive the HTTP request
2. Delegate to MediatR (command/query handler)
3. Return the HTTP response

```csharp
// GOOD — thin endpoint, delegates to Application layer
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

### Cross-Cutting Rules

- One Web API project per microservice; no cross-service DB access
- `MediTrack.ServiceDefaults` project reference on every service (health, tracing, resilience)
- `EventBus` interfaces only in services; `EventBusRabbitMQ` is the injected implementation
- FluentValidation for all command DTOs (via `ValidatorBehavior` in MediatR pipeline)
- AutoMapper for DTO <> Entity mapping
- Integration events use the outbox pattern (`IntegrationEventLogEF`)

---

## Tech Stack

### Backend
- ASP.NET Core (.NET 10), Entity Framework Core, FluentValidation, AutoMapper
- RabbitMQ (EventBus abstraction), SQL Server, Duende IdentityServer
- Docker + Docker Compose

### Frontend
- React 19 + Vite, TypeScript, Tailwind CSS, shadcn/ui
- Redux Toolkit + RTK Query, React Router v7, Zod, Axios
- oidc-client-ts + react-oidc-context

### Package Manager
- Backend: NuGet (Central Package Management)
- Frontend: npm

---

## Quality Checklist (MANDATORY)

Review every change against this checklist before submitting. Each item comes from real bugs caught in code review.

### React / Frontend

#### No Side Effects During Render

- **NEVER** call functions with side effects (redirects, API calls, subscriptions) directly in the render body
- Side effects belong in `useEffect`, event handlers, or callbacks
- React may call render multiple times (especially in Strict Mode) — side effects in render cause duplicate executions

```tsx
// BAD — fires on every render
if (!auth.isAuthenticated) {
  auth.signinRedirect(); // side effect in render
  return <p>Redirecting...</p>;
}

// GOOD — side effect in useEffect
useEffect(() => {
  if (!auth.isLoading && !auth.isAuthenticated && !auth.error) {
    signinRedirect();
  }
}, [auth.isLoading, auth.isAuthenticated, auth.error, signinRedirect]);
```

#### Stale Closures in Callbacks

- When a callback is registered **once** (e.g., axios interceptors, event listeners) but depends on values that change over time, use a `useRef` to always read the latest value
- A closure captured at registration time will **not** update when the component re-renders

```tsx
// BAD — captures auth.user from first render forever
configureAxiosAuth(() => auth.user);

// GOOD — ref always holds the latest value
const userRef = useRef(auth.user);
userRef.current = auth.user; // sync on every render
configureAxiosAuth(() => userRef.current);
```

#### DRY — No Duplicate Logic Across Files

- Before writing a utility function, check if an equivalent already exists in a hook or shared module
- If two files need the same logic, extract it into a single shared hook or utility — not two copies

#### `useEffect` Dependencies

- Only include values that should **trigger** the effect when they change
- Destructure stable references (e.g., `const { signinRedirect } = auth`) to avoid depending on the entire parent object
- Never include a whole object when you only need specific properties from it

```tsx
// BAD — auth changes reference every render, effect fires too often
useEffect(() => { ... }, [auth]);

// GOOD — depend on the specific values and stable function reference
const { signinRedirect } = auth;
useEffect(() => { ... }, [auth.isLoading, auth.isAuthenticated, auth.error, signinRedirect]);
```

#### `readonly` Props — Pick One Approach

- Use `readonly` on interface fields **OR** `Readonly<>` on the function parameter, not both
- Project convention: use `readonly` on interface fields

```tsx
// BAD — redundant double wrapping
interface Props { readonly children: ReactNode; }
function Component({ children }: Readonly<Props>) {}

// GOOD — readonly on interface only
interface Props { readonly children: ReactNode; }
function Component({ children }: Props) {}
```

### Backend (C# / ASP.NET Core)

#### No Magic Strings

- **NEVER** hardcode role names, claim types, policy names, or config keys as inline strings
- Define them as `const` in a dedicated constants class (e.g., `UserRoles.Patient`)
- Keep backend constants in sync with frontend equivalents (e.g., `UserRoles.cs` ↔ `roles.ts`)

```csharp
// BAD
await _userManager.AddToRoleAsync(user, "Patient");

// GOOD
await _userManager.AddToRoleAsync(user, UserRoles.Patient);
```

#### Multi-Step Mutations — Handle Partial Failures

- When a sequence of mutations must all succeed (e.g., create user + assign role), check each result and roll back on failure
- Don't assume step N+1 will succeed just because step N did

```csharp
// BAD — if AddToRoleAsync fails, user exists without a role
var result = await _userManager.CreateAsync(user, password);
if (result.Succeeded)
{
    await _userManager.AddToRoleAsync(user, UserRoles.Patient);
    await _signInManager.SignInAsync(user, isPersistent: false);
}

// GOOD — roll back on partial failure
var result = await _userManager.CreateAsync(user, password);
if (result.Succeeded)
{
    var roleResult = await _userManager.AddToRoleAsync(user, UserRoles.Patient);
    if (!roleResult.Succeeded)
    {
        await _userManager.DeleteAsync(user);
        // return errors to the caller
    }
}
```

#### Document Deliberate Trade-offs

- When making a conscious product decision (e.g., skip email verification, auto sign-in after registration), leave a comment explaining **why**
- Future developers shouldn't have to guess whether it was intentional or an oversight

### HTML / Forms

#### Always Set `autocomplete` Attributes

- `autocomplete="email"` on email inputs
- `autocomplete="new-password"` on registration password fields
- `autocomplete="current-password"` on login password fields
- Helps password managers and improves UX

---

## Library & Dependency Selection (MANDATORY)

### Prefer Free / Open-Source First

When choosing a library, SDK, or service to solve a requirement:

1. **Always check the license** before recommending or adding a dependency
2. **Prefer free and open-source** (MIT, Apache 2.0, BSD, ISC, MPL 2.0) over commercial/paid alternatives
3. **If a paid library is the only viable option**, stop and discuss with the user before adding it — explain:
   - Why the free alternatives don't work
   - What the paid library costs (license model, pricing tiers)
   - Whether there's a free tier sufficient for this project
4. **Never silently add a commercially-licensed package** — the user must explicitly approve it
5. **For cloud services / APIs** (OpenAI, AssemblyAI, Azure, etc.), note the pricing model and whether a free tier exists

### Current Paid Dependencies (Approved)

| Package | License | Why approved |
|---------|---------|-------------|
| Duende IdentityServer | Commercial (free < $1M) | Already in use; free for this project's scale |
| SQL Server | Commercial (Developer Edition) | Being replaced by PostgreSQL (free) |

### Evaluation Checklist

Before adding any new package, answer:
- Is it actively maintained? (last commit < 6 months)
- What's the license? (MIT/Apache = go, commercial = discuss first)
- Does it duplicate something already in the project?
- Is it the simplest tool for the job? (KISS/YAGNI)

---

## Commands

```bash
# Docker
docker-compose up -d              # Start all services
docker-compose up -d --build      # Rebuild and start
docker-compose down               # Stop all services
docker-compose logs -f <service>  # Tail logs

# Frontend (src/MediTrack.Web/)
npm run dev                       # Dev server
npm run build                     # Production build
npm run lint                      # ESLint

# Backend
dotnet build                      # Build solution
dotnet test                       # Run tests
```
