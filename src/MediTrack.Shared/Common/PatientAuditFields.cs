namespace MediTrack.Shared.Common;

/// <summary>
/// Standardized field names for Patient entity audit logging.
/// Keep this in sync with Patient model changes.
/// </summary>
public static class PatientAuditFields
{
    public const string FirstName = nameof(FirstName);
    public const string LastName = nameof(LastName);
    public const string DateOfBirth = nameof(DateOfBirth);
    public const string Email = nameof(Email);
    public const string PhoneNumber = nameof(PhoneNumber);
    public const string Address = nameof(Address);
    public const string Gender = nameof(Gender);
    public const string EmergencyContact = nameof(EmergencyContact);
    public const string MedicalRecordNumber = nameof(MedicalRecordNumber);
    public const string InsuranceInfo = nameof(InsuranceInfo);
    
    /// <summary>
    /// Core demographic PHI fields returned by standard patient read/search endpoints.
    /// Gender, EmergencyContact, MedicalRecordNumber, and InsuranceInfo are excluded because
    /// they are only returned in detailed/extended views, not the default patient response.
    /// Update this list if the default PatientResponse DTO changes.
    /// </summary>
    public static readonly string AllFields = string.Join(",",
        FirstName, LastName, DateOfBirth, Email, PhoneNumber, Address);
}
