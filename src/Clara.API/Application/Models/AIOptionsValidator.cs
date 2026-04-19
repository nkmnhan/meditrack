using Clara.API.Extensions;
using Microsoft.Extensions.Options;

namespace Clara.API.Application.Models;

/// <summary>
/// Validates <see cref="AIOptions"/> at startup via <c>ValidateOnStart()</c>.
/// Fails fast on misconfigured provider or missing API key so the service refuses
/// to start rather than failing silently at the first LLM call.
///
/// Supported providers are derived from <see cref="AIProviderRegistry.All"/> —
/// adding a new provider to the registry automatically makes it valid here.
/// </summary>
internal sealed class AIOptionsValidator : IValidateOptions<AIOptions>
{
    public ValidateOptionsResult Validate(string? name, AIOptions options)
    {
        var supported = AIProviderRegistry.All.Select(r => r.ProviderName).ToList();

        if (!supported.Any(p => p.Equals(options.ChatProvider, StringComparison.OrdinalIgnoreCase)))
            return ValidateOptionsResult.Fail(
                $"AI:ChatProvider must be one of [{string.Join(", ", supported)}], got '{options.ChatProvider}'.");

        if (options.ChatProvider.Equals(AIProviderNames.OpenAI, StringComparison.OrdinalIgnoreCase)
            && string.IsNullOrEmpty(options.OpenAI.ApiKey))
            return ValidateOptionsResult.Fail(
                "AI:OpenAI:ApiKey is required when AI:ChatProvider is 'openai'.");

        if (options.ChatProvider.Equals(AIProviderNames.Anthropic, StringComparison.OrdinalIgnoreCase)
            && string.IsNullOrEmpty(options.Anthropic.ApiKey))
            return ValidateOptionsResult.Fail(
                "AI:Anthropic:ApiKey is required when AI:ChatProvider is 'anthropic'.");

        return ValidateOptionsResult.Success;
    }
}
