# Critical Rules (Unconditional — always loaded)

<!-- maintainer: no paths: frontmatter — loads unconditionally every session.
     Contains security, architecture, and workflow MUST/NEVER rules that apply to ALL files.
     Keep under 30 lines. Add here only when a rule must fire 100% of the time. -->

> These rules have NO paths: frontmatter because path-scoped loading has known bugs
> (GitHub #16299, #23478). Critical rules MUST load every session regardless.

## Security (NEVER violate)

- **NEVER** hardcode secrets, connection strings, or API keys in code
- **NEVER** log PHI (patient names, DOB, diagnoses, MRN) in any log statement
- **NEVER** skip `[Authorize]` or `.RequireAuthorization()` on endpoints
- **NEVER** use `FromSqlRaw` with string concatenation (SQL injection)
- **NEVER** use `dangerouslySetInnerHTML` in React (XSS)
- **ALWAYS** check resource ownership on data access (IDOR prevention)

## Architecture (NEVER violate)

- **NEVER** put `Version` on `<PackageReference>` in .csproj (Central Package Management)
- **NEVER** run `dotnet add package` (use Directory.Packages.props)
- **NEVER** use `React.memo`, `useCallback`, or `useMemo` manually (React Compiler)
- **NEVER** use raw Tailwind colors (`blue-500`, `gray-700`) — use project design tokens
- **NEVER** use raw `clsx` or string concatenation for classes — use `clsxMerge`

## Workflow (ALWAYS follow)

- **ALWAYS** read existing code before modifying — search for 3+ similar patterns first
- **ALWAYS** verify after change — run lint + build, never assume correctness
- **ALWAYS** update both Web + Design when editing shared components (dual-update rule)
- **ALWAYS** check `.claude/index/*.json` before creating new shared code
- **ALWAYS** check `.claude/shared-memory/index.json` before investigating issues
