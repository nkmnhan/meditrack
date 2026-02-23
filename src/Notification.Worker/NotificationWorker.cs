namespace MediTrack.Notification;

/// <summary>
/// Background worker for the notification service.
/// The actual event processing is handled by the EventBus subscriptions.
/// This worker handles periodic tasks like appointment reminders.
/// </summary>
public sealed class NotificationWorker : BackgroundService
{
    private readonly ILogger<NotificationWorker> _logger;
    private readonly IServiceProvider _serviceProvider;

    public NotificationWorker(
        ILogger<NotificationWorker> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Notification Worker started at {StartTime}", DateTimeOffset.UtcNow);
        _logger.LogInformation("Listening for integration events via RabbitMQ...");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // TODO: Check for upcoming appointments and send reminders
                // This would query the Appointment service for appointments in the next 24 hours
                // that haven't received a reminder yet
                await CheckUpcomingAppointmentsAsync(stoppingToken);

                // Run every 5 minutes
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Graceful shutdown
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in notification worker loop");
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }

        _logger.LogInformation("Notification Worker stopped at {StopTime}", DateTimeOffset.UtcNow);
    }

    private async Task CheckUpcomingAppointmentsAsync(CancellationToken cancellationToken)
    {
        // TODO: Implement appointment reminder checking
        // 1. Query Appointment service for appointments in the next 24 hours
        // 2. Check which ones haven't received reminders
        // 3. Publish AppointmentReminderIntegrationEvent for each
        
        _logger.LogDebug("Checking for upcoming appointments at {CheckTime}", DateTimeOffset.UtcNow);
        await Task.CompletedTask;
    }
}
