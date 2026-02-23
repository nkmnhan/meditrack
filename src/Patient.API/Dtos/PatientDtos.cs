namespace Patient.API.Dtos;

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
);

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
);

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
    string FullName,
    DateOnly DateOfBirth,
    int Age,
    string Gender,
    string Email,
    string PhoneNumber,
    bool IsActive
);
