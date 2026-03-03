using System.Text.Json;
using Clara.API.Application.Models;

namespace Clara.API.Services;

/// <summary>
/// HTTP client for Prometheus query and query_range APIs.
/// Reads metrics already collected via the OTEL spanmetrics connector.
/// </summary>
public sealed class PrometheusService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<PrometheusService> _logger;

    public PrometheusService(HttpClient httpClient, ILogger<PrometheusService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<PrometheusMetrics> GetCurrentMetricsAsync(CancellationToken cancellationToken = default)
    {
        // Run all 3 Prometheus queries in parallel to avoid sequential round-trips
        var requestRateTask = QueryByServiceAsync(
            "sum by (service_name)(rate(calls_total[5m]))", cancellationToken);

        var errorRateTask = QueryByServiceAsync(
            "sum by (service_name)(rate(calls_total{status_code=\"STATUS_CODE_ERROR\"}[5m])) / sum by (service_name)(rate(calls_total[5m]))",
            cancellationToken);

        var latencyP95Task = QueryByServiceAsync(
            "histogram_quantile(0.95, sum by (le, service_name)(rate(duration_milliseconds_bucket[5m])))",
            cancellationToken);

        await Task.WhenAll(requestRateTask, errorRateTask, latencyP95Task);

        var requestRateByService = requestRateTask.Result;
        var errorRateByService = errorRateTask.Result;
        var latencyP95ByService = latencyP95Task.Result;

        var totalRequestRate = requestRateByService.Sum(entry => entry.Value);
        var totalErrorRate = totalRequestRate > 0
            ? errorRateByService.Sum(entry => entry.Value) / requestRateByService.Count
            : 0;
        var maxLatencyP95 = latencyP95ByService.Count > 0
            ? latencyP95ByService.Max(entry => entry.Value)
            : 0;

        return new PrometheusMetrics
        {
            RequestsPerSecond = Math.Round(totalRequestRate, 2),
            ErrorRate = Math.Round(totalErrorRate * 100, 2),
            LatencyP95Ms = Math.Round(maxLatencyP95, 1),
            RequestRateByService = requestRateByService,
            ErrorRateByService = errorRateByService,
            LatencyP95ByService = latencyP95ByService
        };
    }

    public async Task<TimeSeriesResponse> GetTimeSeriesAsync(
        string metric, string range, CancellationToken cancellationToken = default)
    {
        var (promql, step) = metric.ToLowerInvariant() switch
        {
            "request_rate" => ("sum by (service_name)(rate(calls_total[5m]))", GetStep(range)),
            "error_rate" => ("sum by (service_name)(rate(calls_total{status_code=\"STATUS_CODE_ERROR\"}[5m])) / sum by (service_name)(rate(calls_total[5m]))", GetStep(range)),
            "latency_p95" => ("histogram_quantile(0.95, sum by (le, service_name)(rate(duration_milliseconds_bucket[5m])))", GetStep(range)),
            _ => throw new ArgumentException($"Unknown metric: {metric}")
        };

        var rangeDuration = GetRangeDuration(range);
        var end = DateTimeOffset.UtcNow;
        var start = end.Subtract(rangeDuration);

        var byService = await QueryRangeByServiceAsync(promql, start, end, step, cancellationToken);

        // Aggregate across services for the total
        var aggregatedData = AggregateTimeSeries(byService, metric == "error_rate");

        return new TimeSeriesResponse
        {
            Metric = metric,
            Range = range,
            Data = aggregatedData,
            ByService = byService
        };
    }

    private async Task<List<ServiceMetricEntry>> QueryByServiceAsync(
        string query, CancellationToken cancellationToken)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"/api/v1/query?query={Uri.EscapeDataString(query)}", cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Prometheus query failed with status {StatusCode}: {Query}",
                    response.StatusCode, query);
                return [];
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
            return ParseInstantVectorByService(json);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Failed to query Prometheus: {Query}", query);
            return [];
        }
    }

    private async Task<List<TimeSeriesByService>> QueryRangeByServiceAsync(
        string query, DateTimeOffset start, DateTimeOffset end, string step,
        CancellationToken cancellationToken)
    {
        try
        {
            var url = $"/api/v1/query_range?query={Uri.EscapeDataString(query)}" +
                      $"&start={start.ToUnixTimeSeconds()}&end={end.ToUnixTimeSeconds()}&step={step}";

            var response = await _httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Prometheus query_range failed with status {StatusCode}", response.StatusCode);
                return [];
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
            return ParseRangeVectorByService(json);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Failed to query Prometheus range: {Query}", query);
            return [];
        }
    }

    private static List<ServiceMetricEntry> ParseInstantVectorByService(JsonElement json)
    {
        var results = new List<ServiceMetricEntry>();

        if (json.TryGetProperty("data", out var data) &&
            data.TryGetProperty("result", out var resultArray))
        {
            foreach (var result in resultArray.EnumerateArray())
            {
                var serviceName = result.TryGetProperty("metric", out var metricObj) &&
                                  metricObj.TryGetProperty("service_name", out var nameElement)
                    ? nameElement.GetString() ?? "unknown"
                    : "unknown";

                if (result.TryGetProperty("value", out var valueArray) &&
                    valueArray.GetArrayLength() >= 2)
                {
                    var valueStr = valueArray[1].GetString();
                    if (double.TryParse(valueStr, out var value) && !double.IsNaN(value) && !double.IsInfinity(value))
                    {
                        results.Add(new ServiceMetricEntry
                        {
                            ServiceName = serviceName,
                            Value = Math.Round(value, 4)
                        });
                    }
                }
            }
        }

        return results;
    }

    private static List<TimeSeriesByService> ParseRangeVectorByService(JsonElement json)
    {
        var results = new List<TimeSeriesByService>();

        if (json.TryGetProperty("data", out var data) &&
            data.TryGetProperty("result", out var resultArray))
        {
            foreach (var result in resultArray.EnumerateArray())
            {
                var serviceName = result.TryGetProperty("metric", out var metricObj) &&
                                  metricObj.TryGetProperty("service_name", out var nameElement)
                    ? nameElement.GetString() ?? "unknown"
                    : "unknown";

                var dataPoints = new List<TimeSeriesDataPoint>();

                if (result.TryGetProperty("values", out var valuesArray))
                {
                    foreach (var point in valuesArray.EnumerateArray())
                    {
                        if (point.GetArrayLength() >= 2)
                        {
                            var timestamp = DateTimeOffset.FromUnixTimeSeconds(
                                (long)point[0].GetDouble()).ToString("yyyy-MM-ddTHH:mm:ssZ");
                            var valueStr = point[1].GetString();
                            if (double.TryParse(valueStr, out var value) && !double.IsNaN(value) && !double.IsInfinity(value))
                            {
                                dataPoints.Add(new TimeSeriesDataPoint
                                {
                                    Timestamp = timestamp,
                                    Value = Math.Round(value, 4)
                                });
                            }
                        }
                    }
                }

                results.Add(new TimeSeriesByService
                {
                    ServiceName = serviceName,
                    Data = dataPoints
                });
            }
        }

        return results;
    }

    private static List<TimeSeriesDataPoint> AggregateTimeSeries(
        List<TimeSeriesByService> byService, bool isRate)
    {
        if (byService.Count == 0) return [];

        var timestampGroups = byService
            .SelectMany(service => service.Data)
            .GroupBy(point => point.Timestamp)
            .OrderBy(group => group.Key);

        return timestampGroups.Select(group => new TimeSeriesDataPoint
        {
            Timestamp = group.Key,
            Value = Math.Round(isRate
                ? group.Average(point => point.Value)
                : group.Sum(point => point.Value), 4)
        }).ToList();
    }

    private static string GetStep(string range) => range switch
    {
        "1h" => "60s",
        "6h" => "300s",
        "24h" => "600s",
        "7d" => "3600s",
        _ => "300s"
    };

    private static TimeSpan GetRangeDuration(string range) => range switch
    {
        "1h" => TimeSpan.FromHours(1),
        "6h" => TimeSpan.FromHours(6),
        "24h" => TimeSpan.FromHours(24),
        "7d" => TimeSpan.FromDays(7),
        _ => TimeSpan.FromHours(6)
    };
}
