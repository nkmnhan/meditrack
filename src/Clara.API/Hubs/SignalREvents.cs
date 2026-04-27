namespace Clara.API.Hubs;

/// <summary>
/// Constants for SignalR event names shared between the hub, API endpoints, and services.
/// A single source of truth prevents silent protocol mismatches from typos.
/// </summary>
public static class SignalREvents
{
    public const string TranscriptLineAdded = "TranscriptLineAdded";
    public const string TranscriptInterimUpdated = "TranscriptInterimUpdated";
    public const string SuggestionAdded = "SuggestionAdded";
    public const string SessionUpdated = "SessionUpdated";
    public const string SessionJoined = "SessionJoined";
    public const string SessionLeft = "SessionLeft";
    public const string SttError = "SttError";
    public const string SessionError = "SessionError";
    public const string TranscriptError = "TranscriptError";

    // Suggestion action events (tracking doctor responses)
    public const string SuggestionAccepted = "SuggestionAccepted";
    public const string SuggestionDismissed = "SuggestionDismissed";

    // Agent processing events (progressive UI updates during suggestion generation)
    public const string AgentThinking = "AgentThinking";
    public const string AgentToolStarted = "AgentToolStarted";
    public const string AgentToolCompleted = "AgentToolCompleted";
    public const string AgentTextChunk = "AgentTextChunk";
    public const string AgentCompleted = "AgentCompleted";
    public const string AgentFailed = "AgentFailed";

    /// <summary>
    /// Maps an AgentEvent to its SignalR event name constant.
    /// Centralises the switch so BatchTriggerService and SessionApi stay in sync
    /// when new event types are added.
    /// </summary>
    public static string? GetAgentEventName(Application.Models.AgentEvent agentEvent) => agentEvent switch
    {
        Application.Models.AgentEvent.Thinking     => AgentThinking,
        Application.Models.AgentEvent.ToolStarted  => AgentToolStarted,
        Application.Models.AgentEvent.ToolCompleted => AgentToolCompleted,
        Application.Models.AgentEvent.TextChunk    => AgentTextChunk,
        Application.Models.AgentEvent.Completed    => AgentCompleted,
        Application.Models.AgentEvent.Failed       => AgentFailed,
        _ => null
    };
}
