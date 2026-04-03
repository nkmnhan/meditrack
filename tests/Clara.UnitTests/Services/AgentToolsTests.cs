using Clara.API.Services;
using FluentAssertions;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using NSubstitute.ReturnsExtensions;
using Xunit;

namespace Clara.UnitTests.Services;

public sealed class AgentToolsTests
{
    private readonly ICorrectiveRagService _ragService;
    private readonly IPatientContextService _patientContextService;
    private readonly AgentTools _agentTools;

    private static readonly KnowledgeSearchResult SampleResult = new()
    {
        ChunkId = Guid.NewGuid(),
        DocumentName = "hypertension-guidelines.pdf",
        Content = "ACE inhibitors are first-line treatment for hypertension.",
        Category = "Cardiology",
        Score = 0.88f
    };

    public AgentToolsTests()
    {
        _ragService = Substitute.For<ICorrectiveRagService>();
        _patientContextService = Substitute.For<IPatientContextService>();
        _agentTools = new AgentTools(
            _ragService,
            _patientContextService,
            NullLogger<AgentTools>.Instance);
    }

    [Fact]
    public async Task SearchKnowledgeAsync_WithResults_ReturnsFormattedTextWithSourceNames()
    {
        // Arrange
        var results = new List<KnowledgeSearchResult> { SampleResult };
        _ragService
            .SearchWithGradingAsync("hypertension treatment", topK: 3, Arg.Any<float>(), Arg.Any<CancellationToken>())
            .Returns(results);

        // Act
        var response = await _agentTools.SearchKnowledgeAsync("hypertension treatment");

        // Assert
        response.Should().Contain("hypertension-guidelines.pdf");
        response.Should().Contain("ACE inhibitors are first-line treatment");
        response.Should().Contain("0.88");
    }

    [Fact]
    public async Task SearchKnowledgeAsync_WithNoResults_ReturnsNoRelevantMessage()
    {
        // Arrange
        _ragService
            .SearchWithGradingAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<float>(), Arg.Any<CancellationToken>())
            .Returns([]);

        // Act
        var response = await _agentTools.SearchKnowledgeAsync("obscure clinical query");

        // Assert
        response.Should().Contain("No relevant medical guidelines found");
    }

    [Fact]
    public async Task SearchKnowledgeAsync_WithMultipleResults_SeparatesWithDivider()
    {
        // Arrange
        var secondResult = new KnowledgeSearchResult
        {
            ChunkId = Guid.NewGuid(),
            DocumentName = "cardiology-protocols.pdf",
            Content = "Beta blockers are second-line for hypertension.",
            Score = 0.75f
        };

        _ragService
            .SearchWithGradingAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<float>(), Arg.Any<CancellationToken>())
            .Returns([SampleResult, secondResult]);

        // Act
        var response = await _agentTools.SearchKnowledgeAsync("hypertension");

        // Assert — multiple results must be separated with the divider
        response.Should().Contain("---");
        response.Should().Contain("hypertension-guidelines.pdf");
        response.Should().Contain("cardiology-protocols.pdf");
    }

    [Fact]
    public async Task GetPatientContextAsync_WhenPatientFound_ReturnsFormattedPromptSection()
    {
        // Arrange
        var patientContext = new PatientContext
        {
            PatientId = "p-123",
            Age = 45,
            Gender = "Male",
            Allergies = ["Penicillin"],
            ChronicConditions = ["Hypertension"]
        };
        _patientContextService
            .GetPatientContextAsync("p-123", Arg.Any<CancellationToken>())
            .Returns(patientContext);

        // Act
        var response = await _agentTools.GetPatientContextAsync("p-123");

        // Assert
        response.Should().Contain("Age: 45");
        response.Should().Contain("Penicillin");
        response.Should().Contain("Hypertension");
    }

    [Fact]
    public async Task GetPatientContextAsync_WhenPatientNotFound_ReturnsNotAvailableMessage()
    {
        // Arrange
        _patientContextService
            .GetPatientContextAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .ReturnsNull();

        // Act
        var response = await _agentTools.GetPatientContextAsync("p-unknown");

        // Assert
        response.Should().Contain("not available");
        response.Should().Contain("transcript only");
    }

    [Fact]
    public void CreateAITools_ReturnsTwoTools()
    {
        // Act
        var tools = _agentTools.CreateAITools();

        // Assert
        tools.Should().HaveCount(2);
    }

    [Fact]
    public void CreateAITools_ContainsSearchKnowledgeTool()
    {
        // Act
        var tools = _agentTools.CreateAITools();

        // Assert — search_knowledge tool must be registered
        tools.Should().ContainSingle(tool => tool.Name == "search_knowledge");
    }

    [Fact]
    public void CreateAITools_ContainsGetPatientContextTool()
    {
        // Act
        var tools = _agentTools.CreateAITools();

        // Assert — get_patient_context tool must be registered
        tools.Should().ContainSingle(tool => tool.Name == "get_patient_context");
    }
}
