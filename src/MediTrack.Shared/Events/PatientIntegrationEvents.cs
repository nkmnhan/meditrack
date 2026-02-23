namespace MediTrack.Shared.Events;

/// <summary>
/// Integration event raised when a new patient is registered.
/// </summary>
public sealed record PatientRegisteredIntegrationEvent : IntegrationEvent
{
    public required Guid PatientId { get; init; }
    public required string FirstName { get; init; }
    public required string LastName { get; init; }
    public required string Email { get; init; }
    public string? PhoneNumber { get; init; }
}

/// <summary>
/// Integration event raised when patient profile is updated.
/// </summary>
public sealed record PatientUpdatedIntegrationEvent : IntegrationEvent
{
    public required Guid PatientId { get; init; }
    public required string FirstName { get; init; }
    public required string LastName { get; init; }
    public required string Email { get; init; }
    public string? PhoneNumber { get; init; }
}
