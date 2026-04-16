---
paths:
  - "src/MediTrack.Web/**"
  - "design/**"
---

<!-- maintainer: paths scoped to Web + Design files.
     React 19 patterns, RTK Query, React Router v7, component conventions.
     Keep under 80 lines. -->

# Frontend Patterns

## Core Principles

- **Composition over Inheritance** — small components, hooks for reuse
- **Immutability** — NEVER mutate state directly, always return new objects
- **Single Responsibility** — `PatientCard` renders, `PatientList` manages list, `usePatients` fetches
- **Unidirectional Data Flow** — props down, callbacks up. NEVER mutate props
- **Least Privilege State** — local state first. Only lift when a sibling/parent needs it
- **RTK Query for server state** — NEVER `useEffect` + `useState` for API calls

## React Compiler (v1.0+)

**NEVER** manually add `React.memo`, `useCallback`, or `useMemo` — compiler handles it.
**Exception**: Only with profiled evidence + comment explaining why.

```tsx
// BAD — unnecessary manual memoization
const filtered = useMemo(() => patients.filter(p => p.isActive), [patients]);

// GOOD — plain code, compiler optimizes automatically
const filtered = patients.filter(patient => patient.isActive);
```

## Quality Checks

### No Side Effects During Render
```tsx
// BAD — fires on every render
if (!auth.isAuthenticated) { auth.signinRedirect(); return <p>Redirecting...</p>; }

// GOOD — side effect in useEffect
useEffect(() => {
  if (!auth.isLoading && !auth.isAuthenticated) signinRedirect();
}, [auth.isLoading, auth.isAuthenticated, signinRedirect]);
```

### Stale Closures in Callbacks
```tsx
// BAD — captures auth.user from first render forever
configureAxiosAuth(() => auth.user);

// GOOD — ref always holds the latest value
const userRef = useRef(auth.user);
userRef.current = auth.user;
configureAxiosAuth(() => userRef.current);
```

### useEffect Dependencies
```tsx
// BAD — auth changes reference every render
useEffect(() => { ... }, [auth]);

// GOOD — depend on specific values
const { signinRedirect } = auth;
useEffect(() => { ... }, [auth.isLoading, auth.isAuthenticated, signinRedirect]);
```

### readonly Props — Pick One Approach
```tsx
// GOOD — readonly on interface only (project convention)
interface Props { readonly children: ReactNode; }
function Component({ children }: Props) {}
```

### Other
- **DRY**: check for existing hooks/utils before writing new ones
- **autocomplete attributes**: `autocomplete="email"`, `autocomplete="new-password"` on form inputs

## Feature-Based Structure

```
src/features/<name>/
├── components/   (presentational JSX only)
├── hooks/        (all state/logic — ViewModel pattern)
├── store/        (RTK Query + Redux Toolkit)
├── types.ts      (TypeScript interfaces)
├── constants.ts
└── index.ts      (barrel export)
```
