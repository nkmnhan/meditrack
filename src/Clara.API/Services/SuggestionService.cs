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
/// Generates AI suggestions using a ReAct agent loop.
/// The LLM decides which tools to call (search_knowledge, get_patient_context)
/// rather than always running both regardless of relevance.
/// Uses IChatClient (Microsoft.Extensions.AI) for LLM-agnostic integration.
/// </summary>
public sealed partial class SuggestionService : ISuggestionService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ClaraDbContext _db;
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
        IPatientContextService patientContextService,
        SkillLoaderService skillLoaderService,
        ILogger<SuggestionService> logger)
    {
        _serviceProvider = serviceProvider;
        _db = db;
        _patientContextService = patientContextService;
        _skillLoaderService = skillLoaderService;
        _logger = logger;
        _systemPrompt = LoadSystemPrompt();
    }

    /// <summary>
    /// Generates AI suggestions for a session using a ReAct agent loop.
    /// The LLM decides which tools to invoke based on the conversation content.
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

            // Detect matching clinical skill
            var matchingSkill = _skillLoaderService.FindMatchingSkill(conversationText);

            // Build agent prompt — tools provide context on demand
            var prompt = BuildAgentPrompt(conversationText, session.PatientId, matchingSkill);

            // Create agent tools scoped to this request
            var agentTools = new AgentTools(
                _serviceProvider.GetRequiredService<ICorrectiveRagService>(),
                _patientContextService,
                _serviceProvider.GetRequiredService<ILogger<AgentTools>>());

            // Resolve keyed chat client and wrap with function invocation
            var chatClientKey = source == SuggestionSourceEnum.OnDemand ? "ondemand" : "batch";
            var innerClient = _serviceProvider.GetRequiredKeyedService<IChatClient>(chatClientKey);
            var agentClient = new ChatClientBuilder(innerClient)
                .UseFunctionInvocation()
                .Build();

            // ReAct loop — LLM decides which tools to call, M.E.AI handles the loop
            var messages = new List<ChatMessage>
            {
                new(ChatRole.System, _systemPrompt),
                new(ChatRole.User, prompt)
            };

            var chatOptions = new ChatOptions
            {
                Tools = agentTools.CreateAITools(),
                Temperature = 0.3f,
                MaxOutputTokens = 500,
                ResponseFormat = ChatResponseFormat.Json,
            };

            var response = await agentClient.GetResponseAsync(messages, chatOptions, cancellationToken);
            var responseText = response.Text;

            stopwatch.Stop();

            if (string.IsNullOrWhiteSpace(responseText))
            {
                _logger.LogWarning("Empty response from agent loop for session {SessionId}", sessionId);
                return [];
            }

            if (response.Usage != null)
            {
                _logger.LogInformation(
                    "Agent loop: input={InputTokens}, output={OutputTokens}, latency={LatencyMs}ms",
                    response.Usage.InputTokenCount,
                    response.Usage.OutputTokenCount,
                    stopwatch.ElapsedMilliseconds);
            }

            var llmResponse = ParseLlmResponse(responseText, _logger);

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
                    Reasoning = suggestionOutput.Reasoning,
                    TriggeredAt = DateTimeOffset.UtcNow,
                    SourceTranscriptLineIds = sourceLineIds
                };

                _db.Suggestions.Add(suggestion);
                suggestions.Add(suggestion);
            }

            await _db.SaveChangesAsync(cancellationToken);

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
            Reasoning = suggestion.Reasoning,
            SourceTranscriptLineIds = suggestion.SourceTranscriptLineIds,
            AcceptedAt = suggestion.AcceptedAt,
            DismissedAt = suggestion.DismissedAt
        };
    }

    /// <summary>
    /// Builds the agent prompt. Tools provide knowledge and patient context on demand —
    /// the LLM decides what to fetch based on the conversation content.
    /// </summary>
    internal static string BuildAgentPrompt(
        string conversationText,
        string? patientId,
        ClinicalSkill? matchingSkill)
    {
        var parts = new List<string>
        {
            "## Current Conversation\n<TRANSCRIPT>",
            conversationText,
            "</TRANSCRIPT>"
        };

        if (!string.IsNullOrWhiteSpace(patientId))
        {
            parts.Add($"\nPatient ID for context lookup: {patientId}");
            parts.Add("Use the get_patient_context tool if the conversation references patient history, medications, or allergies.");
        }

        parts.Add("\nUse the search_knowledge tool if you need clinical guidelines to support your suggestions.");

        if (matchingSkill != null)
        {
            parts.Add($"\n## Active Clinical Skill: {matchingSkill.Name}");
            parts.Add(matchingSkill.Content);
        }

        parts.Add("\nBased on the above, provide your clinical suggestions:");
        return string.Join("\n\n", parts);
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
    public string? Reasoning { get; set; }
}
