using Clara.API.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Clara.UnitTests.Services;

public sealed class SuggestionServiceParseTests
{
    private static readonly ILogger Logger = NullLogger.Instance;

    [Fact]
    public void ParseLlmResponse_WithValidJson_ShouldReturnSuggestions()
    {
        var json = """
        {
            "suggestions": [
                {
                    "content": "Consider checking blood pressure",
                    "type": "clinical",
                    "urgency": "medium",
                    "confidence": 0.85
                }
            ]
        }
        """;

        var result = SuggestionService.ParseLlmResponse(json, Logger);

        result.Should().NotBeNull();
        result!.Suggestions.Should().HaveCount(1);
        result.Suggestions[0].Content.Should().Be("Consider checking blood pressure");
    }

    [Fact]
    public void ParseLlmResponse_WithValidJson_ShouldParseTypeAndUrgency()
    {
        var json = """
        {
            "suggestions": [
                {
                    "content": "Check BP",
                    "type": "clinical",
                    "urgency": "medium",
                    "confidence": 0.85
                }
            ]
        }
        """;

        var result = SuggestionService.ParseLlmResponse(json, Logger);

        result!.Suggestions[0].Type.Should().Be("clinical");
        result.Suggestions[0].Urgency.Should().Be("medium");
        result.Suggestions[0].Confidence.Should().BeApproximately(0.85f, 0.01f);
    }

    [Fact]
    public void ParseLlmResponse_WithMarkdownWrappedJson_ShouldExtractJson()
    {
        var response = """
        Here are my suggestions:
        ```json
        {
            "suggestions": [
                {
                    "content": "Review medication interactions",
                    "type": "medication",
                    "urgency": "high",
                    "confidence": 0.9
                }
            ]
        }
        ```
        """;

        var result = SuggestionService.ParseLlmResponse(response, Logger);

        result.Should().NotBeNull();
        result!.Suggestions[0].Content.Should().Be("Review medication interactions");
    }

    [Fact]
    public void ParseLlmResponse_WithMissingType_ShouldDefaultToClinical()
    {
        var json = """{ "suggestions": [{ "content": "Some suggestion", "type": "", "urgency": "low", "confidence": 0.5 }] }""";

        var result = SuggestionService.ParseLlmResponse(json, Logger);

        result!.Suggestions[0].Type.Should().Be("clinical");
    }

    [Fact]
    public void ParseLlmResponse_WithOutOfRangeConfidence_ShouldDefaultTo05()
    {
        var json = """{ "suggestions": [{ "content": "Test", "type": "clinical", "urgency": "medium", "confidence": 1.5 }] }""";

        var result = SuggestionService.ParseLlmResponse(json, Logger);

        result!.Suggestions[0].Confidence.Should().Be(0.5f);
    }

    [Fact]
    public void ParseLlmResponse_WithNegativeConfidence_ShouldDefaultTo05()
    {
        var json = """{ "suggestions": [{ "content": "Test", "type": "clinical", "urgency": "low", "confidence": -0.5 }] }""";

        var result = SuggestionService.ParseLlmResponse(json, Logger);

        result!.Suggestions[0].Confidence.Should().Be(0.5f);
    }

    [Fact]
    public void ParseLlmResponse_WithEmptyContentSuggestion_ShouldRemoveIt()
    {
        var json = """
        {
            "suggestions": [
                { "content": "", "type": "clinical", "urgency": "medium", "confidence": 0.5 },
                { "content": "Valid suggestion", "type": "clinical", "urgency": "medium", "confidence": 0.7 }
            ]
        }
        """;

        var result = SuggestionService.ParseLlmResponse(json, Logger);

        result!.Suggestions.Should().HaveCount(1);
        result.Suggestions[0].Content.Should().Be("Valid suggestion");
    }

    [Fact]
    public void ParseLlmResponse_WithNoJson_ShouldReturnNull()
    {
        var result = SuggestionService.ParseLlmResponse("No JSON here, just plain text.", Logger);
        result.Should().BeNull();
    }

    [Fact]
    public void ParseLlmResponse_WithEmptySuggestionsArray_ShouldReturnNull()
    {
        var result = SuggestionService.ParseLlmResponse("""{ "suggestions": [] }""", Logger);
        result.Should().BeNull();
    }

    [Fact]
    public void ParseLlmResponse_WithInvalidJson_ShouldReturnNull()
    {
        var result = SuggestionService.ParseLlmResponse("{ invalid json }", Logger);
        result.Should().BeNull();
    }

    [Fact]
    public void ParseLlmResponse_WithHtmlInContent_ShouldStripHtmlTags()
    {
        var json = """
        {
            "suggestions": [
                {
                    "content": "Check BP <script>alert('xss')</script> immediately",
                    "type": "clinical",
                    "urgency": "high",
                    "confidence": 0.9
                }
            ]
        }
        """;

        var result = SuggestionService.ParseLlmResponse(json, Logger);

        result.Should().NotBeNull();
        result!.Suggestions[0].Content.Should().NotContain("<script>");
        result.Suggestions[0].Content.Should().NotContain("</script>");
    }

    [Fact]
    public void ParseLlmResponse_WithExcessiveContentLength_ShouldTruncate()
    {
        var longContent = new string('a', 2000);
        var json = $$"""
        {
            "suggestions": [
                {
                    "content": "{{longContent}}",
                    "type": "clinical",
                    "urgency": "medium",
                    "confidence": 0.7
                }
            ]
        }
        """;

        var result = SuggestionService.ParseLlmResponse(json, Logger);

        result.Should().NotBeNull();
        result!.Suggestions[0].Content.Length.Should().BeLessThanOrEqualTo(1000);
    }

    [Fact]
    public void ParseLlmResponse_WithInvalidType_ShouldDefaultToClinical()
    {
        var json = """{ "suggestions": [{ "content": "Valid", "type": "malicious_type; DROP TABLE", "urgency": "medium", "confidence": 0.7 }] }""";

        var result = SuggestionService.ParseLlmResponse(json, Logger);

        result!.Suggestions[0].Type.Should().Be("clinical");
    }

    [Fact]
    public void ParseLlmResponse_WithReasoning_PreservesReasoningField()
    {
        var json = """{"suggestions": [{"content": "Check BP", "type": "clinical", "urgency": "medium", "confidence": 0.85, "reasoning": "Patient mentioned dizziness"}]}""";

        var result = SuggestionService.ParseLlmResponse(json, NullLogger<SuggestionService>.Instance);

        result.Should().NotBeNull();
        result!.Suggestions[0].Reasoning.Should().Be("Patient mentioned dizziness");
    }

    [Fact]
    public void ParseLlmResponse_WithoutReasoning_DefaultsToNull()
    {
        var json = """{"suggestions": [{"content": "Check BP", "type": "clinical", "urgency": "medium", "confidence": 0.85}]}""";

        var result = SuggestionService.ParseLlmResponse(json, NullLogger<SuggestionService>.Instance);

        result.Should().NotBeNull();
        result!.Suggestions[0].Reasoning.Should().BeNull();
    }
}
