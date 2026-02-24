using MediTrack.EventBus.Abstractions;

namespace MediTrack.Shared.Events;

/// <summary>
/// Base event for all PHI (Protected Health Information) access audit events.
/// HIPAA requires comprehensive audit trails for all PHI access.
/// </summary>
public abstract record PHIAuditIntegrationEvent : IntegrationEvent
{
    /// <summary>
    /// User ID who accessed the PHI
    /// </summary>
    public required string UserId { get; init; }
    
    /// <summary>
    /// Username who accessed the PHI
    /// </summary>
    public required string Username { get; init; }
    
    /// <summary>
    /// Role of the user at the time of access (Doctor, Nurse, Admin, etc.)
    /// </summary>
    public required string UserRole { get; init; }
    
    /// <summary>
    /// Type of action performed (Read, Create, Update, Delete, Export, Print)
    /// </summary>
    public required string Action { get; init; }
    
    /// <summary>
    /// Type of PHI resource accessed (Patient, MedicalRecord, Appointment, Prescription, LabResult)
    /// </summary>
    public required string ResourceType { get; init; }
    
    /// <summary>
    /// ID of the specific resource accessed
    /// </summary>
    public required string ResourceId { get; init; }
    
    /// <summary>
    /// Patient ID associated with the PHI (for correlation)
    /// </summary>
    public required Guid PatientId { get; init; }
    
    /// <summary>
    /// IP address of the client making the request
    /// </summary>
    public string? IpAddress { get; init; }
    
    /// <summary>
    /// User agent string (browser/client info)
    /// </summary>
    public string? UserAgent { get; init; }
    
    /// <summary>
    /// Whether the action was successful
    /// </summary>
    public required bool Success { get; init; }
    
    /// <summary>
    /// Error message if action failed
    /// </summary>
    public string? ErrorMessage { get; init; }
    
    /// <summary>
    /// Additional contextual information (JSON)
    /// </summary>
    public string? AdditionalContext { get; init; }
}

/// <summary>
/// Event raised when patient PHI is accessed (read)
/// </summary>
public sealed record PatientPHIAccessedIntegrationEvent : PHIAuditIntegrationEvent
{
    /// <summary>
    /// Fields that were accessed (comma-separated)
    /// </summary>
    public string? AccessedFields { get; init; }
}

/// <summary>
/// Event raised when medical record PHI is accessed (read)
/// </summary>
public sealed record MedicalRecordPHIAccessedIntegrationEvent : PHIAuditIntegrationEvent
{
    /// <summary>
    /// Medical record ID
    /// </summary>
    public required Guid MedicalRecordId { get; init; }
    
    /// <summary>
    /// Type of medical record (Visit, Prescription, LabResult, Diagnosis)
    /// </summary>
    public required string RecordType { get; init; }
}

/// <summary>
/// Event raised when PHI is modified (create/update)
/// </summary>
public sealed record PHIModifiedIntegrationEvent : PHIAuditIntegrationEvent
{
    /// <summary>
    /// Previous value (redacted/hashed, for audit purposes)
    /// </summary>
    public string? PreviousValue { get; init; }
    
    /// <summary>
    /// New value (redacted/hashed, for audit purposes)
    /// </summary>
    public string? NewValue { get; init; }
    
    /// <summary>
    /// Fields that were modified (comma-separated)
    /// </summary>
    public string? ModifiedFields { get; init; }
}

/// <summary>
/// Event raised when PHI is deleted
/// </summary>
public sealed record PHIDeletedIntegrationEvent : PHIAuditIntegrationEvent
{
    /// <summary>
    /// Reason for deletion
    /// </summary>
    public required string DeletionReason { get; init; }
    
    /// <summary>
    /// Whether this is a soft delete (marked as deleted) or hard delete (permanently removed)
    /// </summary>
    public required bool IsSoftDelete { get; init; }
}

/// <summary>
/// Event raised when PHI is exported (downloaded, printed, sent via email, etc.)
/// </summary>
public sealed record PHIExportedIntegrationEvent : PHIAuditIntegrationEvent
{
    /// <summary>
    /// Export format (PDF, CSV, JSON, XML)
    /// </summary>
    public required string ExportFormat { get; init; }
    
    /// <summary>
    /// Export destination (Download, Email, Print, API)
    /// </summary>
    public required string ExportDestination { get; init; }
    
    /// <summary>
    /// Recipient info if sent to another party
    /// </summary>
    public string? RecipientInfo { get; init; }
}

/// <summary>
/// Event raised when there's an unauthorized PHI access attempt
/// </summary>
public sealed record UnauthorizedPHIAccessAttemptIntegrationEvent : PHIAuditIntegrationEvent
{
    /// <summary>
    /// Reason access was denied
    /// </summary>
    public required string DenialReason { get; init; }
    
    /// <summary>
    /// Required permission that was missing
    /// </summary>
    public string? RequiredPermission { get; init; }
}

/// <summary>
/// Event raised when PHI breach is detected
/// </summary>
public sealed record PHIBreachDetectedIntegrationEvent : PHIAuditIntegrationEvent
{
    /// <summary>
    /// Severity of the breach (Low, Medium, High, Critical)
    /// </summary>
    public required string Severity { get; init; }
    
    /// <summary>
    /// Description of the breach
    /// </summary>
    public required string BreachDescription { get; init; }
    
    /// <summary>
    /// Number of patients affected
    /// </summary>
    public int PatientsAffected { get; init; }
    
    /// <summary>
    /// Whether breach notification is required under HIPAA
    /// </summary>
    public bool RequiresBreachNotification { get; init; }
}
