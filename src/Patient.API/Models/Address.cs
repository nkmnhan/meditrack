namespace Patient.API.Models;

/// <summary>
/// Value object representing a patient's address.
/// Owned by Patient entity — stored in same table.
/// </summary>
public class Address
{
    public string Street { get; private set; } = null!;
    public string? Street2 { get; private set; }
    public string City { get; private set; } = null!;
    public string State { get; private set; } = null!;
    public string ZipCode { get; private set; } = null!;
    public string Country { get; private set; } = null!;

    // For EF Core
    private Address() { }

    public Address(
        string street,
        string? street2,
        string city,
        string state,
        string zipCode,
        string country = "USA")
    {
        Street = street;
        Street2 = street2;
        City = city;
        State = state;
        ZipCode = zipCode;
        Country = country;
    }

    public string FullAddress =>
        string.IsNullOrEmpty(Street2)
            ? $"{Street}, {City}, {State} {ZipCode}, {Country}"
            : $"{Street}, {Street2}, {City}, {State} {ZipCode}, {Country}";
}
