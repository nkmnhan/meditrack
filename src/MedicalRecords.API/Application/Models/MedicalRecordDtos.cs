using MediTrack.MedicalRecords.Domain.Aggregates;

namespace MediTrack.MedicalRecords.API.Application.Models;

#region Request DTOs

/// <summary>
/// Request for creating a new medical record.
/// </summary>
public sealed record CreateMedicalRecordRequest(
    Guid PatientId,
    string ChiefComplaint,
    string DiagnosisCode,
    string DiagnosisDescription,
    DiagnosisSeverity Severity,
    Guid RecordedByDoctorId,
    string RecordedByDoctorName,
    Guid? AppointmentId = null);

/// <summary>
/// Request for updating diagnosis information.
/// </summary>
public sealed record UpdateDiagnosisRequest(
    string DiagnosisCode,
    string DiagnosisDescription,
    DiagnosisSeverity Severity);

/// <summary>
/// Request for adding a clinical note.
/// </summary>
public sealed record AddClinicalNoteRequest(
    string NoteType,
    string Content,
    Guid AuthorId,
    string AuthorName);

/// <summary>
/// Request for adding a prescription.
/// </summary>
public sealed record AddPrescriptionRequest(
    string MedicationName,
    string Dosage,
    string Frequency,
    int DurationDays,
    string? Instructions,
    Guid PrescribedById,
    string PrescribedByName);

/// <summary>
/// Request for recording vital signs.
/// </summary>
public sealed record RecordVitalSignsRequest(
    decimal? BloodPressureSystolic,
    decimal? BloodPressureDiastolic,
    decimal? HeartRate,
    decimal? Temperature,
    decimal? RespiratoryRate,
    decimal? OxygenSaturation,
    decimal? Weight,
    decimal? Height,
    Guid RecordedById,
    string RecordedByName);

/// <summary>
/// Request for adding an attachment.
/// </summary>
public sealed record AddAttachmentRequest(
    string FileName,
    string ContentType,
    long FileSizeBytes,
    string StorageUrl,
    string? Description,
    Guid UploadedById,
    string UploadedByName);

#endregion

#region Response DTOs

/// <summary>
/// Full medical record response.
/// </summary>
public sealed record MedicalRecordResponse(
    Guid Id,
    Guid PatientId,
    string ChiefComplaint,
    string DiagnosisCode,
    string DiagnosisDescription,
    string Severity,
    string Status,
    Guid RecordedByDoctorId,
    string RecordedByDoctorName,
    Guid? AppointmentId,
    DateTimeOffset RecordedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<ClinicalNoteResponse> ClinicalNotes,
    IReadOnlyList<PrescriptionResponse> Prescriptions,
    IReadOnlyList<VitalSignsResponse> VitalSigns,
    IReadOnlyList<AttachmentResponse> Attachments);

/// <summary>
/// Simplified medical record for list views.
/// </summary>
public sealed record MedicalRecordListItemResponse(
    Guid Id,
    Guid PatientId,
    string ChiefComplaint,
    string DiagnosisCode,
    string DiagnosisDescription,
    string Severity,
    string Status,
    string RecordedByDoctorName,
    DateTimeOffset RecordedAt);

/// <summary>
/// Clinical note response.
/// </summary>
public sealed record ClinicalNoteResponse(
    Guid Id,
    string NoteType,
    string Content,
    Guid AuthorId,
    string AuthorName,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

/// <summary>
/// Prescription response.
/// </summary>
public sealed record PrescriptionResponse(
    Guid Id,
    string MedicationName,
    string Dosage,
    string Frequency,
    int DurationDays,
    string? Instructions,
    string Status,
    Guid PrescribedById,
    string PrescribedByName,
    DateTimeOffset PrescribedAt,
    DateTimeOffset? FilledAt,
    DateTimeOffset ExpiresAt);

/// <summary>
/// Vital signs response.
/// </summary>
public sealed record VitalSignsResponse(
    Guid Id,
    decimal? BloodPressureSystolic,
    decimal? BloodPressureDiastolic,
    string? BloodPressureFormatted,
    decimal? HeartRate,
    decimal? Temperature,
    decimal? RespiratoryRate,
    decimal? OxygenSaturation,
    decimal? Weight,
    decimal? Height,
    decimal? Bmi,
    Guid RecordedById,
    string RecordedByName,
    DateTimeOffset RecordedAt);

/// <summary>
/// Attachment response.
/// </summary>
public sealed record AttachmentResponse(
    Guid Id,
    string FileName,
    string ContentType,
    long FileSizeBytes,
    string FileSizeFormatted,
    string StorageUrl,
    string? Description,
    Guid UploadedById,
    string UploadedByName,
    DateTimeOffset UploadedAt);

/// <summary>
/// Dashboard stats for medical records.
/// </summary>
public sealed record MedicalRecordStatsResponse(
    int PendingCount,
    int UrgentCount);

#endregion
