using MediTrack.EventBus.Abstractions;
using MediTrack.Notification.Models;
using MediTrack.Notification.Services;
using MediTrack.Shared.Events;

namespace MediTrack.Notification.EventHandlers;

/// <summary>
/// Handles AppointmentCreatedIntegrationEvent and sends notifications.
/// </summary>
public sealed class AppointmentCreatedIntegrationEventHandler : IIntegrationEventHandler<AppointmentCreatedIntegrationEvent>
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<AppointmentCreatedIntegrationEventHandler> _logger;

    public AppointmentCreatedIntegrationEventHandler(
        INotificationService notificationService,
        ILogger<AppointmentCreatedIntegrationEventHandler> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task HandleAsync(AppointmentCreatedIntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Handling AppointmentCreatedIntegrationEvent for appointment {AppointmentId}",
            integrationEvent.AppointmentId);

        var notification = new NotificationMessage
        {
            Id = Guid.NewGuid(),
            Recipient = integrationEvent.PatientEmail,
            Subject = "Appointment Scheduled",
            Body = $"""
                Dear {integrationEvent.PatientName},

                Your appointment has been scheduled:

                Date: {integrationEvent.ScheduledAt:dddd, MMMM dd, yyyy}
                Time: {integrationEvent.ScheduledAt:h:mm tt}
                Provider: {integrationEvent.ProviderName}
                Type: {integrationEvent.AppointmentType}
                {(integrationEvent.Reason != null ? $"Reason: {integrationEvent.Reason}" : "")}

                Please arrive 15 minutes early to complete any necessary paperwork.

                If you need to reschedule or cancel, please contact us at least 24 hours in advance.

                Thank you,
                MediTrack Healthcare
                """,
            Type = NotificationType.AppointmentCreated,
            Channel = NotificationChannel.Email,
            Metadata = new Dictionary<string, string>
            {
                [NotificationMetadataKeys.AppointmentId] = integrationEvent.AppointmentId.ToString(),
                [NotificationMetadataKeys.PatientId] = integrationEvent.PatientId.ToString()
            }
        };

        await _notificationService.SendAsync(notification, cancellationToken);
    }
}

/// <summary>
/// Handles AppointmentConfirmedIntegrationEvent and sends notifications.
/// </summary>
public sealed class AppointmentConfirmedIntegrationEventHandler : IIntegrationEventHandler<AppointmentConfirmedIntegrationEvent>
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<AppointmentConfirmedIntegrationEventHandler> _logger;

    public AppointmentConfirmedIntegrationEventHandler(
        INotificationService notificationService,
        ILogger<AppointmentConfirmedIntegrationEventHandler> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task HandleAsync(AppointmentConfirmedIntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Handling AppointmentConfirmedIntegrationEvent for appointment {AppointmentId}",
            integrationEvent.AppointmentId);

        var notification = new NotificationMessage
        {
            Id = Guid.NewGuid(),
            Recipient = integrationEvent.PatientEmail,
            Subject = "Appointment Confirmed",
            Body = $"""
                Dear {integrationEvent.PatientName},

                Your appointment has been confirmed:

                Date: {integrationEvent.ScheduledAt:dddd, MMMM dd, yyyy}
                Time: {integrationEvent.ScheduledAt:h:mm tt}
                Provider: {integrationEvent.ProviderName}

                We look forward to seeing you!

                Thank you,
                MediTrack Healthcare
                """,
            Type = NotificationType.AppointmentConfirmed,
            Channel = NotificationChannel.Email,
            Metadata = new Dictionary<string, string>
            {
                [NotificationMetadataKeys.AppointmentId] = integrationEvent.AppointmentId.ToString(),
                [NotificationMetadataKeys.PatientId] = integrationEvent.PatientId.ToString()
            }
        };

        await _notificationService.SendAsync(notification, cancellationToken);
    }
}

/// <summary>
/// Handles AppointmentRescheduledIntegrationEvent and sends notifications.
/// </summary>
public sealed class AppointmentRescheduledIntegrationEventHandler : IIntegrationEventHandler<AppointmentRescheduledIntegrationEvent>
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<AppointmentRescheduledIntegrationEventHandler> _logger;

    public AppointmentRescheduledIntegrationEventHandler(
        INotificationService notificationService,
        ILogger<AppointmentRescheduledIntegrationEventHandler> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task HandleAsync(AppointmentRescheduledIntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Handling AppointmentRescheduledIntegrationEvent for appointment {AppointmentId}",
            integrationEvent.AppointmentId);

        var notification = new NotificationMessage
        {
            Id = Guid.NewGuid(),
            Recipient = integrationEvent.PatientEmail,
            Subject = "Appointment Rescheduled",
            Body = $"""
                Dear {integrationEvent.PatientName},

                Your appointment has been rescheduled:

                Original: {integrationEvent.OriginalScheduledAt:dddd, MMMM dd, yyyy} at {integrationEvent.OriginalScheduledAt:h:mm tt}
                New: {integrationEvent.NewScheduledAt:dddd, MMMM dd, yyyy} at {integrationEvent.NewScheduledAt:h:mm tt}
                Provider: {integrationEvent.ProviderName}
                {(integrationEvent.RescheduleReason != null ? $"Reason: {integrationEvent.RescheduleReason}" : "")}

                Please contact us if this new time does not work for you.

                Thank you,
                MediTrack Healthcare
                """,
            Type = NotificationType.AppointmentRescheduled,
            Channel = NotificationChannel.Email,
            Metadata = new Dictionary<string, string>
            {
                [NotificationMetadataKeys.AppointmentId] = integrationEvent.AppointmentId.ToString(),
                [NotificationMetadataKeys.PatientId] = integrationEvent.PatientId.ToString()
            }
        };

        await _notificationService.SendAsync(notification, cancellationToken);
    }
}

/// <summary>
/// Handles AppointmentCancelledIntegrationEvent and sends notifications.
/// </summary>
public sealed class AppointmentCancelledIntegrationEventHandler : IIntegrationEventHandler<AppointmentCancelledIntegrationEvent>
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<AppointmentCancelledIntegrationEventHandler> _logger;

    public AppointmentCancelledIntegrationEventHandler(
        INotificationService notificationService,
        ILogger<AppointmentCancelledIntegrationEventHandler> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task HandleAsync(AppointmentCancelledIntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Handling AppointmentCancelledIntegrationEvent for appointment {AppointmentId}",
            integrationEvent.AppointmentId);

        var notification = new NotificationMessage
        {
            Id = Guid.NewGuid(),
            Recipient = integrationEvent.PatientEmail,
            Subject = "Appointment Cancelled",
            Body = $"""
                Dear {integrationEvent.PatientName},

                Your appointment has been cancelled:

                Date: {integrationEvent.ScheduledAt:dddd, MMMM dd, yyyy}
                Time: {integrationEvent.ScheduledAt:h:mm tt}
                Provider: {integrationEvent.ProviderName}
                {(integrationEvent.CancellationReason != null ? $"Reason: {integrationEvent.CancellationReason}" : "")}

                To schedule a new appointment, please visit our website or call us.

                Thank you,
                MediTrack Healthcare
                """,
            Type = NotificationType.AppointmentCancelled,
            Channel = NotificationChannel.Email,
            Metadata = new Dictionary<string, string>
            {
                [NotificationMetadataKeys.AppointmentId] = integrationEvent.AppointmentId.ToString(),
                [NotificationMetadataKeys.PatientId] = integrationEvent.PatientId.ToString()
            }
        };

        await _notificationService.SendAsync(notification, cancellationToken);
    }
}

/// <summary>
/// Handles AppointmentReminderIntegrationEvent and sends notifications.
/// </summary>
public sealed class AppointmentReminderIntegrationEventHandler : IIntegrationEventHandler<AppointmentReminderIntegrationEvent>
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<AppointmentReminderIntegrationEventHandler> _logger;

    public AppointmentReminderIntegrationEventHandler(
        INotificationService notificationService,
        ILogger<AppointmentReminderIntegrationEventHandler> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task HandleAsync(AppointmentReminderIntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Handling AppointmentReminderIntegrationEvent for appointment {AppointmentId}",
            integrationEvent.AppointmentId);

        var notification = new NotificationMessage
        {
            Id = Guid.NewGuid(),
            Recipient = integrationEvent.PatientEmail,
            Subject = $"Appointment Reminder - {integrationEvent.HoursUntilAppointment} hours",
            Body = $"""
                Dear {integrationEvent.PatientName},

                This is a reminder about your upcoming appointment:

                Date: {integrationEvent.ScheduledAt:dddd, MMMM dd, yyyy}
                Time: {integrationEvent.ScheduledAt:h:mm tt}
                Provider: {integrationEvent.ProviderName}
                Location: {integrationEvent.Location}

                Please arrive 15 minutes early.

                If you need to reschedule, please contact us as soon as possible.

                Thank you,
                MediTrack Healthcare
                """,
            Type = NotificationType.AppointmentReminder,
            Channel = NotificationChannel.Email,
            Metadata = new Dictionary<string, string>
            {
                [NotificationMetadataKeys.AppointmentId] = integrationEvent.AppointmentId.ToString(),
                [NotificationMetadataKeys.PatientId] = integrationEvent.PatientId.ToString(),
                [NotificationMetadataKeys.HoursUntil] = integrationEvent.HoursUntilAppointment.ToString()
            }
        };

        await _notificationService.SendAsync(notification, cancellationToken);
    }
}
