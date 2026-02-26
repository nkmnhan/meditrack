using MediTrack.MedicalRecords.API.Application.Services;
using MediTrack.MedicalRecords.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediTrack.MedicalRecords.API.Apis;

/// <summary>
/// Development-only endpoints for seeding medical records test data.
/// These endpoints are only available in Development environment.
/// </summary>
public static class DevSeederApi
{
    public static IEndpointRouteBuilder MapDevSeederApi(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/dev/seed")
            .WithTags("Development - Data Seeding");

        group.MapPost("/medical-records", SeedMedicalRecords)
            .WithName("SeedMedicalRecordsData")
            .WithSummary("Generate realistic medical records test data")
            .WithDescription(
                "Creates realistic medical record data for testing using Bogus library. " +
                "Requires existing patients in the Patient.API database. " +
                "This endpoint is only available in Development environment.")
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest);

        return endpoints;
    }

    private static async Task<IResult> SeedMedicalRecords(
        MedicalRecordSeeder seeder,
        MedicalRecordsDbContext dbContext,
        IPatientResolver patientResolver,
        ILogger<Program> logger,
        CancellationToken cancellationToken,
        [FromQuery] int recordsPerPatient = 3,
        [FromQuery] bool clearExisting = false,
        [FromQuery] string? patientIds = null)
    {
        if (recordsPerPatient is < 1 or > 20)
        {
            return Results.BadRequest(new
            {
                error = "Invalid recordsPerPatient",
                message = "recordsPerPatient must be between 1 and 20"
            });
        }

        // Use provided patient IDs or query existing records for known patient IDs
        List<Guid> resolvedPatientIds;

        if (!string.IsNullOrWhiteSpace(patientIds))
        {
            resolvedPatientIds = patientIds
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(id => Guid.TryParse(id, out var guid) ? guid : Guid.Empty)
                .Where(id => id != Guid.Empty)
                .ToList();

            if (resolvedPatientIds.Count == 0)
            {
                return Results.BadRequest(new
                {
                    error = "Invalid patientIds",
                    message = "No valid GUIDs found in patientIds parameter"
                });
            }
        }
        else
        {
            // Use well-known dev patient IDs — these match the Patient.API seeder output
            // If no patients exist yet, seed patients first via Patient.API /api/dev/seed/patients
            resolvedPatientIds = await dbContext.MedicalRecords
                .Select(record => record.PatientId)
                .Distinct()
                .ToListAsync(cancellationToken);

            if (resolvedPatientIds.Count == 0)
            {
                // Fallback: generate some deterministic patient IDs for standalone seeding
                resolvedPatientIds =
                [
                    Guid.Parse("11111111-1111-1111-1111-111111111111"),
                    Guid.Parse("22222222-2222-2222-2222-222222222222"),
                    Guid.Parse("33333333-3333-3333-3333-333333333333"),
                    Guid.Parse("44444444-4444-4444-4444-444444444444"),
                    Guid.Parse("55555555-5555-5555-5555-555555555555"),
                ];
            }
        }

        logger.LogInformation(
            "Seeding medical records: {RecordsPerPatient} per patient, {PatientCount} patients (clearExisting: {ClearExisting})",
            recordsPerPatient, resolvedPatientIds.Count, clearExisting);

        try
        {
            var (createdCount, failedCount) = await seeder.SeedMedicalRecordsAsync(
                resolvedPatientIds, recordsPerPatient, clearExisting, cancellationToken);

            if (createdCount == 0 && failedCount > 0)
            {
                return Results.Problem(
                    title: "Seeding Failed",
                    detail: $"All {failedCount} records failed to create. Check service logs for details.",
                    statusCode: StatusCodes.Status500InternalServerError);
            }

            return Results.Ok(new
            {
                message = failedCount > 0
                    ? $"Seeding completed with errors: {createdCount} created, {failedCount} failed"
                    : "Medical records seeding completed successfully",
                patientCount = resolvedPatientIds.Count,
                recordsPerPatient,
                created = createdCount,
                failed = failedCount,
                clearExisting
            });
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Error seeding medical records");
            return Results.Problem(
                title: "Seeding Failed",
                detail: exception.Message,
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}
