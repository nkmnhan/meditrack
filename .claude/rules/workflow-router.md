---
paths:
  - "**/*"
---

# Workflow Router — Auto-detect Intent

When the user's request matches a pattern below, suggest the appropriate workflow.

## Intent Detection

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
