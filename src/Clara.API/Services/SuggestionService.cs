using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using Clara.API.Data;
using Clara.API.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;

namespace Clara.API.Services;

/// <summary>
/// Generates AI suggestions using LLM with RAG context and patient information.
/// Uses IChatClient (Microsoft.Extensions.AI) for LLM-agnostic integration.
/// </summary>
public sealed partial class SuggestionService : ISuggestionService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ClaraDbContext _db;
    private readonly IKnowledgeService _knowledgeService;
    private readonly IPatientContextService _patientContextService;
    private readonly SkillLoaderService _skillLoaderService;
    private readonly ILogger<SuggestionService> _logger;
    private readonly string _systemPrompt;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    [GeneratedRegex("<[^>]+>")]
    private static partial Regex HtmlTagPattern();

    private static string StripHtmlTags(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;
        return HtmlTagPattern().Replace(input, "");
    }

    public SuggestionService(
        IServiceProvider serviceProvider,
        ClaraDbContext db,
        IKnowledgeService knowledgeService,
        IPatientContextService patientContextService,
        SkillLoaderService skillLoaderService,
        ILogger<SuggestionService> logger)
    {
        _serviceProvider = serviceProvider;
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
    /// <param name="source">Trigger source: Batch (auto) or OnDemand (user-requested).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of generated suggestions.</returns>
    public async Task<List<Suggestion>> GenerateSuggestionsAsync(
        Guid sessionId,
        SuggestionSourceEnum source,
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

            // Resolve the appropriate keyed IChatClient based on suggestion source
            var chatClientKey = source == SuggestionSourceEnum.OnDemand ? "ondemand" : "batch";
            var chatClient = _serviceProvider.GetRequiredKeyedService<IChatClient>(chatClientKey);

            // Call LLM
            var llmResponse = await CallLlmAsync(chatClient, prompt, cancellationToken);

            if (llmResponse == null || llmResponse.Suggestions.Count == 0)
            {
                _logger.LogDebug("No suggestions generated for session {SessionId}", sessionId);
                return [];
            }

            // Save suggestions to DB
            var suggestions = new List<Suggestion>();
            var sourceLineIds = recentLines.Select(line => line.Id).ToList();

            foreach (var suggestionOutput in llmResponse.Suggestions)
            {
                var suggestion = new Suggestion
                {
                    Id = Guid.NewGuid(),
                    SessionId = sessionId,
                    Content = suggestionOutput.Content,
                    Type = EnumConversions.ParseSuggestionType(suggestionOutput.Type),
                    Source = source,
                    Urgency = EnumConversions.ParseSuggestionUrgency(suggestionOutput.Urgency),
                    Confidence = suggestionOutput.Confidence,
                    TriggeredAt = DateTimeOffset.UtcNow,
                    SourceTranscriptLineIds = sourceLineIds
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
            return []; // Return empty list on error
        }
    }

    /// <summary>
    /// Accepts a suggestion. Enforces idempotency — throws if already acted upon.
    /// </summary>
    public async Task<Application.Models.SuggestionResponse> AcceptSuggestionAsync(
        Guid sessionId,
        Guid suggestionId,
        string doctorId,
        CancellationToken cancellationToken = default)
    {
        var suggestion = await GetValidatedSuggestionAsync(sessionId, suggestionId, doctorId, cancellationToken);
        suggestion.Accept();
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Suggestion {SuggestionId} accepted in session {SessionId}", suggestionId, sessionId);

        return MapToResponse(suggestion);
    }

    /// <summary>
    /// Dismisses a suggestion. Enforces idempotency — throws if already acted upon.
    /// </summary>
    public async Task<Application.Models.SuggestionResponse> DismissSuggestionAsync(
        Guid sessionId,
        Guid suggestionId,
        string doctorId,
        CancellationToken cancellationToken = default)
    {
        var suggestion = await GetValidatedSuggestionAsync(sessionId, suggestionId, doctorId, cancellationToken);
        suggestion.Dismiss();
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Suggestion {SuggestionId} dismissed in session {SessionId}", suggestionId, sessionId);

        return MapToResponse(suggestion);
    }

    private async Task<Suggestion> GetValidatedSuggestionAsync(
        Guid sessionId,
        Guid suggestionId,
        string doctorId,
        CancellationToken cancellationToken)
    {
        // Validate session ownership
        var isOwner = await _db.Sessions
            .AnyAsync(s => s.Id == sessionId && s.DoctorId == doctorId, cancellationToken);

        if (!isOwner)
            throw new UnauthorizedAccessException("Session not found or access denied");

        var suggestion = await _db.Suggestions
            .FirstOrDefaultAsync(s => s.Id == suggestionId && s.SessionId == sessionId, cancellationToken)
            ?? throw new KeyNotFoundException($"Suggestion {suggestionId} not found in session {sessionId}");

        return suggestion;
    }

    private static Application.Models.SuggestionResponse MapToResponse(Suggestion suggestion)
    {
        return new Application.Models.SuggestionResponse
        {
            Id = suggestion.Id,
            Content = suggestion.Content,
            TriggeredAt = suggestion.TriggeredAt,
            Type = suggestion.Type.ToValue(),
            Source = suggestion.Source.ToValue(),
            Urgency = suggestion.Urgency?.ToValue(),
            Confidence = suggestion.Confidence,
            SourceTranscriptLineIds = suggestion.SourceTranscriptLineIds,
            AcceptedAt = suggestion.AcceptedAt,
            DismissedAt = suggestion.DismissedAt
        };
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

    internal static string BuildPrompt(
        string conversationText,
        string knowledgeContext,
        PatientContext? patientContext,
        ClinicalSkill? matchingSkill)
    {
        var parts = new List<string>
        {
            "## Current Conversation\n<TRANSCRIPT>",
            conversationText,
            "</TRANSCRIPT>"
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
                parts.Add("<PATIENT_CONTEXT>");
                parts.Add(patientSection);
                parts.Add("</PATIENT_CONTEXT>");
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
        IChatClient chatClient,
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

            var chatOptions = new ChatOptions
            {
                Temperature = 0.3f,
                MaxOutputTokens = 300,
                ResponseFormat = ChatResponseFormat.Json,
            };

            var response = await chatClient.GetResponseAsync(
                messages,
                chatOptions,
                cancellationToken);

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
            var result = ParseLlmResponse(responseText, _logger);
            return result;
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "LLM call failed after {ElapsedMs}ms", stopwatch.ElapsedMilliseconds);
            return null;
        }
    }

    internal static SuggestionLlmResponse? ParseLlmResponse(string responseText, ILogger logger)
    {
        try
        {
            // Try to extract JSON from the response (LLM might include markdown)
            var jsonStart = responseText.IndexOf('{');
            var jsonEnd = responseText.LastIndexOf('}');

            if (jsonStart == -1 || jsonEnd == -1 || jsonEnd <= jsonStart)
            {
                logger.LogWarning("No valid JSON found in LLM response (length: {Length})", responseText.Length);
                return null;
            }

            var jsonText = responseText[jsonStart..(jsonEnd + 1)];
            var result = JsonSerializer.Deserialize<SuggestionLlmResponse>(jsonText, JsonOptions);

            if (result?.Suggestions == null || result.Suggestions.Count == 0)
            {
                logger.LogWarning("Parsed JSON has no suggestions (length: {Length})", jsonText.Length);
                return null;
            }

            // Validate and sanitize suggestions
            foreach (var suggestion in result.Suggestions)
            {
                // Strip HTML tags (XSS prevention — OWASP A05:2025)
                suggestion.Content = StripHtmlTags(suggestion.Content ?? string.Empty);

                // Truncate content to reasonable length
                if (suggestion.Content.Length > 1000)
                    suggestion.Content = suggestion.Content[..1000];

                // Whitelist type values
                suggestion.Type = SuggestionType.All.Contains(suggestion.Type, StringComparer.OrdinalIgnoreCase)
                    ? suggestion.Type
                    : SuggestionType.Clinical;

                // Whitelist urgency values
                suggestion.Urgency = SuggestionUrgency.All.Contains(suggestion.Urgency, StringComparer.OrdinalIgnoreCase)
                    ? suggestion.Urgency
                    : SuggestionUrgency.Medium;

                suggestion.Confidence = suggestion.Confidence is < 0 or > 1 ? 0.5f : suggestion.Confidence;
            }

            // Remove empty-content suggestions
            result.Suggestions.RemoveAll(s => string.IsNullOrWhiteSpace(s.Content));

            return result;
        }
        catch (JsonException exception)
        {
            logger.LogWarning(exception, "Failed to parse LLM response as JSON (length: {Length})", responseText.Length);
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
