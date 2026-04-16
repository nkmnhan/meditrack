---
paths:
  - "**/*"
---

<!-- maintainer: paths: ["**/*"] — loads every session regardless of file type.
     Contains TDD workflow, test conventions, compaction instructions.
     Keep under 80 lines. -->

# Development Workflow

## For Non-Trivial Work

1. **Design** — explore requirements and constraints before coding
2. **Plan** — create step-by-step implementation plan (save to `docs/superpowers/plans/`)
3. **Isolate** — use a feature branch or git worktree (`.worktrees/`)
4. **Execute** — implement in small, verifiable steps
5. **Verify** — run lint + build (see exit criteria below)
6. **Finish** — merge or create PR

**If `superpowers` plugin is installed**, use its skills:
`/superpowers:brainstorming` → `/superpowers:writing-plans` → `/superpowers:using-git-worktrees` → `/superpowers:executing-plans` → `/superpowers:verification-before-completion` → `/superpowers:finishing-a-development-branch`

## Exit Criteria

| Step | Done when... |
|------|-------------|
| Design | Requirements documented, constraints identified |
| Plan | Step-by-step plan saved to `docs/superpowers/plans/` |
| Execute | Each step compiles and tests pass |
| Verify (frontend) | `npm run lint` + `npm run build` = zero errors |
| Verify (backend) | `dotnet build` + `dotnet test --filter "FullyQualifiedName~UnitTests"` = zero failures |
| Finish | PR created or branch merged, CHANGELOG.md updated |

## TDD (MANDATORY for all new code)

1. **RED** — write a failing test for the behavior you want
2. **GREEN** — write the minimum code to make it pass
3. **REFACTOR** — clean up while keeping tests green
4. Commit after each GREEN step

## Test Projects

| Project | Type | Dependencies | When to use |
|---------|------|-------------|-------------|
| `Clara.UnitTests` | Unit | NSubstitute | Services, handlers, domain logic |
| `MedicalRecords.UnitTests` | Unit | NSubstitute | Domain entities, value objects, CQRS handlers |
| `Clara.IntegrationTests` | Integration | PostgreSQL + pgvector | API endpoints, SignalR, DB queries |

## Integration Test Rules

- **ALWAYS** use `ConfigureTestServices` (not `ConfigureServices`) to override app registrations — it runs AFTER the app's DI setup
- **ALWAYS** replace auth with a fake handler that injects role claims — real JWT needs IdentityServer running
- **ALWAYS** replace external AI services (`IEmbeddingGenerator`, `IChatClient`) with fakes — NEVER call real APIs in tests
- **ALWAYS** configure `NpgsqlDataSourceBuilder` with `EnableDynamicJson()` and pgvector when replacing `DbContextOptions`
- **NEVER** assume a random GUID exists in the DB — create test data via the API first

## Test Conventions

- **Naming:** `{ClassName}Tests.cs` mirrors `{ClassName}.cs`
- **Method:** `MethodName_Scenario_ExpectedResult`
- **Pattern:** Arrange-Act-Assert, one assertion per test
- **Mocking:** NSubstitute for interfaces — NEVER mock concrete classes
- **Assertions:** FluentAssertions — NEVER `Assert.*`
- **Test data:** Bogus when needed

## Knowledge Capture

After fixing a non-trivial bug, discovering a gotcha, or making an architectural decision:
- Suggest `/learn save` to the user
- Knowledge is saved to `.claude/shared-memory/index.json` (DEFAULT, shared via git)
- Optionally synced to PostgreSQL `claude.knowledge` table (extension, local)
- Skill is auto-discovered from `.claude/skills/learn/SKILL.md` — no install needed

Before investigating an issue, check past learnings:
- Read `.claude/shared-memory/index.json` for known fixes and gotchas
- If PostgreSQL is available: `SELECT * FROM claude.search_knowledge('query');`

## Compaction Instruction

When compacting context, ALWAYS preserve: modified file list, current branch name, test commands, and active plan steps.
