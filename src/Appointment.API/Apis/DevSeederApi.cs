using System.Net.Http.Json;
using Appointment.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace Appointment.API.Apis;

/// <summary>
/// Development-only endpoints for seeding appointment test data.
/// These endpoints are only available in Development environment.
/// </summary>
public static class DevSeederApi
{
    public static IEndpointRouteBuilder MapDevSeederApi(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/dev/seed")
            .WithTags("Development - Data Seeding");

        group.MapPost("/appointments", SeedAppointments)
            .WithName("SeedAppointmentsData")
            .WithSummary("Generate realistic appointment test data")
            .WithDescription(
                "Creates realistic appointment records for testing using Bogus library. " +
                "Fetches patient data from Patient.API automatically, or uses fallback data. " +
                "This endpoint is only available in Development environment.")
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest);

        return endpoints;
    }

    private static async Task<IResult> SeedAppointments(
        AppointmentSeeder seeder,
        [FromServices] IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<Program> logger,
        CancellationToken cancellationToken,
        [FromQuery] int appointmentsPerPatient = 3,
        [FromQuery] bool clearExisting = false)
    {
        if (appointmentsPerPatient is < 1 or > 10)
        {
            return Results.BadRequest(new
            {
                error = "Invalid appointmentsPerPatient",
                message = "appointmentsPerPatient must be between 1 and 10"
            });
        }

        // Fetch patient data from Patient.API dev endpoint
        var patients = await FetchPatientSummariesAsync(
            httpClientFactory, configuration, logger, cancellationToken);

        if (patients.Count == 0)
        {
            return Results.BadRequest(new
            {
                error = "No patients found",
                message = "Seed patients first via Patient.API POST /api/dev/seed/patients"
            });
        }

        logger.LogInformation(
            "Seeding appointments: {PerPatient} per patient, {PatientCount} patients (clearExisting: {ClearExisting})",
            appointmentsPerPatient, patients.Count, clearExisting);

        try
        {
            var (createdCount, failedCount) = await seeder.SeedAppointmentsAsync(
                patients, appointmentsPerPatient, clearExisting, cancellationToken);

            if (createdCount == 0 && failedCount > 0)
            {
                return Results.Problem(
                    title: "Seeding Failed",
                    detail: $"All {failedCount} appointments failed to create. Check service logs for details.",
                    statusCode: StatusCodes.Status500InternalServerError);
            }

            return Results.Ok(new
            {
                message = failedCount > 0
                    ? $"Seeding completed with errors: {createdCount} created, {failedCount} failed"
                    : "Appointment data seeding completed successfully",
                patientCount = patients.Count,
                appointmentsPerPatient,
                created = createdCount,
                failed = failedCount,
                clearExisting
            });
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Error seeding appointment data");
            return Results.Problem(
                title: "Seeding Failed",
                detail: exception.Message,
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private static async Task<IReadOnlyList<PatientSummary>> FetchPatientSummariesAsync(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        try
        {
            var patientApiUrl = configuration["PatientApiUrl"] ?? "http://patient-api:8080";
            var httpClient = httpClientFactory.CreateClient("PatientSeederClient");
            httpClient.BaseAddress = new Uri(patientApiUrl);

            var patients = await httpClient.GetFromJsonAsync<List<PatientSummary>>(
                "/api/dev/seed/patient-summary",
                cancellationToken);

            if (patients is { Count: > 0 })
            {
                logger.LogInformation("Fetched {Count} patients from Patient.API", patients.Count);
                return patients;
            }
        }
        catch (Exception exception)
        {
            logger.LogWarning(
                exception,
                "Failed to fetch patients from Patient.API, using fallback data");
        }

        // Fallback: use deterministic patient data for standalone seeding
        logger.LogInformation("Using fallback patient data for appointment seeding");
        return FallbackPatients;
    }

    private static readonly PatientSummary[] FallbackPatients =
    [
        new(Guid.Parse("11111111-1111-1111-1111-111111111111"), "John", "Doe", "john.doe@example.com"),
        new(Guid.Parse("22222222-2222-2222-2222-222222222222"), "Jane", "Smith", "jane.smith@example.com"),
        new(Guid.Parse("33333333-3333-3333-3333-333333333333"), "Robert", "Johnson", "robert.johnson@example.com"),
        new(Guid.Parse("44444444-4444-4444-4444-444444444444"), "Maria", "Garcia", "maria.garcia@example.com"),
        new(Guid.Parse("55555555-5555-5555-5555-555555555555"), "David", "Lee", "david.lee@example.com"),
    ];
}
