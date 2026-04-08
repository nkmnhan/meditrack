---
applyTo: "src/Clara.API/**,skills/**"
---

# Clara AI / MCP Rules

## Architecture

- **Clara.API** = single .NET service hosting MCP tools + agent orchestration + SignalR hub
- **MCP-native**: LLM-agnostic, no vendor lock-in. Use MCP abstractions — never vendor names in code
- **User-facing name**: Clara (never "MCP server" or model names in UI)

## MCP Tools

| Category  | Tools                                              | Responsibility                                      |
|-----------|----------------------------------------------------|-----------------------------------------------------|
| FHIR      | `fhir_read`, `fhir_search`, `fhir_create`, `fhir_update` | Calls domain APIs via HTTP, returns FHIR R4 JSON |
| Knowledge | `knowledge_search`, `knowledge_upload`, `knowledge_list` | RAG pipeline — embed docs, pgvector search     |
| Session   | `session_start`, `session_transcript`, `session_suggest` | Audio → STT → transcript + diarization         |

## Two-Layer Security

| Layer   | Flow                             | Mechanism                              |
|---------|----------------------------------|----------------------------------------|
| Layer 1 | User ↔ Clara Agent               | OIDC via Duende IdentityServer         |
| Layer 2 | MCP Server ↔ EMR Backend         | SMART on FHIR / OAuth2 provider pattern |

## FHIR Provider Pattern

Use `IFhirProvider` with per-EMR implementations. Only MediTrack internal provider now (YAGNI).

## Clinical Skills

YAML frontmatter + Markdown body files in `skills/core/`. Loaded at startup, no DB for MVP.
Each skill has: `name`, `triggers` (keyword list), `priority` (higher = more urgent).

## PHI / Audit (MANDATORY)

- Every MCP tool call touching patient data **must** be audit-logged via `IPHIAuditService`
- Audit is best-effort — wrapped in try/catch; failures must never interrupt clinical workflows
- Never log PHI in application logs

## Token Lifecycle

- Cache tokens with proactive refresh (60 seconds before expiry)
- Retry on 401 with token refresh before failing

## Cost Strategy — LLM Routing

| Use Case                | Model            | Trigger                                      |
|-------------------------|------------------|----------------------------------------------|
| Batch suggestions (90%) | GPT-4o-mini      | Every 5 patient utterances OR 60s (whichever first) |
| On-demand Clara (10%)   | Claude Sonnet 4  | Direct user request to Clara                 |
| Urgent bypass           | GPT-4o-mini (immediate) | Keywords: "chest pain", "can't breathe", "seizure", etc. |

## ReAct Agent Loop

`SuggestionService` uses `FunctionInvokingChatClient` ReAct loop. The LLM decides which tools
to call based on conversation context — do not hardcode the tool-call sequence.

## Naming

- MCP server classes: `*McpServer` suffix
- SignalR hubs: `*Hub` suffix
- Prompts/skills: stored in DB/MCP resources or `skills/core/*.yaml` — never hardcoded in C# strings
