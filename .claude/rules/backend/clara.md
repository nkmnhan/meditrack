---
paths:
  - "src/Clara.API/**"
  - "skills/**"
  - "tests/Clara.*/**"
---

<!-- maintainer: paths: ["src/Clara.API/**", "skills/**", "tests/Clara.*/**"]
     Loads when editing Clara AI service files. MCP architecture, cost strategy, PHI rules.
     Keep under 60 lines. -->

# Clara / MCP / AI Rules

## Architecture

- **Clara.API** = single .NET service hosting MCP tools + agent orchestration + SignalR hub
- **MCP-native**: LLM-agnostic, no vendor lock-in. Use MCP abstractions, NEVER LLM vendor names in code
- **User-facing name**: Clara

## MCP Tools

| Category | Tools | Responsibility |
|----------|-------|----------------|
| FHIR | `fhir_read`, `fhir_search`, `fhir_create`, `fhir_update` | Calls domain APIs via HTTP, returns FHIR R4 JSON |
| Knowledge | `knowledge_search`, `knowledge_upload`, `knowledge_list` | RAG pipeline — embed docs, pgvector search |
| Session | `session_start`, `session_transcript`, `session_suggest` | Audio → STT → transcript + diarization |

## Two-Layer Security

| Layer | Flow | Mechanism |
|-------|------|-----------|
| Layer 1 | User ↔ Clara Agent | OIDC via Duende IdentityServer |
| Layer 2 | MCP Server ↔ EMR Backend | SMART on FHIR / OAuth2 provider pattern |

## Mandatory Rules

- PHI audit: every MCP tool call touching patient data MUST be audit-logged
- Token lifecycle: cache with proactive refresh (60s before expiry), retry on 401
- Prompts/skills stored in DB/MCP resources, NEVER hardcoded
- FHIR Provider Pattern: `IFhirProvider` with per-EMR implementations
- Clinical Skills: YAML frontmatter + Markdown body files in `skills/core/`

## Naming

- MCP server classes: `*McpServer` suffix
- SignalR hubs: `*Hub` suffix

## Cost Strategy

- Routine batched suggestions: GPT-4o-mini (90% of calls)
- On-demand Clara: Claude Sonnet 4 (10% of calls)
- Batch trigger: every 5 patient utterances OR 60s, whichever first
- Immediate bypass for urgent keywords ("chest pain", "can't breathe")
