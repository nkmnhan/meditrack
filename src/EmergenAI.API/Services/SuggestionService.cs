using System.Diagnostics;
using System.Text.Json;
using EmergenAI.API.Data;
using EmergenAI.API.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;

namespace EmergenAI.API.Services;

/// <summary>
/// Generates AI suggestions using LLM with RAG context and patient information.
/// Uses IChatClient (Microsoft.Extensions.AI) for LLM-agnostic integration.
/// </summary>
public sealed class SuggestionService
{
    private readonly IChatClient _chatClient;
    private readonly EmergenDbContext _db;
    private readonly KnowledgeService _knowledgeService;
    private readonly PatientContextService _patientContextService;
    private readonly SkillLoaderService _skillLoaderService;
    private readonly ILogger<SuggestionService> _logger;
    private readonly string _systemPrompt;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public SuggestionService(
        IChatClient chatClient,
        EmergenDbContext db,
        KnowledgeService knowledgeService,
        PatientContextService patientContextService,
        SkillLoaderService skillLoaderService,
        ILogger<SuggestionService> logger)
    {
        _chatClient = chatClient;
        _db = db;
        _knowledgeService = knowledgeService;
        _patientContextService = patientContextService;
        _skillLoaderService = skillLoaderService;
        _logger = logger;
        _systemPrompt = LoadSystemPrompt();
    }

    /// <summary>
    /// Generates AI suggestions for a session.
    /// </summary>
    /// <param name="sessionId">The session to generate suggestions for.</param>
    /// <param name="source">Trigger source: "batch" (auto) or "on_demand" (user-requested).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of generated suggestions.</returns>
    public async Task<List<Suggestion>> GenerateSuggestionsAsync(
        Guid sessionId,
        string source,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            // Load session with recent transcript lines
            var session = await _db.Sessions
                .Include(session => session.TranscriptLines
                    .OrderByDescending(line => line.Timestamp)
                    .Take(10))
                .FirstOrDefaultAsync(session => session.Id == sessionId, cancellationToken);

            if (session == null)
            {
                _logger.LogWarning("Session {SessionId} not found for suggestion generation", sessionId);
                return [];
            }

            // Build conversation text from recent lines
            var recentLines = session.TranscriptLines
                .OrderBy(line => line.Timestamp)
                .ToList();

            if (recentLines.Count == 0)
            {
                _logger.LogDebug("No transcript lines for session {SessionId}, skipping suggestion", sessionId);
                return [];
            }

            var conversationText = string.Join("\n", recentLines.Select(line =>
                $"[{line.Speaker}]: {line.Text}"));

            // Gather context in parallel
            var knowledgeTask = GatherKnowledgeContextAsync(conversationText, cancellationToken);
            var patientTask = session.PatientId != null
                ? _patientContextService.GetPatientContextAsync(session.PatientId, cancellationToken)
                : Task.FromResult<PatientContext?>(null);

            await Task.WhenAll(knowledgeTask, patientTask);

            var knowledgeContext = await knowledgeTask;
            var patientContext = await patientTask;

            // Detect matching clinical skill
            var matchingSkill = _skillLoaderService.FindMatchingSkill(conversationText);

            // Build the prompt
            var prompt = BuildPrompt(conversationText, knowledgeContext, patientContext, matchingSkill);

            // Call LLM
            var llmResponse = await CallLlmAsync(prompt, cancellationToken);

            if (llmResponse == null || llmResponse.Suggestions.Count == 0)
            {
                _logger.LogDebug("No suggestions generated for session {SessionId}", sessionId);
                return [];
            }

            // Save suggestions to DB
            var suggestions = new List<Suggestion>();

            foreach (var suggestionOutput in llmResponse.Suggestions)
            {
                var suggestion = new Suggestion
                {
                    Id = Guid.NewGuid(),
                    SessionId = sessionId,
                    Content = suggestionOutput.Content,
                    Type = suggestionOutput.Type,
                    Source = source,
                    Urgency = suggestionOutput.Urgency,
                    Confidence = suggestionOutput.Confidence,
                    TriggeredAt = DateTimeOffset.UtcNow
                };

                _db.Suggestions.Add(suggestion);
                suggestions.Add(suggestion);
            }

            await _db.SaveChangesAsync(cancellationToken);

            stopwatch.Stop();

            _logger.LogInformation(
                "Generated {SuggestionCount} suggestions for session {SessionId} ({Source}) in {ElapsedMs}ms. Skill: {Skill}",
                suggestions.Count,
                sessionId,
                source,
                stopwatch.ElapsedMilliseconds,
                matchingSkill?.Id ?? "none");

            return suggestions;
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Failed to generate suggestions for session {SessionId}",
                sessionId);
            return null; // Return null to indicate error
        }
    }

    private async Task<string> GatherKnowledgeContextAsync(
        string conversationText,
        CancellationToken cancellationToken)
    {
        try
        {
            var results = await _knowledgeService.SearchForContextAsync(
                conversationText,
                topK: 3,
                cancellationToken);

            if (results.Count == 0)
            {
                return "";
            }

            var contextParts = results.Select(result =>
                $"[Source: {result.DocumentName}]\n{result.Content}");

            return $"## Relevant Medical Guidelines\n\n{string.Join("\n\n", contextParts)}";
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Failed to gather knowledge context, continuing without it");
            return "";
        }
    }

    private static string BuildPrompt(
        string conversationText,
        string knowledgeContext,
        PatientContext? patientContext,
        ClinicalSkill? matchingSkill)
    {
        var parts = new List<string>
        {
            "## Current Conversation",
            conversationText
        };

        if (!string.IsNullOrWhiteSpace(knowledgeContext))
        {
            parts.Add(knowledgeContext);
        }

        if (patientContext != null)
        {
            var patientSection = patientContext.ToPromptSection();
            if (!string.IsNullOrWhiteSpace(patientSection))
            {
                parts.Add(patientSection);
            }
        }

        if (matchingSkill != null)
        {
            parts.Add($"## Active Clinical Skill: {matchingSkill.Name}");
            parts.Add(matchingSkill.Content);
        }

        parts.Add("\nBased on the above, provide your clinical suggestions:");

        return string.Join("\n\n", parts);
    }

    private async Task<SuggestionLlmResponse?> CallLlmAsync(
        string userPrompt,
        CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            var messages = new List<ChatMessage>
            {
                new(ChatRole.System, _systemPrompt),
                new(ChatRole.User, userPrompt)
            };

            var response = await _chatClient.GetResponseAsync(
                messages,
                cancellationToken: cancellationToken);

            stopwatch.Stop();

            // Extract text content from response
            var responseText = response.Text;

            if (string.IsNullOrWhiteSpace(responseText))
            {
                _logger.LogWarning("Empty response from LLM");
                return null;
            }

            // Log token usage for cost tracking
            if (response.Usage != null)
            {
                _logger.LogInformation(
                    "LLM call completed: input tokens {InputTokens}, output tokens {OutputTokens}, latency {LatencyMs}ms",
                    response.Usage.InputTokenCount,
                    response.Usage.OutputTokenCount,
                    stopwatch.ElapsedMilliseconds);
            }

            // Parse JSON response
            var result = ParseLlmResponse(responseText);
            return result;
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "LLM call failed after {ElapsedMs}ms", stopwatch.ElapsedMilliseconds);
            return null;
        }
    }

    private SuggestionLlmResponse? ParseLlmResponse(string responseText)
    {
        try
        {
            // Try to extract JSON from the response (LLM might include markdown)
            var jsonStart = responseText.IndexOf('{');
            var jsonEnd = responseText.LastIndexOf('}');

            if (jsonStart == -1 || jsonEnd == -1 || jsonEnd <= jsonStart)
            {
                _logger.LogWarning("No valid JSON found in LLM response: {Response}", responseText);
                return null;
            }

            var jsonText = responseText[jsonStart..(jsonEnd + 1)];
            var result = JsonSerializer.Deserialize<SuggestionLlmResponse>(jsonText, JsonOptions);

            if (result?.Suggestions == null || result.Suggestions.Count == 0)
            {
                _logger.LogWarning("Parsed JSON has no suggestions: {Json}", jsonText);
                return null;
            }

            // Validate suggestions
            foreach (var suggestion in result.Suggestions)
            {
                // Sanitize and default values
                suggestion.Type = string.IsNullOrWhiteSpace(suggestion.Type) ? "clinical" : suggestion.Type;
                suggestion.Urgency = string.IsNullOrWhiteSpace(suggestion.Urgency) ? "medium" : suggestion.Urgency;
                suggestion.Confidence = suggestion.Confidence is < 0 or > 1 ? 0.5f : suggestion.Confidence;
            }

            // Remove empty-content suggestions
            result.Suggestions.RemoveAll(s => string.IsNullOrWhiteSpace(s.Content));

            return result;
        }
        catch (JsonException exception)
        {
            _logger.LogWarning(exception, "Failed to parse LLM response as JSON: {Response}", responseText);
            return null;
        }
    }

    private static string LoadSystemPrompt()
    {
        var promptPath = Path.Combine(AppContext.BaseDirectory, "Prompts", "system.txt");

        if (!File.Exists(promptPath))
        {
            throw new FileNotFoundException(
                $"System prompt file not found at {promptPath}. Ensure Prompts/system.txt is included in the build output.");
        }

        return File.ReadAllText(promptPath);
    }
}

/// <summary>
/// Expected JSON structure from LLM response.
/// </summary>
internal sealed class SuggestionLlmResponse
{
    public List<SuggestionItem> Suggestions { get; set; } = [];
}

/// <summary>
/// A single suggestion item from LLM.
/// </summary>
internal sealed class SuggestionItem
{
    public required string Content { get; set; }
    public string Type { get; set; } = "clinical";
    public string Urgency { get; set; } = "medium";
    public float Confidence { get; set; } = 0.5f;
}
