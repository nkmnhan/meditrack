using System.ComponentModel;
using System.Diagnostics;
using Clara.API.Application.Models;
using Clara.API.Extensions;
using Microsoft.Extensions.AI;

namespace Clara.API.Services;

/// <summary>
/// Patient-facing Clara companion agent. Focuses on visit preparation, medication reminders,
/// and plain-language summaries. Never diagnoses or interprets clinical results.
/// Does not use the critic service — companion responses are empathetic guidance, not clinical claims.
/// </summary>
internal sealed class PatientCompanionAgent : IAgentService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IPatientContextService _patientContextService;
    private readonly ILogger<PatientCompanionAgent> _logger;

    public string AgentId => AgentKeys.PatientCompanion;
    public string DisplayName => "Clara — Patient Companion";
    public string SystemPrompt { get; }
    public IList<AITool> Tools => CreatePatientSafeTools();

    public PatientCompanionAgent(
        IServiceProvider serviceProvider,
        IPatientContextService patientContextService,
        ILogger<PatientCompanionAgent> logger)
    {
        _serviceProvider = serviceProvider;
        _patientContextService = patientContextService;
        _logger = logger;
        SystemPrompt = LoadSystemPrompt();
    }

    /// <summary>
    /// Runs the patient companion agent loop and returns suggestions in plain language.
    /// Uses the "batch" model (cost-optimized for high-volume patient interactions).
    /// No critic step — companion responses are supportive guidance, not clinical diagnoses.
    /// </summary>
    public async Task<List<SuggestionItem>> ProcessAsync(
        AgentContext context,
        Func<AgentEvent, Task>? onAgentEvent = null,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();

        if (onAgentEvent != null)
            await onAgentEvent(new AgentEvent.Thinking(1));

        var prompt = BuildCompanionPrompt(context.ConversationText, context.PatientId);

        // Patient companion always uses batch (cost-optimized — high volume patient interactions)
        var innerClient = _serviceProvider.GetRequiredKeyedService<IChatClient>(ChatClientKeys.Batch);
        var agentClient = new ChatClientBuilder(innerClient)
            .UseFunctionInvocation()
            .Build();

        var messages = new List<ChatMessage>
        {
            new(ChatRole.System, SystemPrompt),
            new(ChatRole.User, prompt)
        };

        var chatOptions = new ChatOptions
        {
            Tools = CreatePatientSafeTools(),
            Temperature = 0.5f,
            MaxOutputTokens = 300,
            ResponseFormat = ChatResponseFormat.Json,
        };

        var response = await agentClient.GetResponseAsync(messages, chatOptions, cancellationToken);
        var responseText = response.Text;

        stopwatch.Stop();

        if (string.IsNullOrWhiteSpace(responseText))
        {
            _logger.LogWarning("Empty response from companion agent for session {SessionId}", context.SessionId);
            return [];
        }

        if (response.Usage != null)
        {
            _logger.LogInformation(
                "Companion agent loop: input={InputTokens}, output={OutputTokens}, latency={LatencyMs}ms",
                response.Usage.InputTokenCount,
                response.Usage.OutputTokenCount,
                stopwatch.ElapsedMilliseconds);
        }

        var llmResponse = SuggestionService.ParseLlmResponse(responseText, _logger);

        if (llmResponse == null || llmResponse.Suggestions.Count == 0)
        {
            _logger.LogDebug("No companion suggestions generated for session {SessionId}", context.SessionId);
            return [];
        }

        if (onAgentEvent != null)
            await onAgentEvent(new AgentEvent.Completed(llmResponse.Suggestions.Count, stopwatch.ElapsedMilliseconds));

        return llmResponse.Suggestions;
    }

    /// <summary>
    /// Returns the patient's medication list with a disclaimer to defer dosing decisions to their doctor.
    /// Safe for patient-facing use — timing reminders only, no clinical interpretation.
    /// </summary>
    [Description("Get the patient's current medication list with reminders about timing. Always includes a disclaimer to confirm dosing with their doctor.")]
    public async Task<string> GetMedicationRemindersAsync(
        [Description("The patient ID to look up")] string patientId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Companion tool: get_medication_reminders('{PatientId}')", patientId);

        var context = await _patientContextService.GetPatientContextAsync(patientId, cancellationToken);

        if (context == null || context.ActiveMedications.Count == 0)
            return "No medication information is available right now. Please ask your care team for an up-to-date list.";

        var medicationList = string.Join("\n", context.ActiveMedications.Select(medication => $"- {medication}"));

        return $"""
            Your current medications on file:
            {medicationList}

            IMPORTANT: This is for reference only. Always confirm timing, dosing, and any changes directly with your doctor or pharmacist.
            """;
    }

    /// <summary>
    /// Returns a plain-language summary of the patient's recent visit reason and monitored conditions.
    /// Safe for patient-facing use — descriptive only, no clinical interpretation.
    /// </summary>
    [Description("Get a plain-language summary of the patient's recent visit and any conditions being monitored by their care team.")]
    public async Task<string> GetVisitSummaryAsync(
        [Description("The patient ID to look up")] string patientId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Companion tool: get_visit_summary('{PatientId}')", patientId);

        var context = await _patientContextService.GetPatientContextAsync(patientId, cancellationToken);

        if (context == null)
            return "Visit summary is not available right now. Your care team can provide details about your recent visit.";

        var parts = new List<string>();

        if (!string.IsNullOrWhiteSpace(context.RecentVisitReason))
            parts.Add($"Your last visit was for: {context.RecentVisitReason}");

        if (context.ChronicConditions.Count > 0)
            parts.Add($"Your care team is monitoring: {string.Join(", ", context.ChronicConditions)}");

        if (parts.Count == 0)
            return "No recent visit information is on file. Your care team can walk you through your visit history.";

        return string.Join("\n", parts);
    }

    /// <summary>
    /// Builds the patient-facing agent prompt. Focuses on visit preparation and support,
    /// not clinical reasoning. Patient ID is used for medication reminders and visit summaries.
    /// </summary>
    internal static string BuildCompanionPrompt(string conversationText, string? patientId)
    {
        var parts = new List<string>
        {
            "## Patient Message\n<MESSAGE>",
            conversationText,
            "</MESSAGE>"
        };

        if (!string.IsNullOrWhiteSpace(patientId))
        {
            parts.Add($"\nPatient ID for context lookup: {patientId}");
            parts.Add("Use get_medication_reminders or get_visit_summary tools if the patient's message relates to their medications or recent visit.");
        }

        parts.Add("\nBased on the above, provide a warm, supportive response to help this patient:");
        return string.Join("\n\n", parts);
    }

    private IList<AITool> CreatePatientSafeTools()
    {
        return
        [
            AIFunctionFactory.Create(GetMedicationRemindersAsync, name: "get_medication_reminders"),
            AIFunctionFactory.Create(GetVisitSummaryAsync, name: "get_visit_summary")
        ];
    }

    private static string LoadSystemPrompt()
    {
        var promptPath = Path.Combine(AppContext.BaseDirectory, "Prompts", "companion-system.txt");

        if (!File.Exists(promptPath))
        {
            throw new FileNotFoundException(
                $"Companion system prompt not found at {promptPath}. Ensure Prompts/companion-system.txt is included in the build output.");
        }

        return File.ReadAllText(promptPath);
    }
}
