using System.Net.WebSockets;
using System.Text;
using Clara.API.Services;

namespace Clara.UnitTests.TestInfrastructure;

/// <summary>
/// In-memory fake WebSocket for testing DeepgramStreamingService without a network.
/// Enqueue JSON messages — they are returned sequentially by ReceiveAsync.
/// </summary>
public sealed class FakeDeepgramWebSocket : IDeepgramWebSocket
{
    private readonly Queue<string> _messages = new();
    private readonly SemaphoreSlim _signal = new(0);
    private bool _closed;

    public bool IsClosed => _closed;
    public WebSocketState State => _closed ? WebSocketState.Closed : WebSocketState.Open;

    public void EnqueueMessage(string json)
    {
        _messages.Enqueue(json);
        _signal.Release();
    }

    public Task ConnectAsync(Uri uri, System.Net.Http.Headers.HttpRequestHeaders? headers, CancellationToken cancellationToken)
        => Task.CompletedTask;

    public async ValueTask<ValueWebSocketReceiveResult> ReceiveAsync(Memory<byte> buffer, CancellationToken cancellationToken)
    {
        await _signal.WaitAsync(cancellationToken);

        if (_closed || !_messages.TryDequeue(out var json))
            return new ValueWebSocketReceiveResult(0, WebSocketMessageType.Close, true);

        var bytes = Encoding.UTF8.GetBytes(json);
        bytes.CopyTo(buffer.Span);
        return new ValueWebSocketReceiveResult(bytes.Length, WebSocketMessageType.Text, true);
    }

    public Task SendAsync(ReadOnlyMemory<byte> buffer, WebSocketMessageType messageType, bool endOfMessage, CancellationToken cancellationToken)
        => Task.CompletedTask;

    public Task CloseAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken)
    {
        _closed = true;
        _signal.Release();
        return Task.CompletedTask;
    }

    public ValueTask DisposeAsync()
    {
        _closed = true;
        return ValueTask.CompletedTask;
    }
}

public sealed class FakeDeepgramWebSocketFactory : IDeepgramWebSocketFactory
{
    private readonly IDeepgramWebSocket _ws;
    public FakeDeepgramWebSocketFactory(IDeepgramWebSocket ws) => _ws = ws;
    public IDeepgramWebSocket Create() => _ws;
}
