using Clara.API.Services;
using FluentAssertions;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace Clara.UnitTests.Services;

public sealed class SuggestionCriticServiceTests
{
    private readonly IChatClient _chatClient;
    private readonly SuggestionCriticService _service;

    public SuggestionCriticServiceTests()
    {
        _chatClient = Substitute.For<IChatClient>();
        _service = new SuggestionCriticService(
            _chatClient,
            NullLogger<SuggestionCriticService>.Instance);
    }

    [Fact]
    public async Task CritiqueAsync_AllSupported_ReturnsAllSuggestions()
    {
        // Arrange
        var suggestions = new List<SuggestionItem>
        {
            new() { Content = "Patient reports dizziness", Type = "clinical", Urgency = "medium", Confidence = 0.8f },
            new() { Content = "Consider blood pressure check", Type = "clinical", Urgency = "low", Confidence = 0.7f }
        };

        var criticJson = """
            {
              "critiqued_suggestions": [
                { "content": "Patient reports dizziness", "supported": true, "revised_content": null },
                { "content": "Consider blood pressure check", "supported": true, "revised_content": null }
              ]
            }
            """;

        var chatResponse = new ChatResponse(new ChatMessage(ChatRole.Assistant, criticJson));
        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .Returns(chatResponse);

        // Act
        var result = await _service.CritiqueAsync(suggestions, "Doctor: Patient has dizziness.");

        // Assert
        result.Should().HaveCount(2);
        result[0].Content.Should().Be("Patient reports dizziness");
        result[1].Content.Should().Be("Consider blood pressure check");
    }

    [Fact]
    public async Task CritiqueAsync_UnsupportedClaim_RemovesSuggestion()
    {
        // Arrange
        var suggestions = new List<SuggestionItem>
        {
            new() { Content = "Patient reports dizziness", Type = "clinical", Urgency = "medium", Confidence = 0.8f },
            new() { Content = "Patient is on metformin", Type = "medication", Urgency = "high", Confidence = 0.9f }
        };

        var criticJson = """
            {
              "critiqued_suggestions": [
                { "content": "Patient reports dizziness", "supported": true, "revised_content": null },
                { "content": "Patient is on metformin", "supported": false, "revised_content": null }
              ]
            }
            """;

        var chatResponse = new ChatResponse(new ChatMessage(ChatRole.Assistant, criticJson));
        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .Returns(chatResponse);

        // Act
        var result = await _service.CritiqueAsync(suggestions, "Doctor: Patient has dizziness.");

        // Assert — hallucinated medication claim removed
        result.Should().HaveCount(1);
        result[0].Content.Should().Be("Patient reports dizziness");
    }

    [Fact]
    public async Task CritiqueAsync_RevisedContent_UsesRevisedVersion()
    {
        // Arrange
        var suggestions = new List<SuggestionItem>
        {
            new() { Content = "Patient reports severe chest pain", Type = "clinical", Urgency = "high", Confidence = 0.9f }
        };

        var criticJson = """
            {
              "critiqued_suggestions": [
                {
                  "content": "Patient reports severe chest pain",
                  "supported": true,
                  "revised_content": "Patient reports mild chest discomfort"
                }
              ]
            }
            """;

        var chatResponse = new ChatResponse(new ChatMessage(ChatRole.Assistant, criticJson));
        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .Returns(chatResponse);

        // Act
        var result = await _service.CritiqueAsync(suggestions, "Doctor: Patient mentions some chest discomfort.");

        // Assert — revised content replaces original
        result.Should().HaveCount(1);
        result[0].Content.Should().Be("Patient reports mild chest discomfort");
    }

    [Fact]
    public async Task CritiqueAsync_CriticFails_ReturnsOriginalSuggestions()
    {
        // Arrange
        var suggestions = new List<SuggestionItem>
        {
            new() { Content = "Patient reports dizziness", Type = "clinical", Urgency = "medium", Confidence = 0.8f }
        };

        _chatClient
            .GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("LLM service unavailable"));

        // Act
        var result = await _service.CritiqueAsync(suggestions, "Doctor: Patient has dizziness.");

        // Assert — graceful degradation: originals returned when critic fails
        result.Should().HaveCount(1);
        result[0].Content.Should().Be("Patient reports dizziness");
    }
}
