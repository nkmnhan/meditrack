# MediTrack Code Review Standards

When reviewing code, check for these project-specific issues:

## Critical (must fix)

### Security
- Every endpoint has `[Authorize]` or `.RequireAuthorization()` with specific role/policy
- No hardcoded secrets, connection strings, or API keys
- No `dangerouslySetInnerHTML` in React
- No `FromSqlRaw` with string concatenation
- Resource ownership checked (IDOR) — Patient cannot access another Patient's data

### Architecture
- NuGet packages use Central Package Management — no `Version` attribute in `.csproj` files
- Domain layer has zero project references (if applicable)
- Endpoints are thin — delegate to MediatR or service, no business logic in controllers
- No cross-service direct database access

### Data Integrity
- Multi-step mutations handle partial failures with rollback
- FluentValidation on all command/request DTOs

## Important (should fix)

### Naming
- No abbreviations (`d`, `e`, `v`, `tmp`, `res`, `cb`, `fn`)
- Booleans prefixed with `is`/`has`/`can`/`should`
- Event handlers prefixed with `on`/`handle`
- Components are PascalCase noun-first

### Frontend
- No side effects during render (use `useEffect` or event handlers)
- No manual `React.memo`, `useCallback`, `useMemo` (React Compiler handles it)
- No stale closures in callbacks registered once (use `useRef`)
- `useEffect` dependencies are specific values, not whole objects
- Uses design tokens (`primary-700`, `neutral-900`), never raw Tailwind colors (`blue-500`)
- Icons from Lucide React only
- Mobile-first: `flex-col md:flex-row` pattern, touch targets min `h-10 w-10`

### Backend
- No magic strings — use constants classes (`UserRoles.Patient`, not `"Patient"`)
- AutoMapper for DTO mapping, not manual mapping
- Deliberate trade-offs have comments explaining why

## Nice to have

- `autocomplete` attributes on form inputs
- Consistent class order in `clsxMerge`: Layout → Sizing → Shape → Colors → Animation → States
- Page containers use `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`
