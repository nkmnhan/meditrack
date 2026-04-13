namespace Clara.API.Application.Models;

/// <summary>
/// Events emitted during agent processing for progressive UI updates via SignalR.
/// The frontend receives these to show "thinking...", "searching knowledge...", etc.
/// </summary>
public abstract record AgentEvent
{
    public DateTimeOffset Timestamp { get; init; } = DateTimeOffset.UtcNow;

    /// <summary>Agent is reasoning about the transcript.</summary>
    public sealed record Thinking(int Iteration) : AgentEvent;

    /// <summary>Agent started calling a tool (e.g., knowledge search, patient context).</summary>
    public sealed record ToolStarted(string ToolName, string Description) : AgentEvent;

    /// <summary>Agent completed a tool call.</summary>
    public sealed record ToolCompleted(string ToolName, bool IsSuccess, string? Summary = null) : AgentEvent;

    /// <summary>Streaming text chunk from the agent's response.</summary>
    public sealed record TextChunk(string Text) : AgentEvent;

    /// <summary>Agent processing is complete.</summary>
    public sealed record Completed(int SuggestionCount, long ElapsedMs) : AgentEvent;

    /// <summary>Agent encountered an error.</summary>
    public sealed record Failed(string Reason) : AgentEvent;
}
