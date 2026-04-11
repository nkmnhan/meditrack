using Clara.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Clara.API.Health;

/// <summary>
/// Custom health check for Clara service.
/// Verifies database connectivity, pgvector extension, and AI service reachability.
/// The AI provider checked is determined by <c>AI:ChatProvider</c> config via <see cref="IAiProviderHealthCheck"/>.
/// </summary>
public sealed class ClaraHealthCheck : IHealthCheck
{
    private readonly ClaraDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAiProviderHealthCheck _aiProviderHealthCheck;
    private readonly ILogger<ClaraHealthCheck> _logger;

    public ClaraHealthCheck(
        ClaraDbContext db,
        IHttpClientFactory httpClientFactory,
        IAiProviderHealthCheck aiProviderHealthCheck,
        ILogger<ClaraHealthCheck> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _aiProviderHealthCheck = aiProviderHealthCheck;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var data = new Dictionary<string, object>();
        var isDegraded = false;

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

            if (extensionExists > 0)
            {
                data["pgvector"] = "enabled";
            }
            else
            {
                data["pgvector"] = "not_enabled";
                isDegraded = true;
            }
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
            var deepgramStatus = deepgramResponse.StatusCode switch
            {
                System.Net.HttpStatusCode.OK => "healthy",
                System.Net.HttpStatusCode.Unauthorized => "invalid_key",
                _ => "degraded"
            };
            data["deepgram"] = deepgramStatus;
            if (deepgramStatus == "degraded") isDegraded = true;
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Deepgram health check failed");
            data["deepgram"] = "unreachable";
            isDegraded = true;
        }

        // Check configured AI chat provider — provider resolved from AI:ChatProvider config.
        // Degraded, not unhealthy — circuit breaker handles outages.
        try
        {
            var providerResult = await _aiProviderHealthCheck.CheckAsync(cancellationToken);
            data[_aiProviderHealthCheck.ProviderName] = providerResult.Description ?? providerResult.Status.ToString();
            if (providerResult.Status != HealthStatus.Healthy) isDegraded = true;
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "AI provider health check failed for {Provider}", _aiProviderHealthCheck.ProviderName);
            data[_aiProviderHealthCheck.ProviderName] = "unreachable";
            isDegraded = true;
        }

        return isDegraded
            ? HealthCheckResult.Degraded("AI services partially unavailable", data: data)
            : HealthCheckResult.Healthy("All systems operational", data);
    }
}
