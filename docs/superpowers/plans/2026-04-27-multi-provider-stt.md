# Multi-Provider STT — Deepgram + Whisper

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support multiple STT providers (Deepgram for Pro/cloud customers, self-hosted Whisper for Free/on-premise) selectable per deployment. Switch without touching `SessionHub` or any UI code. Run under both Nexus and Docker.

**SOLID principles driving every decision:**

| Principle | What changes |
|-----------|-------------|
| **LSP** | Rename `IStreamingTranscriptionService` → `ISttProvider` — the name "Streaming" makes a false behavioral promise that Whisper cannot keep |
| **ISP** | `IDeepgramWebSocket` + `IDeepgramWebSocketFactory` are Deepgram transport internals — move them out of the shared `Interfaces.cs` into `DeepgramSttProvider.cs` as `internal` |
| **OCP** | `SessionHub` never changes when adding a new provider — it depends on `ISttProviderFactory`, not a concrete class |
| **DIP** | `SessionHub` → `ISttProviderFactory` → `ISttProvider` — no concrete types cross layer boundaries |

**Architecture:**

```
ISttProvider  (renamed from IStreamingTranscriptionService)
  ├── DeepgramSttProvider  (renamed from DeepgramStreamingService — persistent WS)
  └── WhisperSttProvider   (new — buffers PCM16, batch HTTP every ~5s, always IsFinal)

ISttProviderFactory
  └── SttProviderFactory   (reads AI:Stt:DefaultProvider config → returns singleton)

SessionHub  →  ISttProviderFactory.GetProvider(sessionId)  →  ISttProvider
```

**Whisper transport:** [fedirz/faster-whisper-server](https://github.com/fedirz/faster-whisper-server) — OpenAI-compatible REST API. `POST /v1/audio/transcriptions` with WAV audio. Docker image: `fedirz/faster-whisper-server:latest-cpu`.

**Provider behavioral contract:**

| Provider | `OpenStreamAsync` | `SendAudioAsync` | Callback timing |
|----------|-------------------|------------------|-----------------|
| Deepgram | Opens WS | Forwards PCM16 over WS | ~200ms, interim + final |
| Whisper  | Initialises buffer | Accumulates PCM16 | ~5s, final only |

Both implementations honour the `ISttProvider` contract: invoke `onTranscript` with `TranscriptChunk` for every non-empty result. Timing differs, contract does not — LSP preserved.

---

## File Map

### Backend — Modified

| File | Change |
|------|--------|
| `src/Clara.API/Services/Interfaces.cs` | Rename interface + record; remove `IDeepgramWebSocket`/factory; add `ISttProviderFactory` + `SttProviderType` |
| `src/Clara.API/Services/DeepgramStreamingService.cs` | Rename class → `DeepgramSttProvider`; absorb `IDeepgramWebSocket`/factory as `internal` |
| `src/Clara.API/Services/DeepgramWebSocketAdapter.cs` | Delete — contents moved into `DeepgramSttProvider.cs` |
| `src/Clara.API/Hubs/SessionHub.cs` | Inject `ISttProviderFactory` instead of `ISttProvider` directly |
| `src/Clara.API/Program.cs` | Register both providers + factory; wire `ISttProviderFactory` |
| `src/Clara.API/appsettings.json` | Add `AI.Stt` section with `DefaultProvider` key |

### Backend — New

| File | Purpose |
|------|---------|
| `src/Clara.API/Services/SttProviderFactory.cs` | Implements `ISttProviderFactory`; routes by config |
| `src/Clara.API/Services/WhisperSttProvider.cs` | Implements `ISttProvider` via buffered HTTP batch |

### Backend — Tests

| File | Change |
|------|--------|
| `tests/Clara.UnitTests/Services/DeepgramStreamingServiceTests.cs` | Rename → `DeepgramSttProviderTests.cs`; update type references |
| `tests/Clara.UnitTests/TestInfrastructure/FakeDeepgramWebSocket.cs` | No change — stays internal to Deepgram tests |
| `tests/Clara.UnitTests/Services/WhisperSttProviderTests.cs` | **Create** — buffer accumulation + HTTP call tests |
| `tests/Clara.UnitTests/Services/SttProviderFactoryTests.cs` | **Create** — routing tests |

### Infrastructure

| File | Change |
|------|--------|
| `docker-compose.yml` | Add `whisper-api` service under `whisper` profile |
| `docker-compose.override.yml` | Add `AI__Whisper__BaseUrl` + `AI__Stt__DefaultProvider` to `clara-api` |

### Nexus (documentation only — config-driven, no code change)

User secrets additions documented in Task 6.

---

## Task 1 — Interface cleanup (ISP + LSP)

**Files:**
- Modify: `src/Clara.API/Services/Interfaces.cs`
- Modify: `src/Clara.API/Services/DeepgramStreamingService.cs` (rename class + absorb internals)
- Delete: `src/Clara.API/Services/DeepgramWebSocketAdapter.cs`

### Step 1.1 — Update `Interfaces.cs`

Replace the bottom section of `src/Clara.API/Services/Interfaces.cs` (from `TranscriptChunk` to EOF) with:

```csharp
/// <summary>
/// A single transcript result from an STT provider.
/// IsFinal=false = interim preview (Deepgram only). IsFinal=true = committed phrase.
/// </summary>
public sealed record TranscriptChunk(string Transcript, float? Confidence, bool IsFinal);

/// <summary>
/// Selects which STT provider to use for a session.
/// </summary>
public enum SttProviderType { Deepgram, Whisper }

/// <summary>
/// Resolves the appropriate ISttProvider for a given session.
/// Implementations read tenant or global config to determine the provider.
/// </summary>
public interface ISttProviderFactory
{
    ISttProvider GetProvider(string sessionId);
}

/// <summary>
/// Provides speech-to-text transcription for a session.
/// Implementations differ in latency and hosting (cloud streaming vs self-hosted batch)
/// but share the same callback contract: invoke onTranscript for every non-empty result.
/// </summary>
public interface ISttProvider
{
    /// <summary>
    /// Prepares the provider for a session. For streaming providers this opens a connection;
    /// for batch providers this initialises a buffer. No-op if already prepared.
    /// </summary>
    Task OpenStreamAsync(
        string sessionId,
        Func<TranscriptChunk, Task> onTranscript,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Delivers raw PCM16 audio (16kHz mono) for the session.
    /// Streaming providers forward immediately; batch providers accumulate and flush periodically.
    /// </summary>
    Task SendAudioAsync(string sessionId, byte[] audioBytes, CancellationToken cancellationToken = default);

    /// <summary>
    /// Signals end-of-session. Flushes any remaining audio and releases resources.
    /// </summary>
    Task CloseStreamAsync(string sessionId);
}

// IDeepgramWebSocket and IDeepgramWebSocketFactory are REMOVED from this file.
// They are Deepgram transport internals — declared internal in DeepgramSttProvider.cs.
```

Remove the `IDeepgramWebSocket` and `IDeepgramWebSocketFactory` declarations from this file entirely.

### Step 1.2 — Rename `DeepgramStreamingService.cs` and absorb internals

Rename the file to `DeepgramSttProvider.cs`. Inside:

1. Rename the class: `DeepgramStreamingService` → `DeepgramSttProvider`
2. Change `: IStreamingTranscriptionService` → `: ISttProvider`
3. Change `ILogger<DeepgramStreamingService>` → `ILogger<DeepgramSttProvider>`
4. Move `IDeepgramWebSocket` and `IDeepgramWebSocketFactory` interfaces into this file as `internal`
5. Move `DeepgramWebSocketAdapter` and `DeepgramWebSocketFactory` classes into this file as `internal sealed`

At the bottom of the renamed `DeepgramSttProvider.cs`, add:

```csharp
// ── Deepgram transport abstractions (internal — not part of ISttProvider contract) ──

internal interface IDeepgramWebSocket : IAsyncDisposable
{
    System.Net.WebSockets.WebSocketState State { get; }
    Task ConnectAsync(Uri uri, System.Net.Http.Headers.HttpRequestHeaders? headers, CancellationToken cancellationToken);
    Task SendAsync(ReadOnlyMemory<byte> buffer, System.Net.WebSockets.WebSocketMessageType messageType, bool endOfMessage, CancellationToken cancellationToken);
    ValueTask<System.Net.WebSockets.ValueWebSocketReceiveResult> ReceiveAsync(Memory<byte> buffer, CancellationToken cancellationToken);
    Task CloseAsync(System.Net.WebSockets.WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken);
}

internal interface IDeepgramWebSocketFactory
{
    IDeepgramWebSocket Create();
}

internal sealed class DeepgramWebSocketAdapter : IDeepgramWebSocket
{
    private readonly ClientWebSocket _ws = new();
    public WebSocketState State => _ws.State;
    public async Task ConnectAsync(Uri uri, System.Net.Http.Headers.HttpRequestHeaders? headers, CancellationToken cancellationToken)
    {
        if (headers is not null)
            foreach (var header in headers)
                _ws.Options.SetRequestHeader(header.Key, string.Join(",", header.Value));
        await _ws.ConnectAsync(uri, cancellationToken);
    }
    public Task SendAsync(ReadOnlyMemory<byte> buffer, WebSocketMessageType messageType, bool endOfMessage, CancellationToken cancellationToken)
        => _ws.SendAsync(buffer, messageType, endOfMessage, cancellationToken).AsTask();
    public ValueTask<ValueWebSocketReceiveResult> ReceiveAsync(Memory<byte> buffer, CancellationToken cancellationToken)
        => _ws.ReceiveAsync(buffer, cancellationToken);
    public Task CloseAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken)
        => _ws.CloseAsync(closeStatus, statusDescription, cancellationToken);
    public ValueTask DisposeAsync() { _ws.Dispose(); return ValueTask.CompletedTask; }
}

internal sealed class DeepgramWebSocketFactory : IDeepgramWebSocketFactory
{
    public IDeepgramWebSocket Create() => new DeepgramWebSocketAdapter();
}
```

Delete `src/Clara.API/Services/DeepgramWebSocketAdapter.cs` — its contents are now internal to `DeepgramSttProvider.cs`.

### Step 1.3 — Build to verify no regressions

```bash
dotnet build src/Clara.API/Clara.API.csproj 2>&1 | tail -10
```

Expected: `Build succeeded` — zero errors. (Tests will fail until Step 1.4.)

### Step 1.4 — Update test references

In `tests/Clara.UnitTests/Services/DeepgramStreamingServiceTests.cs`:
- Rename file → `DeepgramSttProviderTests.cs`
- Rename class → `DeepgramSttProviderTests`
- Replace `DeepgramStreamingService` → `DeepgramSttProvider`
- Remove `using Clara.API.Services;` import for `IDeepgramWebSocketFactory` if it was referencing the now-internal type. Use the `FakeDeepgramWebSocketFactory` from `TestInfrastructure` which already implements the internal interface via the test project's access.

> **Note:** Because `IDeepgramWebSocket` is now `internal`, the test project needs `[assembly: InternalsVisibleTo("Clara.UnitTests")]` in `Clara.API`. Add to `src/Clara.API/Properties/AssemblyInfo.cs` (create if missing):
> ```csharp
> using System.Runtime.CompilerServices;
> [assembly: InternalsVisibleTo("Clara.UnitTests")]
> ```

### Step 1.5 — Run tests

```bash
dotnet test tests/Clara.UnitTests --filter "FullyQualifiedName~DeepgramSttProvider" -v 2>&1 | tail -15
```

Expected: All tests PASS.

### Step 1.6 — Commit

```bash
git add src/Clara.API/Services/Interfaces.cs \
        src/Clara.API/Services/DeepgramSttProvider.cs \
        src/Clara.API/Properties/AssemblyInfo.cs \
        tests/Clara.UnitTests/Services/DeepgramSttProviderTests.cs
git rm src/Clara.API/Services/DeepgramStreamingService.cs \
       src/Clara.API/Services/DeepgramWebSocketAdapter.cs
git commit -m "refactor(clara): ISP+LSP — rename ISttProvider, internalize Deepgram WS transport"
```

---

## Task 2 — Configuration

**Files:**
- Modify: `src/Clara.API/appsettings.json`
- Modify: `docker-compose.override.yml`

### Step 2.1 — Add `AI.Stt` section to `appsettings.json`

In `src/Clara.API/appsettings.json`, inside the `AI` block, add:

```json
"AI": {
  "Stt": {
    "DefaultProvider": "Deepgram"
  },
  "Whisper": {
    "BaseUrl": "",
    "BufferSeconds": 5,
    "Model": "base.en"
  },
  "Deepgram": {
    "ApiKey": ""
  }
}
```

### Step 2.2 — Add Whisper env vars to `docker-compose.override.yml`

In the `clara-api` environment block, add:

```yaml
- AI__Stt__DefaultProvider=${STT_PROVIDER:-Deepgram}
- AI__Whisper__BaseUrl=${WHISPER_BASE_URL:-http://whisper-api:8000}
- AI__Whisper__BufferSeconds=5
- AI__Whisper__Model=base.en
```

### Step 2.3 — Commit

```bash
git add src/Clara.API/appsettings.json docker-compose.override.yml
git commit -m "config(clara): add AI.Stt provider selection + Whisper settings"
```

---

## Task 3 — `SttProviderFactory`

**Files:**
- Create: `src/Clara.API/Services/SttProviderFactory.cs`
- Modify: `src/Clara.API/Program.cs`

### Step 3.1 — Write failing tests first (TDD RED)

Create `tests/Clara.UnitTests/Services/SttProviderFactoryTests.cs`:

```csharp
using Clara.API.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using NSubstitute;
using Xunit;

namespace Clara.UnitTests.Services;

public sealed class SttProviderFactoryTests
{
    private static SttProviderFactory CreateFactory(
        string defaultProvider,
        ISttProvider deepgram,
        ISttProvider whisper)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AI:Stt:DefaultProvider"] = defaultProvider
            })
            .Build();
        return new SttProviderFactory(config, deepgram, whisper);
    }

    [Fact]
    public void GetProvider_WhenConfigIsDeepgram_ReturnsDeepgramProvider()
    {
        var deepgram = Substitute.For<ISttProvider>();
        var whisper = Substitute.For<ISttProvider>();
        var factory = CreateFactory("Deepgram", deepgram, whisper);

        var result = factory.GetProvider("session-1");

        result.Should().BeSameAs(deepgram);
    }

    [Fact]
    public void GetProvider_WhenConfigIsWhisper_ReturnsWhisperProvider()
    {
        var deepgram = Substitute.For<ISttProvider>();
        var whisper = Substitute.For<ISttProvider>();
        var factory = CreateFactory("Whisper", deepgram, whisper);

        var result = factory.GetProvider("session-1");

        result.Should().BeSameAs(whisper);
    }

    [Fact]
    public void GetProvider_WhenConfigIsUnknown_DefaultsToDeepgram()
    {
        var deepgram = Substitute.For<ISttProvider>();
        var whisper = Substitute.For<ISttProvider>();
        var factory = CreateFactory("UnknownProvider", deepgram, whisper);

        var result = factory.GetProvider("session-1");

        result.Should().BeSameAs(deepgram);
    }

    [Fact]
    public void GetProvider_WhenConfigIsMissing_DefaultsToDeepgram()
    {
        var deepgram = Substitute.For<ISttProvider>();
        var whisper = Substitute.For<ISttProvider>();
        var factory = CreateFactory("", deepgram, whisper);

        var result = factory.GetProvider("session-1");

        result.Should().BeSameAs(deepgram);
    }
}
```

Run to confirm RED:

```bash
dotnet test tests/Clara.UnitTests --filter "FullyQualifiedName~SttProviderFactoryTests" -v 2>&1 | head -20
```

### Step 3.2 — Implement `SttProviderFactory`

Create `src/Clara.API/Services/SttProviderFactory.cs`:

```csharp
namespace Clara.API.Services;

public sealed class SttProviderFactory : ISttProviderFactory
{
    private readonly IConfiguration _configuration;
    private readonly ISttProvider _deepgram;
    private readonly ISttProvider _whisper;

    public SttProviderFactory(
        IConfiguration configuration,
        [FromKeyedServices(SttProviderType.Deepgram)] ISttProvider deepgram,
        [FromKeyedServices(SttProviderType.Whisper)] ISttProvider whisper)
    {
        _configuration = configuration;
        _deepgram = deepgram;
        _whisper = whisper;
    }

    public ISttProvider GetProvider(string sessionId)
    {
        var configured = _configuration["AI:Stt:DefaultProvider"];
        return Enum.TryParse<SttProviderType>(configured, ignoreCase: true, out var providerType)
            ? Resolve(providerType)
            : _deepgram;
    }

    private ISttProvider Resolve(SttProviderType type) => type switch
    {
        SttProviderType.Whisper => _whisper,
        _ => _deepgram,
    };
}
```

### Step 3.3 — Register in Program.cs

Replace the existing `IStreamingTranscriptionService` registrations with:

```csharp
builder.Services.AddSingleton<IDeepgramWebSocketFactory, DeepgramWebSocketFactory>();
builder.Services.AddKeyedSingleton<ISttProvider, DeepgramSttProvider>(SttProviderType.Deepgram);
builder.Services.AddKeyedSingleton<ISttProvider, WhisperSttProvider>(SttProviderType.Whisper);
builder.Services.AddSingleton<ISttProviderFactory, SttProviderFactory>();
```

Remove the old `IDeepgramWebSocketFactory` and `IStreamingTranscriptionService` lines.

> **Note on keyed services**: `DeepgramWebSocketFactory` is now `internal`. Register it via a lambda:
> ```csharp
> builder.Services.AddKeyedSingleton<ISttProvider, DeepgramSttProvider>(
>     SttProviderType.Deepgram,
>     (sp, _) => new DeepgramSttProvider(
>         sp.GetRequiredService<IConfiguration>(),
>         new DeepgramWebSocketFactory(),
>         sp.GetRequiredService<ILogger<DeepgramSttProvider>>()));
> ```

### Step 3.4 — Update `SessionHub` to use factory

In `src/Clara.API/Hubs/SessionHub.cs`:

Replace `IStreamingTranscriptionService _streamingTranscription` with `ISttProviderFactory _sttFactory`.

In `JoinSession`, replace `await _streamingTranscription.OpenStreamAsync(...)` with:

```csharp
var sttProvider = _sttFactory.GetProvider(sessionId);
await sttProvider.OpenStreamAsync(sessionId, async chunk => { ... });
```

Store the resolved provider in `ConnectionSessions` so `LeaveSession`, `OnDisconnectedAsync`, and `StreamAudioChunk` can use the same instance:

Update `ConnectionInfo` record:
```csharp
private record ConnectionInfo(string SessionId, string DoctorId, ISttProvider SttProvider);
```

Then in `StreamAudioChunk` and `LeaveSession`, use `connInfo.SttProvider` instead of `_streamingTranscription`.

### Step 3.5 — Run all tests

```bash
dotnet test tests/Clara.UnitTests -v 2>&1 | tail -15
```

Expected: All tests PASS.

### Step 3.6 — Commit

```bash
git add src/Clara.API/Services/SttProviderFactory.cs \
        src/Clara.API/Hubs/SessionHub.cs \
        src/Clara.API/Program.cs \
        tests/Clara.UnitTests/Services/SttProviderFactoryTests.cs
git commit -m "feat(clara): ISttProviderFactory — OCP/DIP seam for multi-provider STT routing"
```

---

## Task 4 — `WhisperSttProvider`

**Files:**
- Create: `src/Clara.API/Services/WhisperSttProvider.cs`
- Create: `tests/Clara.UnitTests/Services/WhisperSttProviderTests.cs`

### Step 4.1 — Write failing tests (TDD RED)

Create `tests/Clara.UnitTests/Services/WhisperSttProviderTests.cs`:

```csharp
using System.Net;
using System.Text.Json;
using Clara.API.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Clara.UnitTests.Services;

public sealed class WhisperSttProviderTests
{
    private static (WhisperSttProvider provider, List<HttpRequestMessage> requests) CreateProvider(
        string responseJson,
        string baseUrl = "http://whisper-test",
        int bufferSeconds = 1)
    {
        var requests = new List<HttpRequestMessage>();
        var handler = new FakeHttpMessageHandler(responseJson, requests);
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri(baseUrl) };

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AI:Whisper:BaseUrl"] = baseUrl,
                ["AI:Whisper:BufferSeconds"] = bufferSeconds.ToString(),
                ["AI:Whisper:Model"] = "base.en"
            })
            .Build();

        var provider = new WhisperSttProvider(
            httpClient,
            config,
            NullLogger<WhisperSttProvider>.Instance);

        return (provider, requests);
    }

    [Fact]
    public async Task SendAudioAsync_WhenBufferFills_CallsWhisperAndInvokesCallback()
    {
        const string whisperResponse = """{"text": "patient reports chest pain"}""";
        var (provider, requests) = CreateProvider(whisperResponse, bufferSeconds: 1);
        var received = new List<TranscriptChunk>();

        await provider.OpenStreamAsync("s1", chunk => { received.Add(chunk); return Task.CompletedTask; });

        // 1s of PCM16 at 16kHz = 32000 bytes
        var audio = new byte[32000];
        await provider.SendAudioAsync("s1", audio);

        received.Should().HaveCount(1);
        received[0].Transcript.Should().Be("patient reports chest pain");
        received[0].IsFinal.Should().BeTrue();
        requests.Should().HaveCount(1);
        requests[0].RequestUri!.PathAndQuery.Should().Contain("transcriptions");
    }

    [Fact]
    public async Task SendAudioAsync_WhenBufferNotFull_DoesNotCallWhisper()
    {
        var (provider, requests) = CreateProvider("""{"text": "hello"}""", bufferSeconds: 5);
        await provider.OpenStreamAsync("s2", _ => Task.CompletedTask);

        // Small chunk — far below 5s buffer
        await provider.SendAudioAsync("s2", new byte[1000]);

        requests.Should().BeEmpty();
    }

    [Fact]
    public async Task CloseStreamAsync_FlushesRemainingBuffer()
    {
        var (provider, requests) = CreateProvider("""{"text": "final words"}""", bufferSeconds: 10);
        var received = new List<TranscriptChunk>();

        await provider.OpenStreamAsync("s3", chunk => { received.Add(chunk); return Task.CompletedTask; });
        await provider.SendAudioAsync("s3", new byte[1000]);

        // Close should flush even though buffer is below threshold
        await provider.CloseStreamAsync("s3");

        received.Should().HaveCount(1);
        received[0].Transcript.Should().Be("final words");
    }

    [Fact]
    public async Task CloseStreamAsync_WhenSessionDoesNotExist_DoesNotThrow()
    {
        var (provider, _) = CreateProvider("""{"text": ""}""");
        var act = async () => await provider.CloseStreamAsync("nonexistent");
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task SendAudioAsync_WhenWhisperReturnsEmpty_DoesNotInvokeCallback()
    {
        var (provider, _) = CreateProvider("""{"text": ""}""", bufferSeconds: 1);
        var received = new List<TranscriptChunk>();

        await provider.OpenStreamAsync("s4", chunk => { received.Add(chunk); return Task.CompletedTask; });
        await provider.SendAudioAsync("s4", new byte[32000]);

        received.Should().BeEmpty();
    }
}

file sealed class FakeHttpMessageHandler : HttpMessageHandler
{
    private readonly string _responseBody;
    private readonly List<HttpRequestMessage> _requests;

    public FakeHttpMessageHandler(string responseBody, List<HttpRequestMessage> requests)
    {
        _responseBody = responseBody;
        _requests = requests;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        _requests.Add(request);
        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(_responseBody)
        });
    }
}
```

Run to confirm RED:

```bash
dotnet test tests/Clara.UnitTests --filter "FullyQualifiedName~WhisperSttProviderTests" -v 2>&1 | head -20
```

### Step 4.2 — Implement `WhisperSttProvider`

Create `src/Clara.API/Services/WhisperSttProvider.cs`:

```csharp
using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text.Json;

namespace Clara.API.Services;

/// <summary>
/// ISttProvider backed by self-hosted faster-whisper (OpenAI-compatible REST API).
/// Accumulates PCM16 audio per session; flushes to Whisper every BufferSeconds.
/// All results are IsFinal=true — Whisper has no interim result concept.
/// </summary>
public sealed class WhisperSttProvider : ISttProvider
{
    private sealed class SessionState(Func<TranscriptChunk, Task> onTranscript)
    {
        public List<byte> Buffer { get; } = new();
        public Func<TranscriptChunk, Task> OnTranscript { get; } = onTranscript;
        public SemaphoreSlim FlushLock { get; } = new(1, 1);
    }

    private readonly ConcurrentDictionary<string, SessionState> _sessions = new();
    private readonly HttpClient _httpClient;
    private readonly int _bufferBytes;
    private readonly string _model;
    private readonly ILogger<WhisperSttProvider> _logger;

    public WhisperSttProvider(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<WhisperSttProvider> logger)
    {
        _httpClient = httpClient;
        _model = configuration["AI:Whisper:Model"] ?? "base.en";
        var bufferSeconds = int.TryParse(configuration["AI:Whisper:BufferSeconds"], out var s) ? s : 5;
        // PCM16 at 16kHz mono = 32000 bytes/second
        _bufferBytes = bufferSeconds * 32000;
        _logger = logger;
    }

    public Task OpenStreamAsync(
        string sessionId,
        Func<TranscriptChunk, Task> onTranscript,
        CancellationToken cancellationToken = default)
    {
        _sessions.TryAdd(sessionId, new SessionState(onTranscript));
        _logger.LogInformation("Whisper provider ready for session {SessionId}", sessionId);
        return Task.CompletedTask;
    }

    public async Task SendAudioAsync(string sessionId, byte[] audioBytes, CancellationToken cancellationToken = default)
    {
        if (!_sessions.TryGetValue(sessionId, out var state))
            return;

        state.Buffer.AddRange(audioBytes);

        if (state.Buffer.Count >= _bufferBytes)
            await FlushAsync(sessionId, state, cancellationToken);
    }

    public async Task CloseStreamAsync(string sessionId)
    {
        if (!_sessions.TryRemove(sessionId, out var state))
            return;

        if (state.Buffer.Count > 0)
            await FlushAsync(sessionId, state, CancellationToken.None);

        _logger.LogInformation("Whisper provider closed for session {SessionId}", sessionId);
    }

    private async Task FlushAsync(string sessionId, SessionState state, CancellationToken cancellationToken)
    {
        await state.FlushLock.WaitAsync(cancellationToken);
        try
        {
            if (state.Buffer.Count == 0)
                return;

            var pcmBytes = state.Buffer.ToArray();
            state.Buffer.Clear();

            var transcript = await TranscribeAsync(pcmBytes, cancellationToken);

            if (!string.IsNullOrWhiteSpace(transcript))
                await state.OnTranscript(new TranscriptChunk(transcript, null, IsFinal: true));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Whisper transcription failed for session {SessionId}", sessionId);
        }
        finally
        {
            state.FlushLock.Release();
        }
    }

    private async Task<string?> TranscribeAsync(byte[] pcmBytes, CancellationToken cancellationToken)
    {
        var wavBytes = AddWavHeader(pcmBytes);

        using var content = new MultipartFormDataContent();
        var audioContent = new ByteArrayContent(wavBytes);
        audioContent.Headers.ContentType = new MediaTypeHeaderValue("audio/wav");
        content.Add(audioContent, "file", "audio.wav");
        content.Add(new StringContent(_model), "model");

        var response = await _httpClient.PostAsync("/v1/audio/transcriptions", content, cancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var doc = JsonDocument.Parse(json);
        return doc.RootElement.TryGetProperty("text", out var text) ? text.GetString() : null;
    }

    /// <summary>
    /// Wraps raw PCM16 bytes in a minimal WAV header (16kHz, mono, 16-bit).
    /// </summary>
    private static byte[] AddWavHeader(byte[] pcm)
    {
        const int sampleRate = 16000;
        const short channels = 1;
        const short bitsPerSample = 16;
        var byteRate = sampleRate * channels * bitsPerSample / 8;
        var blockAlign = (short)(channels * bitsPerSample / 8);

        using var ms = new MemoryStream();
        using var writer = new BinaryWriter(ms);

        writer.Write("RIFF"u8);
        writer.Write(36 + pcm.Length);
        writer.Write("WAVE"u8);
        writer.Write("fmt "u8);
        writer.Write(16);               // PCM chunk size
        writer.Write((short)1);         // PCM format
        writer.Write(channels);
        writer.Write(sampleRate);
        writer.Write(byteRate);
        writer.Write(blockAlign);
        writer.Write(bitsPerSample);
        writer.Write("data"u8);
        writer.Write(pcm.Length);
        writer.Write(pcm);

        return ms.ToArray();
    }
}
```

### Step 4.3 — Register `HttpClient` for Whisper in Program.cs

```csharp
builder.Services.AddHttpClient<WhisperSttProvider>((sp, client) =>
{
    var baseUrl = sp.GetRequiredService<IConfiguration>()["AI:Whisper:BaseUrl"] ?? "http://whisper-api:8000";
    client.BaseAddress = new Uri(baseUrl);
});
```

### Step 4.4 — Run tests

```bash
dotnet test tests/Clara.UnitTests -v 2>&1 | tail -15
```

Expected: All tests PASS including new Whisper tests.

### Step 4.5 — Build

```bash
dotnet build src/Clara.API/Clara.API.csproj 2>&1 | tail -5
```

Expected: `Build succeeded`.

### Step 4.6 — Commit

```bash
git add src/Clara.API/Services/WhisperSttProvider.cs \
        src/Clara.API/Program.cs \
        tests/Clara.UnitTests/Services/WhisperSttProviderTests.cs
git commit -m "feat(clara): WhisperSttProvider — buffered batch STT via faster-whisper HTTP"
```

---

## Task 5 — Docker support

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose.override.yml`

### Step 5.1 — Add `whisper-api` to `docker-compose.yml`

After the `clara-api` service block, add:

```yaml
  whisper-api:
    image: fedirz/faster-whisper-server:latest-cpu
    ports:
      - "8000:8000"
    environment:
      WHISPER__MODEL: ${WHISPER_MODEL:-base.en}
    profiles:
      - whisper
```

The `whisper` profile means it only starts when explicitly requested — it's off by default for customers using Deepgram.

### Step 5.2 — Switch to Whisper in override (optional, profile-based)

In `docker-compose.override.yml`, the `AI__Stt__DefaultProvider` env var already defaults to `Deepgram`. To run with Whisper:

```bash
# Start infra + Whisper container
docker compose --profile whisper up -d

# Or override just for this run
STT_PROVIDER=Whisper docker compose --profile whisper up -d
```

No code change needed — it's fully config-driven.

### Step 5.3 — Commit

```bash
git add docker-compose.yml docker-compose.override.yml
git commit -m "feat(infra): add whisper-api container service (opt-in via whisper profile)"
```

---

## Task 6 — Nexus support (config only — no code change)

Nexus is config-driven via user secrets. No code change required.

### Step 6.1 — Add Whisper container to user secrets

```bash
# Add faster-whisper as an optional container resource
dotnet user-secrets --project src/Aspire.Nexus set "AppHost:Services:whisper-api:Type" "Container"
dotnet user-secrets --project src/Aspire.Nexus set "AppHost:Services:whisper-api:Active" "false"
dotnet user-secrets --project src/Aspire.Nexus set "AppHost:Services:whisper-api:Image" "fedirz/faster-whisper-server:latest-cpu"
dotnet user-secrets --project src/Aspire.Nexus set "AppHost:Services:whisper-api:Port" "8000"
```

Enable when needed by flipping `Active` to `true`.

### Step 6.2 — Add env vars to Clara in user secrets

```bash
# In the clara-api service env section:
dotnet user-secrets --project src/Aspire.Nexus set "AppHost:Services:clara-api:Env:AI__Stt__DefaultProvider" "Deepgram"
dotnet user-secrets --project src/Aspire.Nexus set "AppHost:Services:clara-api:Env:AI__Whisper__BaseUrl" "http://localhost:8000"
```

Switch to Whisper: change `DefaultProvider` to `Whisper` and set `Active` to `true` on `whisper-api`.

---

## Self-Review Checklist

### SOLID compliance

| Principle | Verified |
|-----------|---------|
| **S** — `WhisperSttProvider` only buffers + transcribes; `SttProviderFactory` only routes | ✅ |
| **O** — New provider = new class + one DI line. Zero changes to `SessionHub` | ✅ |
| **L** — Both providers satisfy `ISttProvider` contract: callback fires with valid `TranscriptChunk` | ✅ |
| **I** — `IDeepgramWebSocket` internal to Deepgram; `SessionHub` sees only `ISttProviderFactory` | ✅ |
| **D** — `SessionHub` → `ISttProviderFactory` → `ISttProvider` — no concrete types cross boundaries | ✅ |

### Security

- Whisper is self-hosted — audio never leaves the network for on-premise customers ✅
- `AI:Whisper:BaseUrl` from config — never hardcoded ✅
- Deepgram API key path unchanged ✅

### Run modes

| Mode | Deepgram | Whisper |
|------|----------|---------|
| **Nexus** | `AI__Stt__DefaultProvider=Deepgram` (default) | Flip `whisper-api:Active=true` + `DefaultProvider=Whisper` in secrets |
| **Docker** | `docker compose up -d` (default) | `STT_PROVIDER=Whisper docker compose --profile whisper up -d` |
| **Local** | `dotnet run` + appsettings default | Set `AI:Stt:DefaultProvider=Whisper` + `AI:Whisper:BaseUrl=http://localhost:8000` |
