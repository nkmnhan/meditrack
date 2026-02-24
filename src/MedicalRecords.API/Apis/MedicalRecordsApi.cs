using FluentValidation;
using MediatR;
using MediTrack.MedicalRecords.API.Application.Commands;
using MediTrack.MedicalRecords.API.Application.Models;
using MediTrack.MedicalRecords.API.Application.Queries;

namespace MediTrack.MedicalRecords.API.Apis;

/// <summary>
/// Minimal API endpoints for medical records management.
/// </summary>
public static class MedicalRecordsApi
{
    /// <summary>
    /// Maps all medical records endpoints.
    /// </summary>
    public static void MapMedicalRecordsApi(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/medical-records")
            .WithTags("Medical Records")
            .RequireAuthorization();

        // Query endpoints
        group.MapGet("/{id:guid}", GetMedicalRecordById)
            .WithName("GetMedicalRecordById")
            .WithSummary("Get a medical record by ID");

        group.MapGet("/patient/{patientId:guid}", GetByPatientId)
            .WithName("GetMedicalRecordsByPatientId")
            .WithSummary("Get all medical records for a patient");

        group.MapGet("/diagnosis/{diagnosisCode}", GetByDiagnosisCode)
            .WithName("GetMedicalRecordsByDiagnosisCode")
            .WithSummary("Get medical records by diagnosis code");

        // Command endpoints - Medical Record
        group.MapPost("/", CreateMedicalRecord)
            .WithName("CreateMedicalRecord")
            .WithSummary("Create a new medical record");

        group.MapPut("/{id:guid}/diagnosis", UpdateDiagnosis)
            .WithName("UpdateDiagnosis")
            .WithSummary("Update diagnosis information");

        group.MapPost("/{id:guid}/resolve", ResolveMedicalRecord)
            .WithName("ResolveMedicalRecord")
            .WithSummary("Mark a medical record as resolved");

        group.MapPost("/{id:guid}/follow-up", MarkRequiresFollowUp)
            .WithName("MarkRequiresFollowUp")
            .WithSummary("Mark a medical record as requiring follow-up");

        group.MapPost("/{id:guid}/archive", ArchiveMedicalRecord)
            .WithName("ArchiveMedicalRecord")
            .WithSummary("Archive a medical record");

        // Command endpoints - Clinical Notes
        group.MapPost("/{id:guid}/notes", AddClinicalNote)
            .WithName("AddClinicalNote")
            .WithSummary("Add a clinical note to a medical record");

        // Command endpoints - Prescriptions
        group.MapPost("/{id:guid}/prescriptions", AddPrescription)
            .WithName("AddPrescription")
            .WithSummary("Add a prescription to a medical record");

        // Command endpoints - Vital Signs
        group.MapPost("/{id:guid}/vitals", RecordVitalSigns)
            .WithName("RecordVitalSigns")
            .WithSummary("Record vital signs for a medical record");

        // Command endpoints - Attachments
        group.MapPost("/{id:guid}/attachments", AddAttachment)
            .WithName("AddAttachment")
            .WithSummary("Add an attachment to a medical record");
    }

    private static async Task<IResult> GetMedicalRecordById(
        Guid id,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var record = await mediator.Send(new GetMedicalRecordByIdQuery(id), cancellationToken);

        return record is null
            ? Results.NotFound(new { message = $"Medical record with ID {id} not found." })
            : Results.Ok(record);
    }

    private static async Task<IResult> GetByPatientId(
        Guid patientId,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var records = await mediator.Send(
            new GetMedicalRecordsByPatientIdQuery(patientId),
            cancellationToken);

        return Results.Ok(records);
    }

    private static async Task<IResult> GetByDiagnosisCode(
        string diagnosisCode,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var records = await mediator.Send(
            new GetMedicalRecordsByDiagnosisCodeQuery(diagnosisCode),
            cancellationToken);

        return Results.Ok(records);
    }

    private static async Task<IResult> CreateMedicalRecord(
        CreateMedicalRecordRequest request,
        IValidator<CreateMedicalRecordRequest> validator,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        var command = new CreateMedicalRecordCommand(
            request.PatientId,
            request.ChiefComplaint,
            request.DiagnosisCode,
            request.DiagnosisDescription,
            request.Severity,
            request.RecordedByDoctorId,
            request.RecordedByDoctorName,
            request.AppointmentId);

        var record = await mediator.Send(command, cancellationToken);

        return Results.CreatedAtRoute("GetMedicalRecordById", new { id = record.Id }, record);
    }

    private static async Task<IResult> UpdateDiagnosis(
        Guid id,
        UpdateDiagnosisRequest request,
        IValidator<UpdateDiagnosisRequest> validator,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        var command = new UpdateDiagnosisCommand(
            id,
            request.DiagnosisCode,
            request.DiagnosisDescription,
            request.Severity);

        var record = await mediator.Send(command, cancellationToken);

        return record is null
            ? Results.NotFound(new { message = $"Medical record with ID {id} not found." })
            : Results.Ok(record);
    }

    private static async Task<IResult> ResolveMedicalRecord(
        Guid id,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        try
        {
            var success = await mediator.Send(new ResolveMedicalRecordCommand(id), cancellationToken);

            return success
                ? Results.NoContent()
                : Results.NotFound(new { message = $"Medical record with ID {id} not found." });
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<IResult> MarkRequiresFollowUp(
        Guid id,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var success = await mediator.Send(new MarkRequiresFollowUpCommand(id), cancellationToken);

        return success
            ? Results.NoContent()
            : Results.NotFound(new { message = $"Medical record with ID {id} not found." });
    }

    private static async Task<IResult> ArchiveMedicalRecord(
        Guid id,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var success = await mediator.Send(new ArchiveMedicalRecordCommand(id), cancellationToken);

        return success
            ? Results.NoContent()
            : Results.NotFound(new { message = $"Medical record with ID {id} not found." });
    }

    private static async Task<IResult> AddClinicalNote(
        Guid id,
        AddClinicalNoteRequest request,
        IValidator<AddClinicalNoteRequest> validator,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        var command = new AddClinicalNoteCommand(
            id,
            request.NoteType,
            request.Content,
            request.AuthorId,
            request.AuthorName);

        var note = await mediator.Send(command, cancellationToken);

        return note is null
            ? Results.NotFound(new { message = $"Medical record with ID {id} not found." })
            : Results.Created($"/api/medical-records/{id}/notes/{note.Id}", note);
    }

    private static async Task<IResult> AddPrescription(
        Guid id,
        AddPrescriptionRequest request,
        IValidator<AddPrescriptionRequest> validator,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        var command = new AddPrescriptionCommand(
            id,
            request.MedicationName,
            request.Dosage,
            request.Frequency,
            request.DurationDays,
            request.Instructions,
            request.PrescribedById,
            request.PrescribedByName);

        var prescription = await mediator.Send(command, cancellationToken);

        return prescription is null
            ? Results.NotFound(new { message = $"Medical record with ID {id} not found." })
            : Results.Created($"/api/medical-records/{id}/prescriptions/{prescription.Id}", prescription);
    }

    private static async Task<IResult> RecordVitalSigns(
        Guid id,
        RecordVitalSignsRequest request,
        IValidator<RecordVitalSignsRequest> validator,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        var command = new RecordVitalSignsCommand(
            id,
            request.BloodPressureSystolic,
            request.BloodPressureDiastolic,
            request.HeartRate,
            request.Temperature,
            request.RespiratoryRate,
            request.OxygenSaturation,
            request.Weight,
            request.Height,
            request.RecordedById,
            request.RecordedByName);

        var vitals = await mediator.Send(command, cancellationToken);

        return vitals is null
            ? Results.NotFound(new { message = $"Medical record with ID {id} not found." })
            : Results.Created($"/api/medical-records/{id}/vitals/{vitals.Id}", vitals);
    }

    private static async Task<IResult> AddAttachment(
        Guid id,
        AddAttachmentRequest request,
        IValidator<AddAttachmentRequest> validator,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        var command = new AddAttachmentCommand(
            id,
            request.FileName,
            request.ContentType,
            request.FileSizeBytes,
            request.StorageUrl,
            request.Description,
            request.UploadedById,
            request.UploadedByName);

        var attachment = await mediator.Send(command, cancellationToken);

        return attachment is null
            ? Results.NotFound(new { message = $"Medical record with ID {id} not found." })
            : Results.Created($"/api/medical-records/{id}/attachments/{attachment.Id}", attachment);
    }
}
