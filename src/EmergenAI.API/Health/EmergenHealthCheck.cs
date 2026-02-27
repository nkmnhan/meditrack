using EmergenAI.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace EmergenAI.API.Health;

/// <summary>
/// Custom health check for Emergen AI service.
/// Verifies database connectivity, pgvector extension, and AI service reachability.
/// </summary>
public sealed class EmergenHealthCheck : IHealthCheck
{
    private readonly EmergenDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;

    public EmergenHealthCheck(EmergenDbContext db, IHttpClientFactory httpClientFactory)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var data = new Dictionary<string, object>();

        // Check PostgreSQL — CRITICAL (unhealthy if down)
        try
        {
            bool canConnect = await _db.Database.CanConnectAsync(cancellationToken);
            if (!canConnect)
            {
                return HealthCheckResult.Unhealthy("PostgreSQL unreachable", data: data);
            }
            data["postgresql"] = "healthy";

            // Verify pgvector extension
            var extensionExists = await _db.Database.SqlQueryRaw<int>(
                "SELECT COUNT(*)::int AS \"Value\" FROM pg_extension WHERE extname = 'vector'")
                .FirstOrDefaultAsync(cancellationToken);

            data["pgvector"] = extensionExists > 0 ? "enabled" : "not_enabled";
        }
        catch (Exception exception)
        {
            data["postgresql_error"] = exception.Message;
            return HealthCheckResult.Unhealthy("PostgreSQL unreachable", exception, data);
        }

        // Check Deepgram reachability (HEAD request, no billing impact)
        // Degraded, not unhealthy — manual text fallback works
        try
        {
            var deepgramClient = _httpClientFactory.CreateClient("Deepgram");
            using var deepgramRequest = new HttpRequestMessage(HttpMethod.Head, "v1/listen");
            var deepgramResponse = await deepgramClient.SendAsync(deepgramRequest, cancellationToken);
            data["deepgram"] = deepgramResponse.IsSuccessStatusCode ? "reachable" : "degraded";
        }
        catch
        {
            data["deepgram"] = "unreachable";
        }

        // Check OpenAI reachability (list models endpoint — lightweight, no token cost)
        // Degraded, not unhealthy — circuit breaker handles outages
        try
        {
            var openAiClient = _httpClientFactory.CreateClient("OpenAI");
            var openAiResponse = await openAiClient.GetAsync("v1/models", cancellationToken);
            data["openai"] = openAiResponse.IsSuccessStatusCode ? "reachable" : "degraded";
        }
        catch
        {
            data["openai"] = "unreachable";
        }

        // Overall: healthy if PostgreSQL is up (AI services are degraded, not critical)
        var hasDegradedService = data.Values.Any(value =>
            value is string status && status is "degraded" or "unreachable" or "not_enabled");

        return hasDegradedService
            ? HealthCheckResult.Degraded("AI services partially unavailable", data: data)
            : HealthCheckResult.Healthy("All systems operational", data);
    }
}
