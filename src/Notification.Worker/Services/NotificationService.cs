using MediTrack.Notification.Models;

namespace MediTrack.Notification.Services;

/// <summary>
/// Service for sending notifications through various channels.
/// </summary>
public interface INotificationService
{
    Task SendAsync(NotificationMessage notification, CancellationToken cancellationToken = default);
    Task SendEmailAsync(string recipient, string subject, string body, CancellationToken cancellationToken = default);
    Task SendSmsAsync(string phoneNumber, string message, CancellationToken cancellationToken = default);
}

/// <summary>
/// Default implementation of notification service.
/// In production, this would integrate with email providers (SendGrid, SES) and SMS providers (Twilio).
/// </summary>
public sealed class NotificationService : INotificationService
{
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(ILogger<NotificationService> logger)
    {
        _logger = logger;
    }

    public async Task SendAsync(NotificationMessage notification, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Sending {Channel} notification [{Type}] to {Recipient}: {Subject}",
            notification.Channel,
            notification.Type,
            notification.Recipient,
            notification.Subject);

        switch (notification.Channel)
        {
            case NotificationChannel.Email:
                await SendEmailAsync(notification.Recipient, notification.Subject, notification.Body, cancellationToken);
                break;
            case NotificationChannel.Sms:
                await SendSmsAsync(notification.Recipient, notification.Body, cancellationToken);
                break;
            case NotificationChannel.Push:
                await SendPushNotificationAsync(notification, cancellationToken);
                break;
            case NotificationChannel.InApp:
                await SaveInAppNotificationAsync(notification, cancellationToken);
                break;
        }

        notification.Status = NotificationStatus.Sent;
        notification.SentAt = DateTimeOffset.UtcNow;

        _logger.LogInformation(
            "Successfully sent notification {NotificationId} via {Channel}",
            notification.Id,
            notification.Channel);
    }

    public async Task SendEmailAsync(string recipient, string subject, string body, CancellationToken cancellationToken = default)
    {
        // TODO: Integrate with email provider (SendGrid, Amazon SES, etc.)
        _logger.LogInformation(
            "EMAIL to {Recipient}\nSubject: {Subject}\nBody: {Body}",
            recipient,
            subject,
            body);

        // Simulate network delay
        await Task.Delay(100, cancellationToken);
    }

    public async Task SendSmsAsync(string phoneNumber, string message, CancellationToken cancellationToken = default)
    {
        // TODO: Integrate with SMS provider (Twilio, etc.)
        _logger.LogInformation(
            "SMS to {PhoneNumber}: {Message}",
            phoneNumber,
            message);

        // Simulate network delay
        await Task.Delay(50, cancellationToken);
    }

    private async Task SendPushNotificationAsync(NotificationMessage notification, CancellationToken cancellationToken)
    {
        // TODO: Integrate with push notification service (Firebase, APNS, etc.)
        _logger.LogInformation(
            "PUSH to {Recipient}: {Subject}",
            notification.Recipient,
            notification.Subject);

        await Task.Delay(50, cancellationToken);
    }

    private async Task SaveInAppNotificationAsync(NotificationMessage notification, CancellationToken cancellationToken)
    {
        // TODO: Save to database for in-app notification feed
        _logger.LogInformation(
            "IN-APP notification saved for {Recipient}: {Subject}",
            notification.Recipient,
            notification.Subject);

        await Task.CompletedTask;
    }
}
