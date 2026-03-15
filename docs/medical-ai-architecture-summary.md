# Clara — MCP-Native Clinical Companion Architecture

## Overview

**Clara** is a real-time AI clinical companion that listens to doctor-patient conversations, identifies each speaker, and provides live clinical suggestions to the doctor. Built on the Model Context Protocol (MCP) for LLM-agnostic operation — any model works behind the protocol.

> **Educational Project**: Reference architecture for MCP-native healthcare AI. Not intended for production use with real patient data.

---

## Core User Flow

```
Doctor places phone in room → records live conversation
        ↓
Audio streamed in real-time to Clara.API (session tools)
        ↓
Speech-to-Text converts audio → transcript with speaker labels
        ↓
Clara Agent orchestrates MCP tool calls:
  → fhir_* tools: patient context, history, medications
  → knowledge_* tools: RAG search for clinical guidance
  → session_* tools: transcript context, session memory
        ↓
Suggestions appear live on Doctor's dashboard (tablet/PC)
Doctor can press "Clara" button for on-demand analysis
```

---

## System Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                Doctor Dashboard / Mobile App                    │
│              Live transcript · Clara button                │
│                    Suggestion cards                              │
└──────────────────────┬────────────────────────────────────────┘
                       │ SignalR (real-time)
┌──────────────────────▼────────────────────────────────────────┐
│                    Clara.API                                │
│  • MCP Server (fhir_*, knowledge_*, session_* tools)           │
│  • Agent orchestration (batched + on-demand)                    │
│  • SignalR hub (real-time transcript)                          │
│  • Clinical skills from YAML files                              │
└───────┬──────────────────────────────────────────────────────┘
        │              
        ▼              
  MediTrack APIs + PostgreSQL + pgvector
```

---

## Two-Layer Security Model

Inspired by the SMART on FHIR standard and LangCare's provider pattern.

```
Layer 1: User ↔ MCP Client          Layer 2: MCP Server ↔ EMR Backend
┌──────────┐    OIDC/JWT    ┌──────────┐    SMART on FHIR    ┌──────────┐
│  Doctor   │──────────────►│ Clara    │    OAuth2            │  EMR     │
│  (User)   │   session     │ Agent    │───────────────────►│  (Epic/  │
│           │◄──────────────│ (MCP     │   Bearer token       │  Cerner/ │
│           │   consent     │  Client) │◄───────────────────│  FHIR)   │
└──────────┘                └──────────┘                      └──────────┘
```

**Layer 1** — User authenticates via Duende IdentityServer (OIDC). Agent gets user context + consent.

**Layer 2** — MCP server holds service credentials registered with EMR. Authenticates via:
- **Epic**: JWT Bearer Grant (RS384-signed JWT → exchange for access token)
- **Cerner**: OAuth2 Client Credentials Flow
- **MediTrack internal**: Direct API calls (no external OAuth needed initially)

### Layer 2 Token Lifecycle

EMR tokens expire. Each `IFhirProvider` implementation manages its own token lifecycle:

1. **Token cache** — thread-safe `SemaphoreSlim` with double-check locking pattern
2. **Proactive refresh** — refresh token 60 seconds before expiry (not on 401)
3. **Retry on 401** — if a cached token is rejected, force-refresh once and retry the request. If the retry also fails, propagate the error.
4. **Expiry tracking** — store `ExpiresAt` alongside the cached token; compare against `DateTimeOffset.UtcNow`

```
Request → Check cache → Token valid? → Use it
                       → Token expiring soon? → Background refresh, use current
                       → Token expired? → Block, refresh, then use new token
                       → 401 response? → Force refresh once, retry
```

---

## MCP Server (Single .NET Service)

### Clara.API — Unified MCP + Agent + SignalR Service

Single .NET service hosting all MCP tools, agent orchestration, and real-time communication. At 3,000 users (~30 concurrent sessions, 1.5 vector QPS), there is zero performance justification for separate containers. Split later only if a specific tool category needs independent scaling.

**FHIR Tools** — maps MediTrack domain models to FHIR R4 resources:

| Tool | Description |
|------|-------------|
| `fhir_read` | Read a FHIR resource by type and ID |
| `fhir_search` | Search FHIR resources with query parameters |
| `fhir_create` | Create a new FHIR resource |
| `fhir_update` | Update an existing FHIR resource |

Calls existing domain APIs (Patient.API, MedicalRecords.API) via HTTP, returns FHIR R4 JSON. Domain services stay clean.

**FHIR Provider Pattern** — `IFhirProvider` interface:

| Provider | Auth Strategy | Status |
|----------|--------------|--------|
| MediTrack internal | Direct API calls with existing JWT | Phase 6 |
| Epic | JWT Bearer Grant (RS384) | Phase 8 (YAGNI until real credentials) |
| Cerner | OAuth2 Client Credentials | Phase 8 (YAGNI until real credentials) |

**Knowledge Tools** — RAG pipeline with pgvector:

| Tool | Description |
|------|-------------|
| `knowledge_search` | Embed query → pgvector cosine similarity → top-K relevant chunks |
| `knowledge_upload` | Chunk document → embed → store in pgvector |
| `knowledge_list` | List available knowledge base documents and categories |

**Session Tools** — real-time audio transcription:

| Tool | Description |
|------|-------------|
| `session_start` | Initialize a new consultation session (SignalR hub) |
| `session_transcript` | Get current transcript with speaker labels |
| `session_suggest` | Get AI suggestions for current session context |

### SignalR Hub — `SessionHub` (`/sessionHub`)

| Method (client → server) | Behavior |
|--------------------------|----------|
| `JoinSession(sessionId)` | Adds connection to group; immediately sends `SessionUpdated` with current session state so the client `useSession()` hook is hydrated on connect |
| `LeaveSession(sessionId)` | Removes connection from group |
| `StreamAudioChunk(sessionId, audioBase64)` | Decodes base64 audio, calls Deepgram REST, infers speaker (async EF Core), broadcasts `TranscriptLineAdded`, triggers batch check |
| `SendTranscriptLine(sessionId, speaker, text)` | Manual transcript input (dev/test — no mic required), broadcasts `TranscriptLineAdded`, triggers batch check |

| Event (server → client) | Payload |
|--------------------------|---------|
| `SessionJoined` | `sessionId` string |
| `SessionUpdated` | `SessionResponse` (full session state with transcript + suggestions) |
| `TranscriptLineAdded` | `TranscriptLineResponse` |
| `SuggestionAdded` | `SuggestionResponse` |
| `SttError` | Error message string |

---

## Clinical Skills Library

Skills are structured Markdown/YAML files that guide the AI agent through clinical workflows. Not code — they teach the agent **what MCP tools to call and how to interpret results**.

### Storage Strategy (MVP)

**YAML files only** — stored in `skills/core/` (repo), loaded into memory at startup. No DB persistence, no admin UI for MVP.

**Rationale**: Skills change rarely (they're medical workflows). A code deploy updates them. The complexity of DB seeding, version tracking, admin UI, and DB overrides is YAGNI for 3,000 users.

**Future enhancement** (Phase 8+): Add `ClinicalSkill` DB table + admin UI when you have a real admin who needs to edit skills without deploying.

### Format

```yaml
---
id: medication-reconciliation
category: medication-management
fhir_resources: [MedicationRequest, MedicationStatement, AllergyIntolerance]
terminologies: [RxNorm, SNOMED CT]
---

# Medication Reconciliation

## When to activate
- New patient encounter
- Patient reports medication changes
- Discrepancies detected between reported and recorded medications

## Workflow
1. Call `fhir_search` for active MedicationRequests
2. Call `fhir_search` for MedicationStatements
3. Compare lists for discrepancies
4. Check `fhir_search` for AllergyIntolerance
5. Flag drug-drug interactions using knowledge base
```

### Skill Categories (Reference)

| Category | Examples |
|----------|---------|
| **Medication Management** | Reconciliation, drug interactions, adherence scoring |
| **Clinical Decision Support** | Sepsis screening (SOFA), cardiovascular risk (ASCVD), VTE risk |
| **Documentation** | SOAP notes, H&P, discharge summaries |
| **Patient Data Summary** | Demographics, problem list, allergies, clinical summary |
| **Care Coordination** | Discharge planning, referrals, care gaps |

Skills use standard terminologies: SNOMED CT, LOINC, RxNorm, ICD-10.

---

## Agent Prompt Architecture

Agent prompts follow a structured pattern. Prompts are stored in DB/MCP resources, never hardcoded in source code.

| Section | Purpose |
|---------|---------|
| **Operational Guidelines** | Privacy rules, data accuracy, workflow patterns |
| **Tool Reference** | 4 FHIR tools + knowledge + session tools with input schemas and examples |
| **Common Resource Types** | Patient, Observation, Condition, MedicationRequest |
| **Search Patterns** | FHIR query parameter syntax |
| **Workflow Patterns** | Search Flow, Create/Update Flow, Clinical Data Review, Clinical Documentation |
| **Privacy Guidelines** | Partial identifiers, PHI handling, HIPAA compliance |
| **Error Handling** | Empty results, missing data, unusual values |

### Batching Strategy

Do NOT call the AI on every word. Use this logic:
- Call AI every **5 patient utterances** OR every **60 seconds**, whichever comes first
- **On-demand trigger**: Doctor presses "Clara" button — overrides batch timer, immediate analysis
- Include last 10 transcript lines + top-K RAG chunks as context
- Audio chunk interval: **1000ms** (MediaRecorder `timeslice`) — balances transcript quality against Deepgram API call volume

### LLM Call Parameters

```csharp
new ChatOptions
{
    Temperature = 0.3f,       // Low temperature for consistent clinical output
    MaxOutputTokens = 300,    // Bounded to prevent runaway costs
    ResponseFormat = ChatResponseFormat.Json  // Enforces structured output
}
```

---

## PHI Audit Logging

Every MCP tool call that touches patient data gets audit-logged:

```
[AUDIT] PHI_ACCESS operation=fhir_read resource_type=Patient resource_id=erXuFY...
        user=<user_id> token_hash=<sha256> status=success
        operation_context=mcp_tool_call tool_name=fhir_read
```

- Resource IDs truncated (first 8 chars + "...")
- Tokens stored as SHA256 hash only
- PHI scrubbing enabled by default
- Fire-and-forget pattern (audit never crashes business operations)
- Uses existing `PHIAuditEventHandlerBase<T>` pattern from Notification.Worker
- **`operation_context` field** distinguishes AI-driven access (`mcp_tool_call`) from manual doctor access (`ui_view`)

---

## Database Schema

### Session & Transcript (PostgreSQL — implemented)

```
Session         { Id, DoctorId, PatientId, StartedAt, EndedAt, Status,
                  SessionType (text — 'Consultation'|'Follow-up'|'Review', default 'Consultation'),
                  AudioRecorded (bool), SpeakerMap (jsonb — SpeakerLabel → Role) }
TranscriptLine  { Id, SessionId, Speaker, Text, Timestamp,
                  Confidence (float — STT confidence score, flag low-confidence lines) }
Suggestion      { Id, SessionId, Content, TriggeredAt, Type, Source,
                  Urgency (low/medium/high), Confidence (float) }
```

EF Core migrations: `20260301000000_InitialCreate`, `20260301000001_AddSessionType`.

### Knowledge Base (PostgreSQL + pgvector — implemented)

```
KnowledgeChunk  { Id, DocumentName, Content, Embedding(vector(1536)), Category, CreatedAt,
                  ChunkIndex (int — ordering within source document) }
Document        { Id, FileName, UploadedAt, ChunkCount, UploadedBy (UserId) }
```

HNSW index: `USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)`.
Similarity threshold: **0.7** (cosine similarity). Requests below this score are filtered before reaching the LLM.

Note: No `ClinicalSkill` table in MVP — skills are YAML files loaded into memory. Add DB persistence in Phase 8+ if needed.

### Agent Configuration (PostgreSQL — planned Phase 7+)

```
AgentConfig     { Id, SystemPrompt, SuggestionEveryNLines,
                  MinRelevanceScore, EnableWarnings, EnableQuestions, UpdatedAt }
AgentPrompt     { Id, Section, Content, Version, UpdatedAt }
```

---

## Integration Tests

`tests/Clara.IntegrationTests/` — xUnit project using `WebApplicationFactory<Program>`.

**Requirements**: Real PostgreSQL instance with pgvector extension. Set `CLARA_TEST_DB` env var (default: `Host=localhost;Database=meditrack_clara_test;...`). The in-memory EF Core provider is **not supported** because the EF Core model uses pgvector `vector(1536)` column types and JSONB, which are PostgreSQL-specific.

```bash
CLARA_TEST_DB="Host=localhost;Database=meditrack_clara_test;Username=meditrack;Password=meditrack" dotnet test tests/Clara.IntegrationTests
```

| Test Class | Tests |
|------------|-------|
| `SessionLifecycleTests` | Start session (201), get unknown (404), end session (200 + completed status), double-end (400) |
| `KnowledgeSearchTests` | Empty knowledge base returns empty results, blank query returns 400 |
| `SignalRHubTests` | Connect to hub succeeds, `JoinSession` with valid ID does not throw |

---

## Product Features

### Doctor Experience
- **Live transcript** — real-time conversation display with speaker labels
- **Session types** — Consultation, Follow-up, or Review (selected at session start, stored per session)
- **Clara button** — on-demand trigger overrides batch timer for immediate analysis
- **Suggestion cards** — contextual clinical suggestions with type badge and urgency indicator (no internal routing labels shown)
- **Mobile voice capture** — Web Audio API, 1-second audio chunks for real-time transcription

### Admin Experience
- **AI management panel** — agent config, clinical skills editor, usage dashboard
- **Knowledge base CRUD** — upload/manage medical guidelines, protocols, drug references
- **Session monitoring** — view live and past sessions, transcripts, suggestions
- **Suggestion review** — mark suggestions as good/bad for feedback loop

### Session Memory
- **Transcript persistence** — full conversation stored per session
- **Cross-session patient memory** — agent recalls relevant history from prior visits
- **Chat history management** — via session_* MCP tools in Clara.API

---

## Key Design Decisions

**Why MCP over direct API calls?** — LLM-agnostic. No vendor lock-in. Any model works behind the protocol. Tools are discoverable and self-documenting.

**Why single Clara.API instead of 3 separate MCP servers?** — At 3,000 users (~30 concurrent sessions, 1.5 vector QPS), there is zero performance justification for separate containers. Single process handles this trivially. Adds: 3 fewer containers, simpler deployment, faster development, ~$210-420/mo infra savings. Split later only if a specific tool category needs independent scaling.

**Why defer Epic/Cerner providers?** — No Epic sandbox access, no Cerner credentials. The `IFhirProvider` interface exists for future extensibility (costs nothing), but implementing providers for systems you don't have access to is pure waste. Build them when you have a real integration partner (YAGNI).

**Why YAML files instead of DB + admin UI for skills?** — Skills change rarely (they're medical workflows). A code deploy updates them. The complexity of DB seeding, version tracking, admin UI, and DB overrides is YAGNI for 3,000 users. Add DB persistence only when you have a real admin who needs to edit skills without deploying.

**Why no separate FHIR R4 facade?** — The MCP server's `fhir_*` tools ARE the FHIR interface. They call domain APIs directly and return FHIR R4 JSON. Building a separate REST FHIR API that the MCP server then calls is an extra layer with no value.

**Why SMART on FHIR in Phase 8 not Phase 6?** — SMART on FHIR is only needed for external EMR integration (Epic, Cerner). MediTrack internal calls use existing JWT from Duende IdentityServer. No point building OAuth2 flows for systems you're not integrating with yet.

**Why SMART on FHIR?** — OAuth2 industry standard for healthcare. Required for Epic/Cerner integration. Two-layer security separates user auth from backend auth.

**Why SignalR over raw WebSocket?** — Built into ASP.NET Core, handles reconnections, React client library available (`@microsoft/signalr`).

**Why batch AI calls?** — Don't call the LLM on every word. Batch every 5 patient utterances or every 60 seconds to reduce latency and API costs. On-demand button overrides this.

**Why pgvector over a separate vector DB?** — Keeps the stack simple (one PostgreSQL instance), EF Core support via `pgvector-dotnet`, no extra infrastructure.

**Audio not stored** — only transcript text hits the database. Important for HIPAA compliance. Optional: encrypted audio retention for configurable period (default off), then auto-delete.

**Speaker identification** — STT providers return generic labels ("Speaker A / Speaker B"). We use a layered approach:
1. **Explicit**: Doctor presses "Start Session" → first speaker is Doctor (deterministic)
2. **Trigger phrase** (optional): "This is Dr. Smith beginning consultation"
3. **LLM confirmation**: Doctor asks questions / uses medical terms; Patient describes symptoms
4. **Stored mapping**: `SpeakerLabel → Role` persisted per session — once resolved, not re-inferred

---

## Cost Modeling (3,000 Users)

### Assumptions

| Metric | Value | Rationale |
|--------|-------|-----------|
| Total users | 3,000 | Given |
| Doctors | 300 (10%) | 1 doctor per 10 users (typical clinic ratio) |
| Peak concurrent sessions | ~30 | Not every online doctor is in live session |
| Avg session duration | 15 min | Typical GP consultation |
| Sessions per doctor/day | ~15 | Full day of consultations |
| Total sessions/day | ~4,500 | 300 doctors × 15 sessions |
| Total audio hours/day | ~1,125 hr | 4,500 × 15 min |

### Monthly Cost Ranges

| Scenario | STT | LLM | Infrastructure | Total | Per Doctor | Notes |
|----------|-----|-----|----------------|-------|------------|-------|
| **Budget** | $1,020 | $747 | $1,485 | **$3,252** | $10.84 | Self-hosted Whisper + mini only |
| **Mid (recommended)** | $6,385 | $1,400 | $1,270 | **$9,055** | $30.18 | Deepgram + tiered LLM + adaptive batching |
| **Premium** | $9,158 | $8,010 | $1,485 | **$18,653** | $62.18 | AssemblyAI + Sonnet for all calls |

### Cost Drivers

**STT (54-82% of AI costs)**: Deepgram Nova-2 Medical recommended for MVP ($6,385/mo). Self-hosted Whisper saves ~$5K/mo but requires 2-3 months engineering (real-time streaming + pyannote.audio for diarization). ROI: 9 months.

**LLM (18-46% of AI costs)**: Tiered strategy is critical:
- 90% routine batched calls → GPT-4o-mini: $1,122/mo
- 10% on-demand doctor triggers → Claude Sonnet 4: $278/mo
- Total: $1,400/mo (vs. $8,010/mo for all-Sonnet)

**Embeddings**: Negligible (~$3/mo with text-embedding-3-small)

**Infrastructure**: 7 containers (6 backend services + frontend), PostgreSQL, RabbitMQ, Redis cache for scaling

### Call Volume Math

With 5-patient-utterance batching:
- Typical consultation: ~5-8 combined utterances/min
- 5 patient utterances ≈ every 90 seconds
- 15-min session = ~10 LLM calls (not 30)
- 4,500 sessions/day × 10 = **45,000 calls/day** (not 135K)
- With adaptive batching: **~27,000 calls/day** (40% reduction)

This significantly reduces LLM costs from initial estimates.

---

## Reference Sources

| Source | What we take from it |
|--------|---------------------|
| [LangCare MCP FHIR](https://github.com/langcare/langcare-mcp-fhir) | 4 generic FHIR tools, provider pattern, two-layer security, clinical skills library (40+), agent prompt architecture, PHI audit logging |
| [AgentCare MCP](https://mcp.so/server/agentcare-mcp) | 13 FHIR tools, OAuth2 auth flow, PubMed/ClinicalTrials/FDA research tools |
| [Keragon MCP for EMRs](https://www.keragon.com/blog/ai-agents-and-mcp-for-emrs) | MCP as EMR interoperability layer concept |
| [SMART on FHIR](https://build.fhir.org/ig/HL7/smart-app-launch/) | OAuth2 authorization framework for healthcare |

**All implementations will be our own .NET code** — these are reference patterns only.

---

## STT Provider Analysis

| Provider | Real-Time | Diarization | Medical Vocab | Self-Hosted | Cost |
|----------|-----------|-------------|---------------|-------------|------|
| **AssemblyAI** | Yes (WebSocket) | Yes (built-in) | Good | No | ~$0.37/hr |
| **Deepgram** | Yes (WebSocket) | Yes (built-in) | Good (Nova-2 Medical) | No | ~$0.25/hr |
| **Whisper** (OpenAI API) | No (batch only) | No | Good | No | ~$0.36/hr |
| **Whisper** (self-hosted) | Possible (custom) | No (need pyannote.audio) | Good | Yes | Compute only |

**Recommendation**:
- **Phase 6 (MVP)**: Deepgram or AssemblyAI — proven real-time + diarization out of the box
- **Future optimization**: Self-hosted Whisper + pyannote.audio for zero external dependency

**Decision**: To be finalized before Phase 6c implementation.

## Prompt Size Strategy

The agent system prompt spans multiple sections (operational guidelines, tool reference, resource types, search patterns, workflow patterns, privacy, error handling). This can grow large.

**Approach**: Compose prompts dynamically per session:
- **Base prompt** (always included): operational guidelines, tool reference, privacy, error handling
- **Skill-specific prompt** (appended when skill activates): workflow steps for the active clinical skill
- **Session context** (appended per call): last 10 transcript lines + top-K RAG chunks

This keeps per-call token usage bounded while supporting many skills.

---

## Open Questions

1. Single clinic or multi-tenant (multiple clinics, each with their own knowledge base)?
2. Should suggestions generate a post-session summary report?
3. Target languages for multilingual support?
4. PubMed/ClinicalTrials.gov/openFDA integration priority?
5. FHIR validation: use `Hl7.Fhir.R4` NuGet package models or manual JSON mapping?
