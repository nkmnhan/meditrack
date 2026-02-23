namespace Patient.API.Models;

/// <summary>
/// Insurance information for a patient.
/// Owned by Patient entity — stored in same table.
/// </summary>
public class Insurance
{
    public string Provider { get; private set; } = null!;
    public string PolicyNumber { get; private set; } = null!;
    public string GroupNumber { get; private set; } = null!;
    public string? PlanName { get; private set; }
    public DateOnly? EffectiveDate { get; private set; }
    public DateOnly? ExpirationDate { get; private set; }

    // For EF Core
    private Insurance() { }

    public Insurance(
        string provider,
        string policyNumber,
        string groupNumber,
        string? planName = null,
        DateOnly? effectiveDate = null,
        DateOnly? expirationDate = null)
    {
        Provider = provider;
        PolicyNumber = policyNumber;
        GroupNumber = groupNumber;
        PlanName = planName;
        EffectiveDate = effectiveDate;
        ExpirationDate = expirationDate;
    }

    public bool IsActive =>
        (!EffectiveDate.HasValue || EffectiveDate <= DateOnly.FromDateTime(DateTime.Today)) &&
        (!ExpirationDate.HasValue || ExpirationDate >= DateOnly.FromDateTime(DateTime.Today));
}
