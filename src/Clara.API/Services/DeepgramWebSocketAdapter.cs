using System.Net.WebSockets;

namespace Clara.API.Services;

/// <summary>
/// Wraps ClientWebSocket behind IDeepgramWebSocket for production use.
/// </summary>
public sealed class DeepgramWebSocketAdapter : IDeepgramWebSocket
{
    private readonly ClientWebSocket _ws = new();

    public WebSocketState State => _ws.State;

    public async Task ConnectAsync(Uri uri, System.Net.Http.Headers.HttpRequestHeaders? headers, CancellationToken cancellationToken)
    {
        if (headers is not null)
        {
            foreach (var header in headers)
                _ws.Options.SetRequestHeader(header.Key, string.Join(",", header.Value));
        }
        await _ws.ConnectAsync(uri, cancellationToken);
    }

    public Task SendAsync(ReadOnlyMemory<byte> buffer, WebSocketMessageType messageType, bool endOfMessage, CancellationToken cancellationToken)
        => _ws.SendAsync(buffer, messageType, endOfMessage, cancellationToken).AsTask();

    public ValueTask<ValueWebSocketReceiveResult> ReceiveAsync(Memory<byte> buffer, CancellationToken cancellationToken)
        => _ws.ReceiveAsync(buffer, cancellationToken);

    public Task CloseAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken)
        => _ws.CloseAsync(closeStatus, statusDescription, cancellationToken);

    public ValueTask DisposeAsync()
    {
        _ws.Dispose();
        return ValueTask.CompletedTask;
    }
}

public sealed class DeepgramWebSocketFactory : IDeepgramWebSocketFactory
{
    public IDeepgramWebSocket Create() => new DeepgramWebSocketAdapter();
}
