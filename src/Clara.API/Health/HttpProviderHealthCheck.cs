using System.Net;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Clara.API.Health;

/// <summary>
/// Shared health check logic for AI providers that expose GET /v1/models.
/// Subclasses provide ProviderName and HttpClientName only.
/// </summary>
internal abstract class HttpProviderHealthCheck : IAiProviderHealthCheck
{
    private readonly IHttpClientFactory _factory;

    protected HttpProviderHealthCheck(IHttpClientFactory factory) => _factory = factory;

    public abstract string ProviderName { get; }
    protected abstract string HttpClientName { get; }
    protected virtual string HealthEndpoint => "v1/models";

    public async Task<HealthCheckResult> CheckAsync(CancellationToken cancellationToken)
    {
        var client = _factory.CreateClient(HttpClientName);
        var response = await client.GetAsync(HealthEndpoint, cancellationToken);
        return response.StatusCode switch
        {
            HttpStatusCode.OK => HealthCheckResult.Healthy($"{ProviderName} API reachable"),
            HttpStatusCode.Unauthorized => HealthCheckResult.Unhealthy($"{ProviderName} API key is invalid"),
            _ => HealthCheckResult.Degraded($"{ProviderName} API returned {(int)response.StatusCode}")
        };
    }
}
