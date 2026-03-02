using MediTrack.Shared.Common;
using System.Diagnostics;

namespace Clara.API.Apis;

/// <summary>
/// Aggregates health status from all microservices.
/// Admin-only endpoint used by the System Health dashboard.
/// </summary>
public static class SystemHealthApi
{
    private static readonly (string Name, string Description, string ConfigKey, string DefaultUrl)[] ServiceDefinitions =
    [
        ("Identity API", "Authentication & authorization", "Services:IdentityApi", "https://identity-api:8443"),
        ("Patient API", "Patient CRUD & demographics", "Services:PatientApi", "https://patient-api:8443"),
        ("Appointment API", "Calendar & scheduling engine", "Services:AppointmentApi", "https://appointment-api:8443"),
        ("Medical Records API", "EHR read/write & FHIR bridge", "Services:MedicalRecordsApi", "https://medicalrecords-api:8443"),
    ];

    public static void MapSystemHealthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/system/health", GetSystemHealth)
            .WithTags("SystemHealth")
            .WithName("GetSystemHealth")
            .WithSummary("Aggregate health status from all microservices")
            .RequireAuthorization(policy => policy.RequireRole(UserRoles.Admin));
    }

    private static async Task<IResult> GetSystemHealth(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var services = new List<ServiceHealthEntry>();

        foreach (var (name, description, configKey, defaultUrl) in ServiceDefinitions)
        {
            var baseUrl = configuration[configKey] ?? defaultUrl;
            var healthUrl = $"{baseUrl.TrimEnd('/')}/health/live";

            var entry = await CheckServiceHealthAsync(
                httpClientFactory, name, description, healthUrl, cancellationToken);
            services.Add(entry);
        }

        var overallStatus = services.Any(service => service.Status == "Unhealthy")
            ? "Unhealthy"
            : services.Any(service => service.Status == "Degraded")
                ? "Degraded"
                : "Healthy";

        return Results.Ok(new SystemHealthResponse
        {
            Services = services,
            OverallStatus = overallStatus,
        });
    }

    private static async Task<ServiceHealthEntry> CheckServiceHealthAsync(
        IHttpClientFactory httpClientFactory,
        string name,
        string description,
        string healthUrl,
        CancellationToken cancellationToken)
    {
        var httpClient = httpClientFactory.CreateClient("HealthCheck");
        var stopwatch = Stopwatch.StartNew();

        try
        {
            using var response = await httpClient.GetAsync(healthUrl, cancellationToken);
            stopwatch.Stop();

            var status = response.IsSuccessStatusCode ? "Healthy" : "Degraded";

            return new ServiceHealthEntry
            {
                Name = name,
                Description = description,
                Status = status,
                ResponseMs = (int)stopwatch.ElapsedMilliseconds,
            };
        }
        catch
        {
            stopwatch.Stop();

            return new ServiceHealthEntry
            {
                Name = name,
                Description = description,
                Status = "Unhealthy",
                ResponseMs = (int)stopwatch.ElapsedMilliseconds,
            };
        }
    }
}

public sealed record ServiceHealthEntry
{
    public required string Name { get; init; }
    public required string Description { get; init; }
    public required string Status { get; init; }
    public required int ResponseMs { get; init; }
}

public sealed record SystemHealthResponse
{
    public required List<ServiceHealthEntry> Services { get; init; }
    public required string OverallStatus { get; init; }
}
