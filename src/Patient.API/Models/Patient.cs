namespace Patient.API.Models;

/// <summary>
/// Patient aggregate root — represents a registered patient in the healthcare system.
/// </summary>
public class Patient
{
    public Guid Id { get; private set; }

    // Personal Information
    public string FirstName { get; private set; } = null!;
    public string LastName { get; private set; } = null!;
    public DateOnly DateOfBirth { get; private set; }
    public string Gender { get; private set; } = null!;
    public string? SocialSecurityNumber { get; private set; }

    // Contact Information
    public string Email { get; private set; } = null!;
    public string PhoneNumber { get; private set; } = null!;
    public Address Address { get; private set; } = null!;

    // Medical Information
    public string? BloodType { get; private set; }
    public string? Allergies { get; private set; }
    public string? MedicalNotes { get; private set; }

    // Relationships
    public EmergencyContact? EmergencyContact { get; private set; }
    public Insurance? Insurance { get; private set; }

    // Audit
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    public bool IsActive { get; private set; }

    // For EF Core
    private Patient() { }

    public Patient(
        string firstName,
        string lastName,
        DateOnly dateOfBirth,
        string gender,
        string email,
        string phoneNumber,
        Address address)
    {
        Id = Guid.NewGuid();
        FirstName = firstName;
        LastName = lastName;
        DateOfBirth = dateOfBirth;
        Gender = gender;
        Email = email;
        PhoneNumber = phoneNumber;
        Address = address;
        CreatedAt = DateTime.UtcNow;
        IsActive = true;
    }

    public string FullName => $"{FirstName} {LastName}";

    public int Age
    {
        get
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            var age = today.Year - DateOfBirth.Year;
            if (DateOfBirth > today.AddYears(-age))
            {
                age--;
            }
            return age;
        }
    }

    public void UpdatePersonalInfo(
        string firstName,
        string lastName,
        DateOnly dateOfBirth,
        string gender,
        string? socialSecurityNumber)
    {
        FirstName = firstName;
        LastName = lastName;
        DateOfBirth = dateOfBirth;
        Gender = gender;
        SocialSecurityNumber = socialSecurityNumber;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateContactInfo(string email, string phoneNumber, Address address)
    {
        Email = email;
        PhoneNumber = phoneNumber;
        Address = address;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateMedicalInfo(string? bloodType, string? allergies, string? medicalNotes)
    {
        BloodType = bloodType;
        Allergies = allergies;
        MedicalNotes = medicalNotes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetEmergencyContact(EmergencyContact contact)
    {
        EmergencyContact = contact;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetInsurance(Insurance insurance)
    {
        Insurance = insurance;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }
}
