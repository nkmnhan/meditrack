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
}
