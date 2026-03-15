using System.Text.Json;
using Clara.API.Application.Models;

namespace Clara.API.Services;

/// <summary>
/// HTTP client for RabbitMQ Management API (/api/overview, /api/queues).
/// </summary>
public sealed class RabbitMQMonitorService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<RabbitMQMonitorService> _logger;

    public RabbitMQMonitorService(HttpClient httpClient, ILogger<RabbitMQMonitorService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<RabbitMQMetrics> GetMetricsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var overviewTask = GetOverviewAsync(cancellationToken);
            var queuesTask = GetQueuesAsync(cancellationToken);

            await Task.WhenAll(overviewTask, queuesTask);

            var overview = overviewTask.Result;
            var queues = queuesTask.Result;

            return new RabbitMQMetrics
            {
                TotalQueues = queues.Count,
                TotalMessages = queues.Sum(queue => queue.Messages),
                MessagePublishRate = overview.PublishRate,
                MessageDeliverRate = overview.DeliverRate,
                Connections = overview.Connections,
                Channels = overview.Channels,
                Queues = queues
            };
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Failed to fetch RabbitMQ metrics");
            return new RabbitMQMetrics
            {
                TotalQueues = 0,
                TotalMessages = 0,
                MessagePublishRate = 0,
                MessageDeliverRate = 0,
                Connections = 0,
                Channels = 0,
                Queues = []
            };
        }
    }

    private async Task<(double PublishRate, double DeliverRate, int Connections, int Channels)> GetOverviewAsync(
        CancellationToken cancellationToken)
    {
        var response = await _httpClient.GetAsync("/api/overview", cancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);

        double publishRate = 0;
        double deliverRate = 0;
        int connections = 0;
        int channels = 0;

        if (json.TryGetProperty("message_stats", out var messageStats))
        {
            if (messageStats.TryGetProperty("publish_details", out var publishDetails) &&
                publishDetails.TryGetProperty("rate", out var publishRateElement))
            {
                publishRate = publishRateElement.GetDouble();
            }

            if (messageStats.TryGetProperty("deliver_get_details", out var deliverDetails) &&
                deliverDetails.TryGetProperty("rate", out var deliverRateElement))
            {
                deliverRate = deliverRateElement.GetDouble();
            }
        }

        if (json.TryGetProperty("object_totals", out var objectTotals))
        {
            if (objectTotals.TryGetProperty("connections", out var connectionsElement))
                connections = connectionsElement.GetInt32();
            if (objectTotals.TryGetProperty("channels", out var channelsElement))
                channels = channelsElement.GetInt32();
        }

        return (Math.Round(publishRate, 2), Math.Round(deliverRate, 2), connections, channels);
    }

    private async Task<List<QueueMetricEntry>> GetQueuesAsync(CancellationToken cancellationToken)
    {
        var response = await _httpClient.GetAsync("/api/queues", cancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        var queues = new List<QueueMetricEntry>();

        foreach (var queue in json.EnumerateArray())
        {
            var name = queue.TryGetProperty("name", out var nameElement)
                ? nameElement.GetString() ?? "unknown"
                : "unknown";

            var messages = queue.TryGetProperty("messages", out var messagesElement)
                ? messagesElement.GetInt32()
                : 0;

            var consumers = queue.TryGetProperty("consumers", out var consumersElement)
                ? consumersElement.GetInt32()
                : 0;

            double publishRate = 0;
            double deliverRate = 0;

            if (queue.TryGetProperty("message_stats", out var messageStats))
            {
                if (messageStats.TryGetProperty("publish_details", out var publishDetails) &&
                    publishDetails.TryGetProperty("rate", out var publishRateElement))
                {
                    publishRate = publishRateElement.GetDouble();
                }

                if (messageStats.TryGetProperty("deliver_get_details", out var deliverDetails) &&
                    deliverDetails.TryGetProperty("rate", out var deliverRateElement))
                {
                    deliverRate = deliverRateElement.GetDouble();
                }
            }

            queues.Add(new QueueMetricEntry
            {
                Name = name,
                Messages = messages,
                Consumers = consumers,
                PublishRate = Math.Round(publishRate, 2),
                DeliverRate = Math.Round(deliverRate, 2)
            });
        }

        return queues;
    }
}
