namespace Clara.API.Application.Models;

/// <summary>
/// Strongly-typed options for AI provider configuration.
/// Bound from the "AI" config section via IOptions&lt;AIOptions&gt;.
/// </summary>
public sealed class AIOptions
{
    public const string SectionName = "AI";

    /// <summary>"openai" (default) or "anthropic"</summary>
    public string ChatProvider { get; set; } = "openai";

    /// <summary>Cost-optimised model used for 90% of batch suggestions.</summary>
    public string BatchModel { get; set; } = "gpt-4o-mini";

    /// <summary>Accuracy-optimised model used for 10% of on-demand calls.</summary>
    public string OnDemandModel { get; set; } = "gpt-4o";

    public OpenAIProviderOptions OpenAI { get; set; } = new();
    public AnthropicProviderOptions Anthropic { get; set; } = new();

    public sealed class OpenAIProviderOptions
    {
        public string ApiKey { get; set; } = string.Empty;
        public string EmbeddingModel { get; set; } = "text-embedding-3-small";

        /// <summary>True when the key is present and not a placeholder value.</summary>
        public bool IsConfigured =>
            !string.IsNullOrEmpty(ApiKey) && !ApiKey.StartsWith("sk-placeholder");
    }

    public sealed class AnthropicProviderOptions
    {
        public string ApiKey { get; set; } = string.Empty;
    }
}
