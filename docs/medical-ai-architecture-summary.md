# Emergen AI — MCP-Native Clinical Companion Architecture

## Overview

**Emergen AI** is a real-time AI clinical companion that listens to doctor-patient conversations, identifies each speaker, and provides live clinical suggestions to the doctor. Built on the Model Context Protocol (MCP) for LLM-agnostic operation — any model works behind the protocol.

> **Educational Project**: Reference architecture for MCP-native healthcare AI. Not intended for production use with real patient data.

---

## Core User Flow

```
Doctor places phone in room → records live conversation
        ↓
Audio streamed in real-time to Session MCP Server
        ↓
Speech-to-Text converts audio → transcript with speaker labels
        ↓
Emergen AI Agent orchestrates MCP tool calls:
  → FHIR MCP Server: patient context, history, medications
  → Knowledge MCP Server: RAG search for clinical guidance
  → Session MCP Server: transcript context, session memory
        ↓
Suggestions appear live on Doctor's dashboard (tablet/PC)
Doctor can press "Emergen AI" button for on-demand analysis
```

---

## System Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                Doctor Dashboard / Mobile App                    │
│              Live transcript · Emergen AI button                │
│                    Suggestion cards                              │
└──────────────────────┬────────────────────────────────────────┘
                       │ SignalR (real-time)
┌──────────────────────▼────────────────────────────────────────┐
│              Emergen AI Agent (MCP Client)                      │
│   Orchestrates clinical workflows via MCP tool calls            │
│   LLM-agnostic — calls any model behind MCP protocol            │
│   On-demand trigger + batched (every 5 utterances / 30s)       │
│   Clinical skills library guides agent behavior                 │
└───────┬──────────────┬──────────────┬─────────────────────────┘
        │ MCP          │ MCP          │ MCP
        ▼              ▼              ▼
  ┌───────────┐  ┌──────────────┐  ┌──────────────┐
  │ FHIR MCP  │  │ Knowledge    │  │ Session MCP  │
  │ Server    │  │ MCP Server   │  │ Server       │
  │ (.NET)    │  │ (.NET)       │  │ (.NET)       │
  │           │  │              │  │              │
  │ fhir_read │  │ Embed query  │  │ Audio stream │
  │ fhir_     │  │ → pgvector   │  │ → STT        │
  │ search    │  │ → top-K      │  │ → transcript │
  │ fhir_     │  │ relevant     │  │ → speaker ID │
  │ create    │  │ medical docs │  │              │
  │ fhir_     │  │              │  │ Chat history │
  │ update    │  │ Clinical     │  │ management   │
  │           │  │ skills lib   │  │              │
  └─────┬─────┘  └──────┬───────┘  └──────────────┘
        │               │
        ▼               ▼
  MediTrack          PostgreSQL
  Domain APIs        + pgvector
  (Patient, Appt,    (knowledge base)
   Records)
```

---

## Two-Layer Security Model

Inspired by the SMART on FHIR standard and LangCare's provider pattern.

```
Layer 1: User ↔ MCP Client          Layer 2: MCP Server ↔ EMR Backend
┌──────────┐    OIDC/JWT    ┌──────────┐    SMART on FHIR    ┌──────────┐
│  Doctor   │──────────────►│ Emergen  │    OAuth2            │  EMR     │
│  (User)   │   session     │ AI Agent │───────────────────►│  (Epic/  │
│           │◄──────────────│ (MCP     │   Bearer token       │  Cerner/ │
│           │   consent     │  Client) │◄───────────────────│  FHIR)   │
└──────────┘                └──────────┘                      └──────────┘
```

**Layer 1** — User authenticates via Duende IdentityServer (OIDC). Agent gets user context + consent.

**Layer 2** — MCP server holds service credentials registered with EMR. Authenticates via:
- **Epic**: JWT Bearer Grant (RS384-signed JWT → exchange for access token)
- **Cerner**: OAuth2 Client Credentials Flow
- **MediTrack internal**: Direct API calls (no external OAuth needed initially)

---

## MCP Servers (All .NET, Built By Us)

### FHIR MCP Server

Maps MediTrack domain models to FHIR R4 resources. Provider pattern for multi-EMR auth.

| Tool | Description |
|------|-------------|
| `fhir_read` | Read a FHIR resource by type and ID |
| `fhir_search` | Search FHIR resources with query parameters |
| `fhir_create` | Create a new FHIR resource |
| `fhir_update` | Update an existing FHIR resource |

**FHIR Provider Pattern** — `IFhirProvider` interface with per-EMR implementations:

| Provider | Auth Strategy | Token Handling |
|----------|--------------|----------------|
| Epic | JWT Bearer Grant (RS384) | Token cache with thread-safe double-check locking |
| Cerner | OAuth2 Client Credentials | Token cache with expiry tracking |
| Generic | Bearer / Basic / None | Configurable per-instance |
| MediTrack internal | Direct API calls | JWT from Layer 1 auth |

### Knowledge MCP Server

RAG pipeline — embed medical docs, pgvector search. Hosts the clinical skills library.

| Tool | Description |
|------|-------------|
| `knowledge_search` | Embed query → pgvector cosine similarity → top-K relevant chunks |
| `knowledge_upload` | Chunk document → embed → store in pgvector |
| `knowledge_list` | List available knowledge base documents and categories |

### Session MCP Server

Real-time audio → STT → transcript with speaker diarization. Chat history and session memory.

| Tool | Description |
|------|-------------|
| `session_start` | Initialize a new consultation session |
| `session_transcript` | Get current transcript with speaker labels |
| `session_suggest` | Get AI suggestions for current session context |

---

## Clinical Skills Library

Skills are structured Markdown/YAML files that guide the AI agent through clinical workflows. Not code — they teach the agent **what MCP tools to call and how to interpret results**.

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
- Call AI every **5 patient utterances** OR every **30 seconds**, whichever comes first
- **On-demand trigger**: Doctor presses "Emergen AI" button — overrides batch timer, immediate analysis
- Include last 10 transcript lines + top-K RAG chunks as context

---

## PHI Audit Logging

Every MCP tool call that touches patient data gets audit-logged:

```
[AUDIT] PHI_ACCESS operation=fhir_read resource_type=Patient resource_id=erXuFY...
        user=<user_id> token_hash=<sha256> status=success
```

- Resource IDs truncated (first 8 chars + "...")
- Tokens stored as SHA256 hash only
- PHI scrubbing enabled by default
- Fire-and-forget pattern (audit never crashes business operations)
- Uses existing `PHIAuditEventHandlerBase<T>` pattern from Notification.Worker

---

## Database Schema (Planned)

### Session & Transcript (PostgreSQL)

```
Session         { Id, DoctorId, PatientId, StartedAt, EndedAt, Status }
TranscriptLine  { Id, SessionId, Speaker, Text, Timestamp }
Suggestion      { Id, SessionId, Content, TriggeredAt, Type, Source }
```

### Knowledge Base (PostgreSQL + pgvector)

```
KnowledgeChunk  { Id, DocumentName, Content, Embedding(vector), Category, CreatedAt }
ClinicalSkill   { Id, SkillId, Category, Content, Version, UpdatedAt }
Document        { Id, FileName, UploadedAt, ChunkCount }
```

### Agent Configuration (PostgreSQL)

```
AgentConfig     { Id, SystemPrompt, SuggestionEveryNLines,
                  MinRelevanceScore, EnableWarnings, EnableQuestions, UpdatedAt }
AgentPrompt     { Id, Section, Content, Version, UpdatedAt }
```

---

## Product Features

### Doctor Experience
- **Live transcript** — real-time conversation display with speaker labels
- **Emergen AI button** — on-demand trigger overrides batch timer for immediate analysis
- **Suggestion cards** — contextual clinical suggestions with urgency levels
- **Mobile voice capture** — Web Audio API, PWA-ready

### Admin Experience
- **AI management panel** — agent config, clinical skills editor, usage dashboard
- **Knowledge base CRUD** — upload/manage medical guidelines, protocols, drug references
- **Session monitoring** — view live and past sessions, transcripts, suggestions
- **Suggestion review** — mark suggestions as good/bad for feedback loop

### Session Memory
- **Transcript persistence** — full conversation stored per session
- **Cross-session patient memory** — agent recalls relevant history from prior visits
- **Chat history management** — via Session MCP Server tools

---

## Key Design Decisions

**Why MCP over direct API calls?** — LLM-agnostic. No vendor lock-in. Any model works behind the protocol. Tools are discoverable and self-documenting.

**Why build our own MCP servers?** — Full control over FHIR tools, knowledge base, clinical skills, and agent orchestration. Reference patterns from LangCare and AgentCare inform design, but implementation is our own .NET code.

**Why SMART on FHIR?** — OAuth2 industry standard for healthcare. Required for Epic/Cerner integration. Two-layer security separates user auth from backend auth.

**Why SignalR over raw WebSocket?** — Built into ASP.NET Core, handles reconnections, React client library available (`@microsoft/signalr`).

**Why batch AI calls?** — Don't call the LLM on every word. Batch every 5 patient utterances or every 30 seconds to reduce latency and API costs. On-demand button overrides this.

**Why pgvector over a separate vector DB?** — Keeps the stack simple (one PostgreSQL instance), EF Core support via `pgvector-dotnet`, no extra infrastructure.

**Audio not stored** — only transcript text hits the database. Important for HIPAA compliance.

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

## Open Questions

1. Which STT provider? (AssemblyAI, Deepgram, or open-source Whisper)
2. Single clinic or multi-tenant (multiple clinics, each with their own knowledge base)?
3. Should suggestions generate a post-session summary report?
4. Target languages for multilingual support?
5. PubMed/ClinicalTrials.gov/openFDA integration priority?
