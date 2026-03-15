namespace MediTrack.EventBus.Abstractions;

/// <summary>
/// Base class for all integration events that flow between microservices via the event bus.
/// </summary>
public abstract record IntegrationEvent
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DateTimeOffset CreationDate { get; init; } = DateTimeOffset.UtcNow;
}
