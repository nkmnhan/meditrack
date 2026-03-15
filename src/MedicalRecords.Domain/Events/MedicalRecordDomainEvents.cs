using MediTrack.MedicalRecords.Domain.Aggregates;
using MediTrack.MedicalRecords.Domain.SeedWork;

namespace MediTrack.MedicalRecords.Domain.Events;

/// <summary>
/// Domain event raised when a new medical record is created.
/// </summary>
public sealed class MedicalRecordCreatedDomainEvent : IDomainEvent
{
    public Guid MedicalRecordId { get; }
    public Guid PatientId { get; }
    public string DiagnosisCode { get; }
    public DiagnosisSeverity Severity { get; }
    public DateTimeOffset OccurredOn { get; }

    public MedicalRecordCreatedDomainEvent(
        Guid medicalRecordId,
        Guid patientId,
        string diagnosisCode,
        DiagnosisSeverity severity)
    {
        MedicalRecordId = medicalRecordId;
        PatientId = patientId;
        DiagnosisCode = diagnosisCode;
        Severity = severity;
        OccurredOn = DateTimeOffset.UtcNow;
    }
}

/// <summary>
/// Domain event raised when a prescription is added to a medical record.
/// </summary>
public sealed class PrescriptionAddedDomainEvent : IDomainEvent
{
    public Guid MedicalRecordId { get; }
    public Guid PatientId { get; }
    public Guid PrescriptionId { get; }
    public string MedicationName { get; }
    public DateTimeOffset OccurredOn { get; }

    public PrescriptionAddedDomainEvent(
        Guid medicalRecordId,
        Guid patientId,
        Guid prescriptionId,
        string medicationName)
    {
        MedicalRecordId = medicalRecordId;
        PatientId = patientId;
        PrescriptionId = prescriptionId;
        MedicationName = medicationName;
        OccurredOn = DateTimeOffset.UtcNow;
    }
}
