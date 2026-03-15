namespace MediTrack.Shared.Common;

/// <summary>
/// Audit action types for PHI operations
/// </summary>
public static class AuditActions
{
    public const string Read = nameof(Read);
    public const string Create = nameof(Create);
    public const string Update = nameof(Update);
    public const string Delete = nameof(Delete);
    public const string Export = nameof(Export);
    public const string Search = nameof(Search);
    public const string UnauthorizedAccess = nameof(UnauthorizedAccess);
    public const string BreachDetected = nameof(BreachDetected);
}

/// <summary>
/// Resource types subject to PHI audit logging
/// </summary>
public static class AuditResourceTypes
{
    public const string Patient = nameof(Patient);
    public const string MedicalRecord = nameof(MedicalRecord);
    public const string Appointment = nameof(Appointment);
    public const string Prescription = nameof(Prescription);
    public const string LabResult = nameof(LabResult);
}

/// <summary>
/// Audit severity levels
/// </summary>
public static class AuditSeverity
{
    public const string Info = nameof(Info);
    public const string Warning = nameof(Warning);
    public const string Error = nameof(Error);
    public const string Critical = nameof(Critical);
}

/// <summary>
/// Breach incident workflow statuses
/// </summary>
public static class BreachStatus
{
    public const string Detected = nameof(Detected);
    public const string UnderInvestigation = nameof(UnderInvestigation);
    public const string Confirmed = nameof(Confirmed);
    public const string Resolved = nameof(Resolved);
    public const string FalsePositive = nameof(FalsePositive);
}

/// <summary>
/// Claim type constants for extracting user context
/// </summary>
public static class AuditClaimTypes
{
    /// <summary>Subject claim - user ID (JWT standard)</summary>
    public const string Subject = "sub";

    /// <summary>Name claim - username (JWT standard)</summary>
    public const string Name = "name";

    /// <summary>Role claim - user role (JWT standard)</summary>
    public const string Role = "role";

    // Legacy WS-Federation / XML-schema claim type URIs.
    // ASP.NET Identity maps these to the short JWT names, but some middleware
    // configurations leave them in their original URI form.
    public const string SubjectLegacy = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
    public const string NameLegacy = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";
    public const string RoleLegacy = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
}

/// <summary>
/// System user identifiers for non-user-initiated operations
/// </summary>
public static class SystemUsers
{
    public const string System = "system";
    public const string Unknown = "unknown";
}

/// <summary>
/// Export formats for PHI data exports
/// </summary>
public static class ExportFormats
{
    public const string Pdf = "PDF";
    public const string Csv = "CSV";
    public const string Json = "JSON";
    public const string Xml = "XML";
    public const string Print = "Print";
}
