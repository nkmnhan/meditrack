using System.Text.Json;
using MediTrack.EventBus.Abstractions;
using MediTrack.Shared.Common;
using MediTrack.Shared.Events;
using Microsoft.AspNetCore.Http;

namespace MediTrack.Shared.Services;

/// <summary>
/// Service for publishing PHI audit events from API controllers.
/// Extracts user context from HTTP request and creates comprehensive audit events.
/// </summary>
public interface IPHIAuditService
{
    Task PublishAccessAsync(
        string resourceType,
        string resourceId,
        Guid patientId,
        string action = AuditActions.Read,
        string? accessedFields = null,
        bool success = true,
        string? errorMessage = null,
        object? additionalContext = null,
        CancellationToken cancellationToken = default);

    Task PublishMedicalRecordAccessAsync(
        Guid medicalRecordId,
        string recordType,
        Guid patientId,
        string action = AuditActions.Read,
        bool success = true,
        string? errorMessage = null,
        object? additionalContext = null,
        CancellationToken cancellationToken = default);

    Task PublishModificationAsync(
        string resourceType,
        string resourceId,
        Guid patientId,
        string action,
        string? modifiedFields = null,
        bool success = true,
        string? errorMessage = null,
        object? additionalContext = null,
        CancellationToken cancellationToken = default);

    Task PublishDeletionAsync(
        string resourceType,
        string resourceId,
        Guid patientId,
        string deletionReason,
        bool isSoftDelete,
        bool success = true,
        string? errorMessage = null,
        object? additionalContext = null,
        CancellationToken cancellationToken = default);

    Task PublishExportAsync(
        string resourceType,
        string resourceId,
        Guid patientId,
        string exportFormat,
        string exportDestination,
        string? recipientInfo = null,
        bool success = true,
        string? errorMessage = null,
        object? additionalContext = null,
        CancellationToken cancellationToken = default);

    Task PublishUnauthorizedAccessAttemptAsync(
        string resourceType,
        string resourceId,
        Guid patientId,
        string denialReason,
        string? requiredPermission = null,
        object? additionalContext = null,
        CancellationToken cancellationToken = default);

    Task PublishBreachDetectedAsync(
        string resourceType,
        string resourceId,
        Guid patientId,
        string severity,
        string breachDescription,
        int patientsAffected,
        bool requiresBreachNotification,
        object? additionalContext = null,
        CancellationToken cancellationToken = default);
}

public class PHIAuditService : IPHIAuditService
{
    private readonly IEventBus _eventBus;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public PHIAuditService(IEventBus eventBus, IHttpContextAccessor httpContextAccessor)
    {
        _eventBus = eventBus;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task PublishAccessAsync(
        string resourceType,
        string resourceId,
        Guid patientId,
        string action = AuditActions.Read,
        string? accessedFields = null,
        bool success = true,
        string? errorMessage = null,
        object? additionalContext = null,
        CancellationToken cancellationToken = default)
    {
        var context = GetAuditContext();

        var integrationEvent = new PatientPHIAccessedIntegrationEvent
        {
            UserId = context.UserId,
            Username = context.Username,
            UserRole = context.UserRole,
            Action = action,
            ResourceType = resourceType,
            ResourceId = resourceId,
            PatientId = patientId,
            IpAddress = context.IpAddress,
            UserAgent = context.UserAgent,
            Success = success,
            ErrorMessage = errorMessage,
            AdditionalContext = SerializeContext(additionalContext),
            AccessedFields = accessedFields
        };

        await _eventBus.PublishAsync(integrationEvent, cancellationToken);
    }

    public async Task PublishMedicalRecordAccessAsync(
        Guid medicalRecordId,
        string recordType,
        Guid patientId,
        string action = AuditActions.Read,
        bool success = true,
        string? errorMessage = null,
        object? additionalContext = null,
        CancellationToken cancellationToken = default)
    {
        var context = GetAuditContext();

        var integrationEvent = new MedicalRecordPHIAccessedIntegrationEvent
        {
            UserId = context.UserId,
            Username = context.Username,
            UserRole = context.UserRole,
            Action = action,
            ResourceType = AuditResourceTypes.MedicalRecord,
            ResourceId = medicalRecordId.ToString(),
            PatientId = patientId,
            IpAddress = context.IpAddress,
            UserAgent = context.UserAgent,
            Success = success,
            ErrorMessage = errorMessage,
            AdditionalContext = SerializeContext(additionalContext),
            MedicalRecordId = medicalRecordId,
            RecordType = recordType
        };

        await _eventBus.PublishAsync(integrationEvent, cancellationToken);
    }

    public async Task PublishModificationAsync(
        string resourceType,
        string resourceId,
        Guid patientId,
        string action,
        string? modifiedFields = null,
        bool success = true,
        string? errorMessage = null,
        object? additionalContext = null,
        CancellationToken cancellationToken = default)
    {
        var context = GetAuditContext();

        var integrationEvent = new PHIModifiedIntegrationEvent
        {
            UserId = context.UserId,
            Username = context.Username,
            UserRole = context.UserRole,
            Action = action,
            ResourceType = resourceType,
            ResourceId = resourceId,
            PatientId = patientId,
            IpAddress = context.IpAddress,
            UserAgent = context.UserAgent,
            Success = success,
            ErrorMessage = errorMessage,
            AdditionalContext = SerializeContext(additionalContext),
            ModifiedFields = modifiedFields
        };

        await _eventBus.PublishAsync(integrationEvent, cancellationToken);
    }

    public async Task PublishDeletionAsync(
        string resourceType,
        string resourceId,
        Guid patientId,
        string deletionReason,
        bool isSoftDelete,
        bool success = true,
        string? errorMessage = null,
        object? additionalContext = null,
        CancellationToken cancellationToken = default)
    {
        var context = GetAuditContext();

        var integrationEvent = new PHIDeletedIntegrationEvent
        {
            UserId = context.UserId,
            Username = context.Username,
            UserRole = context.UserRole,
            Action = AuditActions.Delete,
            ResourceType = resourceType,
            ResourceId = resourceId,
            PatientId = patientId,
            IpAddress = context.IpAddress,
            UserAgent = context.UserAgent,
            Success = success,
            ErrorMessage = errorMessage,
            AdditionalContext = SerializeContext(additionalContext),
            DeletionReason = deletionReason,
            IsSoftDelete = isSoftDelete
        };

        await _eventBus.PublishAsync(integrationEvent, cancellationToken);
    }

    public async Task PublishExportAsync(
        string resourceType,
        string resourceId,
        Guid patientId,
        string exportFormat,
        string exportDestination,
        string? recipientInfo = null,
        bool success = true,
        string? errorMessage = null,
        object? additionalContext = null,
        CancellationToken cancellationToken = default)
    {
        var context = GetAuditContext();

        var integrationEvent = new PHIExportedIntegrationEvent
        {
            UserId = context.UserId,
            Username = context.Username,
            UserRole = context.UserRole,
            Action = AuditActions.Export,
            ResourceType = resourceType,
            ResourceId = resourceId,
            PatientId = patientId,
            IpAddress = context.IpAddress,
            UserAgent = context.UserAgent,
            Success = success,
            ErrorMessage = errorMessage,
            AdditionalContext = SerializeContext(additionalContext),
            ExportFormat = exportFormat,
            ExportDestination = exportDestination,
            RecipientInfo = recipientInfo
        };

        await _eventBus.PublishAsync(integrationEvent, cancellationToken);
    }

    public async Task PublishUnauthorizedAccessAttemptAsync(
        string resourceType,
        string resourceId,
        Guid patientId,
        string denialReason,
        string? requiredPermission = null,
        object? additionalContext = null,
        CancellationToken cancellationToken = default)
    {
        var context = GetAuditContext();

        var integrationEvent = new UnauthorizedPHIAccessAttemptIntegrationEvent
        {
            UserId = context.UserId,
            Username = context.Username,
            UserRole = context.UserRole,
            Action = AuditActions.UnauthorizedAccess,
            ResourceType = resourceType,
            ResourceId = resourceId,
            PatientId = patientId,
            IpAddress = context.IpAddress,
            UserAgent = context.UserAgent,
            Success = false,
            ErrorMessage = denialReason,
            AdditionalContext = SerializeContext(additionalContext),
            DenialReason = denialReason,
            RequiredPermission = requiredPermission
        };

        await _eventBus.PublishAsync(integrationEvent, cancellationToken);
    }

    public async Task PublishBreachDetectedAsync(
        string resourceType,
        string resourceId,
        Guid patientId,
        string severity,
        string breachDescription,
        int patientsAffected,
        bool requiresBreachNotification,
        object? additionalContext = null,
        CancellationToken cancellationToken = default)
    {
        var context = GetAuditContext();

        var integrationEvent = new PHIBreachDetectedIntegrationEvent
        {
            UserId = context.UserId,
            Username = context.Username,
            UserRole = context.UserRole,
            Action = AuditActions.BreachDetected,
            ResourceType = resourceType,
            ResourceId = resourceId,
            PatientId = patientId,
            IpAddress = context.IpAddress,
            UserAgent = context.UserAgent,
            Success = false,
            ErrorMessage = breachDescription,
            AdditionalContext = SerializeContext(additionalContext),
            Severity = severity,
            BreachDescription = breachDescription,
            PatientsAffected = patientsAffected,
            RequiresBreachNotification = requiresBreachNotification
        };

        await _eventBus.PublishAsync(integrationEvent, cancellationToken);
    }

    private AuditContext GetAuditContext()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext == null)
        {
            return new AuditContext
            {
                UserId = SystemUsers.System,
                Username = "System",
                UserRole = "System"
            };
        }

        var user = httpContext.User;
        var userId = user.FindFirst(AuditClaimTypes.Subject)?.Value 
                     ?? user.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value 
                     ?? SystemUsers.Unknown;
        var username = user.FindFirst(AuditClaimTypes.Name)?.Value 
                       ?? user.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")?.Value 
                       ?? "Unknown User";
        var userRole = user.FindFirst(AuditClaimTypes.Role)?.Value 
                       ?? user.FindFirst("http://schemas.microsoft.com/ws/2008/06/identity/claims/role")?.Value 
                       ?? "Unknown";

        var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = httpContext.Request.Headers["User-Agent"].ToString();

        return new AuditContext
        {
            UserId = userId,
            Username = username,
            UserRole = userRole,
            IpAddress = ipAddress,
            UserAgent = userAgent
        };
    }

    private static string? SerializeContext(object? context)
    {
        if (context == null)
        {
            return null;
        }

        try
        {
            return JsonSerializer.Serialize(context);
        }
        catch
        {
            return context.ToString();
        }
    }

    private record AuditContext
    {
        public required string UserId { get; init; }
        public required string Username { get; init; }
        public required string UserRole { get; init; }
        public string? IpAddress { get; init; }
        public string? UserAgent { get; init; }
    }
}
