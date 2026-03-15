namespace MediTrack.MedicalRecords.Domain.SeedWork;

/// <summary>
/// Marker interface for domain events.
/// </summary>
public interface IDomainEvent
{
    /// <summary>
    /// When the event occurred.
    /// </summary>
    DateTimeOffset OccurredOn { get; }
}
