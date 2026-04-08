---
name: learn
description: Save or search team knowledge. Use when discovering a fix, pattern, principle, decision, or gotcha worth remembering. Also use to search past learnings before investigating issues. Invoke with /learn.
---

# Learning Skill — Team Knowledge Capture

## Purpose

Capture and retrieve team knowledge so the same lessons aren't relearned across sessions or collaborators.

## Storage (priority order)

1. **GitHub shared memory** (DEFAULT) — `.claude/shared-memory/index.json` in the repo. Always available, syncs via git push.
2. **PostgreSQL extension** (OPTIONAL) — `claude.knowledge` table via `mcp__postgres`. Faster queries, full-text search. Only when DB is running.

## Commands

When the user invokes `/learn`, ask which action:

### `/learn save` — Capture knowledge

1. Ask: What did you learn? (or infer from conversation context)
2. Classify into a category:
   - `fix` — Bug fix: what broke, why, how fixed
   - `principle` — Team preference or coding style rule
   - `pattern` — Reusable code approach worth repeating
   - `decision` — Architectural choice and its reasoning
   - `gotcha` — Non-obvious pitfall that surprised us
3. Create a short key (kebab-case, e.g., `ef-core-n-plus-1-patient-list`)
4. Write the value (2-5 sentences: what, why, how)
5. Add tags (e.g., `["frontend", "react", "hooks"]`)
6. Save to GitHub shared memory:

```json
{
  "category": "fix",
  "key": "ef-core-n-plus-1-patient-list",
  "value": "Patient list was slow due to N+1 queries on Address. Fixed by adding .Include(p => p.Address) in PatientService.GetAll(). Always eager-load value objects in list queries.",
  "tags": ["backend", "ef-core", "performance"],
  "source": "src/Patient.API/Services/PatientService.cs",
  "date": "2026-04-06",
  "author": "nhan"
}
```

7. Read `.claude/shared-memory/index.json`, append to the right category array, write back
8. If PostgreSQL is available, ALSO upsert via mcp__postgres:
   ```sql
   SELECT claude.upsert_knowledge('fix', 'ef-core-n-plus-1-patient-list', '...', ARRAY['backend','ef-core','performance'], 'src/Patient.API/Services/PatientService.cs');
   ```

### `/learn search <query>` — Full-text search (no DB required)

1. Run the built-in search engine:
   ```bash
   node .claude/hooks/search-knowledge.mjs "query terms"
   ```
   This searches all entries by key, value, tags, and source with ranked scoring + fuzzy matching.
2. If PostgreSQL is available, ALSO search via mcp__postgres for deeper results:
   ```sql
   SELECT * FROM claude.search_knowledge('patient list slow', NULL, NULL, 10);
   ```
3. Present matches grouped by category, most recent first
4. If nothing found, say so — don't hallucinate past learnings

### `/learn list [category]` — Browse knowledge

1. Read `.claude/shared-memory/index.json`
2. List entries, optionally filtered by category
3. Show: key, first line of value, date, tags

### `/learn share` — Remind to push

Remind the user:
> Your learnings are saved in `.claude/shared-memory/index.json`. Run `git add .claude/shared-memory/ && git commit -m "learn: <summary>" && git push` to share with your team.

### `/learn sync` — Pull team learnings into PostgreSQL

1. Read `.claude/shared-memory/index.json`
2. For each entry, upsert into PostgreSQL via mcp__postgres
3. Report: "Synced N entries to local PostgreSQL"

## Auto-learning (when NOT explicitly invoked)

When Claude notices something worth saving during normal work:
- A bug fix that took multiple attempts
- A non-obvious workaround
- A user correction ("no, don't do it that way")
- A pattern that worked well

**Suggest** (don't auto-save): "This seems worth remembering. Want me to `/learn save` this?"

## Rules

- NEVER save secrets, credentials, or PHI to shared memory
- NEVER save ephemeral task details (current branch, in-progress work)
- ALWAYS check for duplicates before saving (search by key first)
- Keep values concise: 2-5 sentences max
- Include `source` path when the learning relates to a specific file
