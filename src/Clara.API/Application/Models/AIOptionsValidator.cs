using Microsoft.Extensions.Options;

namespace Clara.API.Application.Models;

/// <summary>
/// Validates <see cref="AIOptions"/> at startup via <c>ValidateOnStart()</c>.
/// Fails fast on misconfigured provider or missing API key so the service refuses
/// to start rather than failing silently at the first LLM call.
///
/// OpenAI embedding key is intentionally NOT validated here — embeddings degrade
/// gracefully to <c>NullEmbeddingGenerator</c> when the key is absent.
/// </summary>
internal sealed class AIOptionsValidator : IValidateOptions<AIOptions>
{
    private static readonly HashSet<string> SupportedProviders =
        new(StringComparer.OrdinalIgnoreCase) { "openai", "anthropic" };

    public ValidateOptionsResult Validate(string? name, AIOptions options)
    {
        if (!SupportedProviders.Contains(options.ChatProvider))
            return ValidateOptionsResult.Fail(
                $"AI:ChatProvider must be 'openai' or 'anthropic', got '{options.ChatProvider}'.");

        if (options.ChatProvider.Equals("openai", StringComparison.OrdinalIgnoreCase)
            && string.IsNullOrEmpty(options.OpenAI.ApiKey))
            return ValidateOptionsResult.Fail(
                "AI:OpenAI:ApiKey is required when AI:ChatProvider is 'openai'.");

        if (options.ChatProvider.Equals("anthropic", StringComparison.OrdinalIgnoreCase)
            && string.IsNullOrEmpty(options.Anthropic.ApiKey))
            return ValidateOptionsResult.Fail(
                "AI:Anthropic:ApiKey is required when AI:ChatProvider is 'anthropic'.");

        return ValidateOptionsResult.Success;
    }
}
