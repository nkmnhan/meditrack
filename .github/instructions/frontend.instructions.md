---
applyTo: "src/MediTrack.Web/src/**/*.{ts,tsx},design/src/**/*.{ts,tsx}"
---

# Frontend Rules — React 19 + TypeScript

## Patterns

- **Single Responsibility**: `PatientCard` renders, `PatientList` manages list, `usePatients` fetches
- **Separation of Concerns**: UI Components (render) | Hooks (state/logic) | Store (RTK Query) | Types (contracts)
- **Unidirectional Data Flow**: props down, callbacks up. **Never mutate props**
- **Colocation**: styles, tests, types, sub-components live next to the component they belong to
- **RTK Query for server state**: never `useEffect` + `useState` for API data fetching

## Feature-Based Structure

```
src/features/<name>/
├── components/   (presentational JSX only)
├── hooks/        (all state/logic — ViewModel pattern)
├── store/        (RTK Query + Redux Toolkit)
├── types.ts
├── constants.ts
└── index.ts      (barrel export)
```

## React Compiler (v1.0+) — DO NOT manually memoize

The React Compiler handles memoization automatically. **Do not add `React.memo`, `useCallback`, or `useMemo`**
unless you have profiler evidence AND leave a comment explaining why.

```tsx
// BAD — unnecessary manual memoization
const filtered = useMemo(() => patients.filter(p => p.isActive), [patients]);
const handleClick = useCallback(() => navigate('/patients'), [navigate]);

// GOOD — plain code, compiler optimizes automatically
const filtered = patients.filter(patient => patient.isActive);
const handleClick = () => navigate('/patients');
```

## No Side Effects During Render

```tsx
// BAD — side effect fires on every render
if (!auth.isAuthenticated) { auth.signinRedirect(); return <p>Redirecting...</p>; }

// GOOD
useEffect(() => {
  if (!auth.isLoading && !auth.isAuthenticated) signinRedirect();
}, [auth.isLoading, auth.isAuthenticated, signinRedirect]);
```

## useEffect Dependencies — Stable References

```tsx
// BAD — auth object changes reference every render
useEffect(() => { ... }, [auth]);

// GOOD — destructure stable primitives
const { signinRedirect } = auth;
useEffect(() => { ... }, [auth.isLoading, auth.isAuthenticated, signinRedirect]);
```

## Stale Closures in Callbacks

```tsx
// BAD — captures auth.user from first render
configureAxiosAuth(() => auth.user);

// GOOD — ref always holds latest value
const userRef = useRef(auth.user);
userRef.current = auth.user;
configureAxiosAuth(() => userRef.current);
```

## readonly Props — Pick One Approach

```tsx
// BAD — redundant double wrapping
interface Props { readonly children: ReactNode; }
function Component({ children }: Readonly<Props>) {}

// GOOD — readonly on interface only (project convention)
interface Props { readonly children: ReactNode; }
function Component({ children }: Props) {}
```

---

## Styling (Tailwind CSS)

- **Mobile-first**: design for 320px min, enhance with `sm:`, `md:`, `lg:` breakpoints
- **Touch targets**: min `h-10 w-10` (40px) on all interactive elements for mobile
- **Tailwind only**: no CSS modules, no SCSS. Use `clsxMerge` for conditional classes
- **Icons**: Lucide React only — `h-5 w-5` (UI), `h-4 w-4` (inline text)
- **Class order**: Layout → Sizing → Shape → Colors → Animation → States → `props.className`

## Color Tokens (MANDATORY — semantic only)

**NEVER** use `bg-white`, `text-neutral-*`, `border-neutral-*`, raw hex values, or `dark:` on color scales.
**ALWAYS** use semantic tokens that auto-adapt to any theme:

| Token                  | Usage                           | BANNED Equivalent             |
|------------------------|---------------------------------|-------------------------------|
| `bg-background`        | Page background                 | ~~`bg-neutral-50`~~           |
| `bg-card`              | Cards, modals, elevated surfaces| ~~`bg-white`~~                |
| `bg-muted`             | Subtle surfaces, alt rows       | ~~`bg-neutral-100`~~          |
| `bg-popover`           | Dropdowns, tooltips             | ~~`bg-white`~~                |
| `text-foreground`      | Primary text, headings          | ~~`text-neutral-900/800/700`~~|
| `text-muted-foreground`| Labels, secondary text          | ~~`text-neutral-600/500/400`~~|
| `border-border`        | All borders and dividers        | ~~`border-neutral-200/100`~~  |
| `border-input`         | Form input borders              | ~~`border-neutral-200`~~      |
| `ring-ring`            | Focus rings                     | ~~`ring-neutral-200`~~        |
| `primary-*`            | Brand blue — buttons, headers   | Allowed (semantic)            |
| `secondary-*`          | Teal — supporting actions       | Allowed (semantic)            |
| `accent-*`             | Violet — highlights, Clara AI   | Allowed (semantic)            |
| `success/warning/error/info-*` | Status feedback         | Allowed (perceptual scales)   |
| `healing-*`            | Brand warm teal accents         | Allowed (CSS var-backed)      |
| `status-scheduled/completed/cancelled/...` | Appointment workflow states | Allowed (fixed hex) |
| `triage-critical/urgent/routine` | Medical urgency levels  | Allowed (fixed hex)           |

**Perceptual scale rule**: Shade numbers have consistent semantic meaning in both light AND dark mode.
`50` = subtle bg, `200` = border, `500` = solid/base, `600`+ = text (WCAG AA).
**Never add `dark:` overrides on color scales** — `bg-success-50 text-success-700` just works.

**Inputs** must always have explicit `bg-input text-foreground` to avoid transparent background inheritance.

## Spacing Conventions

- Page container: `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`
- Sections: `space-y-8` | Cards: `p-6` | Grid: `gap-6` | Form fields: `space-y-4`

## TypeScript

- Strict TypeScript — **no `any`**
- Use discriminated unions for variants
- `clsxMerge` only (never alias as `cn` or anything else)

## Form Inputs

- Always add `autocomplete` attributes: `autocomplete="email"`, `autocomplete="new-password"`, `autocomplete="current-password"`
