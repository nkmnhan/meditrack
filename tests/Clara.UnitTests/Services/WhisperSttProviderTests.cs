using System.Net;
using Clara.API.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Clara.UnitTests.Services;

public sealed class WhisperSttProviderTests
{
    private static (WhisperSttProvider provider, List<HttpRequestMessage> requests) CreateProvider(
        string responseJson,
        string baseUrl = "http://whisper-test",
        int bufferSeconds = 1)
    {
        var requests = new List<HttpRequestMessage>();
        var handler = new FakeHttpMessageHandler(responseJson, requests);
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri(baseUrl) };

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AI:Whisper:BaseUrl"] = baseUrl,
                ["AI:Whisper:BufferSeconds"] = bufferSeconds.ToString(),
                ["AI:Whisper:Model"] = "base.en"
            })
            .Build();

        var provider = new WhisperSttProvider(
            httpClient,
            config,
            NullLogger<WhisperSttProvider>.Instance);

        return (provider, requests);
    }

    [Fact]
    public async Task SendAudioAsync_WhenBufferFills_CallsWhisperAndInvokesCallback()
    {
        const string whisperResponse = """{"text": "patient reports chest pain"}""";
        var (provider, requests) = CreateProvider(whisperResponse, bufferSeconds: 1);
        var received = new List<TranscriptChunk>();

        await provider.OpenStreamAsync("s1", chunk => { received.Add(chunk); return Task.CompletedTask; });

        // 1s of PCM16 at 16kHz = 32000 bytes
        var audio = new byte[32000];
        await provider.SendAudioAsync("s1", audio);

        received.Should().HaveCount(1);
        received[0].Transcript.Should().Be("patient reports chest pain");
        received[0].IsFinal.Should().BeTrue();
        requests.Should().HaveCount(1);
        requests[0].RequestUri!.PathAndQuery.Should().Contain("transcriptions");
    }

    [Fact]
    public async Task SendAudioAsync_WhenBufferNotFull_DoesNotCallWhisper()
    {
        var (provider, requests) = CreateProvider("""{"text": "hello"}""", bufferSeconds: 5);
        await provider.OpenStreamAsync("s2", _ => Task.CompletedTask);

        // Small chunk — far below 5s buffer
        await provider.SendAudioAsync("s2", new byte[1000]);

        requests.Should().BeEmpty();
    }

    [Fact]
    public async Task CloseStreamAsync_FlushesRemainingBuffer()
    {
        var (provider, requests) = CreateProvider("""{"text": "final words"}""", bufferSeconds: 10);
        var received = new List<TranscriptChunk>();

        await provider.OpenStreamAsync("s3", chunk => { received.Add(chunk); return Task.CompletedTask; });
        await provider.SendAudioAsync("s3", new byte[1000]);

        // Close should flush even though buffer is below threshold
        await provider.CloseStreamAsync("s3");

        received.Should().HaveCount(1);
        received[0].Transcript.Should().Be("final words");
    }

    [Fact]
    public async Task CloseStreamAsync_WhenSessionDoesNotExist_DoesNotThrow()
    {
        var (provider, _) = CreateProvider("""{"text": ""}""");
        var act = async () => await provider.CloseStreamAsync("nonexistent");
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task SendAudioAsync_WhenWhisperReturnsEmpty_DoesNotInvokeCallback()
    {
        var (provider, _) = CreateProvider("""{"text": ""}""", bufferSeconds: 1);
        var received = new List<TranscriptChunk>();

        await provider.OpenStreamAsync("s4", chunk => { received.Add(chunk); return Task.CompletedTask; });
        await provider.SendAudioAsync("s4", new byte[32000]);

        received.Should().BeEmpty();
    }
}

file sealed class FakeHttpMessageHandler : HttpMessageHandler
{
    private readonly string _responseBody;
    private readonly List<HttpRequestMessage> _requests;

    public FakeHttpMessageHandler(string responseBody, List<HttpRequestMessage> requests)
    {
        _responseBody = responseBody;
        _requests = requests;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        _requests.Add(request);
        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(_responseBody)
        });
    }
}
