namespace Clara.API.Hubs;

/// <summary>
/// Constants for SignalR event names shared between the hub, API endpoints, and services.
/// A single source of truth prevents silent protocol mismatches from typos.
/// </summary>
public static class SignalREvents
{
    public const string TranscriptLineAdded = "TranscriptLineAdded";
    public const string SuggestionAdded = "SuggestionAdded";
    public const string SessionUpdated = "SessionUpdated";
    public const string SessionJoined = "SessionJoined";
    public const string SessionLeft = "SessionLeft";
    public const string SttError = "SttError";
    public const string SessionError = "SessionError";
    public const string TranscriptError = "TranscriptError";

    // Agent streaming events (progressive disclosure of AI reasoning)
    public const string AgentThinking = "AgentThinking";
    public const string AgentToolStarted = "AgentToolStarted";
    public const string AgentToolCompleted = "AgentToolCompleted";
    public const string AgentTextChunk = "AgentTextChunk";

    // Suggestion action events (tracking doctor responses)
    public const string SuggestionAccepted = "SuggestionAccepted";
    public const string SuggestionDismissed = "SuggestionDismissed";
}
