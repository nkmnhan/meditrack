using Clara.API.Services;
using MediTrack.Shared.Common;
using Microsoft.Extensions.Caching.Memory;

namespace Clara.API.Apis;

/// <summary>
/// Infrastructure monitoring endpoints — Prometheus metrics, RabbitMQ stats, PostgreSQL stats.
/// Admin-only, proxied through Clara.API as the monitoring gateway.
/// </summary>
public static class InfrastructureApi
{
    private static readonly string[] ValidMetrics = ["request_rate", "error_rate", "latency_p95"];
    private static readonly string[] ValidRanges = ["1h", "6h", "24h", "7d"];
    private const string MetricsCacheKey = "infra_metrics";
    private static readonly TimeSpan MetricsCacheDuration = TimeSpan.FromSeconds(15);

    public static void MapInfrastructureEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/infrastructure")
            .WithTags("Infrastructure")
            .RequireAuthorization(policy => policy.RequireRole(UserRoles.Admin));

        group.MapGet("/metrics", GetInfrastructureMetrics)
            .WithName("GetInfrastructureMetrics")
            .WithSummary("Current snapshot of infrastructure metrics")
            .Produces<object>(StatusCodes.Status200OK);

        group.MapGet("/timeseries", GetMetricsTimeseries)
            .WithName("GetMetricsTimeseries")
            .WithSummary("Time-series data for infrastructure charts")
            .Produces<object>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest);
    }

    private static async Task<IResult> GetInfrastructureMetrics(
        PrometheusService prometheusService,
        RabbitMQMonitorService rabbitMQMonitorService,
        DatabaseMonitorService databaseMonitorService,
        IMemoryCache cache,
        CancellationToken cancellationToken)
    {
        if (cache.TryGetValue(MetricsCacheKey, out object? cached) && cached is not null)
        {
            return Results.Ok(cached);
        }

        var prometheusTask = prometheusService.GetCurrentMetricsAsync(cancellationToken);
        var rabbitMQTask = rabbitMQMonitorService.GetMetricsAsync(cancellationToken);
        var databaseTask = databaseMonitorService.GetMetricsAsync(cancellationToken);

        await Task.WhenAll(prometheusTask, rabbitMQTask, databaseTask);

        var result = new
        {
            prometheus = prometheusTask.Result,
            rabbitMQ = rabbitMQTask.Result,
            database = databaseTask.Result
        };

        cache.Set(MetricsCacheKey, result, MetricsCacheDuration);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetMetricsTimeseries(
        string metric,
        string range,
        PrometheusService prometheusService,
        CancellationToken cancellationToken)
    {
        if (!ValidMetrics.Contains(metric))
        {
            return Results.BadRequest(new { error = $"Invalid metric. Valid values: {string.Join(", ", ValidMetrics)}" });
        }

        if (!ValidRanges.Contains(range))
        {
            return Results.BadRequest(new { error = $"Invalid range. Valid values: {string.Join(", ", ValidRanges)}" });
        }

        var timeseries = await prometheusService.GetTimeSeriesAsync(metric, range, cancellationToken);
        return Results.Ok(timeseries);
    }
}
