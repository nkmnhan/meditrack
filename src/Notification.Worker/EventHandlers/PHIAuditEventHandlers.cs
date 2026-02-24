using MediTrack.EventBus.Abstractions;
using MediTrack.Shared.Common;
using MediTrack.Shared.Events;
using Notification.Worker.Models;
using Notification.Worker.Services;

namespace MediTrack.Notification.EventHandlers;

/// <summary>
/// Base class for PHI audit event handlers to eliminate boilerplate.
/// Maps integration events to PHIAuditLog entities and persists them.
/// </summary>
public abstract class PHIAuditEventHandlerBase<TEvent> : IIntegrationEventHandler<TEvent>
    where TEvent : PHIAuditIntegrationEvent
{
    protected readonly IAuditLogService AuditLogService;
    protected readonly ILogger Logger;

    protected PHIAuditEventHandlerBase(IAuditLogService auditLogService, ILogger logger)
    {
        AuditLogService = auditLogService;
        Logger = logger;
    }

    public async Task HandleAsync(TEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        LogEvent(integrationEvent);

        var auditLog = MapToAuditLog(integrationEvent);
        
        await AuditLogService.CreateAuditLogAsync(auditLog, cancellationToken);
        
        await OnAuditLogCreatedAsync(integrationEvent, auditLog, cancellationToken);
    }

    /// <summary>
    /// Log the incoming event (subclasses can override for custom logging)
    /// </summary>
    protected abstract void LogEvent(TEvent integrationEvent);

    /// <summary>
    /// Determine the severity level for this event type
    /// </summary>
    protected abstract string GetSeverity(TEvent integrationEvent);

    /// <summary>
    /// Determine whether this event should trigger an alert
    /// </summary>
    protected abstract bool ShouldTriggerAlert(TEvent integrationEvent);

    /// <summary>
    /// Hook for additional actions after audit log is created (e.g., create breach incident)
    /// </summary>
    protected virtual Task OnAuditLogCreatedAsync(TEvent integrationEvent, PHIAuditLog auditLog, CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    private PHIAuditLog MapToAuditLog(TEvent integrationEvent)
    {
        return new PHIAuditLog
        {
            Id = Guid.NewGuid(),
            EventId = integrationEvent.Id,
            Timestamp = integrationEvent.CreationDate,
            UserId = integrationEvent.UserId,
            Username = integrationEvent.Username,
            UserRole = integrationEvent.UserRole,
            Action = integrationEvent.Action,
            ResourceType = integrationEvent.ResourceType,
            ResourceId = integrationEvent.ResourceId,
            PatientId = integrationEvent.PatientId,
            IpAddress = integrationEvent.IpAddress,
            UserAgent = integrationEvent.UserAgent,
            Success = integrationEvent.Success,
            ErrorMessage = integrationEvent.ErrorMessage,
            EventType = typeof(TEvent).Name,
            AdditionalContext = integrationEvent.AdditionalContext,
            Severity = GetSeverity(integrationEvent),
            AlertTriggered = ShouldTriggerAlert(integrationEvent),
            Reviewed = false
        };
    }
}

/// <summary>
/// Handles PatientPHIAccessedIntegrationEvent and logs to audit trail.
/// </summary>
public sealed class PatientPHIAccessedIntegrationEventHandler 
    : PHIAuditEventHandlerBase<PatientPHIAccessedIntegrationEvent>
{
    public PatientPHIAccessedIntegrationEventHandler(
        IAuditLogService auditLogService,
        ILogger<PatientPHIAccessedIntegrationEventHandler> logger)
        : base(auditLogService, logger)
    {
    }

    protected override void LogEvent(PatientPHIAccessedIntegrationEvent integrationEvent)
    {
        Logger.LogInformation(
            "Recording patient PHI access: User {UserId} accessed patient {PatientId}",
            integrationEvent.UserId,
            integrationEvent.PatientId);
    }

    protected override string GetSeverity(PatientPHIAccessedIntegrationEvent integrationEvent) 
        => AuditSeverity.Info;

    protected override bool ShouldTriggerAlert(PatientPHIAccessedIntegrationEvent integrationEvent) 
        => false;
}

/// <summary>
/// Handles MedicalRecordPHIAccessedIntegrationEvent and logs to audit trail.
/// </summary>
public sealed class MedicalRecordPHIAccessedIntegrationEventHandler 
    : PHIAuditEventHandlerBase<MedicalRecordPHIAccessedIntegrationEvent>
{
    public MedicalRecordPHIAccessedIntegrationEventHandler(
        IAuditLogService auditLogService,
        ILogger<MedicalRecordPHIAccessedIntegrationEventHandler> logger)
        : base(auditLogService, logger)
    {
    }

    protected override void LogEvent(MedicalRecordPHIAccessedIntegrationEvent integrationEvent)
    {
        Logger.LogInformation(
            "Recording medical record PHI access: User {UserId} accessed record {MedicalRecordId} for patient {PatientId}",
            integrationEvent.UserId,
            integrationEvent.MedicalRecordId,
            integrationEvent.PatientId);
    }

    protected override string GetSeverity(MedicalRecordPHIAccessedIntegrationEvent integrationEvent) 
        => AuditSeverity.Info;

    protected override bool ShouldTriggerAlert(MedicalRecordPHIAccessedIntegrationEvent integrationEvent) 
        => false;
}

/// <summary>
/// Handles PHIModifiedIntegrationEvent and logs changes to audit trail.
/// </summary>
public sealed class PHIModifiedIntegrationEventHandler 
    : PHIAuditEventHandlerBase<PHIModifiedIntegrationEvent>
{
    public PHIModifiedIntegrationEventHandler(
        IAuditLogService auditLogService,
        ILogger<PHIModifiedIntegrationEventHandler> logger)
        : base(auditLogService, logger)
    {
    }

    protected override void LogEvent(PHIModifiedIntegrationEvent integrationEvent)
    {
        Logger.LogInformation(
            "Recording PHI modification: User {UserId} {Action} {ResourceType} {ResourceId}",
            integrationEvent.UserId,
            integrationEvent.Action,
            integrationEvent.ResourceType,
            integrationEvent.ResourceId);
    }

    protected override string GetSeverity(PHIModifiedIntegrationEvent integrationEvent) 
        => AuditSeverity.Info;

    protected override bool ShouldTriggerAlert(PHIModifiedIntegrationEvent integrationEvent) 
        => false;
}

/// <summary>
/// Handles PHIDeletedIntegrationEvent and logs deletions to audit trail.
/// </summary>
public sealed class PHIDeletedIntegrationEventHandler 
    : PHIAuditEventHandlerBase<PHIDeletedIntegrationEvent>
{
    public PHIDeletedIntegrationEventHandler(
        IAuditLogService auditLogService,
        ILogger<PHIDeletedIntegrationEventHandler> logger)
        : base(auditLogService, logger)
    {
    }

    protected override void LogEvent(PHIDeletedIntegrationEvent integrationEvent)
    {
        Logger.LogWarning(
            "Recording PHI deletion: User {UserId} deleted {ResourceType} {ResourceId}, Reason: {Reason}",
            integrationEvent.UserId,
            integrationEvent.ResourceType,
            integrationEvent.ResourceId,
            integrationEvent.DeletionReason);
    }

    protected override string GetSeverity(PHIDeletedIntegrationEvent integrationEvent) 
        => integrationEvent.IsSoftDelete ? AuditSeverity.Warning : AuditSeverity.Error;

    protected override bool ShouldTriggerAlert(PHIDeletedIntegrationEvent integrationEvent) 
        => !integrationEvent.IsSoftDelete; // Alert on hard deletes only
}

/// <summary>
/// Handles PHIExportedIntegrationEvent and logs exports to audit trail.
/// </summary>
public sealed class PHIExportedIntegrationEventHandler 
    : PHIAuditEventHandlerBase<PHIExportedIntegrationEvent>
{
    public PHIExportedIntegrationEventHandler(
        IAuditLogService auditLogService,
        ILogger<PHIExportedIntegrationEventHandler> logger)
        : base(auditLogService, logger)
    {
    }

    protected override void LogEvent(PHIExportedIntegrationEvent integrationEvent)
    {
        Logger.LogWarning(
            "Recording PHI export: User {UserId} exported {ResourceType} {ResourceId} as {Format} to {Destination}",
            integrationEvent.UserId,
            integrationEvent.ResourceType,
            integrationEvent.ResourceId,
            integrationEvent.ExportFormat,
            integrationEvent.ExportDestination);
    }

    protected override string GetSeverity(PHIExportedIntegrationEvent integrationEvent) 
        => AuditSeverity.Warning; // Exports are sensitive operations

    protected override bool ShouldTriggerAlert(PHIExportedIntegrationEvent integrationEvent) 
        => true; // Always alert on exports
}

/// <summary>
/// Handles UnauthorizedPHIAccessAttemptIntegrationEvent and logs security violations.
/// </summary>
public sealed class UnauthorizedPHIAccessAttemptIntegrationEventHandler 
    : PHIAuditEventHandlerBase<UnauthorizedPHIAccessAttemptIntegrationEvent>
{
    public UnauthorizedPHIAccessAttemptIntegrationEventHandler(
        IAuditLogService auditLogService,
        ILogger<UnauthorizedPHIAccessAttemptIntegrationEventHandler> logger)
        : base(auditLogService, logger)
    {
    }

    protected override void LogEvent(UnauthorizedPHIAccessAttemptIntegrationEvent integrationEvent)
    {
        Logger.LogWarning(
            "Recording unauthorized PHI access attempt: User {UserId} denied access to {ResourceType} {ResourceId}, Reason: {Reason}",
            integrationEvent.UserId,
            integrationEvent.ResourceType,
            integrationEvent.ResourceId,
            integrationEvent.DenialReason);
    }

    protected override string GetSeverity(UnauthorizedPHIAccessAttemptIntegrationEvent integrationEvent) 
        => AuditSeverity.Error;

    protected override bool ShouldTriggerAlert(UnauthorizedPHIAccessAttemptIntegrationEvent integrationEvent) 
        => true; // Always alert on unauthorized attempts
}

/// <summary>
/// Handles PHIBreachDetectedIntegrationEvent and creates breach incident records.
/// </summary>
public sealed class PHIBreachDetectedIntegrationEventHandler 
    : PHIAuditEventHandlerBase<PHIBreachDetectedIntegrationEvent>
{
    public PHIBreachDetectedIntegrationEventHandler(
        IAuditLogService auditLogService,
        ILogger<PHIBreachDetectedIntegrationEventHandler> logger)
        : base(auditLogService, logger)
    {
    }

    protected override void LogEvent(PHIBreachDetectedIntegrationEvent integrationEvent)
    {
        Logger.LogCritical(
            "PHI BREACH DETECTED: {Severity} breach by user {UserId}, {PatientsAffected} patients affected. Description: {Description}",
            integrationEvent.Severity,
            integrationEvent.UserId,
            integrationEvent.PatientsAffected,
            integrationEvent.BreachDescription);
    }

    protected override string GetSeverity(PHIBreachDetectedIntegrationEvent integrationEvent) 
        => AuditSeverity.Critical;

    protected override bool ShouldTriggerAlert(PHIBreachDetectedIntegrationEvent integrationEvent) 
        => true;

    protected override async Task OnAuditLogCreatedAsync(
        PHIBreachDetectedIntegrationEvent integrationEvent, 
        PHIAuditLog auditLog, 
        CancellationToken cancellationToken)
    {
        // Create breach incident
        var breachIncident = new PHIBreachIncident
        {
            Id = Guid.NewGuid(),
            EventId = integrationEvent.Id,
            DetectedAt = integrationEvent.CreationDate,
            UserId = integrationEvent.UserId,
            Username = integrationEvent.Username,
            PatientId = integrationEvent.PatientId,
            Severity = integrationEvent.Severity,
            Description = integrationEvent.BreachDescription,
            PatientsAffected = integrationEvent.PatientsAffected,
            RequiresBreachNotification = integrationEvent.RequiresBreachNotification,
            Status = BreachStatus.Detected,
            NotificationSent = false
        };

        await AuditLogService.CreateBreachIncidentAsync(breachIncident, cancellationToken);

        // If breach notification is required, alert immediately
        if (integrationEvent.RequiresBreachNotification)
        {
            Logger.LogCritical(
                "HIPAA BREACH NOTIFICATION REQUIRED: Incident {IncidentId} affects {PatientsAffected} patients. Immediate action required!",
                breachIncident.Id,
                integrationEvent.PatientsAffected);
        }
    }
}
