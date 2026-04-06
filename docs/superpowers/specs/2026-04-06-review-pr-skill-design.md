# Review PR Skill — Design Spec

**Date:** 2026-04-06
**Status:** Approved
**Branch:** feat/clara-mvp-backend

---

## Overview

Industry-aligned code review skill for MediTrack PRs. Runs domain-specific review agents in parallel, scores confidence per issue, and outputs a structured terminal report. No GitHub posting — terminal only.

## Invocation

```
/review-pr [base-branch] [--balanced | --quick]
```

| Argument | Default | Description |
|----------|---------|-------------|
| `base-branch` | `main` | Branch to diff against |
| `--balanced` | off | Threshold 80+, skip nice-to-have |
| `--quick` | off | Threshold 90+, security + correctness only |
| _(no flag)_ | strict | Threshold 70+, all tiers |

## File Structure

```
.claude/skills/
  review-pr.md                    ← orchestration skill
  review-pr/
    checklists/
      backend.md                  ← .NET / EF Core / MediatR
      frontend.md                 ← React 19 / TypeScript / RTK Query
      ai.md                       ← MCP / RAG / LLM security
      crosscutting.md             ← HIPAA / OWASP / architecture
```

## File Routing

| Domain | Routing Rules |
|--------|--------------|
| Backend | `src/**/*.cs`, `src/**/*.csproj`, `**/*.props`, `**/*.targets` — excludes `Clara.API/` |
| Frontend | `src/MediTrack.Web/**/*.{tsx,ts,css}`, `design/**/*.{tsx,ts,css}` |
| AI | `src/Clara.API/**/*` (all file types) |
| Cross-cutting | Always runs on full diff |

Rules:
- Domain with zero changed files → agent skipped
- Cross-cutting always runs
- A file belongs to one domain only (Clara `.cs` → AI, not Backend)
- Config files (`appsettings*.json`, `docker-compose*.yml`) → Cross-cutting
- Test files route to parent domain (`Clara.UnitTests/` → AI)

## Agent Flow

### Step 1: Gather Context (sequential)

```
git diff {base}...HEAD --name-only   → changed files list
git diff {base}...HEAD               → full diff
git log {base}...HEAD --oneline      → commit history
→ Route files to domains
```

### Step 2: PR Summary Agent (single Sonnet)

Reads full diff + commit history, outputs 3-5 sentence summary + intent.

### Step 3: Domain Review Agents (parallel Sonnet)

One agent per active domain. Each receives:
- Filtered diff (only files for its domain)
- PR summary from Step 2
- Its domain checklist file
- REVIEW.md severity tiers

Each agent outputs a list of issues:
- `file`: path
- `lines`: start-end range
- `severity`: critical / important / nice-to-have
- `category`: from checklist
- `description`: what's wrong
- `suggestion`: how to fix

### Step 4: Confidence Scoring (parallel Haiku)

One Haiku agent per issue, scoring 0-100. Considers:
- Is this a real issue or false positive?
- Is it pre-existing (not introduced in this PR)?
- Would a linter/compiler catch it?
- Is it a pedantic nitpick?

### Step 5: Filter by Mode

| Mode | Threshold | Severities |
|------|-----------|------------|
| strict | ≥ 70 | critical + important + nice-to-have |
| balanced | ≥ 80 | critical + important |
| quick | ≥ 90 | critical only (security + correctness) |

### Step 6: Terminal Report

```
═══════════════════════════════════════════════════════
  PR REVIEW — {current-branch} → {base-branch}
  Mode: {mode} | Threshold: {threshold}+
  Commits: {n} | Files: {n} | Domains: {active domains}
═══════════════════════════════════════════════════════

## Summary
{PR summary from Step 2}

───────────────────────────────────────────────────────
## Critical ({count})
───────────────────────────────────────────────────────

[{DOMAIN}] {title}                                Score: {nn}
  {file}:{line-start}-{line-end}
  Category: {category}
  → {suggestion}

───────────────────────────────────────────────────────
## Important ({count})
───────────────────────────────────────────────────────
{same format}

───────────────────────────────────────────────────────
## Nice to Have ({count})  [hidden in --balanced and --quick]
───────────────────────────────────────────────────────
{same format}

═══════════════════════════════════════════════════════
  Totals: {n} critical | {n} important | {n} nice-to-have
  Reviewed by: {domain agents that ran}
  Skipped: {domain agents skipped + reason}
═══════════════════════════════════════════════════════
```

## Checklist Content Sources

### backend.md — .NET / EF Core / MediatR

| Category | Severity | Source |
|----------|----------|--------|
| Authorization on all endpoints (`[Authorize]` + role/policy) | critical | OWASP A01, REVIEW.md |
| Resource ownership check (IDOR prevention) | critical | OWASP A01, REVIEW.md |
| No `FromSqlRaw` with string concatenation | critical | OWASP A05, REVIEW.md |
| FluentValidation on all command/request DTOs | critical | REVIEW.md |
| Partial failure handling with rollback on multi-step mutations | critical | REVIEW.md |
| CancellationToken propagation through async chain | important | Microsoft .NET guidelines |
| No async-void methods | important | Microsoft .NET guidelines |
| IDisposable resources disposed (using statements) | important | Microsoft .NET guidelines |
| MediatR handlers — single responsibility, no business logic in controllers | important | Clean Architecture |
| AutoMapper for DTO mapping (no manual mapping) | important | REVIEW.md |
| No magic strings — use constants classes | important | REVIEW.md |
| Central Package Management (no Version on PackageReference) | important | rules/critical-rules.md |
| Naming: no abbreviations, boolean prefixes, handler prefixes | nice-to-have | REVIEW.md |
| Deliberate trade-offs documented with comments | nice-to-have | REVIEW.md |

### frontend.md — React 19 / TypeScript / RTK Query

| Category | Severity | Source |
|----------|----------|--------|
| No `dangerouslySetInnerHTML` | critical | OWASP, REVIEW.md |
| No `any` types — proper typing on API responses | critical | TypeScript best practices |
| No manual `React.memo` / `useCallback` / `useMemo` | important | React 19 Compiler, REVIEW.md |
| Design tokens only — no raw Tailwind colors | important | rules/frontend/styling.md |
| `clsxMerge` mandatory — no raw `clsx` or string concat | important | rules/critical-rules.md |
| RTK Query: cache invalidation tags on mutations | important | RTK Query best practices |
| Error and loading states handled for async operations | important | React best practices |
| No side effects during render — use `useEffect` | important | rules/frontend/patterns.md |
| useEffect dependencies are specific values, not whole objects | important | rules/frontend/patterns.md |
| Web + Design dual-update rule (shared components) | important | rules/frontend/design-sync.md |
| Error boundaries at critical UI junctions | important | React best practices |
| Accessibility: semantic HTML, ARIA, keyboard nav | important | WCAG 2.1 |
| Mobile-first responsive, touch targets ≥ 40px | nice-to-have | rules/frontend/styling.md |
| `autocomplete` attributes on form inputs | nice-to-have | REVIEW.md |
| Class order: Layout → Sizing → Shape → Colors → Animation → States | nice-to-have | rules/frontend/styling.md |
| Lucide React icons only | nice-to-have | rules/frontend/styling.md |

### ai.md — MCP / RAG / LLM Security

| Category | Severity | Source |
|----------|----------|--------|
| Prompt injection defense — user input wrapped in XML delimiters | critical | OWASP LLM01 |
| MCP tool call authorization and scope validation | critical | MCP security, REVIEW.md |
| PHI audit logging on every MCP tool call touching patient data | critical | HIPAA |
| Session ownership validation (IDOR on SignalR/sessions) | critical | OWASP A01 |
| LLM output sanitized before rendering in UI | critical | OWASP LLM, rules/backend/clara.md |
| RAG data sanitization at ingestion | important | OWASP LLM research |
| SignalR input validation | important | Clara security hardening |
| Token lifecycle — cache with proactive refresh, retry on 401 | important | rules/backend/clara.md |
| FHIR provider pattern compliance (`IFhirProvider`) | important | rules/backend/clara.md |
| Cost strategy adherence — model selection per rules | nice-to-have | rules/backend/clara.md |
| Clinical skill YAML frontmatter format | nice-to-have | rules/backend/clara.md |

### crosscutting.md — HIPAA / OWASP / Architecture

| Category | Severity | Source |
|----------|----------|--------|
| No hardcoded secrets, connection strings, API keys | critical | HIPAA, OWASP A04 |
| PHI never in logs, error messages, or URLs | critical | HIPAA |
| Security headers on all services | critical | OWASP, rules/business/compliance.md |
| No default credentials in config | critical | OWASP A02 |
| No debug endpoints in production config | critical | OWASP A02 |
| CORS properly scoped (not wildcard in production) | important | OWASP A05 |
| Rate limiting on authentication endpoints | important | OWASP A07 |
| Dependency license compliance (MIT, Apache 2.0, BSD, ISC, MPL 2.0) | important | rules/backend/data.md |
| No cross-service direct database access | important | REVIEW.md, Clean Architecture |
| TLS everywhere — no unencrypted connections | important | HIPAA |
| Docker/infra config changes reviewed for security | important | Industry standard |
| Supply chain — no unvetted new dependencies | important | OWASP A03 |
| SBOM / dependency vulnerability scanning | nice-to-have | OWASP 2025 |

## False Positive Suppression

Confidence scorer filters out:
- Pre-existing issues (not introduced in this PR's diff)
- Issues a linter, type checker, or compiler would catch
- Pedantic nitpicks without security/correctness impact
- Likely intentional changes (matching PR intent from summary)
- Issues not on lines the PR modified

## Design Decisions

1. **Terminal only** — no GitHub posting. User acts on findings manually.
2. **Sonnet for review, Haiku for scoring** — reasoning vs. binary judgment cost optimization.
3. **PR summary shared** — domain agents understand full intent, not just their slice.
4. **Cross-cutting always runs** — security/HIPAA violations can hide anywhere.
5. **Single domain per file** — no double-review, Clara files go to AI agent only.
6. **Industry-aligned defaults** — Google, OWASP 2025, HIPAA 2025, Microsoft .NET guidelines. Iterate based on real usage.
7. **Installed to `.claude/skills/`** — project-local, version-controlled, team-shared.
