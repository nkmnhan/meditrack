using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using Clara.API.Application.Models;
using Clara.API.Data;
using Clara.API.Domain;
using Microsoft.EntityFrameworkCore;

namespace Clara.API.Services;

/// <summary>
/// Thin orchestrator for AI-driven suggestion generation.
/// Responsibilities: load session transcript, build agent context, delegate to IAgentService,
/// persist returned suggestions, and handle accept/dismiss lifecycle.
/// All AI reasoning logic lives in the agent (ClaraDoctorAgent).
/// </summary>
public sealed partial class SuggestionService : ISuggestionService
{
    private readonly ClaraDbContext _db;
    private readonly IAgentService _agent;
    private readonly SkillLoaderService _skillLoaderService;
    private readonly ILogger<SuggestionService> _logger;

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
        ClaraDbContext db,
        IAgentService agent,
        SkillLoaderService skillLoaderService,
        ILogger<SuggestionService> logger)
    {
        _db = db;
        _agent = agent;
        _skillLoaderService = skillLoaderService;
        _logger = logger;
    }

    /// <summary>
    /// Generates AI suggestions for a session by delegating to the agent.
    /// Handles data loading and DB persistence; agent handles all AI reasoning.
    /// </summary>
    public async Task<List<Suggestion>> GenerateSuggestionsAsync(
        Guid sessionId,
        SuggestionSourceEnum source,
        Func<AgentEvent, Task>? onAgentEvent = null,
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

            // Delegate reasoning to the agent
            var agentContext = new AgentContext
            {
                SessionId = sessionId,
                ConversationText = conversationText,
                PatientId = session.PatientId,
                Source = source,
                MatchingSkill = matchingSkill
            };

            var verifiedItems = await _agent.ProcessAsync(agentContext, onAgentEvent, cancellationToken);

            if (verifiedItems.Count == 0)
                return [];

            // Save verified suggestions to DB
            var suggestions = new List<Suggestion>();
            var sourceLineIds = recentLines.Select(line => line.Id).ToList();

            foreach (var suggestionItem in verifiedItems)
            {
                var suggestion = new Suggestion
                {
                    Id = Guid.NewGuid(),
                    SessionId = sessionId,
                    Content = suggestionItem.Content,
                    Type = EnumConversions.ParseSuggestionType(suggestionItem.Type),
                    Source = source,
                    Urgency = EnumConversions.ParseSuggestionUrgency(suggestionItem.Urgency),
                    Confidence = suggestionItem.Confidence,
                    Reasoning = suggestionItem.Reasoning,
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

            if (onAgentEvent != null)
                await onAgentEvent(new AgentEvent.Failed(exception.Message));

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
    /// Parses the LLM JSON response into a structured suggestion list.
    /// Kept on SuggestionService as a static utility shared by all agent implementations
    /// (e.g. ClaraDoctorAgent, future patient-facing agents).
    /// Validates and sanitizes all fields before returning.
    /// </summary>
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
}

/// <summary>
/// Expected JSON structure from LLM response.
/// </summary>
internal sealed class SuggestionLlmResponse
{
    public List<SuggestionItem> Suggestions { get; set; } = [];
}

/// <summary>
/// A single suggestion item from LLM. Public so IAgentService implementations
/// can return verified items to SuggestionService without an extra DTO.
/// </summary>
public sealed class SuggestionItem
{
    public required string Content { get; set; }
    public string Type { get; set; } = "clinical";
    public string Urgency { get; set; } = "medium";
    public float Confidence { get; set; } = 0.5f;
    public string? Reasoning { get; set; }
}
