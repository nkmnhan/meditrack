using Clara.API.Extensions;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using NSubstitute;
using Xunit;

namespace Clara.UnitTests.Configuration;

public sealed class ConfigValidationTests
{
    [Theory]
    [InlineData("REPLACE_IN_OVERRIDE")]
    [InlineData("sk-placeholder-for-dev")]
    [InlineData("placeholder-for-dev")]
    [InlineData("")]
    [InlineData("   ")]
    public void IsRealApiKey_WithPlaceholderValue_ShouldReturnFalse(string value)
    {
        ConfigValidator.IsRealApiKey(value).Should().BeFalse();
    }

    [Fact]
    public void IsRealApiKey_WithNull_ShouldReturnFalse()
    {
        ConfigValidator.IsRealApiKey(null).Should().BeFalse();
    }

    [Fact]
    public void IsRealApiKey_WithRealKey_ShouldReturnTrue()
    {
        ConfigValidator.IsRealApiKey("sk-proj-abc123def456").Should().BeTrue();
    }

    [Fact]
    public void ValidateProductionConfig_WithOpenAIProviderAndRealKeys_DoesNotThrow()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AI:ChatProvider"] = "openai",
                ["AI:OpenAI:ApiKey"] = "sk-real-key",
                ["AI:Deepgram:ApiKey"] = "dg-real-key"
            })
            .Build();
        var env = Substitute.For<IHostEnvironment>();
        env.EnvironmentName.Returns("Production");

        var act = () => ConfigValidator.ValidateProductionConfig(config, env);

        act.Should().NotThrow();
    }

    [Fact]
    public void ValidateProductionConfig_WithAnthropicProviderAndRealKeys_DoesNotThrow()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AI:ChatProvider"] = "anthropic",
                ["AI:Anthropic:ApiKey"] = "sk-ant-real-key",
                ["AI:Deepgram:ApiKey"] = "dg-real-key"
            })
            .Build();
        var env = Substitute.For<IHostEnvironment>();
        env.EnvironmentName.Returns("Production");

        var act = () => ConfigValidator.ValidateProductionConfig(config, env);

        act.Should().NotThrow();
    }

    [Fact]
    public void ValidateProductionConfig_WithAnthropicProviderAndPlaceholderAnthropicKey_Throws()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AI:ChatProvider"] = "anthropic",
                ["AI:Anthropic:ApiKey"] = "REPLACE_IN_OVERRIDE",
                ["AI:Deepgram:ApiKey"] = "dg-real-key"
            })
            .Build();
        var env = Substitute.For<IHostEnvironment>();
        env.EnvironmentName.Returns("Production");

        var act = () => ConfigValidator.ValidateProductionConfig(config, env);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*AI:Anthropic:ApiKey*");
    }

    [Fact]
    public void ValidateProductionConfig_WithAnthropicProvider_DoesNotRequireOpenAIKey()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AI:ChatProvider"] = "anthropic",
                ["AI:Anthropic:ApiKey"] = "sk-ant-real-key",
                ["AI:OpenAI:ApiKey"] = "REPLACE_IN_OVERRIDE",
                ["AI:Deepgram:ApiKey"] = "dg-real-key"
            })
            .Build();
        var env = Substitute.For<IHostEnvironment>();
        env.EnvironmentName.Returns("Production");

        var act = () => ConfigValidator.ValidateProductionConfig(config, env);

        act.Should().NotThrow();
    }
}
