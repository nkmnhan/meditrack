using System.Collections.Concurrent;
using System.Threading;
using Clara.API.Application.Models;
using Clara.API.Domain;
using Clara.API.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Clara.API.Services;

/// <summary>
/// Manages auto-batch triggering for AI suggestions.
/// Triggers after 5 patient utterances OR 60 seconds, whichever comes first.
/// Singleton service — maintains state across hub invocations.
/// </summary>
public sealed class BatchTriggerService : IBatchTriggerService
{
    private readonly ConcurrentDictionary<string, SessionBatchState> _sessionStates = new();
    private readonly ILogger<BatchTriggerService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly BatchTriggerOptions _options;
    private bool _disposed;

    public BatchTriggerService(
        ILogger<BatchTriggerService> logger,
        IServiceScopeFactory scopeFactory,
        IOptions<BatchTriggerOptions> options)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
        _options = options.Value;
    }

    /// <summary>
    /// Called when a new transcript line is added. Checks if batch trigger conditions are met.
    /// </summary>
    public async Task OnTranscriptLineAddedAsync(string sessionId, TranscriptLine line)
    {
        var state = _sessionStates.GetOrAdd(sessionId, _ => CreateNewState(sessionId));

        // Track all utterances for the timer-based threshold (any speaker)
        Interlocked.Increment(ref state.TotalUtteranceCount);

        // Only count patient utterances for auto-batch and urgent keyword detection
        if (line.Speaker == SpeakerRole.Patient)
        {
            // Check for urgent keywords — bypass batch timer for immediate response
            if (ContainsUrgentKeyword(line.Text))
            {
                _logger.LogWarning(
                    "Urgent keyword detected in session {SessionId}: triggering immediate suggestions",
                    sessionId);
                Interlocked.Exchange(ref state.PatientUtteranceCount, 0);
                state.ResetTimer();
                await TriggerBatchSuggestionAsync(sessionId, "urgent_keyword");
                return;
            }

            var count = Interlocked.Increment(ref state.PatientUtteranceCount);

            if (count >= _options.PatientUtteranceThreshold)
            {
                // Reset counter and timer BEFORE triggering to prevent concurrent double-trigger
                Interlocked.Exchange(ref state.PatientUtteranceCount, 0);
                state.ResetTimer();
                await TriggerBatchSuggestionAsync(sessionId, "patient_utterance_threshold");
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

    private bool ContainsUrgentKeyword(string text)
    {
        return _options.UrgentKeywords.Any(keyword => text.Contains(keyword, StringComparison.OrdinalIgnoreCase));
    }

    private SessionBatchState CreateNewState(string sessionId)
    {
        var timeout = TimeSpan.FromSeconds(_options.TimeoutSeconds);
        var state = new SessionBatchState(sessionId, OnTimerElapsed, timeout);
        _logger.LogDebug("Created batch trigger state for session {SessionId}", sessionId);
        return state;
    }

    /// <summary>
    /// Synchronous timer callback — fire-and-forgets the async work.
    /// TriggerBatchSuggestionAsync handles its own exceptions so the discarded Task is safe.
    /// </summary>
    private void OnTimerElapsed(string sessionId)
    {
        if (!_sessionStates.TryGetValue(sessionId, out var state) || state.TotalUtteranceCount == 0)
        {
            return;
        }

        // Reset before firing to prevent concurrent timer re-entry from triggering again
        Interlocked.Exchange(ref state.PatientUtteranceCount, 0);
        Interlocked.Exchange(ref state.TotalUtteranceCount, 0);
        state.ResetTimer();

        // Fire-and-forget — all exceptions are caught inside TriggerBatchSuggestionAsync
        _ = TriggerBatchSuggestionAsync(sessionId, "time_threshold");
    }

    private async Task TriggerBatchSuggestionAsync(string sessionId, string triggerReason)
    {
        _logger.LogInformation(
            "Auto-batch trigger for session {SessionId}: {TriggerReason}",
            sessionId, triggerReason);

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var suggestionService = scope.ServiceProvider.GetRequiredService<ISuggestionService>();
            var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<SessionHub>>();

            if (!Guid.TryParse(sessionId, out var sessionGuid))
            {
                _logger.LogWarning("Invalid session ID format for batch trigger: {SessionId}", sessionId);
                return;
            }

            async Task BroadcastAgentEvent(AgentEvent agentEvent)
            {
                var eventName = SignalREvents.GetAgentEventName(agentEvent);
                if (eventName != null)
                {
                    await hubContext.Clients.Group(sessionId)
                        .SendAsync(eventName, agentEvent, CancellationToken.None);
                }
            }

            var suggestions = await suggestionService.GenerateSuggestionsAsync(
                sessionGuid,
                source: SuggestionSourceEnum.Batch,
                onAgentEvent: BroadcastAgentEvent,
                CancellationToken.None);

            // Broadcast suggestions to connected clients
            foreach (var suggestion in suggestions)
            {
                await hubContext.Clients
                    .Group(sessionId)
                    .SendAsync(SignalREvents.SuggestionAdded, new
                    {
                        id = suggestion.Id,
                        content = suggestion.Content,
                        type = suggestion.Type.ToValue(),
                        urgency = suggestion.Urgency?.ToValue(),
                        confidence = suggestion.Confidence,
                        source = suggestion.Source.ToValue(),
                        triggeredAt = suggestion.TriggeredAt,
                        sourceTranscriptLineIds = suggestion.SourceTranscriptLineIds,
                        acceptedAt = suggestion.AcceptedAt,
                        dismissedAt = suggestion.DismissedAt
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
        private readonly TimeSpan _timeout;
        private Timer? _timer;
        private bool _disposed;

        public int PatientUtteranceCount;
        public int TotalUtteranceCount;

        public SessionBatchState(string sessionId, Action<string> onTimerElapsed, TimeSpan timeout)
        {
            _sessionId = sessionId;
            _onTimerElapsed = onTimerElapsed;
            _timeout = timeout;
            ResetTimer();
        }

        public void ResetTimer()
        {
            _timer?.Dispose();
            _timer = new Timer(
                _ => _onTimerElapsed(_sessionId),
                null,
                _timeout,
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

// SpeakerRole, SuggestionSources moved to Domain/Constants.cs
