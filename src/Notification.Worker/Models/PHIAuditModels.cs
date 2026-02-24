namespace Notification.Worker.Models;

/// <summary>
/// Database model for PHI access audit log entries.
/// Stores comprehensive audit trail for HIPAA compliance.
/// </summary>
public class PHIAuditLog
{
    /// <summary>
    /// Unique identifier for this audit log entry
    /// </summary>
    public Guid Id { get; set; }
    
    /// <summary>
    /// Integration event ID (for correlation with event bus)
    /// </summary>
    public Guid EventId { get; set; }
    
    /// <summary>
    /// Timestamp of the audit event
    /// </summary>
    public DateTimeOffset Timestamp { get; set; }
    
    /// <summary>
    /// User ID who performed the action
    /// </summary>
    public string UserId { get; set; } = string.Empty;
    
    /// <summary>
    /// Username (for human readability)
    /// </summary>
    public string Username { get; set; } = string.Empty;
    
    /// <summary>
    /// User's role at the time of action
    /// </summary>
    public string UserRole { get; set; } = string.Empty;
    
    /// <summary>
    /// Type of action (Read, Create, Update, Delete, Export, Print)
    /// </summary>
    public string Action { get; set; } = string.Empty;
    
    /// <summary>
    /// Type of PHI resource (Patient, MedicalRecord, Appointment, Prescription, LabResult)
    /// </summary>
    public string ResourceType { get; set; } = string.Empty;
    
    /// <summary>
    /// ID of the specific resource
    /// </summary>
    public string ResourceId { get; set; } = string.Empty;
    
    /// <summary>
    /// Patient ID associated with this PHI
    /// </summary>
    public Guid PatientId { get; set; }
    
    /// <summary>
    /// IP address of the client
    /// </summary>
    public string? IpAddress { get; set; }
    
    /// <summary>
    /// User agent string
    /// </summary>
    public string? UserAgent { get; set; }
    
    /// <summary>
    /// Whether the action was successful
    /// </summary>
    public bool Success { get; set; }
    
    /// <summary>
    /// Error message if action failed
    /// </summary>
    public string? ErrorMessage { get; set; }
    
    /// <summary>
    /// Event type (for categorization)
    /// </summary>
    public string EventType { get; set; } = string.Empty;
    
    /// <summary>
    /// Additional context as JSON
    /// </summary>
    public string? AdditionalContext { get; set; }
    
    /// <summary>
    /// Severity level for security events (Info, Warning, Error, Critical)
    /// </summary>
    public string Severity { get; set; } = "Info";
    
    /// <summary>
    /// Whether this event triggered an alert
    /// </summary>
    public bool AlertTriggered { get; set; }
    
    /// <summary>
    /// Whether this audit log has been reviewed by compliance officer
    /// </summary>
    public bool Reviewed { get; set; }
    
    /// <summary>
    /// User ID of reviewer
    /// </summary>
    public string? ReviewedBy { get; set; }
    
    /// <summary>
    /// Timestamp of review
    /// </summary>
    public DateTimeOffset? ReviewedAt { get; set; }
    
    /// <summary>
    /// Reviewer notes
    /// </summary>
    public string? ReviewNotes { get; set; }
}

/// <summary>
/// Database model for PHI breach incidents.
/// Separate table for tracking potential HIPAA breaches.
/// </summary>
public class PHIBreachIncident
{
    /// <summary>
    /// Unique identifier for this breach incident
    /// </summary>
    public Guid Id { get; set; }
    
    /// <summary>
    /// Integration event ID
    /// </summary>
    public Guid EventId { get; set; }
    
    /// <summary>
    /// Timestamp when breach was detected
    /// </summary>
    public DateTimeOffset DetectedAt { get; set; }
    
    /// <summary>
    /// User ID associated with breach
    /// </summary>
    public string UserId { get; set; } = string.Empty;
    
    /// <summary>
    /// Username
    /// </summary>
    public string Username { get; set; } = string.Empty;
    
    /// <summary>
    /// Patient ID affected
    /// </summary>
    public Guid PatientId { get; set; }
    
    /// <summary>
    /// Severity level (Low, Medium, High, Critical)
    /// </summary>
    public string Severity { get; set; } = string.Empty;
    
    /// <summary>
    /// Description of the breach
    /// </summary>
    public string Description { get; set; } = string.Empty;
    
    /// <summary>
    /// Number of patients affected
    /// </summary>
    public int PatientsAffected { get; set; }
    
    /// <summary>
    /// Whether breach notification is required under HIPAA (500+ patients or other criteria)
    /// </summary>
    public bool RequiresBreachNotification { get; set; }
    
    /// <summary>
    /// Status (Detected, UnderInvestigation, Confirmed, Resolved, FalsePositive)
    /// </summary>
    public string Status { get; set; } = "Detected";
    
    /// <summary>
    /// ID of compliance officer assigned to investigate
    /// </summary>
    public string? AssignedTo { get; set; }
    
    /// <summary>
    /// Investigation notes
    /// </summary>
    public string? InvestigationNotes { get; set; }
    
    /// <summary>
    /// Resolution description
    /// </summary>
    public string? Resolution { get; set; }
    
    /// <summary>
    /// When the incident was resolved
    /// </summary>
    public DateTimeOffset? ResolvedAt { get; set; }
    
    /// <summary>
    /// Whether breach notification was sent
    /// </summary>
    public bool NotificationSent { get; set; }
    
    /// <summary>
    /// When breach notification was sent
    /// </summary>
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
