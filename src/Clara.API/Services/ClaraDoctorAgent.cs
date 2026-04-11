using System.Diagnostics;
using Clara.API.Application.Models;
using Clara.API.Domain;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Clara.API.Services;

/// <summary>
/// The Clara clinical assistant agent. Encapsulates the full ReAct reasoning loop:
/// prompt building → tool invocation → response parsing → critique.
/// SuggestionService delegates here and handles only persistence.
/// </summary>
internal sealed class ClaraDoctorAgent : IAgentService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ICorrectiveRagService _ragService;
    private readonly IPatientContextService _patientContextService;
    private readonly ISuggestionCriticService _criticService;
    private readonly SkillLoaderService _skillLoaderService;
    private readonly ILogger<ClaraDoctorAgent> _logger;
    private readonly AgentTools _agentTools;

    public string AgentId => "clara-doctor";
    public string DisplayName => "Clara — Clinical Assistant";
    public string SystemPrompt { get; }
    public IList<AITool> Tools => _agentTools.CreateAITools();

    public ClaraDoctorAgent(
        IServiceProvider serviceProvider,
        ICorrectiveRagService ragService,
        IPatientContextService patientContextService,
        ISuggestionCriticService criticService,
        SkillLoaderService skillLoaderService,
        ILogger<ClaraDoctorAgent> logger,
        ILogger<AgentTools>? agentToolsLogger = null)
    {
        _serviceProvider = serviceProvider;
        _ragService = ragService;
        _patientContextService = patientContextService;
        _criticService = criticService;
        _skillLoaderService = skillLoaderService;
        _logger = logger;
        _agentTools = new AgentTools(
            ragService,
            patientContextService,
            agentToolsLogger ?? NullLoggerFactory.Instance.CreateLogger<AgentTools>());
        SystemPrompt = LoadSystemPrompt();
    }

    /// <summary>
    /// Runs the full Clara ReAct agent loop and returns verified suggestion items.
    /// The LLM decides which tools to call (search_knowledge, get_patient_context)
    /// rather than always running both regardless of relevance.
    /// </summary>
    public async Task<List<SuggestionItem>> ProcessAsync(
        AgentContext context,
        Func<AgentEvent, Task>? onAgentEvent = null,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();

        // Wire agent event callback so tool calls emit progressive UI events
        _agentTools.SetEventCallback(onAgentEvent);

        if (onAgentEvent != null)
            await onAgentEvent(new AgentEvent.Thinking(1));

        var prompt = BuildAgentPrompt(context.ConversationText, context.PatientId, context.MatchingSkill);

        // Resolve keyed chat client and wrap with function invocation
        var chatClientKey = context.Source == SuggestionSourceEnum.OnDemand ? "ondemand" : "batch";
        var innerClient = _serviceProvider.GetRequiredKeyedService<IChatClient>(chatClientKey);
        var agentClient = new ChatClientBuilder(innerClient)
            .UseFunctionInvocation()
            .Build();

        // ReAct loop — LLM decides which tools to call, M.E.AI handles the loop
        var messages = new List<ChatMessage>
        {
            new(ChatRole.System, SystemPrompt),
            new(ChatRole.User, prompt)
        };

        var chatOptions = new ChatOptions
        {
            Tools = _agentTools.CreateAITools(),
            Temperature = 0.3f,
            MaxOutputTokens = 1200,
            ResponseFormat = ChatResponseFormat.Json,
        };

        var response = await agentClient.GetResponseAsync(messages, chatOptions, cancellationToken);
        var responseText = response.Text;

        stopwatch.Stop();

        if (string.IsNullOrWhiteSpace(responseText))
        {
            _logger.LogWarning("Empty response from agent loop for session {SessionId}", context.SessionId);
            return [];
        }

        if (response.Usage != null)
        {
            _logger.LogInformation(
                "Agent loop: input={InputTokens}, output={OutputTokens}, latency={LatencyMs}ms",
                response.Usage.InputTokenCount,
                response.Usage.OutputTokenCount,
                stopwatch.ElapsedMilliseconds);
        }

        var llmResponse = SuggestionService.ParseLlmResponse(responseText, _logger);

        if (llmResponse == null || llmResponse.Suggestions.Count == 0)
        {
            _logger.LogDebug("No suggestions generated for session {SessionId}", context.SessionId);
            return [];
        }

        // Reflection/critique — verify suggestions against transcript to catch hallucinations
        var verifiedSuggestions = await _criticService.CritiqueAsync(
            llmResponse.Suggestions, context.ConversationText, cancellationToken);

        if (verifiedSuggestions.Count == 0)
        {
            _logger.LogDebug("Critic removed all suggestions for session {SessionId}", context.SessionId);
            return [];
        }

        if (onAgentEvent != null)
            await onAgentEvent(new AgentEvent.Completed(verifiedSuggestions.Count, stopwatch.ElapsedMilliseconds));

        return verifiedSuggestions;
    }

    /// <summary>
    /// Builds the agent prompt. Tools provide knowledge and patient context on demand —
    /// the LLM decides what to fetch based on the conversation content.
    /// This is agent-specific: the patient companion agent will use a different prompt builder.
    /// </summary>
    internal static string BuildAgentPrompt(
        string conversationText,
        string? patientId,
        ClinicalSkill? matchingSkill)
    {
        var parts = new List<string>
        {
            "## Current Conversation\n<TRANSCRIPT>",
            conversationText,
            "</TRANSCRIPT>"
        };

        if (!string.IsNullOrWhiteSpace(patientId))
        {
            parts.Add($"\nPatient ID for context lookup: {patientId}");
            parts.Add("Use the get_patient_context tool if the conversation references patient history, medications, or allergies.");
        }

        parts.Add("\nUse the search_knowledge tool if you need clinical guidelines to support your suggestions.");

        if (matchingSkill != null)
        {
            parts.Add($"\n## Active Clinical Skill: {matchingSkill.Name}");
            parts.Add(matchingSkill.Content);
        }

        parts.Add("\nBased on the above, provide your clinical suggestions:");
        return string.Join("\n\n", parts);
    }

    private static string LoadSystemPrompt()
    {
        var promptPath = Path.Combine(AppContext.BaseDirectory, "Prompts", "system.txt");

        if (!File.Exists(promptPath))
        {
            throw new FileNotFoundException(
                $"System prompt file not found at {promptPath}. Ensure Prompts/system.txt is included in the build output.");
        }

        return File.ReadAllText(promptPath);
    }
}
