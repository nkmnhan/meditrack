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
}
