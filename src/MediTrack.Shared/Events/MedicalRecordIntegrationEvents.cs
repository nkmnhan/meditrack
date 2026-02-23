namespace MediTrack.Shared.Events;

/// <summary>
/// Integration event raised when a new medical record is created.
/// </summary>
public sealed record MedicalRecordCreatedIntegrationEvent : IntegrationEvent
{
    public required Guid MedicalRecordId { get; init; }
    public required Guid PatientId { get; init; }
    public required string PatientName { get; init; }
    public required Guid ProviderId { get; init; }
    public required string ProviderName { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
}

/// <summary>
/// Integration event raised when a prescription is added to a medical record.
/// </summary>
public sealed record PrescriptionAddedIntegrationEvent : IntegrationEvent
{
    public required Guid PrescriptionId { get; init; }
    public required Guid MedicalRecordId { get; init; }
    public required Guid PatientId { get; init; }
    public required string PatientName { get; init; }
    public required string PatientEmail { get; init; }
    public required string MedicationName { get; init; }
    public required string Dosage { get; init; }
    public required string Frequency { get; init; }
    public int? DurationDays { get; init; }
    public required string PrescribedByName { get; init; }
}

/// <summary>
/// Integration event raised when vital signs are recorded.
/// </summary>
public sealed record VitalSignsRecordedIntegrationEvent : IntegrationEvent
{
    public required Guid VitalSignsId { get; init; }
    public required Guid MedicalRecordId { get; init; }
    public required Guid PatientId { get; init; }
    public required string PatientName { get; init; }
    public decimal? BloodPressureSystolic { get; init; }
    public decimal? BloodPressureDiastolic { get; init; }
    public decimal? HeartRate { get; init; }
    public decimal? Temperature { get; init; }
    public decimal? OxygenSaturation { get; init; }
    public required string RecordedByName { get; init; }
    public required DateTimeOffset RecordedAt { get; init; }
    public bool HasAbnormalValues { get; init; }
}
