namespace MediTrack.Notification.Models;

/// <summary>
/// Represents a notification to be sent to a user.
/// </summary>
public sealed class NotificationMessage
{
    public required Guid Id { get; init; }
    public required string Recipient { get; init; }
    public required string Subject { get; init; }
    public required string Body { get; init; }
    public required NotificationType Type { get; init; }
    public required NotificationChannel Channel { get; init; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? SentAt { get; set; }
    public NotificationStatus Status { get; set; } = NotificationStatus.Pending;
    public string? ErrorMessage { get; set; }
    public Dictionary<string, string> Metadata { get; init; } = new();
}

/// <summary>
/// Type of notification.
/// </summary>
public enum NotificationType
{
    AppointmentCreated,
    AppointmentConfirmed,
    AppointmentRescheduled,
    AppointmentCancelled,
    AppointmentReminder,
    PatientRegistered,
    PatientUpdated,
    PrescriptionAdded,
    VitalSignsAlert,
    MedicalRecordCreated
}

/// <summary>
/// Channel through which notification is sent.
/// </summary>
public enum NotificationChannel
{
    Email,
    Sms,
    Push,
    InApp
}

/// <summary>
/// Status of the notification.
/// </summary>
public enum NotificationStatus
{
    Pending,
    Sent,
    Failed,
    Delivered
}
