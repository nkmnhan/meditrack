using Clara.API.Application.Models;
using Clara.API.Health;
using Microsoft.Extensions.AI;

namespace Clara.API.Extensions;

/// <summary>
/// Extension point for registering AI provider implementations.
/// Add one implementation per provider — no changes to existing code needed.
/// </summary>
internal interface IAIProviderRegistration
{
    /// <summary>Lowercase provider name used in AI:ChatProvider config (e.g. "openai").</summary>
    string ProviderName { get; }

    /// <summary>Creates the leaf IChatClient for the given model.</summary>
    IChatClient CreateChatClient(AIOptions opts, string model);

    /// <summary>Creates the health check that verifies provider reachability.</summary>
    IAiProviderHealthCheck CreateHealthCheck(IHttpClientFactory factory);
}
