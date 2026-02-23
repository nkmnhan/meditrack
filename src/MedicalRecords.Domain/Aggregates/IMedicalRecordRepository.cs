using MediTrack.MedicalRecords.Domain.SeedWork;

namespace MediTrack.MedicalRecords.Domain.Aggregates;

/// <summary>
/// Repository interface for MedicalRecord aggregate.
/// </summary>
public interface IMedicalRecordRepository : IRepository<MedicalRecord>
{
    /// <summary>
    /// Adds a new medical record.
    /// </summary>
    MedicalRecord Add(MedicalRecord medicalRecord);

    /// <summary>
    /// Updates an existing medical record.
    /// </summary>
    void Update(MedicalRecord medicalRecord);

    /// <summary>
    /// Gets a medical record by ID with all related entities.
    /// </summary>
    Task<MedicalRecord?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a medical record by ID without tracking.
    /// </summary>
    Task<MedicalRecord?> GetByIdReadOnlyAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all medical records for a patient.
    /// </summary>
    Task<IReadOnlyList<MedicalRecord>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets medical records by diagnosis code.
    /// </summary>
    Task<IReadOnlyList<MedicalRecord>> GetByDiagnosisCodeAsync(string diagnosisCode, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if a medical record exists.
    /// </summary>
    Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default);
}
