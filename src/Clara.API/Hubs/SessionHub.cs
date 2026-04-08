using System.Collections.Concurrent;
using System.Security.Claims;
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
    private static readonly ConcurrentDictionary<string, string> ConnectionSessions = new();

    private readonly ClaraDbContext _db;
    private readonly DeepgramService _deepgram;
    private readonly SpeakerDetectionService _speakerDetection;
    private readonly IBatchTriggerService _batchTrigger;
    private readonly ISessionService _sessionService;
    private readonly ISuggestionService _suggestionService;
    private readonly ILogger<SessionHub> _logger;

    public SessionHub(
        ClaraDbContext db,
        DeepgramService deepgram,
        SpeakerDetectionService speakerDetection,
        IBatchTriggerService batchTrigger,
        ISessionService sessionService,
        ISuggestionService suggestionService,
        ILogger<SessionHub> logger)
    {
        _db = db;
        _deepgram = deepgram;
        _speakerDetection = speakerDetection;
        _batchTrigger = batchTrigger;
        _sessionService = sessionService;
        _suggestionService = suggestionService;
        _logger = logger;
    }

    private string GetDoctorId()
    {
        return Context.User?.FindFirst(JwtClaims.Subject)?.Value
            ?? throw new HubException("Unauthorized: missing user identity");
    }

    private async Task ValidateSessionOwnershipAsync(Guid sessionId, string doctorId)
    {
        var isOwner = await _db.Sessions
            .AnyAsync(s => s.Id == sessionId && s.DoctorId == doctorId);

        if (!isOwner)
        {
            _logger.LogWarning(
                "Session ownership violation: doctor attempted to access session {SessionId}",
                sessionId);
            throw new HubException("Session not found or access denied");
        }
    }

    /// <summary>
    /// Client joins a session group to receive real-time updates.
    /// Immediately broadcasts current session state so the client's useSession() hook is populated.
    /// </summary>
    public async Task JoinSession(string sessionId)
    {
        var doctorId = GetDoctorId();

        if (!Guid.TryParse(sessionId, out var sessionGuid))
        {
            _logger.LogWarning("Invalid session ID format in JoinSession ({Length} chars)", sessionId?.Length);
            await Clients.Caller.SendAsync(SignalREvents.SessionError, "Invalid session ID format");
            return;
        }

        await ValidateSessionOwnershipAsync(sessionGuid, doctorId);

        await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
        ConnectionSessions[Context.ConnectionId] = sessionId;

        _logger.LogInformation(
            "Client {ConnectionId} joined session {SessionId}",
            Context.ConnectionId, sessionId);

        await Clients.Caller.SendAsync(SignalREvents.SessionJoined, sessionId);

        // Hydrate the caller with current session state so useSession() receives non-null data
        var sessionResponse = await _sessionService.GetSessionAsync(sessionGuid, doctorId);

        if (sessionResponse is not null)
        {
            await Clients.Caller.SendAsync(SignalREvents.SessionUpdated, sessionResponse);
        }
    }

    /// <summary>
    /// Client leaves a session group.
    /// </summary>
    public async Task LeaveSession(string sessionId)
    {
        var doctorId = GetDoctorId();

        if (!Guid.TryParse(sessionId, out var sessionGuid))
        {
            _logger.LogWarning("Invalid session ID format in LeaveSession");
            return;
        }

        await ValidateSessionOwnershipAsync(sessionGuid, doctorId);

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, sessionId);
        ConnectionSessions.TryRemove(Context.ConnectionId, out _);

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
        var doctorId = GetDoctorId();

        if (!Guid.TryParse(sessionId, out var sessionGuid))
        {
            _logger.LogWarning("Invalid session ID format in SendTranscriptLine");
            await Clients.Caller.SendAsync(SignalREvents.TranscriptError, "Invalid session ID format");
            return;
        }

        await ValidateSessionOwnershipAsync(sessionGuid, doctorId);

        if (!SessionHubValidation.IsValidSpeaker(speaker))
        {
            _logger.LogWarning("Invalid speaker role rejected: {Speaker}", speaker);
            await Clients.Caller.SendAsync(SignalREvents.TranscriptError, "Invalid speaker role");
            return;
        }

        if (!SessionHubValidation.IsValidTranscriptText(text))
        {
            _logger.LogWarning(
                "Transcript text rejected (empty or exceeds {Limit} chars)",
                SessionHubValidation.MaxTranscriptLength);
            await Clients.Caller.SendAsync(
                SignalREvents.TranscriptError,
                $"Transcript text must be between 1 and {SessionHubValidation.MaxTranscriptLength} characters");
            return;
        }

        await ValidateSessionOwnershipAsync(sessionGuid, doctorId);

        if (!SessionHubValidation.IsValidSpeaker(speaker))
        {
            _logger.LogWarning("Invalid speaker role rejected");
            return;
        }

        if (!SessionHubValidation.IsValidTranscriptText(text))
        {
            _logger.LogWarning("Transcript text rejected (empty or exceeds limit)");
            return;
        }

        var line = new TranscriptLine
        {
            Id = Guid.NewGuid(),
            SessionId = sessionGuid,
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
            var doctorId = GetDoctorId();

            if (!Guid.TryParse(sessionId, out var sessionGuid))
            {
                _logger.LogWarning("Invalid session ID format in StreamAudioChunk");
                await Clients.Caller.SendAsync(SignalREvents.SttError, "Invalid session ID format");
                return;
            }

            await ValidateSessionOwnershipAsync(sessionGuid, doctorId);

            if (string.IsNullOrWhiteSpace(audioBase64))
            {
                return;
            }

            var audioBytes = Convert.FromBase64String(audioBase64);

            if (!SessionHubValidation.IsValidAudioChunkSize(audioBytes.Length))
            {
                _logger.LogWarning("Audio chunk rejected ({Size} bytes)", audioBytes.Length);
                await Clients.Caller.SendAsync(SignalREvents.SttError, "Audio chunk too large");
                return;
            }

            // Forward to Deepgram REST API
            var result = await _deepgram.TranscribeAsync(sessionId, audioBytes);

            if (result is null || string.IsNullOrWhiteSpace(result.Transcript))
            {
                // No transcript produced — could be silence or noise
                return;
            }

            // Infer speaker based on session context (async to avoid thread-pool starvation)
            var speaker = await _speakerDetection.InferSpeakerAsync(sessionGuid);

            var line = new TranscriptLine
            {
                Id = Guid.NewGuid(),
                SessionId = sessionGuid,
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
    /// Broadcasts a suggestion to session group. Server-side only — not client-callable.
    /// </summary>
    private async Task BroadcastSuggestion(string sessionId, SuggestionResponse suggestion)
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

    /// <summary>
    /// Doctor accepts a suggestion. Delegates to SuggestionService for idempotency enforcement.
    /// </summary>
    public async Task AcceptSuggestion(string sessionId, string suggestionId)
    {
        var doctorId = GetDoctorId();

        if (!Guid.TryParse(sessionId, out var sessionGuid) || !Guid.TryParse(suggestionId, out var suggestionGuid))
        {
            await Clients.Caller.SendAsync(SignalREvents.SessionError, "Invalid ID format");
            return;
        }

        try
        {
            var response = await _suggestionService.AcceptSuggestionAsync(sessionGuid, suggestionGuid, doctorId);

            await Clients.Group(sessionId).SendAsync(SignalREvents.SuggestionAccepted, new
            {
                suggestionId = response.Id,
                acceptedAt = response.AcceptedAt
            });
        }
        catch (KeyNotFoundException)
        {
            await Clients.Caller.SendAsync(SignalREvents.SessionError, "Suggestion not found");
        }
        catch (UnauthorizedAccessException)
        {
            await Clients.Caller.SendAsync(SignalREvents.SessionError, "Session not found or access denied");
        }
        catch (InvalidOperationException exception)
        {
            await Clients.Caller.SendAsync(SignalREvents.SessionError, exception.Message);
        }
    }

    /// <summary>
    /// Doctor dismisses a suggestion. Delegates to SuggestionService for idempotency enforcement.
    /// </summary>
    public async Task DismissSuggestion(string sessionId, string suggestionId)
    {
        var doctorId = GetDoctorId();

        if (!Guid.TryParse(sessionId, out var sessionGuid) || !Guid.TryParse(suggestionId, out var suggestionGuid))
        {
            await Clients.Caller.SendAsync(SignalREvents.SessionError, "Invalid ID format");
            return;
        }

        try
        {
            var response = await _suggestionService.DismissSuggestionAsync(sessionGuid, suggestionGuid, doctorId);

            await Clients.Group(sessionId).SendAsync(SignalREvents.SuggestionDismissed, new
            {
                suggestionId = response.Id,
                dismissedAt = response.DismissedAt
            });
        }
        catch (KeyNotFoundException)
        {
            await Clients.Caller.SendAsync(SignalREvents.SessionError, "Suggestion not found");
        }
        catch (UnauthorizedAccessException)
        {
            await Clients.Caller.SendAsync(SignalREvents.SessionError, "Session not found or access denied");
        }
        catch (InvalidOperationException exception)
        {
            await Clients.Caller.SendAsync(SignalREvents.SessionError, exception.Message);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (ConnectionSessions.TryRemove(Context.ConnectionId, out var sessionId))
        {
            _batchTrigger.CleanupSession(sessionId);
            _logger.LogInformation(
                "Cleaned up batch trigger for session {SessionId} on disconnect",
                sessionId);
        }

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
