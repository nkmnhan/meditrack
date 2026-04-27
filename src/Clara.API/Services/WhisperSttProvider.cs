using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text.Json;

namespace Clara.API.Services;

/// <summary>
/// ISttProvider backed by self-hosted faster-whisper (OpenAI-compatible REST API).
/// Accumulates PCM16 audio per session; flushes to Whisper every BufferSeconds.
/// All results are IsFinal=true — Whisper has no interim result concept.
/// </summary>
public sealed class WhisperSttProvider : ISttProvider
{
    private sealed class SessionState(Func<TranscriptChunk, Task> onTranscript)
    {
        public List<byte> Buffer { get; } = new();
        public Func<TranscriptChunk, Task> OnTranscript { get; } = onTranscript;
        public SemaphoreSlim FlushLock { get; } = new(1, 1);
    }

    private readonly ConcurrentDictionary<string, SessionState> _sessions = new();
    private readonly HttpClient _httpClient;
    private readonly int _bufferBytes;
    private readonly string _model;
    private readonly ILogger<WhisperSttProvider> _logger;

    public WhisperSttProvider(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<WhisperSttProvider> logger)
    {
        _httpClient = httpClient;
        _model = configuration["AI:Whisper:Model"] ?? "base.en";
        var bufferSeconds = int.TryParse(configuration["AI:Whisper:BufferSeconds"], out var s) ? s : 5;
        // PCM16 at 16kHz mono = 32000 bytes/second
        _bufferBytes = bufferSeconds * 32000;
        _logger = logger;
    }

    public Task OpenStreamAsync(
        string sessionId,
        Func<TranscriptChunk, Task> onTranscript,
        CancellationToken cancellationToken = default)
    {
        _sessions.TryAdd(sessionId, new SessionState(onTranscript));
        _logger.LogInformation("Whisper provider ready for session {SessionId}", sessionId);
        return Task.CompletedTask;
    }

    public async Task SendAudioAsync(string sessionId, byte[] audioBytes, CancellationToken cancellationToken = default)
    {
        if (!_sessions.TryGetValue(sessionId, out var state))
            return;

        state.Buffer.AddRange(audioBytes);

        if (state.Buffer.Count >= _bufferBytes)
            await FlushAsync(sessionId, state, cancellationToken);
    }

    public async Task CloseStreamAsync(string sessionId)
    {
        if (!_sessions.TryRemove(sessionId, out var state))
            return;

        if (state.Buffer.Count > 0)
            await FlushAsync(sessionId, state, CancellationToken.None);

        _logger.LogInformation("Whisper provider closed for session {SessionId}", sessionId);
    }

    private async Task FlushAsync(string sessionId, SessionState state, CancellationToken cancellationToken)
    {
        await state.FlushLock.WaitAsync(cancellationToken);
        try
        {
            if (state.Buffer.Count == 0)
                return;

            var pcmBytes = state.Buffer.ToArray();
            state.Buffer.Clear();

            var transcript = await TranscribeAsync(pcmBytes, cancellationToken);

            if (!string.IsNullOrWhiteSpace(transcript))
                await state.OnTranscript(new TranscriptChunk(transcript, null, IsFinal: true));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Whisper transcription failed for session {SessionId}", sessionId);
        }
        finally
        {
            state.FlushLock.Release();
        }
    }

    private async Task<string?> TranscribeAsync(byte[] pcmBytes, CancellationToken cancellationToken)
    {
        var wavBytes = AddWavHeader(pcmBytes);

        using var content = new MultipartFormDataContent();
        var audioContent = new ByteArrayContent(wavBytes);
        audioContent.Headers.ContentType = new MediaTypeHeaderValue("audio/wav");
        content.Add(audioContent, "file", "audio.wav");
        content.Add(new StringContent(_model), "model");

        var response = await _httpClient.PostAsync("/v1/audio/transcriptions", content, cancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var doc = JsonDocument.Parse(json);
        return doc.RootElement.TryGetProperty("text", out var text) ? text.GetString() : null;
    }

    /// <summary>
    /// Wraps raw PCM16 bytes in a minimal WAV header (16kHz, mono, 16-bit).
    /// </summary>
    private static byte[] AddWavHeader(byte[] pcm)
    {
        const int sampleRate = 16000;
        const short channels = 1;
        const short bitsPerSample = 16;
        var byteRate = sampleRate * channels * bitsPerSample / 8;
        var blockAlign = (short)(channels * bitsPerSample / 8);

        using var ms = new MemoryStream();
        using var writer = new BinaryWriter(ms);

        writer.Write("RIFF"u8);
        writer.Write(36 + pcm.Length);
        writer.Write("WAVE"u8);
        writer.Write("fmt "u8);
        writer.Write(16);
        writer.Write((short)1);
        writer.Write(channels);
        writer.Write(sampleRate);
        writer.Write(byteRate);
        writer.Write(blockAlign);
        writer.Write(bitsPerSample);
        writer.Write("data"u8);
        writer.Write(pcm.Length);
        writer.Write(pcm);

        return ms.ToArray();
    }
}
