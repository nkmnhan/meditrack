namespace Appointment.API.Services;

/// <summary>
/// Resolves patient information from Patient.API service.
/// Used for IDOR protection — verifies if a user owns a patient record.
/// </summary>
public interface IPatientResolver
{
    /// <summary>
    /// Gets the Patient ID (from Patient table) for the given Identity user ID.
    /// Returns null if no patient record exists for this user.
    /// </summary>
    Task<Guid?> GetPatientIdByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns true if active, false if inactive, null if patient not found or Patient.API unavailable.
    /// </summary>
    Task<bool?> IsPatientActiveAsync(Guid patientId, CancellationToken cancellationToken = default);
}
