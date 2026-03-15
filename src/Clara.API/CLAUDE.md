# Clara.API — AI Clinical Companion Context

## Overview
Single .NET service hosting MCP tools, agent orchestration, SignalR hub for real-time clinical sessions. LLM-agnostic via MCP protocol.

## Domain Glossary
| Term | Meaning |
|------|---------|
| **Session** | A real-time clinical encounter: doctor + patient audio → transcript → AI suggestions |
| **TranscriptLine** | One utterance: speaker ("Doctor"/"Patient"), text, timestamp, STT confidence |
| **Suggestion** | AI-generated clinical insight: type (clinical/medication/follow_up/differential), source (batch/on_demand), urgency |
| **Document** | Knowledge base document for RAG pipeline |
| **KnowledgeChunk** | Embedded vector chunk from a document (pgvector) |
| **ClinicalSkill** | YAML workflow template guiding AI through clinical scenarios (stored as files in `skills/core/`) |
| **SpeakerMap** | JSONB dictionary mapping speaker labels to roles |

## Session Lifecycle
```
Active → Paused → Active → Completed
                        → Cancelled
```
Session types: `Consultation`, `Follow-up`, `Review`

## Key Files
| File | Purpose |
|------|---------|
| `Domain/Session.cs` | Session + TranscriptLine + Suggestion entities |
| `Domain/Document.cs` | Knowledge base document entity |
| `Hubs/SessionHub.cs` | SignalR hub for real-time transcription + suggestion streaming |
| `Apis/SessionApi.cs` | REST endpoints for session management |
| `Apis/KnowledgeApi.cs` | RAG document upload/search endpoints |
| `Apis/AnalyticsApi.cs` | AI usage analytics |
| `Apis/AuditApi.cs` | PHI audit log endpoints |
| `Infrastructure/ClaraDbContext.cs` | EF Core + pgvector |
| `Extensions/AIServiceExtensions.cs` | Microsoft.Extensions.AI DI setup |

## Tech Stack
- **STT**: Deepgram (real-time audio transcription)
- **LLM**: Tiered — GPT-4o-mini (90% batch) + Claude Sonnet 4 (10% on-demand)
- **Embeddings**: text-embedding-3-small via OpenAI
- **Vector DB**: pgvector (PostgreSQL extension)
- **Real-time**: SignalR (`@microsoft/signalr` on frontend)
- **AI Abstraction**: Microsoft.Extensions.AI (vendor-agnostic)

## Port: 5005 | API Prefix: `/api/clara`
