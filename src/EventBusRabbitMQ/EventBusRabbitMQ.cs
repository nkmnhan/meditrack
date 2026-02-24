using System.Text;
using MediTrack.EventBus;
using MediTrack.EventBus.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace MediTrack.EventBusRabbitMQ;

public sealed class EventBusRabbitMQ : IEventBus, IAsyncDisposable
{
    private const string BrokerName = "meditrack_event_bus";
    private const string AutofacScopeNameForRabbitMQ = "meditrack_rabbitmq";

    private readonly RabbitMQPersistentConnection _persistentConnection;
    private readonly ILogger<EventBusRabbitMQ> _logger;
    private readonly IEventBusSubscriptionsManager _subscriptionsManager;
    private readonly IServiceProvider _serviceProvider;
    private readonly string _subscriptionQueueName;

    private IChannel? _consumerChannel;
    private bool _isDisposed;

    public EventBusRabbitMQ(
        RabbitMQPersistentConnection persistentConnection,
        ILogger<EventBusRabbitMQ> logger,
        IEventBusSubscriptionsManager subscriptionsManager,
        IServiceProvider serviceProvider,
        string subscriptionQueueName)
    {
        _persistentConnection = persistentConnection;
        _logger = logger;
        _subscriptionsManager = subscriptionsManager;
        _serviceProvider = serviceProvider;
        _subscriptionQueueName = subscriptionQueueName;
        _subscriptionsManager.OnEventRemoved += OnEventRemovedFromSubscriptionsManager;
    }

    public async Task PublishAsync<TIntegrationEvent>(
        TIntegrationEvent integrationEvent,
        CancellationToken cancellationToken = default)
        where TIntegrationEvent : IntegrationEvent
    {
        if (!_persistentConnection.IsConnected)
        {
            await _persistentConnection.TryConnectAsync(cancellationToken);
        }

        string eventName = integrationEvent.GetType().Name;
        string messageJson = JsonConvert.SerializeObject(integrationEvent);
        byte[] messageBody = Encoding.UTF8.GetBytes(messageJson);

        await using IChannel publishChannel = await _persistentConnection.CreateChannelAsync(cancellationToken);

        await publishChannel.ExchangeDeclareAsync(
            exchange: BrokerName,
            type: ExchangeType.Direct,
            cancellationToken: cancellationToken);

        BasicProperties properties = new()
        {
            DeliveryMode = DeliveryModes.Persistent,
            ContentType = "application/json"
        };

        await publishChannel.BasicPublishAsync(
            exchange: BrokerName,
            routingKey: eventName,
            mandatory: true,
            basicProperties: properties,
            body: messageBody,
            cancellationToken: cancellationToken);

        _logger.LogInformation("Published integration event {EventName} with ID {EventId}", eventName, integrationEvent.Id);
    }

    public void Subscribe<TIntegrationEvent, TIntegrationEventHandler>()
        where TIntegrationEvent : IntegrationEvent
        where TIntegrationEventHandler : IIntegrationEventHandler<TIntegrationEvent>
    {
        string eventName = _subscriptionsManager.GetEventKey<TIntegrationEvent>();
        BindQueueToEvent(eventName);
        _subscriptionsManager.AddSubscription<TIntegrationEvent, TIntegrationEventHandler>();
        _logger.LogInformation("Subscribed to event {EventName} with {HandlerType}", eventName, typeof(TIntegrationEventHandler).Name);
    }

    public void Unsubscribe<TIntegrationEvent, TIntegrationEventHandler>()
        where TIntegrationEvent : IntegrationEvent
        where TIntegrationEventHandler : IIntegrationEventHandler<TIntegrationEvent>
    {
        string eventName = _subscriptionsManager.GetEventKey<TIntegrationEvent>();
        _subscriptionsManager.RemoveSubscription<TIntegrationEvent, TIntegrationEventHandler>();
        _logger.LogInformation("Unsubscribed from event {EventName}", eventName);
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        if (!_persistentConnection.IsConnected)
        {
            await _persistentConnection.TryConnectAsync(cancellationToken);
        }

        _consumerChannel = await CreateConsumerChannelAsync(cancellationToken);
    }

    private void BindQueueToEvent(string eventName)
    {
        if (_consumerChannel is null || !_consumerChannel.IsOpen)
        {
            _logger.LogWarning("Cannot bind event {EventName} — consumer channel is not open", eventName);
            return;
        }

        _consumerChannel.QueueBindAsync(
            queue: _subscriptionQueueName,
            exchange: BrokerName,
            routingKey: eventName).GetAwaiter().GetResult();
    }

    private async Task<IChannel> CreateConsumerChannelAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Creating RabbitMQ consumer channel");

        IChannel channel = await _persistentConnection.CreateChannelAsync(cancellationToken);

        await channel.ExchangeDeclareAsync(
            exchange: BrokerName,
            type: ExchangeType.Direct,
            cancellationToken: cancellationToken);

        await channel.QueueDeclareAsync(
            queue: _subscriptionQueueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null,
            cancellationToken: cancellationToken);

        AsyncEventingBasicConsumer consumer = new(channel);
        consumer.ReceivedAsync += OnMessageReceivedAsync;

        await channel.BasicConsumeAsync(
            queue: _subscriptionQueueName,
            autoAck: false,
            consumer: consumer,
            cancellationToken: cancellationToken);

        channel.ChannelShutdownAsync += OnConsumerChannelShutdownAsync;

        return channel;
    }

    private async Task OnMessageReceivedAsync(object sender, BasicDeliverEventArgs eventArgs)
    {
        string eventName = eventArgs.RoutingKey;
        string messageJson = Encoding.UTF8.GetString(eventArgs.Body.Span);

        try
        {
            await ProcessEventAsync(eventName, messageJson);
            await _consumerChannel!.BasicAckAsync(eventArgs.DeliveryTag, multiple: false);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Error processing message for event {EventName}", eventName);
            await _consumerChannel!.BasicNackAsync(eventArgs.DeliveryTag, multiple: false, requeue: true);
        }
    }

    private async Task ProcessEventAsync(string eventName, string messageJson)
    {
        if (!_subscriptionsManager.HasSubscriptionsForEvent(eventName))
        {
            _logger.LogWarning("No subscriptions found for event {EventName}", eventName);
            return;
        }

        await using AsyncServiceScope serviceScope = _serviceProvider.CreateAsyncScope();

        foreach (SubscriptionInfo subscription in _subscriptionsManager.GetHandlersForEvent(eventName))
        {
            object? handler = serviceScope.ServiceProvider.GetService(subscription.HandlerType);
            if (handler is null) continue;

            Type? eventType = _subscriptionsManager.GetEventTypeByName(eventName);
            if (eventType is null) continue;

            object? integrationEvent = JsonConvert.DeserializeObject(messageJson, eventType);
            if (integrationEvent is null) continue;

            Type handlerInterfaceType = typeof(IIntegrationEventHandler<>).MakeGenericType(eventType);
            await (Task)handlerInterfaceType
                .GetMethod(nameof(IIntegrationEventHandler<IntegrationEvent>.HandleAsync))!
                .Invoke(handler, [integrationEvent, CancellationToken.None])!;
        }
    }

    private async Task OnConsumerChannelShutdownAsync(object sender, ShutdownEventArgs eventArgs)
    {
        _logger.LogWarning("RabbitMQ consumer channel shutdown. Recreating channel...");
        _consumerChannel = await CreateConsumerChannelAsync(CancellationToken.None);
    }

    private void OnEventRemovedFromSubscriptionsManager(object? sender, string eventName)
    {
        if (!_persistentConnection.IsConnected)
        {
            _persistentConnection.TryConnectAsync().GetAwaiter().GetResult();
        }

        if (_consumerChannel is null || !_consumerChannel.IsOpen) return;

        _consumerChannel.QueueUnbindAsync(
            queue: _subscriptionQueueName,
            exchange: BrokerName,
            routingKey: eventName).GetAwaiter().GetResult();

        if (_subscriptionsManager.IsEmpty)
        {
            _consumerChannel.CloseAsync().GetAwaiter().GetResult();
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_isDisposed) return;

        _isDisposed = true;
        _subscriptionsManager.OnEventRemoved -= OnEventRemovedFromSubscriptionsManager;

        if (_consumerChannel is not null)
        {
            _consumerChannel.ChannelShutdownAsync -= OnConsumerChannelShutdownAsync;
            await _consumerChannel.DisposeAsync();
        }

        await _persistentConnection.DisposeAsync();
    }
}
