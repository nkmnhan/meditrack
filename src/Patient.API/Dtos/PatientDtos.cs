namespace Patient.API.Dtos;

public interface IPatientUpsertRequest
{
    string FirstName { get; }
    string LastName { get; }
    DateOnly DateOfBirth { get; }
    string Gender { get; }
    string? SocialSecurityNumber { get; }
    string Email { get; }
    string PhoneNumber { get; }
    AddressDto Address { get; }
    string? BloodType { get; }
    string? Allergies { get; }
    string? MedicalNotes { get; }
    EmergencyContactDto? EmergencyContact { get; }
    InsuranceDto? Insurance { get; }
}

public record CreatePatientRequest(
    // Personal Information
    string FirstName,
    string LastName,
    DateOnly DateOfBirth,
    string Gender,
    string? SocialSecurityNumber,

    // Contact Information
    string Email,
    string PhoneNumber,
    AddressDto Address,

    // Medical Information (optional on creation)
    string? BloodType,
    string? Allergies,
    string? MedicalNotes,

    // Related entities (optional on creation)
    EmergencyContactDto? EmergencyContact,
    InsuranceDto? Insurance
) : IPatientUpsertRequest;

public record UpdatePatientRequest(
    // Personal Information
    string FirstName,
    string LastName,
    DateOnly DateOfBirth,
    string Gender,
    string? SocialSecurityNumber,

    // Contact Information
    string Email,
    string PhoneNumber,
    AddressDto Address,

    // Medical Information
    string? BloodType,
    string? Allergies,
    string? MedicalNotes,

    // Related entities
    EmergencyContactDto? EmergencyContact,
    InsuranceDto? Insurance
) : IPatientUpsertRequest;

public record AddressDto(
    string Street,
    string? Street2,
    string City,
    string State,
    string ZipCode,
    string Country = "USA"
);

public record EmergencyContactDto(
    string Name,
    string Relationship,
    string PhoneNumber,
    string? Email
);

public record InsuranceDto(
    string Provider,
    string PolicyNumber,
    string GroupNumber,
    string? PlanName,
    DateOnly? EffectiveDate,
    DateOnly? ExpirationDate
);

public record PatientResponse(
    Guid Id,
    string MedicalRecordNumber,
    string FirstName,
    string LastName,
    string FullName,
    DateOnly DateOfBirth,
    int Age,
    string Gender,
    string Email,
    string PhoneNumber,
    AddressDto Address,
    string? BloodType,
    string? Allergies,
    string? MedicalNotes,
    EmergencyContactDto? EmergencyContact,
    InsuranceDto? Insurance,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    bool IsActive
);

public record PatientListItemResponse(
    Guid Id,
    string MedicalRecordNumber,
    string FullName,
    DateOnly DateOfBirth,
    int Age,
    string Gender,
    string Email,
    string PhoneNumber,
    bool IsActive
);
