using System.Collections.Concurrent;
using Clara.API.Domain;
using Clara.API.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace Clara.API.Services;

/// <summary>
/// Manages auto-batch triggering for AI suggestions.
/// Triggers after 5 patient utterances OR 60 seconds, whichever comes first.
/// Singleton service — maintains state across hub invocations.
/// </summary>
public sealed class BatchTriggerService : IDisposable
{
    private readonly ConcurrentDictionary<string, SessionBatchState> _sessionStates = new();
    private readonly ILogger<BatchTriggerService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private bool _disposed;

    public BatchTriggerService(
        ILogger<BatchTriggerService> logger,
        IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    /// <summary>
    /// Called when a new transcript line is added. Checks if batch trigger conditions are met.
    /// </summary>
    public async Task OnTranscriptLineAddedAsync(string sessionId, TranscriptLine line)
    {
        var state = _sessionStates.GetOrAdd(sessionId, _ => CreateNewState(sessionId));

        // Only count patient utterances for auto-batch
        if (line.Speaker == SpeakerRole.Patient)
        {
            var count = System.Threading.Interlocked.Increment(ref state.PatientUtteranceCount);

            if (count >= 5)
            {
                await TriggerBatchSuggestionAsync(sessionId, "patient_utterance_threshold");
                System.Threading.Interlocked.Exchange(ref state.PatientUtteranceCount, 0);
                state.ResetTimer();
            }
        }
    }

    /// <summary>
    /// Cleans up session state and disposes timer to prevent memory leaks.
    /// </summary>
    public void CleanupSession(string sessionId)
    {
        if (_sessionStates.TryRemove(sessionId, out var state))
        {
            state.Dispose();
            _logger.LogDebug("Cleaned up batch trigger state for session {SessionId}", sessionId);
        }
    }

    private SessionBatchState CreateNewState(string sessionId)
    {
        var state = new SessionBatchState(sessionId, OnTimerElapsed);
        _logger.LogDebug("Created batch trigger state for session {SessionId}", sessionId);
        return state;
    }

    private async void OnTimerElapsed(string sessionId)
    {
        try
        {
            if (_sessionStates.TryGetValue(sessionId, out var state) && state.PatientUtteranceCount > 0)
            {
                await TriggerBatchSuggestionAsync(sessionId, "time_threshold");
                System.Threading.Interlocked.Exchange(ref state.PatientUtteranceCount, 0);
                state.ResetTimer();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OnTimerElapsed failed for session {SessionId}", sessionId);
        }
    }

    private async Task TriggerBatchSuggestionAsync(string sessionId, string triggerReason)
    {
        _logger.LogInformation(
            "Auto-batch trigger for session {SessionId}: {TriggerReason}",
            sessionId, triggerReason);

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var suggestionService = scope.ServiceProvider.GetRequiredService<SuggestionService>();
            var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<SessionHub>>();

            if (!Guid.TryParse(sessionId, out var sessionGuid))
            {
                _logger.LogWarning("Invalid session ID format for batch trigger: {SessionId}", sessionId);
                return;
            }

            var suggestions = await suggestionService.GenerateSuggestionsAsync(
                sessionGuid,
                source: "batch",
                CancellationToken.None);

            // Broadcast suggestions to connected clients
            foreach (var suggestion in suggestions)
            {
                await hubContext.Clients
                    .Group(sessionId)
                    .SendAsync("SuggestionAdded", new
                    {
                        id = suggestion.Id,
                        content = suggestion.Content,
                        type = suggestion.Type,
                        urgency = suggestion.Urgency,
                        confidence = suggestion.Confidence,
                        source = suggestion.Source,
                        triggeredAt = suggestion.TriggeredAt
                    });
            }

            _logger.LogInformation(
                "Generated {SuggestionCount} batch suggestions for session {SessionId}",
                suggestions.Count, sessionId);
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Failed to generate batch suggestions for session {SessionId}",
                sessionId);
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        foreach (var state in _sessionStates.Values)
        {
            state.Dispose();
        }
        _sessionStates.Clear();
    }

    /// <summary>
    /// Holds batch trigger state for a single session.
    /// </summary>
    private sealed class SessionBatchState : IDisposable
    {
        private readonly string _sessionId;
        private readonly Action<string> _onTimerElapsed;
        private Timer? _timer;
        private bool _disposed;

        public int PatientUtteranceCount { get; set; }

        public SessionBatchState(string sessionId, Action<string> onTimerElapsed)
        {
            _sessionId = sessionId;
            _onTimerElapsed = onTimerElapsed;
            ResetTimer();
        }

        public void ResetTimer()
        {
            _timer?.Dispose();
            _timer = new Timer(
                _ => _onTimerElapsed(_sessionId),
                null,
                TimeSpan.FromSeconds(60),
                Timeout.InfiniteTimeSpan);
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            _timer?.Dispose();
        }
    }
}

/// <summary>
/// Speaker role constants.
/// </summary>
public static class SpeakerRole
{
    public const string Doctor = "Doctor";
    public const string Patient = "Patient";
}
