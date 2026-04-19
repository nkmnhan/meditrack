# Auto Model Router — Design Spec

**Date:** 2026-04-19
**Status:** Approved
**Goal:** Automatically route every user prompt to the cheapest capable subagent (scout/haiku, senior-developer/sonnet, code-reviewer/sonnet, tech-lead/opus) via a two-hook `UserPromptSubmit` pipeline. Conversational prompts stay inline.

---

## 1. Tiers & Routing Map

Five classification tiers. Every prompt lands in exactly one:

| Tier | Agent | Model | When |
|------|-------|-------|------|
| `EXPLORE` | `scout` | `claude-haiku-4-5-20251001` | Search, "where is", "how does X work", read-only |
| `IMPLEMENT` | `senior-developer` | `claude-sonnet-4-6` | Fix, build, add, create, refactor, write code |
| `REVIEW` | `code-reviewer` | `claude-sonnet-4-6` | Audit, check, validate, PR review |
| `PLAN` | `tech-lead` | `claude-opus-4-7` | Design, architecture, "best approach", multi-step |
| `CONVERSATIONAL` | *(none — inline)* | *(main session)* | Acks, follow-ups, "yes/no", short replies |

**Priority order when ambiguous:** `PLAN > IMPLEMENT > REVIEW > EXPLORE`
Escalate — never under-provision.

---

## 2. Architecture

```
User submits prompt
       ↓
[Hook 1] keyword-router.mjs  ← command, sync, ~0ms
  → regex scores prompt against tier patterns
  → outputs additionalContext with baseline tier
       ↓
[Hook 2] type: "prompt" (Haiku ~500ms)
  → receives prompt + Hook 1 result
  → confirms or overrides if clearly more confident
  → outputs final additionalContext
       ↓
[Main Claude reads additionalContext]
  → CONVERSATIONAL → respond inline
  → all other tiers → spawn mapped subagent, delegate full prompt
       ↓
[Subagent responds — result returned verbatim]
```

---

## 3. Files

| Action | File | Purpose |
|--------|------|---------|
| Create | `.claude/hooks/keyword-router.mjs` | Hook 1: regex keyword classifier |
| Modify | `.claude/settings.json` | Register both hooks under `UserPromptSubmit`; Hook 2 prompt is inline |
| Modify | `.claude/rules/workflow-router.md` | Add mandate: always read `[Router]` directive first |

---

## 4. Hook 1 — Keyword Classifier (`keyword-router.mjs`)

Reads `stdin` JSON, extracts `prompt` field, scores against patterns:

```
EXPLORE patterns:  where is|find|search|how does|what is|list|show me|which file|what calls
IMPLEMENT patterns: fix|bug|broken|implement|add|create|build|write|refactor|clean up|update|change|modify
REVIEW patterns:   review|audit|validate|check|verify|inspect|security review|PR|pull request
PLAN patterns:     plan|design|architect|best way|best approach|how should|strategy|break down|scalab
CONVERSATIONAL:    yes|no|ok|thanks|looks good|got it|sure|sounds good|agreed|continue|proceed
```

Scoring: each pattern match = 1 point. Highest scoring tier wins. Ties resolved by priority order.

Output format:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "[Router:keyword] IMPLEMENT → senior-developer (claude-sonnet-4-6)"
  }
}
```

Exits with code 0 always — never blocks a prompt.

---

## 5. Hook 2 — Haiku Refinement (`type: "prompt"`)

Both hooks receive the same `$ARGUMENTS` (original prompt) independently — hooks do not share stdin. Hook 2 classifies the prompt on its own. Main Claude prefers `[Router:haiku]` when present and falls back to `[Router:keyword]` when Hook 2 times out.

System prompt instructs Haiku to:
1. Read the user prompt from `$ARGUMENTS`
2. Return ONLY a JSON routing directive in this exact shape:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "[Router:haiku] PLAN → tech-lead (claude-opus-4-7)"
  }
}
```

Override rule: Haiku only overrides Hook 1 if the tier differs AND there are zero ambiguity signals. Otherwise it emits the same tier as Hook 1 (confirm, don't second-guess).

Timeout: 8 seconds. If Haiku times out, Hook 1 result stands unchanged.

---

## 6. Main Claude Behaviour (Routing Mandate)

Enforced via `workflow-router.md`:

> **ALWAYS** read `[Router]` directive in `additionalContext` before responding.
> - `CONVERSATIONAL` → respond inline, no spawn
> - All other tiers → spawn the mapped subagent with the full original prompt as the task
> - Return the subagent's response verbatim — do not paraphrase

---

## 7. Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Hook 1 times out | Hook 2 runs alone; its result is used |
| Hook 2 times out | Hook 1 keyword result stands |
| Both hooks fail | Default: `IMPLEMENT / senior-developer / claude-sonnet-4-6` |
| Subagent fails | Retry once; on second failure respond inline and surface the error |
| Multi-intent prompt | Dominant intent wins; secondary noted in the spawn prompt |
| `CONVERSATIONAL` detected | Respond inline, no spawn |

---

## 8. Validation Criteria (Industry Standards)

| Standard | Target | How to verify |
|----------|--------|---------------|
| Classification accuracy | ≥85% on 20 representative prompts | Manual spot-check table |
| Hook 1 latency | <5ms | `time echo '...' \| node keyword-router.mjs` |
| Hook 2 latency (p95) | <800ms | Observed in session |
| Graceful fallback | Zero prompt blocks on hook failure | Break hook intentionally, verify default fires |
| JSON validity | Hooks always emit valid JSON | `node -e` pipe-test on each hook |
| Prompt never blocked | `continue` never set to false | Code review of keyword-router.mjs |
| Subagent inheritance | Deny rules (rm -rf, secrets) apply inside agents | Verify settings.json scope |

---

## 9. Out of Scope

- Dynamic mid-session model switching (not supported by Claude Code)
- Persistent routing history / analytics
- User-facing tier override UI
- Per-file-type routing (separate from prompt intent)
