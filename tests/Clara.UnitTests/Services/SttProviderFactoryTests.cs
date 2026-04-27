using Clara.API.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using NSubstitute;
using Xunit;

namespace Clara.UnitTests.Services;

public sealed class SttProviderFactoryTests
{
    private static SttProviderFactory CreateFactory(
        string defaultProvider,
        ISttProvider deepgram,
        ISttProvider whisper)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AI:Stt:DefaultProvider"] = defaultProvider
            })
            .Build();
        return new SttProviderFactory(config, deepgram, whisper);
    }

    [Fact]
    public void GetProvider_WhenConfigIsDeepgram_ReturnsDeepgramProvider()
    {
        var deepgram = Substitute.For<ISttProvider>();
        var whisper = Substitute.For<ISttProvider>();
        var factory = CreateFactory("Deepgram", deepgram, whisper);

        var result = factory.GetProvider("session-1");

        result.Should().BeSameAs(deepgram);
    }

    [Fact]
    public void GetProvider_WhenConfigIsWhisper_ReturnsWhisperProvider()
    {
        var deepgram = Substitute.For<ISttProvider>();
        var whisper = Substitute.For<ISttProvider>();
        var factory = CreateFactory("Whisper", deepgram, whisper);

        var result = factory.GetProvider("session-1");

        result.Should().BeSameAs(whisper);
    }

    [Fact]
    public void GetProvider_WhenConfigIsUnknown_DefaultsToDeepgram()
    {
        var deepgram = Substitute.For<ISttProvider>();
        var whisper = Substitute.For<ISttProvider>();
        var factory = CreateFactory("UnknownProvider", deepgram, whisper);

        var result = factory.GetProvider("session-1");

        result.Should().BeSameAs(deepgram);
    }

    [Fact]
    public void GetProvider_WhenConfigIsMissing_DefaultsToDeepgram()
    {
        var deepgram = Substitute.For<ISttProvider>();
        var whisper = Substitute.For<ISttProvider>();
        var factory = CreateFactory("", deepgram, whisper);

        var result = factory.GetProvider("session-1");

        result.Should().BeSameAs(deepgram);
    }
}
