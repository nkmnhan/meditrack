using System.Text;
using System.Text.Json;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;

namespace Clara.API.Services;

/// <summary>
/// Corrective RAG service that grades retrieval relevance and rewrites queries when quality is poor.
/// Implements the CRAG (Corrective Retrieval Augmented Generation) pattern.
/// </summary>
public sealed class CorrectiveRagService : ICorrectiveRagService
{
    private const float RelevanceThreshold = 0.5f;

    private const string GradingPromptTemplate =
        """
        You are a relevance grader for a medical knowledge retrieval system.
        Given the QUERY and RETRIEVED DOCUMENTS, assess how relevant the documents are.

        Respond in JSON:
        {{"relevance_score": 0.0-1.0, "rewritten_query": "improved query if relevance < 0.5, omit if relevant"}}

        QUERY: {0}

        RETRIEVED DOCUMENTS:
        {1}
        """;

    private static readonly JsonSerializerOptions SnakeCaseJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    private readonly IKnowledgeService _knowledgeService;
    private readonly IChatClient _chatClient;
    private readonly ILogger<CorrectiveRagService> _logger;

    public CorrectiveRagService(
        IKnowledgeService knowledgeService,
        [FromKeyedServices("batch")] IChatClient chatClient,
        ILogger<CorrectiveRagService> logger)
    {
        _knowledgeService = knowledgeService;
        _chatClient = chatClient;
        _logger = logger;
    }

    /// <summary>
    /// Searches the knowledge base with LLM-based relevance grading.
    /// If the retrieved documents are insufficiently relevant and the grader provides a
    /// rewritten query, a second search is attempted with the improved query.
    /// Grading failures are swallowed — retrieval is never blocked by grading errors.
    /// </summary>
    public async Task<List<KnowledgeSearchResult>> SearchWithGradingAsync(
        string query,
        int topK = 3,
        float minScore = 0.7f,
        CancellationToken cancellationToken = default)
    {
        // Step 1: Initial retrieval
        var initialResults = await _knowledgeService.SearchAsync(query, topK, minScore, cancellationToken);

        // Step 2: Short-circuit — nothing to grade if no results came back
        if (initialResults.Count == 0)
        {
            _logger.LogDebug("No results for query '{Query}', skipping relevance grading", query);
            return initialResults;
        }

        // Step 3: Grade relevance with LLM
        GradingResponse grading;
        try
        {
            grading = await GradeRelevanceAsync(query, initialResults, cancellationToken);
        }
        catch (Exception exception)
        {
            // Fail safe — grading errors must never block suggestion generation
            _logger.LogWarning(
                exception,
                "Relevance grading failed for query '{Query}', falling back to original results",
                query);
            return initialResults;
        }

        _logger.LogDebug(
            "Relevance grading: query '{Query}', score {Score}, rewrite '{Rewrite}'",
            query,
            grading.RelevanceScore,
            grading.RewrittenQuery ?? "(none)");

        // Step 4: Accept if sufficiently relevant
        if (grading.RelevanceScore >= RelevanceThreshold)
        {
            return initialResults;
        }

        // Step 5: Retry with rewritten query when LLM provided one
        if (string.IsNullOrWhiteSpace(grading.RewrittenQuery))
        {
            _logger.LogDebug(
                "Low relevance ({Score}) for query '{Query}' but no rewrite provided, returning original results",
                grading.RelevanceScore,
                query);
            return initialResults;
        }

        _logger.LogInformation(
            "Low relevance ({Score}) — retrying with rewritten query '{RewrittenQuery}'",
            grading.RelevanceScore,
            grading.RewrittenQuery);

        var retryResults = await _knowledgeService.SearchAsync(
            grading.RewrittenQuery, topK, minScore, cancellationToken);

        // Step 6: Return retry results if any, otherwise fall back to original
        return retryResults.Count > 0 ? retryResults : initialResults;
    }

    private async Task<GradingResponse> GradeRelevanceAsync(
        string query,
        List<KnowledgeSearchResult> results,
        CancellationToken cancellationToken)
    {
        var documentSummary = BuildDocumentSummary(results);
        var gradingPrompt = string.Format(GradingPromptTemplate, query, documentSummary);

        var messages = new List<ChatMessage>
        {
            new(ChatRole.User, gradingPrompt)
        };

        var chatOptions = new ChatOptions
        {
            Temperature = 0.1f,
            MaxOutputTokens = 150,
            ResponseFormat = ChatResponseFormat.Json
        };

        var response = await _chatClient.GetResponseAsync(messages, chatOptions, cancellationToken);

        var responseText = response.Text;

        if (string.IsNullOrWhiteSpace(responseText))
        {
            _logger.LogWarning("Empty grading response from LLM, assuming relevant");
            return new GradingResponse();
        }

        return JsonSerializer.Deserialize<GradingResponse>(responseText, SnakeCaseJsonOptions)
               ?? new GradingResponse();
    }

    private static string BuildDocumentSummary(List<KnowledgeSearchResult> results)
    {
        var builder = new StringBuilder();
        for (int index = 0; index < results.Count; index++)
        {
            var result = results[index];
            builder.AppendLine($"[{index + 1}] {result.DocumentName} (score: {result.Score:F2})");
            builder.AppendLine(result.Content);
            if (index < results.Count - 1)
                builder.AppendLine();
        }
        return builder.ToString();
    }

    private sealed class GradingResponse
    {
        public float RelevanceScore { get; set; } = 1.0f;
        public string? RewrittenQuery { get; set; }
    }
}
