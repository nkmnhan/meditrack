using Clara.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Clara.API.Health;

/// <summary>
/// Custom health check for Clara service.
/// Verifies database connectivity, pgvector extension, and AI service reachability.
/// </summary>
public sealed class ClaraHealthCheck : IHealthCheck
{
    private readonly ClaraDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ClaraHealthCheck> _logger;

    public ClaraHealthCheck(
        ClaraDbContext db,
        IHttpClientFactory httpClientFactory,
        ILogger<ClaraHealthCheck> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
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

        // Check Deepgram reachability — GET /v1/projects validates both connectivity and API key
        // 200 = key valid, 401 = key invalid (key problem not connectivity), 4xx/5xx = degraded
        try
        {
            var deepgramClient = _httpClientFactory.CreateClient("Deepgram");
            var deepgramResponse = await deepgramClient.GetAsync("v1/projects", cancellationToken);
            data["deepgram"] = deepgramResponse.StatusCode switch
            {
                System.Net.HttpStatusCode.OK => "healthy",
                System.Net.HttpStatusCode.Unauthorized => "invalid_key",
                _ => "degraded"
            };
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Deepgram health check failed");
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
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "OpenAI health check failed");
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
