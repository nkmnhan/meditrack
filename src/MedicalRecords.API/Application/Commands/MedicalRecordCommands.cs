using MediatR;
using MediTrack.MedicalRecords.API.Application.Models;
using MediTrack.MedicalRecords.Domain.Aggregates;

namespace MediTrack.MedicalRecords.API.Application.Commands;

/// <summary>
/// Command to create a new medical record.
/// </summary>
public sealed record CreateMedicalRecordCommand(
    Guid PatientId,
    string ChiefComplaint,
    string DiagnosisCode,
    string DiagnosisDescription,
    DiagnosisSeverity Severity,
    Guid RecordedByDoctorId,
    string RecordedByDoctorName,
    Guid? AppointmentId = null) : IRequest<MedicalRecordResponse>;

/// <summary>
/// Command to update the diagnosis of a medical record.
/// </summary>
public sealed record UpdateDiagnosisCommand(
    Guid MedicalRecordId,
    string DiagnosisCode,
    string DiagnosisDescription,
    DiagnosisSeverity Severity) : IRequest<MedicalRecordResponse?>;

/// <summary>
/// Command to add a clinical note to a medical record.
/// </summary>
public sealed record AddClinicalNoteCommand(
    Guid MedicalRecordId,
    string NoteType,
    string Content,
    Guid AuthorId,
    string AuthorName) : IRequest<ClinicalNoteResponse?>;

/// <summary>
/// Command to add a prescription to a medical record.
/// </summary>
public sealed record AddPrescriptionCommand(
    Guid MedicalRecordId,
    string MedicationName,
    string Dosage,
    string Frequency,
    int DurationDays,
    string? Instructions,
    Guid PrescribedById,
    string PrescribedByName) : IRequest<PrescriptionResponse?>;

/// <summary>
/// Command to record vital signs.
/// </summary>
public sealed record RecordVitalSignsCommand(
    Guid MedicalRecordId,
    decimal? BloodPressureSystolic,
    decimal? BloodPressureDiastolic,
    decimal? HeartRate,
    decimal? Temperature,
    decimal? RespiratoryRate,
    decimal? OxygenSaturation,
    decimal? Weight,
    decimal? Height,
    Guid RecordedById,
    string RecordedByName) : IRequest<VitalSignsResponse?>;

/// <summary>
/// Command to add an attachment to a medical record.
/// </summary>
public sealed record AddAttachmentCommand(
    Guid MedicalRecordId,
    string FileName,
    string ContentType,
    long FileSizeBytes,
    string StorageUrl,
    string? Description,
    Guid UploadedById,
    string UploadedByName) : IRequest<AttachmentResponse?>;

/// <summary>
/// Command to resolve a medical record.
/// </summary>
public sealed record ResolveMedicalRecordCommand(Guid MedicalRecordId) : IRequest<bool>;

/// <summary>
/// Command to mark a medical record as requiring follow-up.
/// </summary>
public sealed record MarkRequiresFollowUpCommand(Guid MedicalRecordId) : IRequest<bool>;

/// <summary>
/// Command to archive a medical record.
/// </summary>
public sealed record ArchiveMedicalRecordCommand(Guid MedicalRecordId) : IRequest<bool>;
