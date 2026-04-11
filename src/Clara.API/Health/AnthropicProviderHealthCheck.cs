using System.Net;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Clara.API.Health;

internal sealed class AnthropicProviderHealthCheck : IAiProviderHealthCheck
{
    private readonly IHttpClientFactory _httpClientFactory;

    public AnthropicProviderHealthCheck(IHttpClientFactory httpClientFactory)
        => _httpClientFactory = httpClientFactory;

    public string ProviderName => "anthropic";

    public async Task<HealthCheckResult> CheckAsync(CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("Anthropic");
        var response = await client.GetAsync("v1/models", cancellationToken);
        return response.StatusCode switch
        {
            HttpStatusCode.OK => HealthCheckResult.Healthy("Anthropic API reachable"),
            HttpStatusCode.Unauthorized => HealthCheckResult.Unhealthy("Anthropic API key is invalid"),
            _ => HealthCheckResult.Degraded($"Anthropic API returned {(int)response.StatusCode}")
        };
    }
}
