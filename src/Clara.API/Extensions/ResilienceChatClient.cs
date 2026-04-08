using Microsoft.Extensions.AI;
using Polly;

namespace Clara.API.Extensions;

/// <summary>
/// Wraps any IChatClient with a Polly resilience pipeline (retry + timeout).
/// Sits outermost in the ChatClientBuilder pipeline so telemetry and logging
/// capture the final outcome after all retries.
/// </summary>
internal sealed class ResilienceChatClient : DelegatingChatClient
{
    private readonly ResiliencePipeline<ChatResponse> _pipeline;

    public ResilienceChatClient(IChatClient inner, ResiliencePipeline<ChatResponse> pipeline)
        : base(inner)
    {
        _pipeline = pipeline;
    }

    public override Task<ChatResponse> GetResponseAsync(
        IEnumerable<ChatMessage> messages,
        ChatOptions? options = null,
        CancellationToken cancellationToken = default)
        => _pipeline.ExecuteAsync(
            async ct => await base.GetResponseAsync(messages, options, ct),
            cancellationToken).AsTask();
}
