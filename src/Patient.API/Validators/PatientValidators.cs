using FluentValidation;
using Patient.API.Dtos;

namespace Patient.API.Validators;

internal static class PatientValidationConstants
{
    public static readonly string[] ValidGenders = ["Male", "Female", "Non-Binary", "Other", "Prefer not to say"];
    public static readonly string[] ValidBloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
}

public abstract class PatientRequestValidatorBase<T> : AbstractValidator<T>
    where T : IPatientUpsertRequest
{
    protected PatientRequestValidatorBase()
    {
        // Personal Information
        RuleFor(request => request.FirstName)
            .NotEmpty().WithMessage("First name is required")
            .MaximumLength(100).WithMessage("First name cannot exceed 100 characters");

        RuleFor(request => request.LastName)
            .NotEmpty().WithMessage("Last name is required")
            .MaximumLength(100).WithMessage("Last name cannot exceed 100 characters");

        RuleFor(request => request.DateOfBirth)
            .NotEmpty().WithMessage("Date of birth is required")
            .LessThan(DateOnly.FromDateTime(DateTime.Today)).WithMessage("Date of birth must be in the past")
            .GreaterThan(DateOnly.FromDateTime(DateTime.Today.AddYears(-150))).WithMessage("Date of birth is invalid");

        RuleFor(request => request.Gender)
            .NotEmpty().WithMessage("Gender is required")
            .Must(gender => PatientValidationConstants.ValidGenders.Contains(gender))
            .WithMessage($"Gender must be one of: {string.Join(", ", PatientValidationConstants.ValidGenders)}");

        RuleFor(request => request.SocialSecurityNumber)
            .Matches(@"^\d{3}-\d{2}-\d{4}$")
            .When(request => !string.IsNullOrEmpty(request.SocialSecurityNumber))
            .WithMessage("SSN must be in format XXX-XX-XXXX");

        // Contact Information
        RuleFor(request => request.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format")
            .MaximumLength(256).WithMessage("Email cannot exceed 256 characters");

        RuleFor(request => request.PhoneNumber)
            .NotEmpty().WithMessage("Phone number is required")
            .Matches(@"^\+?[\d\s\-\(\)]{10,20}$").WithMessage("Invalid phone number format");

        RuleFor(request => request.Address)
            .NotNull().WithMessage("Address is required")
            .SetValidator(new AddressDtoValidator());

        // Medical Information
        RuleFor(request => request.BloodType)
            .Must(bloodType => PatientValidationConstants.ValidBloodTypes.Contains(bloodType))
            .When(request => !string.IsNullOrEmpty(request.BloodType))
            .WithMessage($"Blood type must be one of: {string.Join(", ", PatientValidationConstants.ValidBloodTypes)}");

        RuleFor(request => request.Allergies)
            .MaximumLength(2000).WithMessage("Allergies cannot exceed 2000 characters");

        RuleFor(request => request.MedicalNotes)
            .MaximumLength(4000).WithMessage("Medical notes cannot exceed 4000 characters");

        // Emergency Contact (optional but validated if provided)
        When(request => request.EmergencyContact != null, () =>
        {
            RuleFor(request => request.EmergencyContact!)
                .SetValidator(new EmergencyContactDtoValidator());
        });

        // Insurance (optional but validated if provided)
        When(request => request.Insurance != null, () =>
        {
            RuleFor(request => request.Insurance!)
                .SetValidator(new InsuranceDtoValidator());
        });
    }
}

public class CreatePatientRequestValidator : PatientRequestValidatorBase<CreatePatientRequest>
{
}

public class UpdatePatientRequestValidator : PatientRequestValidatorBase<UpdatePatientRequest>
{
}

public class AddressDtoValidator : AbstractValidator<AddressDto>
{
    public AddressDtoValidator()
    {
        RuleFor(address => address.Street)
            .NotEmpty().WithMessage("Street is required")
            .MaximumLength(200).WithMessage("Street cannot exceed 200 characters");

        RuleFor(address => address.Street2)
            .MaximumLength(200).WithMessage("Street2 cannot exceed 200 characters");

        RuleFor(address => address.City)
            .NotEmpty().WithMessage("City is required")
            .MaximumLength(100).WithMessage("City cannot exceed 100 characters");

        RuleFor(address => address.State)
            .NotEmpty().WithMessage("State is required")
            .MaximumLength(50).WithMessage("State cannot exceed 50 characters");

        RuleFor(address => address.ZipCode)
            .NotEmpty().WithMessage("Zip code is required")
            .MaximumLength(20).WithMessage("Zip code cannot exceed 20 characters");

        RuleFor(address => address.Country)
            .NotEmpty().WithMessage("Country is required")
            .MaximumLength(100).WithMessage("Country cannot exceed 100 characters");
    }
}

public class EmergencyContactDtoValidator : AbstractValidator<EmergencyContactDto>
{
    public EmergencyContactDtoValidator()
    {
        RuleFor(emergencyContact => emergencyContact.Name)
            .NotEmpty().WithMessage("Emergency contact name is required")
            .MaximumLength(200).WithMessage("Emergency contact name cannot exceed 200 characters");

        RuleFor(emergencyContact => emergencyContact.Relationship)
            .NotEmpty().WithMessage("Relationship is required")
            .MaximumLength(50).WithMessage("Relationship cannot exceed 50 characters");

        RuleFor(emergencyContact => emergencyContact.PhoneNumber)
            .NotEmpty().WithMessage("Emergency contact phone is required")
            .Matches(@"^\+?[\d\s\-\(\)]{10,20}$").WithMessage("Invalid phone number format");

        RuleFor(emergencyContact => emergencyContact.Email)
            .EmailAddress().WithMessage("Invalid email format")
            .When(emergencyContact => !string.IsNullOrEmpty(emergencyContact.Email));
    }
}

public class InsuranceDtoValidator : AbstractValidator<InsuranceDto>
{
    public InsuranceDtoValidator()
    {
        RuleFor(insurance => insurance.Provider)
            .NotEmpty().WithMessage("Insurance provider is required")
            .MaximumLength(200).WithMessage("Provider cannot exceed 200 characters");

        RuleFor(insurance => insurance.PolicyNumber)
            .NotEmpty().WithMessage("Policy number is required")
            .MaximumLength(100).WithMessage("Policy number cannot exceed 100 characters");

        RuleFor(insurance => insurance.GroupNumber)
            .NotEmpty().WithMessage("Group number is required")
            .MaximumLength(100).WithMessage("Group number cannot exceed 100 characters");

        RuleFor(insurance => insurance.PlanName)
            .MaximumLength(200).WithMessage("Plan name cannot exceed 200 characters");

        RuleFor(insurance => insurance.ExpirationDate)
            .GreaterThanOrEqualTo(insurance => insurance.EffectiveDate)
            .When(insurance => insurance.EffectiveDate.HasValue && insurance.ExpirationDate.HasValue)
            .WithMessage("Expiration date must be after effective date");
    }
}
