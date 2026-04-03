using System.ComponentModel;
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

    public AgentTools(
        ICorrectiveRagService ragService,
        IPatientContextService patientContextService,
        ILogger<AgentTools> logger)
    {
        _ragService = ragService;
        _patientContextService = patientContextService;
        _logger = logger;
    }

    [Description("Search the medical knowledge base for clinical guidelines, drug information, or treatment protocols. Use when the conversation mentions a clinical topic you need evidence for.")]
    public async Task<string> SearchKnowledgeAsync(
        [Description("Search query — use specific medical terminology")] string query,
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Agent tool: search_knowledge('{Query}')", query);
        var results = await _ragService.SearchWithGradingAsync(query, topK: 3, cancellationToken: cancellationToken);

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
        var context = await _patientContextService.GetPatientContextAsync(patientId, cancellationToken);

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
