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
    private record ConnectionInfo(string SessionId, string DoctorId, ISttProvider SttProvider);
    private static readonly ConcurrentDictionary<string, ConnectionInfo> ConnectionSessions = new();

    // Per-session speaker cache — avoids a DB query on every audio chunk.
    // Seeded from transcript history on JoinSession; updated after each line is broadcast.
    private record SpeakerState(string Speaker, DateTimeOffset Timestamp);
    private static readonly ConcurrentDictionary<string, SpeakerState> SpeakerCache = new();

    // Reduced from 3.0s to 1.0s to align with utterance_end_ms=1000 on the Deepgram WS.
    private const double SpeakerChangeGapSeconds = 1.0;

    private readonly ClaraDbContext _db;
    private readonly ITranscriptionService _transcription;
    private readonly ISttProviderFactory _sttFactory;
    private readonly IHubContext<SessionHub> _hubContext;
    private readonly ISpeakerDetectionService _speakerDetection;
    private readonly IBatchTriggerService _batchTrigger;
    private readonly ISessionService _sessionService;
    private readonly ISuggestionService _suggestionService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SessionHub> _logger;

    public SessionHub(
        ClaraDbContext db,
        ITranscriptionService transcription,
        ISttProviderFactory sttFactory,
        IHubContext<SessionHub> hubContext,
        ISpeakerDetectionService speakerDetection,
        IBatchTriggerService batchTrigger,
        ISessionService sessionService,
        ISuggestionService suggestionService,
        IServiceScopeFactory scopeFactory,
        ILogger<SessionHub> logger)
    {
        _db = db;
        _transcription = transcription;
        _sttFactory = sttFactory;
        _hubContext = hubContext;
        _speakerDetection = speakerDetection;
        _batchTrigger = batchTrigger;
        _sessionService = sessionService;
        _suggestionService = suggestionService;
        _scopeFactory = scopeFactory;
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
    /// Opens a persistent Deepgram WebSocket for the session.
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

        var sttProvider = _sttFactory.GetProvider(sessionId);

        await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
        ConnectionSessions[Context.ConnectionId] = new ConnectionInfo(sessionId, doctorId, sttProvider);

        _logger.LogInformation(
            "Client {ConnectionId} joined session {SessionId}",
            Context.ConnectionId, sessionId);

        await Clients.Caller.SendAsync(SignalREvents.SessionJoined, sessionId);

        // Hydrate the caller with current session state
        var sessionResponse = await _sessionService.GetSessionAsync(sessionGuid, doctorId);

        if (sessionResponse is not null)
        {
            await Clients.Caller.SendAsync(SignalREvents.SessionUpdated, sessionResponse);

            if (sessionResponse.TranscriptLines is { Count: > 0 } lines)
            {
                var last = lines[^1];
                SpeakerCache[sessionId] = new SpeakerState(last.Speaker, last.Timestamp);
            }
        }

        // Open STT provider stream. Callback runs on a background thread, so use IHubContext.
        await sttProvider.OpenStreamAsync(sessionId, async chunk =>
        {
            var speaker = InferSpeakerFromCache(sessionId);

            if (!chunk.IsFinal)
            {
                // Interim result — transient preview, not persisted
                await _hubContext.Clients.Group(sessionId).SendAsync(
                    SignalREvents.TranscriptInterimUpdated,
                    new { speaker, text = chunk.Transcript });
                return;
            }

            // Final result — persist and broadcast.
            // Create a fresh scope: the hub's _db is tied to the JoinSession invocation
            // scope which is disposed once that method returns, but this callback runs
            // on the background Deepgram WS receive loop.
            var now = DateTimeOffset.UtcNow;
            if (!Guid.TryParse(sessionId, out var finalSessionGuid))
                return;

            var line = new TranscriptLine
            {
                Id = Guid.NewGuid(),
                SessionId = finalSessionGuid,
                Speaker = speaker,
                Text = chunk.Transcript,
                Timestamp = now,
                Confidence = chunk.Confidence
            };

            await BroadcastTranscriptLineViaContext(sessionId, line);
            SpeakerCache[sessionId] = new SpeakerState(speaker, now);

            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<ClaraDbContext>();
            db.TranscriptLines.Add(line);
            await db.SaveChangesAsync();
            await _batchTrigger.OnTranscriptLineAddedAsync(sessionId, line);
        });
    }

    /// <summary>
    /// Client leaves a session group. Closes the Deepgram stream if no other connections remain.
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
        ConnectionSessions.TryRemove(Context.ConnectionId, out var leftConn);

        if (!ConnectionSessions.Values.Any(c => c.SessionId == sessionId))
        {
            if (leftConn is not null)
                await leftConn.SttProvider.CloseStreamAsync(sessionId);
            SpeakerCache.TryRemove(sessionId, out _);
        }

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

        await BroadcastTranscriptLine(sessionId, line);
        await _batchTrigger.OnTranscriptLineAddedAsync(sessionId, line);
    }

    /// <summary>
    /// Receives audio chunk from client and pipes it to the open Deepgram WebSocket.
    /// No REST call here — transcription is async via the WS receive loop.
    /// Audio format: base64-encoded PCM16 (linear16, 16kHz mono).
    /// </summary>
    public async Task StreamAudioChunk(string sessionId, string audioBase64)
    {
        try
        {
            var doctorId = GetDoctorId();

            if (!Guid.TryParse(sessionId, out _))
            {
                _logger.LogWarning("Invalid session ID format in StreamAudioChunk");
                await Clients.Caller.SendAsync(SignalREvents.SttError, "Invalid session ID format");
                return;
            }

            // Use in-memory cache — ownership validated on JoinSession
            if (!ConnectionSessions.TryGetValue(Context.ConnectionId, out var connInfo) ||
                connInfo.SessionId != sessionId ||
                connInfo.DoctorId != doctorId)
            {
                _logger.LogWarning(
                    "Audio chunk rejected: connection {ConnectionId} not joined to session {SessionId}",
                    Context.ConnectionId, sessionId);
                await Clients.Caller.SendAsync(SignalREvents.SttError, "Session not found or access denied");
                return;
            }

            if (string.IsNullOrWhiteSpace(audioBase64))
                return;

            var audioBytes = Convert.FromBase64String(audioBase64);

            if (!SessionHubValidation.IsValidAudioChunkSize(audioBytes.Length))
            {
                _logger.LogWarning("Audio chunk rejected ({Size} bytes)", audioBytes.Length);
                await Clients.Caller.SendAsync(SignalREvents.SttError, "Audio chunk too large");
                return;
            }

            await connInfo.SttProvider.SendAudioAsync(sessionId, audioBytes);
        }
        catch (FormatException exception)
        {
            _logger.LogWarning(exception, "Invalid base64 audio for session {SessionId}", sessionId);
            await Clients.Caller.SendAsync(SignalREvents.SttError, "Invalid audio format");
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Audio forwarding failed for session {SessionId}", sessionId);
            await Clients.Caller.SendAsync(SignalREvents.SttError, "Transcription temporarily unavailable");
        }
    }

    private string InferSpeakerFromCache(string sessionId)
    {
        if (!SpeakerCache.TryGetValue(sessionId, out var last))
            return SpeakerRole.Doctor;

        var gap = DateTimeOffset.UtcNow - last.Timestamp;
        return gap.TotalSeconds > SpeakerChangeGapSeconds
            ? (last.Speaker == SpeakerRole.Doctor ? SpeakerRole.Patient : SpeakerRole.Doctor)
            : last.Speaker;
    }

    private async Task BroadcastTranscriptLine(string sessionId, TranscriptLine line)
    {
        var response = BuildTranscriptLineResponse(line);
        await Clients.Group(sessionId).SendAsync(SignalREvents.TranscriptLineAdded, response);
    }

    // Used from the Deepgram WS receive loop (background thread — not a hub invocation context).
    private async Task BroadcastTranscriptLineViaContext(string sessionId, TranscriptLine line)
    {
        var response = BuildTranscriptLineResponse(line);
        await _hubContext.Clients.Group(sessionId).SendAsync(SignalREvents.TranscriptLineAdded, response);
    }

    private static TranscriptLineResponse BuildTranscriptLineResponse(TranscriptLine line) =>
        new()
        {
            Id = line.Id,
            Speaker = line.Speaker,
            Text = line.Text,
            Timestamp = line.Timestamp,
            Confidence = line.Confidence
        };

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

    /// <summary>
    /// Doctor accepts a suggestion.
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
    /// Doctor dismisses a suggestion.
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
        if (ConnectionSessions.TryRemove(Context.ConnectionId, out var connInfo))
        {
            _batchTrigger.CleanupSession(connInfo.SessionId);
            _logger.LogInformation(
                "Cleaned up batch trigger for session {SessionId} on disconnect",
                connInfo.SessionId);

            if (!ConnectionSessions.Values.Any(c => c.SessionId == connInfo.SessionId))
            {
                await connInfo.SttProvider.CloseStreamAsync(connInfo.SessionId);
                SpeakerCache.TryRemove(connInfo.SessionId, out _);
            }
        }

        if (exception is not null)
            _logger.LogWarning(exception, "Client {ConnectionId} disconnected with error", Context.ConnectionId);
        else
            _logger.LogInformation("Client {ConnectionId} disconnected", Context.ConnectionId);

        await base.OnDisconnectedAsync(exception);
    }
}
