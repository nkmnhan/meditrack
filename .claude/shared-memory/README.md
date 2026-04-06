# Shared Memory — Team Knowledge Base

This directory is the **GitHub-based shared memory** for Claude Code sessions. It syncs with all collaborators via git.

## How it works

```
┌─────────────────────────────────────────────────┐
│  Developer's Claude session                     │
│                                                 │
│  1. Learn something → /learn save               │
│  2. Routes to:                                  │
│     ├─ PostgreSQL (fast, local, queryable)      │
│     └─ shared-memory/index.json (git, shared)   │
│  3. git push → team gets the learning           │
└─────────────────────────────────────────────────┘
```

## Storage layers (priority order)

| Priority | Layer | Location | Shared? | Setup needed? |
|----------|-------|----------|---------|---------------|
| **1 (DEFAULT)** | GitHub shared memory | `.claude/shared-memory/index.json` | Yes (git) | None |
| **2 (extension)** | PostgreSQL | `claude.knowledge` table | No (local DB) | `docker-compose up -d` + `scripts/init-claude-knowledge.sql` |
| **3 (personal)** | Claude memory | `~/.claude/projects/.../memory/` | No (local) | None |

GitHub shared memory is the **default** — always works, no setup, syncs via git.
PostgreSQL is an **optional extension** — faster full-text search when available.

## Categories

| Category | What to save | Example |
|----------|-------------|---------|
| `fix` | Bug fix: what broke, why, how fixed | "EF Core N+1 on patient list — added .Include()" |
| `principle` | Team preference or coding style | "Always use FluentAssertions, never Assert.*" |
| `pattern` | Reusable code approach | "Use ValidatorBehavior in MediatR pipeline for all commands" |
| `decision` | Architectural choice and reasoning | "Chose pgvector over Pinecone — keeps data local for HIPAA" |
| `gotcha` | Non-obvious pitfall | "RabbitMQ.Client v7 is fully async — old sync patterns fail" |

## When to share

- **Always share**: fixes, patterns, decisions, gotchas (team benefits)
- **Optionally share**: principles (may be personal preference)
- **Never share**: personal workflow preferences, machine-specific config
