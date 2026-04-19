using Anthropic.SDK;
using Clara.API.Application.Models;
using Clara.API.Health;
using Microsoft.Extensions.AI;

namespace Clara.API.Extensions;

internal sealed class AnthropicProviderRegistration : IAIProviderRegistration
{
    public string ProviderName => AIProviderNames.Anthropic;

    public IChatClient CreateChatClient(AIOptions opts, string model)
    {
        if (string.IsNullOrEmpty(opts.Anthropic.ApiKey))
            throw new InvalidOperationException("AI:Anthropic:ApiKey is not configured");

        return new AnthropicChatClientAdapter(new AnthropicClient(opts.Anthropic.ApiKey), model);
    }

    public IAiProviderHealthCheck CreateHealthCheck(IHttpClientFactory factory)
        => new AnthropicProviderHealthCheck(factory);
}
