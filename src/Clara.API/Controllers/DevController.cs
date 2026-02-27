using System.Text.Json;
using Clara.API.Data;
using Clara.API.Domain;
using Clara.API.Hubs;
using Clara.API.Infrastructure;
using Clara.API.Services;
using MediTrack.Shared.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Clara.API.Controllers;

/// <summary>
/// Development-only endpoints for testing.
/// Requires Doctor auth — LLM calls cost money even in dev.
/// Returns 404 in non-development environments.
/// </summary>
[DevOnly]
[Authorize(Roles = UserRoles.Doctor)]
[ApiController]
[Route("api/dev")]
public class DevController : ControllerBase
{
    private readonly ClaraDbContext _db;
    private readonly IHubContext<SessionHub> _hubContext;
    private readonly SuggestionService _suggestionService;
    private readonly ILogger<DevController> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public DevController(
        ClaraDbContext db,
        IHubContext<SessionHub> hubContext,
        SuggestionService suggestionService,
        ILogger<DevController> logger)
    {
        _db = db;
        _hubContext = hubContext;
        _suggestionService = suggestionService;
        _logger = logger;
    }

    /// <summary>
    /// List available test scenarios.
    /// </summary>
    [HttpGet("scenarios")]
    public ActionResult<List<string>> GetScenarios()
    {
        var conversationsPath = GetConversationsPath();

        if (!Directory.Exists(conversationsPath))
        {
            return Ok(new List<string>());
        }

        var scenarios = Directory.GetFiles(conversationsPath, "*.json")
            .Select(Path.GetFileNameWithoutExtension)
            .Where(name => name != null)
            .ToList();

        return Ok(scenarios);
    }

    /// <summary>
    /// Seed a test transcript into a session.
    /// </summary>
    [HttpPost("sessions/{sessionId:guid}/seed-transcript")]
    public async Task<IActionResult> SeedTranscript(
        Guid sessionId,
        [FromQuery] string scenario,
        CancellationToken cancellationToken)
    {
        var session = await _db.Sessions.FindAsync([sessionId], cancellationToken);
        if (session == null)
        {
            return NotFound(new { message = $"Session {sessionId} not found" });
        }

        var testScenario = await LoadScenarioAsync(scenario, cancellationToken);
        if (testScenario == null)
        {
            return NotFound(new { message = $"Scenario '{scenario}' not found" });
        }

        // Insert all lines instantly (no delay — per plan "no Task.Delay")
        var timestamp = DateTimeOffset.UtcNow;

        foreach (var line in testScenario.Lines)
        {
            var transcriptLine = new TranscriptLine
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                Speaker = line.Speaker,
                Text = line.Text,
                Timestamp = timestamp,
                Confidence = 0.95f
            };

            _db.TranscriptLines.Add(transcriptLine);

            // Broadcast via SignalR to connected clients
            await _hubContext.Clients
                .Group(sessionId.ToString())
                .SendAsync("TranscriptLineAdded", new
                {
                    id = transcriptLine.Id,
                    speaker = transcriptLine.Speaker,
                    text = transcriptLine.Text,
                    timestamp = transcriptLine.Timestamp
                }, cancellationToken);

            // Slight offset for ordering
            timestamp = timestamp.AddSeconds(2);
        }

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Seeded {LineCount} transcript lines for session {SessionId} from scenario '{Scenario}'",
            testScenario.Lines.Count, sessionId, scenario);

        return Ok(new
        {
            message = $"Seeded {testScenario.Lines.Count} transcript lines",
            scenario = scenario,
            sessionId = sessionId
        });
    }

    /// <summary>
    /// Force an AI suggestion (bypasses batch timer).
    /// </summary>
    [HttpPost("sessions/{sessionId:guid}/force-suggest")]
    public async Task<IActionResult> ForceSuggest(
        Guid sessionId,
        CancellationToken cancellationToken)
    {
        var session = await _db.Sessions.FindAsync([sessionId], cancellationToken);
        if (session == null)
        {
            return NotFound(new { message = $"Session {sessionId} not found" });
        }

        var suggestions = await _suggestionService.GenerateSuggestionsAsync(
            sessionId,
            source: "dev_force",
            cancellationToken);

        // Broadcast via SignalR
        foreach (var suggestion in suggestions)
        {
            await _hubContext.Clients
                .Group(sessionId.ToString())
                .SendAsync("SuggestionAdded", new
                {
                    id = suggestion.Id,
                    content = suggestion.Content,
                    type = suggestion.Type,
                    urgency = suggestion.Urgency,
                    confidence = suggestion.Confidence,
                    triggeredAt = suggestion.TriggeredAt
                }, cancellationToken);
        }

        return Ok(new
        {
            sessionId = sessionId,
            suggestionCount = suggestions.Count,
            suggestions = suggestions.Select(suggestion => new
            {
                id = suggestion.Id,
                content = suggestion.Content,
                type = suggestion.Type,
                urgency = suggestion.Urgency,
                confidence = suggestion.Confidence
            })
        });
    }

    /// <summary>
    /// Get full session with transcript, suggestions, and stats.
    /// </summary>
    [HttpGet("sessions/{sessionId:guid}/full")]
    public async Task<IActionResult> GetFullSession(
        Guid sessionId,
        CancellationToken cancellationToken)
    {
        var session = await _db.Sessions
            .Include(session => session.TranscriptLines.OrderBy(line => line.Timestamp))
            .Include(session => session.Suggestions.OrderBy(suggestion => suggestion.TriggeredAt))
            .FirstOrDefaultAsync(session => session.Id == sessionId, cancellationToken);

        if (session == null)
        {
            return NotFound(new { message = $"Session {sessionId} not found" });
        }

        var doctorLineCount = session.TranscriptLines.Count(line => line.Speaker == SpeakerRole.Doctor);
        var patientLineCount = session.TranscriptLines.Count(line => line.Speaker == SpeakerRole.Patient);

        return Ok(new
        {
            session = new
            {
                id = session.Id,
                status = session.Status,
                doctorId = session.DoctorId,
                patientId = session.PatientId,
                startedAt = session.StartedAt,
                endedAt = session.EndedAt
            },
            transcript = session.TranscriptLines.Select(line => new
            {
                id = line.Id,
                speaker = line.Speaker,
                text = line.Text,
                timestamp = line.Timestamp
            }),
            suggestions = session.Suggestions.Select(suggestion => new
            {
                id = suggestion.Id,
                content = suggestion.Content,
                type = suggestion.Type,
                source = suggestion.Source,
                urgency = suggestion.Urgency,
                confidence = suggestion.Confidence,
                triggeredAt = suggestion.TriggeredAt
            }),
            stats = new
            {
                totalLines = session.TranscriptLines.Count,
                doctorLines = doctorLineCount,
                patientLines = patientLineCount,
                suggestionCount = session.Suggestions.Count,
                durationMinutes = session.EndedAt.HasValue
                    ? (session.EndedAt.Value - session.StartedAt).TotalMinutes
                    : (DateTimeOffset.UtcNow - session.StartedAt).TotalMinutes
            }
        });
    }

    /// <summary>
    /// Reset a session (clear transcript and suggestions for re-testing).
    /// </summary>
    [HttpDelete("sessions/{sessionId:guid}/reset")]
    public async Task<IActionResult> ResetSession(
        Guid sessionId,
        CancellationToken cancellationToken)
    {
        var session = await _db.Sessions
            .Include(session => session.TranscriptLines)
            .Include(session => session.Suggestions)
            .FirstOrDefaultAsync(session => session.Id == sessionId, cancellationToken);

        if (session == null)
        {
            return NotFound(new { message = $"Session {sessionId} not found" });
        }

        var removedLines = session.TranscriptLines.Count;
        var removedSuggestions = session.Suggestions.Count;

        _db.TranscriptLines.RemoveRange(session.TranscriptLines);
        _db.Suggestions.RemoveRange(session.Suggestions);

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Reset session {SessionId}: removed {LineCount} lines and {SuggestionCount} suggestions",
            sessionId, removedLines, removedSuggestions);

        return Ok(new
        {
            message = "Session reset successfully",
            sessionId = sessionId,
            removedTranscriptLines = removedLines,
            removedSuggestions = removedSuggestions
        });
    }

    private static string GetConversationsPath()
    {
        return Path.Combine(AppContext.BaseDirectory, "test-data", "conversations");
    }

    private async Task<TestScenario?> LoadScenarioAsync(string scenario, CancellationToken cancellationToken)
    {
        var filePath = Path.Combine(GetConversationsPath(), $"{scenario}.json");

        if (!System.IO.File.Exists(filePath))
        {
            return null;
        }

        var json = await System.IO.File.ReadAllTextAsync(filePath, cancellationToken);
        return JsonSerializer.Deserialize<TestScenario>(json, JsonOptions);
    }
}

/// <summary>
/// Test scenario loaded from JSON.
/// </summary>
internal sealed record TestScenario
{
    public required string Scenario { get; init; }
    public string? Description { get; init; }
    public string? PatientId { get; init; }
    public required List<TestTranscriptLine> Lines { get; init; }
}

/// <summary>
/// A single line in a test scenario.
/// </summary>
internal sealed record TestTranscriptLine
{
    public required string Speaker { get; init; }
    public required string Text { get; init; }
}
