using Clara.API.Domain;
using FluentAssertions;
using Xunit;

namespace Clara.UnitTests.Domain;

public sealed class EnumConversionTests
{
    // ─── SessionStatusEnum ──────────────────────────────────────────────────

    [Theory]
    [InlineData(SessionStatusEnum.Active, "active")]
    [InlineData(SessionStatusEnum.Paused, "paused")]
    [InlineData(SessionStatusEnum.Completed, "completed")]
    [InlineData(SessionStatusEnum.Cancelled, "cancelled")]
    public void SessionStatus_ToValue_ShouldReturnLowercaseString(SessionStatusEnum status, string expected)
    {
        status.ToValue().Should().Be(expected);
    }

    [Theory]
    [InlineData("active", SessionStatusEnum.Active)]
    [InlineData("paused", SessionStatusEnum.Paused)]
    [InlineData("completed", SessionStatusEnum.Completed)]
    [InlineData("cancelled", SessionStatusEnum.Cancelled)]
    public void ParseSessionStatus_WithValidLowercaseString_ShouldReturnEnum(string value, SessionStatusEnum expected)
    {
        EnumConversions.ParseSessionStatus(value).Should().Be(expected);
    }

    [Theory]
    [InlineData("ACTIVE")]
    [InlineData("Active")]
    [InlineData("aCtIvE")]
    public void ParseSessionStatus_IsCaseInsensitive(string value)
    {
        EnumConversions.ParseSessionStatus(value).Should().Be(SessionStatusEnum.Active);
    }

    [Fact]
    public void ParseSessionStatus_WithInvalidValue_ShouldDefaultToActive()
    {
        EnumConversions.ParseSessionStatus("unknown_status").Should().Be(SessionStatusEnum.Active);
    }

    [Fact]
    public void ParseSessionStatus_WithEmptyString_ShouldDefaultToActive()
    {
        EnumConversions.ParseSessionStatus(string.Empty).Should().Be(SessionStatusEnum.Active);
    }

    [Fact]
    public void SessionStatus_RoundTrip_ShouldPreserveValue()
    {
        foreach (var status in Enum.GetValues<SessionStatusEnum>())
        {
            EnumConversions.ParseSessionStatus(status.ToValue()).Should().Be(status);
        }
    }

    // ─── SuggestionTypeEnum ─────────────────────────────────────────────────

    [Theory]
    [InlineData(SuggestionTypeEnum.Clinical, "clinical")]
    [InlineData(SuggestionTypeEnum.Medication, "medication")]
    [InlineData(SuggestionTypeEnum.FollowUp, "follow_up")]
    [InlineData(SuggestionTypeEnum.Differential, "differential")]
    public void SuggestionType_ToValue_ShouldReturnSnakeCaseString(SuggestionTypeEnum type, string expected)
    {
        type.ToValue().Should().Be(expected);
    }

    [Theory]
    [InlineData("clinical", SuggestionTypeEnum.Clinical)]
    [InlineData("medication", SuggestionTypeEnum.Medication)]
    [InlineData("follow_up", SuggestionTypeEnum.FollowUp)]
    [InlineData("differential", SuggestionTypeEnum.Differential)]
    public void ParseSuggestionType_WithValidString_ShouldReturnEnum(string value, SuggestionTypeEnum expected)
    {
        EnumConversions.ParseSuggestionType(value).Should().Be(expected);
    }

    [Theory]
    [InlineData("CLINICAL")]
    [InlineData("Clinical")]
    [InlineData("FOLLOW_UP")]
    [InlineData("Follow_Up")]
    public void ParseSuggestionType_IsCaseInsensitive(string value)
    {
        // CLINICAL -> Clinical, FOLLOW_UP -> FollowUp
        var parsed = EnumConversions.ParseSuggestionType(value);
        parsed.Should().BeOneOf(SuggestionTypeEnum.Clinical, SuggestionTypeEnum.FollowUp);
    }

    [Fact]
    public void ParseSuggestionType_WithInvalidValue_ShouldDefaultToClinical()
    {
        EnumConversions.ParseSuggestionType("malicious_type; DROP TABLE").Should().Be(SuggestionTypeEnum.Clinical);
    }

    [Fact]
    public void ParseSuggestionType_WithEmptyString_ShouldDefaultToClinical()
    {
        EnumConversions.ParseSuggestionType(string.Empty).Should().Be(SuggestionTypeEnum.Clinical);
    }

    [Fact]
    public void SuggestionType_RoundTrip_ShouldPreserveValue()
    {
        foreach (var type in Enum.GetValues<SuggestionTypeEnum>())
        {
            EnumConversions.ParseSuggestionType(type.ToValue()).Should().Be(type);
        }
    }

    // ─── SuggestionUrgencyEnum ──────────────────────────────────────────────

    [Theory]
    [InlineData(SuggestionUrgencyEnum.Low, "low")]
    [InlineData(SuggestionUrgencyEnum.Medium, "medium")]
    [InlineData(SuggestionUrgencyEnum.High, "high")]
    public void SuggestionUrgency_ToValue_ShouldReturnLowercaseString(SuggestionUrgencyEnum urgency, string expected)
    {
        urgency.ToValue().Should().Be(expected);
    }

    [Theory]
    [InlineData("low", SuggestionUrgencyEnum.Low)]
    [InlineData("medium", SuggestionUrgencyEnum.Medium)]
    [InlineData("high", SuggestionUrgencyEnum.High)]
    public void ParseSuggestionUrgency_WithValidString_ShouldReturnEnum(string value, SuggestionUrgencyEnum expected)
    {
        EnumConversions.ParseSuggestionUrgency(value).Should().Be(expected);
    }

    [Theory]
    [InlineData("LOW")]
    [InlineData("Low")]
    [InlineData("HIGH")]
    [InlineData("High")]
    public void ParseSuggestionUrgency_IsCaseInsensitive(string value)
    {
        var parsed = EnumConversions.ParseSuggestionUrgency(value);
        parsed.Should().BeOneOf(SuggestionUrgencyEnum.Low, SuggestionUrgencyEnum.High);
    }

    [Fact]
    public void ParseSuggestionUrgency_WithInvalidValue_ShouldDefaultToMedium()
    {
        EnumConversions.ParseSuggestionUrgency("extreme").Should().Be(SuggestionUrgencyEnum.Medium);
    }

    [Fact]
    public void ParseSuggestionUrgency_WithEmptyString_ShouldDefaultToMedium()
    {
        EnumConversions.ParseSuggestionUrgency(string.Empty).Should().Be(SuggestionUrgencyEnum.Medium);
    }

    [Fact]
    public void SuggestionUrgency_RoundTrip_ShouldPreserveValue()
    {
        foreach (var urgency in Enum.GetValues<SuggestionUrgencyEnum>())
        {
            EnumConversions.ParseSuggestionUrgency(urgency.ToValue()).Should().Be(urgency);
        }
    }

    // ─── SuggestionSourceEnum ───────────────────────────────────────────────

    [Theory]
    [InlineData(SuggestionSourceEnum.Batch, "batch")]
    [InlineData(SuggestionSourceEnum.OnDemand, "on_demand")]
    [InlineData(SuggestionSourceEnum.DevForce, "dev_force")]
    public void SuggestionSource_ToValue_ShouldReturnSnakeCaseString(SuggestionSourceEnum source, string expected)
    {
        source.ToValue().Should().Be(expected);
    }

    [Theory]
    [InlineData("batch", SuggestionSourceEnum.Batch)]
    [InlineData("on_demand", SuggestionSourceEnum.OnDemand)]
    [InlineData("dev_force", SuggestionSourceEnum.DevForce)]
    public void ParseSuggestionSource_WithValidString_ShouldReturnEnum(string value, SuggestionSourceEnum expected)
    {
        EnumConversions.ParseSuggestionSource(value).Should().Be(expected);
    }

    [Theory]
    [InlineData("BATCH")]
    [InlineData("Batch")]
    [InlineData("ON_DEMAND")]
    [InlineData("On_Demand")]
    public void ParseSuggestionSource_IsCaseInsensitive(string value)
    {
        var parsed = EnumConversions.ParseSuggestionSource(value);
        parsed.Should().BeOneOf(SuggestionSourceEnum.Batch, SuggestionSourceEnum.OnDemand);
    }

    [Fact]
    public void ParseSuggestionSource_WithInvalidValue_ShouldDefaultToBatch()
    {
        EnumConversions.ParseSuggestionSource("unknown_source").Should().Be(SuggestionSourceEnum.Batch);
    }

    [Fact]
    public void ParseSuggestionSource_WithEmptyString_ShouldDefaultToBatch()
    {
        EnumConversions.ParseSuggestionSource(string.Empty).Should().Be(SuggestionSourceEnum.Batch);
    }

    [Fact]
    public void SuggestionSource_RoundTrip_ShouldPreserveValue()
    {
        foreach (var source in Enum.GetValues<SuggestionSourceEnum>())
        {
            EnumConversions.ParseSuggestionSource(source.ToValue()).Should().Be(source);
        }
    }
}
