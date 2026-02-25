# Medical AI Secretary — Architecture Summary

## Project Overview

A real-time AI-powered medical assistant that listens to doctor-patient conversations, identifies each speaker, and provides live clinical suggestions to the doctor — acting like an AI secretary in the room.

---

## Core User Flow

```
Doctor places phone in room → records live conversation
        ↓
Audio streamed in real-time to backend
        ↓
Speech-to-Text converts audio → transcript with speaker labels
        ↓
AI identifies who is Doctor vs Patient from context
        ↓
AI generates clinical suggestions based on patient's words
        ↓
Suggestions appear live on Doctor's dashboard (tablet/PC)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (monorepo — doctor app + admin app) |
| Real-time transport | SignalR (ASP.NET Core) |
| Backend | ASP.NET Core Web API |
| ORM | EF Core |
| Database | PostgreSQL + pgvector extension |
| Speech-to-Text | AssemblyAI or Deepgram (real-time + speaker diarization) |
| AI / LLM | OpenAI GPT-4o or Claude API |
| Embeddings | OpenAI `text-embedding-3-small` |
| Message Bus | RabbitMQ |
| Architecture base | eShop microservices pattern (replace Blazor → React) |

---

## Architecture (Microservices)

Based on the **dotnet/eShop** reference architecture, adapted for real-time AI use:

```
┌──────────────────────────────────────────────────────┐
│                   REACT CLIENTS                       │
│  Doctor Phone (recording) | Doctor Dashboard (live)   │
│  Admin Panel                                          │
└──────────────────────┬───────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│           API GATEWAY (YARP / Ocelot)                │
│      Auth, Routing, Rate Limiting, HTTPS             │
└────────┬────────────────┬────────────────┬───────────┘
         ↓                ↓                ↓
  ┌────────────┐  ┌──────────────┐  ┌──────────────┐
  │  Session   │  │  AI Agent    │  │    Admin     │
  │  Service   │  │  Service     │  │   Service    │
  │            │  │              │  │              │
  │ SignalR    │  │ OpenAI/      │  │ Knowledge    │
  │ Audio STT  │  │ Claude       │  │ Base CRUD    │
  │ Transcript │  │ RAG (pgvec) │  │ AgentConfig  │
  │            │  │              │  │              │
  │ SQL DB     │  │ PostgreSQL   │  │ SQL DB       │
  │            │  │ + pgvector   │  │              │
  └─────┬──────┘  └──────┬───────┘  └──────────────┘
        │                │
        └───────┬─────────┘
                ↓
       ┌─────────────────┐
       │   RabbitMQ      │
       │  Message Bus    │
       │ transcript →    │
       │ AI processing   │
       └─────────────────┘
```

---

## Key Components

### Session Service
- Receives audio chunks from doctor's phone via **SignalR Hub**
- Forwards audio to AssemblyAI/Deepgram for real-time transcription
- Saves `TranscriptLine` records via EF Core
- Publishes transcript events to RabbitMQ
- Pushes AI suggestions back to doctor's dashboard via SignalR

### AI Agent Service (RAG Pattern)
- Subscribes to transcript events from RabbitMQ
- Embeds patient utterances → searches pgvector for relevant medical knowledge
- Sends context + transcript to OpenAI/Claude
- Returns suggestions: questions to ask, warnings, observations
- Calls AI every ~5 patient utterances (not on every word) to control latency and cost

### Admin Service
- CRUD for knowledge base documents (medical guidelines, protocols, drug references)
- Chunks and embeds uploaded documents → stores in pgvector
- Manages `AgentConfig` (system prompt, model, suggestion frequency, thresholds)
- Session monitoring and suggestion review

---

## Database Schema (EF Core)

### Session & Transcript (SQL)
```
Session         { Id, DoctorId, PatientId, StartedAt, EndedAt, Status }
TranscriptLine  { Id, SessionId, Speaker, Text, Timestamp }
Suggestion      { Id, SessionId, Content, TriggeredAt, Type }
```

### Knowledge Base (PostgreSQL + pgvector)
```
KnowledgeChunk  { Id, DocumentName, Content, Embedding(vector 1536), Category, CreatedAt }
AgentConfig     { Id, SystemPrompt, ModelName, Temperature, SuggestionEveryNLines,
                  MinRelevanceScore, EnableWarnings, EnableQuestions, UpdatedAt }
Document        { Id, FileName, UploadedAt, ChunkCount }
```

---

## RAG Flow (AI Agent Service)

```
Admin uploads medical document
        ↓
Chunk into ~500 token pieces
        ↓
Embed each chunk via OpenAI → store in pgvector

--- During live session ---

Patient says: "I have chest pain for 3 days"
        ↓
Embed patient text → cosine similarity search in pgvector
        ↓
Retrieve top 3 relevant knowledge chunks
        ↓
Send to OpenAI/Claude:
  "Medical context: {relevant chunks}
   Conversation: {last 10 lines}
   Give doctor 1-2 concise suggestions."
        ↓
Doctor sees: "💡 Consider asking about radiation to arm/jaw"
             "⚠️  Rule out cardiac event"
```

---

## Admin Panel Features

- **Knowledge Base** — upload/view/delete medical guidelines, protocols, drug references
- **Agent Config** — edit system prompt, choose model (GPT-4o / Claude), set temperature, suggestion frequency, confidence threshold
- **Session Monitor** — view live and past sessions, transcripts, suggestions generated
- **Suggestion Review** — mark suggestions as good/bad for feedback loop

---

## React Project Structure

```
/react-client (monorepo — Turborepo or Nx)
  /apps
    /doctor-app        ← mobile-first: recording + live suggestions panel
    /admin-app         ← knowledge base, agent config, session monitoring
  /packages
    /ui                ← shared components (SuggestionCard, TranscriptViewer)
    /signalr-client    ← shared SignalR connection hook
    /api-client        ← auto-generated from .NET OpenAPI spec
```

---

## .NET Backend Structure

```
/Solution
  /ApiGateway              ← YARP or Ocelot
  /Services
    /SessionService
      /Hubs
        ConversationHub.cs         ← SignalR: receives audio, pushes suggestions
      /Services
        SpeechToTextService.cs     ← AssemblyAI / Deepgram streaming
        ConversationService.cs     ← business logic
      /Domain
        Session.cs, TranscriptLine.cs, Suggestion.cs
      AppDbContext.cs
    /AIAgentService
      /Services
        EmbeddingService.cs        ← OpenAI embeddings API
        VectorSearchService.cs     ← pgvector cosine similarity search
        AISuggestionService.cs     ← Claude / OpenAI chat completions
        DocumentChunkerService.cs  ← splits docs into chunks
    /AdminService
      /Controllers
        AdminController.cs         ← document upload, agent config CRUD
        KnowledgeController.cs     ← manage knowledge base
        SessionMonitorController.cs
      /Services
        AgentConfigService.cs
```

---

## Important Design Decisions

**Why SignalR over raw WebSocket?** — Built into ASP.NET Core, handles reconnections, React client library available (`@microsoft/signalr`), less boilerplate.

**Why batch AI calls?** — Don't call OpenAI/Claude on every word. Batch every 5 patient utterances or every 30 seconds to reduce latency and API costs.

**Why pgvector over a separate vector DB?** — Keeps the stack simple (one PostgreSQL instance), EF Core support via `pgvector-dotnet`, no extra infrastructure to manage.

**Speaker identification** — AssemblyAI/Deepgram return "Speaker A / Speaker B" labels. Claude/OpenAI infers which is doctor vs patient from context (doctor asks clinical questions, patient describes symptoms). Optional: doctor says a trigger phrase at session start.

**Audio not stored** — only transcript text hits the database. Important for medical data privacy (HIPAA/GDPR compliance depending on market).

---

## Key Packages / Libraries

| Package | Purpose |
|---|---|
| `@microsoft/signalr` | React SignalR client |
| `react-speech-recognition` | Optional fallback mic capture |
| `pgvector-dotnet` | EF Core pgvector integration |
| `AssemblyAI .NET SDK` | Real-time STT + diarization |
| `Azure.AI.OpenAI` or `Anthropic SDK` | LLM calls |
| `MassTransit` | RabbitMQ abstraction for .NET |
| `YARP` | API Gateway / reverse proxy |

---

## AI Model Definition — How to Make the AI Understand the Conversation

This is about **prompt engineering + context design**: telling the model its role, what to do with the conversation, and what format to respond in.

### The 4 Layers

| Layer | What it defines |
|---|---|
| **Role** | What is the AI? (clinical assistant, not a doctor itself) |
| **Task** | What should it do? (analyze patient speech, suggest to doctor) |
| **Format** | How should it respond? (JSON, concise, urgency flag) |
| **Examples** | 1-2 ideal input/output pairs so it knows exactly what you expect |

All 4 layers live inside `AgentConfig` in the database — the admin can tune them without touching code.

---

### Layer 1 — System Prompt (stored in AgentConfig)

```
You are a clinical assistant AI helping a doctor during a live patient consultation.

Your job:
- The conversation below is between a DOCTOR and a PATIENT
- Analyze what the PATIENT says (symptoms, history, complaints)
- Generate brief, clinically relevant suggestions FOR THE DOCTOR

Rules:
- Never address the patient directly
- Be concise — max 2 suggestions per response
- Flag urgent symptoms immediately (chest pain, difficulty breathing, etc.)
- Output as JSON: { "suggestions": [...], "urgency": "low|medium|high" }
- If unsure, say nothing rather than guess

Speaker context:
- DOCTOR typically asks questions, uses medical terminology
- PATIENT typically describes symptoms, answers questions, uses lay terms
```

---

### Layer 2 — Conversation Format (built dynamically per API call)

Feed the transcript in a clean, consistent structure every time:

```
[SPEAKER_A]: I've had chest pain for 3 days now, mostly on the left side
[SPEAKER_B]: Does it radiate to your arm or jaw?
[SPEAKER_A]: Sometimes to my left arm yes, especially at night
[SPEAKER_B]: Any shortness of breath or sweating?
[SPEAKER_A]: Yes, I get sweaty when it happens
```

The model infers doctor vs patient from context automatically. After a few lines you can reinforce:

```
Note: Based on the conversation, SPEAKER_A appears to be the PATIENT
and SPEAKER_B appears to be the DOCTOR.
```

---

### Layer 3 — Full Prompt Structure Per API Call

```
┌─────────────────────────────────────────────────┐
│ SYSTEM (static, from AgentConfig)               │
│   "You are a clinical assistant..."             │
├─────────────────────────────────────────────────┤
│ USER (dynamic, built each call)                 │
│                                                 │
│  Medical context (from pgvector RAG search):   │
│  {top 3 relevant knowledge chunks}             │
│                                                 │
│  Conversation so far:                          │
│  [SPEAKER_A]: I have chest pain for 3 days...  │
│  [SPEAKER_B]: Where exactly?                   │
│  [SPEAKER_A]: Left side, sometimes my arm...   │
│                                                 │
│  Based on what the PATIENT just said,          │
│  give the doctor 1-2 concise suggestions.      │
└─────────────────────────────────────────────────┘
```

---

### Layer 4 — Few-Shot Examples (inside system prompt)

Add 1-2 examples directly in the system prompt to lock in the expected output format:

```
Example input:
  Patient says: "I've had a fever for 5 days and a dry cough"

Good response:
  {
    "suggestions": [
      "Ask about travel history and exposure to sick contacts",
      "Consider ordering CBC and chest X-ray"
    ],
    "urgency": "medium"
  }
```

This dramatically improves output consistency — the model stops guessing format.

---

### Model Selection

| Model | Strength | Best for |
|---|---|---|
| **GPT-4o** | Fast, great structured JSON output, strong instruction following | Production default, real-time suggestions |
| **Claude Sonnet** | Better nuance, longer context, strong medical reasoning | Complex cases, long sessions |
| **Claude Haiku** | Very fast, cheap | High-frequency calls, simple triage suggestions |

**Recommendation:** GPT-4o or Claude Sonnet for real-time medical suggestions. Speed matters because the doctor is waiting.

---

### Batching Strategy (in AISuggestionService.cs)

Do NOT call the AI on every word. Use this logic:

```csharp
// Call AI every 5 patient utterances OR every 30 seconds, whichever comes first
if (patientLineCount % 5 == 0 || timeSinceLastCall > TimeSpan.FromSeconds(30))
{
    var recentLines = GetRecentTranscriptLines(sessionId, last: 10);
    var ragChunks   = await VectorSearchService.SearchAsync(latestPatientText, topK: 3);
    var suggestion  = await AISuggestionService.CallAsync(recentLines, ragChunks);
    await SaveAndBroadcastSuggestion(suggestion);
}
```

---

## Open Questions for Planning

1. Is there a specific compliance requirement? (HIPAA, GDPR, local medical data laws in target market)
2. Should audio ever be stored, or transcript-only?
3. Single clinic or multi-tenant (multiple clinics, each with their own knowledge base)?
4. Does the doctor need suggestions in a specific language?
5. Should suggestions be shown during the session only, or also generate a post-session report?
