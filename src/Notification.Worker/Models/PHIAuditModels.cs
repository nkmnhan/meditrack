namespace Notification.Worker.Models;

/// <summary>
/// Shared fields between hot (PHIAuditLog) and archive (ArchivedPHIAuditLog) audit records.
/// Avoids field duplication across the two tables.
/// </summary>
public abstract class PHIAuditLogBase
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string ResourceId { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string? AdditionalContext { get; set; }
    public string Severity { get; set; } = "Info";
    public bool AlertTriggered { get; set; }
    public bool Reviewed { get; set; }
    public string? ReviewedBy { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
    public string? ReviewNotes { get; set; }
}

/// <summary>
/// Hot-tier audit log entry. Lives in PHIAuditLogs table.
/// Records are archived after the configured retention period.
/// </summary>
public class PHIAuditLog : PHIAuditLogBase
{
}

/// <summary>
/// Archived audit log entry. Lives in ArchivedPHIAuditLogs table.
/// Records moved here by AuditArchivalService after the retention period expires.
/// </summary>
public class ArchivedPHIAuditLog : PHIAuditLogBase
{
    /// <summary>
    /// When this record was moved from the hot table to the archive.
    /// </summary>
    public DateTimeOffset ArchivedAt { get; set; }
}

/// <summary>
/// Database model for PHI breach incidents.
/// Separate table for tracking potential HIPAA breaches.
/// Never archived — compliance-critical, always kept in hot tier.
/// </summary>
public class PHIBreachIncident
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public DateTimeOffset DetectedAt { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int PatientsAffected { get; set; }
    public bool RequiresBreachNotification { get; set; }
    public string Status { get; set; } = "Detected";
    public string? AssignedTo { get; set; }
    public string? InvestigationNotes { get; set; }
    public string? Resolution { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public bool NotificationSent { get; set; }
    public DateTimeOffset? NotificationSentAt { get; set; }
}

/// <summary>
/// Audit statistics for reporting and monitoring
/// </summary>
public class PHIAuditStatistics
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;
    public int TotalAccesses { get; set; }
    public int SuccessfulAccesses { get; set; }
    public int FailedAccesses { get; set; }
    public int UnauthorizedAttempts { get; set; }
    public DateTimeOffset FirstAccess { get; set; }
    public DateTimeOffset LastAccess { get; set; }
    public List<string> ResourceTypesAccessed { get; set; } = new();
}
