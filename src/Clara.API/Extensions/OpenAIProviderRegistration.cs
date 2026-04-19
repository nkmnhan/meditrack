using System.ClientModel;
using Clara.API.Application.Models;
using Clara.API.Health;
using Microsoft.Extensions.AI;
using OpenAI;

namespace Clara.API.Extensions;

internal sealed class OpenAIProviderRegistration : IAIProviderRegistration
{
    public string ProviderName => AIProviderNames.OpenAI;

    public IChatClient CreateChatClient(AIOptions opts, string model)
    {
        if (string.IsNullOrEmpty(opts.OpenAI.ApiKey))
            throw new InvalidOperationException("AI:OpenAI:ApiKey is not configured");

        return new OpenAIClient(new ApiKeyCredential(opts.OpenAI.ApiKey))
            .GetChatClient(model)
            .AsIChatClient();
    }

    public IAiProviderHealthCheck CreateHealthCheck(IHttpClientFactory factory)
        => new OpenAIProviderHealthCheck(factory);
}
