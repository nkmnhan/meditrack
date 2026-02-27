using EmergenAI.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace EmergenAI.API.Health;

/// <summary>
/// Custom health check for Emergen AI service.
/// Verifies database connectivity and pgvector extension.
/// </summary>
public sealed class EmergenHealthCheck : IHealthCheck
{
    private readonly EmergenDbContext _db;

    public EmergenHealthCheck(EmergenDbContext db)
    {
        _db = db;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Verify database connectivity
            bool canConnect = await _db.Database.CanConnectAsync(cancellationToken);
            if (!canConnect)
            {
                return HealthCheckResult.Unhealthy("Cannot connect to EmergenDB");
            }

            // Verify pgvector extension is enabled using raw SQL
            // SqlQueryRaw<int> requires the column to be named "Value"
            var extensionExists = await _db.Database.SqlQueryRaw<int>(
                "SELECT COUNT(*)::int AS \"Value\" FROM pg_extension WHERE extname = 'vector'")
                .FirstOrDefaultAsync(cancellationToken);

            if (extensionExists == 0)
            {
                return HealthCheckResult.Degraded("pgvector extension not enabled");
            }

            return HealthCheckResult.Healthy("EmergenDB connected, pgvector enabled");
        }
        catch (Exception exception)
        {
            return HealthCheckResult.Unhealthy(
                "Health check failed",
                exception,
                new Dictionary<string, object> { ["error"] = exception.Message });
        }
    }
}
