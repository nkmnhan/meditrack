using MediTrack.EventBus.Abstractions;

namespace MediTrack.EventBus;

public sealed class InMemoryEventBusSubscriptionsManager : IEventBusSubscriptionsManager
{
    private readonly Dictionary<string, List<SubscriptionInfo>> _handlersByEventName = [];
    private readonly List<Type> _registeredEventTypes = [];

    public bool IsEmpty => _handlersByEventName.Count == 0;
    public event EventHandler<string>? OnEventRemoved;

    public void AddSubscription<TIntegrationEvent, TIntegrationEventHandler>()
        where TIntegrationEvent : IntegrationEvent
        where TIntegrationEventHandler : IIntegrationEventHandler<TIntegrationEvent>
    {
        string eventName = GetEventKey<TIntegrationEvent>();

        if (!_handlersByEventName.ContainsKey(eventName))
        {
            _handlersByEventName.Add(eventName, []);
        }

        if (_handlersByEventName[eventName].Any(subscription => subscription.HandlerType == typeof(TIntegrationEventHandler)))
        {
            throw new ArgumentException(
                $"Handler type {typeof(TIntegrationEventHandler).Name} already registered for event '{eventName}'",
                nameof(TIntegrationEventHandler));
        }

        _handlersByEventName[eventName].Add(SubscriptionInfo.Typed(typeof(TIntegrationEventHandler)));

        if (!_registeredEventTypes.Contains(typeof(TIntegrationEvent)))
        {
            _registeredEventTypes.Add(typeof(TIntegrationEvent));
        }
    }

    public void RemoveSubscription<TIntegrationEvent, TIntegrationEventHandler>()
        where TIntegrationEvent : IntegrationEvent
        where TIntegrationEventHandler : IIntegrationEventHandler<TIntegrationEvent>
    {
        string eventName = GetEventKey<TIntegrationEvent>();

        if (!_handlersByEventName.TryGetValue(eventName, out List<SubscriptionInfo>? handlers))
        {
            return;
        }

        SubscriptionInfo? subscriptionToRemove = handlers
            .FirstOrDefault(subscription => subscription.HandlerType == typeof(TIntegrationEventHandler));

        if (subscriptionToRemove is null)
        {
            return;
        }

        handlers.Remove(subscriptionToRemove);

        if (handlers.Count == 0)
        {
            _handlersByEventName.Remove(eventName);
            _registeredEventTypes.Remove(typeof(TIntegrationEvent));
            OnEventRemoved?.Invoke(this, eventName);
        }
    }

    public bool HasSubscriptionsForEvent<TIntegrationEvent>()
        where TIntegrationEvent : IntegrationEvent =>
        HasSubscriptionsForEvent(GetEventKey<TIntegrationEvent>());

    public bool HasSubscriptionsForEvent(string eventName) =>
        _handlersByEventName.ContainsKey(eventName);

    public Type? GetEventTypeByName(string eventName) =>
        _registeredEventTypes.FirstOrDefault(eventType => eventType.Name == eventName);

    public void Clear() => _handlersByEventName.Clear();

    public IEnumerable<SubscriptionInfo> GetHandlersForEvent<TIntegrationEvent>()
        where TIntegrationEvent : IntegrationEvent =>
        GetHandlersForEvent(GetEventKey<TIntegrationEvent>());

    public IEnumerable<SubscriptionInfo> GetHandlersForEvent(string eventName) =>
        _handlersByEventName.TryGetValue(eventName, out List<SubscriptionInfo>? handlers)
            ? handlers
            : [];

    public string GetEventKey<TIntegrationEvent>()
        where TIntegrationEvent : IntegrationEvent =>
        typeof(TIntegrationEvent).Name;
}
