using Clara.API.Services;
using FluentAssertions;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace Clara.UnitTests.Services;

public sealed class AskServiceTests
{
    private readonly IKnowledgeService _knowledgeService;
    private readonly IPatientContextService _patientContextService;
    private readonly IChatClient _chatClient;
    private readonly AskService _service;

    public AskServiceTests()
    {
        _knowledgeService = Substitute.For<IKnowledgeService>();
        _patientContextService = Substitute.For<IPatientContextService>();
        _chatClient = Substitute.For<IChatClient>();
        _service = new AskService(
            _knowledgeService,
            _patientContextService,
            _chatClient,
            NullLogger<AskService>.Instance);
    }

    [Fact]
    public async Task AskAsync_ReturnsLlmAnswer_WhenKnowledgeFound()
    {
        // Arrange
        var knowledgeResults = new List<KnowledgeSearchResult>
        {
            new() { ChunkId = Guid.NewGuid(), DocumentName = "Clinical Guidelines", Content = "Metformin is first-line for type 2 diabetes.", Category = "pharmacology", Score = 0.9f }
        };
        _knowledgeService
            .SearchForContextAsync("What is first-line for type 2 diabetes?", topK: 5, Arg.Any<CancellationToken>())
            .Returns(knowledgeResults);

        var chatResponse = new ChatResponse(new ChatMessage(ChatRole.Assistant, "Metformin is the recommended first-line treatment."));
        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .Returns(chatResponse);

        // Act
        var answer = await _service.AskAsync("What is first-line for type 2 diabetes?", patientId: null);

        // Assert
        answer.Should().Be("Metformin is the recommended first-line treatment.");
    }

    [Fact]
    public async Task AskAsync_IncludesPatientContext_WhenPatientIdProvided()
    {
        // Arrange
        _knowledgeService
            .SearchForContextAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns([]);

        var patientContext = new PatientContext
        {
            PatientId = "patient-123",
            Age = 45,
            Gender = "Female",
            Allergies = ["Penicillin"],
            ActiveMedications = ["Lisinopril"],
            ChronicConditions = ["Hypertension"]
        };
        _patientContextService
            .GetPatientContextAsync("patient-123", Arg.Any<CancellationToken>())
            .Returns(patientContext);

        var chatResponse = new ChatResponse(new ChatMessage(ChatRole.Assistant, "Based on patient context, consider..."));
        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .Returns(chatResponse);

        // Act
        await _service.AskAsync("What should I prescribe?", patientId: "patient-123");

        // Assert — system prompt sent to LLM must contain the patient's chronic condition
        await _chatClient.Received(1).GetResponseAsync(
            Arg.Is<IEnumerable<ChatMessage>>(messages =>
                messages.Any(m => m.Role == ChatRole.System && m.Text != null && m.Text.Contains("Hypertension"))),
            Arg.Any<ChatOptions?>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AskAsync_SkipsPatientContext_WhenPatientIdIsNull()
    {
        // Arrange
        _knowledgeService
            .SearchForContextAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns([]);

        var chatResponse = new ChatResponse(new ChatMessage(ChatRole.Assistant, "General answer."));
        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .Returns(chatResponse);

        // Act
        await _service.AskAsync("What are symptoms of anemia?", patientId: null);

        // Assert — patient context service must never be called
        await _patientContextService
            .DidNotReceive()
            .GetPatientContextAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AskAsync_ReturnsFallback_WhenLlmReturnsEmptyText()
    {
        // Arrange
        _knowledgeService
            .SearchForContextAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns([]);

        var chatResponse = new ChatResponse(new ChatMessage(ChatRole.Assistant, ""));
        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .Returns(chatResponse);

        // Act
        var answer = await _service.AskAsync("How are you?", patientId: null);

        // Assert
        answer.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task AskAsync_StillAnswers_WhenPatientContextFetchReturnsNull()
    {
        // Arrange — patient context service returns null (e.g. Patient.API is down)
        _knowledgeService
            .SearchForContextAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns([]);

        _patientContextService
            .GetPatientContextAsync("unknown-id", Arg.Any<CancellationToken>())
            .Returns((PatientContext?)null);

        var chatResponse = new ChatResponse(new ChatMessage(ChatRole.Assistant, "General answer without patient context."));
        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .Returns(chatResponse);

        // Act
        var answer = await _service.AskAsync("How should I treat this?", patientId: "unknown-id");

        // Assert — still answers even without patient context
        answer.Should().Be("General answer without patient context.");
    }
}
