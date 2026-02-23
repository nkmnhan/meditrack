namespace MediTrack.Shared.Events;

public abstract record IntegrationEvent
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DateTimeOffset CreationDate { get; init; } = DateTimeOffset.UtcNow;
}
