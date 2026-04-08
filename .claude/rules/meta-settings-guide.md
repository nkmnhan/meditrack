---
paths:
  - ".claude/**"
  - "CLAUDE.md"
  - "**/CLAUDE.md"
  - "REVIEW.md"
---

# Meta: Claude Settings Best Practices

> This file governs how to write and organize Claude Code configuration itself.
> Load this rule whenever editing any CLAUDE.md, rules, hooks, or settings.

## Root CLAUDE.md — The Executive Summary

- **MUST** stay under 80 lines — primacy bias means first ~100 lines get the most attention
- **MUST** contain ONLY universal rules that apply to every single interaction
- **MUST** end with a 3-line "CRITICAL" recap — exploits recency bias as a safety net
- **NEVER** put reference tables (file maps, port maps, aliases) in root — they waste prime attention space
- **NEVER** use soft language ("prefer", "try to") for mandatory rules — use MUST/NEVER/ALWAYS

## Path-Scoped Rules (.claude/rules/) — The RAG Layer

Rules load on-demand based on file paths being edited (like RAG retrieval). This saves tokens and focuses attention.

### 3-Layer Organization

```
.claude/rules/
├── business/       ← Domain, compliance, navigation (loaded for src/**)
│   ├── domain.md
│   ├── compliance.md
│   └── aliases.md
├── frontend/       ← React, Tailwind, design sync (loaded for Web/**, design/**)
│   ├── patterns.md
│   ├── styling.md
│   └── design-sync.md
├── backend/        ← .NET, EF Core, MCP/AI (loaded for *.cs, *.csproj)
│   ├── architecture.md
│   ├── data.md
│   └── clara.md
├── workflow.md     ← Dev workflow, TDD, test conventions (always loaded)
└── meta-settings-guide.md  ← This file (loaded when editing settings)
```

### Rules for Writing Rules

1. **One topic per file** — max 80 lines each
2. **ALWAYS add `paths:` frontmatter** — scope to relevant file patterns
3. **Self-contained** — each rule file MUST work without reading other rule files
4. **No redundancy** — a rule MUST exist in exactly ONE file. Use cross-references, not copies
5. **MUST/NEVER for mandatory rules** — "prefer" is for suggestions, not requirements
6. **Tables over prose** — structured formats get more reliable attention than paragraphs
7. **Code examples for anti-patterns** — show BAD vs GOOD, not just the good way

### When to Use Each Level

| Question | → Use |
|----------|-------|
| Applies to every file in the project? | Root `CLAUDE.md` |
| Applies to a category of files (*.cs, *.tsx)? | `.claude/rules/<layer>/*.md` with path scope |
| Applies to one specific service/feature? | Per-directory `CLAUDE.md` (e.g., `src/Clara.API/CLAUDE.md`) |
| Must happen deterministically every time? | Hook in `settings.json` |
| Applies only during code review? | `REVIEW.md` |

## Per-Directory CLAUDE.md — Domain Context

- **Keep under 50 lines** — domain glossary + key files + inter-service links
- **NEVER duplicate** content from `.claude/rules/` — just add a pointer
- **Focus on domain language** that Claude can't infer from code

## Hooks — Deterministic Enforcement

Unlike CLAUDE.md (~70% compliance), hooks are **100% deterministic**.

| Use hooks for... | Use rules for... |
|------------------|-----------------|
| Lint/format after edit | Architectural patterns |
| Block dangerous commands | Naming conventions |
| Auto-reminders (sync, changelog) | Code style guidance |
| Environment setup | Design principles |

## settings.json — Permissions

- **Allow list**: common safe operations (git, npm, dotnet, MCP tools)
- **Deny list**: destructive ops (rm -rf, force push, reset hard), secret files, unauthorized package installs
- **ALWAYS use relative paths** in hook commands (not absolute)
- **Test hooks** after adding by editing a file and checking the output

## Anti-Patterns to Avoid

- **Stuffing root CLAUDE.md** with everything → attention drops in the middle
- **Duplicating rules** across files → they drift and contradict
- **Prose paragraphs** for rules → tables and bullets get better compliance
- **Soft language** for hard rules → "prefer" gets ignored under pressure
- **Hardcoded paths** in hooks → breaks on other machines
- **Monolithic rule files** → 200+ line files lose effectiveness past line 100
