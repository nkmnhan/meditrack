using MediTrack.EventBus.Abstractions;

namespace MediTrack.Shared.Events;

/// <summary>
/// Integration event raised when a new appointment is created.
/// </summary>
public sealed record AppointmentCreatedIntegrationEvent : IntegrationEvent
{
    public required Guid AppointmentId { get; init; }
    public required Guid PatientId { get; init; }
    public required string PatientName { get; init; }
    public required string PatientEmail { get; init; }
    public required Guid ProviderId { get; init; }
    public required string ProviderName { get; init; }
    public required DateTimeOffset ScheduledAt { get; init; }
    public required string AppointmentType { get; init; }
    public string? Reason { get; init; }
}

/// <summary>
/// Integration event raised when an appointment is confirmed.
/// </summary>
public sealed record AppointmentConfirmedIntegrationEvent : IntegrationEvent
{
    public required Guid AppointmentId { get; init; }
    public required Guid PatientId { get; init; }
    public required string PatientName { get; init; }
    public required string PatientEmail { get; init; }
    public required DateTimeOffset ScheduledAt { get; init; }
    public required string ProviderName { get; init; }
}

/// <summary>
/// Integration event raised when an appointment is rescheduled.
/// </summary>
public sealed record AppointmentRescheduledIntegrationEvent : IntegrationEvent
{
    public required Guid AppointmentId { get; init; }
    public required Guid PatientId { get; init; }
    public required string PatientName { get; init; }
    public required string PatientEmail { get; init; }
    public required DateTimeOffset OriginalScheduledAt { get; init; }
    public required DateTimeOffset NewScheduledAt { get; init; }
    public required string ProviderName { get; init; }
    public string? RescheduleReason { get; init; }
}

/// <summary>
/// Integration event raised when an appointment is cancelled.
/// </summary>
public sealed record AppointmentCancelledIntegrationEvent : IntegrationEvent
{
    public required Guid AppointmentId { get; init; }
    public required Guid PatientId { get; init; }
    public required string PatientName { get; init; }
    public required string PatientEmail { get; init; }
    public required DateTimeOffset ScheduledAt { get; init; }
    public required string ProviderName { get; init; }
    public string? CancellationReason { get; init; }
}

/// <summary>
/// Integration event raised as a reminder before an appointment.
/// </summary>
public sealed record AppointmentReminderIntegrationEvent : IntegrationEvent
{
    public required Guid AppointmentId { get; init; }
    public required Guid PatientId { get; init; }
    public required string PatientName { get; init; }
    public required string PatientEmail { get; init; }
    public required DateTimeOffset ScheduledAt { get; init; }
    public required string ProviderName { get; init; }
    public required string Location { get; init; }
    public required int HoursUntilAppointment { get; init; }
}
