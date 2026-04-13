using Clara.API.Services;
using FluentAssertions;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace Clara.UnitTests.Services;

public sealed class CorrectiveRagServiceTests
{
    private readonly IKnowledgeService _knowledgeService;
    private readonly IChatClient _chatClient;
    private readonly CorrectiveRagService _service;

    private static readonly KnowledgeSearchResult SampleResult = new()
    {
        ChunkId = Guid.NewGuid(),
        DocumentName = "cardiology-guidelines.pdf",
        Content = "ACE inhibitors are first-line treatment for hypertension.",
        Category = "Cardiology",
        Score = 0.85f
    };

    public CorrectiveRagServiceTests()
    {
        _knowledgeService = Substitute.For<IKnowledgeService>();
        _chatClient = Substitute.For<IChatClient>();
        _service = new CorrectiveRagService(
            _knowledgeService,
            _chatClient,
            NullLogger<CorrectiveRagService>.Instance);
    }

    [Fact]
    public async Task SearchWithGradingAsync_HighRelevance_ReturnsOriginalResults()
    {
        // Arrange
        var originalResults = new List<KnowledgeSearchResult> { SampleResult };
        _knowledgeService
            .SearchAsync("hypertension treatment", 3, 0.7f, Arg.Any<CancellationToken>())
            .Returns(originalResults);

        var gradingJson = """{"relevance_score": 0.8}""";
        var chatResponse = new ChatResponse(new ChatMessage(ChatRole.Assistant, gradingJson));
        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .Returns(chatResponse);

        // Act
        var results = await _service.SearchWithGradingAsync("hypertension treatment");

        // Assert
        results.Should().BeEquivalentTo(originalResults);
        await _knowledgeService
            .Received(1)
            .SearchAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<float>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task SearchWithGradingAsync_LowRelevance_RewritesAndRetries()
    {
        // Arrange
        var originalResults = new List<KnowledgeSearchResult> { SampleResult };
        var retryResults = new List<KnowledgeSearchResult>
        {
            new()
            {
                ChunkId = Guid.NewGuid(),
                DocumentName = "hypertension-protocol.pdf",
                Content = "First-line antihypertensive therapy protocol.",
                Score = 0.92f
            }
        };

        _knowledgeService
            .SearchAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<float>(), Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var query = callInfo.ArgAt<string>(0);
                return query == "antihypertensive first-line treatment options"
                    ? retryResults
                    : originalResults;
            });

        var gradingJson = """{"relevance_score": 0.3, "rewritten_query": "antihypertensive first-line treatment options"}""";
        var chatResponse = new ChatResponse(new ChatMessage(ChatRole.Assistant, gradingJson));
        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .Returns(chatResponse);

        // Act
        var results = await _service.SearchWithGradingAsync("high blood pressure");

        // Assert
        results.Should().BeEquivalentTo(retryResults);
        await _knowledgeService
            .Received(2)
            .SearchAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<float>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task SearchWithGradingAsync_NoResults_ReturnsEmptyWithoutGrading()
    {
        // Arrange
        _knowledgeService
            .SearchAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<float>(), Arg.Any<CancellationToken>())
            .Returns([]);

        // Act
        var results = await _service.SearchWithGradingAsync("obscure medical query");

        // Assert
        results.Should().BeEmpty();
        await _chatClient
            .DidNotReceive()
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task SearchWithGradingAsync_GradingFails_ReturnsOriginalResults()
    {
        // Arrange
        var originalResults = new List<KnowledgeSearchResult> { SampleResult };
        _knowledgeService
            .SearchAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<float>(), Arg.Any<CancellationToken>())
            .Returns(originalResults);

        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("LLM service unavailable"));

        // Act
        var results = await _service.SearchWithGradingAsync("chest pain management");

        // Assert — fail safe: grading error must never block retrieval
        results.Should().BeEquivalentTo(originalResults);
    }

    [Fact]
    public async Task SearchWithGradingAsync_LowRelevanceNoRewrite_ReturnsOriginal()
    {
        // Arrange
        var originalResults = new List<KnowledgeSearchResult> { SampleResult };
        _knowledgeService
            .SearchAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<float>(), Arg.Any<CancellationToken>())
            .Returns(originalResults);

        // No rewritten_query field in response
        var gradingJson = """{"relevance_score": 0.3}""";
        var chatResponse = new ChatResponse(new ChatMessage(ChatRole.Assistant, gradingJson));
        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .Returns(chatResponse);

        // Act
        var results = await _service.SearchWithGradingAsync("vague symptoms query");

        // Assert — no retry without a rewrite, fall back to original
        results.Should().BeEquivalentTo(originalResults);
        await _knowledgeService
            .Received(1)
            .SearchAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<float>(), Arg.Any<CancellationToken>());
    }
}
