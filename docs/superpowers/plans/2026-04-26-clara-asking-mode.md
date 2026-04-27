# Clara Asking Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded mock in `ClaraPanel` with a real `POST /api/ask` endpoint backed by RAG search + Claude Sonnet 4 (OnDemand), making the side-panel chat functional.

**Architecture:** New `AskService` uses `IKnowledgeService.SearchForContextAsync` for RAG chunks and `IPatientContextService.GetPatientContextAsync` (when patientId provided), builds a system prompt, calls `IChatClient[OnDemand]` (keyed singleton, Claude Sonnet 4), and returns a text answer. A new `AskApi` exposes `POST /api/ask`. The frontend adds an `askClara` RTK Query mutation and rewrites `ClaraPanel` to call it with loading/error states. Design counterpart gets the UI structure changes (keeps mock logic since design has no real API).

**Tech Stack:** .NET 10 minimal API, `Microsoft.Extensions.AI` (`IChatClient`, `ChatMessage`, `ChatResponse`, `ChatOptions`), FluentValidation, xUnit + NSubstitute + FluentAssertions, React 19 + RTK Query

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/Clara.API/Services/Interfaces.cs` | Modify | Add `IAskService` |
| `src/Clara.API/Services/AskService.cs` | **Create** | RAG search + patient context + LLM call |
| `src/Clara.API/Application/Validations/AskValidators.cs` | **Create** | FluentValidation for `AskRequest` |
| `src/Clara.API/Apis/AskApi.cs` | **Create** | `POST /api/ask` minimal API endpoint |
| `src/Clara.API/Program.cs` | Modify | Register `AskService`, map `AskApi` |
| `tests/Clara.UnitTests/Services/AskServiceTests.cs` | **Create** | Unit tests (TDD red → green) |
| `src/MediTrack.Web/src/features/clara/types.ts` | Modify | Add `AskClaraRequest`, `AskClaraResponse` |
| `src/MediTrack.Web/src/features/clara/store/claraApi.ts` | Modify | Add `askClara` mutation + export `useAskClaraMutation` |
| `src/MediTrack.Web/src/shared/components/clara/ClaraPanel.tsx` | Rewrite | Replace mock with real API + loading/error states |
| `design/src/components/clara/ClaraPanel.tsx` | Modify | Sync UI structure changes (keeps mock logic) |

---

## Task 1: Add IAskService to Interfaces.cs

**Files:**
- Modify: `src/Clara.API/Services/Interfaces.cs`

- [ ] **Step 1: Add the interface**

Open `src/Clara.API/Services/Interfaces.cs`. Insert this block after the `IKnowledgeService` interface (after line 79):

```csharp
public interface IAskService
{
    /// <summary>
    /// Answers a clinical question using RAG knowledge search and optional patient context.
    /// Returns a grounded answer string ready to display to the user.
    /// </summary>
    Task<string> AskAsync(string question, string? patientId, CancellationToken cancellationToken = default);
}
```

- [ ] **Step 2: Build to verify it compiles**

```bash
dotnet build src/Clara.API
```

Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 3: Commit**

```bash
git add src/Clara.API/Services/Interfaces.cs
git commit -m "feat(clara): add IAskService interface for asking mode"
```

---

## Task 2: Write failing unit tests for AskService (TDD — RED)

**Files:**
- Create: `tests/Clara.UnitTests/Services/AskServiceTests.cs`

- [ ] **Step 1: Create AskServiceTests.cs**

```csharp
using Clara.API.Services;
using FluentAssertions;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace Clara.UnitTests.Services;

public sealed class AskServiceTests
{
    private readonly IKnowledgeService _knowledgeService;
    private readonly IPatientContextService _patientContextService;
    private readonly IChatClient _chatClient;
    private readonly AskService _service;

    public AskServiceTests()
    {
        _knowledgeService = Substitute.For<IKnowledgeService>();
        _patientContextService = Substitute.For<IPatientContextService>();
        _chatClient = Substitute.For<IChatClient>();
        _service = new AskService(
            _knowledgeService,
            _patientContextService,
            _chatClient,
            NullLogger<AskService>.Instance);
    }

    [Fact]
    public async Task AskAsync_ReturnsLlmAnswer_WhenKnowledgeFound()
    {
        // Arrange
        var knowledgeResults = new List<KnowledgeSearchResult>
        {
            new() { ChunkId = Guid.NewGuid(), DocumentName = "Clinical Guidelines", Content = "Metformin is first-line for type 2 diabetes.", Category = "pharmacology", Score = 0.9f }
        };
        _knowledgeService
            .SearchForContextAsync("What is first-line for type 2 diabetes?", topK: 5, Arg.Any<CancellationToken>())
            .Returns(knowledgeResults);

        var chatResponse = new ChatResponse(new ChatMessage(ChatRole.Assistant, "Metformin is the recommended first-line treatment."));
        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .Returns(chatResponse);

        // Act
        var answer = await _service.AskAsync("What is first-line for type 2 diabetes?", patientId: null);

        // Assert
        answer.Should().Be("Metformin is the recommended first-line treatment.");
    }

    [Fact]
    public async Task AskAsync_IncludesPatientContext_WhenPatientIdProvided()
    {
        // Arrange
        _knowledgeService
            .SearchForContextAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns([]);

        var patientContext = new PatientContext
        {
            PatientId = "patient-123",
            Age = 45,
            Gender = "Female",
            Allergies = ["Penicillin"],
            ActiveMedications = ["Lisinopril"],
            ChronicConditions = ["Hypertension"]
        };
        _patientContextService
            .GetPatientContextAsync("patient-123", Arg.Any<CancellationToken>())
            .Returns(patientContext);

        var chatResponse = new ChatResponse(new ChatMessage(ChatRole.Assistant, "Based on patient context, consider..."));
        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .Returns(chatResponse);

        // Act
        await _service.AskAsync("What should I prescribe?", patientId: "patient-123");

        // Assert — system prompt sent to LLM must contain the patient's chronic condition
        await _chatClient.Received(1).GetResponseAsync(
            Arg.Is<IEnumerable<ChatMessage>>(messages =>
                messages.Any(m => m.Role == ChatRole.System && m.Text != null && m.Text.Contains("Hypertension"))),
            Arg.Any<ChatOptions?>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AskAsync_SkipsPatientContext_WhenPatientIdIsNull()
    {
        // Arrange
        _knowledgeService
            .SearchForContextAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns([]);

        var chatResponse = new ChatResponse(new ChatMessage(ChatRole.Assistant, "General answer."));
        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .Returns(chatResponse);

        // Act
        await _service.AskAsync("What are symptoms of anemia?", patientId: null);

        // Assert — patient context service must never be called
        await _patientContextService
            .DidNotReceive()
            .GetPatientContextAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AskAsync_ReturnsFallback_WhenLlmReturnsEmptyText()
    {
        // Arrange
        _knowledgeService
            .SearchForContextAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns([]);

        var chatResponse = new ChatResponse(new ChatMessage(ChatRole.Assistant, ""));
        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .Returns(chatResponse);

        // Act
        var answer = await _service.AskAsync("How are you?", patientId: null);

        // Assert
        answer.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task AskAsync_StillAnswers_WhenPatientContextFetchReturnsNull()
    {
        // Arrange — patient context service returns null (e.g. Patient.API is down)
        _knowledgeService
            .SearchForContextAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns([]);

        _patientContextService
            .GetPatientContextAsync("unknown-id", Arg.Any<CancellationToken>())
            .Returns((PatientContext?)null);

        var chatResponse = new ChatResponse(new ChatMessage(ChatRole.Assistant, "General answer without patient context."));
        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .Returns(chatResponse);

        // Act
        var answer = await _service.AskAsync("How should I treat this?", patientId: "unknown-id");

        // Assert — still answers even without patient context
        answer.Should().Be("General answer without patient context.");
    }
}
```

- [ ] **Step 2: Run to verify they fail (RED)**

```bash
dotnet test tests/Clara.UnitTests --filter "FullyQualifiedName~AskServiceTests"
```

Expected: Build error — `AskService` does not exist yet.

---

## Task 3: Implement AskService and AskValidators (GREEN)

**Files:**
- Create: `src/Clara.API/Services/AskService.cs`
- Create: `src/Clara.API/Application/Validations/AskValidators.cs`

- [ ] **Step 1: Create AskService.cs**

```csharp
using System.Text;
using Microsoft.Extensions.AI;

namespace Clara.API.Services;

/// <summary>
/// Answers clinical questions using RAG knowledge search + optional patient context + LLM.
/// Injected with the OnDemand (accuracy-optimised) IChatClient via Program.cs factory.
/// </summary>
internal sealed class AskService : IAskService
{
    private readonly IKnowledgeService _knowledgeService;
    private readonly IPatientContextService _patientContextService;
    private readonly IChatClient _chatClient;
    private readonly ILogger<AskService> _logger;

    private const string SystemPromptBase =
        "You are Clara, an AI clinical assistant supporting doctors. " +
        "Answer concisely and accurately based on the provided knowledge context. " +
        "If the question is outside your knowledge, say so clearly. " +
        "Do not fabricate clinical information, drug names, dosages, or clinical facts.";

    public AskService(
        IKnowledgeService knowledgeService,
        IPatientContextService patientContextService,
        IChatClient chatClient,
        ILogger<AskService> logger)
    {
        _knowledgeService = knowledgeService;
        _patientContextService = patientContextService;
        _chatClient = chatClient;
        _logger = logger;
    }

    public async Task<string> AskAsync(
        string question,
        string? patientId,
        CancellationToken cancellationToken = default)
    {
        var knowledgeChunks = await _knowledgeService
            .SearchForContextAsync(question, topK: 5, cancellationToken);

        PatientContext? patientContext = null;
        if (!string.IsNullOrWhiteSpace(patientId))
        {
            patientContext = await _patientContextService
                .GetPatientContextAsync(patientId, cancellationToken);
        }

        var systemPrompt = BuildSystemPrompt(knowledgeChunks, patientContext);

        var messages = new List<ChatMessage>
        {
            new(ChatRole.System, systemPrompt),
            new(ChatRole.User, question)
        };

        var chatOptions = new ChatOptions { Temperature = 0.3f, MaxOutputTokens = 800 };

        var response = await _chatClient.GetResponseAsync(messages, chatOptions, cancellationToken);
        var answer = response.Text;

        if (string.IsNullOrWhiteSpace(answer))
        {
            _logger.LogWarning("LLM returned empty response for question length {Length}", question.Length);
            return "I was unable to generate a response. Please try rephrasing your question.";
        }

        return answer;
    }

    private static string BuildSystemPrompt(
        List<KnowledgeSearchResult> chunks,
        PatientContext? patient)
    {
        var builder = new StringBuilder(SystemPromptBase);

        if (chunks.Count > 0)
        {
            builder.AppendLine("\n\n## Relevant Clinical Knowledge");
            foreach (var chunk in chunks)
            {
                builder.AppendLine($"- {chunk.Content}");
            }
        }

        if (patient is not null)
        {
            var patientSection = patient.ToPromptSection();
            if (!string.IsNullOrWhiteSpace(patientSection))
            {
                builder.Append('\n').AppendLine(patientSection);
            }
        }

        return builder.ToString();
    }
}
```

- [ ] **Step 2: Create AskValidators.cs**

```csharp
using Clara.API.Apis;
using FluentValidation;

namespace Clara.API.Application.Validations;

public sealed class AskRequestValidator : AbstractValidator<AskRequest>
{
    public AskRequestValidator()
    {
        RuleFor(x => x.Question)
            .NotEmpty().WithMessage("Question is required.")
            .MaximumLength(2000).WithMessage("Question must not exceed 2000 characters.");

        RuleFor(x => x.PatientId)
            .Must(value => Guid.TryParse(value, out _))
            .WithMessage("PatientId must be a valid GUID.")
            .When(x => x.PatientId is not null);
    }
}
```

- [ ] **Step 3: Run the tests to verify GREEN**

```bash
dotnet test tests/Clara.UnitTests --filter "FullyQualifiedName~AskServiceTests"
```

Expected: `5 passed`

- [ ] **Step 4: Commit**

```bash
git add src/Clara.API/Services/AskService.cs src/Clara.API/Application/Validations/AskValidators.cs tests/Clara.UnitTests/Services/AskServiceTests.cs
git commit -m "feat(clara): implement AskService with RAG + LLM, TDD green"
```

---

## Task 4: Create AskApi endpoint and register in Program.cs

**Files:**
- Create: `src/Clara.API/Apis/AskApi.cs`
- Modify: `src/Clara.API/Program.cs`

- [ ] **Step 1: Create AskApi.cs**

```csharp
using System.Security.Claims;
using Clara.API.Extensions;
using Clara.API.Services;
using FluentValidation;
using MediTrack.Shared.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Clara.API.Apis;

/// <summary>
/// Asking mode — text Q&A backed by RAG + LLM. No live session required.
/// </summary>
public static class AskApi
{
    public static void MapAskEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ask")
            .WithTags("Ask")
            .RequireAuthorization(policy => policy.RequireRole(UserRoles.Doctor, UserRoles.Admin));

        group.MapPost("/", Ask)
            .WithName("Ask")
            .WithDescription("Ask Clara a clinical question with optional patient context")
            .RequireRateLimiting(RateLimitingExtensions.Policies.Suggest)
            .Produces<AskResponse>()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);
    }

    private static async Task<IResult> Ask(
        [FromBody] AskRequest request,
        [FromServices] IAskService askService,
        [FromServices] IValidator<AskRequest> validator,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        var answer = await askService.AskAsync(request.Question, request.PatientId, cancellationToken);
        return Results.Ok(new AskResponse { Answer = answer });
    }
}

/// <summary>Request to ask Clara a clinical question.</summary>
public sealed record AskRequest
{
    public required string Question { get; init; }
    public string? PatientId { get; init; }
}

/// <summary>Clara's answer to the question.</summary>
public sealed record AskResponse
{
    public required string Answer { get; init; }
}
```

- [ ] **Step 2: Register AskService in Program.cs**

In `src/Clara.API/Program.cs`, add this block after `builder.Services.AddScoped<ISuggestionService, SuggestionService>();` (line 83):

```csharp
// Asking mode — uses OnDemand (accuracy-optimised) chat client, no live session needed
builder.Services.AddScoped<IAskService>(sp => new AskService(
    sp.GetRequiredService<IKnowledgeService>(),
    sp.GetRequiredService<IPatientContextService>(),
    sp.GetRequiredKeyedService<IChatClient>(ChatClientKeys.OnDemand),
    sp.GetRequiredService<ILogger<AskService>>()
));
```

- [ ] **Step 3: Map AskApi in Program.cs**

Add `app.MapAskEndpoints();` after `app.MapKnowledgeEndpoints();` (around line 196):

```csharp
app.MapSessionEndpoints();
app.MapKnowledgeEndpoints();
app.MapAskEndpoints();   // ← add this line
app.MapAuditEndpoints();
```

- [ ] **Step 4: Build the backend**

```bash
dotnet build src/Clara.API
```

Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 5: Run all unit tests**

```bash
dotnet test tests/Clara.UnitTests --filter "FullyQualifiedName~Clara.UnitTests"
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/Clara.API/Apis/AskApi.cs src/Clara.API/Program.cs
git commit -m "feat(clara): expose POST /api/ask endpoint for asking mode"
```

---

## Task 5: Frontend — add types to types.ts

**Files:**
- Modify: `src/MediTrack.Web/src/features/clara/types.ts`

- [ ] **Step 1: Append the two new types at the end of types.ts**

```ts
export interface AskClaraRequest {
  readonly question: string;
  readonly patientId?: string;
}

export interface AskClaraResponse {
  readonly answer: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/MediTrack.Web/src/features/clara/types.ts
git commit -m "feat(clara): add AskClaraRequest and AskClaraResponse types"
```

---

## Task 6: Frontend — add askClara RTK Query mutation

**Files:**
- Modify: `src/MediTrack.Web/src/features/clara/store/claraApi.ts`

- [ ] **Step 1: Add AskClaraRequest and AskClaraResponse to the import from "../types"**

Find the existing `import type { ... } from "../types";` block and add the two new types:

```ts
import type {
  SessionResponse,
  SessionSummary,
  StartSessionRequest,
  SuggestResponse,
  KnowledgeSearchRequest,
  KnowledgeSearchResponse,
  GetSessionsParams,
  AskClaraRequest,
  AskClaraResponse,
} from "../types";
```

- [ ] **Step 2: Add the askClara mutation inside the endpoints builder**

In the `endpoints: (builder) => ({` block, add this entry after the `searchKnowledge` mutation:

```ts
/**
 * Ask Clara a clinical question (asking mode — no live session required)
 */
askClara: builder.mutation<AskClaraResponse, AskClaraRequest>({
  query: (body) => ({
    url: "/api/ask",
    method: "POST",
    body,
  }),
}),
```

- [ ] **Step 3: Export useAskClaraMutation**

In the `export const { ... } = claraApi;` destructure at the bottom, add `useAskClaraMutation`:

```ts
export const {
  useGetSessionsQuery,
  useGetSessionsByPatientQuery,
  useStartSessionMutation,
  useGetSessionQuery,
  useEndSessionMutation,
  useRequestSuggestionsMutation,
  useSearchKnowledgeMutation,
  useAskClaraMutation,          // ← add this
  // ... rest of existing exports unchanged
} = claraApi;
```

- [ ] **Step 4: Build to verify TypeScript**

```bash
cd src/MediTrack.Web && npm run build 2>&1 | tail -10
```

Expected: `✓ built in` — 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/MediTrack.Web/src/features/clara/store/claraApi.ts
git commit -m "feat(clara): add askClara RTK Query mutation"
```

---

## Task 7: Frontend — rewrite ClaraPanel (Web)

**Files:**
- Rewrite: `src/MediTrack.Web/src/shared/components/clara/ClaraPanel.tsx`

- [ ] **Step 1: Replace the entire file with the real-API version**

```tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, Mic, Send, ArrowRight } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import { useClaraPanel } from "./ClaraPanelContext";
import { claraSuggestions } from "@/features/clara/data/clara-suggestions";
import { useAskClaraMutation } from "@/features/clara/store/claraApi";

interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

function formatMessageContent(content: string): React.ReactNode {
  const lines = content.split("\n");
  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const formattedParts = parts.map((part, partIndex) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={partIndex} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
    return (
      <span key={lineIndex}>
        {lineIndex > 0 && "\n"}
        {formattedParts}
      </span>
    );
  });
}

export function ClaraPanel() {
  const { isOpen, prefillPrompt, pageContext, closePanel } = useClaraPanel();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [askClara] = useAskClaraMutation();

  const handleSendMessage = async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || isThinking) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", content: trimmedText },
    ]);
    setInputValue("");
    setIsThinking(true);

    try {
      const result = await askClara({
        question: trimmedText,
        patientId: pageContext.patientId,
      }).unwrap();
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: result.answer },
      ]);
    } catch {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleSuggestionClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleStartSession = () => {
    closePanel();
    if (pageContext.patientId) {
      navigate(`/clara?patientId=${pageContext.patientId}`);
    } else {
      navigate("/clara");
    }
  };

  const handleOverlayClick = () => {
    closePanel();
  };

  const handlePanelClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  useEffect(() => {
    if (isOpen && prefillPrompt) {
      handleSendMessage(prefillPrompt);
    }
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, prefillPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setMessages([]);
        setInputValue("");
        setIsThinking(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={clsxMerge(
          "fixed inset-0 z-50 bg-black/40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={handleOverlayClick}
        aria-hidden={!isOpen}
      />

      {/* Slide-in panel */}
      <div
        role="dialog"
        aria-label="Clara AI Assistant"
        aria-modal="true"
        className={clsxMerge(
          "fixed inset-y-0 right-0 z-50",
          "w-[85vw] sm:max-w-[440px]",
          "flex flex-col bg-card shadow-lg",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        onClick={handlePanelClick}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">Clara</h2>
            <p className="text-xs text-muted-foreground">
              {pageContext.patientName
                ? `Assisting with ${pageContext.patientName}`
                : "AI Medical Secretary"}
            </p>
          </div>
          <button
            onClick={closePanel}
            className={clsxMerge(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              "text-muted-foreground hover:bg-muted hover:text-foreground/80",
              "transition-colors"
            )}
            aria-label="Close Clara panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Start Clinical Session banner */}
          <button
            onClick={handleStartSession}
            className={clsxMerge(
              "mb-4 flex w-full items-center gap-3 rounded-lg p-3",
              "bg-gradient-to-r from-accent-500 to-accent-700",
              "text-white transition-opacity hover:opacity-90"
            )}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-foreground/20">
              <Mic className="h-4 w-4" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">
                {pageContext.patientName
                  ? `Start Session with ${pageContext.patientName}`
                  : "Start Clinical Session"}
              </p>
              <p className="text-xs text-white/80">
                Record and transcribe patient encounters
              </p>
            </div>
            <ArrowRight className="h-4 w-4 flex-shrink-0" />
          </button>

          {/* Suggestion chips — shown when no messages and not waiting */}
          {messages.length === 0 && !isThinking && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Try asking
              </p>
              {claraSuggestions
                .filter(
                  (suggestion) =>
                    !suggestion.relevantContexts ||
                    pageContext.type === "default" ||
                    suggestion.relevantContexts.includes(pageContext.type)
                )
                .map((suggestion) => {
                  const SuggestionIcon = suggestion.icon;
                  return (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion.prompt)}
                      disabled={isThinking}
                      className={clsxMerge(
                        "flex w-full items-center gap-3 rounded-lg border border-border p-3",
                        "bg-card text-left transition-all",
                        "hover:border-accent-300 hover:shadow-sm",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                    >
                      <div
                        className={clsxMerge(
                          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                          "bg-muted text-foreground/80"
                        )}
                      >
                        <SuggestionIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {suggestion.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {suggestion.category}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}

          {/* Thinking indicator — shown before first message arrives */}
          {messages.length === 0 && isThinking && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-accent-50 px-3 py-2 text-sm text-muted-foreground">
                Clara is thinking…
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.length > 0 && (
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={clsxMerge(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={clsxMerge(
                      "max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm",
                      message.role === "user"
                        ? "bg-primary-50 text-primary-800"
                        : "bg-accent-50 text-foreground dark:text-foreground"
                    )}
                  >
                    {formatMessageContent(message.content)}
                  </div>
                </div>
              ))}

              {/* Typing indicator — shown after ≥1 message while waiting */}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-accent-50 px-3 py-2 text-sm text-muted-foreground">
                    Clara is thinking…
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-border px-4 py-3">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Ask Clara anything…"
              disabled={isThinking}
              className={clsxMerge(
                "h-10 flex-1 rounded-lg border border-border bg-input text-foreground px-3 text-sm",
                "placeholder:text-muted-foreground",
                "focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isThinking}
              className={clsxMerge(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                "bg-accent-500 text-white transition-colors hover:bg-accent-700",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Lint and build**

```bash
cd src/MediTrack.Web && npm run lint && npm run build 2>&1 | tail -10
```

Expected: 0 lint errors, build succeeded.

- [ ] **Step 3: Commit**

```bash
git add src/MediTrack.Web/src/shared/components/clara/ClaraPanel.tsx
git commit -m "feat(clara): replace mocked chat with real askClara API + loading state"
```

---

## Task 8: Sync design counterpart (dual-update rule)

**Files:**
- Modify: `design/src/components/clara/ClaraPanel.tsx`

The design keeps mock logic (no real API — design is a showcase), but must have the same visual structure: `isThinking` state + typing indicator + disabled states on input/buttons.

- [ ] **Step 1: Add isThinking state and update handleSendMessage**

In `design/src/components/clara/ClaraPanel.tsx`, add `isThinking` state after the existing state declarations:

```tsx
const [isThinking, setIsThinking] = useState(false);
```

Replace the existing `handleSendMessage` function with this version that simulates async with a brief delay and shows the typing indicator:

```tsx
const handleSendMessage = (text: string) => {
  const trimmedText = text.trim();
  if (!trimmedText || isThinking) return;

  const userMessage: ChatMessage = { role: "user", content: trimmedText };
  setMessages((previous) => [...previous, userMessage]);
  setInputValue("");
  setIsThinking(true);

  // Simulate async response (design uses mocks — no real API)
  setTimeout(() => {
    const assistantResponse: ChatMessage = {
      role: "assistant",
      content: findMockResponse(trimmedText),
    };
    setMessages((previous) => [...previous, assistantResponse]);
    setIsThinking(false);
  }, 800);
};
```

- [ ] **Step 2: Update the useEffect scroll to include isThinking**

```tsx
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages, isThinking]);
```

- [ ] **Step 3: Update the useEffect for reset on close to clear isThinking**

```tsx
useEffect(() => {
  if (!isOpen) {
    const timer = setTimeout(() => {
      setMessages([]);
      setInputValue("");
      setIsThinking(false);
    }, 300);
    return () => clearTimeout(timer);
  }
}, [isOpen]);
```

- [ ] **Step 4: Add isThinking condition to suggestion chips visibility**

Change the condition from `messages.length === 0` to `messages.length === 0 && !isThinking`:

```tsx
{messages.length === 0 && !isThinking && (
  <div className="space-y-2">
    {/* ... existing suggestion chips unchanged ... */}
  </div>
)}
```

- [ ] **Step 5: Add thinking indicator for empty state**

After the suggestion chips block, add:

```tsx
{messages.length === 0 && isThinking && (
  <div className="flex justify-start">
    <div className="rounded-lg bg-accent-50 px-3 py-2 text-sm text-muted-foreground">
      Clara is thinking…
    </div>
  </div>
)}
```

- [ ] **Step 6: Add thinking indicator inside the chat messages block**

Inside the `{messages.length > 0 && ( <div className="space-y-3"> ... </div> )}` block, add after the last message bubble and before `<div ref={messagesEndRef} />`:

```tsx
{isThinking && (
  <div className="flex justify-start">
    <div className="rounded-lg bg-accent-50 px-3 py-2 text-sm text-muted-foreground">
      Clara is thinking…
    </div>
  </div>
)}
```

- [ ] **Step 7: Disable input and send button while thinking**

On the `<input>` element, add `disabled={isThinking}` and the disabled class:

```tsx
<input
  ref={inputRef}
  type="text"
  value={inputValue}
  onChange={(event) => setInputValue(event.target.value)}
  placeholder="Ask Clara anything…"
  disabled={isThinking}
  className={clsxMerge(
    "h-10 flex-1 rounded-lg border border-border bg-input text-foreground px-3 text-sm",
    "placeholder:text-muted-foreground",
    "focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500",
    "disabled:cursor-not-allowed disabled:opacity-50"
  )}
/>
```

On the submit button, change `disabled={!inputValue.trim()}` to `disabled={!inputValue.trim() || isThinking}`.

- [ ] **Step 8: Build the design to verify**

```bash
cd design && npm run build 2>&1 | tail -10
```

Expected: build succeeded, 0 errors.

- [ ] **Step 9: Commit**

```bash
git add design/src/components/clara/ClaraPanel.tsx
git commit -m "feat(clara): sync design ClaraPanel — add isThinking state and typing indicator"
```

---

## Final verification

- [ ] **Run all backend unit tests**

```bash
dotnet test tests/Clara.UnitTests --filter "FullyQualifiedName~Clara.UnitTests"
```

Expected: All tests pass.

- [ ] **Run backend build**

```bash
dotnet build src/Clara.API
```

Expected: `Build succeeded. 0 Error(s)`

- [ ] **Run frontend lint + build**

```bash
cd src/MediTrack.Web && npm run lint && npm run build 2>&1 | tail -10
```

Expected: 0 errors.
