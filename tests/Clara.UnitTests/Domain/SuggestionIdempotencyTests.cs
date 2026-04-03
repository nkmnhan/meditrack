using Clara.API.Domain;
using FluentAssertions;
using Xunit;

namespace Clara.UnitTests.Domain;

public sealed class SuggestionIdempotencyTests
{
    private static Suggestion CreateSuggestion()
    {
        return new Suggestion
        {
            Id = Guid.NewGuid(),
            SessionId = Guid.NewGuid(),
            Content = "Consider checking blood pressure",
            Type = SuggestionTypeEnum.Clinical,
            Source = SuggestionSourceEnum.Batch,
            TriggeredAt = DateTimeOffset.UtcNow
        };
    }

    [Fact]
    public void Accept_WhenNotActedUpon_ShouldSetAcceptedAt()
    {
        var suggestion = CreateSuggestion();

        suggestion.Accept();

        suggestion.AcceptedAt.Should().NotBeNull();
        suggestion.DismissedAt.Should().BeNull();
    }

    [Fact]
    public void Dismiss_WhenNotActedUpon_ShouldSetDismissedAt()
    {
        var suggestion = CreateSuggestion();

        suggestion.Dismiss();

        suggestion.DismissedAt.Should().NotBeNull();
        suggestion.AcceptedAt.Should().BeNull();
    }

    [Fact]
    public void Accept_WhenAlreadyAccepted_ShouldThrow()
    {
        var suggestion = CreateSuggestion();
        suggestion.Accept();

        var action = () => suggestion.Accept();

        action.Should().Throw<InvalidOperationException>()
            .WithMessage("*already been acted upon*");
    }

    [Fact]
    public void Dismiss_WhenAlreadyDismissed_ShouldThrow()
    {
        var suggestion = CreateSuggestion();
        suggestion.Dismiss();

        var action = () => suggestion.Dismiss();

        action.Should().Throw<InvalidOperationException>()
            .WithMessage("*already been acted upon*");
    }

    [Fact]
    public void Accept_WhenAlreadyDismissed_ShouldThrow()
    {
        var suggestion = CreateSuggestion();
        suggestion.Dismiss();

        var action = () => suggestion.Accept();

        action.Should().Throw<InvalidOperationException>()
            .WithMessage("*already been acted upon*");
    }

    [Fact]
    public void Dismiss_WhenAlreadyAccepted_ShouldThrow()
    {
        var suggestion = CreateSuggestion();
        suggestion.Accept();

        var action = () => suggestion.Dismiss();

        action.Should().Throw<InvalidOperationException>()
            .WithMessage("*already been acted upon*");
    }

    [Fact]
    public void IsActedUpon_WhenNew_ShouldBeFalse()
    {
        var suggestion = CreateSuggestion();

        suggestion.IsActedUpon.Should().BeFalse();
    }

    [Fact]
    public void IsActedUpon_WhenAccepted_ShouldBeTrue()
    {
        var suggestion = CreateSuggestion();
        suggestion.Accept();

        suggestion.IsActedUpon.Should().BeTrue();
    }

    [Fact]
    public void IsActedUpon_WhenDismissed_ShouldBeTrue()
    {
        var suggestion = CreateSuggestion();
        suggestion.Dismiss();

        suggestion.IsActedUpon.Should().BeTrue();
    }
}
