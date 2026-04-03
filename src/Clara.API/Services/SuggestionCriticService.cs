using System.Text;
using System.Text.Json;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;

namespace Clara.API.Services;

/// <summary>
/// Verifies AI-generated suggestions against the session transcript to catch hallucinations.
/// Implements the Reflection/Critique pattern: a second LLM call checks each suggestion for
/// transcript support and removes or revises unsupported claims.
/// Failures are swallowed — suggestion generation is never blocked by critic errors.
/// </summary>
internal sealed class SuggestionCriticService : ISuggestionCriticService
{
    private static readonly JsonSerializerOptions SnakeCaseJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true
    };

    private readonly IChatClient _chatClient;
    private readonly ILogger<SuggestionCriticService> _logger;
    private readonly string _criticPrompt;

    public SuggestionCriticService(
        [FromKeyedServices("batch")] IChatClient chatClient,
        ILogger<SuggestionCriticService> logger)
    {
        _chatClient = chatClient;
        _logger = logger;
        _criticPrompt = LoadCriticPrompt();
    }

    /// <summary>
    /// Critiques a list of suggestions against the transcript.
    /// Unsupported suggestions are removed; supported ones with improved content are revised.
    /// Any failure returns the original suggestions unchanged (graceful degradation).
    /// </summary>
    public async Task<List<SuggestionItem>> CritiqueAsync(
        List<SuggestionItem> suggestions,
        string transcript,
        CancellationToken cancellationToken = default)
    {
        if (suggestions.Count == 0)
            return suggestions;

        try
        {
            var formattedSuggestions = FormatSuggestionsForPrompt(suggestions);
            var prompt = string.Format(_criticPrompt, transcript, formattedSuggestions);

            var messages = new List<ChatMessage>
            {
                new(ChatRole.User, prompt)
            };

            var chatOptions = new ChatOptions
            {
                Temperature = 0.1f,
                MaxOutputTokens = 500,
                ResponseFormat = ChatResponseFormat.Json
            };

            var response = await _chatClient.GetResponseAsync(messages, chatOptions, cancellationToken);
            var responseText = response.Text;

            if (string.IsNullOrWhiteSpace(responseText))
            {
                _logger.LogWarning("Empty response from critic LLM, returning original {Count} suggestions", suggestions.Count);
                return suggestions;
            }

            var criticResponse = JsonSerializer.Deserialize<CriticResponse>(responseText, SnakeCaseJsonOptions);

            if (criticResponse?.CritiquedSuggestions == null || criticResponse.CritiquedSuggestions.Count == 0)
            {
                _logger.LogWarning("Critic returned no judgments, returning original {Count} suggestions", suggestions.Count);
                return suggestions;
            }

            return ApplyJudgments(suggestions, criticResponse.CritiquedSuggestions);
        }
        catch (Exception exception)
        {
            // Fail safe — critic errors must never block suggestion generation
            _logger.LogWarning(
                exception,
                "Suggestion critic failed, returning original {Count} suggestions unchanged",
                suggestions.Count);
            return suggestions;
        }
    }

    private List<SuggestionItem> ApplyJudgments(
        List<SuggestionItem> suggestions,
        List<CriticJudgment> judgments)
    {
        var verifiedSuggestions = new List<SuggestionItem>();
        var removedCount = 0;
        var revisedCount = 0;

        // Pair each suggestion with its judgment by index position
        var pairCount = Math.Min(suggestions.Count, judgments.Count);

        for (int index = 0; index < pairCount; index++)
        {
            var suggestion = suggestions[index];
            var judgment = judgments[index];

            if (!judgment.Supported)
            {
                removedCount++;
                _logger.LogDebug(
                    "Critic removed unsupported suggestion: '{Content}'",
                    suggestion.Content);
                continue;
            }

            if (!string.IsNullOrWhiteSpace(judgment.RevisedContent))
            {
                suggestion.Content = judgment.RevisedContent;
                revisedCount++;
                _logger.LogDebug(
                    "Critic revised suggestion content to: '{RevisedContent}'",
                    judgment.RevisedContent);
            }

            verifiedSuggestions.Add(suggestion);
        }

        _logger.LogInformation(
            "Critic summary: {Total} total → {Kept} kept, {Removed} removed, {Revised} revised",
            suggestions.Count,
            verifiedSuggestions.Count,
            removedCount,
            revisedCount);

        return verifiedSuggestions;
    }

    private static string FormatSuggestionsForPrompt(List<SuggestionItem> suggestions)
    {
        var builder = new StringBuilder();
        for (int index = 0; index < suggestions.Count; index++)
        {
            builder.AppendLine($"{index + 1}. {suggestions[index].Content}");
        }
        return builder.ToString();
    }

    private static string LoadCriticPrompt()
    {
        var promptPath = Path.Combine(AppContext.BaseDirectory, "Prompts", "critic.txt");

        if (!File.Exists(promptPath))
        {
            throw new FileNotFoundException(
                $"Critic prompt file not found at {promptPath}. Ensure Prompts/critic.txt is included in the build output.");
        }

        return File.ReadAllText(promptPath);
    }

    private sealed class CriticResponse
    {
        public List<CriticJudgment> CritiquedSuggestions { get; set; } = [];
    }

    private sealed class CriticJudgment
    {
        public string Content { get; set; } = string.Empty;
        public bool Supported { get; set; }
        public string? RevisedContent { get; set; }
    }
}
