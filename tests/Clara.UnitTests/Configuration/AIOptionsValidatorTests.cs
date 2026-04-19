using Clara.API.Application.Models;
using FluentAssertions;
using Xunit;

namespace Clara.UnitTests.Configuration;

public sealed class AIOptionsValidatorTests
{
    private readonly AIOptionsValidator _validator = new();

    [Theory]
    [InlineData("openai")]
    [InlineData("OpenAI")]
    [InlineData("OPENAI")]
    public void Validate_OpenAIProviderWithApiKey_Succeeds(string provider)
    {
        var opts = new AIOptions { ChatProvider = provider };
        opts.OpenAI.ApiKey = "sk-real-key";

        var result = _validator.Validate(null, opts);

        result.Succeeded.Should().BeTrue();
    }

    [Theory]
    [InlineData("anthropic")]
    [InlineData("Anthropic")]
    [InlineData("ANTHROPIC")]
    public void Validate_AnthropicProviderWithApiKey_Succeeds(string provider)
    {
        var opts = new AIOptions { ChatProvider = provider };
        opts.Anthropic.ApiKey = "sk-ant-real-key";

        var result = _validator.Validate(null, opts);

        result.Succeeded.Should().BeTrue();
    }

    [Fact]
    public void Validate_UnknownProvider_Fails()
    {
        var opts = new AIOptions { ChatProvider = "gemini" };

        var result = _validator.Validate(null, opts);

        result.Failed.Should().BeTrue();
        result.FailureMessage.Should().Contain("gemini");
    }

    [Fact]
    public void Validate_OpenAIProviderMissingApiKey_Fails()
    {
        var opts = new AIOptions { ChatProvider = "openai" };
        opts.OpenAI.ApiKey = string.Empty;

        var result = _validator.Validate(null, opts);

        result.Failed.Should().BeTrue();
        result.FailureMessage.Should().Contain("AI:OpenAI:ApiKey");
    }

    [Fact]
    public void Validate_AnthropicProviderMissingApiKey_Fails()
    {
        var opts = new AIOptions { ChatProvider = "anthropic" };
        opts.Anthropic.ApiKey = string.Empty;

        var result = _validator.Validate(null, opts);

        result.Failed.Should().BeTrue();
        result.FailureMessage.Should().Contain("AI:Anthropic:ApiKey");
    }
}
