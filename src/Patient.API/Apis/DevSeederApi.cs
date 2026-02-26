using Microsoft.AspNetCore.Mvc;
using Patient.API.Services;

namespace Patient.API.Apis;

/// <summary>
/// Development-only endpoints for seeding test data.
/// These endpoints are only available in Development environment.
/// </summary>
public static class DevSeederApi
{
    public static IEndpointRouteBuilder MapDevSeederApi(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/dev/seed")
            .WithTags("Development - Data Seeding");

        group.MapPost("/patients", SeedPatients)
            .WithName("SeedPatientsData")
            .WithSummary("Generate realistic patient test data")
            .WithDescription(
                "Creates realistic patient records for testing using Bogus library. " +
                "This endpoint is only available in Development environment.")
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest);

        group.MapGet("/patient-summary", GetPatientSummary)
            .WithName("GetPatientSummary")
            .WithSummary("Get patient IDs and names for cross-service seeding")
            .WithDescription(
                "Returns a lightweight list of all patients (id, firstName, lastName, email) " +
                "for use by Appointment and MedicalRecords seeders.")
            .Produces(StatusCodes.Status200OK);

        return endpoints;
    }

    private static async Task<IResult> SeedPatients(
        PatientSeeder seeder,
        ILogger<Program> logger,
        CancellationToken cancellationToken,
        [FromQuery] int count = 50,
        [FromQuery] bool clearExisting = false)
    {
        if (count is < 1 or > 1000)
        {
            return Results.BadRequest(new
            {
                error = "Invalid count",
                message = "Count must be between 1 and 1000"
            });
        }

        logger.LogInformation(
            "Seeding {Count} patients (clearExisting: {ClearExisting})",
            count,
            clearExisting);

        try
        {
            var (createdCount, failedCount) = await seeder.SeedPatientsAsync(count, clearExisting, cancellationToken);

            if (createdCount == 0 && failedCount > 0)
            {
                return Results.Problem(
                    title: "Seeding Failed",
                    detail: $"All {failedCount} patients failed to create. Check service logs for details.",
                    statusCode: StatusCodes.Status500InternalServerError);
            }

            return Results.Ok(new
            {
                message = failedCount > 0
                    ? $"Seeding completed with errors: {createdCount} created, {failedCount} failed"
                    : "Patient data seeding completed successfully",
                requested = count,
                created = createdCount,
                failed = failedCount,
                clearExisting
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error seeding patient data");
            return Results.Problem(
                title: "Seeding Failed",
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Returns a lightweight patient summary for cross-service seeders.
    /// Shape matches the PatientSummary record used by Appointment.API and MedicalRecords.API.
    /// </summary>
    private static async Task<IResult> GetPatientSummary(
        IPatientService patientService,
        CancellationToken cancellationToken)
    {
        var patients = await patientService.GetAllAsync(includeInactive: true, cancellationToken);

        var summaries = patients.Select(patient =>
        {
            var nameParts = patient.FullName.Split(' ', 2);
            var firstName = nameParts[0];
            var lastName = nameParts.Length > 1 ? nameParts[1] : "";

            return new
            {
                id = patient.Id,
                firstName,
                lastName,
                email = patient.Email,
            };
        });

        return Results.Ok(summaries);
    }
}
