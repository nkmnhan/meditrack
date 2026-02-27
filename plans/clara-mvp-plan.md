# Clara — MVP Implementation Plan

> **Goal**: Ship a minimal but functional AI clinical companion in 10-12 weeks. Focus: core workflow works end-to-end, defer all polish.

**Last updated**: 2026-02-27

---

## MVP Definition — What's "Minimal"?

| Feature | MVP Scope | Deferred |
|---------|-----------|----------|
| **Live Transcript** | Text appears on screen as doctor/patient speak | Speaker icons, formatting, edit/correct |
| **AI Suggestions** | Auto-suggest every 5 patient utterances / 60s + on-demand button | Adaptive batching, urgency levels, suggestion history |
| **Clara Button** | Doctor presses button → immediate AI analysis (overrides batch timer) | Smart triggers, urgent keyword bypass |
| **Patient Context** | Fetch patient summary from Patient.API for context-aware suggestions | Full FHIR resource access, cross-service queries |
| **Knowledge Base** | 5-10 sample medical guideline docs searchable | Upload UI, categories, versioning |
| **Clinical Skills** | 2-3 YAML skill files in `skills/core/`, loaded at startup | Skill library, admin management, DB persistence |
| **STT** | Deepgram REST API (per-chunk transcription, ~200-300ms extra latency) | WebSocket streaming |
| **Speaker Detection** | AI-based: first speaker = Doctor (deterministic), LLM confirms from conversation context | Deepgram built-in diarization (Phase 7) |
| **Models** | GPT-4o-mini only (configured via `appsettings.json`) | Tiered strategy, model selection UI |
| **Prompts** | System prompt in resource file (`Prompts/system.txt`), never hardcoded in C# | DB persistence, admin editing, versioning |
| **Auth** | Existing JWT from Identity.API (doctors only) | Patient/admin views, role-based suggestions |
| **MCP** | Pre-MCP: plain REST + SignalR services. MCP tool wrapping in Phase 7. | Full MCP protocol, tool discovery, agent orchestration |

**Success criteria**: Doctor starts session → speaks → sees transcript → AI auto-suggests after 5 patient utterances → doctor can also press "Clara" button for immediate analysis → suggestions reference patient context + medical knowledge. That's it.

**Note on MCP**: The architecture is designed for MCP-native operation, but the MVP builds plain REST services first. The services are structured so they can be wrapped as MCP tools (`knowledge_search`, `session_suggest`, etc.) in Phase 7 with minimal refactoring. This avoids adding protocol ceremony before the tools themselves are proven.

---

## Phase 6a: PostgreSQL + pgvector Migration

**Duration**: 1 week  
**Status**: Prerequisite blocker

### Deliverables

| Task | Output | Acceptance Criteria |
|------|--------|---------------------|
| Create EF Core migrations | Migration files in each service project | All 6 DB schemas converted (Identity, Patient, Appointment, MedicalRecords, Audit, Clara) |
| Set up pgvector | `CREATE EXTENSION vector` via init script | Vector column creates without errors |
| Test EF Core provider | All existing APIs start successfully | Zero breaking changes to domain services |
| Load test | Benchmark suite | Write: 1K inserts/sec, pgvector search: <50ms at 1.5 QPS |

### Configuration

```sql
-- ClaraDB schema (new)
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

## Phase 6b: Clara.API — Core Service (MVP)

**Duration**: 5-6 weeks
**Status**: Main implementation phase

### Milestone 1: Project Scaffold + Health Check + AI Infrastructure (Week 1)

**Goal**: Empty service runs, connects to DB, responds to health checks. AI abstraction layer and resilience patterns wired from day one.

#### Deliverables

```
src/Clara.API/
├── Clara.API.csproj
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
│   └── ClaraDbContext.cs
├── Prompts/
│   └── system.txt              ← system prompt lives here, NOT in C# source
└── Health/
    └── ClaraHealthCheck.cs

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

**Content files note**: `Prompts/system.txt` must be included in the published output. Add this to the `.csproj`:

```xml
<!-- Clara.API.csproj — ensure Prompts/ files are in the publish output -->
<ItemGroup>
  <Content Include="Prompts\**\*" CopyToOutputDirectory="PreserveNewest" />
</ItemGroup>
```

Both `skills/core/` and `SeedData/Guidelines/` live at the repo root (outside the project), so they must be COPY'd explicitly in the Dockerfile:
```dockerfile
COPY skills/core/ /app/skills/core/
COPY SeedData/Guidelines/ /app/SeedData/Guidelines/
```

`Prompts/system.txt` is inside the project → included via `dotnet publish` (the `CopyToOutputDirectory` above handles this). No extra Dockerfile COPY needed.

#### NuGet Packages (add to `Directory.Packages.props`)

```xml
<!-- Data -->
<PackageVersion Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="10.0.0" />
<PackageVersion Include="Pgvector.EntityFrameworkCore" Version="0.3.0" />

<!-- AI Abstraction Layer (Microsoft.Extensions.AI) -->
<PackageVersion Include="Microsoft.Extensions.AI" Version="9.5.0" />
<PackageVersion Include="Microsoft.Extensions.AI.OpenAI" Version="9.5.0" />

<!-- AI Providers (used by M.E.AI under the hood) -->
<PackageVersion Include="OpenAI" Version="2.2.0" />

<!-- Resilience (Polly v8 via Microsoft.Extensions.Http.Resilience) -->
<PackageVersion Include="Microsoft.Extensions.Http.Resilience" Version="9.5.0" />

<!-- Utilities -->
<PackageVersion Include="YamlDotNet" Version="16.3.0" />
<PackageVersion Include="AspNetCore.HealthChecks.NpgSql" Version="9.0.0" />
```

> **IMPORTANT — Package versions are placeholders**: All version numbers above must be verified against NuGet Gallery before implementation. Check the pre-implementation checklist. Never use preview/RC versions (per CLAUDE.md). The `Microsoft.Extensions.AI` packages reached GA with .NET 9 (late 2024) and are forward-compatible with .NET 10. The `Microsoft.Extensions.Http.Resilience` package is part of the Microsoft.Extensions ecosystem (stable since .NET 8). Verify actual latest stable versions for all packages at implementation time.

#### npm Packages (frontend — add in Phase 6c)

```bash
npm install @microsoft/signalr
```

#### EF Core Migration

```bash
dotnet ef migrations add InitialClara -p src/Clara.API -s src/Clara.API
```

#### Health Check Implementation

```csharp
// Health/ClaraHealthCheck.cs
public class ClaraHealthCheck : IHealthCheck
{
    private readonly ClaraDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;

    public ClaraHealthCheck(ClaraDbContext db, IHttpClientFactory httpClientFactory)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var data = new Dictionary<string, object>();

        // Check PostgreSQL — CRITICAL (unhealthy if down)
        try
        {
            await _db.Database.CanConnectAsync(cancellationToken);
            data["postgresql"] = "healthy";
        }
        catch (Exception exception)
        {
            return HealthCheckResult.Unhealthy("PostgreSQL unreachable", exception, data);
        }

        // Check Deepgram reachability (HEAD request, no billing impact)
        // Degraded, not unhealthy — manual text fallback works
        try
        {
            var deepgramClient = _httpClientFactory.CreateClient("Deepgram");
            var response = await deepgramClient.SendAsync(
                new HttpRequestMessage(HttpMethod.Head, "https://api.deepgram.com/v1/listen"),
                cancellationToken);
            data["deepgram"] = response.IsSuccessStatusCode ? "reachable" : "degraded";
        }
        catch
        {
            data["deepgram"] = "unreachable";
        }

        // Check OpenAI reachability (list models endpoint — lightweight, no token cost)
        // Degraded, not unhealthy — circuit breaker handles outages
        try
        {
            var openAiClient = _httpClientFactory.CreateClient("OpenAI");
            var response = await openAiClient.GetAsync(
                "https://api.openai.com/v1/models", cancellationToken);
            data["openai"] = response.IsSuccessStatusCode ? "reachable" : "degraded";
        }
        catch
        {
            data["openai"] = "unreachable";
        }

        // Overall: healthy if PostgreSQL is up (AI services are degraded, not critical)
        var hasDegradedService = data.Values.Any(value =>
            value is string status && status is "degraded" or "unreachable");

        return hasDegradedService
            ? HealthCheckResult.Degraded("AI services partially unavailable", data: data)
            : HealthCheckResult.Healthy("All systems operational", data);
    }
}
```

#### Dockerfile

```dockerfile
# src/Clara.API/Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Directory.Build.props", "."]
COPY ["Directory.Packages.props", "."]
COPY ["src/Clara.API/Clara.API.csproj", "src/Clara.API/"]
COPY ["src/MediTrack.ServiceDefaults/MediTrack.ServiceDefaults.csproj", "src/MediTrack.ServiceDefaults/"]
RUN dotnet restore "src/Clara.API/Clara.API.csproj"
COPY . .
WORKDIR "/src/src/Clara.API"
RUN dotnet build -c Release -o /app/build

FROM build AS publish
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
COPY skills/core/ /app/skills/core/
COPY SeedData/Guidelines/ /app/SeedData/Guidelines/
ENTRYPOINT ["dotnet", "Clara.API.dll"]
```

#### AI Abstraction Layer — `Microsoft.Extensions.AI`

Use `IChatClient` and `IEmbeddingGenerator` as the LLM-agnostic abstractions. This aligns with CLAUDE.md's "MCP-native, no vendor lock-in" principle and is the official .NET pattern (GA since 2025).

**Why from day one**: Costs ~30 minutes to wire up. Gives you provider-swappable DI, built-in OpenTelemetry, and caching middleware — for free. Like `ILogger` is for logging, `IChatClient` is for LLMs.

```csharp
// Program.cs — AI service registration

// 1. Register IChatClient (LLM abstraction)
//    Wraps OpenAI SDK with middleware pipeline
builder.Services.AddChatClient(services =>
    new OpenAIChatClient(
        builder.Configuration["OpenAI:Model"] ?? "gpt-4o-mini",
        new ApiKeyCredential(builder.Configuration["OpenAI:ApiKey"]!)))
    .UseOpenTelemetry()        // auto-instrument: tokens, latency, cost
    .UseDistributedCache()     // exact-match response cache (Redis)
    .Build();

// 2. Register IEmbeddingGenerator (embedding abstraction)
builder.Services.AddEmbeddingGenerator(services =>
    new OpenAIEmbeddingGenerator(
        builder.Configuration["OpenAI:EmbeddingModel"] ?? "text-embedding-3-small",
        new ApiKeyCredential(builder.Configuration["OpenAI:ApiKey"]!)))
    .UseOpenTelemetry()
    .Build();
```

**Key benefit**: To swap from OpenAI to Azure OpenAI, Anthropic, or local Ollama — change one line in DI registration. Business logic (`SuggestionService`, `KnowledgeService`) depends only on `IChatClient` / `IEmbeddingGenerator` interfaces.

#### Resilience — Polly v8 Circuit Breaker + Retry

AI APIs are **slow, expensive, and unreliable** compared to traditional REST services. Without resilience patterns, a Deepgram outage hangs every request for 30s → thread pool starves → entire app goes down (not just AI features).

Wire this on day one — it's 5 minutes of setup that prevents cascading failures.

```csharp
// Program.cs — Resilience for external AI HTTP clients

// Deepgram STT client — with retry + circuit breaker + timeout
builder.Services.AddHttpClient("Deepgram", client =>
{
    client.BaseAddress = new Uri("https://api.deepgram.com/");
    client.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Token", builder.Configuration["Deepgram:ApiKey"]);
})
.AddStandardResilienceHandler(options =>
{
    // Retry: 3 attempts, exponential backoff with jitter
    options.Retry.MaxRetryAttempts = 3;
    options.Retry.UseJitter = true;

    // Circuit breaker: open after 50% failure rate in 30s window
    options.CircuitBreaker.FailureRatio = 0.5;
    options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
    options.CircuitBreaker.MinimumThroughput = 5;
    options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(30);

    // Timeout: don't hang on slow Deepgram responses
    options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(10);
    options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(30);
});

// Patient.API client — for fetching patient context
builder.Services.AddHttpClient("PatientApi", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Services:PatientApi"]!);
})
.AddStandardResilienceHandler();  // sensible defaults for internal service calls
```

**What `AddStandardResilienceHandler` does out of the box**:
- Retry with exponential backoff + jitter (handles 500, 408, 429)
- Respects `Retry-After` headers (critical for OpenAI rate limits)
- Circuit breaker (stops hammering a down service)
- Request timeout (prevents thread pool starvation)
- Bulkhead isolation (limits concurrent calls per client)

#### Docker Compose Addition

```yaml
# docker-compose.yml
clara-api:
  build:
    context: .
    dockerfile: src/Clara.API/Dockerfile
  ports:
    - "5005:8080"
  environment:
    - ConnectionStrings__ClaraDb=Host=postgres;Database=ClaraDB;Username=clara;Password=${CLARA_DB_PASSWORD}
    - Deepgram__ApiKey=${DEEPGRAM_API_KEY}
    - OpenAI__ApiKey=${OPENAI_API_KEY}
    - OpenAI__Model=gpt-4o-mini
  depends_on:
    - postgres
    - identity-api
```

#### Acceptance Criteria

- [ ] `docker-compose up clara-api` starts successfully
- [ ] Health endpoint returns 200: `GET /health`
- [ ] EF Core connects to ClaraDB (PostgreSQL)
- [ ] Migrations run on startup
- [ ] `IChatClient` and `IEmbeddingGenerator` resolve from DI without errors
- [ ] OpenTelemetry traces appear for AI calls (verify in Aspire Dashboard or console exporter)
- [ ] Polly resilience handler attached to Deepgram + Patient.API HTTP clients (verify via health check with Deepgram unreachable → degraded, not crash)

---

### Milestone 2: Session Management + Security Hardening (Week 1-2)

**Goal**: Doctor can start/end sessions via REST API. All endpoints secured from day one.

#### Security Hardening (applies to ALL endpoints and hubs)

**Auth**: Every endpoint and hub requires `[Authorize(Roles = UserRoles.Doctor)]`. Doctors only for MVP.

**CORS**: Explicit CORS policy for SignalR WebSocket connections from the frontend origin:

```csharp
// Program.cs — CORS for SignalR
builder.Services.AddCors(options =>
{
    options.AddPolicy("ClaraSignalR", policy =>
    {
        policy.WithOrigins(builder.Configuration["AllowedOrigins"]!)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Required for SignalR
    });
});

// After app.UseRouting()
app.UseCors("ClaraSignalR");
```

**Rate Limiting**: Prevent abuse and cost overruns on AI endpoints:

```csharp
// Program.cs — rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("suggest", limiter =>
    {
        limiter.PermitLimit = 1;
        limiter.Window = TimeSpan.FromSeconds(10);
        limiter.QueueLimit = 0;
    });
});

// On the suggest endpoint:
[HttpPost("/api/sessions/{id}/suggest")]
[EnableRateLimiting("suggest")]
public async Task<IActionResult> Suggest(Guid id) { ... }
```

**FluentValidation**: Add validators for session DTOs:

```csharp
public class StartSessionRequestValidator : AbstractValidator<StartSessionRequest>
{
    public StartSessionRequestValidator()
    {
        RuleFor(request => request.PatientId)
            .MaximumLength(128)
            .When(request => request.PatientId != null);
    }
}
```

#### Endpoints

```csharp
[Authorize(Roles = UserRoles.Doctor)]
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
    private readonly ClaraDbContext _db;
    private readonly BatchTriggerService _batchTriggerService;

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

        // Dispose batch timer + clear utterance count (prevents Timer leak)
        _batchTriggerService.CleanupSession(sessionId.ToString());

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
[Authorize(Roles = UserRoles.Doctor)]
public class SessionHub : Hub
{
    private readonly ClaraDbContext _db;

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
    private readonly ClaraDbContext _db;
    private readonly IEmbeddingGenerator<string, Embedding<float>> _embeddingGenerator;

    public KnowledgeBaseSeeder(
        ClaraDbContext db,
        IEmbeddingGenerator<string, Embedding<float>> embeddingGenerator)  // M.E.AI abstraction
    {
        _db = db;
        _embeddingGenerator = embeddingGenerator;
    }

    public async Task SeedAsync()
    {
        // Use AppContext.BaseDirectory for Docker compatibility
        var seedPath = Path.Combine(AppContext.BaseDirectory, "SeedData", "Guidelines");
        var docs = Directory.GetFiles(seedPath, "*.txt");

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

            for (int chunkIndex = 0; chunkIndex < chunks.Count; chunkIndex++)
            {
                // IEmbeddingGenerator from M.E.AI (registered in Milestone 1)
                var embeddingResult = await _embeddingGenerator.GenerateAsync(chunks[chunkIndex]);
                var embeddingVector = embeddingResult.Vector;

                _db.KnowledgeChunks.Add(new KnowledgeChunk
                {
                    DocumentName = document.FileName,
                    Content = chunks[chunkIndex],
                    Embedding = embeddingVector.ToArray(),  // float[] → VECTOR(1536)
                    Category = "guideline",
                    ChunkIndex = chunkIndex
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
    private readonly ClaraDbContext _db;
    private readonly IEmbeddingGenerator<string, Embedding<float>> _embeddingGenerator;

    public KnowledgeService(
        ClaraDbContext db,
        IEmbeddingGenerator<string, Embedding<float>> embeddingGenerator)  // M.E.AI abstraction
    {
        _db = db;
        _embeddingGenerator = embeddingGenerator;
    }

    public async Task<List<SearchResult>> SearchAsync(string query, int topK = 3)
    {
        // 1. Embed the query via IEmbeddingGenerator (M.E.AI — provider-agnostic)
        var embeddingResult = await _embeddingGenerator.GenerateAsync(query);
        var queryEmbedding = embeddingResult.Vector.ToArray();

        // 2. pgvector cosine similarity search
        var results = await _db.KnowledgeChunks
            .Select(chunk => new
            {
                Chunk = chunk,
                Score = chunk.Embedding.CosineDistance(queryEmbedding)  // pgvector operator
            })
            .OrderBy(result => result.Score)  // lower distance = higher similarity
            .Take(topK)
            .ToListAsync();

        return results.Select(result => new SearchResult
        {
            DocumentName = result.Chunk.DocumentName,
            Content = result.Chunk.Content,
            Score = 1 - result.Score,  // convert distance to similarity
            ChunkIndex = result.Chunk.ChunkIndex
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
- Provide 1-3 concise, actionable bullet points
- Flag any potential drug interactions or contraindications
- If a clinical skill is active, follow its workflow

## Output rules
- Never diagnose — suggest considerations for the doctor to evaluate
- Respond ONLY with valid JSON matching the required schema
- Each bullet must be a complete, actionable sentence
- Confidence: "high" = strong clinical evidence, "medium" = reasonable inference, "low" = worth considering
```

#### Structured Output Schema

**Treat LLM output as untrusted.** The LLM is a probabilistic system — it can return malformed text, hallucinated formats, or even XSS payloads. Enforce structured JSON output with a schema so parsing never fails and no raw LLM text reaches the UI unvalidated.

```csharp
// Domain/SuggestionOutput.cs — strongly-typed LLM response
public sealed record SuggestionOutput
{
    public required List<string> Bullets { get; init; }
    public required string Confidence { get; init; }  // "high", "medium", "low"
    public List<string>? RelevantMedications { get; init; }
    public string? ClinicalSkillUsed { get; init; }
}

// JSON schema sent to OpenAI (forces structured response)
private static readonly BinaryData SuggestionJsonSchema = BinaryData.FromObjectAsJson(new
{
    type = "object",
    properties = new
    {
        bullets = new
        {
            type = "array",
            items = new { type = "string" },
            minItems = 1,
            maxItems = 3,
            description = "Concise, actionable clinical suggestions"
        },
        confidence = new
        {
            type = "string",
            @enum = new[] { "high", "medium", "low" },
            description = "Clinical confidence level"
        },
        relevantMedications = new
        {
            type = "array",
            items = new { type = "string" },
            description = "Medications mentioned or relevant to the suggestion"
        },
        clinicalSkillUsed = new
        {
            type = "string",
            description = "ID of the clinical skill that guided this suggestion, if any"
        }
    },
    required = new[] { "bullets", "confidence" },
    additionalProperties = false
});
```

#### Service

Uses `IChatClient` from Microsoft.Extensions.AI (registered in Milestone 1) — not the OpenAI SDK directly. This keeps the service LLM-agnostic and gives us OpenTelemetry + caching for free via the middleware pipeline.

```csharp
public class SuggestionService
{
    private readonly IChatClient _chatClient;         // M.E.AI abstraction — NOT OpenAI SDK directly
    private readonly KnowledgeService _knowledge;
    private readonly PatientContextService _patientContext;
    private readonly ClaraDbContext _db;
    private readonly string _systemPrompt;
    private readonly ILogger<SuggestionService> _logger;

    public SuggestionService(
        IChatClient chatClient,                       // injected via DI (registered in Program.cs)
        KnowledgeService knowledge,
        PatientContextService patientContext,
        ClaraDbContext db,
        ILogger<SuggestionService> logger)
    {
        _chatClient = chatClient;
        _knowledge = knowledge;
        _patientContext = patientContext;
        _db = db;
        _logger = logger;

        // Load prompt from resource file — not hardcoded
        // Use AppContext.BaseDirectory for Docker compatibility (avoids CWD issues)
        _systemPrompt = File.ReadAllText(
            Path.Combine(AppContext.BaseDirectory, "Prompts", "system.txt"));
    }

    public async Task<Suggestion?> GenerateSuggestionAsync(
        Guid sessionId,
        List<TranscriptLine> recentLines,
        string source)  // "batch" or "on_demand"
    {
        var stopwatch = Stopwatch.StartNew();

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
                ? await _patientContext.GetSummaryAsync(session.PatientId, session.DoctorId)
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

            // 5. Call LLM via IChatClient (M.E.AI — provider-agnostic)
            //    OpenTelemetry, caching, and retry are handled by the middleware pipeline
            var chatMessages = new List<ChatMessage>
            {
                new(ChatRole.System, fullSystemPrompt),
                new(ChatRole.User, userPrompt)
            };

            var chatOptions = new ChatOptions
            {
                Temperature = 0.3f,
                MaxOutputTokens = 300,
                ResponseFormat = ChatResponseFormat.ForJsonSchema(
                    "clinical_suggestion", SuggestionJsonSchema)
            };

            var completion = await _chatClient.GetResponseAsync(chatMessages, chatOptions);
            stopwatch.Stop();

            // 6. Parse structured output (LLM output is UNTRUSTED — validate before use)
            var suggestionOutput = JsonSerializer.Deserialize<SuggestionOutput>(
                completion.Text,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (suggestionOutput is null || suggestionOutput.Bullets.Count == 0)
            {
                _logger.LogWarning("LLM returned empty/invalid suggestion for session {SessionId}", sessionId);
                return null;
            }

            // 7. Log token usage + cost (structured logging for observability)
            var usage = completion.Usage;
            LogTokenUsage(sessionId, source, usage, stopwatch.Elapsed);

            // 8. Save suggestion (store structured content as formatted text for display)
            var formattedContent = string.Join("\n", suggestionOutput.Bullets.Select(b => $"- {b}"));
            var suggestion = new Suggestion
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                Content = formattedContent,
                TriggeredAt = DateTimeOffset.UtcNow,
                Type = suggestionOutput.ClinicalSkillUsed ?? "clinical",
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

    /// <summary>
    /// Structured log for per-session token/cost tracking.
    /// Enables cost dashboards, anomaly detection, and budget alerting.
    /// </summary>
    private void LogTokenUsage(
        Guid sessionId, string source, ChatResponseUsage? usage, TimeSpan latency)
    {
        if (usage is null) return;

        // GPT-4o-mini pricing: $0.15/1M input, $0.60/1M output
        const decimal inputCostPer1M = 0.15m;
        const decimal outputCostPer1M = 0.60m;

        var estimatedCost =
            (usage.InputTokenCount * inputCostPer1M / 1_000_000m) +
            (usage.OutputTokenCount * outputCostPer1M / 1_000_000m);

        _logger.LogInformation(
            "LLM call completed: session={SessionId} source={Source} " +
            "tokens_in={InputTokens} tokens_out={OutputTokens} " +
            "total_tokens={TotalTokens} cost_usd=${Cost:F6} latency_ms={LatencyMs}",
            sessionId, source,
            usage.InputTokenCount, usage.OutputTokenCount,
            usage.TotalTokenCount, estimatedCost, latency.TotalMilliseconds);
    }
}
```

> **Why `IChatClient` instead of `ChatClient` (OpenAI SDK)?**
> - Swap providers without changing business logic (OpenAI → Azure OpenAI → Anthropic → Ollama)
> - OpenTelemetry auto-instrumentation via `.UseOpenTelemetry()` pipeline middleware
> - Exact-match response caching via `.UseDistributedCache()` (no extra code)
> - Aligns with CLAUDE.md: "No LLM vendor names in architecture code — use MCP abstractions only"
> - `IChatClient` is the official .NET abstraction (GA since 2025, like `ILogger` for logging)

#### Patient Context Service

Per CLAUDE.md: "Every MCP tool call touching patient data must be audit-logged." Patient context fetch is PHI access and must emit an audit event.

```csharp
// Fetches minimal patient summary from Patient.API
public class PatientContextService
{
    private readonly HttpClient _httpClient;
    private readonly IEventBus _eventBus;
    private readonly ILogger<PatientContextService> _logger;

    public async Task<string?> GetSummaryAsync(string patientId, string doctorId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"api/patients/{patientId}");

            // PHI audit — fire-and-forget (audit never crashes business operation)
            _ = SafePublishAuditAsync(patientId, doctorId,
                response.IsSuccessStatusCode ? "success" : "not_found");

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

    private async Task SafePublishAuditAsync(string patientId, string doctorId, string status)
    {
        try
        {
            await _eventBus.PublishAsync(new PHIAccessedIntegrationEvent(
                UserId: doctorId,
                ResourceType: AuditConstants.ResourceTypes.Patient,
                ResourceId: patientId,
                Operation: AuditConstants.Operations.Read,
                OperationContext: AuditConstants.OperationContexts.McpToolCall,
                Status: status));
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Failed to publish PHI audit event for patient {PatientId}",
                patientId[..Math.Min(8, patientId.Length)] + "...");
        }
    }
}
```

#### Batching Logic (singleton service — NOT in hub)

SignalR hubs are **transient** (new instance per invocation). Batching state must live in a singleton service.

**Important**: `SpeakerDetectionService` is scoped (uses `ClaraDbContext`), so it's correctly resolved per-request in the hub. The singleton `BatchTriggerService` uses `IServiceScopeFactory` to create a scope when it needs scoped services. Timer objects **must** be disposed on session end — `CleanupSession` handles this.

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
        var db = scope.ServiceProvider.GetRequiredService<ClaraDbContext>();
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
- [ ] **Structured output**: LLM returns valid JSON matching `SuggestionOutput` schema (bullets + confidence)
- [ ] **Output validation**: Malformed LLM responses are caught and logged, not passed to UI
- [ ] **Cost tracking**: Every LLM call logs structured token usage (input/output tokens, estimated cost, latency)
- [ ] **IChatClient**: SuggestionService depends on `IChatClient` (M.E.AI), NOT `ChatClient` (OpenAI SDK)

**Deferred**: Tiered models, adaptive batching, urgent keyword bypass, suggestion history UI, semantic caching.

---

### Milestone 7: Deepgram STT Integration (Week 4-5)

**Goal**: Replace manual text input with Deepgram REST API (per-chunk transcription). Accept ~200-300ms extra latency vs WebSocket — upgrade to WebSocket streaming in Phase 7.

**Audio path**: Browser mic → MediaRecorder (1s chunks) → base64 via SignalR → server → Deepgram REST → transcript text → broadcast via SignalR.

#### SignalR Hub Changes

```csharp
[Authorize(Roles = UserRoles.Doctor)]
public class SessionHub : Hub
{
    private readonly DeepgramService _deepgram;
    private readonly SpeakerDetectionService _speakerDetection;
    private readonly BatchTriggerService _batchTrigger;  // singleton
    private readonly ClaraDbContext _db;
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
            // Browser MediaRecorder default format is audio/webm (NOT wav)
            content.Headers.ContentType = new MediaTypeHeaderValue("audio/webm");

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
    private readonly ClaraDbContext _db;

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
    // Default path uses AppContext.BaseDirectory for Docker compatibility
    public void LoadSkills(string? skillsDirectory = null)
    {
        skillsDirectory ??= Path.Combine(AppContext.BaseDirectory, "skills", "core");

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

#### Route Protection

All Clara routes require Doctor role. Add `RoleGuard` wrapper in the router:

```tsx
// In router config
{
  path: '/clara',
  element: <RoleGuard allowedRoles={[UserRoles.Doctor]}><ClaraLayout /></RoleGuard>,
  children: [
    { index: true, element: <SessionStartScreen /> },
    { path: 'session/:sessionId', element: <LiveSessionView /> },
  ]
}
```

**Note**: `RoleGuard` is UX only (per CLAUDE.md OWASP A01). Real security is enforced server-side by `[Authorize(Roles = UserRoles.Doctor)]` on all API endpoints and the SignalR hub.

#### Component Structure

```
src/MediTrack.Web/src/features/clara/
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
    navigate(`/clara/session/${session.id}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">
          Clara
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
- [ ] Navigate to `/clara/session/{id}` immediately
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
    <div className="flex flex-col md:flex-row h-screen bg-neutral-50">
      {/* Transcript panel: full width on mobile, 2/3 on desktop */}
      <div className="flex-1 md:w-2/3 flex flex-col min-h-0">
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

      {/* Suggestions panel: stacks below on mobile, side panel on desktop */}
      <div className="h-1/3 md:h-auto md:w-1/3 bg-white border-t md:border-t-0 md:border-l border-neutral-200 p-4">
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

### Milestone 3: Clara Button + Suggestions (Week 2)

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
          {loading ? 'Analyzing...' : '✨ Clara'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {suggestions.length === 0 ? (
          <p className="text-neutral-500 text-center mt-8">
            Suggestions appear automatically during conversation.
            Press Clara for immediate analysis.
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

- [ ] Click "Clara" button → loading state shows
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
        // Explicit mimeType — matches backend Content-Type: audio/webm
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
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
2. **Navigate to Clara** → lands on SessionStartScreen
3. **Click "Start Session"** (optionally enter patient ID) → one button starts everything
4. **Automatically**: session created + SignalR connected + mic recording started + transcription begins
5. **Doctor speaks** → text appears in left panel within ~1-2 seconds
6. **Patient speaks** → text appears with speaker auto-detected (Doctor/Patient)
7. **After 5 patient utterances** → auto-batch triggers, suggestion appears automatically in right panel
8. **Suggestion references patient context** → if patient was selected, allergies/medications inform the suggestion
9. **Doctor clicks "Clara" button** → immediate on-demand suggestion (overrides batch timer)
10. **Continue conversation** → transcript keeps updating, auto-suggestions keep coming
11. **End session** → click "End Session" → recording stops, session marked as ended
12. **Persistence** → transcript and suggestions available via API after session ends

**Success**: All 12 steps complete without errors. Doctor pressed one button and the whole system worked.

---

## Production AI Infrastructure Patterns

This section documents the key infrastructure differences between traditional web apps (eShop-style) and AI-integrated web apps. These patterns inform architectural decisions throughout the plan.

### The Three Key Differences from Traditional APIs

| | Traditional API (eShop) | AI/LLM API (Clara) |
|---|---|---|
| **Determinism** | Same input = same output | Same prompt can give different results |
| **Latency** | 10-100ms typical | 1-30 seconds, P99 can spike unpredictably |
| **Cost** | Negligible per request | Tokens = money ($0.15-$15 per 1M tokens) |

Every production AI pattern flows from these three differences.

### Resilience Layer (Implemented in Milestone 1)

| Pattern | Tool | What It Handles |
|---------|------|----------------|
| **Retry + backoff** | Polly v8 (`AddStandardResilienceHandler`) | Transient 500s, brief rate limits (429) |
| **Circuit breaker** | Polly v8 (built into standard handler) | Prolonged outages — stops hammering down services |
| **Timeout** | Polly v8 (attempt + total timeout) | Prevents thread pool starvation from slow LLM responses |
| **Fallback** | Application-level (`return null`) | Graceful degradation — session continues without AI suggestions |

**Why all on day one**: Without a circuit breaker, a Deepgram outage causes every audio chunk to hang for 30s → SignalR thread pool starves → the entire app goes down, not just the AI feature.

### LLM Abstraction Layer (Implemented in Milestone 1)

`Microsoft.Extensions.AI` (`IChatClient` / `IEmbeddingGenerator`) provides the LLM-agnostic abstraction:

- **Provider swapping**: Change `OpenAIChatClient` → `AzureOpenAIChatClient` → `OllamaChatClient` in one DI registration line
- **Middleware pipeline**: `.UseOpenTelemetry()` → `.UseDistributedCache()` → `.Build()` — composable like ASP.NET middleware
- **Testability**: Mock `IChatClient` in integration tests (no real API key needed in CI)

### Structured Output (Implemented in Milestone 6)

LLM output is **untrusted**. It can return malformed text, hallucinated formats, or injection payloads. JSON schema enforcement + validation prevents all of these.

### Cost Management Strategy

| Phase | Strategy | Expected Impact |
|-------|----------|----------------|
| **MVP (now)** | Per-call token logging + rate limiter (1 req/10s) | Visibility + hard ceiling |
| **Phase 7** | Exact-match response cache (Redis via M.E.AI `.UseDistributedCache()`) | 20-40% cost reduction |
| **Phase 9** | Tiered model routing (mini for batch, Sonnet for on-demand) | 70-91% cost reduction |
| **Phase 9+** | Semantic cache (similar queries → cached response, pgvector similarity) | Additional 20-30% on top |

### Observability for AI Pipelines

Traditional APM doesn't capture what you need to debug AI issues. Track these:

| Metric | What It Tells You | How |
|--------|-------------------|-----|
| Tokens per call (in/out) | Cost per suggestion | Structured log in `SuggestionService` |
| Latency per LLM call | UX responsiveness | Stopwatch + structured log |
| Cache hit rate | Cost optimization effectiveness | M.E.AI OpenTelemetry metrics |
| Circuit breaker state | External service health | Polly OpenTelemetry integration |
| Suggestions per session | Batching effectiveness | DB query + dashboard |

`Microsoft.Extensions.AI.UseOpenTelemetry()` auto-captures most of these. Export to .NET Aspire Dashboard (dev) or Grafana/Azure Monitor (production).

### Reference Architectures (Beyond eShop)

| Project | Relevance | Key Pattern to Learn |
|---------|-----------|---------------------|
| **[Canvas Hyperscribe](https://github.com/canvas-medical/canvas-hyperscribe)** | Open-source clinical AI copilot — **closest to Clara** | Agent chaining, clinical guardrails, EMR integration |
| **[eShopSupport](https://github.com/dotnet/eShopSupport)** | Microsoft's .NET AI reference app (RAG + M.E.AI) | How to add AI to clean architecture |
| **[Semantic Kernel](https://github.com/microsoft/semantic-kernel)** | .NET AI orchestration (27K+ stars) | Plugins = our YAML skills. Consider for Phase 7+ |
| **[liteLLM](https://github.com/BerriAI/litellm)** | Open-source LLM gateway/proxy | Per-user budgets, rate limits, model routing |

### Common First-Timer Mistakes (Checklist)

| Mistake | MediTrack Status | Notes |
|---------|-----------------|-------|
| No circuit breaker for AI APIs | **Fixed** (Milestone 1) | Polly v8 standard resilience handler |
| Full chat history in every prompt | **Already correct** | Last 10 transcript lines only |
| No token/cost tracking | **Fixed** (Milestone 6) | Structured logging per LLM call |
| Tight coupling to one LLM provider | **Fixed** (Milestone 1) | `IChatClient` from M.E.AI |
| No structured output validation | **Fixed** (Milestone 6) | JSON schema + `SuggestionOutput` parsing |
| No caching | **Correct for MVP** | Add in Phase 7+ when there's traffic data |
| LLM output treated as trusted | **Fixed** (Milestone 6) | JSON schema enforcement + validation |
| No fallback when AI fails | **Already correct** | Non-fatal errors, session continues |
| Ignoring token economics | **Fixed** (Milestone 6) | Cost logging, rate limiter, batch timer |

### Phase 7+ AI Infrastructure Roadmap

These are **not** in MVP but should be planned for:

| Feature | Phase | Trigger to Implement |
|---------|-------|---------------------|
| Streaming LLM responses (token-by-token via SignalR) | Phase 7 | Doctors complain about 3s wait for suggestions |
| Exact-match response cache (Redis) | Phase 7 | Repeated similar queries visible in logs |
| Tiered model routing (mini + Sonnet) | Phase 9 | Monthly LLM cost exceeds $500 |
| Semantic cache (pgvector similarity on prompts) | Phase 9+ | Cache hit rate plateaus with exact-match |
| Semantic Kernel orchestration | Phase 8+ | Agent logic exceeds simple prompt composition |
| Cost alerting (per-hour/per-day budget caps) | Phase 7 | Pilot launches to >10 doctors |
| LLM gateway (liteLLM or custom) | Phase 9+ | Multiple services consume LLM APIs |

---

## Developer Testing Tools (Solo Testing)

You can test the entire system **by yourself** without needing another person to play doctor or patient. This section documents the testing mechanisms built into the MVP.

### 1. Text Input Mode (No Microphone Needed)

The UI includes a manual text input that bypasses audio entirely. Use this for most development:

```tsx
// Component in LiveSessionView — always visible, used when mic is denied or for testing
interface ManualTranscriptInputProps {
  readonly sessionId: string;
}

function ManualTranscriptInput({ sessionId }: ManualTranscriptInputProps) {
  const [text, setText] = useState('');
  const [speaker, setSpeaker] = useState<'Doctor' | 'Patient'>('Patient');
  const { connection } = useSignalR(sessionId);

  const isConnected = connection?.state === 'Connected';

  const handleSend = async () => {
    if (!text.trim() || !isConnected) return;
    await connection.invoke('SendTranscriptLine', sessionId, speaker, text);
    setText('');
  };

  return (
    <div className="flex gap-2 p-4 border-t border-neutral-200">
      <select
        value={speaker}
        onChange={(event) => setSpeaker(event.target.value as 'Doctor' | 'Patient')}
        className="px-3 py-2 border border-neutral-200 rounded"
      >
        <option value="Doctor">Doctor</option>
        <option value="Patient">Patient</option>
      </select>
      <input
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && handleSend()}
        placeholder={isConnected ? "Type message and press Enter..." : "Connecting..."}
        disabled={!isConnected}
        className="flex-1 px-3 py-2 border border-neutral-200 rounded disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={!isConnected || !text.trim()}
        className="px-4 py-2 bg-primary-700 text-white rounded disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
}
```

**Usage**: Start a session → type messages alternating between Doctor/Patient → watch suggestions appear.

### 2. Dev-Only API Endpoints (Seed Conversations)

Dev endpoints for injecting test conversations and triggering AI suggestions. Guarded by a `[DevOnly]` filter (eliminates repeated `IsDevelopment()` checks) and `[Authorize]` (LLM calls cost money — even in dev, don't leave endpoints open).

```csharp
// Infrastructure/DevOnlyAttribute.cs — reusable filter, applied once at controller level
[AttributeUsage(AttributeTargets.Class)]
public class DevOnlyAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        var environment = context.HttpContext.RequestServices
            .GetRequiredService<IWebHostEnvironment>();
        if (!environment.IsDevelopment())
            context.Result = new NotFoundResult();
    }
}
```

```csharp
// Controllers/DevController.cs
[DevOnly]                                    // returns 404 in non-Development environments
[Authorize(Roles = UserRoles.Doctor)]        // still require auth — LLM calls cost money
[ApiController]
[Route("api/dev")]
public class DevController : ControllerBase
{
    private readonly IHubContext<SessionHub> _hubContext;
    private readonly ClaraDbContext _db;
    private readonly SuggestionService _suggestionService;

    public DevController(
        IHubContext<SessionHub> hubContext,
        ClaraDbContext db,
        SuggestionService suggestionService)
    {
        _hubContext = hubContext;
        _db = db;
        _suggestionService = suggestionService;
    }

    /// <summary>
    /// Seed a test conversation into an active session.
    /// Lines are inserted instantly (no delays) — watch them appear in the UI via SignalR.
    /// POST /api/dev/sessions/{id}/seed-transcript?scenario=chest-pain
    /// </summary>
    [HttpPost("sessions/{id}/seed-transcript")]
    public async Task<IActionResult> SeedTranscript(Guid id, [FromQuery] string scenario = "chest-pain")
    {
        var scenarios = await LoadTestScenariosAsync();
        if (!scenarios.TryGetValue(scenario, out var testScenario))
            return BadRequest($"Unknown scenario: {scenario}. Available: {string.Join(", ", scenarios.Keys)}");

        var session = await _db.Sessions.FindAsync(id);
        if (session == null)
            return NotFound($"Session {id} not found");

        // Insert all lines instantly — no Task.Delay (avoids 17s+ HTTP request timeout)
        foreach (var testLine in testScenario.Lines)
        {
            var line = new TranscriptLine
            {
                Id = Guid.NewGuid(),
                SessionId = id,
                Speaker = testLine.Speaker,
                Text = testLine.Text,
                Timestamp = DateTimeOffset.UtcNow
            };

            _db.TranscriptLines.Add(line);
            await _db.SaveChangesAsync();

            await _hubContext.Clients.Group(id.ToString()).SendAsync("TranscriptLineAdded", new
            {
                line.Id,
                line.Speaker,
                line.Text,
                line.Timestamp
            });
        }

        return Ok(new
        {
            message = $"Seeded {testScenario.Lines.Count} transcript lines for scenario '{scenario}'",
            lineCount = testScenario.Lines.Count,
            expectedSkill = testScenario.ExpectedSkill
        });
    }

    /// <summary>
    /// Force-trigger an AI suggestion for testing.
    /// POST /api/dev/sessions/{id}/force-suggest
    /// </summary>
    [HttpPost("sessions/{id}/force-suggest")]
    public async Task<IActionResult> ForceSuggest(Guid id)
    {
        var recentLines = await _db.TranscriptLines
            .Where(transcriptLine => transcriptLine.SessionId == id)
            .OrderByDescending(transcriptLine => transcriptLine.Timestamp)
            .Take(10)
            .OrderBy(transcriptLine => transcriptLine.Timestamp)
            .ToListAsync();

        if (recentLines.Count == 0)
            return BadRequest("No transcript lines to analyze. Seed a conversation first.");

        var suggestion = await _suggestionService.GenerateSuggestionAsync(id, recentLines, "dev_test");

        if (suggestion == null)
            return StatusCode(500, "Suggestion generation failed. Check logs.");

        await _hubContext.Clients.Group(id.ToString()).SendAsync("SuggestionAdded", suggestion);

        return Ok(suggestion);
    }

    /// <summary>
    /// Get full session details including transcript, suggestions, and stats.
    /// GET /api/dev/sessions/{id}/full
    /// </summary>
    [HttpGet("sessions/{id}/full")]
    public async Task<IActionResult> GetFullSession(Guid id)
    {
        var session = await _db.Sessions.FindAsync(id);
        if (session == null)
            return NotFound();

        var transcript = await _db.TranscriptLines
            .Where(transcriptLine => transcriptLine.SessionId == id)
            .OrderBy(transcriptLine => transcriptLine.Timestamp)
            .ToListAsync();

        var suggestions = await _db.Suggestions
            .Where(suggestion => suggestion.SessionId == id)
            .OrderBy(suggestion => suggestion.TriggeredAt)
            .ToListAsync();

        return Ok(new
        {
            session,
            transcript,
            suggestions,
            stats = new
            {
                transcriptLineCount = transcript.Count,
                doctorLines = transcript.Count(line => line.Speaker == "Doctor"),
                patientLines = transcript.Count(line => line.Speaker == "Patient"),
                suggestionCount = suggestions.Count
            }
        });
    }

    /// <summary>
    /// Reset a session — clear transcript and suggestions for re-testing.
    /// DELETE /api/dev/sessions/{id}/reset
    /// </summary>
    [HttpDelete("sessions/{id}/reset")]
    public async Task<IActionResult> ResetSession(Guid id)
    {
        var session = await _db.Sessions.FindAsync(id);
        if (session == null)
            return NotFound();

        var transcriptLines = await _db.TranscriptLines
            .Where(line => line.SessionId == id)
            .ToListAsync();
        var suggestions = await _db.Suggestions
            .Where(suggestion => suggestion.SessionId == id)
            .ToListAsync();

        _db.TranscriptLines.RemoveRange(transcriptLines);
        _db.Suggestions.RemoveRange(suggestions);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = $"Session {id} reset",
            removedTranscriptLines = transcriptLines.Count,
            removedSuggestions = suggestions.Count
        });
    }

    /// <summary>
    /// List available test scenarios (loaded from test-data/conversations/*.json).
    /// GET /api/dev/scenarios
    /// </summary>
    [HttpGet("scenarios")]
    public async Task<IActionResult> ListScenarios()
    {
        var scenarios = await LoadTestScenariosAsync();
        return Ok(scenarios.Select(kvp => new
        {
            name = kvp.Key,
            description = kvp.Value.Description,
            lineCount = kvp.Value.Lines.Count,
            expectedSkill = kvp.Value.ExpectedSkill,
            preview = string.Join(" | ",
                kvp.Value.Lines.Take(3).Select(line =>
                    $"[{line.Speaker}] {line.Text[..Math.Min(40, line.Text.Length)]}..."))
        }));
    }

    /// <summary>
    /// Load test scenarios from JSON files — single source of truth (no hardcoded conversations).
    /// Files in test-data/conversations/*.json, included via CopyToOutputDirectory.
    /// </summary>
    private static async Task<Dictionary<string, TestScenario>> LoadTestScenariosAsync()
    {
        var scenarioPath = Path.Combine(AppContext.BaseDirectory, "test-data", "conversations");
        var scenarios = new Dictionary<string, TestScenario>();

        if (!Directory.Exists(scenarioPath))
            return scenarios;

        foreach (var filePath in Directory.GetFiles(scenarioPath, "*.json"))
        {
            var scenarioName = Path.GetFileNameWithoutExtension(filePath);
            var content = await File.ReadAllTextAsync(filePath);
            var scenario = JsonSerializer.Deserialize<TestScenario>(content,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (scenario != null)
                scenarios[scenarioName] = scenario;
        }

        return scenarios;
    }
}

// Models for test data deserialization
public sealed record TestScenario
{
    public required string Scenario { get; init; }
    public required string Description { get; init; }
    public string? ExpectedSkill { get; init; }
    public required List<TestTranscriptLine> Lines { get; init; }
}

public sealed record TestTranscriptLine
{
    public required string Speaker { get; init; }
    public required string Text { get; init; }
}
```

**Key changes from original**:
- `[DevOnly]` filter replaces 5 duplicated `IsDevelopment()` checks (DRY)
- `[Authorize(Roles = UserRoles.Doctor)]` — LLM calls cost money, even in dev
- **No `Task.Delay`** — lines seed instantly (original had ~17s HTTP request)
- **Conversations loaded from JSON files** — single source of truth in `test-data/conversations/*.json`
- `DELETE /api/dev/sessions/{id}/reset` endpoint for clearing test data
- `GetSuggestions` endpoint removed (redundant with `GetFullSession`)

### 3. Test Data Files (Single Source of Truth)

Test conversations live in JSON files — **not** hardcoded in C#. The `DevController` reads from these files at runtime. Integration tests also use them.

```
test-data/
├── conversations/                  ← DevController + integration tests read from here
│   ├── chest-pain.json
│   ├── medication-review.json
│   ├── general-checkup.json
│   └── follow-up-diabetes.json
├── expected-outputs/               ← Integration tests verify suggestions against these
│   ├── chest-pain-expected.json
│   └── medication-review-expected.json
└── audio/                          ← Optional: pre-recorded audio for Deepgram testing
    └── README.md
```

**Include in `.csproj`** so files are available at runtime (dev only — not in production image):

```xml
<!-- Clara.API.csproj -->
<ItemGroup Condition="'$(Configuration)' == 'Debug'">
  <Content Include="test-data\**\*" CopyToOutputDirectory="PreserveNewest" />
</ItemGroup>
```

**Sample `test-data/conversations/chest-pain.json`:**

```json
{
  "scenario": "chest-pain",
  "description": "Patient presenting with chest pain radiating to left arm — should trigger chest-pain clinical skill",
  "expectedSkill": "chest-pain-assessment",
  "lines": [
    { "speaker": "Doctor", "text": "Good morning. What brings you in today?" },
    { "speaker": "Patient", "text": "I've been having chest pain for the past two days." },
    { "speaker": "Doctor", "text": "Can you describe the pain? Is it sharp or dull?" },
    { "speaker": "Patient", "text": "It's more of a pressure, like something heavy on my chest." },
    { "speaker": "Doctor", "text": "Does it radiate anywhere? To your arm, jaw, or back?" },
    { "speaker": "Patient", "text": "Sometimes I feel it in my left arm." },
    { "speaker": "Doctor", "text": "Any shortness of breath, sweating, or nausea?" },
    { "speaker": "Patient", "text": "Yes, I've been sweating more than usual and feel a bit nauseous." }
  ]
}
```

> **Note**: `delayMs` removed from JSON — delays were causing 17s HTTP requests. The `DevController` inserts all lines instantly.

**Sample `test-data/expected-outputs/chest-pain-expected.json`:**

Used by integration tests to verify LLM suggestion quality (keyword matching, not exact string comparison — LLM output is non-deterministic):

```json
{
  "scenario": "chest-pain",
  "minimumSuggestions": 1,
  "expectedKeywords": [
    "cardiac",
    "ECG",
    "troponin",
    "aspirin",
    "emergency"
  ],
  "expectedConfidence": "high",
  "shouldTriggerSkill": "chest-pain-assessment"
}
```

Integration tests use this via keyword-match assertion (not exact match — LLM output varies):

```csharp
// In integration tests
var expected = LoadExpectedOutput("chest-pain");
var suggestion = await client.PostAsync($"/api/dev/sessions/{sessionId}/force-suggest");
var result = await suggestion.Content.ReadFromJsonAsync<SuggestionResponse>();

// At least one expected keyword appears in the suggestion
Assert.True(
    expected.ExpectedKeywords.Any(keyword =>
        result.Content.Contains(keyword, StringComparison.OrdinalIgnoreCase)),
    $"Suggestion should mention at least one of: {string.Join(", ", expected.ExpectedKeywords)}");
```

### 4. Testing Workflow by Milestone

| Milestone | How to Test | What to Verify |
|-----------|-------------|----------------|
| **1: Scaffold** | `docker-compose up clara-api` | Health check returns 200 |
| **2: Sessions** | `POST /api/sessions` via Postman/curl | Session created, JWT validates |
| **3: SignalR** | Open UI → text input mode → type messages | Messages appear in real-time |
| **4: Knowledge** | `POST /api/knowledge/search` with "chest pain" | Returns relevant CDC/AHA chunks |
| **5: RAG** | Same as above | Results have similarity score >0.7 |
| **6: LLM** | Seed transcript → `POST /api/dev/sessions/{id}/force-suggest` | Suggestion returned with bullets + confidence |
| **7: Deepgram** | Speak into mic OR play pre-recorded audio | Transcript appears within 2 seconds |
| **8: Skills** | Seed chest-pain transcript → check suggestion | Suggestion references chest pain workflow |

### 5. Quick Test Commands

All dev endpoints require a Doctor JWT (`-H "Authorization: Bearer <DOCTOR_JWT>"`). Get one from Identity.API login flow.

```bash
# === Core Workflow ===

# 1. Start a session (get the session ID from response)
curl -X POST http://localhost:5005/api/sessions \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"patientId": "test-patient-123"}'

# 2. Seed a test conversation (instant — all lines injected at once)
curl -X POST "http://localhost:5005/api/dev/sessions/$SESSION_ID/seed-transcript?scenario=chest-pain" \
  -H "Authorization: Bearer $JWT"

# 3. Force an AI suggestion
curl -X POST "http://localhost:5005/api/dev/sessions/$SESSION_ID/force-suggest" \
  -H "Authorization: Bearer $JWT"

# 4. Get full session with transcript + suggestions + stats
curl "http://localhost:5005/api/dev/sessions/$SESSION_ID/full" \
  -H "Authorization: Bearer $JWT"

# 5. List available test scenarios
curl http://localhost:5005/api/dev/scenarios \
  -H "Authorization: Bearer $JWT"

# 6. Reset session (clear transcript + suggestions for re-testing)
curl -X DELETE "http://localhost:5005/api/dev/sessions/$SESSION_ID/reset" \
  -H "Authorization: Bearer $JWT"

# === Verify Security ===

# 7. Auth denial — no JWT should return 401
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:5005/api/sessions

# 8. Wrong role — Patient JWT should return 403
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:5005/api/sessions \
  -H "Authorization: Bearer $PATIENT_JWT"

# === Verify Rate Limiting ===

# 9. Rate limiter — second suggest within 10s should return 429
curl -X POST "http://localhost:5005/api/sessions/$SESSION_ID/suggest" \
  -H "Authorization: Bearer $JWT"
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "http://localhost:5005/api/sessions/$SESSION_ID/suggest" \
  -H "Authorization: Bearer $JWT"
# Expected: 429 Too Many Requests

# === Verify Batch Trigger ===

# 10. Batch trigger — seed exactly 5 patient lines, watch for auto-suggestion via SignalR
#     (Open the UI in a browser first, then run this — suggestion should appear automatically)
curl -X POST "http://localhost:5005/api/dev/sessions/$SESSION_ID/seed-transcript?scenario=follow-up-diabetes" \
  -H "Authorization: Bearer $JWT"
# follow-up-diabetes has 4 patient lines — auto-batch should NOT fire
# Add one more patient line manually via the UI text input → auto-batch should fire
```

### 6. Frontend Dev Panel (Optional Enhancement)

Add a collapsible dev panel to the LiveSessionView for quick testing:

```tsx
import { FlaskConical, Zap } from "lucide-react";

interface DevPanelProps {
  readonly sessionId: string;
}

const TEST_SCENARIOS = ['chest-pain', 'medication-review', 'general-checkup', 'follow-up-diabetes'] as const;

// Only shown in development mode
function DevPanel({ sessionId }: DevPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastDevResponse, setLastDevResponse] = useState<Record<string, unknown> | null>(null);

  const seedTranscript = async (scenario: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/dev/sessions/${sessionId}/seed-transcript?scenario=${scenario}`,
        { method: 'POST' }
      );
      setLastDevResponse(await response.json());
    } finally {
      setIsLoading(false);
    }
  };

  const forceSuggest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/dev/sessions/${sessionId}/force-suggest`,
        { method: 'POST' }
      );
      setLastDevResponse(await response.json());
    } finally {
      setIsLoading(false);
    }
  };

  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-neutral-800 text-white p-4 rounded-lg shadow-lg max-w-sm">
      <h3 className="flex items-center gap-2 font-bold mb-2">
        <FlaskConical className="h-4 w-4" />
        Dev Tools
      </h3>

      <div className="space-y-2">
        <p className="text-xs text-neutral-400">Seed test conversation:</p>
        <div className="flex flex-wrap gap-1">
          {TEST_SCENARIOS.map(scenario => (
            <button
              key={scenario}
              onClick={() => seedTranscript(scenario)}
              disabled={isLoading}
              className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs disabled:opacity-50"
            >
              {scenario}
            </button>
          ))}
        </div>

        <button
          onClick={forceSuggest}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-accent-500 hover:bg-accent-600 rounded text-sm font-medium disabled:opacity-50"
        >
          <Zap className="h-4 w-4" />
          {isLoading ? 'Processing...' : 'Force AI Suggestion'}
        </button>

        {lastDevResponse && (
          <pre className="text-xs bg-neutral-900 p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(lastDevResponse, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
```

### 7. Acceptance Criteria for Testing Tools

- [ ] Text input mode works without microphone (input disabled when SignalR disconnected)
- [ ] `POST /api/dev/sessions/{id}/seed-transcript?scenario=chest-pain` injects 8 transcript lines instantly
- [ ] `POST /api/dev/sessions/{id}/force-suggest` returns structured AI suggestion (bullets + confidence)
- [ ] `GET /api/dev/sessions/{id}/full` returns session + transcript + suggestions + stats
- [ ] `DELETE /api/dev/sessions/{id}/reset` clears transcript + suggestions for re-testing
- [ ] `GET /api/dev/scenarios` lists scenarios loaded from `test-data/conversations/*.json`
- [ ] Dev endpoints return 404 in production environment (`[DevOnly]` filter)
- [ ] Dev endpoints return 401 without JWT, 403 with non-Doctor JWT (`[Authorize]`)
- [ ] Frontend dev panel only renders in development mode (`import.meta.env.PROD` guard)
- [ ] All 4 test scenarios produce meaningful AI suggestions
- [ ] Test conversations are loaded from JSON files (no hardcoded conversations in C#)

---

## Integration Tests (Phase 6b Acceptance Criteria)

Basic integration tests must pass before MVP is considered complete. These verify the core session lifecycle end-to-end.

#### Test Suite

```
tests/Clara.IntegrationTests/
├── SessionLifecycleTests.cs      ← start → transcript → suggest → end
├── KnowledgeSearchTests.cs       ← seed → search → verify relevance
├── SignalRHubTests.cs             ← connect → join → receive transcript lines
└── Fixtures/
    └── ClaraApiFactory.cs       ← WebApplicationFactory with test PostgreSQL
```

#### Key Test Scenarios

| Test | What it verifies |
|------|-----------------|
| `StartSession_ReturnsActiveSession` | REST → DB → response |
| `EndSession_DisposesTimerAndMarksEnded` | Timer cleanup + status update |
| `TranscriptLine_BroadcastsViaSignalR` | SignalR group messaging |
| `SuggestEndpoint_ReturnsAISuggestion` | LLM integration (use mock for CI) |
| `KnowledgeSearch_ReturnsRelevantChunks` | pgvector cosine similarity |
| `SuggestEndpoint_RateLimited` | Rate limiter rejects >1 req/10s |
| `UnauthenticatedRequest_Returns401` | Auth enforcement |
| `NonDoctorRole_Returns403` | Role-based access control |

**Note**: LLM calls should be mockable via interface (`IChatClient` from M.E.AI) so CI tests don't require an API key. pgvector tests require a real PostgreSQL instance (use Docker testcontainers).

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
| LLM cost overruns | High — budget risk | Rate limiter on `/api/sessions/{id}/suggest` (1 req/10s per session) + batch timer (60s floor) |
| Speaker detection accuracy | Medium — AI heuristic may misidentify | First speaker = Doctor (deterministic), LLM confirms from context, stored in `speaker_map` once resolved |
| Patient.API unavailable | Low — degraded suggestions | PatientContextService returns null on failure, suggestions still work without patient context |
| Unauthorized access | Critical — PHI exposure | `[Authorize(Roles = Doctor)]` on all endpoints + SignalR hub, RoleGuard on frontend routes |
| Audio format mismatch | Medium — STT fails silently | Explicit `audio/webm;codecs=opus` in both MediaRecorder and Deepgram Content-Type |

---

## Timeline Summary

| Phase | Duration | Effort | Deliverable |
|-------|----------|--------|-------------|
| 6a: PostgreSQL Migration | 1 week | 1 engineer | ClaraDB schema + pgvector |
| 6b: Clara.API MVP | 5-6 weeks | 1 backend engineer | All 8 milestones (REST + SignalR + Deepgram + LLM) + integration tests |
| 6c: Doctor Dashboard UI | 2-3 weeks | 1 frontend engineer | React UI (transcript + suggestions + audio) |
| Buffer (Deepgram/LLM surprises) | 1-2 weeks | — | Contingency for STT/LLM integration issues |
| **Total** | **10-12 weeks** | **2 engineers** | **Functional MVP** |

> **Timeline note**: Milestones 6-7 (LLM + Deepgram integration) often hit surprises (API quirks, latency tuning, audio format edge cases). Budget 5-6 weeks for backend, not 4-5.

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

## Pre-Implementation Checklist

Complete these **one-time setup items** before writing any code:

| Item | Action | Owner | Status |
|------|--------|-------|--------|
| **NuGet versions** | Check NuGet Gallery for latest stable versions of `Microsoft.Extensions.AI.*`, `Microsoft.Extensions.Http.Resilience`, `Pgvector.EntityFrameworkCore`. Versions in this plan are placeholders. | Backend | [ ] |
| **Deepgram account** | Sign up at deepgram.com, get API key, verify `nova-2-medical` model access. Free tier: $200 credit. | DevOps | [ ] |
| **OpenAI account** | API key ready, billing set up, verify `gpt-4o-mini` and `text-embedding-3-small` access. | DevOps | [ ] |
| **API keys in docker-compose** | Add `DEEPGRAM_API_KEY` and `OPENAI_API_KEY` to `docker-compose.override.yml` (gitignored, never committed). | DevOps | [ ] |
| **PostgreSQL + pgvector** | Verify `pgvector/pgvector:pg17` Docker image pulls and runs locally. Test `CREATE EXTENSION vector;`. | Backend | [ ] |
| **Aspire Dashboard** (optional) | Install .NET Aspire for OpenTelemetry visualization during dev. Not required but useful for debugging AI call traces. | Backend | [ ] |
| **Canvas Hyperscribe review** (optional) | Skim [canvas-medical/canvas-hyperscribe](https://github.com/canvas-medical/canvas-hyperscribe) for clinical AI patterns. Focus on agent chaining and clinical guardrails. | Backend | [ ] |

---

## Ready to Start

✅ **Phase 6a (PostgreSQL migration)** can start immediately — no dependencies.
✅ **Phase 6b Milestone 1-2** (project scaffold + session management + security hardening) can start in parallel.
✅ **Phase 6c** waits for Milestones 1-6 (backend APIs ready).

### Suggested First Sprint (Week 1)

| Task | Owner | Deliverable |
|------|-------|-------------|
| Phase 6a: PostgreSQL migration | Backend | All services on PostgreSQL, pgvector extension enabled |
| Milestone 1: Project scaffold + AI infra | Backend | Clara.API builds, health check passes, `IChatClient` resolves, Polly wired |
| Verify NuGet package versions | Backend | Actual stable versions confirmed and committed to `Directory.Packages.props` |
| Deepgram + OpenAI accounts | DevOps | API keys in `docker-compose.override.yml` |

Then Milestones 2-3 in Week 2.

**Next step**: Complete the pre-implementation checklist, then kick off Phase 6a.

---

## Review Amendments Applied (2026-02-27)

All issues from the plan review have been addressed:

| Issue | Resolution |
|-------|-----------|
| Timer leak on session end | `CleanupSession` called in `EndSessionAsync` |
| Scoped service in singleton | Clarified: `SpeakerDetectionService` resolved per-request in hub, `BatchTriggerService` uses `IServiceScopeFactory` |
| Missing auth on SignalR hub | `[Authorize(Roles = UserRoles.Doctor)]` added to `SessionHub` |
| No rate limiting | Fixed-window rate limiter on `/api/sessions/{id}/suggest` (1 req/10s) |
| System prompt path relative | `Path.Combine(AppContext.BaseDirectory, ...)` for Docker compatibility |
| Missing CORS config | Explicit CORS policy for SignalR with `AllowCredentials()` |
| Audio format mismatch | Changed to `audio/webm;codecs=opus` (browser + backend aligned) |
| No PHI audit for patient context | `SafePublishAuditAsync` added to `PatientContextService` |
| Missing frontend route protection | `RoleGuard` with `UserRoles.Doctor` on all Clara routes |
| Missing EF migration command | Added `dotnet ef migrations add` command |
| Missing `@microsoft/signalr` dep | Added npm package to Phase 6c |
| No health check implementation | `ClaraHealthCheck` checks PostgreSQL + Deepgram reachability |
| No Dockerfile content | Multi-stage Dockerfile with skills/seed data COPY |
| No integration tests | Test suite with 8 key scenarios + mock strategy for CI |
| Timeline too tight | Extended to 10-12 weeks (5-6 weeks backend + buffer) |
| FluentValidation missing | `StartSessionRequestValidator` added to security hardening task |
| Desktop-only layout | `LiveSessionView` now mobile-first (`flex-col md:flex-row`) |

---

## Production AI Infrastructure Amendments (2026-02-27)

Added based on real-world AI integration research and production patterns:

| Addition | Location | Why |
|----------|----------|-----|
| `Microsoft.Extensions.AI` (`IChatClient`, `IEmbeddingGenerator`) | Milestone 1 | LLM-agnostic abstraction — swap providers without changing business logic. Official .NET pattern (GA 2025). |
| Polly v8 resilience (`AddStandardResilienceHandler`) | Milestone 1 | Circuit breaker + retry + timeout for Deepgram and OpenAI. Prevents cascading failures from AI API outages. |
| Structured JSON output (`ResponseFormat.ForJsonSchema`) | Milestone 6 | LLM output is untrusted. JSON schema enforcement prevents malformed/malicious responses from reaching the UI. |
| `SuggestionOutput` record + output validation | Milestone 6 | Strongly-typed parsing of LLM responses. Invalid output logged and discarded, not displayed. |
| Per-call token/cost structured logging | Milestone 6 | Cost visibility from day one. Enables budget alerting and anomaly detection. |
| Production AI Infrastructure Patterns section | New section | Documents resilience, observability, caching roadmap, reference architectures, and common first-timer mistakes. |
| Cost management roadmap (MVP → Phase 9+) | New section | Phased approach: logging → caching → tiered models → semantic cache. |
| Reference architectures (Canvas Hyperscribe, eShopSupport, Semantic Kernel) | New section | Real-world .NET + healthcare AI projects to learn from beyond eShop. |

---

## Final Review Fixes (2026-02-27)

| Issue | Resolution |
|-------|-----------|
| `_embeddingService` not using M.E.AI | `KnowledgeBaseSeeder` and `KnowledgeService` now inject `IEmbeddingGenerator<string, Embedding<float>>` |
| Health check missing OpenAI | Added OpenAI `/v1/models` reachability check (degraded, not unhealthy) |
| `Prompts/system.txt` not in Docker image | Added `<Content Include="Prompts\**\*" CopyToOutputDirectory="PreserveNewest" />` to `.csproj` |
| NuGet versions are placeholders | Strengthened warning note + added pre-implementation checklist with version verification task |
| `SeedData/Guidelines` path hardcoded | Fixed to use `Path.Combine(AppContext.BaseDirectory, ...)` in `KnowledgeBaseSeeder` |
| Pre-implementation checklist missing | Added section with Deepgram, OpenAI, pgvector, Aspire setup items |
| First sprint plan missing | Added "Suggested First Sprint (Week 1)" table |
| Solo testing impossible | Added "Developer Testing Tools" section with text input mode, dev endpoints, test scenarios |
| `ICompletionService` inconsistency | Fixed to `IChatClient` (M.E.AI) in Integration Tests note |

---

## Testing Tools Review Fixes (2026-02-27)

| Issue | Resolution |
|-------|-----------|
| DevController has no `[Authorize]` | Added `[Authorize(Roles = UserRoles.Doctor)]` — LLM calls cost money, even in dev |
| `IsDevelopment()` duplicated 5 times | Replaced with `[DevOnly]` action filter attribute applied once at class level |
| `Task.Delay` causes 17s HTTP request | Removed all delays — lines seed instantly |
| Test conversations hardcoded AND in JSON (DRY violation) | DevController now loads from `test-data/conversations/*.json` only — single source of truth |
| `any` type in DevPanel | Replaced with `Record<string, unknown> \| null` |
| Emojis in source code | Replaced with lucide-react icons (`FlaskConical`, `Zap`) |
| `ManualTranscriptInput` no connection check | Added `connection.state === 'Connected'` guard, disabled state when disconnected |
| `expected-outputs/` not connected to anything | Added integration test example showing keyword-match assertion against expected output files |
| No cleanup endpoint | Added `DELETE /api/dev/sessions/{id}/reset` to clear transcript + suggestions |
| Missing test commands | Added auth denial (401), wrong role (403), rate limiter (429), and batch trigger tests |
| `test-data/` not in csproj | Added `<Content>` with `Condition="'$(Configuration)' == 'Debug'"` (dev only, not in production image) |
