using System.ComponentModel;
using Clara.API.Application.Models;
using Microsoft.Extensions.AI;

namespace Clara.API.Services;

/// <summary>
/// Tool methods the LLM can call during the ReAct agent loop.
/// Each method is exposed as an AIFunction via CreateAITools().
/// </summary>
public sealed class AgentTools
{
    private readonly ICorrectiveRagService _ragService;
    private readonly IPatientContextService _patientContextService;
    private readonly ILogger<AgentTools> _logger;
    private Func<AgentEvent, Task>? _onEvent;

    public AgentTools(
        ICorrectiveRagService ragService,
        IPatientContextService patientContextService,
        ILogger<AgentTools> logger)
    {
        _ragService = ragService;
        _patientContextService = patientContextService;
        _logger = logger;
    }

    /// <summary>
    /// Wires a callback to receive agent events as tool calls execute.
    /// Called by SuggestionService immediately after construction.
    /// </summary>
    public void SetEventCallback(Func<AgentEvent, Task>? callback) => _onEvent = callback;

    [Description("Search the medical knowledge base for clinical guidelines, drug information, or treatment protocols. Use when the conversation mentions a clinical topic you need evidence for.")]
    public async Task<string> SearchKnowledgeAsync(
        [Description("Search query — use specific medical terminology")] string query,
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Agent tool: search_knowledge('{Query}')", query);

        if (_onEvent != null)
            await _onEvent(new AgentEvent.ToolStarted("search_knowledge", $"Searching: {query}"));

        var results = await _ragService.SearchWithGradingAsync(query, topK: 3, cancellationToken: cancellationToken);

        if (_onEvent != null)
            await _onEvent(new AgentEvent.ToolCompleted("search_knowledge", results.Count > 0, $"{results.Count} results"));

        if (results.Count == 0)
            return "No relevant medical guidelines found for this query.";

        var formatted = results.Select(result =>
            $"[Source: {result.DocumentName} | Relevance: {result.Score:F2}]\n{result.Content}");
        return string.Join("\n\n---\n\n", formatted);
    }

    [Description("Get patient context including demographics, allergies, medications, and conditions. Use when the conversation references the patient's history or when medication interactions need checking.")]
    public async Task<string> GetPatientContextAsync(
        [Description("The patient ID to look up")] string patientId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Agent tool: get_patient_context('{PatientId}')", patientId);

        if (_onEvent != null)
            await _onEvent(new AgentEvent.ToolStarted("get_patient_context", "Loading patient information"));

        var context = await _patientContextService.GetPatientContextAsync(patientId, cancellationToken);

        if (_onEvent != null)
            await _onEvent(new AgentEvent.ToolCompleted("get_patient_context", context != null, context != null ? "Context loaded" : "Not available"));

        if (context == null)
            return "Patient context not available. Provide suggestions based on transcript only.";

        return context.ToPromptSection();
    }

    /// <summary>
    /// Creates the AIFunction wrappers the LLM uses during the ReAct loop.
    /// </summary>
    public IList<AITool> CreateAITools()
    {
        return
        [
            AIFunctionFactory.Create(SearchKnowledgeAsync, name: "search_knowledge"),
            AIFunctionFactory.Create(GetPatientContextAsync, name: "get_patient_context")
        ];
    }
}
