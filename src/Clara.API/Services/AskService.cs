using System.Text;
using Microsoft.Extensions.AI;

namespace Clara.API.Services;

internal sealed class AskService : IAskService
{
    private readonly IKnowledgeService _knowledgeService;
    private readonly IPatientContextService _patientContextService;
    private readonly IChatClient _chatClient;
    private readonly ILogger<AskService> _logger;

    private const string SystemPromptBase =
        "You are Clara, an AI clinical assistant supporting doctors. " +
        "Answer concisely and accurately based on the provided knowledge context. " +
        "If the question is outside your knowledge, say so clearly. " +
        "Do not fabricate clinical information, drug names, dosages, or clinical facts.";

    public AskService(
        IKnowledgeService knowledgeService,
        IPatientContextService patientContextService,
        IChatClient chatClient,
        ILogger<AskService> logger)
    {
        _knowledgeService = knowledgeService;
        _patientContextService = patientContextService;
        _chatClient = chatClient;
        _logger = logger;
    }

    public async Task<string> AskAsync(
        string question,
        string? patientId,
        CancellationToken cancellationToken = default)
    {
        var knowledgeChunks = await _knowledgeService
            .SearchForContextAsync(question, topK: 5, cancellationToken);

        PatientContext? patientContext = null;
        if (!string.IsNullOrWhiteSpace(patientId))
        {
            patientContext = await _patientContextService
                .GetPatientContextAsync(patientId, cancellationToken);
        }

        var systemPrompt = BuildSystemPrompt(knowledgeChunks, patientContext);

        var messages = new List<ChatMessage>
        {
            new(ChatRole.System, systemPrompt),
            new(ChatRole.User, question)
        };

        var chatOptions = new ChatOptions { Temperature = 0.3f, MaxOutputTokens = 800 };

        var response = await _chatClient.GetResponseAsync(messages, chatOptions, cancellationToken);
        var answer = response.Text;

        if (string.IsNullOrWhiteSpace(answer))
        {
            _logger.LogWarning("LLM returned empty response for question length {Length}", question.Length);
            return "I was unable to generate a response. Please try rephrasing your question.";
        }

        return answer;
    }

    private static string BuildSystemPrompt(
        List<KnowledgeSearchResult> chunks,
        PatientContext? patient)
    {
        var builder = new StringBuilder(SystemPromptBase);

        if (chunks.Count > 0)
        {
            builder.AppendLine("\n\n## Relevant Clinical Knowledge");
            foreach (var chunk in chunks)
            {
                builder.AppendLine($"- {chunk.Content}");
            }
        }

        if (patient is not null)
        {
            var patientSection = patient.ToPromptSection();
            if (!string.IsNullOrWhiteSpace(patientSection))
            {
                builder.Append('\n').AppendLine(patientSection);
            }
        }

        return builder.ToString();
    }
}
