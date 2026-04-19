using Clara.API.Application.Models;

namespace Clara.API.Extensions;

/// <summary>
/// Single source of truth for registered AI provider implementations.
/// Adding a new provider = add one entry here + one IAIProviderRegistration class.
/// </summary>
internal static class AIProviderRegistry
{
    internal static readonly IReadOnlyList<IAIProviderRegistration> All =
    [
        new OpenAIProviderRegistration(),
        new AnthropicProviderRegistration()
    ];

    /// <summary>Returns the registration for opts.ChatProvider. Throws if not found.</summary>
    internal static IAIProviderRegistration GetFor(AIOptions opts) =>
        All.FirstOrDefault(r => r.ProviderName.Equals(opts.ChatProvider, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException(
                $"Unsupported AI:ChatProvider '{opts.ChatProvider}'. " +
                $"Supported: {string.Join(", ", All.Select(r => r.ProviderName))}");

    /// <summary>Returns the registration by provider name string. Throws if not found.</summary>
    internal static IAIProviderRegistration GetByName(string providerName) =>
        All.FirstOrDefault(r => r.ProviderName.Equals(providerName, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException(
                $"Unsupported AI provider '{providerName}'. " +
                $"Supported: {string.Join(", ", All.Select(r => r.ProviderName))}");
}
