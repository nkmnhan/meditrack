using Clara.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Clara.API.Services;

/// <summary>
/// Infers the current speaker (Doctor or Patient) based on session context.
/// Uses a layered approach:
/// 1. Deterministic: First speaker is Doctor (they start the session)
/// 2. Pause heuristic: >3 second gap likely indicates speaker change
/// 3. LLM confirmation: During suggestion pass, LLM can flag misidentifications
/// </summary>
public sealed class SpeakerDetectionService
{
    private readonly ClaraDbContext _db;
    private readonly ILogger<SpeakerDetectionService> _logger;

    /// <summary>
    /// Gap threshold in seconds to consider a speaker change.
    /// </summary>
    private const double SpeakerChangeGapSeconds = 3.0;

    public SpeakerDetectionService(
        ClaraDbContext db,
        ILogger<SpeakerDetectionService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Infers the speaker for the next transcript line.
    /// </summary>
    /// <param name="sessionId">The session ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Inferred speaker role: "Doctor" or "Patient".</returns>
    public async Task<string> InferSpeakerAsync(
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        var lastLine = await _db.TranscriptLines
            .Where(line => line.SessionId == sessionId)
            .OrderByDescending(line => line.Timestamp)
            .FirstOrDefaultAsync(cancellationToken);

        if (lastLine is null)
        {
            // First speaker is always the Doctor (they initiated the session)
            _logger.LogDebug("Session {SessionId}: First speaker inferred as Doctor", sessionId);
            return SpeakerRole.Doctor;
        }

        var timeSinceLastLine = DateTimeOffset.UtcNow - lastLine.Timestamp;

        if (timeSinceLastLine.TotalSeconds > SpeakerChangeGapSeconds)
        {
            // Gap detected — likely speaker change
            var newSpeaker = lastLine.Speaker == SpeakerRole.Doctor
                ? SpeakerRole.Patient
                : SpeakerRole.Doctor;

            _logger.LogDebug(
                "Session {SessionId}: Gap of {GapSeconds:F1}s detected, speaker changed from {OldSpeaker} to {NewSpeaker}",
                sessionId, timeSinceLastLine.TotalSeconds, lastLine.Speaker, newSpeaker);

            return newSpeaker;
        }

        // No gap — same speaker continues
        _logger.LogDebug(
            "Session {SessionId}: No gap detected ({GapSeconds:F1}s), speaker continues as {Speaker}",
            sessionId, timeSinceLastLine.TotalSeconds, lastLine.Speaker);

        return lastLine.Speaker;
    }
}
