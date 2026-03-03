namespace Clara.API.Application.Models;

// ── Infrastructure metrics snapshot ──

public sealed record InfrastructureMetricsResponse
{
    public required PrometheusMetrics Prometheus { get; init; }
    public required RabbitMQMetrics RabbitMQ { get; init; }
    public required DatabaseMetrics Database { get; init; }
}

public sealed record PrometheusMetrics
{
    public required double RequestsPerSecond { get; init; }
    public required double ErrorRate { get; init; }
    public required double LatencyP95Ms { get; init; }
    public required List<ServiceMetricEntry> RequestRateByService { get; init; }
    public required List<ServiceMetricEntry> ErrorRateByService { get; init; }
    public required List<ServiceMetricEntry> LatencyP95ByService { get; init; }
}

public sealed record ServiceMetricEntry
{
    public required string ServiceName { get; init; }
    public required double Value { get; init; }
}

public sealed record RabbitMQMetrics
{
    public required int TotalQueues { get; init; }
    public required int TotalMessages { get; init; }
    public required double MessagePublishRate { get; init; }
    public required double MessageDeliverRate { get; init; }
    public required int Connections { get; init; }
    public required int Channels { get; init; }
    public required List<QueueMetricEntry> Queues { get; init; }
}

public sealed record QueueMetricEntry
{
    public required string Name { get; init; }
    public required int Messages { get; init; }
    public required int Consumers { get; init; }
    public required double PublishRate { get; init; }
    public required double DeliverRate { get; init; }
}

public sealed record DatabaseMetrics
{
    public required int ActiveConnections { get; init; }
    public required int MaxConnections { get; init; }
    public required long DatabaseSizeBytes { get; init; }
    public required string DatabaseSizeFormatted { get; init; }
    public required long TransactionsCommitted { get; init; }
    public required long TransactionsRolledBack { get; init; }
    public required List<DatabaseEntry> Databases { get; init; }
}

public sealed record DatabaseEntry
{
    public required string Name { get; init; }
    public required long SizeBytes { get; init; }
    public required string SizeFormatted { get; init; }
    public required int ActiveConnections { get; init; }
}

// ── Time-series response ──

public sealed record TimeSeriesResponse
{
    public required string Metric { get; init; }
    public required string Range { get; init; }
    public required List<TimeSeriesDataPoint> Data { get; init; }
    public required List<TimeSeriesByService> ByService { get; init; }
}

public sealed record TimeSeriesDataPoint
{
    public required string Timestamp { get; init; }
    public required double Value { get; init; }
}

public sealed record TimeSeriesByService
{
    public required string ServiceName { get; init; }
    public required List<TimeSeriesDataPoint> Data { get; init; }
}
