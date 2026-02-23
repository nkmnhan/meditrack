using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Patient.API.Dtos;
using Patient.API.Services;

namespace Patient.API.Apis;

public static class PatientsApi
{
    public static IEndpointRouteBuilder MapPatientsApi(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/patients")
            .WithTags("Patients")
            .RequireAuthorization();

        group.MapGet("/", GetAllPatients)
            .WithName("GetAllPatients")
            .WithSummary("Get all patients")
            .Produces<IReadOnlyList<PatientListItemResponse>>();

        group.MapGet("/{id:guid}", GetPatientById)
            .WithName("GetPatientById")
            .WithSummary("Get a patient by ID")
            .Produces<PatientResponse>()
            .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/search", SearchPatients)
            .WithName("SearchPatients")
            .WithSummary("Search patients by name, email, or phone")
            .Produces<IReadOnlyList<PatientListItemResponse>>();

        group.MapPost("/", CreatePatient)
            .WithName("CreatePatient")
            .WithSummary("Create a new patient")
            .Produces<PatientResponse>(StatusCodes.Status201Created)
            .Produces<ValidationProblemDetails>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}", UpdatePatient)
            .WithName("UpdatePatient")
            .WithSummary("Update an existing patient")
            .Produces<PatientResponse>()
            .Produces<ValidationProblemDetails>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPost("/{id:guid}/deactivate", DeactivatePatient)
            .WithName("DeactivatePatient")
            .WithSummary("Deactivate a patient (soft delete)")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/activate", ActivatePatient)
            .WithName("ActivatePatient")
            .WithSummary("Reactivate a deactivated patient")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound);

        return endpoints;
    }

    private static async Task<IResult> GetAllPatients(
        [FromQuery] bool includeInactive,
        IPatientService patientService,
        CancellationToken cancellationToken)
    {
        var patients = await patientService.GetAllAsync(includeInactive, cancellationToken);
        return Results.Ok(patients);
    }

    private static async Task<IResult> GetPatientById(
        Guid id,
        IPatientService patientService,
        CancellationToken cancellationToken)
    {
        var patient = await patientService.GetByIdAsync(id, cancellationToken);

        return patient is null
            ? Results.NotFound(new { Message = $"Patient with ID {id} not found" })
            : Results.Ok(patient);
    }

    private static async Task<IResult> SearchPatients(
        [FromQuery] string query,
        IPatientService patientService,
        CancellationToken cancellationToken)
    {
        var patients = await patientService.SearchAsync(query, cancellationToken);
        return Results.Ok(patients);
    }

    private static async Task<IResult> CreatePatient(
        CreatePatientRequest request,
        IValidator<CreatePatientRequest> validator,
        IPatientService patientService,
        CancellationToken cancellationToken)
    {
        // Validate request
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        // Check for duplicate email
        if (await patientService.EmailExistsAsync(request.Email, cancellationToken: cancellationToken))
        {
            return Results.Conflict(new { Message = $"A patient with email {request.Email} already exists" });
        }

        var patient = await patientService.CreateAsync(request, cancellationToken);

        return Results.CreatedAtRoute("GetPatientById", new { id = patient.Id }, patient);
    }

    private static async Task<IResult> UpdatePatient(
        Guid id,
        UpdatePatientRequest request,
        IValidator<UpdatePatientRequest> validator,
        IPatientService patientService,
        CancellationToken cancellationToken)
    {
        // Validate request
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        // Check if patient exists
        if (!await patientService.ExistsAsync(id, cancellationToken))
        {
            return Results.NotFound(new { Message = $"Patient with ID {id} not found" });
        }

        // Check for duplicate email (excluding current patient)
        if (await patientService.EmailExistsAsync(request.Email, id, cancellationToken))
        {
            return Results.Conflict(new { Message = $"A patient with email {request.Email} already exists" });
        }

        var patient = await patientService.UpdateAsync(id, request, cancellationToken);

        return Results.Ok(patient);
    }

    private static async Task<IResult> DeactivatePatient(
        Guid id,
        IPatientService patientService,
        CancellationToken cancellationToken)
    {
        var success = await patientService.DeactivateAsync(id, cancellationToken);

        return success
            ? Results.NoContent()
            : Results.NotFound(new { Message = $"Patient with ID {id} not found" });
    }

    private static async Task<IResult> ActivatePatient(
        Guid id,
        IPatientService patientService,
        CancellationToken cancellationToken)
    {
        var success = await patientService.ActivateAsync(id, cancellationToken);

        return success
            ? Results.NoContent()
            : Results.NotFound(new { Message = $"Patient with ID {id} not found" });
    }
}
