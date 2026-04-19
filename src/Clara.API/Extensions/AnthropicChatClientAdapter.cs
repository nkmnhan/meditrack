using System.Text.Json;
using System.Text.Json.Nodes;
using Anthropic.SDK;
using Anthropic.SDK.Common;
using Anthropic.SDK.Messaging;
using Microsoft.Extensions.AI;

namespace Clara.API.Extensions;

/// <summary>
/// Adapts Anthropic.SDK to Microsoft.Extensions.AI IChatClient (M.E.AI 10.x).
/// Supports text responses and tool/function calling for the Clara ReAct loop.
/// Streaming is not implemented — Clara uses single-turn GetResponseAsync calls.
/// </summary>
internal sealed class AnthropicChatClientAdapter : IChatClient
{
    private readonly AnthropicClient _client;
    private readonly string _model;

    public AnthropicChatClientAdapter(AnthropicClient client, string model)
    {
        _client = client;
        _model = model;
        Metadata = new ChatClientMetadata("Anthropic", (Uri?)null, model);
    }

    public ChatClientMetadata Metadata { get; }

    public async Task<ChatResponse> GetResponseAsync(
        IEnumerable<ChatMessage> messages,
        ChatOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var (anthropicMessages, systemPrompt) = MapMessages(messages.ToList());

        var parameters = new MessageParameters
        {
            Messages = anthropicMessages,
            Model = _model,
            MaxTokens = options?.MaxOutputTokens ?? 1024,
            Temperature = (decimal)(options?.Temperature ?? 1.0f),
            Stream = false,
        };

        if (systemPrompt != null)
            parameters.SystemMessage = systemPrompt;

        if (options?.Tools is { Count: > 0 })
            parameters.Tools = MapTools(options.Tools);

        var result = await _client.Messages.GetClaudeMessageAsync(parameters, cancellationToken);

        return MapResponse(result);
    }

    public async IAsyncEnumerable<ChatResponseUpdate> GetStreamingResponseAsync(
        IEnumerable<ChatMessage> messages,
        ChatOptions? options = null,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        // Anthropic SDK streaming requires additional work to map streamed events to M.E.AI updates.
        // This buffered fallback satisfies the IChatClient LSP contract by collecting the full
        // response and yielding it as a single update.
        var response = await GetResponseAsync(messages, options, cancellationToken);
        yield return new ChatResponseUpdate(ChatRole.Assistant, response.Text)
        {
            FinishReason = response.FinishReason,
            ModelId = response.ModelId
        };
    }

    public object? GetService(Type serviceType, object? key = null)
        => serviceType.IsInstanceOfType(this) ? this : null;

    public void Dispose() { }

    /// <summary>
    /// Splits M.E.AI messages into Anthropic messages + extracted system prompt.
    /// Anthropic requires the system prompt as a separate parameter, not in the message list.
    /// Tool result messages (ChatRole.Tool) are mapped to User messages with ToolResultContent.
    /// </summary>
    private static (List<Message> messages, string? systemPrompt) MapMessages(IList<ChatMessage> messages)
    {
        string? systemPrompt = null;
        var anthropicMessages = new List<Message>();

        foreach (var message in messages)
        {
            if (message.Role == ChatRole.System)
            {
                systemPrompt = message.Text;
                continue;
            }

            if (message.Role == ChatRole.Tool)
            {
                // Tool results must be User messages with ToolResultContent blocks
                var toolResultBlocks = message.Contents
                    .OfType<FunctionResultContent>()
                    .Select(fc => (ContentBase)new ToolResultContent
                    {
                        ToolUseId = fc.CallId ?? string.Empty,
                        Content = fc.Result?.ToString() ?? string.Empty
                    })
                    .ToList();

                if (toolResultBlocks.Count > 0)
                    anthropicMessages.Add(new Message { Role = RoleType.User, Content = toolResultBlocks });

                continue;
            }

            var role = message.Role == ChatRole.Assistant ? RoleType.Assistant : RoleType.User;

            // Assistant messages may contain tool call requests (FunctionCallContent)
            var toolCallBlocks = message.Contents.OfType<FunctionCallContent>().ToList();
            if (toolCallBlocks.Count > 0)
            {
                var content = new List<ContentBase>();

                if (message.Text is { Length: > 0 })
                    content.Add(new Anthropic.SDK.Messaging.TextContent { Text = message.Text });

                content.AddRange(toolCallBlocks.Select(tc => (ContentBase)new ToolUseContent
                {
                    Id = tc.CallId ?? string.Empty,
                    Name = tc.Name,
                    Input = tc.Arguments != null
                        ? JsonNode.Parse(JsonSerializer.Serialize(tc.Arguments))
                        : null
                }));

                anthropicMessages.Add(new Message { Role = role, Content = content });
                continue;
            }

            anthropicMessages.Add(new Message(role, message.Text ?? string.Empty));
        }

        return (anthropicMessages, systemPrompt);
    }

    /// <summary>
    /// Converts M.E.AI AIFunction tools to Anthropic Common.Tool definitions.
    /// Uses Function(name, description, JsonNode) constructor to carry the M.E.AI JSON schema.
    /// </summary>
    private static IList<Anthropic.SDK.Common.Tool> MapTools(IList<AITool> tools)
    {
        return tools
            .OfType<AIFunction>()
            .Select(fn =>
            {
                var schemaNode = JsonNode.Parse(fn.JsonSchema.GetRawText());
                var function = new Anthropic.SDK.Common.Function(
                    fn.Name,
                    fn.Description ?? string.Empty,
                    schemaNode!);
                return new Anthropic.SDK.Common.Tool(function);
            })
            .ToList();
    }

    /// <summary>
    /// Maps an Anthropic MessageResponse to a M.E.AI ChatResponse.
    /// Tool use blocks become FunctionCallContent; text blocks become TextContent.
    /// FinishReason is ToolCalls when the model requested tools, Stop otherwise.
    /// </summary>
    private static ChatResponse MapResponse(MessageResponse result)
    {
        var contents = new List<AIContent>();
        var hasToolCalls = false;

        foreach (var block in result.Content)
        {
            switch (block)
            {
                case Anthropic.SDK.Messaging.TextContent text:
                    contents.Add(new Microsoft.Extensions.AI.TextContent(text.Text));
                    break;

                case ToolUseContent toolUse:
                    hasToolCalls = true;
                    var args = toolUse.Input != null
                        ? JsonSerializer.Deserialize<Dictionary<string, object?>>(
                            toolUse.Input.ToJsonString()) ?? []
                        : new Dictionary<string, object?>();
                    contents.Add(new FunctionCallContent(
                        toolUse.Id ?? string.Empty,
                        toolUse.Name ?? string.Empty,
                        args));
                    break;
            }
        }

        var responseMessage = new ChatMessage(ChatRole.Assistant, contents);
        return new ChatResponse(responseMessage)
        {
            FinishReason = hasToolCalls ? ChatFinishReason.ToolCalls : ChatFinishReason.Stop,
            ModelId = result.Model
        };
    }
}
