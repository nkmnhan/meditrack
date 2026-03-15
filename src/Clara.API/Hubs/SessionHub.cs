using Clara.API.Application.Models;
using Clara.API.Data;
using Clara.API.Domain;
using Clara.API.Services;
using MediTrack.Shared.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Clara.API.Hubs;

/// <summary>
/// SignalR hub for real-time session communication.
/// Handles audio streaming, transcript broadcasting, and suggestion delivery.
/// </summary>
[Authorize(Roles = UserRoles.Doctor)]
public sealed class SessionHub : Hub
{
    private readonly ClaraDbContext _db;
    private readonly DeepgramService _deepgram;
    private readonly SpeakerDetectionService _speakerDetection;
    private readonly BatchTriggerService _batchTrigger;
    private readonly ILogger<SessionHub> _logger;

    public SessionHub(
        ClaraDbContext db,
        DeepgramService deepgram,
        SpeakerDetectionService speakerDetection,
        BatchTriggerService batchTrigger,
        ILogger<SessionHub> logger)
    {
        _db = db;
        _deepgram = deepgram;
        _speakerDetection = speakerDetection;
        _batchTrigger = batchTrigger;
        _logger = logger;
    }

    /// <summary>
    /// Client joins a session group to receive real-time updates.
    /// Immediately broadcasts current session state so the client's useSession() hook is populated.
    /// </summary>
    public async Task JoinSession(string sessionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);

        _logger.LogInformation(
            "Client {ConnectionId} joined session {SessionId}",
            Context.ConnectionId, sessionId);

        await Clients.Caller.SendAsync(SignalREvents.SessionJoined, sessionId);

        // Hydrate the caller with current session state so useSession() receives non-null data
        if (!Guid.TryParse(sessionId, out var sessionGuid))
        {
            return;
        }

        var session = await _db.Sessions
            .Include(s => s.TranscriptLines.OrderBy(t => t.Timestamp))
            .Include(s => s.Suggestions.OrderByDescending(s => s.TriggeredAt))
            .FirstOrDefaultAsync(s => s.Id == sessionGuid);

        if (session is null)
        {
            return;
        }

        var sessionResponse = new SessionResponse
        {
            Id = session.Id,
            DoctorId = session.DoctorId,
            PatientId = session.PatientId,
            StartedAt = session.StartedAt,
            EndedAt = session.EndedAt,
            Status = session.Status,
            AudioRecorded = session.AudioRecorded,
            SessionType = session.SessionType,
            TranscriptLines = session.TranscriptLines
                .Select(transcriptLine => new TranscriptLineResponse
                {
                    Id = transcriptLine.Id,
                    Speaker = transcriptLine.Speaker,
                    Text = transcriptLine.Text,
                    Timestamp = transcriptLine.Timestamp,
                    Confidence = transcriptLine.Confidence
                })
                .ToList(),
            Suggestions = session.Suggestions
                .Select(suggestion => new SuggestionResponse
                {
                    Id = suggestion.Id,
                    Content = suggestion.Content,
                    TriggeredAt = suggestion.TriggeredAt,
                    Type = suggestion.Type,
                    Source = suggestion.Source,
                    Urgency = suggestion.Urgency,
                    Confidence = suggestion.Confidence
                })
                .ToList()
        };

        await Clients.Caller.SendAsync(SignalREvents.SessionUpdated, sessionResponse);
    }

    /// <summary>
    /// Client leaves a session group.
    /// </summary>
    public async Task LeaveSession(string sessionId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, sessionId);

        _logger.LogInformation(
            "Client {ConnectionId} left session {SessionId}",
            Context.ConnectionId, sessionId);

        await Clients.Caller.SendAsync(SignalREvents.SessionLeft, sessionId);
    }

    /// <summary>
    /// MVP: Manual text input (simulates STT). Used for testing without microphone.
    /// </summary>
    public async Task SendTranscriptLine(string sessionId, string speaker, string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return;
        }

        var line = new TranscriptLine
        {
            Id = Guid.NewGuid(),
            SessionId = Guid.Parse(sessionId),
            Speaker = speaker,
            Text = text.Trim(),
            Timestamp = DateTimeOffset.UtcNow
        };

        _db.TranscriptLines.Add(line);
        await _db.SaveChangesAsync();

        // Broadcast to all clients in session group
        await BroadcastTranscriptLine(sessionId, line);

        // Auto-batch trigger check
        await _batchTrigger.OnTranscriptLineAddedAsync(sessionId, line);
    }

    /// <summary>
    /// Receives audio chunk from client, transcribes via Deepgram, broadcasts transcript.
    /// Audio format: base64-encoded audio/webm from MediaRecorder.
    /// </summary>
    public async Task StreamAudioChunk(string sessionId, string audioBase64)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(audioBase64))
            {
                return;
            }

            var audioBytes = Convert.FromBase64String(audioBase64);

            // Forward to Deepgram REST API
            var result = await _deepgram.TranscribeAsync(sessionId, audioBytes);

            if (result is null || string.IsNullOrWhiteSpace(result.Transcript))
            {
                // No transcript produced — could be silence or noise
                return;
            }

            // Infer speaker based on session context (async to avoid thread-pool starvation)
            var speaker = await _speakerDetection.InferSpeakerAsync(Guid.Parse(sessionId));

            var line = new TranscriptLine
            {
                Id = Guid.NewGuid(),
                SessionId = Guid.Parse(sessionId),
                Speaker = speaker,
                Text = result.Transcript,
                Timestamp = DateTimeOffset.UtcNow,
                Confidence = result.Confidence
            };

            _db.TranscriptLines.Add(line);
            await _db.SaveChangesAsync();

            // Broadcast to all clients in session group
            await BroadcastTranscriptLine(sessionId, line);

            // Auto-batch trigger check
            await _batchTrigger.OnTranscriptLineAddedAsync(sessionId, line);
        }
        catch (FormatException exception)
        {
            _logger.LogWarning(exception, "Invalid base64 audio for session {SessionId}", sessionId);
            await Clients.Caller.SendAsync(SignalREvents.SttError, "Invalid audio format");
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "STT failed for session {SessionId}", sessionId);
            // Don't crash the SignalR connection — STT failure is recoverable
            await Clients.Caller.SendAsync(SignalREvents.SttError, "Transcription temporarily unavailable");
        }
    }

    /// <summary>
    /// Called when a suggestion is generated. Broadcasts to session group.
    /// </summary>
    public async Task BroadcastSuggestion(string sessionId, SuggestionResponse suggestion)
    {
        await Clients.Group(sessionId).SendAsync(SignalREvents.SuggestionAdded, suggestion);

        _logger.LogInformation(
            "Suggestion {SuggestionId} broadcast to session {SessionId}",
            suggestion.Id, sessionId);
    }

    private async Task BroadcastTranscriptLine(string sessionId, TranscriptLine line)
    {
        var response = new TranscriptLineResponse
        {
            Id = line.Id,
            Speaker = line.Speaker,
            Text = line.Text,
            Timestamp = line.Timestamp,
            Confidence = line.Confidence
        };

        await Clients.Group(sessionId).SendAsync(SignalREvents.TranscriptLineAdded, response);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (exception is not null)
        {
            _logger.LogWarning(exception, "Client {ConnectionId} disconnected with error", Context.ConnectionId);
        }
        else
        {
            _logger.LogInformation("Client {ConnectionId} disconnected", Context.ConnectionId);
        }

        await base.OnDisconnectedAsync(exception);
    }
}
