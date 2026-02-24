using MediTrack.MedicalRecords.API.Application.Models;
using MediTrack.MedicalRecords.Domain.Aggregates;
using FluentValidation;

namespace MediTrack.MedicalRecords.API.Application.Validations;

/// <summary>
/// Validator for CreateMedicalRecordRequest.
/// </summary>
public sealed class CreateMedicalRecordRequestValidator : AbstractValidator<CreateMedicalRecordRequest>
{
    public CreateMedicalRecordRequestValidator()
    {
        RuleFor(request => request.PatientId)
            .NotEmpty()
            .WithMessage("Patient ID is required.");

        RuleFor(request => request.ChiefComplaint)
            .NotEmpty()
            .WithMessage("Chief complaint is required.")
            .MaximumLength(500)
            .WithMessage("Chief complaint cannot exceed 500 characters.");

        RuleFor(request => request.DiagnosisCode)
            .NotEmpty()
            .WithMessage("Diagnosis code is required.")
            .MaximumLength(20)
            .WithMessage("Diagnosis code cannot exceed 20 characters.");

        RuleFor(request => request.DiagnosisDescription)
            .NotEmpty()
            .WithMessage("Diagnosis description is required.")
            .MaximumLength(1000)
            .WithMessage("Diagnosis description cannot exceed 1000 characters.");

        RuleFor(request => request.Severity)
            .IsInEnum()
            .WithMessage("Invalid severity level.");

        RuleFor(request => request.RecordedByDoctorId)
            .NotEmpty()
            .WithMessage("Recording doctor ID is required.");

        RuleFor(request => request.RecordedByDoctorName)
            .NotEmpty()
            .WithMessage("Recording doctor name is required.")
            .MaximumLength(200)
            .WithMessage("Doctor name cannot exceed 200 characters.");
    }
}

/// <summary>
/// Validator for UpdateDiagnosisRequest.
/// </summary>
public sealed class UpdateDiagnosisRequestValidator : AbstractValidator<UpdateDiagnosisRequest>
{
    public UpdateDiagnosisRequestValidator()
    {
        RuleFor(request => request.DiagnosisCode)
            .NotEmpty()
            .WithMessage("Diagnosis code is required.")
            .MaximumLength(20)
            .WithMessage("Diagnosis code cannot exceed 20 characters.");

        RuleFor(request => request.DiagnosisDescription)
            .NotEmpty()
            .WithMessage("Diagnosis description is required.")
            .MaximumLength(1000)
            .WithMessage("Diagnosis description cannot exceed 1000 characters.");

        RuleFor(request => request.Severity)
            .IsInEnum()
            .WithMessage("Invalid severity level.");
    }
}

/// <summary>
/// Validator for AddClinicalNoteRequest.
/// </summary>
public sealed class AddClinicalNoteRequestValidator : AbstractValidator<AddClinicalNoteRequest>
{
    public AddClinicalNoteRequestValidator()
    {
        RuleFor(request => request.NoteType)
            .NotEmpty()
            .WithMessage("Note type is required.")
            .MaximumLength(50)
            .WithMessage("Note type cannot exceed 50 characters.")
            .Must(type => ClinicalNoteTypes.AllValid.Contains(type))
            .WithMessage($"Note type must be one of: {string.Join(", ", ClinicalNoteTypes.AllValid)}");

        RuleFor(request => request.Content)
            .NotEmpty()
            .WithMessage("Note content is required.")
            .MaximumLength(10000)
            .WithMessage("Note content cannot exceed 10000 characters.");

        RuleFor(request => request.AuthorId)
            .NotEmpty()
            .WithMessage("Author ID is required.");

        RuleFor(request => request.AuthorName)
            .NotEmpty()
            .WithMessage("Author name is required.")
            .MaximumLength(200)
            .WithMessage("Author name cannot exceed 200 characters.");
    }
}

/// <summary>
/// Validator for AddPrescriptionRequest.
/// </summary>
public sealed class AddPrescriptionRequestValidator : AbstractValidator<AddPrescriptionRequest>
{
    public AddPrescriptionRequestValidator()
    {
        RuleFor(request => request.MedicationName)
            .NotEmpty()
            .WithMessage("Medication name is required.")
            .MaximumLength(200)
            .WithMessage("Medication name cannot exceed 200 characters.");

        RuleFor(request => request.Dosage)
            .NotEmpty()
            .WithMessage("Dosage is required.")
            .MaximumLength(100)
            .WithMessage("Dosage cannot exceed 100 characters.");

        RuleFor(request => request.Frequency)
            .NotEmpty()
            .WithMessage("Frequency is required.")
            .MaximumLength(100)
            .WithMessage("Frequency cannot exceed 100 characters.");

        RuleFor(request => request.DurationDays)
            .GreaterThan(0)
            .WithMessage("Duration must be at least 1 day.")
            .LessThanOrEqualTo(365)
            .WithMessage("Duration cannot exceed 365 days.");

        RuleFor(request => request.Instructions)
            .MaximumLength(1000)
            .WithMessage("Instructions cannot exceed 1000 characters.")
            .When(request => request.Instructions is not null);

        RuleFor(request => request.PrescribedById)
            .NotEmpty()
            .WithMessage("Prescribing provider ID is required.");

        RuleFor(request => request.PrescribedByName)
            .NotEmpty()
            .WithMessage("Prescribing provider name is required.")
            .MaximumLength(200)
            .WithMessage("Provider name cannot exceed 200 characters.");
    }
}

/// <summary>
/// Validator for RecordVitalSignsRequest.
/// </summary>
public sealed class RecordVitalSignsRequestValidator : AbstractValidator<RecordVitalSignsRequest>
{
    public RecordVitalSignsRequestValidator()
    {
        RuleFor(request => request.BloodPressureSystolic)
            .InclusiveBetween(50, 300)
            .WithMessage("Systolic BP must be between 50 and 300 mmHg.")
            .When(request => request.BloodPressureSystolic.HasValue);

        RuleFor(request => request.BloodPressureDiastolic)
            .InclusiveBetween(30, 200)
            .WithMessage("Diastolic BP must be between 30 and 200 mmHg.")
            .When(request => request.BloodPressureDiastolic.HasValue);

        RuleFor(request => request.HeartRate)
            .InclusiveBetween(30, 250)
            .WithMessage("Heart rate must be between 30 and 250 bpm.")
            .When(request => request.HeartRate.HasValue);

        RuleFor(request => request.Temperature)
            .InclusiveBetween(90, 110)
            .WithMessage("Temperature must be between 90°F and 110°F.")
            .When(request => request.Temperature.HasValue);

        RuleFor(request => request.RespiratoryRate)
            .InclusiveBetween(5, 60)
            .WithMessage("Respiratory rate must be between 5 and 60 breaths/min.")
            .When(request => request.RespiratoryRate.HasValue);

        RuleFor(request => request.OxygenSaturation)
            .InclusiveBetween(50, 100)
            .WithMessage("Oxygen saturation must be between 50% and 100%.")
            .When(request => request.OxygenSaturation.HasValue);

        RuleFor(request => request.Weight)
            .InclusiveBetween(1, 1500)
            .WithMessage("Weight must be between 1 and 1500 lbs.")
            .When(request => request.Weight.HasValue);

        RuleFor(request => request.Height)
            .InclusiveBetween(10, 120)
            .WithMessage("Height must be between 10 and 120 inches.")
            .When(request => request.Height.HasValue);

        RuleFor(request => request.RecordedById)
            .NotEmpty()
            .WithMessage("Recorder ID is required.");

        RuleFor(request => request.RecordedByName)
            .NotEmpty()
            .WithMessage("Recorder name is required.")
            .MaximumLength(200)
            .WithMessage("Recorder name cannot exceed 200 characters.");
    }
}

/// <summary>
/// Validator for AddAttachmentRequest.
/// </summary>
public sealed class AddAttachmentRequestValidator : AbstractValidator<AddAttachmentRequest>
{
    private static readonly string[] AllowedContentTypes =
    [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain"
    ];

    private const long MaxFileSizeBytes = 50 * 1024 * 1024; // 50MB

    public AddAttachmentRequestValidator()
    {
        RuleFor(request => request.FileName)
            .NotEmpty()
            .WithMessage("File name is required.")
            .MaximumLength(255)
            .WithMessage("File name cannot exceed 255 characters.");

        RuleFor(request => request.ContentType)
            .NotEmpty()
            .WithMessage("Content type is required.")
            .Must(type => AllowedContentTypes.Contains(type))
            .WithMessage($"Content type must be one of: {string.Join(", ", AllowedContentTypes)}");

        RuleFor(request => request.FileSizeBytes)
            .GreaterThan(0)
            .WithMessage("File size must be positive.")
            .LessThanOrEqualTo(MaxFileSizeBytes)
            .WithMessage($"File size cannot exceed {MaxFileSizeBytes / (1024 * 1024)}MB.");

        RuleFor(request => request.StorageUrl)
            .NotEmpty()
            .WithMessage("Storage URL is required.")
            .MaximumLength(2000)
            .WithMessage("Storage URL cannot exceed 2000 characters.")
            .Must(url => Uri.TryCreate(url, UriKind.Absolute, out _))
            .WithMessage("Storage URL must be a valid URL.");

        RuleFor(request => request.Description)
            .MaximumLength(500)
            .WithMessage("Description cannot exceed 500 characters.")
            .When(request => request.Description is not null);

        RuleFor(request => request.UploadedById)
            .NotEmpty()
            .WithMessage("Uploader ID is required.");

        RuleFor(request => request.UploadedByName)
            .NotEmpty()
            .WithMessage("Uploader name is required.")
            .MaximumLength(200)
            .WithMessage("Uploader name cannot exceed 200 characters.");
    }
}
