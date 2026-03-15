namespace Patient.API.Models;

/// <summary>
/// Emergency contact information for a patient.
/// Owned by Patient entity — stored in same table.
/// </summary>
public class EmergencyContact
{
    public string Name { get; private set; } = null!;
    public string Relationship { get; private set; } = null!;
    public string PhoneNumber { get; private set; } = null!;
    public string? Email { get; private set; }

    // For EF Core
    private EmergencyContact() { }

    public EmergencyContact(
        string name,
        string relationship,
        string phoneNumber,
        string? email = null)
    {
        Name = name;
        Relationship = relationship;
        PhoneNumber = phoneNumber;
        Email = email;
    }
}
