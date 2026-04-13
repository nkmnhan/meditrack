using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Clara.API.Health;

/// <summary>
/// Verifies that the configured AI chat provider is reachable and authenticated.
/// Implementations are registered as keyed services ("openai", "anthropic") and
/// resolved based on <c>AI:ChatProvider</c> config.
/// </summary>
public interface IAiProviderHealthCheck
{
    /// <summary>Provider name used as the key in health-check data (e.g. "openai", "anthropic").</summary>
    string ProviderName { get; }

    /// <summary>
    /// Checks provider reachability and returns a <see cref="HealthCheckResult"/>.
    /// Must NOT throw — any exception should be caught by the caller.
    /// </summary>
    Task<HealthCheckResult> CheckAsync(CancellationToken cancellationToken);
}
