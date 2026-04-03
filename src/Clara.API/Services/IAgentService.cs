using Clara.API.Application.Models;
using Clara.API.Domain;
using Microsoft.Extensions.AI;

namespace Clara.API.Services;

/// <summary>
/// Abstraction for an AI clinical agent. Implementations encapsulate the full
/// reasoning loop (prompt building, tool invocation, critique) and return a
/// verified list of suggestions. SuggestionService is the orchestrator that
/// loads context and persists results; agents own the AI logic.
/// </summary>
public interface IAgentService
{
    /// <summary>Stable identifier used for routing and telemetry.</summary>
    string AgentId { get; }

    /// <summary>Human-readable name shown in UI and logs.</summary>
    string DisplayName { get; }

    /// <summary>The system prompt loaded by this agent.</summary>
    string SystemPrompt { get; }

    /// <summary>The tools exposed to the LLM during the ReAct loop.</summary>
    IList<AITool> Tools { get; }

    /// <summary>
    /// Runs the agent reasoning loop and returns a verified list of suggestion items.
    /// The caller (SuggestionService) is responsible for persisting results to the DB.
    /// </summary>
    /// <param name="context">All information the agent needs to reason about the session.</param>
    /// <param name="onAgentEvent">Optional streaming callback for progressive UI updates.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Verified suggestion items ready for persistence.</returns>
    Task<List<SuggestionItem>> ProcessAsync(
        AgentContext context,
        Func<AgentEvent, Task>? onAgentEvent = null,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// All context the agent needs to reason about a single session turn.
/// Populated by SuggestionService from the DB before invoking the agent.
/// </summary>
public sealed record AgentContext
{
    public required Guid SessionId { get; init; }
    public required string ConversationText { get; init; }
    public string? PatientId { get; init; }
    public required SuggestionSourceEnum Source { get; init; }
    public ClinicalSkill? MatchingSkill { get; init; }
}
