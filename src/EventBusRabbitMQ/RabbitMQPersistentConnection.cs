using System.Net.Sockets;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using RabbitMQ.Client.Exceptions;

namespace MediTrack.EventBusRabbitMQ;

public sealed class RabbitMQPersistentConnection : IAsyncDisposable
{
    private readonly IConnectionFactory _connectionFactory;
    private readonly ILogger<RabbitMQPersistentConnection> _logger;
    private readonly int _maxRetryAttempts;
    private readonly SemaphoreSlim _connectionLock = new(1, 1);

    private IConnection? _connection;
    private bool _isDisposed;

    public bool IsConnected =>
        _connection is { IsOpen: true } && !_isDisposed;

    public RabbitMQPersistentConnection(
        IConnectionFactory connectionFactory,
        ILogger<RabbitMQPersistentConnection> logger,
        int maxRetryAttempts = 5)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
        _maxRetryAttempts = maxRetryAttempts;
    }

    public async Task<IChannel> CreateChannelAsync(CancellationToken cancellationToken = default)
    {
        if (!IsConnected)
        {
            throw new InvalidOperationException("No RabbitMQ connections are available to perform this action.");
        }

        return await _connection!.CreateChannelAsync(cancellationToken: cancellationToken);
    }

    public async Task<bool> TryConnectAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("RabbitMQ client is attempting to connect");

        await _connectionLock.WaitAsync(cancellationToken);

        try
        {
            int retryCount = 0;
            Exception? lastException = null;

            while (retryCount < _maxRetryAttempts)
            {
                try
                {
                    _connection = await _connectionFactory.CreateConnectionAsync(cancellationToken);
                    break;
                }
                catch (BrokerUnreachableException brokerUnreachableException)
                {
                    lastException = brokerUnreachableException;
                }
                catch (SocketException socketException)
                {
                    lastException = socketException;
                }

                retryCount++;
                int delayMs = (int)Math.Pow(2, retryCount) * 1000;
                _logger.LogWarning(
                    lastException,
                    "RabbitMQ client could not connect after {RetryAttempt} attempt(s). Retrying in {DelayMs}ms",
                    retryCount,
                    delayMs);

                await Task.Delay(delayMs, cancellationToken);
            }

            if (!IsConnected)
            {
                _logger.LogCritical(
                    lastException,
                    "FATAL ERROR: RabbitMQ connections could not be created after {MaxRetryAttempts} retries",
                    _maxRetryAttempts);
                return false;
            }

            _connection!.ConnectionShutdownAsync += OnConnectionShutdownAsync;
            _connection!.CallbackExceptionAsync += OnCallbackExceptionAsync;
            _connection!.ConnectionBlockedAsync += OnConnectionBlockedAsync;

            _logger.LogInformation(
                "RabbitMQ persistent connection acquired a connection to '{HostName}'",
                _connection.Endpoint.HostName);

            return true;
        }
        finally
        {
            _connectionLock.Release();
        }
    }

    private async Task OnConnectionBlockedAsync(object sender, ConnectionBlockedEventArgs eventArgs)
    {
        if (_isDisposed) return;

        _logger.LogWarning("RabbitMQ connection is blocked. Trying to reconnect...");
        await TryConnectAsync();
    }

    private async Task OnCallbackExceptionAsync(object sender, CallbackExceptionEventArgs eventArgs)
    {
        if (_isDisposed) return;

        _logger.LogWarning(eventArgs.Exception, "RabbitMQ connection threw exception. Trying to reconnect...");
        await TryConnectAsync();
    }

    private async Task OnConnectionShutdownAsync(object sender, ShutdownEventArgs eventArgs)
    {
        if (_isDisposed) return;

        _logger.LogWarning("RabbitMQ connection is shutdown. Trying to reconnect...");
        await TryConnectAsync();
    }

    public async ValueTask DisposeAsync()
    {
        if (_isDisposed) return;

        _isDisposed = true;

        if (_connection is not null)
        {
            _connection.ConnectionShutdownAsync -= OnConnectionShutdownAsync;
            _connection.CallbackExceptionAsync -= OnCallbackExceptionAsync;
            _connection.ConnectionBlockedAsync -= OnConnectionBlockedAsync;
            await _connection.CloseAsync();
            _connection.Dispose();
        }

        _connectionLock.Dispose();
    }
}
