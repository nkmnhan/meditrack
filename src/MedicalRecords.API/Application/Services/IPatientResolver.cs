namespace MediTrack.MedicalRecords.API.Application.Services;

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
}
