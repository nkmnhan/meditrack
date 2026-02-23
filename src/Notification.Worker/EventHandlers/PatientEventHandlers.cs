using MediTrack.EventBus.Abstractions;
using MediTrack.Notification.Models;
using MediTrack.Notification.Services;
using MediTrack.Shared.Events;

namespace MediTrack.Notification.EventHandlers;

/// <summary>
/// Handles PatientRegisteredIntegrationEvent and sends welcome notifications.
/// </summary>
public sealed class PatientRegisteredIntegrationEventHandler : IIntegrationEventHandler<PatientRegisteredIntegrationEvent>
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<PatientRegisteredIntegrationEventHandler> _logger;

    public PatientRegisteredIntegrationEventHandler(
        INotificationService notificationService,
        ILogger<PatientRegisteredIntegrationEventHandler> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task HandleAsync(PatientRegisteredIntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Handling PatientRegisteredIntegrationEvent for patient {PatientId}",
            integrationEvent.PatientId);

        var notification = new NotificationMessage
        {
            Id = Guid.NewGuid(),
            Recipient = integrationEvent.Email,
            Subject = "Welcome to MediTrack Healthcare",
            Body = $"""
                Dear {integrationEvent.FirstName} {integrationEvent.LastName},

                Welcome to MediTrack Healthcare! Your account has been successfully created.

                With your MediTrack account, you can:
                • Schedule and manage appointments
                • View your medical records
                • Communicate with your healthcare providers
                • Receive important health reminders

                To get started, log in to your account and complete your profile.

                If you have any questions, please don't hesitate to contact us.

                Thank you for choosing MediTrack Healthcare!

                Best regards,
                The MediTrack Team
                """,
            Type = NotificationType.PatientRegistered,
            Channel = NotificationChannel.Email,
            Metadata = new Dictionary<string, string>
            {
                ["patientId"] = integrationEvent.PatientId.ToString()
            }
        };

        await _notificationService.SendAsync(notification, cancellationToken);
    }
}

/// <summary>
/// Handles PatientUpdatedIntegrationEvent and sends profile update confirmations.
/// </summary>
public sealed class PatientUpdatedIntegrationEventHandler : IIntegrationEventHandler<PatientUpdatedIntegrationEvent>
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<PatientUpdatedIntegrationEventHandler> _logger;

    public PatientUpdatedIntegrationEventHandler(
        INotificationService notificationService,
        ILogger<PatientUpdatedIntegrationEventHandler> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task HandleAsync(PatientUpdatedIntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Handling PatientUpdatedIntegrationEvent for patient {PatientId}",
            integrationEvent.PatientId);

        var notification = new NotificationMessage
        {
            Id = Guid.NewGuid(),
            Recipient = integrationEvent.Email,
            Subject = "Profile Updated",
            Body = $"""
                Dear {integrationEvent.FirstName} {integrationEvent.LastName},

                Your profile has been successfully updated.

                If you did not make this change, please contact us immediately.

                Thank you,
                MediTrack Healthcare
                """,
            Type = NotificationType.PatientUpdated,
            Channel = NotificationChannel.Email,
            Metadata = new Dictionary<string, string>
            {
                ["patientId"] = integrationEvent.PatientId.ToString()
            }
        };

        await _notificationService.SendAsync(notification, cancellationToken);
    }
}
