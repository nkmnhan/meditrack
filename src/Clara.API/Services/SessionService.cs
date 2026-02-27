using Clara.API.Application.Models;
using Clara.API.Data;
using Clara.API.Domain;
using Microsoft.EntityFrameworkCore;

namespace Clara.API.Services;

/// <summary>
/// Manages clinical session lifecycle: start, get, end.
/// </summary>
public sealed class SessionService
{
    private readonly ClaraDbContext _db;
    private readonly BatchTriggerService _batchTriggerService;
    private readonly ILogger<SessionService> _logger;

    public SessionService(
        ClaraDbContext db,
        BatchTriggerService batchTriggerService,
        ILogger<SessionService> logger)
    {
        _db = db;
        _batchTriggerService = batchTriggerService;
        _logger = logger;
    }

    /// <summary>
    /// Starts a new clinical session for the specified doctor.
    /// </summary>
    public async Task<SessionResponse> StartSessionAsync(
        string doctorId,
        StartSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        var session = new Session
        {
            Id = Guid.NewGuid(),
            DoctorId = doctorId,
            PatientId = request.PatientId,
            StartedAt = DateTimeOffset.UtcNow,
            Status = SessionStatus.Active,
            AudioRecorded = request.AudioRecorded,
            SpeakerMap = new Dictionary<string, string>()
        };

        _db.Sessions.Add(session);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Session {SessionId} started for doctor {DoctorId} with patient {PatientId}",
            session.Id, doctorId, request.PatientId ?? "anonymous");

        return MapToResponse(session);
    }

    /// <summary>
    /// Gets session details including transcript lines and suggestions.
    /// </summary>
    public async Task<SessionResponse?> GetSessionAsync(
        Guid sessionId,
        string doctorId,
        CancellationToken cancellationToken = default)
    {
        var session = await _db.Sessions
            .Include(s => s.TranscriptLines.OrderBy(t => t.Timestamp))
            .Include(s => s.Suggestions.OrderByDescending(s => s.TriggeredAt))
            .FirstOrDefaultAsync(
                s => s.Id == sessionId && s.DoctorId == doctorId,
                cancellationToken);

        return session is null ? null : MapToResponse(session);
    }

    /// <summary>
    /// Ends an active session. Cleans up batch trigger timers.
    /// </summary>
    public async Task<SessionResponse> EndSessionAsync(
        Guid sessionId,
        string doctorId,
        CancellationToken cancellationToken = default)
    {
        var session = await _db.Sessions
            .Include(s => s.TranscriptLines)
            .Include(s => s.Suggestions)
            .FirstOrDefaultAsync(
                s => s.Id == sessionId && s.DoctorId == doctorId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Session {sessionId} not found");

        if (session.Status == SessionStatus.Completed)
        {
            throw new InvalidOperationException($"Session {sessionId} is already ended");
        }

        session.EndedAt = DateTimeOffset.UtcNow;
        session.Status = SessionStatus.Completed;
        await _db.SaveChangesAsync(cancellationToken);

        // Clean up batch trigger timer to prevent Timer leak
        _batchTriggerService.CleanupSession(sessionId.ToString());

        _logger.LogInformation(
            "Session {SessionId} ended for doctor {DoctorId}. Duration: {Duration}",
            session.Id, doctorId, session.EndedAt - session.StartedAt);

        return MapToResponse(session);
    }

    private static SessionResponse MapToResponse(Session session)
    {
        return new SessionResponse
        {
            Id = session.Id,
            DoctorId = session.DoctorId,
            PatientId = session.PatientId,
            StartedAt = session.StartedAt,
            EndedAt = session.EndedAt,
            Status = session.Status,
            AudioRecorded = session.AudioRecorded,
            TranscriptLines = session.TranscriptLines
                .Select(t => new TranscriptLineResponse
                {
                    Id = t.Id,
                    Speaker = t.Speaker,
                    Text = t.Text,
                    Timestamp = t.Timestamp,
                    Confidence = t.Confidence
                })
                .ToList(),
            Suggestions = session.Suggestions
                .Select(s => new SuggestionResponse
                {
                    Id = s.Id,
                    Content = s.Content,
                    TriggeredAt = s.TriggeredAt,
                    Type = s.Type,
                    Source = s.Source,
                    Urgency = s.Urgency
                })
                .ToList()
        };
    }
}

/// <summary>
/// Session status constants.
/// </summary>
public static class SessionStatus
{
    public const string Active = "active";
    public const string Paused = "paused";
    public const string Completed = "completed";
    public const string Cancelled = "cancelled";
}
