using MediTrack.MedicalRecords.Domain.Events;
using MediTrack.MedicalRecords.Domain.SeedWork;

namespace MediTrack.MedicalRecords.Domain.Aggregates;

/// <summary>
/// Medical record aggregate root containing patient clinical information.
/// </summary>
public sealed class MedicalRecord : Entity, IAggregateRoot
{
    private readonly List<ClinicalNote> _clinicalNotes = [];
    private readonly List<Prescription> _prescriptions = [];
    private readonly List<VitalSigns> _vitalSigns = [];
    private readonly List<Attachment> _attachments = [];

    /// <summary>
    /// Reference to the patient. Links to Patient.API.
    /// </summary>
    public Guid PatientId { get; private set; }

    /// <summary>
    /// ICD-10 diagnosis code.
    /// </summary>
    public string DiagnosisCode { get; private set; } = string.Empty;

    /// <summary>
    /// Human-readable diagnosis description.
    /// </summary>
    public string DiagnosisDescription { get; private set; } = string.Empty;

    /// <summary>
    /// Severity of the diagnosis.
    /// </summary>
    public DiagnosisSeverity Severity { get; private set; }

    /// <summary>
    /// Current status of the medical record.
    /// </summary>
    public RecordStatus Status { get; private set; }

    /// <summary>
    /// Chief complaint or reason for visit.
    /// </summary>
    public string ChiefComplaint { get; private set; } = string.Empty;

    /// <summary>
    /// ID of the provider who created the record.
    /// </summary>
    public Guid RecordedByDoctorId { get; private set; }

    /// <summary>
    /// Name of the provider who created the record (denormalized).
    /// </summary>
    public string RecordedByDoctorName { get; private set; } = string.Empty;

    /// <summary>
    /// Reference to the appointment if this record was created during one.
    /// </summary>
    public Guid? AppointmentId { get; private set; }

    /// <summary>
    /// When the record was created.
    /// </summary>
    public DateTimeOffset RecordedAt { get; private set; }

    /// <summary>
    /// When the record was last updated.
    /// </summary>
    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>
    /// Clinical notes associated with this record.
    /// </summary>
    public IReadOnlyCollection<ClinicalNote> ClinicalNotes => _clinicalNotes.AsReadOnly();

    /// <summary>
    /// Prescriptions issued as part of this record.
    /// </summary>
    public IReadOnlyCollection<Prescription> Prescriptions => _prescriptions.AsReadOnly();

    /// <summary>
    /// Vital signs recorded during the visit.
    /// </summary>
    public IReadOnlyCollection<VitalSigns> VitalSigns => _vitalSigns.AsReadOnly();

    /// <summary>
    /// Attachments (images, documents) linked to this record.
    /// </summary>
    public IReadOnlyCollection<Attachment> Attachments => _attachments.AsReadOnly();

    /// <summary>
    /// EF Core constructor.
    /// </summary>
    private MedicalRecord()
    {
    }

    /// <summary>
    /// Creates a new medical record.
    /// </summary>
    public static MedicalRecord Create(
        Guid patientId,
        string chiefComplaint,
        string diagnosisCode,
        string diagnosisDescription,
        DiagnosisSeverity severity,
        Guid recordedByDoctorId,
        string recordedByDoctorName,
        Guid? appointmentId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(chiefComplaint);
        ArgumentException.ThrowIfNullOrWhiteSpace(diagnosisCode);
        ArgumentException.ThrowIfNullOrWhiteSpace(diagnosisDescription);
        ArgumentException.ThrowIfNullOrWhiteSpace(recordedByDoctorName);

        var record = new MedicalRecord
        {
            Id = Guid.NewGuid(),
            PatientId = patientId,
            ChiefComplaint = chiefComplaint,
            DiagnosisCode = diagnosisCode,
            DiagnosisDescription = diagnosisDescription,
            Severity = severity,
            Status = RecordStatus.Active,
            RecordedByDoctorId = recordedByDoctorId,
            RecordedByDoctorName = recordedByDoctorName,
            AppointmentId = appointmentId,
            RecordedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        // Raise domain event
        record.AddDomainEvent(new MedicalRecordCreatedDomainEvent(
            record.Id,
            record.PatientId,
            record.DiagnosisCode,
            record.Severity));

        return record;
    }

    /// <summary>
    /// Updates the diagnosis information.
    /// </summary>
    public void UpdateDiagnosis(
        string diagnosisCode,
        string diagnosisDescription,
        DiagnosisSeverity severity)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(diagnosisCode);
        ArgumentException.ThrowIfNullOrWhiteSpace(diagnosisDescription);

        DiagnosisCode = diagnosisCode;
        DiagnosisDescription = diagnosisDescription;
        Severity = severity;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    /// <summary>
    /// Adds a clinical note to this record.
    /// </summary>
    public ClinicalNote AddClinicalNote(
        string noteType,
        string content,
        Guid authorId,
        string authorName)
    {
        var note = ClinicalNote.Create(Id, noteType, content, authorId, authorName);
        _clinicalNotes.Add(note);
        UpdatedAt = DateTimeOffset.UtcNow;
        return note;
    }

    /// <summary>
    /// Adds a prescription to this record.
    /// </summary>
    public Prescription AddPrescription(
        string medicationName,
        string dosage,
        string frequency,
        int durationDays,
        string? instructions,
        Guid prescribedById,
        string prescribedByName)
    {
        var prescription = Prescription.Create(
            Id,
            medicationName,
            dosage,
            frequency,
            durationDays,
            instructions,
            prescribedById,
            prescribedByName);

        _prescriptions.Add(prescription);
        UpdatedAt = DateTimeOffset.UtcNow;

        // Raise domain event for prescription tracking
        AddDomainEvent(new PrescriptionAddedDomainEvent(
            Id,
            PatientId,
            prescription.Id,
            medicationName));

        return prescription;
    }

    /// <summary>
    /// Records vital signs.
    /// </summary>
    public VitalSigns RecordVitalSigns(
        decimal? bloodPressureSystolic,
        decimal? bloodPressureDiastolic,
        decimal? heartRate,
        decimal? temperature,
        decimal? respiratoryRate,
        decimal? oxygenSaturation,
        decimal? weight,
        decimal? height,
        Guid recordedById,
        string recordedByName)
    {
        var vitals = new VitalSigns(
            Id,
            bloodPressureSystolic,
            bloodPressureDiastolic,
            heartRate,
            temperature,
            respiratoryRate,
            oxygenSaturation,
            weight,
            height,
            recordedById,
            recordedByName);

        _vitalSigns.Add(vitals);
        UpdatedAt = DateTimeOffset.UtcNow;
        return vitals;
    }

    /// <summary>
    /// Adds an attachment to this record.
    /// </summary>
    public Attachment AddAttachment(
        string fileName,
        string contentType,
        long fileSizeBytes,
        string storageUrl,
        string? description,
        Guid uploadedById,
        string uploadedByName)
    {
        var attachment = Attachment.Create(
            Id,
            fileName,
            contentType,
            fileSizeBytes,
            storageUrl,
            description,
            uploadedById,
            uploadedByName);

        _attachments.Add(attachment);
        UpdatedAt = DateTimeOffset.UtcNow;
        return attachment;
    }

    /// <summary>
    /// Marks the record as resolved/closed.
    /// </summary>
    public void Resolve()
    {
        if (Status == RecordStatus.Resolved)
        {
            throw new InvalidOperationException("Record is already resolved.");
        }

        Status = RecordStatus.Resolved;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    /// <summary>
    /// Marks the record as requiring follow-up.
    /// </summary>
    public void MarkRequiresFollowUp()
    {
        if (Status == RecordStatus.Archived)
            throw new InvalidOperationException("Cannot modify an archived medical record.");

        Status = RecordStatus.RequiresFollowUp;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    /// <summary>
    /// Archives the record (soft delete).
    /// </summary>
    public void Archive()
    {
        if (Status == RecordStatus.Archived)
            throw new InvalidOperationException("Record is already archived.");

        Status = RecordStatus.Archived;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}

/// <summary>
/// Severity levels for a diagnosis.
/// </summary>
public enum DiagnosisSeverity
{
    Mild = 0,
    Moderate = 1,
    Severe = 2,
    Critical = 3
}

/// <summary>
/// Status of a medical record.
/// </summary>
public enum RecordStatus
{
    Active = 0,
    RequiresFollowUp = 1,
    Resolved = 2,
    Archived = 3
}
