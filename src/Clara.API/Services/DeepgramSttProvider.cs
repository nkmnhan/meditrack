using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Clara.API.Services;

/// <summary>
/// ISttProvider backed by Deepgram — manages one persistent WebSocket per session.
/// Singleton — keeps WS connections alive across SignalR hub method calls.
/// WS params: nova-3-medical, PCM16 linear16, 16kHz mono, interim results,
/// 10ms endpointing, 1000ms utterance end.
/// </summary>
internal sealed class DeepgramSttProvider : ISttProvider
{
    private const string WsUrlTemplate =
        "wss://api.deepgram.com/v1/listen" +
        "?model=nova-3-medical" +
        "&encoding=linear16" +
        "&sample_rate=16000" +
        "&channels=1" +
        "&interim_results=true" +
        "&endpointing=10" +
        "&utterance_end_ms=1000" +
        "&punctuate=true" +
        "&language=en";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private sealed record SessionEntry(
        IDeepgramWebSocket WebSocket,
        CancellationTokenSource Cts,
        Task ReceiveLoop);

    private readonly ConcurrentDictionary<string, SessionEntry> _sessions = new();
    private readonly IConfiguration _configuration;
    private readonly IDeepgramWebSocketFactory _wsFactory;
    private readonly ILogger<DeepgramSttProvider> _logger;

    public DeepgramSttProvider(
        IConfiguration configuration,
        IDeepgramWebSocketFactory wsFactory,
        ILogger<DeepgramSttProvider> logger)
    {
        _configuration = configuration;
        _wsFactory = wsFactory;
        _logger = logger;
    }

    public async Task OpenStreamAsync(
        string sessionId,
        Func<TranscriptChunk, Task> onTranscript,
        CancellationToken cancellationToken = default)
    {
        if (_sessions.ContainsKey(sessionId))
        {
            _logger.LogDebug("Stream already open for session {SessionId}", sessionId);
            return;
        }

        var apiKey = _configuration["AI:Deepgram:ApiKey"] ?? string.Empty;
        var ws = _wsFactory.Create();

        using var httpRequest = new System.Net.Http.HttpRequestMessage();
        httpRequest.Headers.TryAddWithoutValidation("Authorization", $"Token {apiKey}");

        await ws.ConnectAsync(new Uri(WsUrlTemplate), httpRequest.Headers, cancellationToken);

        var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var receiveLoop = Task.Run(
            () => ReceiveLoopAsync(sessionId, ws, onTranscript, cts.Token),
            CancellationToken.None);

        var entry = new SessionEntry(ws, cts, receiveLoop);
        if (!_sessions.TryAdd(sessionId, entry))
        {
            // Race: another concurrent JoinSession beat us — discard ours
            cts.Cancel();
            await ws.DisposeAsync();
        }
        else
        {
            _logger.LogInformation("Deepgram stream opened for session {SessionId}", sessionId);
        }
    }

    public async Task SendAudioAsync(string sessionId, byte[] audioBytes, CancellationToken cancellationToken = default)
    {
        if (!_sessions.TryGetValue(sessionId, out var entry))
            return;

        if (entry.WebSocket.State != WebSocketState.Open)
        {
            _logger.LogWarning("Deepgram WebSocket not open for session {SessionId}", sessionId);
            return;
        }

        await entry.WebSocket.SendAsync(
            audioBytes.AsMemory(),
            WebSocketMessageType.Binary,
            endOfMessage: true,
            cancellationToken);
    }

    public async Task CloseStreamAsync(string sessionId)
    {
        if (!_sessions.TryRemove(sessionId, out var entry))
            return;

        try
        {
            entry.Cts.Cancel();

            if (entry.WebSocket.State == WebSocketState.Open)
            {
                var closeMsg = Encoding.UTF8.GetBytes("""{"type":"CloseStream"}""");
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
                await entry.WebSocket.SendAsync(closeMsg, WebSocketMessageType.Text, true, cts.Token);
            }

            await entry.WebSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Session ended", CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error closing Deepgram stream for session {SessionId}", sessionId);
        }
        finally
        {
            await entry.WebSocket.DisposeAsync();
            _logger.LogInformation("Deepgram stream closed for session {SessionId}", sessionId);
        }
    }

    private async Task ReceiveLoopAsync(
        string sessionId,
        IDeepgramWebSocket ws,
        Func<TranscriptChunk, Task> onTranscript,
        CancellationToken cancellationToken)
    {
        var buffer = new byte[8192];

        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                var result = await ws.ReceiveAsync(buffer.AsMemory(), cancellationToken);

                if (result.MessageType == WebSocketMessageType.Close)
                    break;

                if (result.MessageType != WebSocketMessageType.Text || result.Count == 0)
                    continue;

                var json = Encoding.UTF8.GetString(buffer, 0, result.Count);
                var chunk = ParseTranscriptChunk(json);

                if (chunk is not null)
                    await onTranscript(chunk);
            }
        }
        catch (OperationCanceledException)
        {
            // Expected on session close
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Deepgram receive loop failed for session {SessionId}", sessionId);
        }
    }

    private TranscriptChunk? ParseTranscriptChunk(string json)
    {
        try
        {
            var doc = JsonSerializer.Deserialize<DeepgramStreamMessage>(json, JsonOptions);

            if (doc?.Type != "Results")
                return null;

            var transcript = doc.Channel?.Alternatives?.FirstOrDefault()?.Transcript;
            var confidence = doc.Channel?.Alternatives?.FirstOrDefault()?.Confidence;

            if (string.IsNullOrWhiteSpace(transcript))
                return null;

            return new TranscriptChunk(transcript, confidence, doc.IsFinal);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse Deepgram streaming message");
            return null;
        }
    }
}

// ── Deepgram WS response models ──────────────────────────

file sealed class DeepgramStreamMessage
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("is_final")]
    public bool IsFinal { get; set; }

    [JsonPropertyName("channel")]
    public DeepgramStreamChannel? Channel { get; set; }
}

file sealed class DeepgramStreamChannel
{
    [JsonPropertyName("alternatives")]
    public List<DeepgramStreamAlternative>? Alternatives { get; set; }
}

file sealed class DeepgramStreamAlternative
{
    [JsonPropertyName("transcript")]
    public string? Transcript { get; set; }

    [JsonPropertyName("confidence")]
    public float? Confidence { get; set; }
}

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
