# MediTrack — Claude Code Guidelines

## Role

Act as a **senior full-stack developer** on this project. Apply enterprise-grade patterns, strong typing, and clean architecture principles at all times.

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
  "flex items-center justify-center",  // Layout
  "w-full h-12 px-4 py-2",             // Sizing/Spacing
  "rounded-lg border border-gray-200", // Shape/Border
  "bg-white text-gray-900",            // Colors
  "transition-all duration-200",       // Animation
  "hover:bg-gray-50 focus:ring-2",     // States
  props.className                       // Caller overrides — always last
)}
```

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

For packages that are part of the ASP.NET Core shared framework (`Microsoft.AspNetCore.App`), prefer a `<FrameworkReference>` over a `<PackageReference>` in projects that need ASP.NET Core types — this avoids the NU1510 "unnecessary package" warning:

```xml
<!-- In a class library that needs ASP.NET Core types -->
<FrameworkReference Include="Microsoft.AspNetCore.App" />
```

---

## Backend Code Patterns

- One Web API project per microservice; no cross-service DB access
- `MediTrack.ServiceDefaults` project reference on every service (health, tracing, resilience)
- `EventBus` interfaces only in services; `EventBusRabbitMQ` is the injected implementation
- DDD layering only on `MedicalRecords` (Domain / Infrastructure separation)
- FluentValidation for all input; AutoMapper for DTO ↔ Domain mapping
