using System.Diagnostics;
using System.Text.Json;
using MediTrack.Shared.Common;

namespace Clara.API.Apis;

/// <summary>
/// Aggregates health status from all microservices.
/// Admin-only endpoint used by the System Health dashboard.
/// Now calls /health/details for per-dependency status breakdown.
/// </summary>
public static class SystemHealthApi
{
    private static readonly (string Name, string Description, string ConfigKey, string DefaultUrl)[] ServiceDefinitions =
    [
        ("Identity API", "Authentication & authorization", "Services:IdentityApi", "https://identity-api:8443"),
        ("Patient API", "Patient CRUD & demographics", "Services:PatientApi", "https://patient-api:8443"),
        ("Appointment API", "Calendar & scheduling engine", "Services:AppointmentApi", "https://appointment-api:8443"),
        ("Medical Records API", "EHR read/write & FHIR bridge", "Services:MedicalRecordsApi", "https://medicalrecords-api:8443"),
        // notification-worker is a background worker with no external callers — it binds HTTP only (no TLS config in compose).
        ("Notification Worker", "Event processing & audit logging", "Services:NotificationWorker", "http://notification-worker:8080"),
        ("Clara AI Service", "AI clinical companion & MCP server", "Services:ClaraApi", "https://clara-api:8443"),
    ];

    public static void MapSystemHealthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/system/health", GetSystemHealth)
            .WithTags("SystemHealth")
            .WithName("GetSystemHealth")
            .WithSummary("Aggregate health status from all microservices with dependency breakdown")
            .RequireAuthorization(policy => policy.RequireRole(UserRoles.Admin));
    }

    private static async Task<IResult> GetSystemHealth(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var tasks = ServiceDefinitions.Select(definition =>
            CheckServiceHealthAsync(
                httpClientFactory,
                definition.Name,
                definition.Description,
                configuration[definition.ConfigKey] ?? definition.DefaultUrl,
                cancellationToken));

        var services = await Task.WhenAll(tasks);

        var overallStatus = services.Any(service => service.Status == "Unhealthy")
            ? "Unhealthy"
            : services.Any(service => service.Status == "Degraded")
                ? "Degraded"
                : "Healthy";

        return Results.Ok(new SystemHealthResponse
        {
            Services = [.. services],
            OverallStatus = overallStatus,
        });
    }

    private static readonly TimeSpan HealthCheckTimeout = TimeSpan.FromSeconds(3);

    private static async Task<ServiceHealthEntry> CheckServiceHealthAsync(
        IHttpClientFactory httpClientFactory,
        string name,
        string description,
        string baseUrl,
        CancellationToken cancellationToken)
    {
        var httpClient = httpClientFactory.CreateClient("HealthCheck");
        var detailsUrl = $"{baseUrl.TrimEnd('/')}/health/details";
        var stopwatch = Stopwatch.StartNew();

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(HealthCheckTimeout);
            using var response = await httpClient.GetAsync(detailsUrl, timeoutCts.Token);
            stopwatch.Stop();

            if (!response.IsSuccessStatusCode)
            {
                // Fall back to basic health check
                return await FallbackHealthCheckAsync(
                    httpClient, name, description, baseUrl, stopwatch.ElapsedMilliseconds, timeoutCts.Token);
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);

            var status = json.TryGetProperty("status", out var statusElement)
                ? statusElement.GetString() ?? "Unhealthy"
                : "Healthy";

            var dependencies = ParseDependencies(json);

            return new ServiceHealthEntry
            {
                Name = name,
                Description = description,
                Status = status,
                ResponseMs = (int)stopwatch.ElapsedMilliseconds,
                Dependencies = dependencies,
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
                Dependencies = [],
            };
        }
    }

    private static async Task<ServiceHealthEntry> FallbackHealthCheckAsync(
        HttpClient httpClient,
        string name,
        string description,
        string baseUrl,
        long alreadyElapsedMs,
        CancellationToken cancellationToken)
    {
        var liveUrl = $"{baseUrl.TrimEnd('/')}/health/live";
        var stopwatch = Stopwatch.StartNew();

        try
        {
            using var response = await httpClient.GetAsync(liveUrl, cancellationToken);
            stopwatch.Stop();

            return new ServiceHealthEntry
            {
                Name = name,
                Description = description,
                Status = response.IsSuccessStatusCode ? "Healthy" : "Degraded",
                ResponseMs = (int)(alreadyElapsedMs + stopwatch.ElapsedMilliseconds),
                Dependencies = [],
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
                ResponseMs = (int)(alreadyElapsedMs + stopwatch.ElapsedMilliseconds),
                Dependencies = [],
            };
        }
    }

    private static List<DependencyHealthEntry> ParseDependencies(JsonElement json)
    {
        var dependencies = new List<DependencyHealthEntry>();

        if (!json.TryGetProperty("checks", out var checks))
            return dependencies;

        foreach (var check in checks.EnumerateArray())
        {
            var checkName = check.TryGetProperty("name", out var nameElement)
                ? nameElement.GetString() ?? "unknown"
                : "unknown";

            // Skip the "self" check — it's always healthy and not a real dependency
            if (checkName == "self")
                continue;

            var status = check.TryGetProperty("status", out var statusElement)
                ? statusElement.GetString() ?? "Unhealthy"
                : "Unhealthy";

            var durationMs = check.TryGetProperty("durationMs", out var durationElement)
                ? durationElement.GetInt32()
                : 0;

            dependencies.Add(new DependencyHealthEntry
            {
                Name = checkName,
                Status = status,
                DurationMs = durationMs,
            });
        }

        return dependencies;
    }
}

public sealed record DependencyHealthEntry
{
    public required string Name { get; init; }
    public required string Status { get; init; }
    public required int DurationMs { get; init; }
}

public sealed record ServiceHealthEntry
{
    public required string Name { get; init; }
    public required string Description { get; init; }
    public required string Status { get; init; }
    public required int ResponseMs { get; init; }
    public List<DependencyHealthEntry> Dependencies { get; init; } = [];
}

public sealed record SystemHealthResponse
{
    public required List<ServiceHealthEntry> Services { get; init; }
    public required string OverallStatus { get; init; }
}
