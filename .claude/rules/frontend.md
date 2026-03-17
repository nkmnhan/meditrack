---
paths:
  - "src/MediTrack.Web/**"
  - "design/**"
---

# Frontend Rules

> Principles (KISS, YAGNI, DRY, Composition, Immutability) are in root CLAUDE.md — always loaded.

## Patterns
- **Single Responsibility**: `PatientCard` renders, `PatientList` manages list, `usePatients` fetches
- **Separation of Concerns**: UI Components (render) | Hooks (state) | Services (API) | Types (contracts)
- **Unidirectional Data Flow**: props down, callbacks up. Never mutate props
- **Declarative over Imperative**: describe what UI looks like for a given state, not how to manipulate DOM
- **Colocation**: styles, tests, types, sub-components live next to the component
- **Least Privilege State**: local state first. Only lift when a sibling/parent needs it
- **RTK Query for server state**: no `useEffect` + `useState` for API calls

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

## React Compiler (v1.0+)
**Do NOT** manually add `React.memo`, `useCallback`, or `useMemo` — compiler handles it.
**Exception**: Only with profiled evidence + comment explaining why.

```tsx
// BAD — unnecessary manual memoization
const filtered = useMemo(() => patients.filter(p => p.isActive), [patients]);
const handleClick = useCallback(() => navigate('/patients'), [navigate]);

// GOOD — plain code, compiler optimizes automatically
const filtered = patients.filter(patient => patient.isActive);
const handleClick = () => navigate('/patients');
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

// GOOD — destructure stable refs, depend on specific values
const { signinRedirect } = auth;
useEffect(() => { ... }, [auth.isLoading, auth.isAuthenticated, signinRedirect]);
```

### readonly Props — Pick One Approach
```tsx
// BAD — redundant double wrapping
interface Props { readonly children: ReactNode; }
function Component({ children }: Readonly<Props>) {}

// GOOD — readonly on interface only (project convention)
interface Props { readonly children: ReactNode; }
function Component({ children }: Props) {}
```

### Other
- **DRY**: check for existing hooks/utils before writing new ones
- **autocomplete attributes**: `autocomplete="email"`, `autocomplete="new-password"`, `autocomplete="current-password"` on form inputs

## Styling (Tailwind CSS)
- **Mobile-first**: design for 320px min, enhance with `sm:`, `md:`, `lg:` breakpoints
- **Touch targets**: min `h-10 w-10` (40px) on mobile
- **Tailwind only**: no CSS modules/SCSS. Use `clsxMerge` for conditional classes. Custom CSS only for: complex animations, third-party overrides, critical global resets
- **Semantic tokens only**: `bg-card`, `text-foreground`, `border-border`. Never `bg-white`, `text-neutral-*`, or hex values. See Color Tokens below
- **Icons**: Lucide React only (`h-5 w-5` UI, `h-4 w-4` inline)
- **Class order**: Layout → Sizing → Shape → Colors → Animation → States → `props.className`

### Color Tokens (Semantic Only — MANDATORY)

**NEVER** use `bg-white`, `text-neutral-*`, `border-neutral-*`, or any hardcoded Tailwind color.
**ALWAYS** use semantic tokens that resolve to CSS variables (auto-adapt to any theme):

| Token | Usage | BANNED Equivalent |
|-------|-------|-------------------|
| `bg-background` | Page background | ~~`bg-neutral-50`~~ |
| `bg-card` | Cards, modals, elevated surfaces | ~~`bg-white`~~ |
| `bg-muted` | Subtle surfaces, alt rows, input bg | ~~`bg-neutral-100`~~ |
| `bg-popover` | Dropdowns, tooltips | ~~`bg-white`~~ |
| `text-foreground` | Primary text, headings | ~~`text-neutral-900/800/700`~~ |
| `text-muted-foreground` | Labels, secondary text, placeholders | ~~`text-neutral-600/500/400`~~ |
| `border-border` | All borders and dividers | ~~`border-neutral-200/100`~~ |
| `border-input` | Form input borders | ~~`border-neutral-200`~~ |
| `ring-ring` | Focus rings | ~~`ring-neutral-200`~~ |
| `from-background` / `to-card` | Gradients | ~~`from-neutral-50 to-white`~~ |
| `primary-*` | Brand blue — buttons, headers, links | Allowed (semantic) |
| `secondary-*` | Teal — supporting actions | Allowed (semantic) |
| `accent-*` | Violet — highlights, Clara AI | Allowed (semantic) |
| `success/warning/error/info-*` | Status feedback | Allowed (semantic) |
| `status-scheduled/completed` | Appointment workflow states | Allowed (semantic) |
| `triage-critical/urgent/routine` | Medical urgency levels | Allowed (semantic) |
| `healing-*` | Brand warm teal accents | Allowed (design-only) |

**Why:** Semantic tokens resolve to CSS variables. Adding a new theme = adding 25 CSS variables. Hardcoded colors bypass theming and break in dark mode. See `docs/theming-guide.md`.

**Contrast rule**: `-500` and lighter fail WCAG AA on light bg. Use `-600`+ for text.

### Spacing
- Page: `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`
- Sections: `space-y-8` | Cards: `p-6` | Grid gap: `gap-6` | Form fields: `space-y-4`
