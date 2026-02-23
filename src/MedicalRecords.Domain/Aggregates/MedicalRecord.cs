namespace MediTrack.MedicalRecords.Domain.Aggregates;

public sealed class MedicalRecord
{
    private MedicalRecord() { }

    public Guid Id { get; private set; }
    public Guid PatientId { get; private set; }
    public string DiagnosisCode { get; private set; } = string.Empty;
    public string DiagnosisDescription { get; private set; } = string.Empty;
    public DateTimeOffset RecordedAt { get; private set; }
    public string RecordedByDoctorId { get; private set; } = string.Empty;

    public static MedicalRecord Create(
        Guid patientId,
        string diagnosisCode,
        string diagnosisDescription,
        string recordedByDoctorId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(diagnosisCode);
        ArgumentException.ThrowIfNullOrWhiteSpace(diagnosisDescription);
        ArgumentException.ThrowIfNullOrWhiteSpace(recordedByDoctorId);

        return new MedicalRecord
        {
            Id = Guid.NewGuid(),
            PatientId = patientId,
            DiagnosisCode = diagnosisCode,
            DiagnosisDescription = diagnosisDescription,
            RecordedAt = DateTimeOffset.UtcNow,
            RecordedByDoctorId = recordedByDoctorId
        };
    }
}
