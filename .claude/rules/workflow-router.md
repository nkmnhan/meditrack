---
paths:
  - "**/*"
---

<!-- maintainer: paths: ["**/*"] — loads every session.
     Routes user intent to the correct agent/skill. Model tier guide.
     Keep under 60 lines. -->

# Workflow Router — Auto-detect Intent

When the user's request matches a pattern below, suggest the appropriate workflow.

## Workflow Router — Use the Right Agent for the Task

This is your **model gateway**. Route every task to the cheapest model that can do the job well.

| Task type | Agent to use | Model tier | Why |
|-----------|-------------|------------|-----|
| Explore, search, "where is X", "does this exist?" | `scout` | **Haiku** 🟢 | Read-only; no reasoning needed |
| Implement feature, fix bug, write tests (TDD) | `senior-developer` | **Sonnet** 🟡 | Needs code quality judgment |
| Review PR, audit security, check conventions | `code-reviewer` | **Sonnet** 🟡 | Needs pattern recognition |
| Plan features, break down tasks, resolve conflicts | `tech-lead` | **Opus** 🔴 | Needs deep reasoning |
| Design service boundaries, data models, scalability | `system-architect` | **Opus** 🔴 | Needs architectural depth |
| Challenge a plan, stress-test a design | `devils-advocate` | **Opus** 🔴 | Needs adversarial reasoning |

**Rule**: Default to the agent one tier CHEAPER than you think you need. Upgrade only if output quality is insufficient.

## Intent Detection → Agent Routing

| User says... | Detected intent | Recommended workflow |
|-------------|-----------------|---------------------|
| "fix", "bug", "broken", "error", "not working", "fails" | **Bug fix** | `/superpowers:systematic-debugging` → TDD fix → verify |
| "add", "create", "build", "implement", "new feature" | **Feature** | `/superpowers:brainstorming` → plan → worktree → TDD → verify |
| "refactor", "clean up", "improve", "simplify", "extract" | **Refactor** | `/superpowers:brainstorming` → plan → TDD (green first) → refactor |
| "review", "check", "audit" | **Review** | `/superpowers:requesting-code-review` |
| "test", "write tests", "add tests" | **Testing** | `/superpowers:test-driven-development` |
| "deploy", "release", "merge", "PR" | **Ship** | `/superpowers:verification-before-completion` → `/superpowers:finishing-a-development-branch` |

## Pre-work Checklist (before ANY implementation)

1. **Check shared memory** — Read `.claude/shared-memory/index.json` for known fixes/gotchas related to the task
2. **Check project index** — Read `.claude/index/*.json` to find existing code before creating new
3. **Check CHANGELOG.md** — understand recent context

## Post-work Checklist (after ANY implementation)

1. **Verify** — run lint + build + tests (see workflow.md exit criteria)
2. **Learn** — if you discovered something non-obvious, suggest `/learn save`
3. **Update index** — if you created new shared components/hooks/utils, update `.claude/index/*.json`
