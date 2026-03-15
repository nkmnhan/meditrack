using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Clara.API.Services;

/// <summary>
/// Handles speech-to-text transcription via Deepgram REST API.
/// MVP uses REST API (per-chunk). WebSocket streaming deferred to Phase 7.
/// </summary>
public sealed class DeepgramService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<DeepgramService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public DeepgramService(
        IHttpClientFactory httpClientFactory,
        ILogger<DeepgramService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    /// <summary>
    /// Transcribes an audio chunk using Deepgram REST API.
    /// Returns the transcript text, or null if transcription failed.
    /// </summary>
    /// <param name="sessionId">Session ID for logging.</param>
    /// <param name="audioChunk">Audio data (expected format: audio/webm from MediaRecorder).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Transcribed text, or null if transcription failed or produced no text.</returns>
    public async Task<DeepgramResult?> TranscribeAsync(
        string sessionId,
        byte[] audioChunk,
        CancellationToken cancellationToken = default)
    {
        if (audioChunk.Length == 0)
        {
            _logger.LogDebug("Empty audio chunk received for session {SessionId}, skipping", sessionId);
            return null;
        }

        try
        {
            var httpClient = _httpClientFactory.CreateClient("Deepgram");

            using var content = new ByteArrayContent(audioChunk);
            // Browser MediaRecorder default format is audio/webm
            content.Headers.ContentType = new MediaTypeHeaderValue("audio/webm");

            // Use nova-2-medical model for better medical terminology recognition
            // punctuate=true adds punctuation, interim_results=false for REST mode
            var response = await httpClient.PostAsync(
                "/v1/listen?model=nova-2-medical&punctuate=true&language=en",
                content,
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning(
                    "Deepgram returned {StatusCode} for session {SessionId}: {ErrorBody}",
                    response.StatusCode, sessionId, errorBody);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            var deepgramResponse = JsonSerializer.Deserialize<DeepgramResponse>(responseJson, JsonOptions);

            var transcript = deepgramResponse?.Results?.Channels?
                .FirstOrDefault()?.Alternatives?
                .FirstOrDefault()?.Transcript;

            var confidence = deepgramResponse?.Results?.Channels?
                .FirstOrDefault()?.Alternatives?
                .FirstOrDefault()?.Confidence;

            if (string.IsNullOrWhiteSpace(transcript))
            {
                _logger.LogDebug("Deepgram returned empty transcript for session {SessionId}", sessionId);
                return null;
            }

            _logger.LogDebug(
                "Deepgram transcribed {CharCount} chars with confidence {Confidence:F2} for session {SessionId}",
                transcript.Length, confidence ?? 0, sessionId);

            return new DeepgramResult(transcript, confidence);
        }
        catch (HttpRequestException exception)
        {
            _logger.LogError(exception, "Deepgram API call failed for session {SessionId}", sessionId);
            return null;
        }
        catch (JsonException exception)
        {
            _logger.LogError(exception, "Failed to parse Deepgram response for session {SessionId}", sessionId);
            return null;
        }
    }
}

/// <summary>
/// Result from Deepgram transcription.
/// </summary>
public sealed record DeepgramResult(string Transcript, float? Confidence);

/// <summary>
/// Deepgram API response model.
/// </summary>
public sealed class DeepgramResponse
{
    [JsonPropertyName("results")]
    public DeepgramResults? Results { get; set; }
}

public sealed class DeepgramResults
{
    [JsonPropertyName("channels")]
    public List<DeepgramChannel>? Channels { get; set; }
}

public sealed class DeepgramChannel
{
    [JsonPropertyName("alternatives")]
    public List<DeepgramAlternative>? Alternatives { get; set; }
}

public sealed class DeepgramAlternative
{
    [JsonPropertyName("transcript")]
    public string? Transcript { get; set; }

    [JsonPropertyName("confidence")]
    public float? Confidence { get; set; }
}
