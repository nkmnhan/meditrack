using System.Net;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Clara.API.Health;

internal sealed class OpenAIProviderHealthCheck : IAiProviderHealthCheck
{
    private readonly IHttpClientFactory _httpClientFactory;

    public OpenAIProviderHealthCheck(IHttpClientFactory httpClientFactory)
        => _httpClientFactory = httpClientFactory;

    public string ProviderName => "openai";

    public async Task<HealthCheckResult> CheckAsync(CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("OpenAI");
        var response = await client.GetAsync("v1/models", cancellationToken);
        return response.StatusCode switch
        {
            HttpStatusCode.OK => HealthCheckResult.Healthy("OpenAI API reachable"),
            HttpStatusCode.Unauthorized => HealthCheckResult.Unhealthy("OpenAI API key is invalid"),
            _ => HealthCheckResult.Degraded($"OpenAI API returned {(int)response.StatusCode}")
        };
    }
}
