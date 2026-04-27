using Clara.API.Services;
using Clara.UnitTests.TestInfrastructure;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Clara.UnitTests.Services;

public sealed class DeepgramStreamingServiceTests
{
    private static DeepgramStreamingService CreateService(FakeDeepgramWebSocket fakeWs)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AI:Deepgram:ApiKey"] = "test-key"
            })
            .Build();

        var factory = new FakeDeepgramWebSocketFactory(fakeWs);
        return new DeepgramStreamingService(
            config,
            factory,
            NullLogger<DeepgramStreamingService>.Instance);
    }

    [Fact]
    public async Task OpenStreamAsync_WhenFinalTranscriptReceived_InvokesCallback()
    {
        var fakeWs = new FakeDeepgramWebSocket();
        fakeWs.EnqueueMessage("""
        {
            "type": "Results",
            "is_final": true,
            "channel": {
                "alternatives": [{ "transcript": "chest pain", "confidence": 0.97 }]
            }
        }
        """);

        var service = CreateService(fakeWs);
        var received = new List<TranscriptChunk>();

        await service.OpenStreamAsync("session-1", chunk =>
        {
            received.Add(chunk);
            return Task.CompletedTask;
        });

        await Task.Delay(150);

        received.Should().HaveCount(1);
        received[0].Transcript.Should().Be("chest pain");
        received[0].Confidence.Should().BeApproximately(0.97f, 0.01f);
        received[0].IsFinal.Should().BeTrue();
    }

    [Fact]
    public async Task OpenStreamAsync_WhenInterimTranscriptReceived_InvokesCallbackWithIsFinalFalse()
    {
        var fakeWs = new FakeDeepgramWebSocket();
        fakeWs.EnqueueMessage("""
        {
            "type": "Results",
            "is_final": false,
            "channel": {
                "alternatives": [{ "transcript": "I have", "confidence": 0.85 }]
            }
        }
        """);

        var service = CreateService(fakeWs);
        var received = new List<TranscriptChunk>();

        await service.OpenStreamAsync("session-2", chunk =>
        {
            received.Add(chunk);
            return Task.CompletedTask;
        });

        await Task.Delay(150);

        received.Should().HaveCount(1);
        received[0].IsFinal.Should().BeFalse();
        received[0].Transcript.Should().Be("I have");
    }

    [Fact]
    public async Task OpenStreamAsync_WhenEmptyTranscriptReceived_DoesNotInvokeCallback()
    {
        var fakeWs = new FakeDeepgramWebSocket();
        fakeWs.EnqueueMessage("""
        {
            "type": "Results",
            "is_final": true,
            "channel": {
                "alternatives": [{ "transcript": "", "confidence": 0.0 }]
            }
        }
        """);

        var service = CreateService(fakeWs);
        var received = new List<TranscriptChunk>();
        await service.OpenStreamAsync("session-3", chunk =>
        {
            received.Add(chunk);
            return Task.CompletedTask;
        });

        await Task.Delay(150);

        received.Should().BeEmpty();
    }

    [Fact]
    public async Task OpenStreamAsync_WhenMetadataMessageReceived_DoesNotInvokeCallback()
    {
        var fakeWs = new FakeDeepgramWebSocket();
        fakeWs.EnqueueMessage("""{"type": "Metadata", "transaction_key": "abc"}""");

        var service = CreateService(fakeWs);
        var received = new List<TranscriptChunk>();
        await service.OpenStreamAsync("session-4", chunk =>
        {
            received.Add(chunk);
            return Task.CompletedTask;
        });

        await Task.Delay(150);

        received.Should().BeEmpty();
    }

    [Fact]
    public async Task CloseStreamAsync_WhenSessionExists_RemovesSessionAndClosesSocket()
    {
        var fakeWs = new FakeDeepgramWebSocket();
        var service = CreateService(fakeWs);

        await service.OpenStreamAsync("session-5", _ => Task.CompletedTask);
        await service.CloseStreamAsync("session-5");

        fakeWs.IsClosed.Should().BeTrue();
    }

    [Fact]
    public async Task CloseStreamAsync_WhenSessionDoesNotExist_DoesNotThrow()
    {
        var fakeWs = new FakeDeepgramWebSocket();
        var service = CreateService(fakeWs);

        var act = async () => await service.CloseStreamAsync("nonexistent-session");
        await act.Should().NotThrowAsync();
    }
}
