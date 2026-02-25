using System.Security.Claims;
using FluentValidation;
using MediatR;
using MediTrack.MedicalRecords.API.Application.Commands;
using MediTrack.MedicalRecords.API.Application.Models;
using MediTrack.MedicalRecords.API.Application.Queries;
using MediTrack.MedicalRecords.API.Application.Services;
using MediTrack.Shared.Common;

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
        ClaimsPrincipal user,
        IMediator mediator,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this medical record
        if (!await CanAccessMedicalRecordAsync(user, id, mediator, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        var record = await mediator.Send(new GetMedicalRecordByIdQuery(id), cancellationToken);

        return record is null
            ? Results.NotFound(new { message = $"Medical record with ID {id} not found." })
            : Results.Ok(record);
    }

    private static async Task<IResult> GetByPatientId(
        Guid patientId,
        ClaimsPrincipal user,
        IMediator mediator,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this patient's records
        if (!await CanAccessPatientRecordsAsync(user, patientId, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        var records = await mediator.Send(
            new GetMedicalRecordsByPatientIdQuery(patientId),
            cancellationToken);

        return Results.Ok(records);
    }

    private static async Task<IResult> GetByDiagnosisCode(
        string diagnosisCode,
        ClaimsPrincipal user,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        // IDOR protection: Only medical staff can query by diagnosis code (clinical reporting endpoint) (A01)
        if (!UserRoles.Medical.Any(role => user.IsInRole(role)))
        {
            return Results.Forbid();
        }

        var records = await mediator.Send(
            new GetMedicalRecordsByDiagnosisCodeQuery(diagnosisCode),
            cancellationToken);

        return Results.Ok(records);
    }

    private static async Task<IResult> CreateMedicalRecord(
        CreateMedicalRecordRequest request,
        ClaimsPrincipal user,
        IValidator<CreateMedicalRecordRequest> validator,
        IMediator mediator,
        CancellationToken cancellationToken)
    {
        // IDOR protection: Only medical staff can create medical records (A01)
        if (!UserRoles.Medical.Any(role => user.IsInRole(role)))
        {
            return Results.Forbid();
        }

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
        ClaimsPrincipal user,
        IValidator<UpdateDiagnosisRequest> validator,
        IMediator mediator,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this medical record
        if (!await CanAccessMedicalRecordAsync(user, id, mediator, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

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
        ClaimsPrincipal user,
        IMediator mediator,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this medical record
        if (!await CanAccessMedicalRecordAsync(user, id, mediator, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

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
        ClaimsPrincipal user,
        IMediator mediator,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this medical record
        if (!await CanAccessMedicalRecordAsync(user, id, mediator, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        var success = await mediator.Send(new MarkRequiresFollowUpCommand(id), cancellationToken);

        return success
            ? Results.NoContent()
            : Results.NotFound(new { message = $"Medical record with ID {id} not found." });
    }

    private static async Task<IResult> ArchiveMedicalRecord(
        Guid id,
        ClaimsPrincipal user,
        IMediator mediator,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this medical record
        if (!await CanAccessMedicalRecordAsync(user, id, mediator, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

        var success = await mediator.Send(new ArchiveMedicalRecordCommand(id), cancellationToken);

        return success
            ? Results.NoContent()
            : Results.NotFound(new { message = $"Medical record with ID {id} not found." });
    }

    private static async Task<IResult> AddClinicalNote(
        Guid id,
        AddClinicalNoteRequest request,
        ClaimsPrincipal user,
        IValidator<AddClinicalNoteRequest> validator,
        IMediator mediator,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this medical record
        if (!await CanAccessMedicalRecordAsync(user, id, mediator, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

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
        ClaimsPrincipal user,
        IValidator<AddPrescriptionRequest> validator,
        IMediator mediator,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this medical record
        if (!await CanAccessMedicalRecordAsync(user, id, mediator, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

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
        ClaimsPrincipal user,
        IValidator<RecordVitalSignsRequest> validator,
        IMediator mediator,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this medical record
        if (!await CanAccessMedicalRecordAsync(user, id, mediator, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

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
        ClaimsPrincipal user,
        IValidator<AddAttachmentRequest> validator,
        IMediator mediator,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // IDOR protection: check if user can access this medical record
        if (!await CanAccessMedicalRecordAsync(user, id, mediator, patientResolver, cancellationToken))
        {
            return Results.Forbid();
        }

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

    /// <summary>
    /// Checks if the current user can access a specific medical record.
    /// Medical staff (Admin, Doctor, Nurse) can access all records.
    /// Patients can only access their own records.
    /// (OWASP A01 - Broken Access Control: IDOR Prevention)
    /// </summary>
    private static async Task<bool> CanAccessMedicalRecordAsync(
        ClaimsPrincipal user,
        Guid medicalRecordId,
        IMediator mediator,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // Medical staff can access all records
        if (UserRoles.Medical.Any(role => user.IsInRole(role)))
        {
            return true;
        }

        // Patients can only access their own records
        if (user.IsInRole(UserRoles.Patient))
        {
            var userIdClaim = user.FindFirst(JwtClaims.Subject)?.Value;
            if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return false;
            }

            // Get the patient's PatientId from Patient.API
            var patientId = await patientResolver.GetPatientIdByUserIdAsync(userId, cancellationToken);
            if (patientId is null)
            {
                return false;
            }

            // Get the medical record and check if it belongs to this patient
            var record = await mediator.Send(new GetMedicalRecordByIdQuery(medicalRecordId), cancellationToken);
            if (record is null)
            {
                return false; // Not found
            }

            return record.PatientId == patientId.Value;
        }

        // Unknown role — deny access
        return false;
    }

    /// <summary>
    /// Checks if the current user can access medical records for a specific patient.
    /// Medical staff can access all patients' records.
    /// Patients can only access their own records.
    /// (OWASP A01 - Broken Access Control: IDOR Prevention)
    /// </summary>
    private static async Task<bool> CanAccessPatientRecordsAsync(
        ClaimsPrincipal user,
        Guid patientId,
        IPatientResolver patientResolver,
        CancellationToken cancellationToken)
    {
        // Medical staff can access all records
        if (UserRoles.Medical.Any(role => user.IsInRole(role)))
        {
            return true;
        }

        // Patients can only access their own records
        if (user.IsInRole(UserRoles.Patient))
        {
            var userIdClaim = user.FindFirst(JwtClaims.Subject)?.Value;
            if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return false;
            }

            // Get the patient's PatientId from Patient.API
            var resolvedPatientId = await patientResolver.GetPatientIdByUserIdAsync(userId, cancellationToken);
            if (resolvedPatientId is null)
            {
                return false;
            }

            return resolvedPatientId.Value == patientId;
        }

        // Unknown role — deny access
        return false;
    }
}
