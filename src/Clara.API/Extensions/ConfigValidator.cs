namespace Clara.API.Extensions;

/// <summary>
/// Validates configuration values to prevent placeholder secrets in production.
/// </summary>
public static class ConfigValidator
{
    private static readonly string[] PlaceholderValues =
    [
        "REPLACE_IN_OVERRIDE",
        "sk-placeholder-for-dev",
        "placeholder-for-dev"
    ];

    public static bool IsRealApiKey(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        return !PlaceholderValues.Contains(value, StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Validates critical config values on startup. Throws in Production if placeholders remain.
    /// Checks the active provider's key only — Anthropic deployments don't need an OpenAI key.
    /// </summary>
    public static void ValidateProductionConfig(IConfiguration configuration, IHostEnvironment environment)
    {
        if (!environment.IsProduction())
            return;

        var provider = configuration["AI:ChatProvider"] ?? AIProviderNames.OpenAI;
        var activeKeyPath = provider.Equals(AIProviderNames.Anthropic, StringComparison.OrdinalIgnoreCase)
            ? "AI:Anthropic:ApiKey"
            : "AI:OpenAI:ApiKey";

        if (!IsRealApiKey(configuration[activeKeyPath]))
            throw new InvalidOperationException(
                $"{activeKeyPath} is a placeholder. Set a real API key for production.");

        if (!IsRealApiKey(configuration["AI:Deepgram:ApiKey"]))
            throw new InvalidOperationException(
                "AI:Deepgram:ApiKey is a placeholder. Set a real API key for production.");
    }
}
