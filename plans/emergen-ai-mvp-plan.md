# Emergen AI — MVP Implementation Plan

> **Goal**: Ship a minimal but functional AI clinical companion in 8-10 weeks. Focus: core workflow works end-to-end, defer all polish.

**Last updated**: 2026-02-25

---

## MVP Definition — What's "Minimal"?

| Feature | MVP Scope | Deferred |
|---------|-----------|----------|
| **Live Transcript** | Text appears on screen as doctor/patient speak | Speaker icons, formatting, edit/correct |
| **AI Suggestions** | Auto-suggest every 5 patient utterances / 60s + on-demand button | Adaptive batching, urgency levels, suggestion history |
| **Emergen AI Button** | Doctor presses button → immediate AI analysis (overrides batch timer) | Smart triggers, urgent keyword bypass |
| **Patient Context** | Fetch patient summary from Patient.API for context-aware suggestions | Full FHIR resource access, cross-service queries |
| **Knowledge Base** | 5-10 sample medical guideline docs searchable | Upload UI, categories, versioning |
| **Clinical Skills** | 2-3 YAML skill files in `skills/core/`, loaded at startup | Skill library, admin management, DB persistence |
| **STT** | Deepgram REST API (per-chunk transcription, ~200-300ms extra latency) | WebSocket streaming |
| **Speaker Detection** | AI-based: first speaker = Doctor (deterministic), LLM confirms from conversation context | Deepgram built-in diarization (Phase 7) |
| **Models** | GPT-4o-mini only (configured via `appsettings.json`) | Tiered strategy, model selection UI |
| **Prompts** | System prompt in resource file (`Prompts/system.txt`), never hardcoded in C# | DB persistence, admin editing, versioning |
| **Auth** | Existing JWT from Identity.API (doctors only) | Patient/admin views, role-based suggestions |
| **MCP** | Pre-MCP: plain REST + SignalR services. MCP tool wrapping in Phase 7. | Full MCP protocol, tool discovery, agent orchestration |

**Success criteria**: Doctor starts session → speaks → sees transcript → AI auto-suggests after 5 patient utterances → doctor can also press "Emergen AI" button for immediate analysis → suggestions reference patient context + medical knowledge. That's it.

**Note on MCP**: The architecture is designed for MCP-native operation, but the MVP builds plain REST services first. The services are structured so they can be wrapped as MCP tools (`knowledge_search`, `session_suggest`, etc.) in Phase 7 with minimal refactoring. This avoids adding protocol ceremony before the tools themselves are proven.

---

## Phase 6a: PostgreSQL + pgvector Migration

**Duration**: 1 week  
**Status**: Prerequisite blocker

### Deliverables

| Task | Output | Acceptance Criteria |
|------|--------|---------------------|
| Create migration scripts | SQL files in `/sql/migrate-to-postgres/` | All 6 DB schemas converted (Identity, Patient, Appointment, MedicalRecords, Audit, Emergen) |
| Set up pgvector | `CREATE EXTENSION vector` | Vector column creates without errors |
| Test EF Core provider | All existing APIs start successfully | Zero breaking changes to domain services |
| Load test | Benchmark suite | Write: 1K inserts/sec, pgvector search: <50ms at 1.5 QPS |

### Configuration

```sql
-- EmergenDB schema (new)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    doctor_id TEXT NOT NULL,
    patient_id TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    status TEXT NOT NULL,
    audio_recorded BOOLEAN DEFAULT FALSE,
    speaker_map JSONB  -- {"Speaker A": "Doctor", "Speaker B": "Patient"}
);

CREATE TABLE transcript_lines (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    speaker TEXT NOT NULL,  -- 'Doctor' or 'Patient'
    text TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    confidence FLOAT
);

CREATE TABLE suggestions (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    content TEXT NOT NULL,
    triggered_at TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL,    -- 'clinical', 'medication', 'follow_up'
    source TEXT NOT NULL,  -- 'batch' or 'on_demand'
    urgency TEXT           -- 'low', 'medium', 'high'
);

CREATE TABLE knowledge_chunks (
    id UUID PRIMARY KEY,
    document_name TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536),  -- text-embedding-3-small
    category TEXT,
    chunk_index INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON knowledge_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE TABLE documents (
    id UUID PRIMARY KEY,
    file_name TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by TEXT NOT NULL,
    chunk_count INT
);
```

**Embedding config** (in `appsettings.json`, not hardcoded):
- Model: OpenAI `text-embedding-3-small`
- Dimension: 1536
- Chunking: 500 tokens, 100-token overlap
- Cost: ~$3/mo

---

## Phase 6b: EmergenAI.API — Core Service (MVP)

**Duration**: 4-5 weeks  
**Status**: Main implementation phase

### Milestone 1: Project Scaffold + Health Check (Week 1)

**Goal**: Empty service runs, connects to DB, responds to health checks.

#### Deliverables

```
src/EmergenAI.API/
├── EmergenAI.API.csproj
├── Program.cs
├── appsettings.json
├── appsettings.Development.json
├── Dockerfile
├── Domain/
│   ├── Session.cs
│   ├── TranscriptLine.cs
│   ├── Suggestion.cs
│   ├── KnowledgeChunk.cs
│   ├── Document.cs
│   ├── ClinicalSkill.cs
│   └── SkillFrontMatter.cs
├── Data/
│   └── EmergenDbContext.cs
├── Prompts/
│   └── system.txt              ← system prompt lives here, NOT in C# source
└── Health/
    └── EmergenHealthCheck.cs

skills/core/                     ← repo root, loaded at startup
├── chest-pain.yaml
├── medication-review.yaml
└── general-triage.yaml

SeedData/Guidelines/             ← repo root, COPY'd into Docker image
├── CDC-ChestPain.txt
├── AHA-HeartFailure.txt
├── WHO-EssentialMedicines.txt
├── NICE-Hypertension.txt
└── FDA-DrugInteractions.txt
```

**Dockerfile note**: Both `skills/core/` and `SeedData/Guidelines/` must be COPY'd into the Docker image:
```dockerfile
COPY skills/core/ /app/skills/core/
COPY SeedData/Guidelines/ /app/SeedData/Guidelines/
```

#### NuGet Packages (add to `Directory.Packages.props`)

```xml
<PackageVersion Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="10.0.0" />
<PackageVersion Include="Pgvector.EntityFrameworkCore" Version="0.3.0" />
<PackageVersion Include="OpenAI" Version="2.2.0" />
<PackageVersion Include="YamlDotNet" Version="16.3.0" />
```

#### Docker Compose Addition

```yaml
# docker-compose.yml
emergen-api:
  build:
    context: .
    dockerfile: src/EmergenAI.API/Dockerfile
  ports:
    - "5005:8080"
  environment:
    - ConnectionStrings__EmergenDb=Host=postgres;Database=EmergenDB;Username=emergen;Password=${EMERGEN_DB_PASSWORD}
    - Deepgram__ApiKey=${DEEPGRAM_API_KEY}
    - OpenAI__ApiKey=${OPENAI_API_KEY}
    - OpenAI__Model=gpt-4o-mini
  depends_on:
    - postgres
    - identity-api
```

#### Acceptance Criteria

- [ ] `docker-compose up emergen-api` starts successfully
- [ ] Health endpoint returns 200: `GET /health`
- [ ] EF Core connects to EmergenDB (PostgreSQL)
- [ ] Migrations run on startup

---

### Milestone 2: Session Management (Week 1-2)

**Goal**: Doctor can start/end sessions via REST API.

#### Endpoints

```csharp
POST   /api/sessions          → Start new session
GET    /api/sessions/{id}     → Get session details
POST   /api/sessions/{id}/end → End session
```

#### Request/Response

```json
// POST /api/sessions
{
  "patientId": "abc123"  // optional
}

// Response
{
  "id": "session-uuid",
  "doctorId": "doc-123",
  "patientId": "abc123",
  "startedAt": "2026-02-25T10:00:00Z",
  "status": "active"
}
```

#### Implementation

```csharp
// Minimal service — no complex logic yet
public class SessionService
{
    private readonly EmergenDbContext _db;

    public async Task<Session> StartSessionAsync(string doctorId, string? patientId)
    {
        var session = new Session
        {
            Id = Guid.NewGuid(),
            DoctorId = doctorId,
            PatientId = patientId,
            StartedAt = DateTimeOffset.UtcNow,
            Status = "active"
        };

        _db.Sessions.Add(session);
        await _db.SaveChangesAsync();
        return session;
    }

    public async Task<Session> EndSessionAsync(Guid sessionId, string doctorId)
    {
        var session = await _db.Sessions.FirstOrDefaultAsync(
            s => s.Id == sessionId && s.DoctorId == doctorId)
            ?? throw new KeyNotFoundException($"Session {sessionId} not found");

        session.EndedAt = DateTimeOffset.UtcNow;
        session.Status = "ended";
        await _db.SaveChangesAsync();
        return session;
    }
}
```

#### Acceptance Criteria

- [ ] Doctor JWT from Identity.API validates
- [ ] Session persists to DB
- [ ] GET returns session with transcript lines (empty array initially)
- [ ] EndSession sets `ended_at` and `status = "ended"`

---

### Milestone 3: SignalR Hub + Mock Transcript (Week 2)

**Goal**: Doctor connects to SignalR, types text, sees it echo back in real-time. No STT yet.

#### Hub Definition

```csharp
public class SessionHub : Hub
{
    private readonly EmergenDbContext _db;
    
    // Client connects to session
    public async Task JoinSession(string sessionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
        await Clients.Caller.SendAsync("SessionJoined", sessionId);
    }
    
    // MVP: Manual text input (simulates STT)
    public async Task SendTranscriptLine(string sessionId, string speaker, string text)
    {
        var line = new TranscriptLine
        {
            Id = Guid.NewGuid(),
            SessionId = Guid.Parse(sessionId),
            Speaker = speaker,  // "Doctor" or "Patient"
            Text = text,
            Timestamp = DateTimeOffset.UtcNow
        };
        
        _db.TranscriptLines.Add(line);
        await _db.SaveChangesAsync();
        
        // Broadcast to all clients in session group
        await Clients.Group(sessionId).SendAsync("TranscriptLineAdded", new
        {
            line.Id,
            line.Speaker,
            line.Text,
            line.Timestamp
        });
    }
}
```

#### Acceptance Criteria

- [ ] React connects to `wss://localhost:5005/sessionHub`
- [ ] Text typed in UI appears in real-time for all connected clients
- [ ] Transcript lines persist to DB
- [ ] Reconnect after disconnect works (SignalR automatic reconnect)

**Deferred**: Audio streaming, Deepgram integration. This milestone proves SignalR works.

---

### Milestone 4: Knowledge Base Seeding (Week 2-3)

**Goal**: 5-10 medical guideline PDFs chunked, embedded, searchable.

#### Sample Documents (Public Domain)

1. CDC Chest Pain Guidelines
2. AHA Heart Failure Management
3. WHO Essential Medicines List (excerpts)
4. NICE Hypertension Guidelines
5. FDA Drug Interaction Warnings (top 50)

#### Seeding Script

```csharp
// Run once on startup or via dev endpoint
public class KnowledgeBaseSeeder
{
    public async Task SeedAsync()
    {
        var docs = Directory.GetFiles("SeedData/Guidelines", "*.txt");
        
        foreach (var docPath in docs)
        {
            var text = await File.ReadAllTextAsync(docPath);
            var chunks = ChunkText(text, maxTokens: 500, overlap: 100);
            
            var document = new Document
            {
                FileName = Path.GetFileName(docPath),
                ChunkCount = chunks.Count,
                UploadedBy = "system"
            };
            _db.Documents.Add(document);
            
            for (int i = 0; i < chunks.Count; i++)
            {
                var embedding = await _embeddingService.EmbedAsync(chunks[i]);
                
                _db.KnowledgeChunks.Add(new KnowledgeChunk
                {
                    DocumentName = document.FileName,
                    Content = chunks[i],
                    Embedding = embedding,  // float[] → VECTOR(1536)
                    Category = "guideline",
                    ChunkIndex = i
                });
            }
        }
        
        await _db.SaveChangesAsync();
    }
}
```

#### Acceptance Criteria

- [ ] 5-10 docs loaded on startup (if DB is empty)
- [ ] pgvector cosine similarity query returns results in <50ms
- [ ] Top-3 chunks retrieved for query "chest pain"

**Deferred**: Upload UI, categories, version tracking, delete/update.

---

### Milestone 5: RAG Search (Week 3)

**Goal**: REST endpoint accepts query text → returns top-K relevant chunks.

#### Endpoint

```csharp
POST /api/knowledge/search

{
  "query": "patient with chest pain radiating to left arm",
  "topK": 3
}

// Response
{
  "results": [
    {
      "documentName": "CDC-ChestPain.txt",
      "content": "Chest pain radiating to arm/jaw is a cardinal symptom...",
      "score": 0.87,
      "chunkIndex": 5
    },
    {
      "documentName": "AHA-HeartFailure.txt",
      "content": "Patients presenting with acute chest discomfort...",
      "score": 0.82,
      "chunkIndex": 12
    }
  ]
}
```

#### Implementation

```csharp
public class KnowledgeService
{
    public async Task<List<SearchResult>> SearchAsync(string query, int topK = 3)
    {
        // 1. Embed the query
        var queryEmbedding = await _embeddingService.EmbedAsync(query);
        
        // 2. pgvector cosine similarity search
        var results = await _db.KnowledgeChunks
            .Select(c => new
            {
                Chunk = c,
                Score = c.Embedding.CosineDistance(queryEmbedding)  // pgvector operator
            })
            .OrderBy(x => x.Score)  // lower distance = higher similarity
            .Take(topK)
            .ToListAsync();
        
        return results.Select(r => new SearchResult
        {
            DocumentName = r.Chunk.DocumentName,
            Content = r.Chunk.Content,
            Score = 1 - r.Score,  // convert distance to similarity
            ChunkIndex = r.Chunk.ChunkIndex
        }).ToList();
    }
}
```

#### Acceptance Criteria

- [ ] Query "chest pain" returns relevant chunks
- [ ] Score threshold: only return results with score > 0.7
- [ ] Response time: <100ms for typical query

**Deferred**: Filters (by category), re-ranking, hybrid search.

---

### Milestone 6: LLM Integration + Patient Context + Batching (Week 3-4)

**Goal**: Call GPT-4o-mini with transcript + RAG context + patient summary → get suggestion. Both on-demand (button) and auto-batched (every 5 patient utterances / 60s).

#### Prompt File (`Prompts/system.txt`)

System prompt lives as a resource file, **never** in C# source (per CLAUDE.md convention):

```text
You are a clinical assistant AI. You assist the doctor during a live patient consultation.

## Instructions
- Analyze the patient's symptoms and conversation context
- Reference the patient's medical history when relevant
- Provide 1-2 concise, actionable bullet points
- Flag any potential drug interactions or contraindications
- If a clinical skill is active, follow its workflow

## Output format
- Brief bullet points only
- Include confidence level (high/medium/low) for each suggestion
- Never diagnose — suggest considerations for the doctor to evaluate
```

#### Service

```csharp
public class SuggestionService
{
    private readonly ChatClient _chatClient;
    private readonly KnowledgeService _knowledge;
    private readonly PatientContextService _patientContext;
    private readonly EmergenDbContext _db;
    private readonly string _systemPrompt;
    private readonly ILogger<SuggestionService> _logger;

    public SuggestionService(/* ... */)
    {
        // Load prompt from resource file — not hardcoded
        _systemPrompt = File.ReadAllText("Prompts/system.txt");
    }

    public async Task<Suggestion?> GenerateSuggestionAsync(
        Guid sessionId,
        List<TranscriptLine> recentLines,
        string source)  // "batch" or "on_demand"
    {
        try
        {
            // 1. Extract patient utterances for RAG query
            var patientText = string.Join(" ",
                recentLines.Where(l => l.Speaker == "Patient").Select(l => l.Text));

            if (string.IsNullOrWhiteSpace(patientText))
                return null;  // Nothing to analyze

            // 2. RAG search
            var ragChunks = await _knowledge.SearchAsync(patientText, topK: 3);

            // 3. Fetch patient context from Patient.API (if session has patientId)
            var session = await _db.Sessions.FindAsync(sessionId);
            var patientSummary = session?.PatientId != null
                ? await _patientContext.GetSummaryAsync(session.PatientId)
                : null;

            // 4. Build prompt (compose dynamically per call)
            var contextParts = new List<string> { _systemPrompt };

            if (patientSummary != null)
                contextParts.Add($"\n\n## Patient Context\n{patientSummary}");

            if (ragChunks.Count > 0)
                contextParts.Add($"\n\n## Medical Knowledge\n{string.Join("\n\n", ragChunks.Select(r => r.Content))}");

            var fullSystemPrompt = string.Join("", contextParts);

            var userPrompt = "Conversation:\n"
                + string.Join("\n", recentLines.Select(l => $"[{l.Speaker}]: {l.Text}"));

            // 5. Call LLM (OpenAI SDK — model from config)
            var completion = await _chatClient.CompleteChatAsync(
            [
                new SystemChatMessage(fullSystemPrompt),
                new UserChatMessage(userPrompt)
            ],
            new ChatCompletionOptions { Temperature = 0.3f, MaxOutputTokenCount = 200 });

            var content = completion.Value.Content[0].Text;

            // 6. Save suggestion
            var suggestion = new Suggestion
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                Content = content,
                TriggeredAt = DateTimeOffset.UtcNow,
                Type = "clinical",
                Source = source,
                Urgency = null  // MVP: no urgency classification yet
            };

            _db.Suggestions.Add(suggestion);
            await _db.SaveChangesAsync();
            return suggestion;
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Failed to generate suggestion for session {SessionId}", sessionId);
            return null;  // Don't crash the session — suggestion failure is non-fatal
        }
    }
}
```

#### Patient Context Service

```csharp
// Fetches minimal patient summary from Patient.API
public class PatientContextService
{
    private readonly HttpClient _httpClient;

    public async Task<string?> GetSummaryAsync(string patientId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"api/patients/{patientId}");
            if (!response.IsSuccessStatusCode) return null;

            var patient = await response.Content.ReadFromJsonAsync<PatientSummaryDto>();
            return $"Name: {patient.FullName}, DOB: {patient.DateOfBirth:yyyy-MM-dd}, "
                 + $"Allergies: {patient.Allergies ?? "None recorded"}, "
                 + $"Active Medications: {patient.ActiveMedications ?? "None recorded"}, "
                 + $"Conditions: {patient.ActiveConditions ?? "None recorded"}";
        }
        catch
        {
            return null;  // Patient context is best-effort, never blocks suggestions
        }
    }
}
```

#### Batching Logic (singleton service — NOT in hub)

SignalR hubs are **transient** (new instance per invocation). Batching state must live in a singleton service:

```csharp
// Registered as singleton in DI
public class BatchTriggerService
{
    private readonly ConcurrentDictionary<string, int> _patientUtteranceCounts = new();
    private readonly ConcurrentDictionary<string, Timer> _batchTimers = new();
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<SessionHub> _hubContext;

    public async Task OnTranscriptLineAdded(string sessionId, TranscriptLine line)
    {
        if (line.Speaker != "Patient") return;

        var count = _patientUtteranceCounts.AddOrUpdate(sessionId, 1, (_, c) => c + 1);

        // Reset 60-second inactivity timer
        _batchTimers.AddOrUpdate(sessionId,
            _ => new Timer(async _ => await TriggerBatchSuggestion(sessionId), null, 60_000, Timeout.Infinite),
            (_, existing) => { existing.Change(60_000, Timeout.Infinite); return existing; });

        // Trigger after 5 patient utterances
        if (count >= 5)
        {
            _patientUtteranceCounts[sessionId] = 0;
            await TriggerBatchSuggestion(sessionId);
        }
    }

    private async Task TriggerBatchSuggestion(string sessionId)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EmergenDbContext>();
        var suggestionService = scope.ServiceProvider.GetRequiredService<SuggestionService>();

        var recentLines = await db.TranscriptLines
            .Where(t => t.SessionId == Guid.Parse(sessionId))
            .OrderByDescending(t => t.Timestamp)
            .Take(10)
            .OrderBy(t => t.Timestamp)
            .ToListAsync();

        var suggestion = await suggestionService.GenerateSuggestionAsync(
            Guid.Parse(sessionId), recentLines, source: "batch");

        if (suggestion != null)
            await _hubContext.Clients.Group(sessionId).SendAsync("SuggestionAdded", suggestion);
    }

    public void CleanupSession(string sessionId)
    {
        _patientUtteranceCounts.TryRemove(sessionId, out _);
        if (_batchTimers.TryRemove(sessionId, out var timer))
            timer.Dispose();
    }
}
```

Hub calls into the singleton:

```csharp
// In SessionHub (injected via constructor)
await _batchTriggerService.OnTranscriptLineAdded(sessionId, line);
```

#### Acceptance Criteria

- [ ] On-demand: `POST /api/sessions/{id}/suggest` returns AI suggestion
- [ ] Auto-batch: suggestion auto-triggers after 5 patient utterances
- [ ] Auto-batch: suggestion auto-triggers after 60 seconds of inactivity
- [ ] Suggestion includes patient context when patientId is provided
- [ ] Suggestion references knowledge base content appropriately
- [ ] Response time: <3 seconds (including RAG + LLM)
- [ ] Suggestion persists to DB
- [ ] LLM errors are caught and logged (non-fatal to session)

**Deferred**: Tiered models, adaptive batching, urgent keyword bypass, suggestion history UI.

---

### Milestone 7: Deepgram STT Integration (Week 4-5)

**Goal**: Replace manual text input with Deepgram REST API (per-chunk transcription). Accept ~200-300ms extra latency vs WebSocket — upgrade to WebSocket streaming in Phase 7.

**Audio path**: Browser mic → MediaRecorder (1s chunks) → base64 via SignalR → server → Deepgram REST → transcript text → broadcast via SignalR.

#### SignalR Hub Changes

```csharp
public class SessionHub : Hub
{
    private readonly DeepgramService _deepgram;
    private readonly SpeakerDetectionService _speakerDetection;
    private readonly BatchTriggerService _batchTrigger;  // singleton
    private readonly EmergenDbContext _db;
    private readonly ILogger<SessionHub> _logger;

    // Client sends audio chunks (ArrayBuffer → base64)
    public async Task StreamAudioChunk(string sessionId, string audioBase64)
    {
        try
        {
            var audioBytes = Convert.FromBase64String(audioBase64);

            // Forward to Deepgram REST API
            var transcriptFragment = await _deepgram.TranscribeAsync(sessionId, audioBytes);

            if (!string.IsNullOrEmpty(transcriptFragment))
            {
                var line = new TranscriptLine
                {
                    Id = Guid.NewGuid(),
                    SessionId = Guid.Parse(sessionId),
                    Speaker = _speakerDetection.InferSpeaker(sessionId),
                    Text = transcriptFragment,
                    Timestamp = DateTimeOffset.UtcNow
                };

                _db.TranscriptLines.Add(line);
                await _db.SaveChangesAsync();

                await Clients.Group(sessionId).SendAsync("TranscriptLineAdded", line);

                // Auto-batch trigger (singleton manages state across hub invocations)
                await _batchTrigger.OnTranscriptLineAdded(sessionId, line);
            }
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "STT failed for session {SessionId}", sessionId);
            // Don't crash the SignalR connection — STT failure is recoverable
            await Clients.Caller.SendAsync("SttError", "Transcription temporarily unavailable");
        }
    }
}
```

#### Deepgram Service

```csharp
public class DeepgramService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<DeepgramService> _logger;

    // MVP: REST API (not streaming WebSocket). ~200-300ms extra latency per chunk.
    // Upgrade to WebSocket streaming in Phase 7 for lower latency.
    public async Task<string?> TranscribeAsync(string sessionId, byte[] audioChunk)
    {
        try
        {
            var content = new ByteArrayContent(audioChunk);
            content.Headers.ContentType = new MediaTypeHeaderValue("audio/wav");

            var response = await _httpClient.PostAsync(
                "https://api.deepgram.com/v1/listen?model=nova-2-medical&punctuate=true",
                content);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Deepgram returned {StatusCode} for session {SessionId}",
                    response.StatusCode, sessionId);
                return null;
            }

            var json = await response.Content.ReadFromJsonAsync<DeepgramResponse>();
            return json?.Results?.Channels?[0]?.Alternatives?[0]?.Transcript;
        }
        catch (HttpRequestException exception)
        {
            _logger.LogError(exception, "Deepgram API call failed for session {SessionId}", sessionId);
            return null;
        }
    }
}
```

#### Speaker Detection Service

```csharp
// Registered as scoped — injected into SessionHub
public class SpeakerDetectionService
{
    private readonly EmergenDbContext _db;

    // Simple heuristic — first speaker is Doctor (they pressed "Start Session")
    // Then alternate based on pause detection. LLM refines in suggestion pass.
    public string InferSpeaker(string sessionId)
    {
        var lastLine = _db.TranscriptLines
            .Where(t => t.SessionId == Guid.Parse(sessionId))
            .OrderByDescending(t => t.Timestamp)
            .FirstOrDefault();

        if (lastLine == null)
            return "Doctor";  // First speaker = Doctor (deterministic)

        // If >3 seconds gap, likely speaker change
        var gap = DateTimeOffset.UtcNow - lastLine.Timestamp;
        return gap.TotalSeconds > 3
            ? (lastLine.Speaker == "Doctor" ? "Patient" : "Doctor")
            : lastLine.Speaker;  // Same speaker continues
    }
}
```

**Layered approach** (from architecture doc):
1. **Deterministic**: Doctor pressed "Start Session" → first speaker is Doctor
2. **Pause heuristic**: >3 second gap → likely speaker change
3. **LLM confirmation**: During suggestion generation, LLM sees "[Doctor]: asks questions" vs "[Patient]: describes symptoms" and can flag misidentifications
4. **Stored mapping**: `speaker_map` JSONB field persisted per session — once resolved, not re-inferred

**Note**: Deepgram API key injected via `IConfiguration` → `appsettings.json` placeholder `${DEEPGRAM_API_KEY}`, overridden by env var in docker-compose (per CLAUDE.md secrets rule).

#### Acceptance Criteria

- [ ] Doctor speaks into mic → text appears on screen within ~1-2 seconds
- [ ] Medical terms transcribed correctly (e.g., "hypertension", "metformin")
- [ ] Deepgram errors are caught and logged — session continues with manual text input fallback
- [ ] Speaker auto-detected: first speaker = Doctor, LLM confirms from context

**Deferred**: WebSocket streaming (Phase 7), Deepgram built-in diarization (Phase 7).

---

### Milestone 8: Clinical Skills — YAML Files (Week 5)

**Goal**: 2-3 YAML skill files in `skills/core/` guide LLM behavior for specific scenarios. Loaded into memory at startup per CLAUDE.md convention.

#### Skill Files (`skills/core/`)

```yaml
# skills/core/chest-pain.yaml
---
id: chest-pain-assessment
category: clinical-decision-support
triggers:
  - "chest pain"
  - "chest discomfort"
  - "pressure in chest"
  - "tightness in chest"
---

# Chest Pain Assessment

## Workflow
1. Ask about pain location and radiation (arm/jaw/back)
2. Ask about onset (sudden vs gradual)
3. Ask about duration and triggers (exertion, rest, stress)
4. Check for associated symptoms (sweating, nausea, shortness of breath)
5. Rule out cardiac emergency (STEMI criteria)

## Red flags
- Pain > 20 minutes
- Radiation to arm/jaw
- Diaphoresis (sweating)
- Shortness of breath
```

```yaml
# skills/core/medication-review.yaml
---
id: medication-reconciliation
category: medication-management
triggers:
  - "medication"
  - "taking"
  - "prescription"
  - "drug"
---

# Medication Reconciliation

## Workflow
1. Review patient's active medications from medical records
2. Ask patient to list all medications (include OTC, supplements)
3. Compare lists for discrepancies
4. Check for drug-drug interactions (knowledge base)
5. Verify dosages and frequencies
```

#### Skill Loader Service

```csharp
public class ClinicalSkillService
{
    private readonly List<ClinicalSkill> _skills = [];
    private readonly ILogger<ClinicalSkillService> _logger;

    // Called once at startup — loads all YAML files from skills/core/
    public void LoadSkills(string skillsDirectory = "skills/core")
    {
        if (!Directory.Exists(skillsDirectory))
        {
            _logger.LogWarning("Skills directory not found: {Directory}", skillsDirectory);
            return;
        }

        var deserializer = new DeserializerBuilder().Build();

        foreach (var filePath in Directory.GetFiles(skillsDirectory, "*.yaml"))
        {
            var content = File.ReadAllText(filePath);
            var parts = content.Split("---", StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length < 2) continue;

            var frontMatter = deserializer.Deserialize<SkillFrontMatter>(parts[0]);
            var markdown = parts[1].Trim();

            _skills.Add(new ClinicalSkill
            {
                Id = frontMatter.Id,
                Category = frontMatter.Category,
                Triggers = frontMatter.Triggers,
                Content = markdown
            });
        }

        _logger.LogInformation("Loaded {Count} clinical skills", _skills.Count);
    }

    // Match transcript text against skill triggers
    public ClinicalSkill? DetectSkill(List<TranscriptLine> lines)
    {
        var text = string.Join(" ", lines.Select(l => l.Text)).ToLowerInvariant();

        return _skills.FirstOrDefault(skill =>
            skill.Triggers.Any(trigger => text.Contains(trigger, StringComparison.OrdinalIgnoreCase)));
    }
}
```

#### Skill Injection into Prompt (in SuggestionService)

```csharp
// In GenerateSuggestionAsync(), after building base prompt:
var detectedSkill = _skillService.DetectSkill(recentLines);

if (detectedSkill != null)
{
    contextParts.Add($"\n\n## Active Clinical Skill\n{detectedSkill.Content}");
}
```

#### Acceptance Criteria

- [ ] 2-3 YAML skill files exist in `skills/core/`
- [ ] Skills loaded into memory at startup (logged)
- [ ] Patient says "chest pain" → LLM suggestions follow chest pain workflow
- [ ] Suggestions ask appropriate follow-up questions
- [ ] Adding a new skill = adding a YAML file + redeploying (no code change)

**Deferred**: Skill library admin UI, DB persistence, versioning (Phase 8+).

---

## Phase 6c: Doctor Dashboard UI (MVP)

**Duration**: 2-3 weeks  
**Status**: Frontend integration

### Milestone 1: Session Start Screen (Week 1)

**Goal**: Doctor clicks one button → session created + SignalR connected + mic recording starts + transcription begins. Everything kicks off from a single "Start Session" press.

#### Component Structure

```
src/MediTrack.Web/src/features/emergen-ai/
├── SessionStartScreen.tsx
├── LiveSessionView.tsx
├── TranscriptPanel.tsx
├── SuggestionCard.tsx
├── SpeakerLabel.tsx           ← shows detected speaker (Doctor/Patient)
├── useSession.ts              ← SignalR + session lifecycle
└── useAudioRecording.ts       ← Web Audio API hook
```

#### Session Start Screen

```tsx
export function SessionStartScreen() {
  const { startSession } = useSession();
  const [patientId, setPatientId] = useState('');

  const handleStart = async () => {
    // One button does everything:
    // 1. Create session (REST)
    // 2. Navigate to live view (which auto-connects SignalR + starts recording)
    const session = await startSession(patientId || undefined);
    navigate(`/emergen-ai/session/${session.id}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">
          Emergen AI
        </h1>
        <p className="text-neutral-700 mb-6">
          Start a consultation session with AI clinical companion.
          Recording and transcription begin automatically.
        </p>

        <input
          type="text"
          placeholder="Patient ID (optional)"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="w-full px-4 py-2 border border-neutral-200 rounded mb-4"
        />

        <button
          onClick={handleStart}
          className="w-full bg-primary-700 hover:bg-primary-800 text-white px-4 py-3 rounded-lg font-medium"
        >
          Start Session
        </button>
      </div>
    </div>
  );
}
```

#### Acceptance Criteria

- [ ] Click "Start Session" → REST call creates session
- [ ] Navigate to `/emergen-ai/session/{id}` immediately
- [ ] On mount: SignalR connects + mic recording starts automatically (browser requests permission)
- [ ] Loading state shown during API call

---

### Milestone 2: Live Transcript View (Week 1-2)

**Goal**: Real-time transcript displays as doctor/patient speak.

#### Component

```tsx
export function LiveSessionView() {
  const { sessionId } = useParams();
  const { transcript, isConnected } = useSignalR(sessionId);
  
  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Left panel: Transcript */}
      <div className="w-2/3 flex flex-col">
        <div className="bg-white border-b border-neutral-200 p-4">
          <h2 className="text-lg font-semibold">Live Transcript</h2>
          {!isConnected && (
            <span className="text-warning-500 text-sm">Connecting...</span>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {transcript.map((line) => (
            <TranscriptLine key={line.id} line={line} />
          ))}
        </div>
        
        {/* Fallback text input — used before Milestone 7 (Deepgram) or when mic is denied */}
        <div className="border-t border-neutral-200 p-4">
          <TextInput onSend={(text, speaker) => sendTranscript(text, speaker)} />
        </div>
      </div>
      
      {/* Right panel: Suggestions */}
      <div className="w-1/3 bg-white border-l border-neutral-200 p-4">
        <SuggestionPanel sessionId={sessionId} />
      </div>
    </div>
  );
}

function TranscriptLine({ line }: { line: TranscriptLine }) {
  const isDoctor = line.speaker === 'Doctor';
  
  return (
    <div className={clsxMerge(
      "flex gap-3 p-3 rounded",
      isDoctor ? "bg-primary-50" : "bg-neutral-100"
    )}>
      <div className="flex-shrink-0">
        {isDoctor ? (
          <Stethoscope className="h-5 w-5 text-primary-700" />
        ) : (
          <User className="h-5 w-5 text-neutral-700" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-neutral-900">
          {line.speaker}
        </p>
        <p className="text-neutral-700">{line.text}</p>
      </div>
    </div>
  );
}
```

#### Acceptance Criteria

- [ ] Transcript lines appear in real-time as they're added
- [ ] Doctor/Patient distinguished by icon and color
- [ ] Auto-scroll to latest line
- [ ] Connection status indicator visible

---

### Milestone 3: Emergen AI Button + Suggestions (Week 2)

**Goal**: Doctor presses button → AI suggestion appears in right panel.

#### Component

```tsx
function SuggestionPanel({ sessionId }: { sessionId: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const { connection } = useSignalR(sessionId);

  // Listen for auto-batch suggestions via SignalR
  useEffect(() => {
    if (!connection) return;

    connection.on('SuggestionAdded', (suggestion: Suggestion) => {
      setSuggestions((previous) => [suggestion, ...previous]);
    });

    return () => { connection.off('SuggestionAdded'); };
  }, [connection]);

  // On-demand trigger (button press)
  const handleTrigger = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/suggest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const suggestion = await response.json();
      setSuggestions((previous) => [suggestion, ...previous]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <button
          onClick={handleTrigger}
          disabled={loading}
          className="w-full bg-accent-500 hover:bg-accent-600 text-white px-4 py-3 rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : '✨ Emergen AI'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {suggestions.length === 0 ? (
          <p className="text-neutral-500 text-center mt-8">
            Suggestions appear automatically during conversation.
            Press Emergen AI for immediate analysis.
          </p>
        ) : (
          suggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} />
          ))
        )}
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4 text-accent-500" />
        <span className="text-xs text-neutral-500">
          {formatDistanceToNow(suggestion.triggeredAt)} ago
        </span>
      </div>
      <div className="text-neutral-900 whitespace-pre-line">
        {suggestion.content}
      </div>
    </div>
  );
}
```

#### Acceptance Criteria

- [ ] Click "Emergen AI" button → loading state shows
- [ ] Suggestion appears in <3 seconds
- [ ] Multiple suggestions stack (newest on top)
- [ ] Suggestions persist after page refresh (fetch from API)

---

### Milestone 4: Auto-Start Audio Recording (Web Audio API, Week 3)

**Goal**: Recording starts automatically when doctor enters session view. No separate "Start Recording" button — the "Start Session" button on the previous screen triggers everything.

#### Audio Hook (auto-start on mount)

```tsx
function useAudioRecording(sessionId: string, connection: HubConnection) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Auto-start recording when component mounts (session view loaded)
  useEffect(() => {
    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              connection.invoke('StreamAudioChunk', sessionId, base64);
            };
            reader.readAsDataURL(event.data);
          }
        };

        mediaRecorder.start(1000);  // Send chunks every 1 second
        setIsRecording(true);
      } catch {
        // Mic permission denied — fall back to manual text input
        setIsRecording(false);
      }
    };

    if (connection.state === 'Connected') {
      startRecording();
    }

    return () => {
      mediaRecorderRef.current?.stop();
    };
  }, [sessionId, connection]);

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return { isRecording, stopRecording };
}
```

#### UX Flow

```
"Start Session" button (SessionStartScreen)
  → Create session (REST)
  → Navigate to LiveSessionView
    → useEffect: connect SignalR
    → useEffect: request mic + start recording automatically
    → Transcript lines start appearing
    → Auto-batch suggestions after 5 patient utterances
```

**One button starts everything.** The doctor doesn't need to do anything else — just press "Start Session" and begin talking.

#### Acceptance Criteria

- [ ] Recording starts automatically when session view loads (no separate button)
- [ ] Microphone permission requested on first use (browser prompt)
- [ ] If mic denied → falls back to manual text input gracefully
- [ ] Recording indicator visible (red dot or similar)
- [ ] Audio chunks sent to backend every 1 second
- [ ] Transcript appears with ~1-2 second latency
- [ ] "End Session" button stops recording + ends session

**Deferred**: Audio visualization, noise cancellation, speaker diarization UI.

---

## MVP Acceptance Criteria (End-to-End)

When all milestones are complete, the following user flow must work:

### Happy Path Test

1. **Doctor logs in** (existing Identity.API flow)
2. **Navigate to Emergen AI** → lands on SessionStartScreen
3. **Click "Start Session"** (optionally enter patient ID) → one button starts everything
4. **Automatically**: session created + SignalR connected + mic recording started + transcription begins
5. **Doctor speaks** → text appears in left panel within ~1-2 seconds
6. **Patient speaks** → text appears with speaker auto-detected (Doctor/Patient)
7. **After 5 patient utterances** → auto-batch triggers, suggestion appears automatically in right panel
8. **Suggestion references patient context** → if patient was selected, allergies/medications inform the suggestion
9. **Doctor clicks "Emergen AI" button** → immediate on-demand suggestion (overrides batch timer)
10. **Continue conversation** → transcript keeps updating, auto-suggestions keep coming
11. **End session** → click "End Session" → recording stops, session marked as ended
12. **Persistence** → transcript and suggestions available via API after session ends

**Success**: All 12 steps complete without errors. Doctor pressed one button and the whole system worked.

---

## What's NOT in MVP (Deferred to Phase 7+)

| Feature | Why Deferred | When to Add |
|---------|-------------|-------------|
| **MCP protocol wrapping** | REST services need to be proven first | Phase 7 (wrap services as MCP tools) |
| Deepgram built-in diarization | Extra cost, adds complexity | Phase 7 (MVP uses heuristic + LLM speaker detection) |
| Deepgram WebSocket streaming | REST API works, 200-300ms extra latency acceptable | Phase 7 (upgrade for lower latency) |
| Adaptive batching | Optimization, need usage data first | Phase 9 (basic 5-utterance/60s batch is in MVP) |
| Urgent keyword bypass | Optimization of batching | Phase 9 (after we have keyword frequency data) |
| Tiered LLM models | Cost optimization | Phase 9 (GPT-4o-mini is cheap enough for MVP) |
| Skills admin UI + DB | Admin UI complexity | Phase 8+ (YAML files with deploy work fine for MVP) |
| Suggestion history UI | Backend works, UI polish | Phase 7 |
| Urgency classification | Need real data to calibrate | Phase 7 (schema field exists, just null for MVP) |
| Edit transcript | Data quality tool | Phase 8+ |
| Upload documents UI | Seeder works for MVP | Phase 7 |
| Multi-session dashboard | Analytics/reporting | Phase 8+ |
| Patient/Admin views | Scope creep | Phase 8+ |
| FHIR tools (fhir_read, etc.) | No FHIR data mappings yet | Phase 8 (MVP uses direct HTTP to Patient.API) |
| Prompt versioning / DB | Config file is sufficient for MVP | Phase 8+ |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Deepgram REST latency | Low — ~200-300ms extra vs WebSocket | Acceptable for MVP. Upgrade to WebSocket in Phase 7. |
| Deepgram API failure | High — no transcript | Error handling in hub, fallback to manual text input. Non-fatal. |
| OpenAI API failure | High — no suggestions | Error handling in SuggestionService, return null. Non-fatal to session. |
| pgvector query performance | Medium — slow RAG blocks suggestions | Pre-benchmark with 10K chunks, add HNSW index early |
| SignalR at scale | Medium — 30 concurrent sessions | Load test with 50 connections before launch |
| LLM cost overruns | High — budget risk | Hardcode rate limit: 1 suggestion per 60 seconds per session (batch timer) |
| Speaker detection accuracy | Medium — AI heuristic may misidentify | First speaker = Doctor (deterministic), LLM confirms from context, stored in `speaker_map` once resolved |
| Patient.API unavailable | Low — degraded suggestions | PatientContextService returns null on failure, suggestions still work without patient context |

---

## Timeline Summary

| Phase | Duration | Effort | Deliverable |
|-------|----------|--------|-------------|
| 6a: PostgreSQL Migration | 1 week | 1 engineer | EmergenDB schema + pgvector |
| 6b: EmergenAI.API MVP | 4-5 weeks | 1 backend engineer | All 8 milestones (REST + SignalR + Deepgram + LLM) |
| 6c: Doctor Dashboard UI | 2-3 weeks | 1 frontend engineer | React UI (transcript + suggestions + audio) |
| **Total** | **8-10 weeks** | **2 engineers** | **Functional MVP** |

---

## Success Metrics (Post-Launch)

After MVP launches to 10-20 pilot doctors, track:

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Sessions per doctor per day | >5 | Doctors are actually using it |
| Avg suggestions per session | 2-5 | Not too spammy, not too quiet |
| Suggestion relevance (doctor feedback) | >70% thumbs up | Quality check |
| Avg session duration | 10-20 min | Matches expected consultation length |
| STT accuracy (manual review) | >90% for medical terms | Deepgram performs well enough |
| Latency (audio → transcript) | <2 sec | Real-time UX feels live |
| Latency (button → suggestion) | <3 sec | Acceptable responsiveness |

If metrics are good → expand to Phase 7 (polish + scale).  
If metrics are bad → iterate on prompts, RAG, or batching logic before adding features.

---

## Ready to Start

✅ **Phase 6a (PostgreSQL migration)** can start immediately — no dependencies.  
✅ **Phase 6b Milestone 1-2** (project scaffold + session management) can start in parallel.  
✅ **Phase 6c** waits for Milestones 1-6 (backend APIs ready).

**Next step**: Kick off Phase 6a, create GitHub issues for each milestone, assign work.
