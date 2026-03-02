namespace Clara.API.Application.Models;

/// <summary>
/// Read-only model mapping to the PHIAuditLogs table.
/// Subset of fields from Notification.Worker's PHIAuditLog for admin queries.
/// </summary>
public sealed class AuditLogEntry
{
    public Guid Id { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public string Username { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string ResourceId { get; set; } = string.Empty;
    public string Severity { get; set; } = "Info";
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// DTO returned to the frontend for audit log entries.
/// </summary>
public sealed record AuditLogDto
{
    public required Guid Id { get; init; }
    public required DateTimeOffset Timestamp { get; init; }
    public required string Username { get; init; }
    public required string UserRole { get; init; }
    public required string Action { get; init; }
    public required string ResourceType { get; init; }
    public required string ResourceId { get; init; }
    public required string Severity { get; init; }
    public required bool Success { get; init; }
    public string? ErrorMessage { get; init; }
}

/// <summary>
/// Query parameters for searching audit logs.
/// </summary>
public sealed record AuditLogSearchParams(
    string? Action = null,
    string? User = null,
    string? Search = null,
    string? Severity = null,
    int PageNumber = 1,
    int PageSize = 25);
