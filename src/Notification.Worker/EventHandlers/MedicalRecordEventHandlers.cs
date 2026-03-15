using MediTrack.EventBus.Abstractions;
using MediTrack.Notification.Models;
using MediTrack.Notification.Services;
using MediTrack.Shared.Events;

namespace MediTrack.Notification.EventHandlers;

/// <summary>
/// Handles MedicalRecordCreatedIntegrationEvent and sends notifications.
/// </summary>
public sealed class MedicalRecordCreatedIntegrationEventHandler : IIntegrationEventHandler<MedicalRecordCreatedIntegrationEvent>
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<MedicalRecordCreatedIntegrationEventHandler> _logger;

    public MedicalRecordCreatedIntegrationEventHandler(
        INotificationService notificationService,
        ILogger<MedicalRecordCreatedIntegrationEventHandler> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task HandleAsync(MedicalRecordCreatedIntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Handling MedicalRecordCreatedIntegrationEvent for record {MedicalRecordId}",
            integrationEvent.MedicalRecordId);

        // In a real implementation, we would fetch the patient's email from Patient service
        // For now, we just log the event
        _logger.LogInformation(
            "Medical record {MedicalRecordId} created for patient {PatientId} by {ProviderName}",
            integrationEvent.MedicalRecordId,
            integrationEvent.PatientId,
            integrationEvent.ProviderName);

        await Task.CompletedTask;
    }
}

/// <summary>
/// Handles PrescriptionAddedIntegrationEvent and sends notifications.
/// </summary>
public sealed class PrescriptionAddedIntegrationEventHandler : IIntegrationEventHandler<PrescriptionAddedIntegrationEvent>
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<PrescriptionAddedIntegrationEventHandler> _logger;

    public PrescriptionAddedIntegrationEventHandler(
        INotificationService notificationService,
        ILogger<PrescriptionAddedIntegrationEventHandler> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task HandleAsync(PrescriptionAddedIntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Handling PrescriptionAddedIntegrationEvent for prescription {PrescriptionId}",
            integrationEvent.PrescriptionId);

        var notification = new NotificationMessage
        {
            Id = Guid.NewGuid(),
            Recipient = integrationEvent.PatientEmail,
            Subject = "New Prescription Added",
            Body = $"""
                Dear {integrationEvent.PatientName},

                A new prescription has been added to your medical record:

                Medication: {integrationEvent.MedicationName}
                Dosage: {integrationEvent.Dosage}
                Frequency: {integrationEvent.Frequency}
                {(integrationEvent.DurationDays.HasValue ? $"Duration: {integrationEvent.DurationDays} days" : "")}
                Prescribed by: {integrationEvent.PrescribedByName}

                Please follow the prescribed dosage and consult your healthcare provider if you experience any side effects.

                You can view your full prescription details in your MediTrack account.

                Thank you,
                MediTrack Healthcare
                """,
            Type = NotificationType.PrescriptionAdded,
            Channel = NotificationChannel.Email,
            Metadata = new Dictionary<string, string>
            {
                ["prescriptionId"] = integrationEvent.PrescriptionId.ToString(),
                ["medicalRecordId"] = integrationEvent.MedicalRecordId.ToString(),
                ["patientId"] = integrationEvent.PatientId.ToString()
            }
        };

        await _notificationService.SendAsync(notification, cancellationToken);
    }
}

/// <summary>
/// Handles VitalSignsRecordedIntegrationEvent and sends alerts for abnormal values.
/// </summary>
public sealed class VitalSignsRecordedIntegrationEventHandler : IIntegrationEventHandler<VitalSignsRecordedIntegrationEvent>
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<VitalSignsRecordedIntegrationEventHandler> _logger;

    public VitalSignsRecordedIntegrationEventHandler(
        INotificationService notificationService,
        ILogger<VitalSignsRecordedIntegrationEventHandler> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task HandleAsync(VitalSignsRecordedIntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Handling VitalSignsRecordedIntegrationEvent for vital signs {VitalSignsId}",
            integrationEvent.VitalSignsId);

        // Only send notification for abnormal values
        if (!integrationEvent.HasAbnormalValues)
        {
            _logger.LogDebug(
                "Vital signs {VitalSignsId} are within normal range, no notification needed",
                integrationEvent.VitalSignsId);
            return;
        }

        // Build alert message
        var alertDetails = new List<string>();
        
        if (integrationEvent.BloodPressureSystolic.HasValue && 
            (integrationEvent.BloodPressureSystolic > 140 || integrationEvent.BloodPressureSystolic < 90))
        {
            alertDetails.Add($"Blood Pressure (Systolic): {integrationEvent.BloodPressureSystolic} mmHg");
        }
        
        if (integrationEvent.BloodPressureDiastolic.HasValue && 
            (integrationEvent.BloodPressureDiastolic > 90 || integrationEvent.BloodPressureDiastolic < 60))
        {
            alertDetails.Add($"Blood Pressure (Diastolic): {integrationEvent.BloodPressureDiastolic} mmHg");
        }
        
        if (integrationEvent.HeartRate.HasValue && 
            (integrationEvent.HeartRate > 100 || integrationEvent.HeartRate < 60))
        {
            alertDetails.Add($"Heart Rate: {integrationEvent.HeartRate} bpm");
        }
        
        if (integrationEvent.Temperature.HasValue && 
            (integrationEvent.Temperature > 38 || integrationEvent.Temperature < 36))
        {
            alertDetails.Add($"Temperature: {integrationEvent.Temperature}°C");
        }
        
        if (integrationEvent.OxygenSaturation.HasValue && integrationEvent.OxygenSaturation < 95)
        {
            alertDetails.Add($"Oxygen Saturation: {integrationEvent.OxygenSaturation}%");
        }

        // Log the alert internally - in a real system, this would also notify the care team
        _logger.LogWarning(
            "VITAL SIGNS ALERT for patient {PatientId}: {AlertDetails}",
            integrationEvent.PatientId,
            string.Join(", ", alertDetails));

        await Task.CompletedTask;
    }
}
