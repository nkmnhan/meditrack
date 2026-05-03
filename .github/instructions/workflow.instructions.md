---
applyTo: "**"
---

Follow all rules in `.claude/rules/workflow.md` and `.claude/rules/critical-rules.md`.

# Development Workflow

## For Non-Trivial Work

1. **Design** — explore requirements and constraints before coding
2. **Plan** — create a step-by-step implementation plan
3. **Isolate** — use a feature branch
4. **Execute** — implement in small, verifiable steps
5. **Verify** — run lint + build + tests (exit criteria below)
6. **Finish** — merge or create PR, update CHANGELOG.md

## Pre-Work Checklist (before ANY implementation)

1. **Read before write** — read existing code; search for 3+ similar patterns before creating new ones
2. **Check CHANGELOG.md** — understand recent context and decisions
3. **Check `.claude/shared-memory/index.json`** — known fixes and gotchas
4. **Check `.claude/index/`** — `backend-registry.json` and `frontend-registry.json` before creating new components/hooks/utils

## Exit Criteria

| Step              | Done when...                                                         |
|-------------------|----------------------------------------------------------------------|
| Execute           | Each step compiles and tests pass                                    |
| Verify (frontend) | `npm run lint` + `npm run build` = zero errors                       |
| Verify (backend)  | `dotnet build` + `dotnet test --filter "FullyQualifiedName~UnitTests"` = zero failures |
| Finish            | PR created or merged, CHANGELOG.md updated under `[Unreleased]`     |

## TDD — Mandatory for All New Code

1. **Red** — write a failing test for the expected behavior
2. **Green** — write the minimum code to make it pass
3. **Refactor** — clean up while keeping tests green
4. Commit after each Green step

## Test Projects

| Project                    | Type        | Dependencies            | When to use                              |
|----------------------------|-------------|-------------------------|------------------------------------------|
| `Clara.UnitTests`          | Unit        | NSubstitute             | Services, handlers, domain logic         |
| `MedicalRecords.UnitTests` | Unit        | NSubstitute             | Domain entities, value objects, CQRS     |
| `Clara.IntegrationTests`   | Integration | PostgreSQL + pgvector   | API endpoints, SignalR, DB queries       |

## Test Conventions

- **Naming**: `{ClassName}Tests.cs` mirrors `{ClassName}.cs`
- **Method**: `MethodName_Scenario_ExpectedResult`
- **Pattern**: Arrange-Act-Assert, one assertion per test
- **Mocking**: NSubstitute for interfaces — **never mock concrete classes**
- **Assertions**: FluentAssertions — **never** `Assert.*`
- **Test data**: Bogus when needed

## Integration Test Rules

- **ALWAYS** use `ConfigureTestServices` (not `ConfigureServices`) — it runs AFTER the app's DI setup
- **ALWAYS** replace auth with a fake handler injecting role claims — real JWT needs IdentityServer running
- **ALWAYS** replace external AI services (`IEmbeddingGenerator`, `IChatClient`) with fakes — never call real APIs in tests
- **ALWAYS** configure `NpgsqlDataSourceBuilder` with `EnableDynamicJson()` and pgvector when replacing `DbContextOptions`
- **NEVER** assume a random GUID exists in the DB — create test data via the API first
